// routes/complaintsRoutes.js
import express from 'express';
import {
    fileComplaint,
    getComplaints,
    updateComplaintStatus,
    deleteComplaint
} from '../controller/complaintsController.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// File a new complaint (user)
router.post('/', authMiddleware, fileComplaint);

// Get complaints (user sees own, admin sees all)
router.get('/', authMiddleware, getComplaints);

// Update complaint status (admin only)
router.put('/:id/status', authMiddleware, isAdmin, updateComplaintStatus);

// Delete complaint (admin only)
router.delete('/:id', authMiddleware, isAdmin, deleteComplaint);

export default router;
