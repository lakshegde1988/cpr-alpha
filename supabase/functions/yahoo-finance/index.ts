const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { symbol, days } = await req.json();

    if (!symbol || typeof symbol !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'Missing symbol' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fetchDays = days || 30;
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - (fetchDays * 24 * 60 * 60);
    const nseSymbol = `${symbol}.NS`;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(nseSymbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Yahoo Finance error [${res.status}]:`, text);
      return new Response(JSON.stringify({ ok: false, error: `Yahoo Finance returned ${res.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
