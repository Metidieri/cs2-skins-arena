const { Router } = require('express');
const {
  getCurrentJackpot,
  addEntry,
  getJackpotHistory,
} = require('../controllers/jackpotController');
const authMiddleware = require('../middleware/auth');
const { validators } = require('../middleware/validate');
const { jackpotEntryLimiter } = require('../middleware/rateLimit');

const router = Router();

router.get('/current', getCurrentJackpot);
router.post('/entry', authMiddleware, jackpotEntryLimiter, validators.jackpotEntry, addEntry);
router.get('/history', getJackpotHistory);

module.exports = router;
