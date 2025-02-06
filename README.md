# Node Project for Danish Supermarket Catalogs

This project is designed to fetch and process catalogs from Danish supermarkets using the "etilbudsavis.dk/" API. The API to retrieve catalog data and offers, which can be stored in a database for further use in other applications.

   ```markdown
   ## TODO List
   - [x] Add a start and end date
   - [x] Run the functions once a day/when ever a new catalog is out (Runs 2 hours after catalog has expired)
   - [ ] Remove console.log
   - [x] Find a way to get coop 365
   - [x] Double check if the wiegt is corret
   - [No need] Implement user authentication
   - [ ] Add unit tests for services
   - [ ] Improve error handling in controllers
   - [ ] Optimize database queries
   - [ ] Add pagination to API responses
   - [ ] re-write readme
   
   ```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd node-project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a .env file in the root directory and add the following with your own data:
   ```env
   SHOPGUN_API_KEY=API_KEY
   SHOPGUN_TRACK_ID=TRACK_ID
   SHOPGUN_BUSINESS_ID=BUSINESS_ID
   ```

4. **Run the application:**
   ```bash
   npm start
   ```

## Usage

- The application exposes an API for fetching catalogs and offers. You can access the endpoints defined in 

catalogRoutes.js

.
## API Documentation

Refer to the individual controller and service files for details on the available methods and their usage.

## License

This project is licensed under the MIT License.
