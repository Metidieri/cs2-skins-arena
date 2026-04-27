const { Router } = require('express');
const { getProfile, getStats, getTransactions, deposit, getLevel } = require('../controllers/usersController');
const authMiddleware = require('../middleware/auth');
const { validators } = require('../middleware/validate');

const router = Router();

router.get('/profile', authMiddleware, getProfile);
router.get('/stats', authMiddleware, getStats);
router.get('/transactions', authMiddleware, getTransactions);
router.post('/deposit', authMiddleware, validators.deposit, deposit);
router.get('/level', authMiddleware, getLevel);

module.exports = router;
