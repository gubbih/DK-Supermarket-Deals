const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const catalogRoutes = require('./routes/catalogRoutes');
const config = require('./config/config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', catalogRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});