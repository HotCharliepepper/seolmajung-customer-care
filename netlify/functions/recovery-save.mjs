/**
 * Netlify Function: recovery-save
 *
 * Browser -> /api/recovery-save -> this function
 * -> Google Apps Script doPost -> Google Sheets
 *
 * Required Netlify environment variables:
 * - APPS_SCRIPT_URL
 * - APPS_SCRIPT_SECRET
 */

export default async function handler(request) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers }
    );
  }

  const appsScriptUrl = Netlify.env.get("APPS_SCRIPT_URL");
  const appsScriptSecret = Netlify.env.get("APPS_SCRIPT_SECRET");

  if (!appsScriptUrl || !appsScriptSecret) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "SERVER_CONFIGURATION_MISSING"
      }),
      { status: 500, headers }
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "INVALID_JSON" }),
      { status: 400, headers }
    );
  }

  if (
    !payload ||
    !payload.record ||
    typeof payload.record.incidentId !== "string" ||
    payload.record.incidentId.trim() === ""
  ) {
    return new Response(
      JSON.stringify({ ok: false, error: "INCIDENT_ID_REQUIRED" }),
      { status: 400, headers }
    );
  }

  const forwardedPayload = {
    ...payload,
    secret: appsScriptSecret
  };

  try {
    const upstreamResponse = await fetch(appsScriptUrl, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(forwardedPayload)
    });

    const upstreamText = await upstreamResponse.text();

    let upstreamData;
    try {
      upstreamData = JSON.parse(upstreamText);
    } catch {
      upstreamData = {
        ok: false,
        error: "INVALID_APPS_SCRIPT_RESPONSE",
        preview: upstreamText.slice(0, 160)
      };
    }

    if (!upstreamResponse.ok || !upstreamData.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: upstreamData.error || "APPS_SCRIPT_SAVE_FAILED"
        }),
        { status: 502, headers }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        row: upstreamData.row,
        changed: upstreamData.changed
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Apps Script forwarding failed:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: "UPSTREAM_REQUEST_FAILED"
      }),
      { status: 502, headers }
    );
  }
}
