// import { connection } from '../dbconnection/connection.js';

// export const databaseQuery = (req, res) => {
//     const { query, params } = req.body;

//     if (!query) {
//         return res.status(400).json({ error: 'SQL query is required' });
//     }

//     connection.query(query, params || [], (error, results) => {
//         if (error) {
//             return res.status(400).json({ 
//                 error: error.message,
//                 sqlMessage: error.sqlMessage 
//             });
//         }
        
//         return res.status(200).json({
//             message: "Query executed successfully",
//             results
//         });
//     });
// };
