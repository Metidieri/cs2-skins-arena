const { Router } = require('express');
const { getDashboardStats, getUsers, banUser, giveCoins, getSkinsList } = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = Router();

router.get('/stats', authMiddleware, adminOnly, getDashboardStats);
router.get('/users', authMiddleware, adminOnly, getUsers);
router.post('/users/:id/ban', authMiddleware, adminOnly, banUser);
router.post('/users/:id/give-coins', authMiddleware, adminOnly, giveCoins);
router.get('/skins', authMiddleware, adminOnly, getSkinsList);

module.exports = router;
