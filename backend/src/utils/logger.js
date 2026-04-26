const SENSITIVE_KEYS = new Set(['password', 'token', 'authorization', 'jwt']);

function ts() {
  return new Date().toISOString();
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

function isTest() {
  return process.env.NODE_ENV === 'test';
}

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      out[k] = sanitize(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function info(...args) {
  if (isTest()) return;
  console.log(`[${ts()}]`, ...args);
}

function warn(...args) {
  if (isTest()) return;
  console.warn(`[${ts()}] WARN`, ...args);
}

function error(...args) {
  console.error(`[${ts()}] ERROR`, ...args);
}

function requestLogger(req, res, next) {
  if (isTest()) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    const tag = status >= 500 ? 'ERR' : status >= 400 ? 'WARN' : 'OK';
    console.log(
      `[${ts()}] ${tag} ${req.method} ${req.originalUrl} ${status} ${elapsedMs.toFixed(1)}ms`,
    );
  });
  next();
}

module.exports = { info, warn, error, requestLogger, sanitize };
