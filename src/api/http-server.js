import http from "node:http";

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function createServer({ optimizer, store }) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      if (req.method === "GET" && url.pathname === "/health") {
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "GET" && url.pathname === "/api/analyses") {
        return sendJson(res, 200, await store.list());
      }

      if (req.method === "GET" && url.pathname === "/api/summary") {
        return sendJson(res, 200, await store.summary());
      }

      if (req.method === "POST" && url.pathname === "/api/analyze") {
        const body = await readBody(req);
        const result = await optimizer.analyze(body);
        return sendJson(res, 200, result);
      }

      if (req.method === "POST" && url.pathname === "/api/verify") {
        const body = await readBody(req);
        const verification = body.before && body.after
          ? {
              before: body.before,
              after: body.after,
              delta: {
                rows: Number(body.after.rows || 0) - Number(body.before.rows || 0),
                cost: Number(body.after.cost || 0) - Number(body.before.cost || 0)
              }
            }
          : { error: "before and after are required" };
        return sendJson(res, verification.error ? 400 : 200, verification);
      }

      sendJson(res, 404, { error: "Not Found" });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  });
}

