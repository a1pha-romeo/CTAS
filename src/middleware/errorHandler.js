export function errorHandler(err, req, res, _next) {
  console.error('[CTAS Error]', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

export default errorHandler;
