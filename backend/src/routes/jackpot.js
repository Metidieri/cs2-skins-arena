const { Router } = require('express');
const {
  getCurrentJackpot,
  addEntry,
  getJackpotHistory,
} = require('../controllers/jackpotController');
const authMiddleware = require('../middleware/auth');

const router = Router();

router.get('/current', getCurrentJackpot);
router.post('/entry', authMiddleware, addEntry);
router.get('/history', getJackpotHistory);

module.exports = router;
