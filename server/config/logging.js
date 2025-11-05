import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';
const isProd = process.env.NODE_ENV === 'production';

// Base logger configuration
export const logger = pino({
  level,
  transport: !isProd ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
    }
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  serializers: {
    req: (req) => ({
      id: req.requestId,
      method: req.method,
      url: req.url,
      userId: req.user?.id,
      query: req.query,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: ['password', 'token', 'secret', 'key', 'authorization', 'cookie'],
    remove: true,
  },
});

// Module-specific loggers
export const loggers = {
  server: logger.child({ module: 'server' }),
  database: logger.child({ module: 'database' }),
  auth: logger.child({ module: 'auth' }),
  quiz: logger.child({ module: 'quiz' }),
  blockchain: logger.child({ module: 'blockchain' }),
  api: logger.child({ module: 'api' }),
  tgb: logger.child({ module: 'tgb' }),
  webhook: logger.child({ module: 'webhook' }),
};

// Helper functions for common logging patterns
export const logRequest = (logger, req, message = 'Incoming request') => {
  logger.info({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    ip: req.ip,
  }, message);
};

export const logResponse = (logger, req, res, duration, message = 'Request completed') => {
  logger.info({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
  }, message);
};

export const logError = (logger, error, context = {}) => {
  logger.error({
    ...context,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    },
  }, error.message || 'An error occurred');
};

export const logBlockchainTx = (logger, txData, stage, status = 'pending') => {
  logger.info({
    txHash: txData.txHash,
    stage, // 'preparing', 'signing', 'submitting', 'confirming', 'settled'
    status, // 'pending', 'success', 'failed'
    chain: txData.chain,
    amount: txData.amount,
    from: txData.from,
    to: txData.to,
    gasEstimate: txData.gasEstimate,
    blockNumber: txData.blockNumber,
  }, `Blockchain transaction [${stage}]: ${status}`);
};

export const logExternalApi = (logger, apiCall) => {
  const { method, url, duration, statusCode, error, requestId, retry } = apiCall;

  if (error) {
    logger.error({
      requestId,
      method,
      url,
      duration: duration ? `${duration}ms` : undefined,
      retry,
      error: {
        message: error.message,
        code: error.code,
      },
    }, `External API call failed: ${method} ${url}`);
  } else {
    logger.info({
      requestId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      retry,
    }, `External API call: ${method} ${url}`);
  }
};

export const logDatabaseQuery = (logger, query, duration, error = null) => {
  if (error) {
    logger.error({
      query: query.substring(0, 200), // Truncate long queries
      duration: duration ? `${duration}ms` : undefined,
      error: {
        message: error.message,
        code: error.code,
      },
    }, 'Database query failed');
  } else if (duration > 1000) {
    // Log slow queries
    logger.warn({
      query: query.substring(0, 200),
      duration: `${duration}ms`,
    }, 'Slow database query detected');
  } else {
    logger.debug({
      query: query.substring(0, 200),
      duration: `${duration}ms`,
    }, 'Database query executed');
  }
};

export const logPlayerAction = (logger, action) => {
  const { playerId, roomId, actionType, result, timing, requestId, metadata } = action;

  logger.info({
    requestId,
    playerId,
    roomId,
    actionType, // 'join', 'answer', 'extra', 'leave', etc.
    result, // 'success', 'failed', 'timeout', etc.
    timing,
    metadata,
  }, `Player action: ${actionType} - ${result}`);
};

export const logStateTransition = (logger, transition) => {
  const { entity, entityId, from, to, reason, userId, requestId } = transition;

  logger.info({
    requestId,
    entity, // 'room', 'player', 'game', etc.
    entityId,
    transition: { from, to },
    reason,
    userId,
  }, `State transition: ${entity} ${entityId} from ${from} to ${to}`);
};

export default logger;
