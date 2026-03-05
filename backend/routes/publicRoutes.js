import express from 'express';
import { getPublicPrices } from '../controllers/publicController.js';
import { getHomepageReviews } from '../controllers/reviewController.js';

const router = express.Router();

// Public routes (no auth middleware)
router.get('/prices', getPublicPrices);
router.get('/homepage-reviews', getHomepageReviews);

export default router;
