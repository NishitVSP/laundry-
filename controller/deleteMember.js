import { connection } from '../dbconnection/connection.js';

export const deleteMember = (req, res) => {
    const { memberId } = req.body;
    
    if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required' });
    }

    // 1. Delete from MemberGroupMapping first
    connection.query(
        `DELETE FROM MemberGroupMapping WHERE memberID = ?`,
        [memberId],
        (mappingErr) => {
            if (mappingErr) {
                return res.status(500).json({ error: 'Group mapping deletion failed' });
            }

            // 2. Delete from Login table
            connection.query(
                `DELETE FROM Login WHERE memberID = ?`,
                [memberId],
                (loginErr) => {
                    if (loginErr) {
                        return res.status(500).json({ error: 'Login entry deletion failed' });
                    }

                    // 3. Finally delete from Members table
                    connection.query(
                    `DELETE FROM members WHERE ID = ?`, // Changed from memberID to ID
                    [memberId],
                    (memberErr) => {
                    if (memberErr) {
                        console.log(memberErr);
                        return res.status(500).json({ error: 'Member deletion failed' });
                    }
                    return res.status(200).json({ 
                     message: "Member deleted successfully",
                    deletedMemberId: memberId
                });
            }
        );

                }
            );
        }
    );
};
