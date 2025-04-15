// routes/ordersRoutes.js
import express from 'express';
import {
    placeOrder,
    listOrders,
    updateOrderStatus
} from '../controller/ordersController.js';

import { isAuthenticated } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/authorize.js';

const router = express.Router();

router.post('/order', isAuthenticated, placeOrder);
router.get('/orders', isAuthenticated, listOrders);
router.put('/order/:id/status', isAuthenticated, isAdmin, updateOrderStatus);

export default router;
