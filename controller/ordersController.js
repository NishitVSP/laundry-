// controller/ordersController.js
import { connection1 } from '../dbconnection/connection.js';

// Place new order
export const placeOrder = (req, res) => {
    const { customer_id, items, pickup_date } = req.body;

    if (!customer_id || !Array.isArray(items) || items.length === 0 || !pickup_date) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    // Calculate total amount
    const itemIds = items.map(i => i.item_id);
    const quantities = items.reduce((map, item) => {
        map[item.item_id] = item.quantity;
        return map;
    }, {});

    const getPricesQuery = `SELECT item_id, Price FROM items WHERE item_id IN (${itemIds.map(() => '?').join(',')})`;

    connection1.query(getPricesQuery, itemIds, (err, results) => {
        if (err || results.length !== itemIds.length) {
            return res.status(400).json({ error: 'Invalid item(s) or database error' });
        }

        let total = 0;
        results.forEach(({ item_id, Price }) => {
            total += Price * quantities[item_id];
        });

        // Insert into orders table
        const orderData = [customer_id, 'Pending', total, pickup_date];
        const orderQuery = `INSERT INTO orders (customer_id, order_status, Total_Amount, Pickup_Date) VALUES (?, ?, ?, ?)`;

        connection1.query(orderQuery, orderData, (err, orderResult) => {
            if (err) return res.status(500).json({ error: 'Order creation failed' });

            const order_id = orderResult.insertId;

            // Insert into consists
            const consistsValues = items.map(item => [order_id, item.item_id, item.quantity]);
            connection1.query(`INSERT INTO consists (order_id, item_id, Quantity) VALUES ?`, [consistsValues], (err) => {
                if (err) return res.status(500).json({ error: 'Items association failed' });

                // Insert into places
                const date = new Date().toISOString().split('T')[0];
                connection1.query(`INSERT INTO places (customer_id, order_id, order_date) VALUES (?, ?, ?)`,
                    [customer_id, order_id, date],
                    (err) => {
                        if (err) return res.status(500).json({ error: 'Order linking failed' });

                        return res.status(201).json({ message: 'Order placed successfully', order_id });
                    });
            });
        });
    });
};

// List all orders (admin) or user's orders
export const listOrders = (req, res) => {
    console.log(req.user);

    const isAdmin = req.user?.role === 'admin';
    const customer_id = req.user?.memberId;
    console.log(`User ID: ${customer_id}, Role: ${req.user?.role}`);

    const query = isAdmin
        ? `
            SELECT 
                o.order_id,
                o.customer_id,
                o.order_status,
                o.Total_Amount,
                o.Pickup_Date,
                o.Delivery_Date,
                i.item_type,
                c.Quantity
            FROM orders o
            JOIN consists c ON o.order_id = c.order_id
            JOIN items i ON c.item_id = i.item_id
            ORDER BY o.order_id DESC
        `
        : `
            SELECT 
                o.order_id,
                o.customer_id,
                o.order_status,
                o.Total_Amount,
                o.Pickup_Date,
                o.Delivery_Date,
                i.item_type,
                c.Quantity
            FROM orders o
            JOIN consists c ON o.order_id = c.order_id
            JOIN items i ON c.item_id = i.item_id
            WHERE o.customer_id = ?
            ORDER BY o.order_id DESC
        `;

    connection1.query(query, isAdmin ? [] : [customer_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }

        // Optionally group items by order
        const grouped = results.reduce((acc, row) => {
            const {
                order_id,
                customer_id,
                order_status,
                Total_Amount,
                Pickup_Date,
                Delivery_Date,
                item_type,
                Quantity
            } = row;

            if (!acc[order_id]) {
                acc[order_id] = {
                    order_id,
                    customer_id,
                    order_status,
                    Total_Amount,
                    Pickup_Date,
                    Delivery_Date,
                    items: []
                };
            }

            acc[order_id].items.push({ item_type, Quantity });
            return acc;
        }, {});

        const response = Object.values(grouped);
        return res.status(200).json(response);
    });
};

// Update order status (admin only)
export const updateOrderStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Picked up', 'Pending', 'Delivered'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    // Base query
    let query = `UPDATE orders SET order_status = ?`;
    const queryParams = [status];

    // If status is "Delivered", include Delivery_Date
    if (status === 'Delivered') {
        query += `, Delivery_Date = ?`;
        const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        queryParams.push(currentDate);
    }

    query += ` WHERE order_id = ?`;
    queryParams.push(id);

    connection1.query(query, queryParams, (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to update order status' });

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        return res.status(200).json({ message: 'Order status updated successfully' });
    });
};

