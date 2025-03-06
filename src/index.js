const path = require('path');
const fs = require('fs').promises;
const setupApp = require('./setup');
const { handleError } = require('./utils/errorHandler');
const { fetchJson, categorizeOffers, filterPreparedMeals } = require('./services/foodComponentToCatalog');

// Configuration for the food component matching
const MATCHING_CONFIG = {
  matchItemsLimit: 2,       // Maximum number of matched items to keep per offer
  accuracyThreshold: 40     // Minimum accuracy score to keep (higher = stricter filtering)
};

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
        
        // Write raw offers to file
        await writeToFile('offers.json', JSON.stringify(flattenedProducts));
        console.log(`Wrote ${flattenedProducts.length} offers to file`);
        
        // Process and categorize offers with improved matching algorithm
        const foodComponentPath = path.join(__dirname, 'data', 'Foodcomponent.json');
        const categories = await fetchJson(foodComponentPath);
        
        console.log('Categorizing offers with enhanced matching algorithm...');
        // Apply the match items limit when categorizing
        const categorizedOffers = categorizeOffers(
          flattenedProducts, 
          categories, 
          MATCHING_CONFIG.matchItemsLimit
        );
        
        // Write all categorized results to file for reference
        await writeToFile('all-categorized-offers.json', JSON.stringify(categorizedOffers));
        console.log(`Wrote ${categorizedOffers.length} categorized offers to file for reference`);
        
        // Filter out prepared meals and items with low accuracy
        console.log('Filtering out prepared meals and non-food items...');
        const filteredOffers = filterPreparedMeals(
          categorizedOffers, 
          MATCHING_CONFIG.accuracyThreshold, 
          MATCHING_CONFIG.matchItemsLimit
        );
        
        // Write filtered results to file
        await writeToFile('filtered-offers.json', JSON.stringify(filteredOffers));
        console.log(`Filtered to ${filteredOffers.length} food component offers`);
        
        // Generate statistics before uploading
        console.log('\nCategory distribution in filtered offers:');
        const categoryStats = {};
        filteredOffers.forEach(offer => {
          const category = offer.categories[0]; // Now we only have one category per offer
          categoryStats[category] = (categoryStats[category] || 0) + 1;
        });

        // Sort and display categories by count
        Object.entries(categoryStats)
          .sort((a, b) => b[1] - a[1])
          .forEach(([category, count]) => {
            console.log(`- ${category}: ${count} offers (${Math.round(count/filteredOffers.length*100)}%)`);
          });

        // Upload to Firebase
        console.log('\nUploading filtered offers to Firebase...');
        await firebaseService.remove('offers');
        await firebaseService.pushBatch('offers', filteredOffers);
        console.log(`Uploaded ${filteredOffers.length} filtered offers to Firebase`);
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
    console.log('Scheduling process exit in 5 seconds...');
    setTimeout(() => {
      console.log('Exiting process');
      process.exit(0);
    }, 5000);
  } catch (error) {
    handleError(error, 'main', true);
  }
}

// Run the main function
main();