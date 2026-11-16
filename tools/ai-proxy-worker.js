// Cloudflare Worker — "one IP" proxy for an OpenAI-compatible API.
// Problem it fixes: your provider counts distinct client IPs per 10 min.
// On mobile (CGNAT + IPv6 privacy addresses) one phone can look like 4 IPs.
// Through a Worker every request leaves from one Cloudflare egress IP.
//
// DEPLOY (free, 3 min, no card):
//   1. dash.cloudflare.com -> Workers & Pages -> Create -> Worker
//   2. Replace the default code with this file, Deploy
//   3. Worker -> Settings -> Variables and Secrets, add THREE secrets:
//        UPSTREAM      = https://api.your-provider.tld      (no trailing slash, no /v1)
//        UPSTREAM_KEY  = sk-...                             (the REAL provider key)
//        SHARED_SECRET = some-long-random-string            (what Acode will use as its key)
//   4. Acode -> AI Agent tab -> menu -> Provider access ->
//        OpenAI-compatible endpoint:  https://<name>.<sub>.workers.dev/v1
//        API key:                     SHARED_SECRET value
//   5. Open https://<name>.<sub>.workers.dev/health to confirm it is alive.

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-max-age": "86400",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        ok: true,
        proxy: "single-egress-ip",
        upstream: env.UPSTREAM ? env.UPSTREAM.replace(/\/\/.*@/, "//***@") : null,
        upstreamKeySet: Boolean(env.UPSTREAM_KEY),
        secretSet: Boolean(env.SHARED_SECRET),
        time: new Date().toISOString(),
      });
    }

    if (!env.UPSTREAM) return json({ error: { message: "UPSTREAM secret is not set" } }, 500);
    if (!env.SHARED_SECRET) return json({ error: { message: "SHARED_SECRET is not set" } }, 500);

    // auth: Acode's "API key" must equal SHARED_SECRET
    const authHeader = request.headers.get("authorization") || "";
    const given = (authHeader.replace(/^Bearer\s+/i, "").trim() ||
      request.headers.get("x-api-key") ||
      url.searchParams.get("k") ||
      "").trim();
    if (given !== env.SHARED_SECRET) {
      return json({ error: { message: "proxy: secret mismatch", type: "proxy_auth_error" } }, 401);
    }

    // rebuild the query string without our own ?k=
    const params = new URLSearchParams(url.search);
    params.delete("k");
    const qs = params.toString();
    const target = env.UPSTREAM.replace(/\/+$/, "") + url.pathname + (qs ? "?" + qs : "");

    // forward headers, swapping in the real upstream key
    const headers = new Headers();
    for (const [k, v] of request.headers) {
      const key = k.toLowerCase();
      if (key === "host" || key === "authorization" || key === "x-api-key") continue;
      if (key === "origin" || key === "referer") continue;
      if (key.startsWith("cf-")) continue;
      if (key === "content-length") continue;
      headers.set(k, v);
    }
    if (env.UPSTREAM_KEY) headers.set("authorization", "Bearer " + env.UPSTREAM_KEY);
    headers.set("accept-encoding", "identity"); // keep SSE unbuffered

    const init = { method: request.method, headers, redirect: "follow" };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;

    let resp;
    try {
      resp = await fetch(target, init);
    } catch (e) {
      return json({ error: { message: "proxy: upstream unreachable", detail: String(e) } }, 502);
    }

    // pass through untouched (streaming included), just add CORS
    const out = new Headers(resp.headers);
    for (const [k, v] of Object.entries(CORS)) out.set(k, v);
    out.delete("content-encoding");
    out.delete("content-length");
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: out });
  },
};
