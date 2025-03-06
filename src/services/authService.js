const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, get } = require('firebase/database');

class AuthService {
  constructor(app) {
    this.auth = getAuth(app);
    this.db = getDatabase(app);
    this.user = null;
    this.isAuthenticated = false;
  }

  async authenticate(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.user = userCredential.user;
      this.isAuthenticated = true;
      console.log(`Successfully authenticated as: ${this.user.email}`);
      return true;
    } catch (error) {
      console.error(`Authentication Error:`, error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  async checkAdminStatus() {
    if (!this.isAuthenticated || !this.user) {
      console.error(`Not authenticated. Please authenticate first.`);
      return false;
    }

    // For development/testing
    if (process.env.BYPASS_ADMIN_CHECK === 'true') {
      console.log(`⚠️ Admin check bypassed due to BYPASS_ADMIN_CHECK environment variable`);
      return true;
    }

    try {
      const userRef = ref(this.db, `users/${this.user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists() && snapshot.val().isAdmin === true) {
        console.log(`User has admin privileges.`);
        return true;
      } else {
        console.error(`User does not have admin privileges.`);
        return false;
      }
    } catch (error) {
      console.error(`Error checking admin status:`, error.message);
      return false;
    }
  }

  getUserId() {
    return this.user?.uid;
  }

  isAdmin() {
    return this.isAuthenticated && this.checkAdminStatus();
  }
}

module.exports = AuthService;