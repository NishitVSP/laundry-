// laundrymanagement\controller\signup.js
import { connection } from '../dbconnection/connection.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config(); 
import jwt from 'jsonwebtoken';

// Secret key for signing JWTs (in production, use environment variables!)
const JWT_SECRET = process.env.JWTPRIVATEKEY  // Replace with secure key
const JWT_EXPIRY = '2h'; // Example: token valid for 2 hours

const signup = async (req, res) => {
    console.log(JWT_SECRET)
    console.log("Inside signup");

    try {
        const {username, email, dob, password,role} = req.body;
        console.log("--->",username,email,dob,password,role);

        if (!username || !email || !dob || !password || !role) {
            return res.status(400).json({ error: 'Missi roleng username, email, DOB, password, or role' });
        }

        const hashedPassword = await bcrypt.hash(password, 5);

        // 1. Insert into members table
        const memberQuery = 'INSERT INTO members (UserName, emailID, DoB) VALUES (?, ?, ?)';
        connection.query(memberQuery, [username, email, dob], (err, result) => {
            if (err) {
                console.error('Error inserting into members:', err);
                return res.status(500).json({ error: 'Failed to add member' });
            }

            const memberId = result.insertId;   

            // 2. Insert into login table
            const loginQuery = 'INSERT INTO Login (MemberID, Password, Role) VALUES (?, ?, ?)';
            connection.query(loginQuery, [memberId, hashedPassword, role], (loginErr) => {
                if (loginErr) {
                    console.error('Error inserting into login:', loginErr);
                    return res.status(500).json({ error: 'Failed to add login credentials' });
                }

                // 3. Insert into MemberGroupMapping table
                const mappingQuery = 'INSERT INTO MemberGroupMapping (MemberID, GroupID) VALUES (?, ?)';
                connection.query(mappingQuery, [memberId, 10], (mapErr) => {
                    if (mapErr) {
                        console.error('Error inserting into MemberGroupMapping:', mapErr);
                        return res.status(500).json({ error: 'Failed to add member to group' });
                    }

                    // 4. Create JWT token
                    const tokenPayload = {
                        memberId,
                        email,
                        role
                    };

                    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

                    return res.status(201).json({
                        message: 'Signup successful. Member, login, and group mapping created.',
                        token
                        
                    });
                });
            });
        });

    } catch (error) {
        console.error('Unexpected error in signup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
   
};

export { signup };
