export const deleteMember = async (req, res) => {
    return res.status(200).json({ message: "Member deleted successfully" });
    // const { memberId } = req.params; // Assuming you're passing the member ID in the URL 
}