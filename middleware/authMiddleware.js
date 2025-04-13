// laundrymanagement/middleware/auth.js
import jwt from 'jsonwebtoken';
import { connection } from '../dbconnection/connection.js';

export const authenticate = (req, res, next) => {
  try {
    const token = req.body?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "No session found" });

    // Verify JWT structure first
    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
    
    // Check database session validity
    const checkQuery = `
      SELECT Expiry 
      FROM Login 
      WHERE MemberID = ? AND Session = ?
    `;

    connection.query(
      checkQuery,
      [decoded.memberId, token],
      (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (results.length === 0) return res.status(401).json({ error: "Invalid session token" });
        
        const expiry = results[0].Expiry;
        if (Date.now() >= expiry * 1000) {
          return res.status(401).json({ error: "Session expired" });
        }

        req.user = decoded;
        next();
      }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: "Invalid session token" });
  }
};
