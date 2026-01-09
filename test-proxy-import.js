const Proxy = require('http-mitm-proxy');
console.log('Type of exports:', typeof Proxy);
console.log('Exports keys:', Object.keys(Proxy));
try {
  const p = Proxy();
  console.log('Proxy() call success');
} catch (e) {
  console.log('Proxy() call failed:', e.message);
}

if (Proxy.default) {
  console.log('Type of default:', typeof Proxy.default);
  try {
    const p = Proxy.default();
    console.log('Proxy.default() call success');
  } catch (e) {
    console.log('Proxy.default() call failed:', e.message);
  }
}
