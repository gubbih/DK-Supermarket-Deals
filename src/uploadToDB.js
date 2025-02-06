const { fetchJson, categorizeOffers } = require('./services/foodComponentToCatalog');
const CatalogController = require('./controllers/catalogController');
const catalogController = new CatalogController();

(async () => {
    let written = false; // Change const to let

    try {
        const catalogIds = await catalogController.getCatalogIds();
        written = true;
        console.log('Catalog IDs fetched and processed successfully:', catalogIds);
    } catch (error) {
        written = false;
        console.error('Error fetching Catalog IDs:', error);
    }

    if (written) {
        try {
            // Use `await` to properly fetch JSON data asynchronously
            const categories = await fetchJson('./src/data/Foodcomponent.json');
            const offers = await fetchJson('./src/data/offers.json');

            if (categories && offers) {
                // Filter only food items away from non-food products
                const filteredOffers = categorizeOffers(offers, categories).filter(
                    offer => !offer.categories.includes("Unknown/Other")
                );

                console.log(filteredOffers);

                try {
                    const filePath = 'offers.json';
                    await catalogController.uploadToFirebase(filePath, 'offers');
                    console.log('Offers uploaded to Firebase!');
                } catch (error) {
                    console.error('Error uploading to Firebase:', error);
                }
            } else {
                console.error('Failed to load categories or offers JSON files.');
            }
        } catch (error) {
            console.error('Error loading JSON files:', error);
        }
    }
})();