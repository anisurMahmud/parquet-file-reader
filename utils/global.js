const { responseMessages } = require('./responseConstants');

const ApiResponse = (res, title, data = null, explicitStatusCode) => {
  const responseType = responseMessages[title] || responseMessages['SUCCESS']; // Default to SUCCESS if title is unknown
  const statusCode = explicitStatusCode || responseType.code;

  res.status(statusCode).json({
    status: "success",
    code: statusCode,
    message: responseType.message,
    data: data,
  });
};

const ApiErrorResponse = (res, errorTitle, errorDetails = null) => {
  const errorType = responseMessages[errorTitle] || responseMessages['INTERNAL_ERROR']; // Default to INTERNAL_ERROR
  const statusCode = errorType.code;

  const responsePayload = {
    status: "failed",
    code: statusCode,
    message: errorType.message,
  };

  if (errorDetails) {
    responsePayload.errors = errorDetails;
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = {
  ApiResponse,
  ApiErrorResponse,
};
