const fs = require('fs').promises;
const path = require('path');

// Primary category definitions with priorities
const CATEGORY_PRIORITIES = {
  'Bageri': 10,
  'Proteiner': 9,
  'Kulhydrater': 8, 
  'Grøntsager': 7,
  'Frugter': 6,
  'Fedtstoffer & Olier': 5,
  'Tilsætningsstoffer & Krydderier': 3,
  'Unknown/Other': 1
};

// Danish context patterns to help identify main product vs. modifiers
const CONTEXT_PATTERNS = [
  { regex: /(\w+) med (\w+)/i, mainProductIndex: 1, modifierIndex: 2 },
  { regex: /(\w+) i (\w+)/i, mainProductIndex: 1, packagingIndex: 2 },
  { regex: /(\w+) og (\w+)/i, mainProductIndex: 1, secondaryIndex: 2 },
  { regex: /(\w+) fra (\w+)/i, mainProductIndex: 1, originIndex: 2 },
  { regex: /(\w+) smag/i, flavorOfIndex: 1 }
];

// Product type dictionary (maps common terms to categories)
const PRODUCT_DICTIONARY = {
  // Bakery products
  'brød': 'Bageri',
  'rugbrød': 'Bageri',
  'knækbrød': 'Bageri',
  'franskbrød': 'Bageri',
  'focaccia': 'Bageri',
  'boller': 'Bageri',
  'kiks': 'Bageri',
  'vafler': 'Bageri',
  'flager': 'Bageri',
  'müslibars': 'Bageri',
  'morgenmad': 'Bageri',

  // Proteins
  'bacon': 'Proteiner',
  'spegepølser': 'Proteiner',
  'pålæg': 'Proteiner',
  'pålægssalater': 'Proteiner',
  'paté': 'Proteiner',
  'toppings': 'Proteiner',
  'pålægschokolade': 'Proteiner',

  // Carbohydrates
  'pasta': 'Kulhydrater',
  'fettuccine': 'Kulhydrater',
  'nudler': 'Kulhydrater',

  // Vegetables
  'spinat': 'Grøntsager',
  'tomat': 'Grøntsager',
  'tomater': 'Grøntsager',
  'hakkede tomater': 'Grøntsager',
  'peber': 'Grøntsager',

  // Fruits
  'dates': 'Frugter',

  // Fats & Oils
  'mayonnaise': 'Fedtstoffer & Olier',
  'nødder': 'Fedtstoffer & Olier',
  'chips': 'Fedtstoffer & Olier',

  // Spices & Condiments
  'sennep': 'Tilsætningsstoffer & Krydderier',
  'ketchup': 'Tilsætningsstoffer & Krydderier',
  'oregano': 'Tilsætningsstoffer & Krydderier'
};

/**
 * Main function to read offers, categorize them, and write to test file
 */
async function runCategorizeTest() {
  try {
    // Read offers.json
    const offersContent = await fs.readFile(path.join(__dirname, 'data', 'offers.json'), 'utf8');
    const offers = JSON.parse(offersContent);
    
    // Read food component categories
    const categoriesContent = await fs.readFile(path.join(__dirname, 'data', 'Foodcomponent.json'), 'utf8');
    const categories = JSON.parse(categoriesContent);
    
    console.log(`Loaded ${offers.length} offers and ${categories.length} categories`);
    
    // Categorize offers with context-aware algorithm
    const categorizedOffers = categorizeOffersWithContext(offers, categories);
    
    // Write results to test file
    await fs.writeFile(
      path.join(__dirname, 'data', 'offers_test.json'), 
      JSON.stringify(categorizedOffers, null, 2),
      'utf8'
    );
    
    console.log(`Categorized ${categorizedOffers.length} offers and wrote results to offers_test.json`);
    
    // Print some statistics
    const categoryStats = getCategoryStatistics(categorizedOffers);
    console.log('\nCategory distribution:');
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`${category}: ${count} products (${Math.round(count / categorizedOffers.length * 100)}%)`);
      });
    
    // Print some examples of potentially problematic categorizations
    console.log('\nSample categorizations:');
    printSampleCategorizations(categorizedOffers);
    
  } catch (error) {
    console.error('Error during categorization test:', error);
  }
}

