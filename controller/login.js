import { connection } from '../dbconnection/connection.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // 1. Fetch login data by email (assuming email is unique)
        const loginQuery = `
            SELECT l.Password, l.Role, l.MemberID 
            FROM Login l
            JOIN members m ON l.MemberID = m.ID
            WHERE m.emailID = ?
        `;

        connection.query(loginQuery, [email], async (err, results) => {
            if (err) {
                console.error('DB error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const { Password: hashedPassword, Role, MemberID } = results[0];

            // 2. Compare password
            const isMatch = await bcrypt.compare(password, hashedPassword);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // 3. Create JWT token
            const token = jwt.sign(
                { memberId: MemberID, email, role: Role },
                process.env.JWTPRIVATEKEY,
                { expiresIn: process.env.JWT_EXPIRY || '1h' }
            );

            return res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    email,
                    role: Role,
                    memberId: MemberID
                }
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export { login };
