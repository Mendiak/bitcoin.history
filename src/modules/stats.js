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
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-12 py-12 border-b border-border/20">
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <i data-lucide="trending-up" class="w-2.5 h-2.5 text-bitcoin-orange opacity-40"></i>
                    <span class="editorial-label text-[10px] opacity-40">${getTranslation('statATH')}</span>
                </div>
                <span class="text-xs uppercase tracking-widest font-heading font-medium">All Time High</span>
                <p class="text-4xl font-mono font-bold tracking-tighter text-bitcoin-orange mt-2">${d3.format("$,.0f")(stats.ath)}</p>
            </div>
            <div class="flex flex-col gap-2 border-l border-border/10 pl-12">
                <div class="flex items-center gap-2">
                    <i data-lucide="clock" class="w-2.5 h-2.5 opacity-40"></i>
                    <span class="editorial-label text-[10px] opacity-40">${getTranslation('statDaysGenesis')}</span>
                </div>
                <span class="text-xs uppercase tracking-widest font-heading font-medium">Network Age</span>
                <p class="text-4xl font-mono font-bold tracking-tighter mt-2">${d3.format(",")(stats.daysSinceGenesis)} <span class="text-xs font-heading uppercase tracking-widest opacity-60 ml-2">Days</span></p>
            </div>
            <div class="flex flex-col gap-2 border-l border-border/10 pl-12">
                <div class="flex items-center gap-2">
                    <i data-lucide="dollar-sign" class="w-2.5 h-2.5 opacity-40"></i>
                    <span class="editorial-label text-[10px] opacity-40">${getTranslation('statCurrentPrice')}</span>
                    ${stats.isLive ? '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>' : ''}
                </div>
                <span class="text-xs uppercase tracking-widest font-heading font-medium">Current Exchange</span>
                <p class="text-4xl font-mono font-bold tracking-tighter mt-2">${d3.format("$,.2f")(stats.currentPrice)}</p>
            </div>
        </div>
    `;
}
