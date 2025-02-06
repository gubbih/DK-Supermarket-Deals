require('dotenv').config();

const parseBusinessIds = (businessIdsString) => {
    console.log("BUSINESS_IDS:", businessIdsString);
    if (!businessIdsString) {
        console.warn("Warning: BUSINESS_IDS is not defined");
        return [];
    }
    return businessIdsString.split(',').map(item => {
        const [name, id] = item.split(':');
        return { name, id };
    });
};

console.log("API_KEY:", process.env.API_KEY);
console.log("TRACK_ID:", process.env.TRACK_ID);
console.log("BUSINESS_IDS:", process.env.BUSINESS_IDS);

module.exports = {
    apiKey: process.env.API_KEY,
    trackId: process.env.TRACK_ID,
    businessIds: parseBusinessIds(process.env.BUSINESS_IDS)
};