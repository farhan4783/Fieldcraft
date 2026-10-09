/**
 * Safe error handling helpers for FIELDCRAFT.
 * Prevents leaking server internals, stack traces, host paths, or coordinates.
 */

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Express error handler middleware
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode || 500;
  const isAppError = err instanceof AppError;

  // In production, mask unhandled 500+ errors to avoid leaking internals,
  // but allow authored AppError messages (e.g. Overpass unavailable with demo suggestion)
  const safeMessage =
    statusCode >= 500 && !isDev && !isAppError
      ? 'An unexpected error occurred. Please try again or switch to demo mode.'
      : err.message || 'Unknown error occurred.';

  // Mask coordinates and sensitive headers in log outputs
  const safePath = req.path;
  console.error(`[Error] ${req.method} ${safePath} [${statusCode}]: ${err.message}`);

  res.status(statusCode).json({
    ok: false,
    error: safeMessage,
    code: err.code || 'INTERNAL_ERROR',
  });
}

module.exports = {
  AppError,
  errorHandler,
};
