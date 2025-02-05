const CatalogService = require('../services/catalogService');
const fs = require('fs').promises; // Bruger fs.promises til async/await
const path = require('path');
const { getDatabase, ref, set } = require('firebase/database');
const { initializeApp } = require('firebase/app');
const firebaseConfig = require('../config/firebaseConfig'); // Ensure you have this config file

class CatalogController {
    constructor() {
        this.catalogService = new CatalogService();
        this.firebaseApp = initializeApp(firebaseConfig);
        this.db = getDatabase(this.firebaseApp);
    }

    async getCatalogIds(req, res) {
        try {
            const catalogIds = await this.catalogService.fetchCatalogIds();
            console.log("Catalog IDs:", catalogIds);
        
            // Fetch hotspots for each catalog ID and wait for all promises to resolve
            const allProductsPromises = catalogIds.map(catalogId => this.catalogService.fetchHotspots(catalogId));
            const allProducts = await Promise.all(allProductsPromises);
        
            // Flatten the array of arrays
            const flattenedProducts = allProducts.flat();
            this.writeToFile('offers.json', JSON.stringify(flattenedProducts));
            res.json({ products: flattenedProducts });
        } catch (error) {
            console.error('Controller: Error fetching catalog IDs:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
    

    async writeToFile(fileName, data) {
        try {
            const dirPath = path.join(__dirname, '..', 'data');
            const filePath = path.join(dirPath, fileName);
            
            // Ensure the directory exists
            await fs.mkdir(dirPath, { recursive: true });
            
            // Format JSON data with indentation
            const formattedData = JSON.stringify(JSON.parse(data), null, 2);
            
            await fs.writeFile(filePath, formattedData, 'utf8');
            console.log('JSON-fil saved! at:', filePath);
        } catch (error) {
            console.error('ERROR Could not write to json:', error.message);
            throw new Error(error.message); // Kaster fejlen videre, hvis det skal håndteres eksternt
        }
    }

    async uploadToFirebase(fileName, name) {
        try {
            const filePath = path.join(__dirname, '..', 'data', fileName);
            const fileData = await fs.readFile(filePath, 'utf8');
            const jsonData = JSON.parse(fileData);
            const dbRef = ref(this.db, name);
            await set(dbRef, jsonData);
            console.log('Data uploaded to Firebase!');
        } catch (error) {
            console.error('ERROR Could not upload to Firebase:', error.message);
            throw new Error(error.message);
        }
    }
}

module.exports = CatalogController;