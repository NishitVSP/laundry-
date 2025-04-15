// laundrymanagement\controller\addMember.js
import { connection2, connection1 } from '../dbconnection/connection.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

export const addMember = async (req, res) => {
    try {
        const { username, email, dob, password, role } = req.body;
        logger(`Add member attempt - Username: ${username}, Email: ${email}, Role: ${role}`, req.user?.isAuthenticated);

        if (!username || !email || !dob || !password || !role) {
            logger(`Add member failed - Missing required fields`, req.user?.isAuthenticated);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(password, 5);

        // 1. Insert into CIMS members table (connection2)
        const memberQuery = 'INSERT INTO members (UserName, emailID, DoB) VALUES (?, ?, ?)';
        connection2.query(memberQuery, [username, email, dob], (err, result) => {
            if (err) {
                console.error('Error inserting into members:', err);
                logger(`Error inserting into members table: ${err.message}`, req.user?.isAuthenticated);
                return res.status(500).json({ error: err.message });
            }

            const memberId = result.insertId;
            logger(`Member created successfully - MemberID: ${memberId}`, req.user?.isAuthenticated);

            // 2. Insert into CIMS login table (connection2)
            const loginQuery = 'INSERT INTO Login (MemberID, Password, Role) VALUES (?, ?, ?)';
            connection2.query(loginQuery, [memberId, hashedPassword, role], (loginErr) => {
                if (loginErr) {
                    console.error('Error inserting into login:', loginErr);
                    logger(`Error inserting into login table - MemberID: ${memberId}, Error: ${loginErr.message}`, req.user?.isAuthenticated);
                    return res.status(500).json({ error: 'Failed to add login credentials' });
                }
                
                logger(`Login credentials created successfully - MemberID: ${memberId}`, req.user?.isAuthenticated);

                // Proceed with group mapping and laundry management DB entries
                continueSignupProcess(res, memberId, username, role, dob, email, req.user?.isAuthenticated);
            });
        });
    } catch (error) {
        console.error('Unexpected error in signup:', error);
        logger(`Unexpected error in add member: ${error.message}`, req.user?.isAuthenticated);
        res.status(500).json({ error: 'Internal server error' });
    }
};

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

function continueSignupProcess(res, memberId, username, role, dob, email, isAuthenticated) {
    // 3. Insert into CIMS MemberGroupMapping (connection2)
    const mappingQuery = 'INSERT INTO MemberGroupMapping (MemberID, GroupID) VALUES (?, ?)';
    connection2.query(mappingQuery, [memberId, 10], (mapErr) => {
        if (mapErr) {
            console.error('Error inserting into MemberGroupMapping:', mapErr);
            logger(`Error inserting into MemberGroupMapping - MemberID: ${memberId}, Error: ${mapErr.message}`, isAuthenticated);
            return res.status(500).json({ error: 'Failed to add member to group' });
        }
        
        logger(`Member added to group successfully - MemberID: ${memberId}, GroupID: 10`, isAuthenticated);

        // 4. Insert into laundry management database (connection1)
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
                logger(`Error inserting into ${targetTable} - MemberID: ${memberId}, Error: ${dbErr.message}`, isAuthenticated);
            } else {
                console.log(`Successfully created ${targetTable} record`);
                logger(`Successfully created ${targetTable} record - MemberID: ${memberId}`, isAuthenticated);
            }
            
            logger(`Add member completed successfully - MemberID: ${memberId}, Username: ${username}, Role: ${role}`, isAuthenticated);
            res.status(201).json({
                message: 'add member successful. All records created.',
                data: {
                    memberId,
                    username,
                    role,
                    email,
                    dob
                }
            });
        });
    });
}