/**
 * Main categorization function with context awareness
 */
function categorizeOffersWithContext(offers, categoryData) {
  // Preprocess categories for efficient matching
  const processedCategories = preprocessCategories(categoryData);
  
  // Process each offer
  return offers.map(offer => {
    const matches = findCategoriesWithContext(offer.name, processedCategories);
    
    return {
      ...offer,
      categories: matches.categories,
      matchDetails: matches.details,
      mainCategory: selectMainCategory(matches.categories)
    };
  });
}

/**
 * Preprocess categories for faster matching
 */
function preprocessCategories(categoryData) {
  // Convert categories to lowercase and create lookup maps
  const result = [];
  const itemToCategory = new Map();
  
  categoryData.forEach(category => {
    const processedItems = category.items.map(item => item.toLowerCase());
    
    // Add to result array
    result.push({
      category: category.category,
      items: processedItems
    });
    
    // Add to lookup map
    processedItems.forEach(item => {
      if (!itemToCategory.has(item)) {
        itemToCategory.set(item, []);
      }
      itemToCategory.get(item).push(category.category);
    });
  });
  
  return {
    categories: result,
    itemToCategory
  };
}

/**
 * Find categories for a product name with context awareness
 */
function findCategoriesWithContext(productName, processedCategories) {
  if (!productName) return { categories: ['Unknown/Other'], details: { reason: 'Empty product name' } };
  
  const productNameLower = productName.toLowerCase();
  const matchDetails = { patterns: [] };
  const matchedCategories = new Set();
  const matchedItems = [];
  
  // First, check if the product name exactly matches a product type in our dictionary
  const exactProductType = findExactProductType(productNameLower);
  if (exactProductType) {
    matchedCategories.add(exactProductType);
    matchDetails.exactMatch = exactProductType;
  }
  
  // Second, check for context patterns that help identify main product vs. modifiers
  const contextMatches = findContextPatterns(productNameLower);
  if (contextMatches.length > 0) {
    matchDetails.patterns = contextMatches;
    
    // Prioritize main product matches from context patterns
    contextMatches.forEach(match => {
      if (match.mainProduct) {
        const mainProductMatches = findCategoriesForTerm(match.mainProduct, processedCategories);
        mainProductMatches.forEach(cat => {
          matchedCategories.add(cat);
          matchedItems.push(match.mainProduct);
        });
      }
    });
  }
  
  // Check for "eller" (or) to split multiple products
  const parts = productNameLower.split(' eller ').map(p => p.trim());
  
  // Process each part separately
  parts.forEach(part => {
    // Find all category matches
    processedCategories.categories.forEach(category => {
      category.items.forEach(item => {
        if (part.includes(item)) {
          // Skip items that are likely modifiers from context patterns
          const isModifier = contextMatches.some(match => 
            match.modifier && match.modifier.toLowerCase().includes(item)
          );
          
          // Only add if not a modifier or if we don't have matches yet
          if (!isModifier || matchedCategories.size === 0) {
            matchedCategories.add(category.category);
            matchedItems.push(item);
          }
        }
      });
    });
  });
  
  // If we found product dictionary match AND category matches, combine them
  if (matchedCategories.size === 0) {
    // If no categories found, check if it's a product in our dictionary
    for (const [term, category] of Object.entries(PRODUCT_DICTIONARY)) {
      if (productNameLower.includes(term)) {
        matchedCategories.add(category);
        matchedItems.push(term);
      }
    }
  }
  
  // If still no categories, mark as unknown
  if (matchedCategories.size === 0) {
    matchedCategories.add('Unknown/Other');
    matchDetails.reason = 'No category matches found';
  }
  
  return {
    categories: Array.from(matchedCategories),
    details: {
      ...matchDetails,
      matchedItems
    }
  };
}

