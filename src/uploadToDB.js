const { fetchJson, categorizeOffers } = require(`./services/foodComponentToCatalog`);
const CatalogController = require(`./controllers/catalogController`);
require('dotenv').config();

(async () => {
    console.log(`Starting upload process...`);
    const catalogController = new CatalogController();
    let written = false;
    
    // Authenticate with Firebase using admin credentials from environment variables
    const isAuthenticated = await catalogController.authenticate(
        process.env.FIREBASE_ADMIN_EMAIL,
        process.env.FIREBASE_ADMIN_PASSWORD
    );
    
    if (!isAuthenticated) {
        console.error(`Failed to authenticate. Cannot proceed with database operations.`);
        process.exit(1);
    }
    
    try {
        const catalogIds = await catalogController.getCatalogIds();
        written = true;
        console.log(`Catalog IDs fetched and processed successfully:`, catalogIds);
    } catch (error) {
        written = false;
        console.error(`Error fetching Catalog IDs:`, error);
    }
    
    if (written) {
        try {
            // Use `await` to properly fetch JSON data asynchronously
            const categories = await fetchJson(`./src/data/Foodcomponent.json`);
            const offers = await fetchJson(`./src/data/offers.json`);

            if (categories && offers) {
                // Filter only food items away from non-food products
                const filteredOffers = categorizeOffers(offers, categories).filter(
                    offer => !offer.categories.includes(`Unknown/Other`)
                );
                try {
                    await catalogController.removeDataFromFirebase(`offers/`);
                    await catalogController.arrayToFirebase(filteredOffers, `offers`);
                    console.log(`Successfully uploaded offers to Firebase.`);
                    
                    // Upload food components if needed
                    await catalogController.uploadToFirebase(`foodcomponent.json`, `foodComponents`);
                    console.log(`Successfully uploaded food components to Firebase.`);
                    
                } catch (error) {
                    console.error(`Error uploading to Firebase:`, error);
                }
            } else {
                console.error(`Failed to load categories or offers JSON files.`);
            }
        } catch (error) {
            console.error(`Error loading JSON files:`, error);
        }
    }
    
    console.log(`Upload process completed.`);
    process.exit(0);
})();