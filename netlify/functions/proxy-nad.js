// netlify/functions/proxy-nad.js
// Simple Netlify Function proxy to Nad.fun token API
// - Forwards GET /?address=<0x...> to https://api.nad.fun/tokens/<address>
// - Adds CORS headers so browser can call it directly

// Netlify runs on Node 18+, global fetch is available

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

    // validate (basic) — ensure it looks like an Ethereum-style hex address
    const addr = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
        body: "Invalid address format."
      };
    }

    const upstreamUrl = `https://api.nad.fun/tokens/${addr}`;

    // Fetch from Nad.fun
    const upstreamResp = await fetch(upstreamUrl, { method: "GET" });

    // Read text (we forward body as-is)
    const text = await upstreamResp.text();

    // Forward response with CORS headers so browser can read it
    return {
      statusCode: upstreamResp.status,
      headers: {
        "Content-Type": upstreamResp.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*",               // allow web clients to call this endpoint
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        // Optional caching to reduce rate usage (adjust as needed)
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
