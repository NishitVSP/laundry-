// laundrymanagement\controller\signup.js

import { connection } from '../dbconnection/connection.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWTPRIVATEKEY;
const JWT_EXPIRY = '2h';

const signup = async (req, res) => {
  try {
    const { username, email, dob, password, role } = req.body;

    if (!username || !email || !dob || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 5);

    // 1. Insert into members table
    const memberQuery = 'INSERT INTO members (UserName, emailID, DoB) VALUES (?, ?, ?)';
    connection.query(memberQuery, [username, email, dob], (err, result) => {
      if (err) {
        console.error('Error inserting into members:', err);
        return res.status(500).json({ error: err.message });
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
          const tokenPayload = { memberId, email, role };
          const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
          
          // 5. Get token expiration timestamp
          const decoded = jwt.decode(token);
          const expiryTimestamp = decoded.exp;

          // 6. Update login table with session and expiry
          const updateQuery = `
            UPDATE Login 
            SET Session = ?, Expiry = ?
            WHERE MemberID = ?
          `;
          
          connection.query(
            updateQuery,
            [token, expiryTimestamp, memberId],
            (updateErr) => {
              if (updateErr) {
                console.error('Session update error:', updateErr);
                return res.status(201).json({
                  message: 'Signup completed with partial success - session not saved',
                  token
                });
              }

              // Final success response
              return res.status(201).json({
                message: 'Signup successful. Member, login, group mapping, and session created.',
                token
              });
            }
          );
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error in signup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export { signup };
