import express from 'express';
import { connect1, connect2, connection1, connection2 } from './dbconnection/connection.js';
import { signup } from './controller/signup.js';
import { login } from './controller/login.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { isAuth } from './controller/isAuth.js';
import { isAuthenticated } from './middleware/authMiddleware.js';
import { isAdmin } from './middleware/authorize.js';
import { addImage } from './controller/addImage.js';
import logger from './utils/logger.js';
import orderRouter from './routes/ordersRoutes.js';
import complaintsRouter from './routes/complaintsRoutes.js';
import portfolio from './routes/portfolioRoutes.js';
import payment from './routes/paymentRoutes.js';
import profileRouter from './routes/profileRoutes.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Improve CORS configuration 
app.use(
    cors({
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204
    })
);

// Add a middleware to log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('Body:', req.body);
    }
    next();
});

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

// Public routes
app.post('/signup', signup);
app.post('/login', login);
app.put('/add-image', isAuthenticated, addImage);

// Add direct route for updating address
app.put('/update-address', isAuthenticated, (req, res) => {
  import('./controller/ProfileController.js').then(({ updateAddress }) => {
    updateAddress(req, res);
  }).catch(err => {
    console.error('Error importing ProfileController:', err);
    res.status(500).json({ error: 'Failed to process address update' });
  });
});

// Add direct route for updating phone
app.put('/update-phone', isAuthenticated, (req, res) => {
  import('./controller/ProfileController.js').then(({ updatePhone }) => {
    updatePhone(req, res);
  }).catch(err => {
    console.error('Error importing ProfileController:', err);
    res.status(500).json({ error: 'Failed to process phone update' });
  });
});

// Authentication route
app.get('/isAuth', isAuth);

// Custom SQL query endpoint for admins
app.post('/admin/query', isAuthenticated, isAdmin, (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'SQL query is required' });
  }
  
  // Only allow queries to the laundry database (connection1)
  const connection = connection1;
  
  // Security check - prevent any DROP, CREATE, ALTER operations
  const unsafeOperations = ['DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'RENAME', 'DELETE FROM', 'UPDATE'];
  const isUnsafe = unsafeOperations.some(op => 
    query.toUpperCase().includes(op)
  );
  
  if (isUnsafe) {
    return res.status(403).json({ 
      error: 'Unsafe SQL operations are not allowed',
      message: 'For security reasons, DROP, CREATE, ALTER, TRUNCATE, RENAME, DELETE, and UPDATE operations are blocked.'
    });
  }
  
  // Log the query
  logger(`Admin executing SQL query on cs432g10: ${query}`, true);
  
  // Execute the query
  connection.query(query, (err, results) => {
    if (err) {
      logger(`SQL query error: ${err.message}`, false);
      return res.status(400).json({ 
        error: 'Query execution failed', 
        message: err.message 
      });
    }
    
    logger(`SQL query executed successfully`, true);
    res.status(200).json({ 
      message: 'Query executed successfully',
      results: results,
      rowCount: Array.isArray(results) ? results.length : 0
    });
  });
});

// Admin endpoint to add a new member
app.post('/admin/addmember', isAuthenticated, isAdmin, (req, res) => {
  const { username, email, password, role } = req.body;
  
  // Validate input
  if (!username || !email || !password) {
    logger('Add member failed: Missing required fields', false);
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  
  // Check for valid role
  const validRole = role === 'admin' || role === 'user';
  if (!validRole) {
    logger(`Add member failed: Invalid role specified: ${role}`, false);
    return res.status(400).json({ error: 'Role must be either "admin" or "user"' });
  }
  
  // Check if email already exists
  connection1.query(
    'SELECT ID FROM members WHERE emailID = ?',
    [email],
    (err, results) => {
      if (err) {
        logger(`Database error checking email existence: ${err.message}`, false);
        return res.status(500).json({ error: 'Database error', message: err.message });
      }
      
      if (results.length > 0) {
        logger(`Add member failed: Email ${email} already exists`, false);
        return res.status(409).json({ error: 'Email already exists' });
      }
      
      // Insert new user into members table
      connection1.query(
        'INSERT INTO members (UserName, emailID, passwords, role) VALUES (?, ?, ?, ?)',
        [username, email, password, role],
        (err, result) => {
          if (err) {
            logger(`Database error creating member: ${err.message}`, false);
            return res.status(500).json({ error: 'Failed to create member', message: err.message });
          }
          
          const memberId = result.insertId;
          logger(`New member created with ID ${memberId} and role ${role}`, true);
          
          // Return success response
          res.status(201).json({
            message: 'Member created successfully',
            memberId: memberId,
            username: username,
            role: role
          });
        }
      );
    }
  );
});

// Admin endpoint to delete a member
app.patch('/admin/deletemember', isAuthenticated, isAdmin, (req, res) => {
  const { memberID } = req.body;
  
  if (!memberID) {
    logger('Delete member failed: Missing member ID', false);
    return res.status(400).json({ error: 'Member ID is required' });
  }
  
  // First check if member exists
  connection1.query(
    'SELECT ID, UserName, role FROM members WHERE ID = ?',
    [memberID],
    (err, results) => {
      if (err) {
        logger(`Database error checking member existence: ${err.message}`, false);
        return res.status(500).json({ error: 'Database error', message: err.message });
      }
      
      if (results.length === 0) {
        logger(`Delete member failed: Member with ID ${memberID} not found`, false);
        return res.status(404).json({ error: 'Member not found' });
      }
      
      const memberToDelete = results[0];
      
      // Prevent deletion of own account
      if (req.user && req.user.id === memberID) {
        logger(`Delete member failed: Attempted to delete own account (ID: ${memberID})`, false);
        return res.status(403).json({ error: 'You cannot delete your own account' });
      }
      
      // Use soft deletion by setting 'isDeleted' flag or similar
      // This is safer than actually deleting records that might have relationships
      connection1.query(
        'UPDATE members SET isActive = 0 WHERE ID = ?',
        [memberID],
        (err, result) => {
          if (err) {
            logger(`Database error deleting member: ${err.message}`, false);
            return res.status(500).json({ error: 'Failed to delete member', message: err.message });
          }
          
          if (result.affectedRows === 0) {
            logger(`Delete member failed: No rows affected for ID ${memberID}`, false);
            return res.status(500).json({ error: 'Failed to delete member' });
          }
          
          logger(`Member ${memberID} (${memberToDelete.UserName}) successfully deactivated`, true);
          res.status(200).json({
            message: 'Member successfully deleted',
            memberId: memberID
          });
        }
      );
    }
  );
});

app.use('/', orderRouter);
app.use('/', complaintsRouter);
app.use('/protfolio', portfolio); // localhost:4000/protfolio/(name)
app.use('/payment', payment);
app.use('/profile', profileRouter);

// Add debug endpoint to check if server is working
app.get('/debug', (req, res) => {
  console.log('Debug endpoint accessed at', new Date().toISOString());
  res.status(200).json({ message: 'Server is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
}); 