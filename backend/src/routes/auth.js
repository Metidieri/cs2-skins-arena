const { Router } = require('express');
const { register, login, me } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validators } = require('../middleware/validate');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');

const router = Router();

router.post('/register', registerLimiter, validators.register, register);
router.post('/login', loginLimiter, validators.login, login);
router.get('/me', authMiddleware, me);

module.exports = router;
