 let isAdmin = (req, res, next) => {
    if (req.user?.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: "Access denied. Admins only." });
  };
  
export {  isAdmin };