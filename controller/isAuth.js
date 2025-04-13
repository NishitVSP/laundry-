import { connection } from '../dbconnection/connection.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const isAuth = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No session found" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? "Session expired" : "Invalid session token";
    return res.status(401).json({ error: msg });
  }

  const { memberId, username, role } = decoded;
  const query = "SELECT Expiry FROM Login WHERE MemberID = ? AND Session = ?";

  connection.query(query, [memberId, token], (err, results) => {
    console.log((err, results));
    
    if (err) return res.status(500).json({ error: "Database error" });
    if (!results.length) return res.status(401).json({ error: "Invalid session token" });

    const expiry = new Date(results[0].Expiry * 1000).toISOString();
    return res.status(200).json({ message: "User is authenticated", username, role, expiry });
  });
};
