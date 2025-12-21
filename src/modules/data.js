import * as d3 from 'd3';

const priceDataURL = "bitcoin-price-history.json";
const eventsDataURL = "events.json";
const marketCyclesURL = "market-cycles.json";
const translationsURL = "translations.json";

export async function loadData() {
    return Promise.all([
        d3.json(priceDataURL),
        d3.json(eventsDataURL),
        d3.json(marketCyclesURL),
        d3.json(translationsURL)
    ]);
}

export async function fetchLivePrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.bitcoin.usd;
    } catch (error) {
        console.warn("Could not fetch live price:", error);
        return null;
    }
}
