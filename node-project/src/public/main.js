document.addEventListener('DOMContentLoaded', async function() {
    try {
        //.log('Fetching catalogs from ShopGun...');
        const response = await SGN.CoreKit.request({
            url: '/v2/catalogs',
            qs: {
                dealer_id: '9ba51',
                order_by: '-valid_date',
                types: 'incito',
                offset: 0,
                limit: 4
            }
        });
        //console.log('Catalogs received:', response.data);
        const catalogsDiv = document.getElementById('list-publications');

        response.data.forEach(catalog => {
            const catalogDiv = document.createElement('div');
            catalogDiv.innerHTML = `
                <h2>${catalog.title}</h2>
                <p>${catalog.description}</p>
            `;
            catalogsDiv.appendChild(catalogDiv);
        });
    } catch (error) {
        console.error('Error fetching catalogs:', error);
    }
});