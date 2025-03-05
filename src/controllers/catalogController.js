const CatalogService = require(`../services/catalogService`);
const fs = require(`fs`).promises;
const path = require(`path`);
const { getDatabase, ref, set, remove, push, get } = require(`firebase/database`);
const { initializeApp } = require(`firebase/app`);
const { getAuth, signInWithEmailAndPassword } = require(`firebase/auth`);
const firebaseConfig = require(`../config/firebaseConfig`);

class CatalogController {
    constructor() {
        this.catalogService = new CatalogService();
        this.firebaseApp = initializeApp(firebaseConfig);
        this.db = getDatabase(this.firebaseApp);
        this.auth = getAuth(this.firebaseApp);
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

        // For development/testing - you can set an environment variable to bypass admin check
        if (process.env.BYPASS_ADMIN_CHECK === 'true') {
            console.log(`⚠️ Admin check bypassed due to BYPASS_ADMIN_CHECK environment variable`);
            return true;
        }

        try {
            const userRef = ref(this.db, `users/${this.user.uid}`);
            console.log(`Checking admin status for user ID: ${this.user.uid}`);
            
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                console.log(`User data found:`, snapshot.val());
                if (snapshot.val().isAdmin === true) {
                    console.log(`User has admin privileges.`);
                    return true;
                } else {
                    console.error(`User does not have admin privileges. isAdmin property is not set to true.`);
                    return false;
                }
            } else {
                console.error(`User data not found in database. Need to create user record with admin privileges.`);
                return false;
            }
        } catch (error) {
            console.error(`Error checking admin status:`, error.message);
            return false;
        }
    }

    async getCatalogIds(req, res) {
        try {
            console.log(`Controller: Fetching catalog IDs...`);
            const catalogIds = await this.catalogService.fetchCatalogIds();
            const allProductsPromises = catalogIds.map(catalogId => this.catalogService.fetchHotspots(catalogId));
            const allProducts = await Promise.all(allProductsPromises);
            const flattenedProducts = allProducts.flat();
            
            await this.writeToFile(`offers.json`, JSON.stringify(flattenedProducts));
            return catalogIds;
        } catch (error) {
            console.error(`Controller: Error fetching catalog IDs:`, error.message);
            if (res) res.status(500).json({ error: error.message });
            throw error;
        }
    }

    async writeToFile(fileName, data) {
        try {
            const dirPath = path.join(__dirname, `..`, `data`);
            const filePath = path.join(dirPath, fileName);
            
            await fs.mkdir(dirPath, { recursive: true });
            
            const formattedData = JSON.stringify(JSON.parse(data), null, 2);
            
            await fs.writeFile(filePath, formattedData, `utf8`);

        } catch (error) {
            console.error(`ERROR Could not write to JSON:`, error.message);
            throw new Error(error.message);
        }
    }

    async uploadToFirebase(fileName, name) {
        if (!this.isAuthenticated) {
            throw new Error(`Authentication required. Please authenticate as admin before uploading.`);
        }

        // Optionally check admin status before proceeding
        const isAdmin = await this.checkAdminStatus();
        if (!isAdmin) {
            throw new Error(`Admin privileges required for this operation.`);
        }

        try {
            const filePath = path.join(__dirname, `..`, `data`, fileName);
            console.log(`Reading file from:`, filePath);
            const fileData = await fs.readFile(filePath, `utf8`);
            const jsonData = JSON.parse(fileData);

            const dbRef = ref(this.db, name);
            const uploadPromises = jsonData.map(async (item) => {
                const newRef = push(dbRef); // Generate a unique ID for each item
                await set(newRef, { ...item, id: newRef.key }); // Store data with unique ID
            });
            
            const uploadedKeys = await Promise.all(uploadPromises);
            console.log(`All items uploaded successfully:`, uploadedKeys);
        } catch (error) {
            console.error(`ERROR: Could not upload to Firebase:`, error.message);
            throw new Error(error.message);
        }
    }

    async arrayToFirebase(data, name) {
        if (!this.isAuthenticated) {
            throw new Error(`Authentication required. Please authenticate as admin before uploading.`);
        }

        // Optionally check admin status before proceeding
        const isAdmin = await this.checkAdminStatus();
        if (!isAdmin) {
            throw new Error(`Admin privileges required for this operation.`);
        }

        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error(`Data must be a non-empty array.`);
            }
    
            const dbRef = ref(this.db, name);
            const uploadPromises = data.map(async (item) => {
                const newRef = push(dbRef); // Generate a unique ID for each item
                await set(newRef, { ...item, id: newRef.key });
            });
    
            const uploadedKeys = await Promise.all(uploadPromises);
            console.log(`All items uploaded successfully:`, uploadedKeys);
        } catch (error) {
            console.error(`ERROR: Could not upload to Firebase:`, error.message);
            throw new Error(error.message);
        }
    }

    async removeDataFromFirebase(name) {
        if (!this.isAuthenticated) {
            throw new Error(`Authentication required. Please authenticate as admin before removing data.`);
        }

        // Optionally check admin status before proceeding
        const isAdmin = await this.checkAdminStatus();
        if (!isAdmin) {
            throw new Error(`Admin privileges required for this operation.`);
        }

        const dbRef = ref(this.db, name);
        try {
            await remove(dbRef);
            console.log(`Data removed from Firebase:`, name);
        } catch (error) {
            console.error(`ERROR Could not remove data from Firebase:`, error.message);
            throw new Error(error.message);
        }
    }
}

module.exports = CatalogController;