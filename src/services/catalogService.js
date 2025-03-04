const axios = require('axios');
const config = require('../config');

class CatalogService {
    constructor() {
        this.config = config.api;
    }

    async fetchCatalogIds() {
        if (!this.config.businessIds || !Array.isArray(this.config.businessIds)) {
            throw new Error("Invalid or missing businessIds in config.");
        }

        try {
            const catalogRequests = this.config.businessIds.map(async (business) => {
                console.log(`Fetching catalogs for business ID: ${business.id}...`);
                const response = await axios.get(`${this.config.baseUrl}/catalogs`, {
                    params: {
                        dealer_id: business.id,
                        order_by: `-publication_date`,
                        offset: 0,
                        limit: 24,
                        types: `paged`
                    }
                });

                if (!response.data || !Array.isArray(response.data)) {
                    console.error(`Invalid response structure in fetchCatalogIds:`, response.data);
                    return [];
                }

                return response.data
                    .filter(catalog => catalog.offer_count > 0)
                    .map(catalog => ({
                        id: catalog.id,
                        name: business.name,
                        offerCount: catalog.offer_count
                    }));
            });

            const allCatalogs = await Promise.all(catalogRequests);
            return allCatalogs.flat();

        } catch (error) {
            console.error(`Error fetching catalogs:`, error.message);
            throw error;
        }
    }

    async fetchHotspots(catalog) {
        try {
            console.log(`Fetching hotspots for catalog ID: ${catalog.id}...`);
            const response = await axios.get(`${this.config.baseUrl}/catalogs/${catalog.id}/hotspots`);

            if (!response.data || !Array.isArray(response.data)) {
                console.error(`Invalid response structure in fetchHotspots:`, response.data);
                throw new Error(`Invalid response from API`);
            }

            return response.data.map(item => ({
                name: item.offer?.heading ?? `Ukendt produkt`,
                price: item.offer?.pricing?.price ?? 0,
                valuta: item.offer?.pricing?.currency ?? `DKK`,
                weight: item.offer?.quantity?.size?.from ?? 0,
                weight_unit: item.offer?.quantity?.unit?.symbol ?? ``,
                store: catalog.name ?? `Ukendt butik`,
                run_from: item.offer?.run_from ?? `Ukendt startdato`,
                run_till: item.offer?.run_till ?? `Ukendt slutdato`,
                catelog_id: catalog.id
            }));

        } catch (error) {
            console.error(`Error fetching hotspots for catalog ID ${catalog.id}:`, error.message);
            throw error;
        }
    }
}

module.exports = CatalogService;