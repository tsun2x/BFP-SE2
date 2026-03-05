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

export function requireRoles(roleNames = []) {
  const allowed = Array.isArray(roleNames) ? roleNames : [roleNames];
  const allowedSet = new Set(allowed.map((r) => String(r || '').toLowerCase()));

  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const role = String(user.role || '').toLowerCase();
    if (!allowedSet.has(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }

    next();
  };
}

export function isAdminUser(user) {
  return String(user?.role || '').toLowerCase() === 'admin';
}

export function getUserStationId(user) {
  return user?.assigned_station_id ?? user?.assignedStationId ?? null;
}

export default requireRole;
