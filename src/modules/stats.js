import * as d3 from 'd3';
import { state } from './state.js';
import { getTranslation } from './i18n.js';

export function calculateStats(priceData, livePrice = null) {
    if (!priceData || !priceData.prices) return { ath: 0, currentPrice: 0, daysSinceGenesis: 0 };

    // priceData.prices is an array of arrays: [[timestamp, price], ...]
    const prices = priceData.prices.map(d => d[1]);
    
    const ath = d3.max(prices);
    // Use livePrice if available, otherwise fallback to last data point
    const currentPrice = livePrice ? livePrice : prices[prices.length - 1]; 
    const isLive = !!livePrice;
    
    // Genesis Date: 2009-01-03
    const genesisDate = new Date('2009-01-03');
    const now = new Date();
    const daysSinceGenesis = Math.floor((now - genesisDate) / (1000 * 60 * 60 * 24));

    return {
        ath,
        currentPrice,
        daysSinceGenesis,
        isLive
    };
}

export function renderStats(stats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div class="stat-card">
                <h6 class="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-muted-foreground" data-i18n-key="statATH">${getTranslation('statATH')}</h6>
                <p class="text-2xl font-mono font-medium">${d3.format("$,.2f")(stats.ath)}</p>
            </div>
            <div class="stat-card">
                <h6 class="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-muted-foreground" data-i18n-key="statDaysGenesis">${getTranslation('statDaysGenesis')}</h6>
                <p class="text-2xl font-mono font-medium">${d3.format(",")(stats.daysSinceGenesis)}</p>
            </div>
            <div class="stat-card">
                <h6 class="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-muted-foreground" data-i18n-key="statCurrentPrice">${getTranslation('statCurrentPrice')}</h6>
                <div class="flex items-baseline gap-2">
                    <p class="text-2xl font-mono font-medium">${d3.format("$,.2f")(stats.currentPrice)}</p>
                    ${stats.isLive ? '<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live Data"></span>' : ''}
                </div>
            </div>
        </div>
    `;
}
