/**
 * Custom application error with additional context
 */
class AppError extends Error {
    constructor(message, code, context = {}) {
      super(message);
      this.name = this.constructor.name;
      this.code = code || 'UNKNOWN_ERROR';
      this.context = context;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Error categories
   */
  const ErrorCodes = {
    // Auth errors
    AUTH_FAILED: 'AUTH_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    
    // Data errors
    INVALID_DATA: 'INVALID_DATA',
    NOT_FOUND: 'NOT_FOUND',
    
    // API errors
    API_ERROR: 'API_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    
    // Database errors
    DB_ERROR: 'DB_ERROR',
    WRITE_ERROR: 'WRITE_ERROR',
    READ_ERROR: 'READ_ERROR',
  };
  
  /**
   * Handle errors consistently throughout the application
   * @param {Error} error - The error to handle
   * @param {string} context - Where the error occurred
   * @param {boolean} shouldExit - Whether to exit the process
   */
  function handleError(error, context = '', shouldExit = false) {
    const errorObj = {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      context: error.context || {},
      location: context,
      time: new Date().toISOString(),
    };
    
    console.error(`[ERROR][${errorObj.code}][${errorObj.location}] ${errorObj.message}`);
    
    // For development, log the stack trace
    if (process.env.NODE_ENV !== 'production') {
      console.error(error.stack);
    }
    
    // Optional: Log to external service here
    
    if (shouldExit) {
      console.error('Exiting application due to critical error');
      process.exit(1);
    }
    
    return errorObj;
  }
  
  /**
   * Wrap an async function with error handling
   * @param {Function} fn - The async function to wrap
   * @param {string} context - Context for error reporting
   * @returns {Function} - Wrapped function
   */
  function asyncErrorHandler(fn, context = '') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return handleError(error, context);
      }
    };
  }
  
  module.exports = {
    AppError,
    ErrorCodes,
    handleError,
    asyncErrorHandler,
  };