import fs from 'fs';
import path from 'path';
import { connection1 } from '../dbconnection/connection.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(__dirname, './api.log');
const timestamp = new Date().toISOString();

// Log to local file
const logToFile = (message) => {
  fs.appendFile(logFile, `${timestamp} - ${message}\n`, (err) => {
    if (err) console.error('Local log failed:', err);
  });
};

// Log to server database
const logToServer = async (description) => {
  try {
    await connection1.promise().query(
      'INSERT INTO _logs (_timestamp, _description) VALUES (?, ?)',
      [timestamp, description]
    );
  } catch (err) {
    console.error('Server log failed:', err);
  }
};

// Unified logger
const logger = (message, isSessionValid) => {
  logToFile(message); // Always log locally
  if (isSessionValid) logToServer(message); // Log to server only if session valid
};

export default logger;
