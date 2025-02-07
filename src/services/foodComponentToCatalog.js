const fs = require(`fs`).promises;

async function fetchJson(filePath) {
    try {
        const data = await fs.readFile(filePath, `utf8`);
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading file from disk: ${err}`);
    }
}

function categorizeOffers(offers, categories) {
    return offers.map(offer => {
        let matchedCategories = new Set();
        let matchedItems = new Set();

        let productNames = offer.name.split(` eller `).map(name => name.trim());

        productNames.forEach(product => {
            categories.forEach(category => {
                category.items.forEach(item => {
                    if (product.toLowerCase().includes(item.toLowerCase())) {
                        matchedCategories.add(category.category);
                        matchedItems.add(item);
                    }
                });
            });
        });

        // If no category matches, add to `Unknown/Other`
        if (matchedCategories.size === 0) {
            matchedCategories.add(`Unknown/Other`);
        }

        return {
            ...offer,
            categories: Array.from(matchedCategories),
            matchedItems: Array.from(matchedItems) // New field for matched items
        };
    });
}

module.exports = {
    fetchJson,
    categorizeOffers
};
