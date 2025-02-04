require('dotenv').config();

const parseBusinessIds = (businessIdsString) => {
    return businessIdsString.split(',').map(item => {
        const [name, id] = item.split(':');
        return { name, id };
    });
};

module.exports = {
    apiKey: process.env.API_KEY,
    trackId: process.env.TRACK_ID,
    businessIds: parseBusinessIds(process.env.BUSINESS_IDS)
};