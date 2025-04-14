// laundrymanagement/controller/databaseQuery1.js
import { connection1 } from '../dbconnection/connection.js';
import fs from 'fs';
import path from 'path';

// Safe SQL command types
const allowedCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SHOW'];

export const databaseQuery1 = (req, res) => {
    const { query, params } = req.body;
    const userId = req.user?.id || 'Unknown'; // assuming user info is attached in auth middleware

    if (!query) {
        return res.status(400).json({ error: 'SQL query is required' });
    }

    // Extract the first word (command) and uppercase it
    const command = query.trim().split(' ')[0].toUpperCase();

    if (!allowedCommands.includes(command)) {
        return res.status(403).json({ error: `SQL command "${command}" is not allowed.` });
    }

    // Execute the query
    connection1.query(query, params || [], (error, results) => {
        const timestamp = new Date().toISOString();

        // Create log entry
        const logEntry = `[${timestamp}] AdminID: ${userId}, SQL: ${query}, Params: ${JSON.stringify(params)}, Error: ${error ? error.message : 'None'}\n`;

        // Save log to file
        const logPath = path.join('logs', 'admin_queries.log');
        fs.appendFileSync(logPath, logEntry);

        if (error) {
            return res.status(400).json({
                error: 'Query execution failed',
                details: error.sqlMessage || error.message,
            });
        }

        return res.status(200).json({
            message: 'Query executed successfully',
            results
        });
    });
};
