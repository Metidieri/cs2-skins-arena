const { body, param, validationResult } = require('express-validator');

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const first = errors.array()[0];
  return res.status(400).json({
    error: first.msg || 'Datos inválidos',
    field: first.path,
    details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

// El proyecto usa IDs Int para User/Skin/Battle, pero String UUID para Jackpot/Listing.
// Para mantener compatibilidad, validamos numericId/uuidId con helpers separados.

const numericIdParam = (name = 'id') =>
  param(name).isInt({ min: 1 }).withMessage(`${name} debe ser numérico`);

const uuidIdParam = (name = 'id') =>
  param(name).isUUID().withMessage(`${name} debe ser un UUID válido`);

const numericSkinId = body('skinId')
  .exists()
  .withMessage('skinId requerido')
  .bail()
  .isInt({ min: 1 })
  .withMessage('skinId debe ser numérico');

const validators = {
  register: [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password mínimo 8 caracteres'),
    body('username')
      .isString()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username entre 3 y 20 caracteres')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username solo alfanumérico (y _)'),
    runValidation,
  ],

  login: [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password requerido'),
    runValidation,
  ],

  createBattle: [numericSkinId, runValidation],

  joinBattle: [numericIdParam('id'), numericSkinId, runValidation],

  jackpotEntry: [numericSkinId, runValidation],

  createListing: [
    numericSkinId,
    body('price')
      .exists()
      .withMessage('price requerido')
      .bail()
      .isFloat({ min: 1, max: 999999 })
      .withMessage('price entre 1 y 999999'),
    runValidation,
  ],

  buyListing: [uuidIdParam('id'), runValidation],

  cancelListing: [uuidIdParam('id'), runValidation],

  deposit: [
    body('amount')
      .exists()
      .withMessage('amount requerido')
      .bail()
      .isFloat({ min: 100, max: 10000 })
      .withMessage('Depósito entre 100 y 10000 coins'),
    runValidation,
  ],
};

module.exports = { validators, runValidation };
