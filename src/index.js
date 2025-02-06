const CatalogController = require('./controllers/catalogController');

const catalogController = new CatalogController();

async function main() {
    // used to upload to firebase, needs a function to only upload when needed
    //await catalogController.uploadToFirebase('offers.json', 'offers');
    // only needs to run once or if new data is added (hardcoded data)
    //await catalogController.uploadToFirebase('Foodcompents.json', "foodcompents");
    console.log("Uploading to firebase");
}

main().catch(console.error);