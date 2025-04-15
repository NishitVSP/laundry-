// controller/complaintsController.js
import { connection1 } from '../dbconnection/connection.js';
import logger from '../utils/logger.js';

// Create a new complaint (User)
export const fileComplaint = async (req, res) => {
    const { order_id, complaint_type, complaint_details } = req.body;
    logger(`Complaint filing attempt - Order ID: ${order_id}, Type: ${complaint_type}`, req.user?.isAuthenticated);

    if (!order_id || !complaint_type || !complaint_details) {
        logger(`Invalid complaint input - Missing required fields`, req.user?.isAuthenticated);
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const complaint_date = new Date().toISOString().split('T')[0];
    const customer_id = req.user.memberId;

    // Step 1: Insert into complaints table
    const insertComplaintQuery = `
        INSERT INTO complaints (order_id, complaint_type, complaint_details, complaint_status)
        VALUES (?, ?, ?, 'Open')
    `;

    connection1.query(insertComplaintQuery, [order_id, complaint_type, complaint_details], (err, result) => {
        if (err) {
            logger(`Failed to file complaint - Order ID: ${order_id}, Error: ${err.message}`, req.user?.isAuthenticated);
            return res.status(500).json({ error: 'Failed to file complaint' });
        }

        const complaint_id = result.insertId;
        logger(`Complaint created - ID: ${complaint_id}, Order ID: ${order_id}`, req.user?.isAuthenticated);

        // Step 2: Insert into files table
        const insertFilesQuery = `
            INSERT INTO files (customer_id, complaint_id, Complaint_Date)
            VALUES (?, ?, ?)
        `;

        connection1.query(insertFilesQuery, [customer_id, complaint_id, complaint_date], (err2) => {
            if (err2) {
                logger(`Complaint file link failed - Complaint ID: ${complaint_id}, Error: ${err2.message}`, req.user?.isAuthenticated);
                return res.status(500).json({ error: 'Complaint logged, but file link failed' });
            }

            logger(`Complaint file link created - Complaint ID: ${complaint_id}, Customer ID: ${customer_id}`, req.user?.isAuthenticated);

            // Step 3: Select random staff_id from staff table
            const randomStaffQuery = `
                SELECT staff_id FROM staff ORDER BY RAND() LIMIT 1
            `;

            connection1.query(randomStaffQuery, (err3, staffResult) => {
                if (err3 || staffResult.length === 0) {
                    logger(`Failed to assign staff - Complaint ID: ${complaint_id}, Error: ${err3?.message || 'No staff available'}`, req.user?.isAuthenticated);
                    return res.status(500).json({ error: 'Failed to assign staff' });
                }

                const staff_id = staffResult[0].staff_id;
                logger(`Staff selected for complaint - Staff ID: ${staff_id}, Complaint ID: ${complaint_id}`, req.user?.isAuthenticated);

                // Step 4: Insert into resolves table with NULL for resolve date
                const insertResolvesQuery = `
                    INSERT INTO resolves (staff_id, complaint_id, Complaint_resolve_Date)
                    VALUES (?, ?, NULL)
                `;

                connection1.query(insertResolvesQuery, [staff_id, complaint_id], (err4) => {
                    if (err4) {
                        console.log(err4);
                        logger(`Failed to assign staff for complaint - Complaint ID: ${complaint_id}, Error: ${err4.message}`, req.user?.isAuthenticated);
                        return res.status(500).json({ error: 'Failed to assign staff for complaint' });
                    }
                    // Step 5: Insert into handles table
                    const insertHandlesQuery = `
                        INSERT INTO handles (staff_id, order_id, Assignment_Date)
                        VALUES (?, ?, ?)
                    `;

                    connection1.query(insertHandlesQuery, [staff_id, order_id, complaint_date], (err5) => {
                        if (err5) {
                            logger(`Order handle failed - Order ID: ${order_id}, Staff ID: ${staff_id}, Error: ${err5.message}`, req.user?.isAuthenticated);
                            return res.status(500).json({ error: 'Complaint and staff assigned, but order handle failed' });
                        }

                        logger(`Complaint filed and assigned successfully - Complaint ID: ${complaint_id}, Staff ID: ${staff_id}`, req.user?.isAuthenticated);
                        return res.status(201).json({
                            message: 'Complaint filed and assigned successfully',
                            complaint_id,
                            assigned_staff: staff_id
                        });
                    });
                });
            });
        });
    });
};

// Update Complaint_resolve_Date (Admin only)
export const updateResolveDate = (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    logger(`Complaint resolve date update attempt - User role: ${req.user?.role}`, req.user?.isAuthenticated);
    
    if (!isAdmin) {
        logger(`Access denied - Non-admin attempted to update resolve date`, req.user?.isAuthenticated);
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const { complaint_id, resolve_date } = req.body;

    if (!complaint_id || !resolve_date) {
        logger(`Missing parameters for resolve date update - Complaint ID: ${complaint_id}`, req.user?.isAuthenticated);
        return res.status(400).json({ error: 'Missing complaint_id or resolve_date in request body' });
    }

    const updateQuery = `
        UPDATE resolves 
        SET Complaint_resolve_Date = ? 
        WHERE complaint_id = ?
    `;

    connection1.query(updateQuery, [resolve_date, complaint_id], (err, result) => {
        if (err) {
            console.log(err);
            logger(`Failed to update resolve date - Complaint ID: ${complaint_id}, Error: ${err.message}`, req.user?.isAuthenticated);
            return res.status(500).json({ error: 'Failed to update resolve date' });
        }
        if (result.affectedRows === 0) {
            logger(`Complaint not found - ID: ${complaint_id}`, req.user?.isAuthenticated);
            return res.status(404).json({ error: 'Complaint not found or not yet assigned' });
        }

        logger(`Resolve date updated successfully - Complaint ID: ${complaint_id}, Date: ${resolve_date}`, req.user?.isAuthenticated);
        return res.status(200).json({ message: 'Complaint_resolve_Date updated successfully' });
    });
};

// Get all complaints (admin) or user-specific complaints
export const getComplaints = (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    logger(`Fetching complaints - User role: ${req.user?.role}, User ID: ${req.user?.memberId}`, req.user?.isAuthenticated);

    const query = isAdmin
        ? `SELECT * FROM complaints`
        : `SELECT c.* FROM complaints c JOIN files f ON c.complaint_id = f.complaint_id WHERE f.customer_id = ?`;

    const params = isAdmin ? [] : [req.user.memberId];

    connection1.query(query, params, (err, results) => {
        if (err) {
            logger(`Failed to retrieve complaints - Error: ${err.message}`, req.user?.isAuthenticated);
            return res.status(500).json({ error: 'Failed to retrieve complaints' });
        }
        logger(`Complaints retrieved successfully - Count: ${results.length}`, req.user?.isAuthenticated);
        return res.status(200).json(results);
    });
};

// Update complaint status (admin only)
export const updateComplaintStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    logger(`Complaint status update attempt - ID: ${id}, New Status: ${status}`, req.user?.isAuthenticated);

    const allowed = ['Open', 'In Progress', 'Resolved'];
    if (!allowed.includes(status)) {
        logger(`Invalid complaint status update - ID: ${id}, Invalid Status: ${status}`, req.user?.isAuthenticated);
        return res.status(400).json({ error: 'Invalid status' });
    }

    const query = `UPDATE complaints SET complaint_status = ? WHERE complaint_id = ?`;

    connection1.query(query, [status, id], (err, result) => {
        if (err) {
            logger(`Failed to update complaint status - ID: ${id}, Error: ${err.message}`, req.user?.isAuthenticated);
            return res.status(500).json({ error: 'Failed to update status' });
        }
        if (result.affectedRows === 0) {
            logger(`Complaint not found - ID: ${id}`, req.user?.isAuthenticated);
            return res.status(404).json({ error: 'Complaint not found' });
        }

        logger(`Complaint status updated successfully - ID: ${id}, New Status: ${status}`, req.user?.isAuthenticated);
        return res.status(200).json({ message: 'Complaint status updated' });
    });
};

// Delete a complaint (admin)
export const deleteComplaint = (req, res) => {
    const { id } = req.params;
    logger(`Complaint deletion attempt - ID: ${id}`, req.user?.isAuthenticated);

    connection1.query(`DELETE FROM complaints WHERE complaint_id = ?`, [id], (err, result) => {
        if (err) {
            logger(`Failed to delete complaint - ID: ${id}, Error: ${err.message}`, req.user?.isAuthenticated);
            return res.status(500).json({ error: 'Failed to delete complaint' });
        }
        if (result.affectedRows === 0) {
            logger(`Complaint not found for deletion - ID: ${id}`, req.user?.isAuthenticated);
            return res.status(404).json({ error: 'Complaint not found' });
        }

        logger(`Complaint deleted successfully - ID: ${id}`, req.user?.isAuthenticated);
        return res.status(200).json({ message: 'Complaint deleted' });
    });
};
