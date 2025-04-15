import express from 'express';
import { getPayments, makePayment } from '../controller/paymentController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/authorize.js';

const router = express.Router();

router.use(isAuthenticated);

// GET payments
router.get('/get', getPayments);

// POST make a payment
router.post('/make', makePayment);

export default router;
