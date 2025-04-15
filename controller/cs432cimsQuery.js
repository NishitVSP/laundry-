import { connection2 } from '../dbconnection/connection.js';
import logger from '../utils/logger.js';

const databaseQuery2 = async (query, params = [], callback) => {
    // We don't have direct access to req.user here, 
    // so we'll log without the isAuthenticated flag,
    // and the controller using this function will handle authentication-based logging

    logger(`CIMS DB query requested: ${query?.substring(0, 100)}${query?.length > 100 ? '...' : ''}`, false);

    if (!query || typeof query !== 'string' || query.trim() === '') {
        logger(`CIMS DB query rejected - Invalid query format`, false);
        return callback(new Error('Invalid query: Query must be a non-empty string.'));
    }

    const restrictedKeywords = ['SELECT', 'UPDATE', 'DELETE', 'SHOW', 'INSERT'];
    const groupIDCondition = 'MemberGroupMapping.GroupID = 10';
    const trimmedQuery = query.trim();
    const queryType = trimmedQuery.split(' ')[0].toUpperCase();

    if (restrictedKeywords.includes(queryType)) {
        if (!trimmedQuery.toUpperCase().includes('MEMBERGROUPMAPPING')) {
            logger(`CIMS DB query rejected - Missing MemberGroupMapping table reference`, false);
            return callback(new Error('Query must involve the MemberGroupMapping table to enforce groupID condition.'));
        }
        
        if (!trimmedQuery.toUpperCase().includes(groupIDCondition.toUpperCase())) {
            logger(`CIMS DB query - Adding GroupID condition for ${queryType} operation`, false);
            
            if (['SELECT', 'SHOW'].includes(queryType)) {
                if (!trimmedQuery.toUpperCase().includes('WHERE')) {
                    query = `${trimmedQuery} WHERE ${groupIDCondition}`;
                } else {
                    query = trimmedQuery.replace(/WHERE/i, `WHERE ${groupIDCondition} AND `);
                }
            } else if (['UPDATE', 'DELETE'].includes(queryType)) {
                if (!trimmedQuery.toUpperCase().includes('WHERE')) {
                    logger(`CIMS DB query rejected - UPDATE/DELETE missing WHERE clause`, false);
                    return callback(new Error('UPDATE/DELETE queries must have a WHERE clause to enforce groupID.'));
                }
                query = trimmedQuery.replace(/WHERE/i, `WHERE ${groupIDCondition} AND `);
            }
        } else {
            query = trimmedQuery;
        }
    } else {
        query = trimmedQuery;
    }

    connection2.query(query, params, (err, results) => {
        if (err) {
            logger(`CIMS DB query execution failed - Error: ${err.message}`, false);
            return callback(err);
        }
        logger(`CIMS DB query executed successfully - Results: ${results?.length || 0} rows`, false);
        callback(null, results);
    });
};

export { databaseQuery2 };
