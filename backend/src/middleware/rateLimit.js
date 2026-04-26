const rateLimit = require('express-rate-limit');

function noop(req, res, next) {
  next();
}

// En tests no aplicamos límites para no falsear los flujos
function isTest() {
  return process.env.NODE_ENV === 'test';
}

function build(opts) {
  if (isTest()) return noop;
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...opts,
  });
}

const message = (msg) => ({ error: msg });

const loginLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: message('Demasiados intentos de login. Espera 15 minutos.'),
});

const registerLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: message('Has alcanzado el máximo de registros desde esta IP.'),
});

const jackpotEntryLimiter = build({
  windowMs: 60 * 1000,
  max: 10,
  // Limita por usuario autenticado; cae a IP solo si no hay sesión.
  keyGenerator: (req) => (req.userId ? `user:${req.userId}` : `ip:${req.ip}`),
  message: message('Demasiadas entradas al jackpot. Espera un minuto.'),
});

const marketLimiter = build({
  windowMs: 60 * 1000,
  max: 30,
  message: message('Demasiadas peticiones al marketplace.'),
});

const generalLimiter = build({
  windowMs: 60 * 1000,
  max: 100,
  message: message('Demasiadas peticiones. Espera un momento.'),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  jackpotEntryLimiter,
  marketLimiter,
  generalLimiter,
};
