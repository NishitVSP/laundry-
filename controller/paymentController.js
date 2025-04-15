import { connection1 } from '../dbconnection/connection.js';

// Get all payments (admin) or user's payments
export const getPayments = (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const customer_id = req.user?.memberId;

    const query = isAdmin
        ? `SELECT dp.*, p.Sender, p.Receiver, p.Date 
           FROM do_payment dp 
           JOIN payments p ON dp.payment_id = p.TransactionID`
        : `SELECT dp.*, p.Sender, p.Receiver, p.Date 
           FROM do_payment dp 
           JOIN payments p ON dp.payment_id = p.TransactionID 
           WHERE dp.customer_id = ?`;

    connection1.query(query, isAdmin ? [] : [customer_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch payments' });
        return res.status(200).json(results);
    });
};
export const makePayment = (req, res) => {
    const { payment_mode, date, order_id } = req.body;
    const customer_id = req.user?.memberId;

    if (!payment_mode || !date || !order_id) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Step 0: Fetch customer's name
    const getCustomerQuery = `SELECT customer_name FROM customers WHERE customer_id = ?`;
    connection1.query(getCustomerQuery, [customer_id], (err, customerResults) => {
        if (err || customerResults.length === 0) {
            console.log(customerResults);
            
            return res.status(404).json({ error: "Customer not found" });
        }

        const sender = customerResults[0].customer_name;
        const receiver = "FreshWash.INC";
        const payment_id = parseInt(`${customer_id}${order_id}`);


        // Step 1: Fetch order amount and validate ownership
        const orderQuery = `SELECT Total_Amount FROM orders WHERE order_id = ? AND customer_id = ?`;
        connection1.query(orderQuery, [order_id, customer_id], (err, results) => {
            if (err) return res.status(500).json({ error: "Database error while verifying order" });
            if (results.length === 0) {
                return res.status(404).json({ error: "Order not found or does not belong to you" });
            }

            const amount = results[0].Total_Amount;

            if (amount < 50) {
                return res.status(400).json({ error: "Amount must be at least 50" });
            }

            // Step 2: Insert into payments
            const insertPayment = `INSERT INTO payments (TransactionID, Sender, Receiver, Date) VALUES (?, ?, ?, ?)`;
            connection1.query(insertPayment, [payment_id, sender, receiver, date], (err) => {
                console.log(err);
                
                if (err) return res.status(500).json({ error: "Failed to record transaction" });

                // Step 3: Insert into do_payment
                const insertDoPayment = `INSERT INTO do_payment (customer_id, payment_id, Payment_Mode, Amount, order_id) VALUES (?, ?, ?, ?, ?)`;
                connection1.query(insertDoPayment, [customer_id, payment_id, payment_mode, amount, order_id], (err2) => {
                    if (err2) return res.status(500).json({ error: "Failed to associate payment" });

                    return res.status(201).json({ message: "Payment successful" });
                });
            });
        });
    });
};
