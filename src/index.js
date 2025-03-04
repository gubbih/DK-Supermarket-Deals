const path = require('path');
const fs = require('fs').promises;
const config = require('./config');
const setupApp = require('./setup');
const { handleError } = require('./utils/errorHandler');
const { fetchJson, categorizeOffers } = require('./services/foodComponentToCatalog');

async function writeToFile(fileName, data) {
  try {
    const dirPath = path.join(__dirname, 'data');
    const filePath = path.join(dirPath, fileName);
    
    await fs.mkdir(dirPath, { recursive: true });
    
    const formattedData = JSON.stringify(
      typeof data === 'string' ? JSON.parse(data) : data, 
      null, 
      2
    );
    
    await fs.writeFile(filePath, formattedData, 'utf8');
    console.log(`Successfully wrote to ${filePath}`);

  } catch (error) {
    throw new Error(`Could not write to file ${fileName}: ${error.message}`);
  }
}

async function main() {
  console.log('Starting application...');
  
  try {
    // Initialize services
    const { authService, firebaseService, catalogService } = await setupApp();
    
    // Check if we're authenticated
    if (!authService.isAuthenticated) {
      throw new Error('Authentication required to proceed');
    }
    
    // Define available commands
    const commands = {
      uploadFoodComponents: async () => {
        console.log('Uploading food components to Firebase...');
        const foodComponentPath = path.join(__dirname, 'data', 'Foodcomponent.json');
        const foodComponents = await fetchJson(foodComponentPath);
        await firebaseService.write('foodComponents', foodComponents);
        console.log('Successfully uploaded food components');
      },
      
      fetchAndProcessCatalogs: async () => {
        console.log('Fetching catalog data...');
        // Fetch catalog IDs
        const catalogIds = await catalogService.fetchCatalogIds();
        console.log(`Found ${catalogIds.length} catalogs`);
        
        // Fetch offers from each catalog
        const allProductsPromises = catalogIds.map(
          catalogId => catalogService.fetchHotspots(catalogId)
        );
        const allProducts = await Promise.all(allProductsPromises);
        const flattenedProducts = allProducts.flat();
        
        // Write to file
        await writeToFile('offers.json', JSON.stringify(flattenedProducts));
        console.log(`Wrote ${flattenedProducts.length} offers to file`);
        
        // Process and categorize offers
        const foodComponentPath = path.join(__dirname, 'data', 'Foodcomponent.json');
        const categories = await fetchJson(foodComponentPath);
        const categorizedOffers = categorizeOffers(flattenedProducts, categories);
        const filteredOffers = categorizedOffers.filter(
          offer => !offer.categories.includes('Unknown/Other')
        );
        
        // Upload to Firebase
        await firebaseService.remove('offers');
        await firebaseService.pushBatch('offers', filteredOffers);
        console.log(`Uploaded ${filteredOffers.length} categorized offers to Firebase`);
      }
    };
    
    // Get command from command line arguments or default to uploadFoodComponents
    const command = process.argv[2] || 'uploadFoodComponents';
    
    if (commands[command]) {
      await commands[command]();
      console.log(`Command "${command}" completed successfully`);
    } else {
      console.error(`Unknown command: ${command}`);
      console.log(`Available commands: ${Object.keys(commands).join(', ')}`);
    }
  } catch (error) {
    handleError(error, 'main', true);
  }
}

// Run the main function
main();