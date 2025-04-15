import { connection2 } from '../dbconnection/connection.js'; // Changed to connection2
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    logger(`Login attempt - Username: ${username}`, false); // Not authenticated yet

    if (!username || !password) {
      logger(`Login failed - Missing credentials`, false);
      return res.status(400).json({ error: 'Username and password required' });
    }

    // 1. Fetch login data by username (using connection2)
    const loginQuery = `
      SELECT l.Password, l.Role, l.MemberID 
      FROM Login l
      JOIN members m ON l.MemberID = m.ID
      WHERE m.UserName = ?
    `;

    // Changed to connection2.query
    connection2.query(loginQuery, [username], async (err, results) => {
      if (err) {
        console.error('DB error:', err);
        logger(`Login DB error for user ${username}: ${err.message}`, false);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        logger(`Login failed - Invalid username: ${username}`, false);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const { Password: hashedPassword, Role, MemberID } = results[0];

      // 2. Compare password (unchanged)
      const isMatch = await bcrypt.compare(password, hashedPassword);
      if (!isMatch) {
        logger(`Login failed - Invalid password for user: ${username}`, false);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // 3. Create JWT token (unchanged)
      const token = jwt.sign(
        { memberId: MemberID, username, role: Role },
        process.env.JWTPRIVATEKEY,
        { expiresIn: process.env.JWT_EXPIRY || '1d' }
      );

      // 4. Decode token for expiry (unchanged)
      const { exp } = jwt.decode(token);

      // 5. Update login session using connection2
      const updateQuery = `
        UPDATE Login 
        SET Session = ?, Expiry = ?
        WHERE MemberID = ?
      `;

      // Changed to connection2.query
      connection2.query(updateQuery, [token, exp, MemberID], (updateErr) => {
        if (updateErr) {
          console.error('Session update error:', updateErr);
          logger(`Session update error for user ${username}: ${updateErr.message}`, false);
          return res.status(500).json({ error: 'Login successful but session tracking failed' });
        }

        // Now user is authenticated
        logger(`Login successful - User: ${username}, Role: ${Role}, MemberId: ${MemberID}`, true);

        // 6. Send response (unchanged)
        return res.status(200).json({
          message: 'Login successful',
          'session token': token,
          user: {
            username,
            role: Role
          }
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    logger(`Login system error: ${error.message}`, false);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export { login };
