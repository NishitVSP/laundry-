// routes/profileRoutes.js
import express from 'express';
import { getProfile, updateAddress, updatePhone } from '../controller/ProfileController.js';
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get user profile
router.get('/getProfile', isAuthenticated, getProfile);

// Update user address
router.put('/update-address', isAuthenticated, updateAddress);

// Update user phone number
router.put('/update-phone', isAuthenticated, updatePhone);

export default router; 