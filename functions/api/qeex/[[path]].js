const QEEX_BASE_URL = 'https://qeex.net/api/v1';

const ALLOWED_METHODS = new Set([
  'accountBalance',
  'emailGet',
  'emailCode',
  'emailStatus',
  'emailComplete',
  'emailCancel',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Qeex-Key',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function safeApiKey(value) {
  return Boolean(value) && value.length >= 6 && value.length <= 300 && !/[\s/\\?#]/.test(value);
}

export async function onRequest(context) {
  const { request, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const path = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const method = path[0];

  if (!method || !ALLOWED_METHODS.has(method)) {
    return jsonResponse({ success: false, error: 'Unsupported Qeex method' }, 400);
  }

  const apiKey = request.headers.get('X-Qeex-Key')?.trim();

  if (!safeApiKey(apiKey)) {
    return jsonResponse({ success: false, error: 'Missing or invalid API key' }, 401);
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(`${QEEX_BASE_URL}/${encodeURIComponent(apiKey)}/${method}`);

  sourceUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const qeexResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const text = await qeexResponse.text();
    const contentType = qeexResponse.headers.get('Content-Type') || '';

    if (!contentType.includes('application/json')) {
      return jsonResponse(
        { success: false, error: 'Qeex returned a non-JSON response' },
        qeexResponse.ok ? 502 : qeexResponse.status,
      );
    }

    return new Response(text, {
      status: qeexResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return jsonResponse({ success: false, error: 'Unable to reach Qeex API' }, 502);
  }
}
