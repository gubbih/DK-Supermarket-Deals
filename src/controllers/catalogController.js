const CatalogService = require(`../services/catalogService`);
const fs = require(`fs`).promises;
const path = require(`path`);
const { getDatabase, ref, set, remove, push } = require(`firebase/database`);
const { initializeApp } = require(`firebase/app`);
const firebaseConfig = require(`../config/firebaseConfig`);

class CatalogController {
    constructor() {
        this.catalogService = new CatalogService();
        this.firebaseApp = initializeApp(firebaseConfig);
        this.db = getDatabase(this.firebaseApp);
    }

    async getCatalogIds(req, res) {
        try {
            console.log(`Controller: Fetching catalog IDs...`);
            const catalogIds = await this.catalogService.fetchCatalogIds();
            const allProductsPromises = catalogIds.map(catalogId => this.catalogService.fetchHotspots(catalogId));
            const allProducts = await Promise.all(allProductsPromises);
            const flattenedProducts = allProducts.flat();
            
            await this.writeToFile(`offers.json`, JSON.stringify(flattenedProducts));
        } catch (error) {
            console.error(`Controller: Error fetching catalog IDs:`, error.message);
            if (res) res.status(500).json({ error: error.message });
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
        try {
            const filePath = path.join(__dirname, `..`, `data`, fileName);
            console.log(`Reading file from:`, filePath);
            const fileData = await fs.readFile(filePath, `utf8`);
            const jsonData = JSON.parse(fileData);

            const dbRef = ref(this.db, name); // Reference to the database path
            const uploadPromises = jsonData.map(async (item) => {
            const newRef = push(dbRef); // Generate a unique ID for each item
            await set(newRef, { ...item, id: newRef.key }); // Store data with unique ID
            return newRef.key; // Return the generated key
            });
            const uploadedKeys = await Promise.all(uploadPromises);
            console.log(`✅ All items uploaded successfully:`, uploadedKeys);
        } catch (error) {
            console.error(`❌ ERROR: Could not upload to Firebase:`, error.message);
            throw new Error(error.message);
        }
    }
    async arrayToFirebase(data, name) {
        console.log(data);
        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error(`Data must be a non-empty array.`);
            }
    
            const dbRef = ref(this.db, name); // Reference to the database path
            const uploadPromises = data.map(async (item) => {
                const newRef = push(dbRef); // Generate a unique ID for each item
                await set(newRef, { ...item, id: newRef.key }); // Store data with unique ID
                return newRef.key; // Return the generated key
            });
    
            const uploadedKeys = await Promise.all(uploadPromises);
            console.log(`✅ All items uploaded successfully:`, uploadedKeys);
        } catch (error) {
            console.error(`❌ ERROR: Could not upload to Firebase:`, error.message);
            throw new Error(error.message);
        }
    }
    async removeDataFromFirebase(name) {
        console.log(`Removing data from Firebase:`, name);
        console.log(firebaseConfig);
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