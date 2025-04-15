// routes/portfolioRoutes.js
import express from 'express';
import { getUserPortfolio, getAllPortfolios } from '../controller/portfolioController.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Route for user to view their own portfolio
router.get('/me', authMiddleware, getUserPortfolio);

// Route for admin to view all portfolios
router.get('/all', authMiddleware, isAdmin, getAllPortfolios);

export default router;
