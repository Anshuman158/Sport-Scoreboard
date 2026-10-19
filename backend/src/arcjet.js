import 'dotenv/config';

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'live' ? 'live' : 'dry_run';

// Check if @arcjet/node is available and configured
let arcjet = null;
let shield = null;
let detectBot = null;
let slidingWindow = null;

let httpArcjet = null;
let wsArcjet = null;

async function initArcjet() {
  if (!arcjetKey) {
    return;
  }
  try {
    const arcjetModule = await import('@arcjet/node');
    arcjet = arcjetModule.default;
    shield = arcjetModule.shield;
    detectBot = arcjetModule.detectBot;
    slidingWindow = arcjetModule.slidingWindow;

    // HTTP Protection: 50 requests per 10 seconds
    httpArcjet = arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: '10s',
          max: 50,
        }),
      ],
    });

    // WebSocket Handshake Protection: 5 connection attempts per 2 seconds
    wsArcjet = arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ['CATEGORY:SEARCH_ENGINE'],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: '2s',
          max: 5,
        }),
      ],
    });

    console.log(`Arcjet security initialized in ${arcjetMode} mode`);
  } catch (err) {
    console.warn('Arcjet SDK not initialized, running in pass-through mode:', err.message);
  }
}

// Kick off initialization
initArcjet();

/**
 * Express middleware to protect standard REST API routes
 */
export function securityMiddleware() {
  return async function (req, res, next) {
    if (!httpArcjet) {
      return next();
    }

    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({
            error: 'Too many requests. Please slow down.',
            retryAfter: decision.reason.resetTime,
          });
        }
        if (decision.reason.isBot()) {
          return res.status(403).json({
            error: 'Access denied: Automated bot detected.',
          });
        }
        return res.status(403).json({
          error: 'Access forbidden by security policy.',
        });
      }

      next();
    } catch (err) {
      console.error('Arcjet security middleware error:', err.message);
      // In production, proceed or return 503 depending on policy
      next();
    }
  };
}

/**
 * Validates WebSocket upgrade request via Arcjet before TCP tunnel switch
 */
export async function checkWebSocketUpgradeSecurity(req) {
  if (!wsArcjet) {
    return { allowed: true };
  }

  try {
    const decision = await wsArcjet.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return { allowed: false, statusCode: 429, reason: 'Rate limit exceeded (1013)' };
      }
      return { allowed: false, statusCode: 403, reason: 'Bot or security policy violation (1008)' };
    }

    return { allowed: true };
  } catch (err) {
    console.error('WebSocket Arcjet upgrade check failed:', err.message);
    return { allowed: true }; // Graceful degradation
  }
}
