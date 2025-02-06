const CatalogController = require('./controllers/catalogController');
const catalogController = new CatalogController();

async function run() {
    try {
        await catalogController.getCatalogIds();
        console.log('Catalog IDs fetched and processed successfully.');
    } catch (error) {
        console.error('Error fetching Catalog IDs:', error);
    }
}

run();