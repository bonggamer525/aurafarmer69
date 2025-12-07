// main.js
(() => {
  // === CONFIG ===
  const TOKEN_ADDRESS = "0xA3e19348F9A6d28E69C6622418dBc5a6B2027777".toLowerCase();
  // Before
// const NAD_API = `https://api.nad.fun/tokens/${TOKEN_ADDRESS}`;

// After — use Netlify serverless proxy
  const NAD_API = `/.netlify/functions/proxy-nad?address=${TOKEN_ADDRESS}`;
  // polling interval (ms)
  const REFRESH_INTERVAL = 15000;

  // === DOM ELEMENTS ===
  const priceEl = document.getElementById("priceDisplay");
  const marketEl = document.getElementById("marketCapDisplay");
  const circulatingEl = document.getElementById("circulatingDisplay");
  const liquidityEl = document.getElementById("liquidityDisplay");
  const contractEl = document.getElementById("contract");
  const contract2El = document.getElementById("contract2");
  const copyBtn = document.getElementById("copyBtn");

  // set contract text (in case it's different)
  if (contractEl) contractEl.textContent = TOKEN_ADDRESS;
  if (contract2El) contract2El.textContent = TOKEN_ADDRESS;

  // copy contract button
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(TOKEN_ADDRESS);
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
      } catch (e) {
        console.error("Copy failed:", e);
        copyBtn.textContent = "Copy failed";
        setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
      }
    });
  }

  // format helpers
  const formatPrice = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "--";
    // display small prices with more precision
    if (Math.abs(n) < 0.01) return `$${n.toFixed(6)}`;
    if (Math.abs(n) < 1) return `$${n.toFixed(4)}`;
    return `$${n.toFixed(2)}`;
  };

  const formatBig = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "--";
    // use locale formatting
    try {
      return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } catch {
      return `$${Math.round(n)}`;
    }
  };

  // flexible accessor for different possible field names returned by APIs
  function pick(data, keys) {
    for (const k of keys) {
      if (k in data && data[k] !== null && data[k] !== undefined) return data[k];
    }
    return null;
  }

  async function fetchTokenData() {
    try {
      const resp = await fetch(NAD_API, { cache: "no-cache" });
      if (!resp.ok) throw new Error("Network response not ok: " + resp.status);
      const data = await resp.json();

      // Nad.fun returns fields with varying names depending on endpoints.
      // Try a few common possibilities:
      const price = pick(data, ["priceUsd", "price", "currentPrice", "price_usd"]);
      const marketCap = pick(data, ["marketCapUsd", "marketCap", "market_cap", "market_cap_usd"]);
      const circulating = pick(data, ["circulatingSupply", "circulating", "circulating_supply"]);
      const liquidity = pick(data, ["liquidityUsd", "liquidity", "liquidity_usd"]);

      // update DOM safely
      if (priceEl) priceEl.textContent = formatPrice(Number(price));
      if (marketEl) marketEl.textContent = formatBig(Number(marketCap));
      if (circulatingEl) {
        if (circulating === null || circulating === undefined) circulatingEl.textContent = "--";
        else circulatingEl.textContent = Number(circulating).toLocaleString();
      }
      if (liquidityEl) {
        if (liquidity === null || liquidity === undefined) {
          // if liquidity field missing, keep previously set "Locked" or --
          if (!liquidityEl.textContent || liquidityEl.textContent.trim() === "") liquidityEl.textContent = "--";
        } else {
          liquidityEl.textContent = formatBig(Number(liquidity));
        }
      }

    } catch (err) {
      console.error("Failed to fetch token data:", err);
      // don't overwrite the UI on error; optionally show a subtle 'offline' state
      if (priceEl && priceEl.textContent === "--") priceEl.textContent = "--";
    }
  }

  // initial fetch
  fetchTokenData();

  // refresh loop
  setInterval(fetchTokenData, REFRESH_INTERVAL);

  // Optionally add visibility-check to pause polling when tab hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // tab hidden -> stop polling by clearing interval and set a timeout to resume when visible
      // (simple approach: do nothing; setInterval will still run — advanced: stop/start the interval)
    } else {
      // resume immediate refresh when tab returns
      fetchTokenData();
    }
  });
})();
