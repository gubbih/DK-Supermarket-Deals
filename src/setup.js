const { initializeApp } = require('firebase/app');
const config = require('./config');
const AuthService = require('./services/authService');
const FirebaseService = require('./services/firebaseService');
const CatalogService = require('./services/catalogService');
const { handleError } = require('./utils/errorHandler');

/**
 * Initialize application services
 * @returns {Object} The initialized services
 */
async function setupApp() {
  try {
    // Initialize Firebase
    const firebaseApp = initializeApp(config.firebase);
    
    // Initialize services
    const authService = new AuthService(firebaseApp);
    const firebaseService = new FirebaseService(firebaseApp, authService);
    const catalogService = new CatalogService();
    
    // Authenticate if admin credentials are provided
    if (config.auth.adminEmail && config.auth.adminPassword) {
      console.log(`Authenticating as ${config.auth.adminEmail}...`);
      await authService.authenticate(
        config.auth.adminEmail,
        config.auth.adminPassword
      );
    }
    
    return {
      authService,
      firebaseService,
      catalogService,
      firebaseApp,
    };
  } catch (error) {
    handleError(error, 'app-setup', true);
    return null; // Will never reach this due to process.exit in handleError
  }
}

module.exports = setupApp;