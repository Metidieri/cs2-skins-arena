const { Router } = require('express');
const {
  getListings,
  createListing,
  buyListing,
  cancelListing,
  getMyListings,
} = require('../controllers/marketController');
const authMiddleware = require('../middleware/auth');
const { validators } = require('../middleware/validate');

const router = Router();

router.get('/', getListings);
router.post('/', authMiddleware, validators.createListing, createListing);
router.get('/my-listings', authMiddleware, getMyListings);
router.post('/:id/buy', authMiddleware, validators.buyListing, buyListing);
router.delete('/:id', authMiddleware, validators.cancelListing, cancelListing);

module.exports = router;
