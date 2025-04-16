// routes/complaintsRoutes.js
import express from 'express';
import {
    fileComplaint,
    getComplaints,
    updateComplaintStatus
} from '../controller/complaintsController.js';
import { isAuthenticated } from "../middleware/authMiddleware.js";
import { isAdmin } from '../middleware/authorize.js';
const router = express.Router();

// File a new complaint (user)
router.post('/fileComplaint', isAuthenticated, (req, res) => {
  console.log("Router received fileComplaint request at", new Date().toISOString());
  console.log("Request body:", req.body);
  fileComplaint(req, res);
});

// Get complaints (user sees own, admin sees all)
router.get('/getComplaints', isAuthenticated, getComplaints);

// Update complaint status (admin only)
router.put('/:id/complaintstatus', isAuthenticated, isAdmin, updateComplaintStatus);

export default router;
