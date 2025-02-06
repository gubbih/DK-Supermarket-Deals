const CatalogService = require('../services/catalogService');
const fs = require('fs').promises;
const path = require('path');
const { getDatabase, ref, set } = require('firebase/database');
const { initializeApp } = require('firebase/app');
const firebaseConfig = require('../config/firebaseConfig');

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
        
            const allProductsPromises = catalogIds.map(catalogId => this.catalogService.fetchHotspots(catalogId));
            const allProducts = await Promise.all(allProductsPromises);
        
            const flattenedProducts = allProducts.flat();
            await this.writeToFile('offers.json', JSON.stringify(flattenedProducts));
            res.json({ products: flattenedProducts });
        } catch (error) {
            console.error('Controller: Error fetching catalog IDs:', error.message);
            if (res) res.status(500).json({ error: error.message });
        }
    }

    async writeToFile(fileName, data) {
        try {
            const dirPath = path.join(__dirname, '..', 'data');
            const filePath = path.join(dirPath, fileName);
            
            await fs.mkdir(dirPath, { recursive: true });
            
            const formattedData = JSON.stringify(JSON.parse(data), null, 2);
            
            await fs.writeFile(filePath, formattedData, 'utf8');
            console.log('JSON file saved at:', filePath);
        } catch (error) {
            console.error('ERROR Could not write to JSON:', error.message);
            throw new Error(error.message);
        }
    }

    async uploadToFirebase(fileName, name) {
        try {
            const filePath = path.join(__dirname, '..', 'data', fileName);
            console.log('Reading file from:', filePath);
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