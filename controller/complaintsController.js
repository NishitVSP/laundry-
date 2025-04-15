// controller/complaintsController.js
import { connection1 } from '../dbconnection/connection.js';

// Create a new complaint (User)
export const fileComplaint = (req, res) => {
    const { order_id, complaint_type, complaint_details } = req.body;

    if (!order_id || !complaint_type || !complaint_details) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const insertQuery = `
        INSERT INTO complaints (order_id, complaint_type, complaint_details, complaint_status)
        VALUES (?, ?, ?, 'Open')
    `;

    connection1.query(insertQuery, [order_id, complaint_type, complaint_details], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to file complaint' });

        // Insert into files table for logging
        const complaint_id = result.insertId;
        const customer_id = req.user.id; // assume user is set in auth middleware
        const date = new Date().toISOString().split('T')[0];

        connection1.query(
            `INSERT INTO files (customer_id, complaint_id, Complaint_Date) VALUES (?, ?, ?)`,
            [customer_id, complaint_id, date],
            (err2) => {
                if (err2) return res.status(500).json({ error: 'Complaint logged, but file link failed' });

                return res.status(201).json({ message: 'Complaint filed successfully', complaint_id });
            }
        );
    });
};

// Get all complaints (admin) or user-specific complaints
export const getComplaints = (req, res) => {
    const isAdmin = req.user?.role === 'admin';

    const query = isAdmin
        ? `SELECT * FROM complaints`
        : `SELECT c.* FROM complaints c JOIN files f ON c.complaint_id = f.complaint_id WHERE f.customer_id = ?`;

    const params = isAdmin ? [] : [req.user.id];

    connection1.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to retrieve complaints' });
        return res.status(200).json(results);
    });
};

// Update complaint status (admin only)
export const updateComplaintStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['Open', 'In Progress', 'Resolved'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const query = `UPDATE complaints SET complaint_status = ? WHERE complaint_id = ?`;

    connection1.query(query, [status, id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to update status' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

        return res.status(200).json({ message: 'Complaint status updated' });
    });
};

// Delete a complaint (admin)
export const deleteComplaint = (req, res) => {
    const { id } = req.params;

    connection1.query(`DELETE FROM complaints WHERE complaint_id = ?`, [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to delete complaint' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

        return res.status(200).json({ message: 'Complaint deleted' });
    });
};
