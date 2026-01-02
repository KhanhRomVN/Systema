const { Proxy } = require('http-mitm-proxy');
const proxy = new Proxy();

const PORT = 8081;

proxy.onError(function (ctx, err, errorKind) {
  var url = ctx && ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : '';
});

proxy.onRequest(function (ctx, callback) {
  const req = ctx.clientToProxyRequest;
  const method = req.method;
  const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;

  ctx.onRequestData(function (ctx, chunk, callback) {
    return callback(null, chunk);
  });

  return callback();
});

proxy.onResponse(function (ctx, callback) {
  const req = ctx.clientToProxyRequest;
  const res = ctx.serverToProxyResponse; // Access server response headers
  const method = req.method;
  const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;
  const statusCode = res ? res.statusCode : '???';

  ctx.onResponseData(function (ctx, chunk, callback) {
    return callback(null, chunk);
  });

  return callback();
});

proxy.listen({ port: PORT }, function () {});
