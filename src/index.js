const { fetchJson, categorizeOffers } = require(`./services/foodComponentToCatalog`);
const CatalogController = require(`./controllers/catalogController`);
require('dotenv').config();

async function main() {
    console.log(`Starting main process...`);
    
    const catalogController = new CatalogController();
    
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
        // Upload foodcomponent.json to Firebase
        const filePath = `foodcomponent.json`;
        await catalogController.uploadToFirebase(filePath, `foodComponents`);
        console.log(`Successfully uploaded food components to Firebase.`);
        
        // Uncomment if needed
        /*
        try {
            await catalogController.getCatalogIds();
            console.log(`Catalog IDs fetched and processed successfully.`);
        } catch (error) {
            console.error(`Error in catalog operations:`, error);
        }
        */
    } catch (error) {
        console.error(`Error in main process:`, error);
    }
    
    console.log(`Main process completed.`);
}

main();