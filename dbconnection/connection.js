// laundrymanagement\dbconnection\connection.js
const mysql = require('mysql2');

// DB configuration
const dbConfig = {
    host: '10.0.116.125',
    user: 'insta',
    password: 'tempPass',
    database: 'cs432cims'
};

// Create connection
const connection = mysql.createConnection(dbConfig);

// Connect function
const connect = () => {
    return new Promise((resolve, reject) => {
        connection.connect((err) => {
            if (err) {
                console.error('❌ Error connecting to DB:', err.message);
                reject(err);
            } else {
                console.log('✅ Connected to DB:', dbConfig.database);
                resolve();
            }
        });
    });
};

module.exports = { connect, connection };
