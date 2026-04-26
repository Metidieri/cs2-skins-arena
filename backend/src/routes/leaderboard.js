const { Router } = require('express');
const { getLeaderboard, getPublicProfile } = require('../controllers/leaderboardController');

const router = Router();

router.get('/', getLeaderboard);
router.get('/profile/:username', getPublicProfile);

module.exports = router;
