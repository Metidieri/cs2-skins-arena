const rateLimit = require('express-rate-limit')

function build(options) {
  if (process.env.NODE_ENV === 'test') {
    return (_req, _res, next) => next()
  }
  return rateLimit(options)
}

const loginLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' }
})

const registerLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta IP.' }
})

const jackpotEntryLimiter = build({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id
      ? `user:${req.user.id}`
      : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
  },
  message: { error: 'Demasiadas apuestas por minuto.' }
})

const marketLimiter = build({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones al marketplace.' }
})

const generalLimiter = build({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones.' }
})

module.exports = {
  loginLimiter,
  registerLimiter,
  jackpotEntryLimiter,
  marketLimiter,
  generalLimiter
}
