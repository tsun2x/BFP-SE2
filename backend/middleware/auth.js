import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.warn(`[Auth] Missing token for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      message: 'Access token is missing'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.warn(`[Auth] Token invalid for ${req.method} ${req.originalUrl}: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token has expired'
      });
    }
    return res.status(403).json({
      message: 'Invalid or malformed token'
    });
  }
};

export default authenticateToken;
