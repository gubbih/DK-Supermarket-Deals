/**
 * Enhanced food component matching algorithm for Danish food offers
 * 
 * This module provides improved functionality for categorizing Danish food products
 * with better handling of Danish language nuances, more accurate prepared meal detection,
 * and implementation of single category per product.
 */

const fs = require('fs').promises;

/**
 * Read JSON data from a file
 */
async function fetchJson(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading file from disk: ${err}`);
    }
}

/**
 * Expands hyphenated words by borrowing the prefix from previous words and
 * handles common Danish food product naming patterns
 */
function expandHyphenatedWords(text) {
    if (!text) return '';
    
    // First, clean up the product name
    // Remove common size/quantity indicators like "500g" or "2 stk"
    text = text.replace(/\b\d+\s*(g|kg|ml|l|cl|stk)\b/gi, '');
    
    // Remove percentage indicators
    text = text.replace(/\b\d+\s*%\b/g, '');
    
    // Handle the "eller/og" splits separately for better processing
    const parts = text.split(/\s+eller\s+|\s+og\s+|\s+&\s+/);
    const expandedParts = [];
    
    for (const part of parts) {
        const words = part.split(/\s+/);
        
        // Process hyphenated words in each part
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
        
        expandedParts.push(words.join(' '));
    }
    
    // Recombine the processed parts
    return expandedParts.join(' eller ');
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
        // Keep your existing blocked matches
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
        ['ger', 'burger'],   // Blocks "ger" matching with "burger"
        // Add more problematic pairs
        ['øl', 'olie'],      // Blocks "øl" matching with "olie"
        ['is', 'chips'],     // Blocks "is" matching with "chips"
        ['is', 'kiks'],      // Blocks "is" matching with "kiks"
        ['mel', 'mel'],      // Keep "mel" matching with exact "mel" only
        ['te', 'te'],        // Keep "te" matching with exact "te" only
        ['salt', 'salat'],   // Blocks "salt" matching with "salat"
        ['vin', 'vingummi'], // Blocks "vin" matching with "vingummi"
        ['vin', 'vineddike'], // Blocks "vin" matching with "vineddike"
        ['ost', 'postej'],   // Blocks "ost" matching with "postej"
        ['ost', 'frost'],    // Blocks "ost" matching with "frost"
        ['kar', 'karry'],    // Blocks "kar" matching with "karry"
        ['bar', 'barber'],   // Blocks "bar" matching with "barber"
        ['ris', 'pris'],      // Blocks "ris" matching with "pris"
        ['løg', 'løgismose'], // Blocks "Løg" matching with "Løgkompot"
        ['chips', 'chili'],
    ];
    
    // Check if this pair is blocked
    for (const [a, b] of blockedMatches) {
        if ((word1.includes(a) && word2.includes(b)) || 
            (word1.includes(b) && word2.includes(a))) {
            return false;
        }
    }
    
    // Special case for Danish "æg" (eggs)
    if ((word1 === 'æg' && word2.match(/^æg(s|ene)?$/)) || 
        (word2 === 'æg' && word1.match(/^æg(s|ene)?$/))) {
        return true;
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
    if (!productName) return 0;
    
    const PREPARED_INDICATORS = [
        // English indicators
        "dinner kit", "kit", "meal kit", "ready", 
        // Danish indicators
        "mikrobølgeovn", "færdigret", "ret med", "ret i", "færdig",
        "convenience", "frossen ret", "let at", "hurtig at", "parat til",
        "instant", "klar til", "hurtig", "opvarm", "ovn",
        // Additional Danish prepared meal indicators
        "måltid", "samlet", "sammensat", "tilberedt", "tilbehør",
        "marineret", "marinerede", "krydrede", "krydret", 
        "grillet", "stegt", "bagt",
        "pakke", "meal", "frokost", "aftensmad",
        "morgenmad", "middag", "snack", "tapas", "servering", "Saltim bocca"
    ];
    
    // Strong indicators should carry a higher penalty
    const STRONG_INDICATORS = [
        "færdigret", "måltid", "aftensmad", "sammensat",
        "tilberedt", "meal kit", "dinner kit"
    ];
    
    const lowerName = productName.toLowerCase();
    
    // Check for strong indicators (higher penalty)
    for (const indicator of STRONG_INDICATORS) {
        if (lowerName.includes(indicator)) {
            return 75; // Very high penalty
        }
    }
    
    // Check for regular indicators with more nuanced context detection
    for (const indicator of PREPARED_INDICATORS) {
        if (lowerName.includes(indicator.toLowerCase())) {
            // Handle special cases for sovs/sauce and dressing
            if (indicator === "sovs" || indicator === "sauce" || indicator === "dressing" || indicator === "mix") {
                // These are only prepared meals when combined with other terms
                // Allow "pizza dressing", "bernies sovs", etc. as ingredients
                if (lowerName === indicator || lowerName.match(/\b(pizza|bernies|bearnaise|brun|chili)\s+(sovs|sauce|dressing)\b/i)) {
                    continue; // Skip the penalty, this is a purchasable ingredient
                }
            }
            return 50; // Significant penalty
        }
    }
    
    // Check for dish patterns (like "X med Y")
    if (lowerName.match(/\s+med\s+/) && lowerName.split(/\s+/).length > 3) {
        return 40; // Likely a dish description
    }
    
    // Check for complex names (longer product names are often prepared meals)
    const wordCount = lowerName.split(/\s+/).length;
    if (wordCount >= 5) {
        return 20 + Math.min(30, (wordCount - 5) * 5); // Increasing penalty with word count
    }
    
    return 0; // No penalty - likely a food component
}

/**
 * Categorizes offers based on food components with improved matching
 * @param {Array} offers - The offers to categorize
 * @param {Array} categories - The food component categories
 * @param {Number} matchItemsLimit - Maximum number of matched items to keep per offer (0 = no limit)
 * @returns {Array} - The categorized offers with accuracy scores
 */
function categorizeOffers(offers, categories, matchItemsLimit = 2) {
    // Define category priority mapping (higher value = higher priority)
    const CATEGORY_PRIORITY = {
        'Proteiner': 10,
        'Bageri': 9,
        'Kulhydrater': 8,
        'Grøntsager': 7,
        'Frugter': 6,
        'Fedtstoffer & Olier': 5,
        'Tilsætningsstoffer & Krydderier': 3,
        'Ukendt': 1
    };

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
        matchedItems.sort((a, b) => {
            // If accuracy difference is significant, sort by accuracy
            if (Math.abs(b.accuracy - a.accuracy) > 10) {
                return b.accuracy - a.accuracy;
            }
            
            // Otherwise, consider category priority when accuracies are close
            const priorityA = CATEGORY_PRIORITY[a.category] || 0;
            const priorityB = CATEGORY_PRIORITY[b.category] || 0;
            
            return priorityB - priorityA;
        });
        
        // Apply match items limit if specified
        if (matchItemsLimit > 0 && matchedItems.length > matchItemsLimit) {
            matchedItems = matchedItems.slice(0, matchItemsLimit);
        }
        
        // Get the top category with highest accuracy/priority score
        let primaryCategory = "Ukendt";
        const highestAccuracy = matchedItems.length > 0 ? matchedItems[0].accuracy : 0;
        
        if (matchedItems.length > 0) {
            // Use the category of the highest accuracy/priority match
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
function filterPreparedMeals(categorizedOffers, accuracyThreshold = 40, matchItemsLimit = 0) {
    // List of brands or terms that often appear in non-food items
    const NON_FOOD_INDICATORS = [
        "magazine", "magasin", "blad", "avis", "bog", "kupon", "sæbe", "vaskepulver",
        "shampo", "shampoo", "balsam", "shower", "bad", "toilet", "rengøring",
        "rengøring", "vask", "opvask", "opvaskemiddel", "batteri", "batterier",
        "lighter", "tændstik", "serviet", "toiletpapir", "køkkenrulle", "ble",
        "tandpasta", "tandbørste", "deodorant", "creme", "lotion", "parfume",
        "parfyme", "duft", "lys", "stearinlys", "vinduespudser", "vinduespudsning",
        "vaskemaskine", "opvaskemaskine", "tørretumbler", "tørretumbling",
        "vaskemiddel", "opvaskemiddel", "skyllemiddel", "skyllemiddel",
        "skylle", "skylning", "rens", "rensning", "renser", "rensemiddel",
        "rensemidler", "rensning", "rensning", "rensning", "rensning",
        "sokker", "strømper", "undertøj", "tøj", "tøjvask", "bukser",
        "skjorte", "sko", "støvler", "jakke", "frakke", "hat", "hue",
        "vanter", "handsker", "tørklæde", "halstørklæde", "bælte", "slips",
        "plastik kasse", "plastikkasse", "kasse", "kasser", "skab", "skabe",
        "skuffe", "skuffer", "bord", "borde", "stol", "stole", "sofa", "sofaer",
        "lampe", "lamper", "ledning", "ledninger", "stik",
        "battery", "batteries", "lighter", "matches", "soap", "detergent",
        "puder", "dyne", "dyner", "sengetøj", "sengetøjs", "senge", "seng",
        "madrasser", "madras", "pudebetræk", "dynebetræk", "lagnet", "lagner",
        "Aida Relief blå", "Aida Relief rød", "Aida Relief grøn", "Aida Relief gul",
        "Aida Relief sort", "Aida Relief hvid", "Aida Relief orange", "Aida Relief lilla",

    ];
    
    const filteredOffers = categorizedOffers.filter(offer => {
        // Filter out obvious prepared meals (low match accuracy or unknown category)
        if (offer.categories[0] === "Ukendt" || offer.matchAccuracy < accuracyThreshold) {
            return false;
        }
        
        const lowerName = offer.name.toLowerCase();
        
        // Check for non-food terms
        for (const term of NON_FOOD_INDICATORS) {
            if (lowerName.includes(term)) {
                return false;
            }
        }
        
        // Check the offer name for prepared meal indicators
        const preparedMealPenalty = getPreparedMealPenalty(offer.name);
        if (preparedMealPenalty > 40) {
            return false; // Strong indication of prepared meal
        }
        
        // Identify and filter out suspected prepared meals based on name patterns
        if (lowerName.match(/(\w+) med (\w+)/) && offer.matchAccuracy < 70) {
            // "X med Y" is often a prepared meal, unless we have high confidence it's a component
            return false;
        }
        
        // Reject items with too many words (likely complex prepared meals) unless very high confidence
        const wordCount = lowerName.split(/\s+/).length;
        if (wordCount >= 5 && offer.matchAccuracy < 70) {
            return false;
        }
        
        // Identify alcohol and beverage products which aren't food components
        if (offer.categories[0] === "Ukendt" && 
            (lowerName.match(/\b(øl|vin|spiritus|vodka|gin|rom|whisky|cognac)\b/) ||
             lowerName.match(/\b(sodavand|soda|cola|fanta|sprite|juice|drik|vand)\b/))) {
            return false;
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