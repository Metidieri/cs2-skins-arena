const { Router } = require('express');
const { getProfile, getStats, getTransactions } = require('../controllers/usersController');
const authMiddleware = require('../middleware/auth');

const router = Router();

router.get('/profile', authMiddleware, getProfile);
router.get('/stats', authMiddleware, getStats);
router.get('/transactions', authMiddleware, getTransactions);

module.exports = router;
