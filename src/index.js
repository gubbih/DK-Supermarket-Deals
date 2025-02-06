const { fetchJson, categorizeOffers } = require(`./services/foodComponentToCatalog`);
const CatalogController = require(`./controllers/catalogController`);
const catalogController = new CatalogController();

async function main() {
    // upload foodcomponent.json to Firebase
    const filePath = `foodcomponent.json`;
    catalogController.uploadToFirebase(filePath, `foodComponent`);
    /*
    try {
        await catalogController.getCatalogIds(); // Ensure this method exists
        console.log(`Catalog IDs fetched and processed successfully.`);
    } catch (error) {
        console.error(`Error uploading to Firebase:`, error);
    }
        */
}

main();