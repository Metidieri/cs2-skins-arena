const express = require('express');
const { openCaseHandler, getCases } = require('../controllers/caseController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', getCases);
router.post('/open', authenticate, openCaseHandler);

module.exports = router;
