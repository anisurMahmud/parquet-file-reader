const { ApiErrorResponse } = require('../utils/global');

// This middleware should be registered last, after all other app.use() and routes.
const errorHandler = (err, req, res, next) => {
  console.error("Global Error Handler Caught:", err); // Log the error for debugging

  // If the error is one we've thrown intentionally with a title, use that.
  // We can add a specific property like 'isOperational' or check 'errorTitle'
  // if we create custom error classes that extend Error and have these properties.
  // For now, we'll assume if it has an errorTitle, it's semi-handled.
  if (err.errorTitle && typeof err.errorTitle === 'string') {
    ApiErrorResponse(res, err.errorTitle, err.details || err.message);
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    // Handle Express.json() parsing errors
    ApiErrorResponse(res, 'BAD_REQUEST', 'Invalid JSON payload received.');
  }
  // Add more specific error type checks here if needed, e.g.
  // else if (err instanceof SomeCustomError) { ... }
  else {
    // For all other errors, respond with a generic internal server error.
    // Pass err.message as details if it exists, otherwise a generic message.
    ApiErrorResponse(res, 'INTERNAL_ERROR', err.message || 'An unexpected issue occurred.');
  }
};

module.exports = errorHandler;
