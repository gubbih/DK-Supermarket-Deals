const fs = require(`fs`).promises;

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
        ['hel', 'hell'],   // Blocks "Hel kylling" matching with "Hellmann's"
        ['san', 'sand']    // Blocks "San Miguel" matching with "Sandart"
    ];
    
    // Check if this pair is blocked
    for (const [a, b] of blockedMatches) {
        if ((word1.includes(a) && word2.includes(b)) || 
            (word1.includes(b) && word2.includes(a))) {
            return false;
        }
    }
    
    // Special case for short words - they must match exactly or be a prefix/suffix
    if (word1.length <= 3 || word2.length <= 3) {
        // For short words, one must be a substring of the other at word boundary
        return (word1.startsWith(word2) || word2.startsWith(word1));
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
    
    const isWordBoundaryBefore = /\s|^|[.,;:!?()-]/.test(beforeChar);
    const isWordBoundaryAfter = /\s|$|[.,;:!?()-]/.test(afterChar);
    
    return isWordBoundaryBefore && isWordBoundaryAfter;
}

/**
 * Categorizes offers based on food components with improved matching
 * @param {Array} offers - The offers to categorize
 * @param {Array} categories - The food component categories
 * @returns {Array} - The categorized offers with accuracy scores
 */
function categorizeOffers(offers, categories) {
    return offers.map(offer => {
        let matchedItems = []; // Array to store items with their scores
        let matchDetails = []; // For debugging and transparency
        
        // Pre-process offer name: expand hyphenated words
        let processedOfferName = expandHyphenatedWords(offer.name);
        
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
                                    // This reduces the impact of matches like "hel" in "Hellmann's"
                                    shortWordPenalty += 0.3; // 30% penalty per short word match
                                }
                                
                                matchCount++;
                                matchedProductWords.add(pWord);
                                matchedItemWords.add(iWord);
                            }
                        });
                    });
                    
                    // Check if the whole item name is contained in the product name
                    if (productName.toLowerCase().includes(item.toLowerCase())) {
                        // Make sure it's at a word boundary for short items
                        if (item.length <= 4 && !isAtWordBoundary(item, productName)) {
                            // Not at word boundary, don't count it
                        } else {
                            matchCount += 2; // Bonus for full match
                            itemWords.forEach(word => matchedItemWords.add(word));
                        }
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
                            
                            // Save match details for debugging
                            matchDetails.push({
                                productName,
                                itemName: item,
                                matchedWords: Array.from(matchedProductWords),
                                matchAccuracy,
                                category: category.category,
                                shortWordPenalty: shortWordPenalty > 0 ? true : false
                            });
                        }
                    }
                });
            });
        });
        
        // Sort matched items by accuracy (highest first)
        matchedItems.sort((a, b) => b.accuracy - a.accuracy);
        
        // Extract categories from matched items (maintaining order by accuracy)
        const seenCategories = new Set();
        const categoriesByAccuracy = matchedItems
            .filter(match => {
                // Only include each category once (first/highest occurrence)
                if (seenCategories.has(match.category)) {
                    return false;
                }
                seenCategories.add(match.category);
                return true;
            })
            .map(match => match.category);
        
        // If no category matches, add to "Ukendt"
        if (categoriesByAccuracy.length === 0) {
            categoriesByAccuracy.push("Ukendt");
        }
        
        // Get the highest accuracy score
        const highestAccuracy = matchedItems.length > 0 ? matchedItems[0].accuracy : 0;
        
        // Format for database compatibility
        return {
            ...offer,
            categories: categoriesByAccuracy,
            matchedItems: matchedItems,
            matchAccuracy: highestAccuracy
        };
    });
}

module.exports = {
    fetchJson,
    categorizeOffers,
    expandHyphenatedWords,  // Exported for testing
    areSimilarDanishWords,  // Exported for testing
    isAtWordBoundary       // Exported for testing
};