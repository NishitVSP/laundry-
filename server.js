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
import { addImage } from './controller/addImage.js';
import { deleteMember } from './controller/deleteMember.js';
import { databaseQuery1 } from './controller/cs432g10Query.js';
import { cs432queryController } from './controller/cs432queryController.js';
import logger from './utils/logger.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: 'http://localhost:3000',
        credentials: true,
    })
);

// Connect to both databases before starting the server
Promise.all([connect1(), connect2()])
    .then(() => {
        console.log('✅ Connected to both databases');
        logger('Server started - Connected to both databases', true);
        // 🎧 Start the server
        const PORT = 4000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            logger(`Server running on http://localhost:${PORT}`, true);
        });
    })
    .catch((err) => {
        console.error('❌ Database connection failed. Server will not start.');
        logger(`Database connection failed: ${err.message}`, false);
        process.exit(1); // Exit app if DB fails
    });

// Test root route
app.get('/', (req, res) => {
    logger('Root endpoint accessed', req.user?.isAuthenticated);
    res.json({ message: 'Welcome to test APIs' });
});

// Route to show tables (using connection1 for cs432g10)
app.get('/tables', (req, res) => {
    logger('Tables endpoint accessed', req.user?.isAuthenticated);
    connection1.query('SHOW TABLES', (err, results) => {
        if (err) {
            logger(`Error fetching tables: ${err.message}`, req.user?.isAuthenticated);
            return res.status(500).json({ error: err.message });
        }

        const tableKey = Object.keys(results[0])[0]; // e.g., Tables_in_cs432g10
        const tables = results.map((row) => row[tableKey]);

        logger(`Tables retrieved successfully. Count: ${tables.length}`, req.user?.isAuthenticated);
        res.status(200).json({ tables });
    });
});

// Public routes
app.post('/signup', signup);
app.post('/login', login);
app.put('/add-image', isAuthenticated, addImage);

// Authentication route
app.get('/isAuth', isAuth);
app.get('/checkAdmin', isAdmin);

// Admin routes (using connection2 for cs432cims)
// app.get('/admin/dashboard', isAuthenticated, isAdmin, someAdminController);
app.patch('/admin/deletemember', isAuthenticated, isAdmin, deleteMember);
app.post('/admin/addmember', isAuthenticated, isAdmin, addMember);
app.post('/admin/query1', isAuthenticated, isAdmin, databaseQuery1);
app.post('/admin/query2', isAuthenticated, isAdmin, cs432queryController);

// order router 
import orderRouter from './routes/ordersRoutes.js';
import complaints from './routes/complaintsRoutes.js';
import portfolio from './routes/portfolioRoutes.js';
import payment from './routes/paymentRoutes.js';
app.use('/', orderRouter);
app.use('/', complaints);
app.use('/protfolio', portfolio); // localhost:4000/protfolio/(name)
app.use('/payment', payment); 