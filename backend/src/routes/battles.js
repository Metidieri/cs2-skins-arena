const { Router } = require('express');
const {
  createBattle,
  joinBattle,
  callBot,
  getBattles,
  getBattleById,
} = require('../controllers/battleController');
const authMiddleware = require('../middleware/auth');
const { validators } = require('../middleware/validate');

const router = Router();

router.post('/', authMiddleware, validators.createBattle, createBattle);
router.post('/:id/join', authMiddleware, validators.joinBattle, joinBattle);
router.post('/:id/call-bot', authMiddleware, callBot);
router.get('/', getBattles);
router.get('/:id', getBattleById);

module.exports = router;
