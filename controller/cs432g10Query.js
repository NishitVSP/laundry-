// laundrymanagement/controller/databaseQuery1.js
import { connection1 } from '../dbconnection/connection.js';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

// Safe SQL command types
const allowedCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SHOW'];

export const databaseQuery1 = (req, res) => {
    const { query, params } = req.body;
    const userId = req.user?.id || 'Unknown'; // assuming user info is attached in auth middleware
    
    logger(`SQL query attempt - User ID: ${userId}, Query: ${query?.substring(0, 100)}${query?.length > 100 ? '...' : ''}`, req.user?.isAuthenticated);

    if (!query) {
        logger(`SQL query failed - Missing query`, req.user?.isAuthenticated);
        return res.status(400).json({ error: 'SQL query is required' });
    }

    // Extract the first word (command) and uppercase it
    const command = query.trim().split(' ')[0].toUpperCase();

    if (!allowedCommands.includes(command)) {
        logger(`SQL query rejected - Disallowed command: ${command}`, req.user?.isAuthenticated);
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
            logger(`SQL query execution failed - Command: ${command}, Error: ${error.message}`, req.user?.isAuthenticated);
            return res.status(400).json({
                error: 'Query execution failed',
                details: error.sqlMessage || error.message,
            });
        }

        logger(`SQL query executed successfully - Command: ${command}, Results: ${results?.length || 0} rows`, req.user?.isAuthenticated);
        return res.status(200).json({
            message: 'Query executed successfully',
            results
        });
    });
};
