// controller/portfolioController.js
import { connection1 } from '../dbconnection/connection.js';

// Get portfolio for a specific user (their orders, complaints, and payments)
export const getUserPortfolio = (req, res) => {
    const customer_id = req.user.memberId;

    const query = `
        SELECT 
            o.order_id,
            o.order_status,
            o.Total_Amount,
            o.Pickup_Date,
            o.Delivery_Date,
            GROUP_CONCAT(DISTINCT CONCAT(i.item_type, ' (x', c.Quantity, ')') SEPARATOR ', ') AS items,
            p.Payment_Mode,
            p.Amount,
            comp.complaint_type,
            comp.complaint_status
        FROM orders o
        LEFT JOIN consists c ON o.order_id = c.order_id
        LEFT JOIN items i ON c.item_id = i.item_id
        LEFT JOIN do_payment p ON o.order_id = p.order_id AND p.customer_id = ?
        LEFT JOIN complaints comp ON o.order_id = comp.order_id
        WHERE o.customer_id = ?
        GROUP BY o.order_id, p.Payment_Mode, p.Amount, comp.complaint_type, comp.complaint_status
        ORDER BY o.Pickup_Date DESC
    `;

    connection1.query(query, [customer_id, customer_id], (err, results) => {
        console.log(results);
        
        if (err) return res.status(500).json({ error: 'Failed to fetch portfolio' });
        return res.status(200).json(results);
    });
};

// Get portfolios for all users (admin)
export const getAllPortfolios = (req, res) => {
    const query = `
        SELECT 
            cu.customer_id,
            cu.customer_name,
            o.order_id,
            o.order_status,
            o.Total_Amount,
            o.Pickup_Date,
            o.Delivery_Date,
            GROUP_CONCAT(DISTINCT CONCAT(i.item_type, ' (x', c.Quantity, ')') SEPARATOR ', ') AS items,
            p.Payment_Mode,
            p.Amount,
            comp.complaint_type,
            comp.complaint_status
        FROM customers cu
        LEFT JOIN orders o ON cu.customer_id = o.customer_id
        LEFT JOIN consists c ON o.order_id = c.order_id
        LEFT JOIN items i ON c.item_id = i.item_id
        LEFT JOIN do_payment p ON o.order_id = p.order_id AND cu.customer_id = p.customer_id
        LEFT JOIN complaints comp ON o.order_id = comp.order_id
        GROUP BY cu.customer_id, o.order_id, p.Payment_Mode, p.Amount, comp.complaint_type, comp.complaint_status
        ORDER BY cu.customer_id, o.Pickup_Date DESC
    `;

    connection1.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch portfolios' });
        return res.status(200).json(results);
    });
};
