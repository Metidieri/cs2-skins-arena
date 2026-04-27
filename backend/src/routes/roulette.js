const express = require('express');
const { placeBet, getCurrentRound, getRouletteHistory } = require('../controllers/rouletteController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/bet', authenticate, placeBet);
router.get('/current', getCurrentRound);
router.get('/history', getRouletteHistory);

module.exports = router;
