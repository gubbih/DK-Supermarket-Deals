const fs = require('fs').promises;

async function fetchJson(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading file from disk: ${err}`);
    }
}

function categorizeOffers(offers, categories) {
    return offers.map(offer => {
        let matchedCategories = new Set();

        // Handle multiple products in one offer (split by " eller ")
        let productNames = offer.name.split(" eller ").map(name => name.trim());

        productNames.forEach(product => {
            categories.forEach(category => {
                if (category.items.some(item => product.toLowerCase().includes(item.toLowerCase()))) {
                    matchedCategories.add(category.category);
                }
            });
        });

        // If no category matches, add to "Unknown/Other"
        if (matchedCategories.size === 0) {
            matchedCategories.add("Unknown/Other");
        }

        return {
            ...offer,
            categories: Array.from(matchedCategories)
        };
    });
}

module.exports = {
    fetchJson,
    categorizeOffers
};