/**
 * Check if the product name exactly matches a product type in our dictionary
 */
function findExactProductType(productName) {
  for (const [term, category] of Object.entries(PRODUCT_DICTIONARY)) {
    if (productName === term || productName.startsWith(term + ' ')) {
      return category;
    }
  }
  return null;
}

/**
 * Find context patterns in a product name
 */
function findContextPatterns(productName) {
  const matches = [];
  
  CONTEXT_PATTERNS.forEach(pattern => {
    const match = productName.match(pattern.regex);
    if (match) {
      const result = { pattern: pattern.regex.toString() };
      
      if (pattern.mainProductIndex) {
        result.mainProduct = match[pattern.mainProductIndex];
      }
      
      if (pattern.modifierIndex) {
        result.modifier = match[pattern.modifierIndex];
      }
      
      if (pattern.packagingIndex) {
        result.packaging = match[pattern.packagingIndex];
      }
      
      if (pattern.secondaryIndex) {
        result.secondary = match[pattern.secondaryIndex];
      }
      
      if (pattern.originIndex) {
        result.origin = match[pattern.originIndex];
      }
      
      if (pattern.flavorOfIndex) {
        result.flavorOf = match[pattern.flavorOfIndex];
      }
      
      matches.push(result);
    }
  });
  
  return matches;
}

/**
 * Find categories for a specific term
 */
function findCategoriesForTerm(term, processedCategories) {
  const result = [];
  
  // First check our product dictionary
  if (PRODUCT_DICTIONARY[term.toLowerCase()]) {
    result.push(PRODUCT_DICTIONARY[term.toLowerCase()]);
  }
  
  // Then check against category items
  processedCategories.categories.forEach(category => {
    if (category.items.some(item => term.toLowerCase().includes(item))) {
      result.push(category.category);
    }
  });
  
  return result;
}

/**
 * Select main category based on priorities
 */
function selectMainCategory(categories) {
  if (!categories || categories.length === 0) {
    return 'Unknown/Other';
  }
  
  if (categories.length === 1) {
    return categories[0];
  }
  
  // Sort by priority and return highest
  return categories.sort((a, b) => {
    const priorityA = CATEGORY_PRIORITIES[a] || 0;
    const priorityB = CATEGORY_PRIORITIES[b] || 0;
    return priorityB - priorityA;
  })[0];
}

/**
 * Get statistics on category distribution
 */
function getCategoryStatistics(categorizedOffers) {
  const stats = {};
  
  categorizedOffers.forEach(offer => {
    const mainCategory = offer.mainCategory;
    if (!stats[mainCategory]) {
      stats[mainCategory] = 0;
    }
    stats[mainCategory]++;
  });
  
  return stats;
}

/**
 * Print sample categorizations to help identify issues
 */
function printSampleCategorizations(categorizedOffers) {
  // Print a few examples from each category
  const categoriesSeen = new Set();
  const sampleSize = 2; // Number of examples per category
  
  categorizedOffers.forEach(offer => {
    const mainCategory = offer.mainCategory;
    
    if (!categoriesSeen.has(mainCategory) || (
        categoriesSeen.has(mainCategory) && 
        Array.from(categorizedOffers.filter(o => o.mainCategory === mainCategory)).indexOf(offer) < sampleSize
    )) {
      categoriesSeen.add(mainCategory);
      console.log(`- "${offer.name}" → ${mainCategory}`);
      
      // If multiple categories were found, show them all
      if (offer.categories.length > 1) {
        console.log(`  All categories: ${offer.categories.join(', ')}`);
      }
      
      // If we have match details, show them
      if (offer.matchDetails && offer.matchDetails.matchedItems) {
        console.log(`  Matched items: ${offer.matchDetails.matchedItems.join(', ')}`);
      }
    }
  });
}

// Run the test
runCategorizeTest();