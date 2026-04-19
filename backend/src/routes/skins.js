const { Router } = require('express');
const { getAllSkins, getUserSkins } = require('../controllers/skinsController');
const authMiddleware = require('../middleware/auth');

const router = Router();

router.get('/', getAllSkins);
router.get('/inventory', authMiddleware, getUserSkins);

module.exports = router;
