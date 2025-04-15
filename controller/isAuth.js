// laundrymanagement\controller\isAuth.js
import { connection2 } from '../dbconnection/connection.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

export const isAuth = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  logger(`Authentication check requested`, false);
  
  if (!token) {
    logger(`Authentication failed - No session token provided`, false);
    return res.status(401).json({ error: "No session found" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? "Session expired" : "Invalid session token";
    logger(`Authentication failed - ${msg}`, false);
    return res.status(401).json({ error: msg });
  }

  const { memberId, username, role } = decoded;
  logger(`Token verified for user: ${username}, MemberId: ${memberId}, Role: ${role}`, false);
  const query = "SELECT Expiry FROM Login WHERE MemberID = ? AND Session = ?";

  connection2.query(query, [memberId, token], (err, results) => {
    console.log((err, results));
    
    if (err) {
      logger(`Database error during authentication check: ${err.message}`, false);
      return res.status(500).json({ error: "Database error" });
    }
    if (!results.length) {
      logger(`Authentication failed - Invalid session token for user: ${username}`, false);
      return res.status(401).json({ error: "Invalid session token" });
    }

    const expiry = new Date(results[0].Expiry * 1000).toISOString();
    logger(`User authenticated successfully - Username: ${username}, Role: ${role}, Expiry: ${expiry}`, true);
    return res.status(200).json({ message: "User is authenticated", username, role, expiry });
  });
};
