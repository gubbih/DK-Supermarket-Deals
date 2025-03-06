const { getDatabase, ref, set, remove, push, get } = require('firebase/database');

class FirebaseService {
  constructor(app, authService) {
    this.db = getDatabase(app);
    this.authService = authService;
  }

  async read(path) {
    try {
      const dataRef = ref(this.db, path);
      const snapshot = await get(dataRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error reading from ${path}:`, error.message);
      throw error;
    }
  }

  async write(path, data) {
    if (!this.authService.isAuthenticated) {
      throw new Error(`Authentication required for write operations.`);
    }

    const isAdmin = await this.authService.checkAdminStatus();
    if (!isAdmin) {
      throw new Error(`Admin privileges required for write operations.`);
    }

    try {
      const dataRef = ref(this.db, path);
      await set(dataRef, data);
      return true;
    } catch (error) {
      console.error(`Error writing to ${path}:`, error.message);
      throw error;
    }
  }

  async push(path, data) {
    if (!this.authService.isAuthenticated) {
      throw new Error(`Authentication required for push operations.`);
    }

    const isAdmin = await this.authService.checkAdminStatus();
    if (!isAdmin) {
      throw new Error(`Admin privileges required for push operations.`);
    }

    try {
      const listRef = ref(this.db, path);
      const newRef = push(listRef);
      await set(newRef, { ...data, id: newRef.key });
      return newRef.key;
    } catch (error) {
      console.error(`Error pushing to ${path}:`, error.message);
      throw error;
    }
  }

  async remove(path) {
    if (!this.authService.isAuthenticated) {
      throw new Error(`Authentication required for remove operations.`);
    }

    const isAdmin = await this.authService.checkAdminStatus();
    if (!isAdmin) {
      throw new Error(`Admin privileges required for remove operations.`);
    }

    try {
      const dataRef = ref(this.db, path);
      await remove(dataRef);
      return true;
    } catch (error) {
      console.error(`Error removing ${path}:`, error.message);
      throw error;
    }
  }

  async pushBatch(path, items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Data must be a non-empty array.');
    }

    if (!this.authService.isAuthenticated) {
      throw new Error(`Authentication required for batch operations.`);
    }

    const isAdmin = await this.authService.checkAdminStatus();
    if (!isAdmin) {
      throw new Error(`Admin privileges required for batch operations.`);
    }

    try {
      const listRef = ref(this.db, path);
      const keys = [];

      // For better performance, use Promise.all to push items in parallel
      const pushPromises = items.map(async (item) => {
        const newRef = push(listRef);
        const itemWithId = { ...item, id: newRef.key };
        await set(newRef, itemWithId);
        return newRef.key;
      });

      const results = await Promise.all(pushPromises);
      return results;
    } catch (error) {
      console.error(`Error in batch push to ${path}:`, error.message);
      throw error;
    }
  }
}

module.exports = FirebaseService;