/**
 * Efficient string matching with pre-processed lowercase items
 * @param {Array} data - Data array to process
 * @param {Array} categories - Categories with items to match
 * @returns {Array} - Processed data with matched categories
 */
function efficientCategorizeOffers(offers, categories) {
    // Pre-process categories and items to lowercase for faster matching
    const processedCategories = categories.map(category => ({
      category: category.category,
      items: category.items.map(item => item.toLowerCase())
    }));
    
    // Create a map for faster lookups
    const itemToCategory = new Map();
    processedCategories.forEach(cat => {
      cat.items.forEach(item => {
        if (!itemToCategory.has(item)) {
          itemToCategory.set(item, []);
        }
        itemToCategory.get(item).push(cat.category);
      });
    });
    
    // Process offers in chunks to avoid blocking the event loop
    const chunkSize = 100;
    const results = [];
    
    for (let i = 0; i < offers.length; i += chunkSize) {
      const chunk = offers.slice(i, i + chunkSize);
      
      const processedChunk = chunk.map(offer => {
        const matchedCategories = new Set();
        const matchedItems = new Set();
        
        // Split product names
        const productNames = offer.name.split(' eller ').map(name => name.trim().toLowerCase());
        
        // Find matches
        productNames.forEach(product => {
          processedCategories.forEach(category => {
            category.items.forEach(item => {
              if (product.includes(item)) {
                matchedCategories.add(category.category);
                matchedItems.add(item);
              }
            });
          });
        });
        
        // If no category matches, add to 'Unknown/Other'
        if (matchedCategories.size === 0) {
          matchedCategories.add('Unknown/Other');
        }
        
        return {
          ...offer,
          categories: Array.from(matchedCategories),
          matchedItems: Array.from(matchedItems)
        };
      });
      
      results.push(...processedChunk);
    }
    
    return results;
  }
  
  /**
   * Batch processing for Firebase uploads to avoid rate limiting
   * @param {FirebaseService} firebaseService - Firebase service instance
   * @param {string} path - Database path
   * @param {Array} items - Items to upload
   * @param {number} batchSize - Size of each batch
   * @returns {Array} - IDs of uploaded items
   */
  async function batchUpload(firebaseService, path, items, batchSize = 50) {
    const results = [];
    
    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(`Uploading batch ${i/batchSize + 1} of ${Math.ceil(items.length/batchSize)}`);
      
      const batchResults = await firebaseService.pushBatch(path, batch);
      results.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limits
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
  
  /**
   * Memory-efficient file reading for large files
   * @param {string} filePath - Path to the file
   * @param {Function} processFn - Function to process each line
   * @returns {Promise<void>}
   */
  async function processLargeFile(filePath, processFn) {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let isFirstLine = true;
    let headers = [];
    
    for await (const line of rl) {
      if (isFirstLine) {
        headers = line.split(',').map(h => h.trim());
        isFirstLine = false;
        continue;
      }
      
      const values = line.split(',');
      const obj = {};
      
      headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      
      await processFn(obj);
    }
  }
  
  module.exports = {
    efficientCategorizeOffers,
    batchUpload,
    processLargeFile
  };