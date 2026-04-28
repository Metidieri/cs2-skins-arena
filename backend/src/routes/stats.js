const { Router } = require('express');
const { getGlobalStats, getOnlineCount, getRecentDrops } = require('../controllers/statsController');

const router = Router();

router.get('/', getGlobalStats);
router.get('/online', getOnlineCount);

module.exports = router;
