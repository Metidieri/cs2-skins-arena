const express = require('express');
const { getBoxStatus, openBox, getHistory } = require('../controllers/boxController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/status', authenticate, getBoxStatus);
router.post('/open', authenticate, openBox);
router.get('/history', authenticate, getHistory);

module.exports = router;
