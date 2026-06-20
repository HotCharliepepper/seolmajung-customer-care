# 설마중 고객 신뢰 회복 보드

James가 모바일에서 고객 회복 진행 상황을 확인하고 기록하기 위한 프론트엔드 프로젝트입니다.

## 현재 v0.1 상태

- `index.html`: James용 모바일 화면
- `apps-script/Code.gs`: Google Sheets 기록 구조 기준본
- `netlify/functions/`: 다음 단계에서 저장·불러오기 Function을 추가할 위치
- `netlify.toml`: Netlify 배포와 `/api/*` 경로 설정
- 비밀키와 Apps Script 주소는 GitHub 코드에 넣지 않습니다.

> 현재 v0.1을 Netlify에 배포하면 화면은 열리지만, Google Sheets 자동 저장은 아직 연결되지 않습니다.
> 다음 단계에서 `recovery-save`와 `recovery-load` Function을 추가하면 완성됩니다.

## 권장 저장소 이름

`seolmajung-customer-care`

## GitHub 업로드

1. GitHub에서 새 저장소를 생성합니다.
2. 저장소는 `Private`로 시작하는 것을 권장합니다.
3. 저장소 생성 시 README, .gitignore, License를 GitHub 화면에서 별도로 만들지 않습니다.
4. 생성된 빈 저장소에서 `Add file → Upload files`를 선택합니다.
5. 이 폴더 안의 파일과 폴더를 모두 업로드합니다.
6. 커밋 메시지 예시:

```text
Initial Seolmajung customer care frontend
```

## 저장소 구조

```text
seolmajung-customer-care/
├─ index.html
├─ netlify.toml
├─ .gitignore
├─ .env.example
├─ README.md
├─ assets/
├─ apps-script/
│  └─ Code.gs
└─ netlify/
   └─ functions/
      └─ .gitkeep
```

## 보안 기준

다음 정보는 GitHub에 직접 올리지 않습니다.

- 실제 Apps Script 배포 URL
- 실제 저장용 Secret
- 고객 실명과 연락처
- Google Sheet 공유 링크

이 값은 추후 Netlify 환경변수에 넣습니다.

## 다음 단계

1. GitHub 저장소와 Netlify 연결
2. Netlify 사이트 최초 배포
3. `recovery-save.mjs` 추가
4. `recovery-load.mjs` 추가
5. Apps Script를 API 전용으로 정리
6. Netlify 환경변수 등록
7. 실제 Google Sheets 저장·불러오기 테스트
