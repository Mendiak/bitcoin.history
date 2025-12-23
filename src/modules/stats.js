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

    // Use a clean and modern layout
    container.innerHTML = `
        <div class="row g-3 justify-content-center">
            <div class="col-md-4 col-sm-6">
                <div class="glass-panel stat-card">
                    <div class="stat-icon"><i class="bi bi-graph-up-arrow"></i></div>
                    <div class="stat-content">
                        <h6 class="stat-title text-muted" data-i18n-key="statATH">${getTranslation('statATH')}</h6>
                        <p class="stat-value">${d3.format("$,.2f")(stats.ath)}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-sm-6">
                <div class="glass-panel stat-card">
                    <div class="stat-icon"><i class="bi bi-calendar-check"></i></div>
                    <div class="stat-content">
                        <h6 class="stat-title text-muted" data-i18n-key="statDaysGenesis">${getTranslation('statDaysGenesis')}</h6>
                        <p class="stat-value">${d3.format(",")(stats.daysSinceGenesis)}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-sm-6">
                <div class="glass-panel stat-card">
                    <div class="stat-icon"><i class="bi bi-currency-bitcoin"></i></div>
                    <div class="stat-content">
                        <h6 class="stat-title text-muted" data-i18n-key="statCurrentPrice">${getTranslation('statCurrentPrice')}</h6>
                        <p class="stat-value">
                            ${d3.format("$,.2f")(stats.currentPrice)}
                            ${stats.isLive ? '<span class="live-dot" title="Live Data"></span>' : ''}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}
