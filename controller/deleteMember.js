import { connection1, connection2 } from '../dbconnection/connection.js';
import logger from '../utils/logger.js';

export const deleteMember = (req, res) => {
    const { memberId } = req.body;
    logger(`Delete member attempt - MemberID: ${memberId}`, req.user?.isAuthenticated);

    if (!memberId) {
        logger(`Delete member failed - Member ID is required`, req.user?.isAuthenticated);
        return res.status(400).json({ error: 'Member ID is required' });
    }

    // Count how many groups the member belongs to
    connection2.query(
        `SELECT COUNT(*) AS groupCount FROM MemberGroupMapping WHERE MemberID = ?`,
        [memberId],
        (countErr, countResults) => {
            if (countErr) {
                console.error(countErr);
                logger(`Failed to check group associations - MemberID: ${memberId}, Error: ${countErr.message}`, req.user?.isAuthenticated);
                return res.status(500).json({ error: 'Failed to check group associations' });
            }

            const groupCount = countResults[0].groupCount;
            logger(`Found ${groupCount} group associations for MemberID: ${memberId}`, req.user?.isAuthenticated);

            if (groupCount > 1) {
                // Member belongs to multiple groups, just remove group 10
                connection2.query(
                    `DELETE FROM MemberGroupMapping WHERE MemberID = ? AND GroupID = 10`,
                    [memberId],
                    (deleteMappingErr) => {
                        if (deleteMappingErr) {
                            console.error(deleteMappingErr);
                            logger(`Failed to remove group mapping - MemberID: ${memberId}, Error: ${deleteMappingErr.message}`, req.user?.isAuthenticated);
                            return res.status(500).json({ error: 'Failed to remove group mapping' });
                        }

                        logger(`Removed member from Group 10 only - MemberID: ${memberId}`, req.user?.isAuthenticated);
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
                            logger(`Login entry deletion failed - MemberID: ${memberId}, Error: ${loginErr.message}`, req.user?.isAuthenticated);
                            return res.status(500).json({ error: 'Login entry deletion failed' });
                        }
                        
                        logger(`Login entry deleted - MemberID: ${memberId}`, req.user?.isAuthenticated);

                        connection2.query(
                            `DELETE FROM members WHERE ID = ?`,
                            [memberId],
                            (memberErr) => {
                                if (memberErr) {
                                    console.error(memberErr);
                                    logger(`Member deletion failed - MemberID: ${memberId}, Error: ${memberErr.message}`, req.user?.isAuthenticated);
                                    return res.status(500).json({ error: 'Member deletion failed' });
                                }
                                
                                logger(`Member record deleted - MemberID: ${memberId}`, req.user?.isAuthenticated);

                                connection2.query(
                                    `DELETE FROM MemberGroupMapping WHERE MemberID = ?`,
                                    [memberId],
                                    (mappingErr) => {
                                        if (mappingErr) {
                                            console.error(mappingErr);
                                            logger(`Group mapping deletion failed - MemberID: ${memberId}, Error: ${mappingErr.message}`, req.user?.isAuthenticated);
                                            return res.status(500).json({ error: 'Group mapping deletion failed' });
                                        }
                                        
                                        logger(`Group mapping deleted - MemberID: ${memberId}`, req.user?.isAuthenticated);

                                        connection1.query(
                                            `DELETE FROM customers WHERE customer_id = ?`,
                                            [memberId],
                                            (custErr) => {
                                                if (custErr) {
                                                    console.error(custErr);
                                                    logger(`Customer deletion failed - MemberID: ${memberId}, Error: ${custErr.message}`, req.user?.isAuthenticated);
                                                    return res.status(500).json({ error: 'Customer deletion failed' });
                                                }
                                                
                                                logger(`Customer record deleted - MemberID: ${memberId}`, req.user?.isAuthenticated);

                                                connection1.query(
                                                    `DELETE FROM staff WHERE staff_id = ?`,
                                                    [memberId],
                                                    (staffErr) => {
                                                        if (staffErr) {
                                                            console.error(staffErr);
                                                            logger(`Staff deletion failed - MemberID: ${memberId}, Error: ${staffErr.message}`, req.user?.isAuthenticated);
                                                            return res.status(500).json({ error: 'Staff deletion failed' });
                                                        }
                                                        
                                                        logger(`Staff record deleted - MemberID: ${memberId}`, req.user?.isAuthenticated);
                                                        logger(`Member deleted successfully from all tables - MemberID: ${memberId}`, req.user?.isAuthenticated);

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
