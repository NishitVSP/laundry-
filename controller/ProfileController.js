import { connection1, connection2 } from '../dbconnection/connection.js';
import logger from '../utils/logger.js';

// Get user profile data
export const getProfile = async (req, res) => {
    if (!req.user?.memberId) {
        logger('User not authenticated', false);
        return res.status(401).json({ error: 'Authentication required' });
    }

    const { memberId, role } = req.user;

    try {
        // Updated queries to include more role-specific fields
        // For admin users, don't include address field or staff_position
        const query = role === 'admin' 
            ? `SELECT staff_id, staff_name, staff_email, staff_phone, 
                     staff_age, staff_image, hire_date
               FROM staff WHERE staff_id = ?`
            : `SELECT customer_id, customer_name, customer_email, customer_phone, customer_address, 
                     Age as customer_age, customer_image
               FROM customers WHERE customer_id = ?`;

        connection1.query(query, [memberId], (err, results) => {
            if (err) {
                logger(`Database error: ${err.message}`, false);
                return res.status(500).json({ error: 'Database error' });
            }

            if (results.length > 0) {
                return res.json({ ...results[0], role });
            }

            // Fallback to member data if no specialized record exists
            connection2.query(
                'SELECT UserName, emailID FROM members WHERE ID = ?',
                [memberId],
                (err, memberResults) => {
                    if (err || !memberResults.length) {
                        return res.status(404).json({ error: 'Profile not found' });
                    }
                    
                    const baseProfile = {
                        [`${role === 'admin' ? 'staff' : 'customer'}_id`]: memberId,
                        [`${role === 'admin' ? 'staff' : 'customer'}_name`]: memberResults[0].UserName,
                        [`${role === 'admin' ? 'staff' : 'customer'}_email`]: memberResults[0].emailID,
                        role
                    };
                    
                    res.json(baseProfile);
                }
            );
        });
    } catch (error) {
        logger(`Unexpected error: ${error.message}`, false);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update user address
export const updateAddress = async (req, res) => {
    try {
        const { address } = req.body;
        const { memberId, role } = req.user;

        // Don't allow address updates for admin users
        if (role === 'admin') {
            logger('Admin users cannot update address', false);
            return res.status(403).json({ error: 'Admin users do not have address information' });
        }

        if (!address) {
            return res.status(400).json({ error: 'Address required' });
        }

        logger(`Updating address for ${role} with ID ${memberId}: ${address}`, true);

        const table = 'customers';

        // First check if the record exists
        connection1.query(`SELECT * FROM ${table} WHERE ${table}_id = ?`, [memberId], (err, results) => {
            if (err) {
                logger(`Database error checking ${table} record: ${err.message}`, false);
                return res.status(500).json({ error: 'Address update failed' });
            }

            if (results.length > 0) {
                // Record exists, update it
                const updateQuery = `UPDATE ${table} SET ${table}_address = ? WHERE ${table}_id = ?`;
                connection1.query(updateQuery, [address, memberId], (updateErr) => {
                    if (updateErr) {
                        logger(`Address update failed: ${updateErr.message}`, false);
                        return res.status(500).json({ error: 'Address update failed' });
                    }
                    
                    res.json({ 
                        message: 'Address updated successfully',
                        customer_address: address 
                    });
                });
            } else {
                // Record doesn't exist, need to create it with basic info
                connection2.query('SELECT UserName FROM members WHERE ID = ?', [memberId], (err, memberResults) => {
                    if (err || !memberResults.length) {
                        logger(`Member not found: ${err?.message || 'No results'}`, false);
                        return res.status(404).json({ error: 'Member not found' });
                    }
                    
                    // Create new record
                    const insertQuery = `INSERT INTO ${table} (${table}_id, ${table}_name, ${table}_address) 
                                         VALUES (?, ?, ?)`;
                    
                    connection1.query(insertQuery, [memberId, memberResults[0].UserName, address], (insertErr) => {
                        if (insertErr) {
                            logger(`Failed to create ${table} record: ${insertErr.message}`, false);
                            return res.status(500).json({ error: 'Address update failed' });
                        }
                        
                        res.json({ 
                            message: 'Customer record created with address',
                            customer_address: address 
                        });
                    });
                });
            }
        });
    } catch (error) {
        logger(`Unexpected error: ${error.message}`, false);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update user phone number
export const updatePhone = async (req, res) => {
    try {
        const { phone } = req.body;
        const { memberId, role } = req.user;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number required' });
        }

        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone format' });
        }

        logger(`Updating phone for ${role} with ID ${memberId}: ${phone}`, true);

        const table = role === 'admin' ? 'staff' : 'customers';

        // First check if the record exists
        connection1.query(`SELECT * FROM ${table} WHERE ${table}_id = ?`, [memberId], (err, results) => {
            if (err) {
                logger(`Database error checking ${table} record: ${err.message}`, false);
                return res.status(500).json({ error: 'Phone update failed' });
            }

            if (results.length > 0) {
                // Record exists, update it
                const updateQuery = `UPDATE ${table} SET ${table}_phone = ? WHERE ${table}_id = ?`;
                connection1.query(updateQuery, [phone, memberId], (updateErr) => {
                    if (updateErr) {
                        if (updateErr.code === 'ER_DUP_ENTRY') {
                            return res.status(409).json({ 
                                error: `Phone number already in use by another ${role === 'admin' ? 'staff' : 'customer'}`
                            });
                        }
                        logger(`Phone update failed: ${updateErr.message}`, false);
                        return res.status(500).json({ error: 'Phone update failed' });
                    }
                    
                    res.json({ 
                        message: 'Phone number updated successfully',
                        [`${role === 'admin' ? 'staff' : 'customer'}_phone`]: phone 
                    });
                });
            } else {
                // Record doesn't exist, need to create it with basic info
                connection2.query('SELECT UserName FROM members WHERE ID = ?', [memberId], (err, memberResults) => {
                    if (err || !memberResults.length) {
                        logger(`Member not found: ${err?.message || 'No results'}`, false);
                        return res.status(404).json({ error: 'Member not found' });
                    }
                    
                    // Create new record
                    const insertQuery = `INSERT INTO ${table} (${table}_id, ${table}_name, ${table}_phone) 
                                         VALUES (?, ?, ?)`;
                    
                    connection1.query(insertQuery, [memberId, memberResults[0].UserName, phone], (insertErr) => {
                        if (insertErr) {
                            if (insertErr.code === 'ER_DUP_ENTRY') {
                                return res.status(409).json({ 
                                    error: `Phone number already in use by another ${role === 'admin' ? 'staff' : 'customer'}`
                                });
                            }
                            logger(`Failed to create ${table} record: ${insertErr.message}`, false);
                            return res.status(500).json({ error: 'Phone update failed' });
                        }
                        
                        res.json({ 
                            message: `${role === 'admin' ? 'Staff' : 'Customer'} record created with phone`,
                            [`${role === 'admin' ? 'staff' : 'customer'}_phone`]: phone 
                        });
                    });
                });
            }
        });
    } catch (error) {
        logger(`Unexpected error: ${error.message}`, false);
        res.status(500).json({ error: 'Internal server error' });
    }
};
