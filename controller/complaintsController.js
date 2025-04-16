// controller/complaintsController.js
import { connection1 } from '../dbconnection/connection.js';
import logger from '../utils/logger.js';

// Create a new complaint (User)
export const fileComplaint = async (req, res) => {
    const { order_id, complaint_type, complaint_details } = req.body;
    const customer_id = req.user?.memberId;
    const complaint_date = new Date().toISOString().split('T')[0];

    // Validate input
    if (!order_id || !complaint_type || !complaint_details || !customer_id) {
        logger('Missing required fields for complaint', req.user?.isAuthenticated);
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Insert complaint
        connection1.beginTransaction(async (err) => {
            if (err) throw err;

            try {
                // 1. Insert into complaints
                const [complaintResult] = await connection1.promise().query(
                    `INSERT INTO complaints 
                     (order_id, complaint_type, complaint_details, complaint_status)
                     VALUES (?, ?, ?, 'Open')`,
                    [order_id, complaint_type, complaint_details]
                );
                const complaint_id = complaintResult.insertId;

                // 2. Insert into files
                await connection1.promise().query(
                    `INSERT INTO files 
                     (customer_id, complaint_id, Complaint_Date)
                     VALUES (?, ?, ?)`,
                    [customer_id, complaint_id, complaint_date]
                );

                // 3. Assign random staff
                const [staffResult] = await connection1.promise().query(
                    `SELECT staff_id FROM staff ORDER BY RAND() LIMIT 1`
                );
                const staff_id = staffResult[0]?.staff_id;

                if (!staff_id) throw new Error('No available staff');

                // 4. Insert into handles
                await connection1.promise().query(
                    `INSERT INTO handles 
                     (staff_id, order_id, Assignment_Date)
                     VALUES (?, ?, ?)`,
                    [staff_id, order_id, complaint_date]
                );

                // 5. Insert into resolves
                try {
                    await connection1.promise().query(
                        `INSERT INTO resolves 
                         (staff_id, complaint_id, Complaint_resolve_Date)
                         VALUES (?, ?, ?)`,
                        [staff_id, complaint_id, complaint_date]
                    );
                    logger(`Resolution assignment successful - Complaint ID: ${complaint_id}, Staff ID: ${staff_id}`, true);
                } catch (resolveErr) {
                    // If the error is about a column name
                    if (resolveErr.message.includes('column')) {
                        logger(`Resolution assignment column error - Complaint ID: ${complaint_id}, Error: ${resolveErr.message}`, false);
                        throw new Error(`Complaint created, but failed to assign resolution: ${resolveErr.message}`);
                    } else {
                        // Re-throw other errors
                        logger(`Resolution assignment failed - Complaint ID: ${complaint_id}, Staff ID: ${staff_id}, Error: ${resolveErr.message}`, false);
                        throw resolveErr;
                    }
                }

                await connection1.promise().commit();
                
                logger(`Complaint ${complaint_id} filed successfully`, true);
                return res.status(201).json({
                    message: 'Complaint filed and assigned successfully',
                    complaint_id,
                    assigned_staff: staff_id
                });

            } catch (error) {
                await connection1.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        logger(`Complaint filing failed: ${error.message}`, false);
        return res.status(500).json({ 
            error: error.message.startsWith('No available') 
                ? 'No staff available to handle complaint'
                : 'Failed to file complaint'
        });
    }
};

// Update resolve date (Admin only)
export const updateResolveDate = (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { complaint_id, resolve_date } = req.body;
    
    connection1.query(
        `UPDATE resolves 
         SET Complaint_resolve_Date = ? 
         WHERE complaint_id = ?`,
        [resolve_date, complaint_id],
        (err, result) => {
            if (err) {
                logger(`Resolve date update failed: ${err.message}`, false);
                return res.status(500).json({ error: 'Database error' });
            }
            
            return result.affectedRows > 0
                ? res.status(200).json({ message: 'Resolution date updated' })
                : res.status(404).json({ error: 'Complaint not found' });
        }
    );
};

// Get complaints
export const getComplaints = (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin
        ? `SELECT c.*, r.Complaint_resolve_Date, h.Assignment_Date 
           FROM complaints c
           LEFT JOIN resolves r ON c.complaint_id = r.complaint_id
           LEFT JOIN handles h ON c.order_id = h.order_id`
        : `SELECT c.*, f.Complaint_Date 
           FROM complaints c
           JOIN files f ON c.complaint_id = f.complaint_id
           WHERE f.customer_id = ?`;

    const params = isAdmin ? [] : [req.user.memberId];

    connection1.query(query, params, (err, results) => {
        if (err) {
            logger(`Complaint retrieval failed: ${err.message}`, false);
            return res.status(500).json({ error: 'Database error' });
        }
        return res.status(200).json(results);
    });
};

// Update complaint status (Admin only)
export const updateComplaintStatus = (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['Open', 'In Progress', 'Resolved'];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    connection1.query(
        `UPDATE complaints SET complaint_status = ? WHERE complaint_id = ?`,
        [status, id],
        (err, result) => {
            if (err) {
                logger(`Status update failed: ${err.message}`, false);
                return res.status(500).json({ error: 'Database error' });
            }
            
            return result.affectedRows > 0
                ? res.status(200).json({ message: 'Status updated' })
                : res.status(404).json({ error: 'Complaint not found' });
        }
    );
};

// Delete complaint (Admin only)
export const deleteComplaint = (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    connection1.beginTransaction(async (err) => {
        if (err) throw err;

        try {
            const { id } = req.params;
            
            // Delete from related tables first
            await connection1.promise().query(
                `DELETE FROM resolves WHERE complaint_id = ?`,
                [id]
            );
            
            await connection1.promise().query(
                `DELETE FROM files WHERE complaint_id = ?`,
                [id]
            );

            await connection1.promise().query(
                `DELETE FROM complaints WHERE complaint_id = ?`,
                [id]
            );

            await connection1.promise().commit();
            return res.status(200).json({ message: 'Complaint deleted' });

        } catch (error) {
            await connection1.promise().rollback();
            logger(`Complaint deletion failed: ${error.message}`, false);
            return res.status(500).json({ error: 'Database error' });
        }
    });
};
