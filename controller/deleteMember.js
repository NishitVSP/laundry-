import { connection1, connection2 } from '../dbconnection/connection.js';

export const deleteMember = (req, res) => {
    const { memberId } = req.body;

    if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required' });
    }

    // Count how many groups the member belongs to
    connection2.query(
        `SELECT COUNT(*) AS groupCount FROM MemberGroupMapping WHERE MemberID = ?`,
        [memberId],
        (countErr, countResults) => {
            if (countErr) {
                console.error(countErr);
                return res.status(500).json({ error: 'Failed to check group associations' });
            }

            const groupCount = countResults[0].groupCount;

            if (groupCount > 1) {
                // Member belongs to multiple groups, just remove group 10
                connection2.query(
                    `DELETE FROM MemberGroupMapping WHERE MemberID = ? AND GroupID = 10`,
                    [memberId],
                    (deleteMappingErr) => {
                        if (deleteMappingErr) {
                            console.error(deleteMappingErr);
                            return res.status(500).json({ error: 'Failed to remove group mapping' });
                        }

                        return res.status(200).json({
                            message: "Removed member from Group 10 only (member belongs to other groups too).",
                            deletedGroup: 10,
                            memberId
                        });
                    }
                );
            } else {
                //Member belongs only to Group 10 — delete all records
                connection2.query(
                    `DELETE FROM Login WHERE MemberID = ?`,
                    [memberId],
                    (loginErr) => {
                        if (loginErr) {
                            console.error(loginErr);
                            return res.status(500).json({ error: 'Login entry deletion failed' });
                        }

                        connection2.query(
                            `DELETE FROM members WHERE ID = ?`,
                            [memberId],
                            (memberErr) => {
                                if (memberErr) {
                                    console.error(memberErr);
                                    return res.status(500).json({ error: 'Member deletion failed' });
                                }

                                connection2.query(
                                    `DELETE FROM MemberGroupMapping WHERE MemberID = ?`,
                                    [memberId],
                                    (mappingErr) => {
                                        if (mappingErr) {
                                            console.error(mappingErr);
                                            return res.status(500).json({ error: 'Group mapping deletion failed' });
                                        }

                                        connection1.query(
                                            `DELETE FROM customers WHERE customer_id = ?`,
                                            [memberId],
                                            (custErr) => {
                                                if (custErr) {
                                                    console.error(custErr);
                                                    return res.status(500).json({ error: 'Customer deletion failed' });
                                                }

                                                connection1.query(
                                                    `DELETE FROM staff WHERE staff_id = ?`,
                                                    [memberId],
                                                    (staffErr) => {
                                                        if (staffErr) {
                                                            console.error(staffErr);
                                                            return res.status(500).json({ error: 'Staff deletion failed' });
                                                        }

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
            }
        }
    );
};
