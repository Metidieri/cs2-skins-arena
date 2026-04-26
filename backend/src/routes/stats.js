const { Router } = require('express');
const { getGlobalStats } = require('../controllers/statsController');

const router = Router();

router.get('/', getGlobalStats);

module.exports = router;
