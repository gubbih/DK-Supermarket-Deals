const fs = require(`fs`).promises;

/**
 * Read JSON data from a file
 */
async function fetchJson(filePath) {
    try {
        const data = await fs.readFile(filePath, `utf8`);
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading file from disk: ${err}`);
    }
}

/**
 * Expands hyphenated words by borrowing the prefix from previous words
 * e.g. "kyllingfilet eller -inderfilet" becomes "kyllingfilet eller kyllinginderfilet"
 */
function expandHyphenatedWords(text) {
    const words = text.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
        if (words[i].startsWith('-')) {
            // Find the most recent non-hyphenated word
            for (let j = i-1; j >= 0; j--) {
                if (!words[j].startsWith('-') && !words[j].match(/eller|og|,|&/)) {
                    // Extract the root part of the previous word
                    const rootMatch = words[j].match(/([a-zæøåA-ZÆØÅ]+)/);
                    if (rootMatch && rootMatch[0]) {
                        const root = rootMatch[0];
                        // Replace hyphen with the root
                        words[i] = root + words[i].substring(1);
                    }
                    break;
                }
            }
        }
    }
    return words.join(' ');
}

/**
 * Checks if two Danish words are similar accounting for common variations
 */
function areSimilarDanishWords(word1, word2) {
    // Nothing to compare if either word is too short
    if (word1.length < 3 || word2.length < 3) return false;
    
    // Convert both to lowercase
    word1 = word1.toLowerCase();
    word2 = word2.toLowerCase();
    
    // Exact match
    if (word1 === word2) return true;
    
    // Block specific false matches - add problematic pairs here as needed
    const blockedMatches = [
        ['hel', 'hell'],     // Blocks "Hel kylling" matching with "Hellmann's"
        ['san', 'sand'],     // Blocks "San Miguel" matching with "Sandart"
        ['te', 'ste'],       // Blocks "te" matching with words containing "ste"
        ['te', 'ter'],       // Blocks "te" matching with words containing "ter"
        ['is', 'ris'],       // Blocks "is" matching with "ris" 
        ['is', 'fisk'],      // Blocks "is" matching with "fisk"
        ['bon', 'bacon'],    // Blocks "bon" from matching with "bacon"
        ['kit', 'kits'],     // Blocks "kit" from matching with "biscuits", etc.
        ['mix', 'mixer'],    // Blocks "mix" from matching with "mixer"
        ['bar', 'bart'],     // Blocks "bar" from matching with words containing "bart"
        ['ost', 'post'],     // Blocks "ost" (cheese) from matching with "postej"
        ['mou', 'mouse'],    // Blocks "Mou" (brand) from matching with random words
        ['blom', 'blomme'],  // Blocks "Blomst" matching with "Blomme"
        ['vand', 'danskvand'], // Blocks "dansk" matching with "danskvand"
        ['dansk', 'danskvand'], // Blocks "dansk" matching with "danskvand"
        ['spelt', 'specialitet'], // Blocks "specialitet" matching with "spelt"
        ['ger', 'burger']    // Blocks "ger" matching with "burger"
    ];
    
    // Check if this pair is blocked
    for (const [a, b] of blockedMatches) {
        if ((word1.includes(a) && word2.includes(b)) || 
            (word1.includes(b) && word2.includes(a))) {
            return false;
        }
    }
    
    // Special case for short words - they must match exactly or be a prefix/suffix
    if (word1.length <= 4 || word2.length <= 4) {
        const shorterWord = word1.length <= word2.length ? word1 : word2;
        const longerWord = word1.length > word2.length ? word1 : word2;
        
        // For short words, the match needs to be at word boundaries
        if (shorterWord.length <= 4) {
            // Check if shorter word is at the start or end of longer word
            return longerWord.startsWith(shorterWord) || 
                   longerWord.endsWith(shorterWord);
        }
    }
    
    // Check for singular/plural forms and other common variations
    if (word1 + 'er' === word2 || word2 + 'er' === word1) return true;
    if (word1 + 'e' === word2 || word2 + 'e' === word1) return true;
    if (word1 + 'r' === word2 || word2 + 'r' === word1) return true;
    
    // Check for stem similarity (if both words are long enough)
    if (word1.length > 4 && word2.length > 4) {
        const stem1 = word1.substring(0, Math.min(word1.length, word1.length - 2));
        const stem2 = word2.substring(0, Math.min(word2.length, word2.length - 2));
        if (stem1 === stem2) return true;
    }
    
    return false;
}

/**
 * Checks if a word is at a word boundary in a text
 * This helps prevent matching substrings within words
 */
function isAtWordBoundary(word, text) {
    if (!text.toLowerCase().includes(word.toLowerCase())) return false;
    
    const position = text.toLowerCase().indexOf(word.toLowerCase());
    const beforeChar = position > 0 ? text[position - 1] : ' ';
    const afterChar = position + word.length < text.length ? text[position + word.length] : ' ';
    
    const isWordBoundaryBefore = /\s|^|[.,;:!?()\-\/\u2013\u2014+&]/.test(beforeChar);
    const isWordBoundaryAfter = /\s|$|[.,;:!?()\-\/\u2013\u2014+&]/.test(afterChar);
    
    return isWordBoundaryBefore && isWordBoundaryAfter;
}

/**
 * Identifies if a product name suggests it's a prepared meal rather than an ingredient
 * Returns a confidence score reduction if it appears to be a prepared meal
 */
function getPreparedMealPenalty(productName) {
    const PREPARED_INDICATORS = [
        "dinner kit", "kit", "meal kit", "ready", "mikrobølgeovn",
        "instant", "ready to", "klar til", "hurtig", "opvarm", "ovn",
        "færdigret", "ret med", "ret i", "færdig", "convenience",
        "frossen ret", "let at", "hurtig at", "parat til"
    ];
    
    const lowerName = productName.toLowerCase();
    
    // Check if the product name contains any of our prepared meal indicators
    for (const indicator of PREPARED_INDICATORS) {
        if (lowerName.includes(indicator)) {
            return 50; // Significant penalty for prepared meal indicators
        }
    }
    
    // No penalty - likely a food component
    return 0;
}

/**
 * Categorizes offers based on food components with improved matching
 * @param {Array} offers - The offers to categorize
 * @param {Array} categories - The food component categories
 * @param {Number} matchItemsLimit - Maximum number of matched items to keep per offer (0 = no limit)
 * @returns {Array} - The categorized offers with accuracy scores
 */
function categorizeOffers(offers, categories, matchItemsLimit = 3) {
    return offers.map(offer => {
        let matchedItems = []; // Array to store items with their scores
        
        // Pre-process offer name: expand hyphenated words
        let processedOfferName = expandHyphenatedWords(offer.name);
        
        // Special handling for Danish eggs ("æg")
        const hasEgg = /\bæg\b|\bægs\b|\bskrabeæg\b|\bøkoæg\b/i.test(processedOfferName);
        
        // Split the offer name by common separators
        let productNames = processedOfferName
            .split(/\s+eller\s+|\s*,\s*|\s*&\s*|\s+og\s+|\s*\+\s*/)
            .map(name => name.trim())
            .filter(name => name.length > 0);
        
        // For each product name in the offer
        productNames.forEach(productName => {
            const productWords = productName.toLowerCase().split(/\s+/);
            
            // For each category
            categories.forEach(category => {
                // For each item in the category
                category.items.forEach(item => {
                    const itemWords = item.toLowerCase().split(/\s+/);
                    let matchCount = 0;
                    let matchedProductWords = new Set();
                    let matchedItemWords = new Set();
                    let shortWordPenalty = 0; // Penalty for matching only very short words
                    
                    // Special case for eggs
                    if (hasEgg && item.toLowerCase() === "æg") {
                        matchCount += 3;
                        matchedProductWords.add("æg");
                        matchedItemWords.add("æg");
                    }
                    
                    // Check each word in the product name against each word in the item
                    productWords.forEach(pWord => {
                        // Ensure we're matching whole words, not parts of words
                        if (pWord.length <= 2) return; // Skip very short words
                        
                        itemWords.forEach(iWord => {
                            if (iWord.length <= 2) return; // Skip very short words
                            
                            // For short words (3-4 chars), require stronger matches
                            if ((iWord.length <= 4 || pWord.length <= 4) && 
                                !(pWord === iWord || pWord.startsWith(iWord) || iWord.startsWith(pWord))) {
                                return; // Skip these unless they're exact matches or prefixes
                            }
                            
                            if (areSimilarDanishWords(pWord, iWord)) {
                                // For short words, do an additional word boundary check
                                if (iWord.length <= 4) {
                                    if (!isAtWordBoundary(iWord, productName)) return;
                                    
                                    // Apply a penalty for matching very short words (3-4 chars)
                                    shortWordPenalty += 0.3; // 30% penalty per short word match
                                }
                                
                                matchCount++;
                                matchedProductWords.add(pWord);
                                matchedItemWords.add(iWord);
                            }
                        });
                    });
                    
                    // Check if the whole item name is contained in the product name
                    // This helps identify core ingredients even in prepared product names
                    if (productName.toLowerCase().includes(item.toLowerCase())) {
                        // Make sure it's at a word boundary for short items
                        if (item.length <= 4 && !isAtWordBoundary(item, productName)) {
                            // Not at word boundary, don't count it
                        } else {
                            // Give a significant bonus for full item matches
                            matchCount += 3; 
                            itemWords.forEach(word => matchedItemWords.add(word));
                        }
                    } 
                    // Also check if the item contains the product name
                    // This helps with cases where the product is a more specific version
                    else if (item.toLowerCase().includes(productName.toLowerCase()) && 
                             productName.length > 4) {
                        matchCount += 2;
                        productWords.forEach(word => matchedProductWords.add(word));
                    }
                    
                    // If we found matches
                    if (matchCount > 0) {
                        // Calculate match accuracy
                        const productCoverage = matchedProductWords.size / productWords.length;
                        const itemCoverage = matchedItemWords.size / itemWords.length;
                        
                        // Weighted accuracy: considers both product and item coverage
                        // Apply the short word penalty to reduce score for matches based on very short words
                        let matchAccuracy = Math.round((productCoverage * 0.7 + itemCoverage * 0.3) * 100);
                        
                        // Apply penalty if we're only matching based on short words
                        if (shortWordPenalty > 0 && matchedItemWords.size > 0) {
                            const penaltyFactor = Math.min(shortWordPenalty, 0.7); // Cap the penalty at 70%
                            matchAccuracy = Math.round(matchAccuracy * (1 - penaltyFactor));
                        }
                        
                        // Reduce score for prepared meals
                        const preparedMealPenalty = getPreparedMealPenalty(productName);
                        if (preparedMealPenalty > 0) {
                            matchAccuracy = Math.max(0, matchAccuracy - preparedMealPenalty);
                        }
                        
                        // Higher threshold for short items to reduce false positives
                        const minThreshold = item.length <= 4 ? 45 : 30;
                        
                        // Only consider matches with reasonable accuracy
                        if (matchAccuracy >= minThreshold) {
                            // Add item with its accuracy and category
                            // Check if this item is already in the array
                            const existingIndex = matchedItems.findIndex(
                                mi => mi.name === item && mi.category === category.category
                            );
                            
                            if (existingIndex === -1) {
                                // Item not found, add it
                                matchedItems.push({
                                    name: item,
                                    accuracy: matchAccuracy,
                                    category: category.category
                                });
                            } else {
                                // Item exists, update accuracy if higher
                                if (matchAccuracy > matchedItems[existingIndex].accuracy) {
                                    matchedItems[existingIndex].accuracy = matchAccuracy;
                                }
                            }
                        }
                    }
                });
            });
        });
        
        // Sort matched items by accuracy (highest first)
        matchedItems.sort((a, b) => b.accuracy - a.accuracy);
        
        // Apply match items limit if specified
        if (matchItemsLimit > 0 && matchedItems.length > matchItemsLimit) {
            matchedItems = matchedItems.slice(0, matchItemsLimit);
        }
        
        // Get the top category with highest accuracy score
        let primaryCategory = "Ukendt";
        const highestAccuracy = matchedItems.length > 0 ? matchedItems[0].accuracy : 0;
        
        if (matchedItems.length > 0) {
            // Use the category of the highest accuracy match
            primaryCategory = matchedItems[0].category;
        }
        
        // Format for database compatibility
        // Return only a single category in the categories array for future-proofing
        return {
            ...offer,
            categories: [primaryCategory], // Single category in an array
            matchedItems: matchedItems,
            matchAccuracy: highestAccuracy
        };
    });
}

/**
 * Filter out prepared meals, non-food items and unknown items from the final results
 * @param {Array} categorizedOffers - The offers after categorization
 * @param {Number} accuracyThreshold - Minimum accuracy score to keep (default 30)
 * @param {Number} matchItemsLimit - Maximum number of matched items to keep per offer (0 = no limit)
 * @returns {Array} - The filtered offers
 */
function filterPreparedMeals(categorizedOffers, accuracyThreshold = 30, matchItemsLimit = 0) {
    const filteredOffers = categorizedOffers.filter(offer => {
        // Filter out obvious prepared meals (low match accuracy or unknown category)
        if (offer.categories[0] === "Ukendt" || offer.matchAccuracy < accuracyThreshold) {
            return false;
        }
        
        // Check the offer name for prepared meal indicators
        const preparedMealPenalty = getPreparedMealPenalty(offer.name);
        if (preparedMealPenalty > 40) {
            return false; // Strong indication of prepared meal
        }
        
        // Keep this offer
        return true;
    });
    
    // Limit the matchedItems array if requested
    if (matchItemsLimit > 0) {
        return filteredOffers.map(offer => {
            if (offer.matchedItems.length > matchItemsLimit) {
                return {
                    ...offer,
                    matchedItems: offer.matchedItems.slice(0, matchItemsLimit)
                };
            }
            return offer;
        });
    }
    
    return filteredOffers;
}

module.exports = {
    fetchJson,
    categorizeOffers,
    expandHyphenatedWords,
    areSimilarDanishWords,
    isAtWordBoundary,
    getPreparedMealPenalty,
    filterPreparedMeals
};