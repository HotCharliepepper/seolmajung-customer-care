/**
 * 설마중 고객 신뢰 회복 기록용 Apps Script
 *
 * 권장 방식:
 * 1) 대상 Google Sheet에서 확장 프로그램 > Apps Script
 * 2) 이 파일을 Code.gs에 붙여넣기
 * 3) 같은 프로젝트에 HTML 파일 "SeolmajungRecovery"를 만들고 제공된 HTML 붙여넣기
 * 4) WEBHOOK_SECRET 변경
 * 5) setupSheets() 1회 실행
 * 6) 웹 앱으로 배포
 */

const CONFIG = {
  INCIDENT_SHEET: '사건관리',
  LOG_SHEET: '활동로그',
  WEBHOOK_SECRET: 'CHANGE_THIS_TO_A_RANDOM_SECRET'
};

const INCIDENT_HEADERS = [
  '사건ID',
  '최근저장시각',
  '사건일',
  '매장',
  '담당자',
  '고객호칭',
  '소개자',
  '예약시각',
  '도착시각',
  '방문인원',
  '현재단계',
  '회복상태',
  '다음연락일',
  '현장사실확인요약',
  '울산대표통화반응',
  '동행고객연락방식',
  '정진철님공유결과',
  '허지배인설명',
  '재초대계획',
  'James최종판단',
  '체크1_사실확인',
  '체크2_공개질책중단',
  '체크3_울산대표전화',
  '체크4_확인문자',
  '체크5_동행연락협의',
  '체크6_정진철공유',
  '체크7_응대기준정리',
  '체크8_재초대일정',
  '완료수',
  '진행률'
];

const LOG_HEADERS = [
  '저장시각',
  '사건ID',
  '담당자',
  '이벤트',
  '변경필드',
  '이전값',
  '새값',
  '브라우저시각'
];

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('설마중 고객 신뢰 회복 타임라인')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Apps Script HTML 내부의 google.script.run에서 호출합니다.
 */
function saveRecoveryRecord(payload) {
  try {
    validateInternalPayload_(payload);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      const sheets = ensureSheets_();
      const result = upsertIncident_(sheets.incidentSheet, sheets.logSheet, payload);
      return { ok: true, row: result.row, changed: result.changed };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : String(error)
    };
  }
}

/**
 * 외부 HTML에서 POST할 때 사용하는 예비 엔드포인트입니다.
 * 브라우저의 no-cors 전송에서는 응답을 읽을 수 없으므로 시트에서 저장 여부를 확인합니다.
 */
function doPost(e) {
  try {
    const raw = e && e.parameter && e.parameter.payload
      ? e.parameter.payload
      : (e && e.postData ? e.postData.contents : '');

    if (!raw) {
      return json_({ ok: false, error: 'EMPTY_PAYLOAD' });
    }

    const payload = JSON.parse(raw);
    validateExternalPayload_(payload);
    const result = saveRecoveryRecord(payload);
    return json_(result);
  } catch (error) {
    return json_({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

/**
 * 최초 1회 수동 실행 권장.
 * 시트가 없으면 생성하고 헤더·서식을 세팅합니다.
 */
function setupSheets() {
  const sheets = ensureSheets_();
  return {
    incidentSheet: sheets.incidentSheet.getName(),
    logSheet: sheets.logSheet.getName()
  };
}

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('이 스크립트는 기록할 Google Sheet 안에서 생성해 주세요.');
  }

  const incidentSheet = getOrCreateSheet_(ss, CONFIG.INCIDENT_SHEET, INCIDENT_HEADERS);
  const logSheet = getOrCreateSheet_(ss, CONFIG.LOG_SHEET, LOG_HEADERS);

  return { incidentSheet, logSheet };
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const existingHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const headerIsMissing = existingHeader.every(function(value) {
    return value === '';
  });

  if (headerIsMissing) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatSheet_(sheet, headers.length, name);
  } else {
    const mismatch = headers.some(function(header, index) {
      return existingHeader[index] !== header;
    });

    if (mismatch) {
      throw new Error(
        name + ' 시트의 1행 헤더가 코드 기준과 다릅니다. 기존 시트를 백업한 뒤 헤더를 확인해 주세요.'
      );
    }
  }

  return sheet;
}

function formatSheet_(sheet, columnCount, name) {
  const header = sheet.getRange(1, 1, 1, columnCount);
  header
    .setBackground('#30271f')
    .setFontColor('#fffaf1')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 34);

  for (let col = 1; col <= columnCount; col++) {
    sheet.setColumnWidth(col, 120);
  }

  if (name === CONFIG.INCIDENT_SHEET) {
    [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].forEach(function(col) {
      sheet.setColumnWidth(col, 115);
    });

    [14, 15, 16, 17, 18, 19, 20].forEach(function(col) {
      sheet.setColumnWidth(col, 250);
    });

    for (let col = 21; col <= 28; col++) {
      sheet.setColumnWidth(col, 115);
    }

    sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange('U2:AB').insertCheckboxes();
    sheet.getRange('AD:AD').setNumberFormat('0%');

    const stageRule = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        '사실 확인 전',
        '내부 사실 확인',
        '울산대표 사과',
        '동행 연락 협의',
        '재초대 조율',
        '재방문 완료',
        '사건 종료'
      ], true)
      .setAllowInvalid(false)
      .build();

    const recoveryRule = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        '확인 전',
        '불쾌감 지속',
        '사과 부분 수용',
        '사과 수용',
        '재방문 검토',
        '재방문 확정',
        '관계 회복',
        '재방문 거절'
      ], true)
      .setAllowInvalid(false)
      .build();

    sheet.getRange('K2:K').setDataValidation(stageRule);
    sheet.getRange('L2:L').setDataValidation(recoveryRule);

    const progressRange = sheet.getRange('AD2:AD');
    const rules = [
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberGreaterThanOrEqualTo(1)
        .setBackground('#dfeadf')
        .setFontColor('#31523d')
        .setRanges([progressRange])
        .build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberBetween(0.5, 0.9999)
        .setBackground('#efe3cf')
        .setFontColor('#765527')
        .setRanges([progressRange])
        .build()
    ];
    sheet.setConditionalFormatRules(rules);
  } else {
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.setColumnWidth(5, 190);
    sheet.setColumnWidth(6, 260);
    sheet.setColumnWidth(7, 260);
  }
}

function validateInternalPayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('저장 데이터 형식이 올바르지 않습니다.');
  }

  if (!payload.record || !payload.record.incidentId) {
    throw new Error('관리번호가 필요합니다.');
  }
}

function validateExternalPayload_(payload) {
  validateInternalPayload_(payload);

  if (!CONFIG.WEBHOOK_SECRET || CONFIG.WEBHOOK_SECRET === 'CHANGE_THIS_TO_A_RANDOM_SECRET') {
    throw new Error('Code.gs의 WEBHOOK_SECRET을 먼저 변경해 주세요.');
  }

  if (payload.secret !== CONFIG.WEBHOOK_SECRET) {
    throw new Error('Webhook Secret이 일치하지 않습니다.');
  }
}

function upsertIncident_(incidentSheet, logSheet, payload) {
  const record = payload.record;
  const now = new Date();
  const checks = record.checks || {};
  const checkKeys = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
  const completeCount = checkKeys.filter(function(key) {
    return toBoolean_(checks[key]);
  }).length;

  const values = [
    safeCell_(record.incidentId),
    now,
    safeCell_(record.incidentDate),
    safeCell_(record.store || '설마중'),
    safeCell_(record.owner || 'James'),
    safeCell_(record.customerAlias || '울산대표'),
    safeCell_(record.introducedBy || '정진철님'),
    safeCell_(record.bookingTime),
    safeCell_(record.arrivalTime),
    safeCell_(record.partySize),
    safeCell_(record.currentStage),
    safeCell_(record.recoveryStatus),
    safeCell_(record.nextFollowUpDate),
    safeCell_(record.factSummary),
    safeCell_(record.leaderResponse),
    safeCell_(record.companionContactMethod),
    safeCell_(record.jungjinchulShareResult),
    safeCell_(record.managerStatement),
    safeCell_(record.reInvitePlan),
    safeCell_(record.jamesDecision),
    toBoolean_(checks.c1),
    toBoolean_(checks.c2),
    toBoolean_(checks.c3),
    toBoolean_(checks.c4),
    toBoolean_(checks.c5),
    toBoolean_(checks.c6),
    toBoolean_(checks.c7),
    toBoolean_(checks.c8),
    completeCount,
    completeCount / 8
  ];

  const row = findIncidentRow_(incidentSheet, String(record.incidentId));
  let oldValues = new Array(INCIDENT_HEADERS.length).fill('');
  let targetRow = row;

  if (row) {
    oldValues = incidentSheet
      .getRange(row, 1, 1, INCIDENT_HEADERS.length)
      .getValues()[0];
    incidentSheet
      .getRange(row, 1, 1, INCIDENT_HEADERS.length)
      .setValues([values]);
  } else {
    incidentSheet.appendRow(values);
    targetRow = incidentSheet.getLastRow();
  }

  incidentSheet
    .getRange(targetRow, 14, 1, 7)
    .setWrap(true)
    .setVerticalAlignment('top');

  const logs = buildChangeLogs_(
    oldValues,
    values,
    payload.event || 'autosave',
    payload.clientTimestamp || '',
    record.incidentId,
    record.owner || 'James'
  );

  if (logs.length) {
    logSheet
      .getRange(logSheet.getLastRow() + 1, 1, logs.length, LOG_HEADERS.length)
      .setValues(logs);
  }

  return {
    row: targetRow,
    changed: logs.length
  };
}

function findIncidentRow_(sheet, incidentId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === incidentId.trim()) {
      return i + 2;
    }
  }
  return 0;
}

function buildChangeLogs_(oldValues, newValues, eventName, clientTimestamp, incidentId, owner) {
  const skipIndexes = new Set([1]); // 최근저장시각은 매번 달라지므로 로그 제외
  const rows = [];
  const isNewRecord = oldValues.every(function(value) {
    return comparable_(value) === '';
  });

  for (let i = 0; i < INCIDENT_HEADERS.length; i++) {
    if (skipIndexes.has(i)) continue;

    const before = comparable_(oldValues[i]);
    const after = comparable_(newValues[i]);

    // 최초 생성 시 빈값과 아직 완료하지 않은 FALSE 체크는 활동로그에서 제외합니다.
    if (isNewRecord && (after === '' || after === 'FALSE')) continue;

    if (before !== after) {
      rows.push([
        new Date(),
        safeCell_(incidentId),
        safeCell_(owner),
        safeCell_(eventName),
        INCIDENT_HEADERS[i],
        safeCell_(before),
        safeCell_(after),
        safeCell_(clientTimestamp)
      ]);
    }
  }

  return rows;
}

function comparable_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  if (value === true) return 'TRUE';
  if (value === false) return 'FALSE';
  if (value === null || value === undefined) return '';
  return String(value);
}

function toBoolean_(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function safeCell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean' || typeof value === 'number' || value instanceof Date) {
    return value;
  }

  const text = String(value);
  return /^[=+@]/.test(text) ? "'" + text : text;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
