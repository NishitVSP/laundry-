import { databaseQuery2 } from './cs432cimsQuery.js';
import logger from '../utils/logger.js';

export const cs432queryController = (req, res) => {
    const { query, params } = req.body;
    const userId = req.user?.memberId || 'Unknown';
    
    logger(`CIMS query controller request - User ID: ${userId}`, req.user?.isAuthenticated);

    // Debug log
    console.log("Incoming query:", query);
    console.log("Incoming params:", params);

    databaseQuery2(query, params || [], (err, results) => {
        if (err) {
            logger(`CIMS query controller failed - User ID: ${userId}, Error: ${err.message}`, req.user?.isAuthenticated);
            return res.status(400).json({ error: err.message });
        }
        
        logger(`CIMS query controller success - User ID: ${userId}, Results: ${results?.length || 0} rows`, req.user?.isAuthenticated);
        res.status(200).json({ message: "Query executed successfully", results });
    });
};
