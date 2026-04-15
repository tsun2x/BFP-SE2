import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

function parseBearerToken(authHeader) {
  if (!authHeader) return null;

  // Accept slightly malformed formats like repeated "Bearer " prefix
  // or accidental wrapping quotes from persisted client state.
  let token = String(authHeader).trim();
  token = token.replace(/^Bearer\s+/i, '').trim();
  token = token.replace(/^Bearer\s+/i, '').trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  return token || null;
}

function decodeJwtPayloadUnsafe(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const payloadSegment = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = payloadSegment + '='.repeat((4 - (payloadSegment.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = parseBearerToken(authHeader);

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

    if (String(req.originalUrl || '').includes('/twilio/token')) {
      const payload = decodeJwtPayloadUnsafe(token);
      const tokenMeta = {
        tokenLength: String(token || '').length,
        dotCount: (String(token || '').match(/\./g) || []).length,
        iss: payload?.iss || null,
        role: payload?.role || null,
        ref: payload?.ref || null,
        sub: payload?.sub || null,
      };
      console.warn(`[Auth][TwilioToken] Invalid JWT metadata: ${JSON.stringify(tokenMeta)}`);
    }

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

export const optionalAuthenticateToken = (req, _res, next) => {
  const authHeader = req.headers['authorization'];
  const token = parseBearerToken(authHeader);

  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch {
    req.user = undefined;
  }

  return next();
};

export default authenticateToken;
