// netlify/functions/proxy-nad.js
// Simple Netlify Function proxy to Nad.fun token API
// - Forwards GET /.netlify/functions/proxy-nad?address=<0x...>
// - Normalizes address to lowercase before calling nad.fun
// - Adds CORS and caches responses lightly

exports.handler = async function (event) {
  try {
    const address = (event.queryStringParameters && event.queryStringParameters.address) || "";
    if (!address) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
        body: "Missing 'address' query parameter. Example: /.netlify/functions/proxy-nad?address=0x123..."
      };
    }

    // normalize: trim + lowercase (nad.fun expects lowercase addresses)
    const addr = address.trim().toLowerCase();

    if (!/^0x[a-f0-9]{40}$/.test(addr)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
        body: "Invalid address format. Use a 0x-prefixed 40-hex char address."
      };
    }

    const upstreamUrl = `https://api.nad.fun/tokens/${addr}`;

    // Fetch from Nad.fun (no special headers needed)
    const upstreamResp = await fetch(upstreamUrl, { method: "GET" });

    // If Nad.fun returned non-200, forward status and body for debugging
    const text = await upstreamResp.text();

    // Forward response with CORS headers so browser can read it
    return {
      statusCode: upstreamResp.status,
      headers: {
        "Content-Type": upstreamResp.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=10, s-maxage=20"
      },
      body: text
    };

  } catch (err) {
    console.error("proxy-nad error:", err);
    return {
      statusCode: 502,
      headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
      body: "Bad gateway"
    };
  }
};
