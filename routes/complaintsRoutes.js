// routes/complaintsRoutes.js
import express from 'express';
import {
    fileComplaint,
    getComplaints,
    updateComplaintStatus,
    updateResolveDate
    
} from '../controller/complaintsController.js';
import { isAuthenticated } from "../middleware/authMiddleware.js";
import { isAdmin } from '../middleware/authorize.js';
const router = express.Router();

// File a new complaint (user)
router.post('/fileComplaint', isAuthenticated, fileComplaint);

// Get complaints (user sees own, admin sees all)
router.get('/getComplaints', isAuthenticated, getComplaints);

// Update complaint status (admin only)
router.put('/:id/complaintstatus', isAuthenticated, isAdmin, updateComplaintStatus);

router.put('/complaints/resolve-date', isAuthenticated,isAdmin, updateResolveDate);


export default router;
