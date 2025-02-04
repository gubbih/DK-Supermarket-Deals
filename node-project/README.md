# Node Project for Danish Supermarket Catalogs

This project is designed to fetch and process catalogs from Danish supermarkets using the Shopgun SDK. It provides an API to retrieve catalog data and offers, which can be stored in a database for further use in other applications.

## Project Structure

```
node-project
├── src
│   ├── index.js               # Entry point of the application
│   ├── config
│   │   └── config.js          # Configuration settings
│   ├── controllers
│   │   └── catalogController.js # Handles catalog-related requests
│   ├── models
│   │   └── catalogModel.js     # Defines the Catalog model
│   ├── routes
│   │   └── catalogRoutes.js     # Defines catalog-related routes
│   └── services
│       └── catalogService.js    # Business logic for catalog data
├── package.json                # npm configuration file
├── .env                        # Environment variables
└── README.md                   # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd node-project
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory and add the following:
   ```
   SHOPGUN_API_KEY=7ROrWu
   SHOPGUN_TRACK_ID=VWeM8y
   SHOPGUN_BUSINESS_ID=9ba51
   ```

4. **Run the application:**
   ```
   npm start
   ```

## Usage

- The application exposes an API for fetching catalogs and offers. You can access the endpoints defined in `src/routes/catalogRoutes.js`.

## API Documentation

Refer to the individual controller and service files for details on the available methods and their usage.

## License

This project is licensed under the MIT License.