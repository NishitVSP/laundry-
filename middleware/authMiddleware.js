import { connection2 } from '../dbconnection/connection.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

 let isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: "No session found" });

  const JWT_SECRET = process.env.JWTPRIVATEKEY;

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const errorMessage = err.name === 'TokenExpiredError' ? "Session expired" : "Invalid session token";
    return res.status(401).json({ error: errorMessage });
  }

  const { memberId, username, role } = decoded;

  const query = "SELECT Expiry FROM Login WHERE MemberID = ? AND Session = ?";
  connection2.query(query, [memberId, token], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!results.length) return res.status(401).json({ error: "Invalid session token" });

    const expiry = results[0].Expiry;
    if (Date.now() >= expiry * 1000) {
      return res.status(401).json({ error: "Session expired" });
    }

    // Attach user to request for downstream use
    req.user = { memberId, username, role };
    next();
  });
};
export { isAuthenticated };