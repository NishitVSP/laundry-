// laundrymanagement\dbconnection\connection.js
// In connection.js
import mysql from 'mysql2';

import dotenv from 'dotenv';
dotenv.config();

// DB configurations
const dbConfig1 = {
    host: '10.0.116.125',
    user: 'cs432g10',
    password: 'NzLbX7mT',
    database: 'cs432g10'
};

const dbConfig2 = {
    host: '10.0.116.125',
    user: 'cs432g10',
    password: 'NzLbX7mT',
    database: 'cs432cims'
};

// Create connections
const connection1 = mysql.createConnection(dbConfig1);
const connection2 = mysql.createConnection(dbConfig2);

// Connect function for dbConfig1
const connect1 = () => {
    return new Promise((resolve, reject) => {
        connection1.connect((err) => {
            if (err) {
                console.error('❌ Error connecting to g10:', err.message);
                reject(err);
            } else {
                console.log('✅ Connected to g10:', dbConfig1.database);
                resolve();
            }
        });
    });
};

// Connect function for dbConfig2
const connect2 = () => {
    return new Promise((resolve, reject) => {
        connection2.connect((err) => {
            if (err) {
                console.error('❌ Error connecting to cims:', err.message);
                reject(err);
            } else {
                console.log('✅ Connected to cims:', dbConfig2.database);
                resolve();
            }
        });
    });
};

export { connect1, connection1, connect2, connection2 };
