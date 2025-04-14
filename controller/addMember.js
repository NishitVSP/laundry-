// laundrymanagement\controller\addMember.js
import { connection2, connection1 } from '../dbconnection/connection.js';
import bcrypt from 'bcrypt';

export const addMember = async (req, res) => {
    try {
        const { username, email, dob, password, role } = req.body;

        if (!username || !email || !dob || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(password, 5);

        // 1. Insert into CIMS members table (connection2)
        const memberQuery = 'INSERT INTO members (UserName, emailID, DoB) VALUES (?, ?, ?)';
        connection2.query(memberQuery, [username, email, dob], (err, result) => {
            if (err) {
                console.error('Error inserting into members:', err);
                return res.status(500).json({ error: err.message });
            }

            const memberId = result.insertId;

            // 2. Insert into CIMS login table (connection2)
            const loginQuery = 'INSERT INTO Login (MemberID, Password, Role) VALUES (?, ?, ?)';
            connection2.query(loginQuery, [memberId, hashedPassword, role], (loginErr) => {
                if (loginErr) {
                    console.error('Error inserting into login:', loginErr);
                    return res.status(500).json({ error: 'Failed to add login credentials' });
                }

                // Proceed with group mapping and laundry management DB entries
                continueSignupProcess(res, memberId, username, role, dob, email);
            });
        });
    } catch (error) {
        console.error('Unexpected error in signup:', error);
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

function continueSignupProcess(res, memberId, username, role, dob, email) {
    // 3. Insert into CIMS MemberGroupMapping (connection2)
    const mappingQuery = 'INSERT INTO MemberGroupMapping (MemberID, GroupID) VALUES (?, ?)';
    connection2.query(mappingQuery, [memberId, 10], (mapErr) => {
        if (mapErr) {
            console.error('Error inserting into MemberGroupMapping:', mapErr);
            return res.status(500).json({ error: 'Failed to add member to group' });
        }

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
                
            } else {
                console.log(`Successfully created ${targetTable} record`);
            }
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
