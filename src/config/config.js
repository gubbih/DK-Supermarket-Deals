require('dotenv').config();

const parseBusinessIds = (businessIdsString) => {
    console.log("BUSINESS_IDS:", businessIdsString);
    if (!businessIdsString) {
        console.warn("Warning: BUSINESS_IDS is not defined");
        return [];
    }
    return businessIdsString.split('_').map(item => {
        const [name, id] = item.split(':');
        return { name, id };
    });
};

module.exports = {
    apiKey: process.env.API_KEY,
    trackId: process.env.TRACK_ID,
    businessIds: parseBusinessIds(process.env.BUSINESS_IDS)
};