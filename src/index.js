const { get } = require('firebase/database');
const CatalogController = require('./controllers/catalogController');

const catalogController = new CatalogController();
// Load environment variables from process.env
const apiKey = process.env.API_KEY;
const trackId = process.env.TRACK_ID;
const businessIds = process.env.BUSINESS_IDS;
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

async function main() {
    console.log("API_KEY:", apiKey);
    console.log("TRACK_ID:", trackId);
    console.log("BUSINESS_IDS:", businessIds);
    console.log("FIREBASE_API_KEY:", firebaseConfig.apiKey);

    try {
        getCatalogIds();
    } catch (error) {
        console.error("Error uploading to Firebase:", error);
        process.exit(1); // Exit with a failure code
    }
}

main().catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1); // Exit with a failure code
});