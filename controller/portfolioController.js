// controller/portfolioController.js
import { connection1 } from '../dbconnection/connection.js';
import logger from '../utils/logger.js';

// Get portfolio for a specific user (their orders, complaints, and payments)
export const getUserPortfolio = (req, res) => {
    const customer_id = req.user.memberId;
    logger(`Fetching user portfolio - Customer ID: ${customer_id}`, req.user?.isAuthenticated);

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
        
        if (err) {
            logger(`Failed to fetch portfolio - Customer ID: ${customer_id}, Error: ${err.message}`, req.user?.isAuthenticated);
            return res.status(500).json({ error: 'Failed to fetch portfolio' });
        }
        
        logger(`Portfolio retrieved successfully - Customer ID: ${customer_id}, Items: ${results.length}`, req.user?.isAuthenticated);
        return res.status(200).json(results);
    });
};

// Get portfolios for all users (admin)
export const getAllPortfolios = (req, res) => {
    logger(`Fetching all portfolios - User role: ${req.user?.role}`, req.user?.isAuthenticated);
    
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
        if (err) {
            logger(`Failed to fetch all portfolios - Error: ${err.message}`, req.user?.isAuthenticated);
            return res.status(500).json({ error: 'Failed to fetch portfolios' });
        }
        
        logger(`All portfolios retrieved successfully - Count: ${results.length}`, req.user?.isAuthenticated);
        return res.status(200).json(results);
    });
};
