import { connection } from '../dbconnection/connection.js';
import bcrypt from 'bcrypt';

export const addMember = (req, res) => {
    const { username, email, dob } = req.body;

    if (!username || !email || !dob) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Insert into members table
    connection.query(
        `INSERT INTO members (UserName, emailID, DoB) VALUES (?, ?, ?)`,
        [username, email, dob],
        (memberErr, memberResult) => {
            if (memberErr) {
                const errorMessage = memberErr.code === 'ER_DUP_ENTRY'
                    ? 'Username already exists'
                    : 'Member creation failed';
                return res.status(400).json({ error: errorMessage });
            }

            const memberId = memberResult.insertId;

            // 2. Hash the default password and create login entry
            bcrypt.hash('default_password', 10, (hashErr, hashedPassword) => {
                if (hashErr) {
                    return res.status(500).json({ error: 'Password hashing failed' });
                }

                connection.query(
                    `INSERT INTO Login (MemberID, Password, Role) VALUES (?, ?, ?)`,
                    [memberId.toString(), hashedPassword, 'user'],
                    (loginErr) => {
                        if (loginErr) {
                            return res.status(500).json({ error: 'Login entry creation failed' });
                        }

                        // 3. Add to group mapping
                        connection.query(
                            `INSERT INTO MemberGroupMapping (MemberID, GroupID) VALUES (?, ?)`,
                            [memberId, 10],
                            (mappingErr) => {
                                if (mappingErr) {
                                    return res.status(500).json({ error: 'Group mapping failed' });
                                }

                                return res.status(201).json({
                                    message: "Member added successfully",
                                    memberId
                                });
                            }
                        );
                    }
                );
            });
        }
    );
};
