const CatalogService = require('../services/catalogService');

class CatalogController {
    constructor() {
        this.catalogService = new CatalogService();
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
        
            res.json({ products: flattenedProducts });
        } catch (error) {
            console.error('Controller: Error fetching catalog IDs:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = CatalogController;