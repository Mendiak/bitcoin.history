import * as d3 from 'd3';

const priceDataURL = 'bitcoin-price-history.json';
const eventsDataURL = 'events.json';
const marketCyclesURL = 'market-cycles.json';
const translationsURL = 'translations.json';

export async function loadData() {
    return Promise.all([
        d3.json(priceDataURL),
        d3.json(eventsDataURL),
        d3.json(marketCyclesURL),
        d3.json(translationsURL),
    ]);
}

// Fuentes de precio al contado, en orden de preferencia. Si una falla (CORS,
// rate limit, caída), se prueba la siguiente en lugar de dejar la stat vacía.
const livePriceSources = [
    async () => {
        const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
        if (!res.ok) throw new Error(`Coinbase ${res.status}`);
        const json = await res.json();
        return Number(json?.data?.amount);
    },
    async () => {
        const res = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
        if (!res.ok) throw new Error(`Kraken ${res.status}`);
        const json = await res.json();
        return Number(json?.result?.XXBTZUSD?.c?.[0]);
    },
    async () => {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
        const json = await res.json();
        return Number(json?.bitcoin?.usd);
    },
];

export async function fetchLivePrice() {
    for (const source of livePriceSources) {
        try {
            const price = await source();
            if (Number.isFinite(price) && price > 0) return price;
        } catch {
            // Probamos la siguiente fuente
        }
    }
    return null;
}
