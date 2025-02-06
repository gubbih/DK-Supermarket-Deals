const CatalogController = require('./controllers/catalogController');

const catalogController = new CatalogController();

async function main() {
    // used to upload to firebase, needs a function to only upload when needed
    await catalogController.uploadToFirebase('offers.json', 'offers');
    console.log("Uploading to firebase");

    // only needs to run once or if new data is added (hardcoded data)
    await catalogController.uploadToFirebase('Foodcompents.json', "foodcompents");
}

main().catch(console.error);