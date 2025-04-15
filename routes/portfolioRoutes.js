// routes/portfolioRoutes.js
import express from 'express';
import { getUserPortfolio, getAllPortfolios } from '../controller/portfolioController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/authorize.js';

const router = express.Router();

// Route for user to view their own portfolio
router.get('/me', isAuthenticated, getUserPortfolio);

// Route for admin to view all portfolios
router.get('/all', isAuthenticated, isAdmin, getAllPortfolios);

export default router;
