const logger = require('../utils/logger');

const PRISMA_MESSAGES = {
  P2002: 'Ya existe un registro con esos valores únicos',
  P2025: 'Recurso no encontrado',
  P2003: 'Referencia inválida (foreign key)',
  P2014: 'Operación bloquearía una relación obligatoria',
};

function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isProd = process.env.NODE_ENV === 'production';
  let status = err.status || err.statusCode || 500;
  let message = err.expose ? err.message : 'Error interno del servidor';

  // Errores de Prisma
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    const mapped = PRISMA_MESSAGES[err.code];
    if (mapped) {
      status = err.code === 'P2025' ? 404 : 400;
      message = mapped;
    }
  }

  // Errores de validación lanzados manualmente
  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message || 'Validación fallida';
  }

  // JSON inválido en el body
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON inválido';
  }

  // Errores 4xx con mensaje propio
  if (status >= 400 && status < 500 && err.message) {
    message = err.message;
  }

  logger.error(
    `${req.method} ${req.originalUrl} -> ${status} | ${err.code || err.name || 'Error'}: ${err.message}`,
  );
  if (!isProd && err.stack) {
    console.error(err.stack);
  }

  const payload = { error: message };
  if (!isProd && err.code) payload.code = err.code;

  res.status(status).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
