class CatalogModel {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.validFrom = data.validFrom;
        this.validTo = data.validTo;
        this.offers = data.offers || [];
    }

    static fromApiResponse(apiResponse) {
        return new CatalogModel({
            id: apiResponse.id,
            title: apiResponse.title,
            description: apiResponse.description,
            validFrom: apiResponse.valid_from,
            validTo: apiResponse.valid_to,
            offers: apiResponse.offers
        });
    }

    getOfferById(offerId) {
        return this.offers.find(offer => offer.id === offerId);
    }

    getAllOffers() {
        return this.offers;
    }
}

module.exports = CatalogModel;