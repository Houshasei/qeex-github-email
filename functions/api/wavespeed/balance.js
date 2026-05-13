const WAVESPEED_BALANCE_URL = 'https://api.wavespeed.ai/api/v3/balance';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Wavespeed-Key',
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

function buildErrorMessage(payload, status) {
  const code = payload?.code;
  const message = payload?.message;

  if (message && code) {
    return `${message} (${code})`;
  }

  if (message) {
    return message;
  }

  if (status === 401 || status === 403) {
    return 'WaveSpeed rejected the API key';
  }

  return 'WaveSpeed returned an unexpected response';
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const apiKey = request.headers.get('X-Wavespeed-Key')?.trim();

  if (!safeApiKey(apiKey)) {
    return jsonResponse({ success: false, error: 'Missing or invalid API key' }, 401);
  }

  try {
    const upstreamResponse = await fetch(WAVESPEED_BALANCE_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const text = await upstreamResponse.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      return jsonResponse(
        { success: false, error: 'WaveSpeed returned a non-JSON response' },
        upstreamResponse.ok ? 502 : upstreamResponse.status,
      );
    }

    if (!upstreamResponse.ok || payload?.code !== 200) {
      return jsonResponse(
        { success: false, error: buildErrorMessage(payload, upstreamResponse.status) },
        upstreamResponse.ok ? 502 : upstreamResponse.status,
      );
    }

    return jsonResponse({
      success: true,
      result: {
        balance: payload?.data?.balance ?? null,
      },
    });
  } catch {
    return jsonResponse({ success: false, error: 'Unable to reach the WaveSpeed API' }, 502);
  }
}
