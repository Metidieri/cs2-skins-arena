const { Router } = require('express');
const {
  createBattle,
  joinBattle,
  getBattles,
  getBattleById,
} = require('../controllers/battleController');
const authMiddleware = require('../middleware/auth');

const router = Router();

router.post('/', authMiddleware, createBattle);
router.post('/:id/join', authMiddleware, joinBattle);
router.get('/', getBattles);
router.get('/:id', getBattleById);

module.exports = router;
