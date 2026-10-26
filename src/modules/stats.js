import * as d3 from 'd3';
import { state } from './state.js';
import { getTranslation } from './i18n.js';
import { renderIcons } from './icons.js';

export function calculateStats(priceData, livePrice = null) {
    if (!priceData || !priceData.prices) return { ath: 0, athDate: null, currentPrice: 0, daysSinceGenesis: 0 };

    // priceData.prices is an array of arrays: [[timestamp, price], ...]
    const prices = priceData.prices.map((d) => d[1]);

    const ath = d3.max(prices);
    const athIndex = d3.maxIndex(priceData.prices, (d) => d[1]);
    const athDate = athIndex >= 0 ? new Date(priceData.prices[athIndex][0]) : null;

    // Use livePrice if available, otherwise fallback to last data point
    const currentPrice = livePrice ? livePrice : prices[prices.length - 1];
    const isLive = !!livePrice;

    // Genesis Date: 2009-01-03
    const genesisDate = new Date('2009-01-03');
    const now = new Date();
    const daysSinceGenesis = Math.floor((now - genesisDate) / (1000 * 60 * 60 * 24));

    return {
        ath,
        athDate,
        currentPrice,
        daysSinceGenesis,
        isLive,
    };
}

const formatDayCount = (value) =>
    new Intl.NumberFormat(state.lang === 'es' ? 'es-ES' : 'en-US', { useGrouping: 'always' }).format(value);

export function renderStats(stats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const formatDate = d3.utcFormat(state.lang === 'es' ? '%d %b %Y' : '%b %d, %Y');
    const athDate = stats.athDate ? formatDate(stats.athDate) : '';

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-12 py-12 border-b border-border/20">
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <i data-lucide="trending-up" class="w-2.5 h-2.5 text-bitcoin-orange opacity-40"></i>
                    <span class="editorial-label text-[10px]">${getTranslation('statATH')}</span>
                </div>
                <span class="text-xs uppercase tracking-widest font-heading font-medium">${getTranslation('statATHSub')}</span>
                <p class="text-4xl font-mono font-bold tracking-tighter text-bitcoin-orange mt-2">${d3.format('$,.0f')(stats.ath)}</p>
                ${athDate ? `<span class="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">${athDate}</span>` : ''}
            </div>
            <div class="flex flex-col gap-2 border-l border-border/10 pl-12">
                <div class="flex items-center gap-2">
                    <i data-lucide="clock" class="w-2.5 h-2.5 opacity-40"></i>
                    <span class="editorial-label text-[10px]">${getTranslation('statDaysGenesis')}</span>
                </div>
                <span class="text-xs uppercase tracking-widest font-heading font-medium">${getTranslation('statDaysGenesisSub')}</span>
                <p class="text-4xl font-mono font-bold tracking-tighter mt-2">${formatDayCount(stats.daysSinceGenesis)} <span class="text-xs font-heading uppercase tracking-widest opacity-60 ml-2">${getTranslation('statDaysUnit')}</span></p>
            </div>
            <div class="flex flex-col gap-2 border-l border-border/10 pl-12">
                <div class="flex items-center gap-2">
                    <i data-lucide="dollar-sign" class="w-2.5 h-2.5 opacity-40"></i>
                    <span class="editorial-label text-[10px]">${getTranslation('statCurrentPrice')}</span>
                    ${stats.isLive ? '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>' : ''}
                </div>
                <span class="text-xs uppercase tracking-widest font-heading font-medium">${getTranslation('statCurrentPriceSub')}</span>
                <p class="text-4xl font-mono font-bold tracking-tighter mt-2">${d3.format('$,.2f')(stats.currentPrice)}</p>
            </div>
        </div>
    `;

    renderIcons();
}
