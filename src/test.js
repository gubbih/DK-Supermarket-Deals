const fs = require('fs').promises;
const path = require('path');
const { fetchJson, categorizeOffers } = require('./services/foodComponentToCatalog');

// Main test function
async function testMatcher() {
    try {
        console.log('Starting test of food component matcher...');
        
        // Load the food component categories
        const categories = await fetchJson('./src/data/Foodcomponent.json');
        console.log(`Loaded ${categories.length} food categories`);
        
        // Load the offers data
        const offers = await fetchJson('./src/data/offers.json');
        console.log(`Loaded ${offers.length} offers`);
        
        // Process a sample of offers (adjust the number as needed)
        const sampleSize = 20; // Process more or all offers by increasing this number
        const sampleOffers = offers.slice(0, Math.min(sampleSize, offers.length));
        console.log(`Processing ${sampleOffers.length} sample offers...`);
        
        // Run the improved matching algorithm
        const processed = categorizeOffers(sampleOffers, categories);
        
        // Create a detailed analysis of the results
        const analysis = processed.map(offer => ({
            name: offer.name,
            store: offer.store,
            categories: offer.categories,
            matchAccuracy: offer.matchAccuracy,
            matchedItems: offer.matchedItems.map(item => ({
                name: item.name,
                accuracy: item.accuracy,
                category: item.category
            }))
        }));
        
        // Write the results to a file
        const resultPath = path.join(__dirname, 'matcher-test-results.json');
        await fs.writeFile(
            resultPath, 
            JSON.stringify(analysis, null, 2),
            'utf8'
        );
        
        console.log(`Test completed successfully!`);
        console.log(`Results written to: ${resultPath}`);
        
        // Additional statistics
        const categoryCounts = {};
        processed.forEach(offer => {
            if (offer.categories[0]) {
                categoryCounts[offer.categories[0]] = (categoryCounts[offer.categories[0]] || 0) + 1;
            }
        });
        
        console.log('\nCategory distribution:');
        Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                console.log(`- ${category}: ${count} offers (${Math.round(count/processed.length*100)}%)`);
            });
        
        const avgAccuracy = processed.reduce((sum, offer) => sum + (offer.matchAccuracy || 0), 0) / processed.length;
        console.log(`\nAverage match accuracy: ${Math.round(avgAccuracy)}%`);
        
        // Count offers with no matches
        const unmatched = processed.filter(o => o.categories[0] === 'Ukendt').length;
        console.log(`Unmatched offers: ${unmatched} (${Math.round(unmatched/processed.length*100)}%)`);
        
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

// Run the test
testMatcher();