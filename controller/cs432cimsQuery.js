import { connection2 } from '../dbconnection/connection.js';

const databaseQuery2 = async (query, params = [], callback) => {
    if (!query || typeof query !== 'string' || query.trim() === '') {
        return callback(new Error('Invalid query: Query must be a non-empty string.'));
    }

    const restrictedKeywords = ['SELECT', 'UPDATE', 'DELETE', 'SHOW', 'INSERT'];
    const groupIDCondition = 'MemberGroupMapping.GroupID = 10';
    const trimmedQuery = query.trim();
    const queryType = trimmedQuery.split(' ')[0].toUpperCase();

    if (restrictedKeywords.includes(queryType)) {
        if (!trimmedQuery.toUpperCase().includes('MEMBERGROUPMAPPING')) {
            return callback(new Error('Query must involve the MemberGroupMapping table to enforce groupID condition.'));
        }
        

        if (!trimmedQuery.toUpperCase().includes(groupIDCondition.toUpperCase()))
            {
            if (['SELECT', 'SHOW'].includes(queryType)) {
                if (!trimmedQuery.toUpperCase().includes('WHERE')) {
                    query = `${trimmedQuery} WHERE ${groupIDCondition}`;
                } else {
                    query = trimmedQuery.replace(/WHERE/i, `WHERE ${groupIDCondition} AND `);
                }
            } else if (['UPDATE', 'DELETE'].includes(queryType)) {
                if (!trimmedQuery.toUpperCase().includes('WHERE')) {
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
            return callback(err);
        }
        callback(null, results);
    });
};

export { databaseQuery2 };
