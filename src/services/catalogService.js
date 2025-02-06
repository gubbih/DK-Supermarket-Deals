const axios = require("axios");
const config = require("../config/config");

class CatalogService {
    async fetchCatalogIds() {
        const allCatalogIds = [];

        for (const business of config.businessIds) {
            try {
                console.log("Fetching catalogs for business ID: ${business.id}...");
                const response = await axios.get("https://squid-api.tjek.com/v2/catalogs", {
                    params: {
                        dealer_id: business.id,
                        order_by: "-publication_date",
                        offset: 0,
                        limit: 24,
                        types: "paged"
                    }
                });

                if (!response.data || !Array.isArray(response.data)) {
                    console.error("Invalid response structure in fetchCatalogIds:", response.data);
                    throw new Error("Invalid response from API");
                }

                const catalogs = response.data
                    .filter(catalog => catalog.offer_count > 0) // Filter out catalogs with zero offers
                    .map(catalog => ({
                        id: catalog.id,
                        name: business.name,
                        offerCount: catalog.offer_count
                    }));
                allCatalogIds.push(...catalogs);
            } catch (error) {
                console.error("Error fetching catalogs for business ID: ${business.id}:", error.message);
                // Optionally, you can decide whether to continue or stop on error
                // throw error; // Uncomment to stop on first error
            }
        }

        return allCatalogIds;
    }

    async fetchHotspots(catalog) {
        try {
            console.log("Fetching hotspots for catalog ID: ${catalog.id}...");
            const response = await axios.get("https://squid-api.tjek.com/v2/catalogs/${catalog.id}/hotspots");
            if (!response.data || !Array.isArray(response.data)) {
                console.error("Invalid response structure in fetchHotspots:", response.data);
                throw new Error("Invalid response from API");
            }

            const products = response.data.map(item => ({
                name: item.offer?.heading || "Ukendt produkt",
                price: item.offer?.pricing?.price || 0,
                valuta: item.offer?.pricing?.currency || "DKK",
                weight: item.offer?.quantity?.size?.from || 0,
                weight_unit: item.offer?.quantity?.unit?.symbol || "",
                store: catalog.name || "Ukendt butik",
                run_from: item.offer?.run_from || "Ukendt startdato",
                run_till: item.offer?.run_till|| "Ukendt slutdato",

            }));
            return products;
        } catch (error) {
            console.error("Error fetching hotspots for catalog ID ${catalog.id}:", error.message);
            throw error;
        }
    }
    
}


module.exports = CatalogService;