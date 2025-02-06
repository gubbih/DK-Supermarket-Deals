const CatalogController = require('./controllers/catalogController');

const catalogController = new CatalogController();

async function main() {
    try {
        // Check if a specific condition is met before uploading to Firebase
        const shouldUpload = true; // Replace this with your condition
        if (shouldUpload) {
            await catalogController.uploadToFirebase('offers.json', 'offers');
            console.log("Uploaded offers.json to Firebase");
            
            await catalogController.uploadToFirebase('Foodcompents.json', "foodcompents");
            console.log("Uploaded Foodcompents.json to Firebase");
        }
    } catch (error) {
        console.error("Error uploading to Firebase:", error);
        process.exit(1); // Exit with a failure code
    }
}

main().catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1); // Exit with a failure code
});