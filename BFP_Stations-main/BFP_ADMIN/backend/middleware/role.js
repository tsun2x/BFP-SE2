export function requireRole(roleName) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (user.role !== roleName) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

export default requireRole;
