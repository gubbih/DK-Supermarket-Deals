const CatalogController = require('./controllers/catalogController');
const catalogController = new CatalogController();

async function main() {
    try {
        await catalogController.getCatalogIds(); // Ensure this method exists
        console.log('Catalog IDs fetched and processed successfully.');
    } catch (error) {
        console.error('Error uploading to Firebase:', error);
    }
}

main();