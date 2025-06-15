const responseMessages = {
  SUCCESS: { message: "Operation completed successfully.", code: 200 },
  CREATED: { message: "Resource created successfully.", code: 201 },
  BAD_REQUEST: { message: "Invalid request parameters.", code: 400 },
  UNAUTHORIZED: { message: "Authentication failed.", code: 401 },
  FORBIDDEN: { message: "You do not have permission to access this resource.", code: 403 },
  NOT_FOUND: { message: "Resource not found.", code: 404 },
  CONFLICT: { message: "A conflict occurred with the current state of the resource.", code: 409 },
  INTERNAL_ERROR: { message: "An unexpected error occurred on the server.", code: 500 },
  SERVICE_UNAVAILABLE: { message: "The service is temporarily unavailable.", code: 503 },
  DB_ERROR: { message: "A database error occurred.", code: 500 },
  NO_DATA: { message: "No data found for your request.", code: 200 },
};

module.exports = {
  responseMessages,
};
