const axios = require("axios");
const utils = require("./utils");

const units = {
    "": { unit: "stk", factor: 1 },
    ea: { unit: "stk", factor: 1 },
    bunch: { unit: "stk", factor: 1 },
    eggs: { unit: "stk", factor: 1 },
    lb: { unit: "kg", factor: 2.20462 },
    "100g": { unit: "kg", factor: 10 },
};

exports.getCanonical = function (item, today) {
    let quantity = 1;
    let price = parseFloat(item.pricing.price);
    let unit = item.pricingUnits.unit;
    let isWeighted = false;
    let unavailable = false;

    if (item.pricingUnits.type === "SOLD_BY_EACH_PRICED_BY_WEIGHT" || item.pricingUnits.type === "SOLD_BY_WEIGHT") {
        isWeighted = true;
        let prices = item.packageSizing.split("$").filter((price) => price !== "");
        try {
            [price, quantity, unit] = getBulkPrice(prices);
        } catch (error) {
            console.error(error);
            console.log(item);
        }
        // console.log(item);
        // console.log(price);
        // console.log(unit);
        // console.log(quantity);
        // } else if (item.pricingUnits.type === "SOLD_BY_WEIGHT") {
        //     isWeighted = true;
        //     unit = item.pricingUnits.unit;
        //     let prices = item.packageSizing.split("$").filter((price) => price !== '');
        //     try {
        //         [price, quantity, unit] = getBulkPrice(prices);

        //     } catch (error) {
        //         console.error(error);
        //         console.log(item);
        //     }
    } else {
        const quantityAndUnit = item.packageSizing.split(",")[0].split(" ");
        if (item.packageSizing.includes("x")) {
            const quantityAndUnit = item.packageSizing.split(",")[0].split(" ");
            unit = quantityAndUnit[1];
            let quantityTokens = quantityAndUnit[0].split("x");
            quantity = parseFloat(quantityTokens[0]) * parseFloat(quantityTokens[1]);
        } else {
            quantity = parseInt(quantityAndUnit[0]);
            unit = quantityAndUnit[1];
        }
    }

    if (item.deal.name) {
        if (item.deal.name == "MULTI") {
            let quantityAndPrice = item.deal.text.split(" ");
            price = parseFloat(quantityAndPrice[2].substring(1)) / parseInt(quantityAndPrice);
        } else if (item.deal.name == "LIMIT") {
            price = parseFloat(item.deal.text.split(" ")[0].substring(1));
        } else if (item.deal.name == "SALE") {
            // ignore
        } else {
            console.log("unknown deal");
            console.log(item.deal);
        }
    }

    if (!unit) {
        console.log("no unit");
        console.log(item);
    } else if (unit.includes("c")) {
        unit = "ea";
    }
    let name = item.title.trim();

    if (item.brand) {
        name = `${item.brand} ${item.title}`.trim();
    }

    if (item.inventoryIndicator && item.inventoryIndicator.indicatorId === "OUT") {
        unavailable = true;
    }

    return utils.convertUnit(
        {
            id: item.productId,
            name,
            description: item.description ?? "",
            price: price,
            priceHistory: [{ date: today, price: price }],
            isWeighted: isWeighted,
            unit,
            quantity,
            url: item.link,
            unavailable: unavailable,
            bio: name.toLowerCase().includes("organic"),
        },
        units,
        "superstore"
    );
};

function getBulkPrice(prices) {
    const kgPrices = prices.filter((price) => price.includes("kg"));
    const priceAndUnitText = kgPrices[0] ? kgPrices[0] : prices[0];
    const priceAndUnit = priceAndUnitText.split("/");
    const unitRegex = /^(\d+(?:\.\d+)?)(\w*)/;
    const quantityAndUnit = priceAndUnit[1].match(unitRegex);
    return [parseFloat(priceAndUnit[0]), parseInt(quantityAndUnit[1]), quantityAndUnit[2]];

    // if (kgPrices[0]) {
    //     const kgPriceText = kgPrices[0].trim();
    //     kgPrice = parseFloat(kgPriceText.substring(0, kgPriceText.indexOf("/")));
    // } else {
    //     console.log(prices);

    //     const

    //     const lbPriceText = prices.filter((price) => price.includes("lb"))[0];
    //     if (lbPriceText) {
    //         const lbPrice = parseFloat(lbPriceText.substring(0, lbPriceText.indexOf("/")));
    //         kgPrice = lbPrice * 2.20462;
    //     } else {
    //         const gPriceText = prices.filter((price) => price.includes("g"))[0];
    //         let priceAndQuantity = gPriceText.split("/");
    //         let kgFactor = 1000 / parseFloat(priceAndQuantity[1].substring(0, priceAndQuantity[1].length));
    //         kgPrice = priceAndQuantity[0] * kgFactor;
    //         console.log(kgFactor);
    //         console.log(kgPrice);
    //     }
    // }

    // return {price, unit};
}

const CONFIG = {
    headers: {
        Host: "api.pcexpress.ca",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0",
        Accept: "*/*",
        "Accept-Language": "en",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://www.realcanadiansuperstore.ca/",
        "x-apikey": "C1xujSegT5j3ap3yexJjqhOfELwGKYvz",
        "x-channel": "web",
        "Content-Type": "application/json",
        "x-loblaw-tenant-id": "ONLINE_GROCERIES",
        "x-application-type": "Web",
        // x-preview: false
        Origin_Session_Header: "B",
        // Content-Length: 250
        Origin: "https://www.realcanadiansuperstore.ca",
        // Connection: keep-alive
        // Sec-Fetch-Dest: empty
        // Sec-Fetch-Mode: cors
        // Sec-Fetch-Site: cross-site
    },
};

exports.fetchData = async function () {
    from = 1;
    result = [];
    done = false;
    while (!done) {
        const SUPERSTORE_SEARCH = `https://api.pcexpress.ca/pcx-bff/api/v2/listingPage/27985`;
        const body = {
            cart: { cartId: "d7957def-f147-4cfe-8575-e3268648c3c4" },
            fulfillmentInfo: { storeId: "1528", pickupType: "STORE", offerType: "OG" },
            listingInfo: { filters: {}, sort: {}, pagination: { from: from }, includeFiltersInResponse: true },
            banner: "superstore",
        };
        data = (await axios.post(SUPERSTORE_SEARCH, body, CONFIG)).data;
        productGrid = data.layout.sections.productListingSection.components[0].data.productGrid;
        done = !productGrid.pagination.hasMore;
        console.log(productGrid.pagination);
        from++;
        result = result.concat(productGrid.productTiles);
    }
    return result;
};

exports.initializeCategoryMapping = async () => {};

exports.mapCategory = (rawItem) => {};

exports.urlBase = "https://www.realcanadiansuperstore.ca";
