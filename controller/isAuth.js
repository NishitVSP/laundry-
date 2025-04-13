// laundrymanagement/controller/isAuth.js
export const isAuth = (req, res) => {
    const { memberId, email, role, exp } = req.user;
    const expiryDate = new Date(exp * 1000).toISOString();
    
    res.status(200).json({
      message: "User is authenticated",
      username: email,
      role,
      expiry: expiryDate
    });
  };
  