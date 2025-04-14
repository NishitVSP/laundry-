import { databaseQuery2 } from './cs432cimsQuery.js';

export const cs432queryController = (req, res) => {
    const { query, params } = req.body;

    // Debug log
    console.log("Incoming query:", query);
    console.log("Incoming params:", params);

    databaseQuery2(query, params || [], (err, results) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.status(200).json({ message: "Query executed successfully", results });
    });
};
