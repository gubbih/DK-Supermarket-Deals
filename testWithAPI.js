const path = require('path');
const fs = require('fs').promises;
const CatalogService = require('./src/services/catalogService');
const { fetchJson, categorizeOffers } = require('./src/services/foodComponentToCatalog');

async function writeToFile(fileName, data) {
  try {
    const dirPath = path.join(__dirname, 'src', 'data');
    const filePath = path.join(dirPath, fileName);
    
    await fs.mkdir(dirPath, { recursive: true });
    
    const formattedData = JSON.stringify(
      typeof data === 'string' ? JSON.parse(data) : data, 
      null, 
      2
    );
    
    await fs.writeFile(filePath, formattedData, 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
    return filePath;

  } catch (error) {
    console.error(`Could not write to file ${fileName}:`, error.message);
    throw error;
  }
}

async function testWithAPI() {
  console.log('Starting test with fresh API data...');
  
  try {
    // Create catalog service directly - no Firebase auth needed
    const catalogService = new CatalogService();
    
    console.log('Fetching catalog data from API...');
    // Fetch catalog IDs
    const catalogIds = await catalogService.fetchCatalogIds();
    console.log(`Found ${catalogIds.length} catalogs`);
    
    // Fetch offers from each catalog
    console.log('Fetching offers from catalogs...');
    const allProductsPromises = catalogIds.map(
      catalogId => catalogService.fetchHotspots(catalogId)
    );
    const allProducts = await Promise.all(allProductsPromises);
    const flattenedProducts = allProducts.flat();
    
    // Write raw offers to file
    const rawOffersPath = await writeToFile('api-offers.json', JSON.stringify(flattenedProducts));
    console.log(`Wrote ${flattenedProducts.length} offers to file: ${rawOffersPath}`);
    
    // Process and categorize offers
    const foodComponentPath = path.join(__dirname, 'src', 'data', 'Foodcomponent.json');
    console.log(`Loading food components from: ${foodComponentPath}`);
    const categories = await fetchJson(foodComponentPath);
    
    console.log(`Applying food component matching algorithm to ${flattenedProducts.length} offers...`);
    console.log('This may take a while for large datasets...');
    
    const startTime = Date.now();
    const categorizedOffers = categorizeOffers(flattenedProducts, categories);
    const endTime = Date.now();
    
    console.log(`Processing completed in ${(endTime - startTime) / 1000} seconds`);
    
    // Write categorized results to file
    const categorizedPath = await writeToFile('api-categorized-offers.json', JSON.stringify(categorizedOffers));
    console.log(`Wrote categorized offers to file: ${categorizedPath}`);
    
    // Generate statistics
    console.log('\nCategorization statistics:');
    const categoryStats = {};
    let totalMatchConfidence = 0;
    let matchedCount = 0;
    
    categorizedOffers.forEach(offer => {
      if (offer.categories && offer.categories[0]) {
        categoryStats[offer.categories[0]] = (categoryStats[offer.categories[0]] || 0) + 1;
      }
      
      if (offer.matchAccuracy > 0) {
        totalMatchConfidence += offer.matchAccuracy;
        matchedCount++;
      }
    });
    
    // Calculate percentages
    const unknownCount = categoryStats['Ukendt'] || 0;
    const unknownPercent = (unknownCount / categorizedOffers.length * 100).toFixed(1);
    const avgConfidence = matchedCount > 0 ? (totalMatchConfidence / matchedCount).toFixed(1) : 0;
    
    // Display overall stats
    console.log(`Total offers: ${categorizedOffers.length}`);
    console.log(`Categorized offers: ${categorizedOffers.length - unknownCount} (${(100 - parseFloat(unknownPercent)).toFixed(1)}%)`);
    console.log(`Uncategorized offers: ${unknownCount} (${unknownPercent}%)`);
    console.log(`Average match confidence: ${avgConfidence}%`);
    
    // Sort and display categories by count
    console.log('\nCategory distribution:');
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`- ${category}: ${count} offers (${(count/categorizedOffers.length*100).toFixed(1)}%)`);
      });
      
    // Sample matches from each category
    console.log('\nSample matches from each category:');
    const categoriesSeen = new Set();
    const sampleSize = 2;
    
    categorizedOffers.forEach(offer => {
      if (!offer.categories || offer.categories.length === 0) return;
      
      const category = offer.categories[0];
      if (!categoriesSeen.has(category) || 
          (categoriesSeen.has(category) && 
           categorizedOffers.filter(o => o.categories && o.categories[0] === category).indexOf(offer) < sampleSize)) {
        
        categoriesSeen.add(category);
        console.log(`\n[${category}] ${offer.name} (${offer.matchAccuracy}% confidence)`);
        
        if (offer.matchedItems && offer.matchedItems.length > 0) {
          console.log(`  Matched with: ${offer.matchedItems.map(item => `${item.name} (${item.accuracy}%)`).join(', ')}`);
        }
      }
    });
    
    console.log('\nTest with API data completed successfully!');
    console.log(`Results saved to ${categorizedPath}`);
    
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

// Run the test
testWithAPI();