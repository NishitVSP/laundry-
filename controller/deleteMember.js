import { connection1, connection2 } from '../dbconnection/connection.js';

export const deleteMember = (req, res) => {
    const { memberId } = req.body;

    if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required' });
    }

    // 1. Delete from Login table (connection2)
    connection2.query(
        `DELETE FROM Login
        WHERE MemberID = ?
        AND EXISTS (
            SELECT 1 FROM MemberGroupMapping
            WHERE MemberGroupMapping.MemberID = Login.MemberID
            AND GroupID = 10
        );`,
        [memberId],
        (loginErr) => {
            if (loginErr) {
                console.log(loginErr);
                return res.status(500).json({ error: 'Login entry deletion failed' });
            }

            // 2. Delete from Members table (connection2)
            connection2.query(
                `DELETE FROM members
                WHERE ID = ?
                AND EXISTS (
                    SELECT 1 FROM MemberGroupMapping
                    WHERE MemberGroupMapping.MemberID = members.ID
                    AND GroupID = 10
                );`,
                [memberId],
                (memberErr) => {
                    if (memberErr) {
                        console.log(memberErr);
                        return res.status(500).json({ error: 'Member deletion failed' });
                    }

                    // 3. Delete from MemberGroupMapping (connection2)
                    connection2.query(
                        `DELETE FROM MemberGroupMapping WHERE MemberID = ? AND GroupID = 10`,
                        [memberId],
                        (mappingErr) => {
                            if (mappingErr) {
                                console.log(mappingErr);
                                return res.status(500).json({ error: 'Group mapping deletion failed' });
                            }

                            // 4. Delete from customers (connection1)
                            connection1.query(
                                `DELETE FROM customers WHERE customer_id = ?`,
                                [memberId],
                                (custErr) => {
                                    if (custErr) {
                                        console.log(custErr);
                                        return res.status(500).json({ error: 'Customer deletion failed' });
                                    }

                                    // 5. Delete from staff (connection1)
                                    connection1.query(
                                        `DELETE FROM staff WHERE staff_id = ?`,
                                        [memberId],
                                        (staffErr) => {
                                            if (staffErr) {
                                                console.log(staffErr);
                                                return res.status(500).json({ error: 'Staff deletion failed' });
                                            }

                                            // ✅ All deletions successful
                                            return res.status(200).json({
                                                message: "Member deleted successfully from all relevant tables.",
                                                deletedMemberId: memberId
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};
