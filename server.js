// laundrymanagement\server.js
const express = require('express');
const { connect, connection } = require('./dbconnection/connection');
const { signup } = require('./controller/signup');
const { login } = require('./controller/login');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { isAuth } = require('./controller/isAuth');
const { isAuthenticated } = require('./middleware/authMiddleware');
const { isAdmin } = require('./middleware/authorize');
const { someAdminController } = require('./controller/adminDash');
const { deleteMember } = require('./controller/deleteMember');
const { addMember } = require('./controller/addMember');
const { databaseQuery } = require('./controller/databaseQuery');
// import { authenticate } from './middleware/auth.js';
// import { isAuth } from './controller/isAuth.js';

const app = express();
app.use(express.json());
app.use(cookieParser())
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
    res.json({ message: "Welcome to test apis" });
});

// Protected endpoints
// app.get('/isAuth', authenticate, isAuth);
// app.post('/updateLaundryStatus', authenticate, (req, res) => {
//   // Your protected business logic here
// });

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

app.get("/isAuth", isAuth);

// Admine routes
app.get("/admin/dashboard", isAuthenticated, isAdmin, someAdminController);
app.patch("/admin/deletemember", isAuthenticated, isAdmin, deleteMember);
app.post("/admin/addmember", isAuthenticated, isAdmin, addMember);
app.post("/admin/query", isAuthenticated, isAdmin, databaseQuery);



// 🎧 Start the server
const PORT =4000
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
