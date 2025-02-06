const CatalogController = require('./controllers/catalogController');

const catalogController = new CatalogController();

async function main() {
    try {
        // used to upload to firebase, needs a function to only upload when needed
        //await catalogController.uploadToFirebase('offers.json', 'offers');
        console.log("Uploading to firebase");

        // only needs to run once or if new data is added (hardcoded data)
        //await catalogController.uploadToFirebase('Foodcompents.json', "foodcompents");
    } catch (error) {
        console.error("Error uploading to Firebase:", error);
        process.exit(1); // Exit with a failure code
    }
}

main().catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1); // Exit with a failure code
});