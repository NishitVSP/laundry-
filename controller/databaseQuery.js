// import { connection } from "../dbconnection/connection";

export const databaseQuery = async (req, res) => {
    try {
        // const query = req.body;
        return res.status(200).json({ message: "Query executed successfully"});
    } catch (error) {
        console.error("Database query error:", error);
        throw new Error("Database query failed");
    }
}