//  /server.js
const express = require('express');
const { connect, connection } = require('./dbconnection/connection');
const { signup } = require('./controller/signup');
const { login } = require('./controller/login');
const cors = require('cors');


const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000', // Replace with your Next.js frontend URL
    credentials: true, // If you're using cookies or authorization headers
}));

// ✅ Connect to the DB before starting the server
connect().catch((err) => {
    console.error('Database connection failed. Server will not start.');
    process.exit(1); // Exit app if DB fails
});

// ✅ Test root route
app.get('/', (req, res) => {
    res.json({ message: 'Hello, you are welcome' });
});

// ✅ Route to show tables
app.get('/tables', (req, res) => {
    connection.query('SHOW TABLES', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const tableKey = Object.keys(results[0])[0]; // e.g., Tables_in_cs432cims
        const tables = results.map(row => row[tableKey]);


        res.status(200).json({ tables });
    });
});

app.post("/signup", signup);
app.post("/login",login);

// 🎧 Start the server
const PORT =4000
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
