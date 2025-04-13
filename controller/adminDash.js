export const someAdminController = async (req, res) => {
    try {
        // Your admin-specific logic here
        res.status(200).json({ message: "Admin action performed successfully" });
    } catch (error) {
        console.error("Admin action error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}