import { connection1, connection2 } from '../dbconnection/connection.js';
import logger from '../utils/logger.js';

const addImage = async (req, res) => {
    try {
        const { imagePath } = req.body;
        const { memberId, role } = req.user;  // Extracted from verified token

        logger(`Image upload attempt - MemberID: ${memberId}, Role: ${role}, ImagePath: ${imagePath}`, false);

        if (!imagePath) {
            logger(`Image upload failed - Missing imagePath`, false);
            return res.status(400).json({ error: 'Missing imagePath' });
        }

        // 1. Insert into images table (connection2)
        const imageInsertQuery = `INSERT INTO images (MemberID, ImagePath) VALUES (?, ?)`;
        connection2.query(imageInsertQuery, [memberId, imagePath], (imgErr) => {
            if (imgErr) {
                console.error('Error inserting into images table:', imgErr);
                logger(`Failed to insert image - MemberID: ${memberId}, Error: ${imgErr.message}`, false);
                return res.status(500).json({ error: 'Failed to insert image' });
            }

            logger(`Image inserted successfully into images table - MemberID: ${memberId}`, false);

            // 2. Update image path in laundry DB
            const isAdmin = role.toLowerCase() === 'admin';
            const updateQuery = isAdmin
                ? `UPDATE staff SET staff_image = ? WHERE staff_id = ?`
                : `UPDATE customers SET customer_image = ? WHERE customer_id = ?`;

            const targetTable = isAdmin ? 'staff' : 'customers';

            connection1.query(updateQuery, [imagePath, memberId], (updateErr) => {
                if (updateErr) {
                    console.error(`Error updating ${targetTable} table:`, updateErr);
                    logger(`Failed to update ${targetTable} image - MemberID: ${memberId}, Error: ${updateErr.message}`, false);
                    return res.status(500).json({ error: `Image inserted, but failed to update ${targetTable} table` });
                }

                logger(`Successfully updated ${targetTable} image - MemberID: ${memberId}`, true);
                res.status(200).json({ message: 'Image uploaded and profile updated successfully' });
            });
        });

    } catch (error) {
        console.error('Unexpected error in addImage:', error);
        logger(`Unexpected error in addImage - Error: ${error.message}`, false);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export { addImage };
