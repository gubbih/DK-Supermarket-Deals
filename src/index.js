const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const catalogRoutes = require('./routes/catalogRoutes');
const config = require('./config/config');
const CatalogController = require('./controllers/catalogController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', catalogRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// needs to be put into main and run only when needed ex once a day or when some offers are outdated

const catalogController = new CatalogController();

async function main() {
    // ...existing code to fetch catalog IDs and write to file...
    // used to upload to firebase, needs a function to only upload when needed
    //await catalogController.uploadToFirebase('offers.json', offers);



    // only needs to run once or if new data is added (hardcoded data)
    //await catalogController.uploadToFirebase('Foodcompents.json', "foodcompents");
}

main().catch(console.error);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});