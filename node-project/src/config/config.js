require('dotenv').config();

module.exports = {
    apiKey: process.env.API_KEY,
    trackId: process.env.TRACK_ID,
    businessIds: [
        { name: 'Netto', id: '9ba51' },
        { name: 'Super brugsen', id: '0b1e8' },
        { name: 'Lidl', id: '71c90' },
        { name: 'Føtex', id: 'bdf5A' },
        { name: 'Spar', id: '88ddE' },
        { name: 'Min købman', id: '603dfL' },
        { name: 'Kvickly', id: 'c1edq' },
        { name: 'Bilka', id: '93f13' },
        { name: 'Rema 1000', id: '11deC' },
        { name: 'ABC', id: '70d42L' },
        { name: 'Brugsen', id: 'd311fg' },
        { name: 'Meny', id: '267e1m' },
        { name: 'Løvbjerg', id: '65caN' },
        { name: 'Let køb', id: 'f6f54' }
    ]
};