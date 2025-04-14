import express from 'express';
import { connect1, connect2, connection1, connection2 } from './dbconnection/connection.js';
import { signup } from './controller/signup.js';
import { login } from './controller/login.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { isAuth } from './controller/isAuth.js';
import { isAuthenticated } from './middleware/authMiddleware.js';
import { isAdmin } from './middleware/authorize.js';
import { addMember } from './controller/addMember.js';
// import { someAdminController } from './controller/adminDash.js';
import { deleteMember } from './controller/deleteMember.js';
import { databaseQuery1 } from './controller/cs432g10Query.js';
import { cs432queryController } from './controller/cs432queryController.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: 'http://localhost:3000', // Replace with your Next.js frontend URL
        credentials: true, // If you're using cookies or authorization headers
    })
);

// ✅ Connect to both databases before starting the server
Promise.all([connect1(), connect2()])
    .then(() => {
        console.log('✅ Connected to both databases');
        // 🎧 Start the server
        const PORT = 4000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Database connection failed. Server will not start.');
        process.exit(1); // Exit app if DB fails
    });

// ✅ Test root route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to test APIs' });
});

// ✅ Route to show tables (using connection1 for cs432g10)
app.get('/tables', (req, res) => {
    connection1.query('SHOW TABLES', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const tableKey = Object.keys(results[0])[0]; // e.g., Tables_in_cs432g10
        const tables = results.map((row) => row[tableKey]);

        res.status(200).json({ tables });
    });
});

// Public routes
app.post('/signup', signup);
app.post('/login', login);

// Authentication route
app.get('/isAuth', isAuth);

// Admin routes (using connection2 for cs432cims)
// app.get('/admin/dashboard', isAuthenticated, isAdmin, someAdminController);
app.patch('/admin/deletemember', isAuthenticated, isAdmin, deleteMember);
app.post('/admin/addmember', isAuthenticated, isAdmin, addMember);
app.post('/admin/query1', isAuthenticated, isAdmin, databaseQuery1);
app.post('/admin/query2', isAuthenticated, isAdmin, cs432queryController);
