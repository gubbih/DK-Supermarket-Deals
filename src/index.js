const path = require('path');
const fs = require('fs').promises;
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
        
        // Generate statistics before filtering
        console.log('\nCategorization statistics:');
        const categoryStats = {};
        categorizedOffers.forEach(offer => {
          if (offer.categories[0]) {
            categoryStats[offer.categories[0]] = (categoryStats[offer.categories[0]] || 0) + 1;
          }
        });

        // Sort and display categories by count
        Object.entries(categoryStats)
          .sort((a, b) => b[1] - a[1])
          .forEach(([category, count]) => {
            console.log(`- ${category}: ${count} offers (${Math.round(count/categorizedOffers.length*100)}%)`);
          });

        // Filter out unknown items (now with 'Ukendt' instead of 'Unknown/Other')
        const filteredOffers = categorizedOffers.filter(
          offer => !offer.categories.includes('Ukendt')
        );
        
        console.log(`\nFiltered ${categorizedOffers.length - filteredOffers.length} offers with 'Ukendt' category`);
        console.log(`Uploading ${filteredOffers.length} categorized offers to Firebase`);
        
        // Write categorized results to file before upload
        await writeToFile('categorized-offers.json', JSON.stringify(categorizedOffers));
        console.log('Wrote categorized offers to file for reference');
        
        // Upload to Firebase
        await firebaseService.remove('offers');
        await firebaseService.pushBatch('offers', categorizedOffers);
        console.log(`Uploaded ${categorizedOffers.length} categorized offers to Firebase`);
      }
    };
    
    // Get command from command line arguments or default to fetchAndProcessCatalogs
    const command = process.argv[2] || 'fetchAndProcessCatalogs';
    
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