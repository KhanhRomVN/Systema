const { Proxy } = require("http-mitm-proxy");
const proxy = new Proxy();

const PORT = 8081;

proxy.onError(function (ctx, err, errorKind) {
  var url = ctx && ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : "";
  console.error("[ERROR] " + errorKind + " on " + url + ":", err);
});

proxy.onRequest(function (ctx, callback) {
  const req = ctx.clientToProxyRequest;
  const method = req.method;
  const url = (ctx.isSSL ? "https://" : "http://") + req.headers.host + req.url;

  console.log("--------------------------------------------------");
  console.log(`[REQ] ${method} ${url}`);
  console.log("[REQ HEADERS]", JSON.stringify(req.headers, null, 2));

  ctx.onRequestData(function (ctx, chunk, callback) {
    if (chunk) {
      console.log(`[REQ BODY CHUNK] ${chunk.toString("utf8")}`);
    }
    return callback(null, chunk);
  });

  return callback();
});

proxy.onResponse(function (ctx, callback) {
  const req = ctx.clientToProxyRequest;
  const res = ctx.serverToProxyResponse; // Access server response headers
  const method = req.method;
  const url = (ctx.isSSL ? "https://" : "http://") + req.headers.host + req.url;
  const statusCode = res ? res.statusCode : "???";

  console.log(`[RES] ${method} ${url} ${statusCode}`);
  if (res) {
    console.log("[RES HEADERS]", JSON.stringify(res.headers, null, 2));
  }

  ctx.onResponseData(function (ctx, chunk, callback) {
    if (chunk) {
      // chunks can be binary, but for text/json we can try to stringify
      // For safety in MVP, let's just log a preview or try string
      // Note: Binary files will look messy.
      try {
        console.log(`[RES BODY CHUNK] ${chunk.toString("utf8")}`);
      } catch (e) {
        console.log(`[RES BODY CHUNK] (Binary data length ${chunk.length})`);
      }
    }
    return callback(null, chunk);
  });

  return callback();
});

proxy.listen({ port: PORT }, function () {
  console.log("Proxy listening on port " + PORT);
});
