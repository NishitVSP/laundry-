// laundrymanagement\controller\signup.js
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import { connection1, connection2 } from '../dbconnection/connection.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWTPRIVATEKEY;
const JWT_EXPIRY = '1d';

function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const signup = async (req, res) => {
    try {
        const { username, email, dob, password, role, passkey } = req.body;
        logger(`Signup attempt - Username: ${username}, Email: ${email}, Role: ${role}`, false);

        if (!username || !email || !dob || !password || !role) {
            logger(`Signup failed - Missing required fields`, false);
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (role.toLowerCase() === 'admin') {
            if (!passkey || passkey !== process.env.ADMIN_PASSKEY) {
                logger(`Admin signup failed - Invalid or missing passkey`, false);
                return res.status(403).json({ error: 'Invalid or missing admin passkey' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 5);

        // 1. Insert into CIMS members table (connection2)
        const memberQuery = 'INSERT INTO members (UserName, emailID, DoB) VALUES (?, ?, ?)';
        connection2.query(memberQuery, [username, email, dob], (err, result) => {
            if (err) {
                console.error('Error inserting into members:', err);
                logger(`Error inserting into members table: ${err.message}`, false);
                return res.status(500).json({ error: err.message });
            }

            const memberId = result.insertId;
            logger(`Member created successfully - MemberID: ${memberId}`, false);

            // 2. Insert into CIMS login table (connection2)
            const loginQuery = 'INSERT INTO Login (MemberID, Password, Role) VALUES (?, ?, ?)';
            connection2.query(loginQuery, [memberId, hashedPassword, role], (loginErr) => {
                if (loginErr) {
                    console.error('Error inserting into login:', loginErr);
                    logger(`Error inserting into login table - MemberID: ${memberId}, Error: ${loginErr.message}`, false);
                    return res.status(500).json({ error: 'Failed to add login credentials' });
                }
                
                logger(`Login credentials created successfully - MemberID: ${memberId}`, false);

                // Proceed with group mapping and laundry management DB entries
                continueSignupProcess(res, memberId, username, role, dob, email);
            });
        });
    } catch (error) {
        console.error('Unexpected error in signup:', error);
        logger(`Unexpected error in signup: ${error.message}`, false);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Helper function for subsequent operations
function continueSignupProcess(res, memberId, username, role, dob, email) {
    // Insert into CIMS MemberGroupMapping (connection2)
    const mappingQuery = 'INSERT INTO MemberGroupMapping (MemberID, GroupID) VALUES (?, ?)';
    connection2.query(mappingQuery, [memberId, 10], (mapErr) => {
        if (mapErr) {
            console.error('Error inserting into MemberGroupMapping:', mapErr);
            logger(`Error inserting into MemberGroupMapping - MemberID: ${memberId}, Error: ${mapErr.message}`, false);
            return res.status(500).json({ error: 'Failed to add member to group' });
        }
        
        logger(`Member added to group successfully - MemberID: ${memberId}, GroupID: 10`, false);

        // Insert into laundry management database (connection1)
        const age = calculateAge(dob);
        const targetTable = role.toLowerCase() === 'admin' ? 'staff' : 'customers';
        
        const baseQuery = role.toLowerCase() === 'admin' 
            ? `INSERT INTO staff 
               (staff_id, staff_name, staff_age, staff_email, hire_date) 
               VALUES (?, ?, ?, ?, ?)`
            : `INSERT INTO customers 
               (customer_id, customer_name, Age, customer_email) 
               VALUES (?, ?, ?, ?)`;

        const queryParams = role.toLowerCase() === 'admin'
            ? [memberId, username, age, email, new Date().toISOString().split('T')[0]]
            : [memberId, username, age, email];

        connection1.query(baseQuery, queryParams, (dbErr) => {
            if (dbErr) {
                console.error(`Error inserting into ${targetTable}:`, dbErr);
                logger(`Error inserting into ${targetTable} - MemberID: ${memberId}, Error: ${dbErr.message}`, false);
                // Continue even if laundry management DB insertion fails
            } else {
                console.log(`Successfully created ${targetTable} record`);
                logger(`Successfully created ${targetTable} record - MemberID: ${memberId}`, false);
            }

            // Insert into images table
            const insertImageQuery = `INSERT INTO images (MemberID, ImagePath) VALUES (?, ?)`;
            connection1.query(insertImageQuery, [memberId, 'None'], (imgErr) => {
                if (imgErr) {
                    console.error('Error inserting into images table:', imgErr);
                    logger(`Failed to insert into images - MemberID: ${memberId}, Error: ${imgErr.message}`, false);
                } else {
                    logger(`Image record inserted successfully - MemberID: ${memberId}`, false);
                }

                //  Generate and return JWT token
                generateAndReturnToken(res, memberId, username, role);
            });
        });
    });
}

function generateAndReturnToken(res, memberId, username, role) {
    const tokenPayload = { memberId, username, role };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    const decoded = jwt.decode(token);
    const expiryTimestamp = decoded.exp;

    // Update CIMS login table (connection2)
    const updateQuery = 'UPDATE Login SET Session = ?, Expiry = ? WHERE MemberID = ?';
    connection2.query(updateQuery, [token, expiryTimestamp, memberId], (updateErr) => {
        if (updateErr) {
            console.error('Session update error:', updateErr);
            logger(`Session update error - MemberID: ${memberId}, Error: ${updateErr.message}`, false);
            return res.status(201).json({
                message: 'Signup completed with partial success - session not saved',
                "session token": token
            });
        }
        
        logger(`Signup completed successfully - MemberID: ${memberId}, Username: ${username}, Role: ${role}`, true);
        res.status(201).json({
            message: 'Signup successful. All records created.',
            "session token": token
        });
    });
}

export { signup };
