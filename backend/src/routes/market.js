const { Router } = require('express');
const {
  getListings,
  createListing,
  buyListing,
  cancelListing,
  getMyListings,
} = require('../controllers/marketController');
const authMiddleware = require('../middleware/auth');

const router = Router();

router.get('/', getListings);
router.post('/', authMiddleware, createListing);
router.get('/my-listings', authMiddleware, getMyListings);
router.post('/:id/buy', authMiddleware, buyListing);
router.delete('/:id', authMiddleware, cancelListing);

module.exports = router;
