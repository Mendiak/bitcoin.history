import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';

import * as d3 from 'd3';
import * as bootstrap from 'bootstrap';

import { state } from './modules/state.js';
import { loadData, fetchLivePrice } from './modules/data.js';
import { setTranslations, setLanguage, getTranslation } from './modules/i18n.js';
import { initTheme, setTheme } from './modules/utils.js';
import { initChart, updateChart,resetZoom } from './modules/chart.js';
import { initUI, showEventModal, renderTimeline, setupFilters, renderMarketCycleLegend, updateTimelineLanguage } from './modules/ui.js';
import { calculateStats, renderStats } from './modules/stats.js';

document.addEventListener('DOMContentLoaded', function() {
    
    // UI Elements
    const chartContainer = document.getElementById('chart-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const helpToggleEl = document.getElementById('help-toggle');
    const themeToggleButton = document.getElementById('theme-toggle');

    // Init Theme
    initTheme();
    const updateThemeButtonIcon = (theme) => {
        if (theme === 'dark') {
            themeToggleButton.innerHTML = '<i class="bi bi-sun-fill"></i>';
        } else {
            themeToggleButton.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
        }
    };
    updateThemeButtonIcon(document.documentElement.getAttribute('data-bs-theme'));

    // Loading
    loadData().then(([priceData, eventsData, marketCyclesData, translations]) => {
        
        setTranslations(translations);
        initUI(); // Setup modal etc

        // Helper for popover
        new bootstrap.Popover(helpToggleEl, {
            html: true,
            placement: 'bottom',
            title: () => getTranslation('chartExplanationTitle'),
            content: () => getTranslation('chartExplanation')
        });

        // Hide Spinner
        loadingSpinner.style.display = 'none';
        chartContainer.style.display = 'block';

        // Event Click Handler
        const onEventClick = (d) => {
            showEventModal(d);
        };

        // Stats
        fetchLivePrice().then(livePrice => {
            console.log("Live Price:", livePrice);
            const stats = calculateStats(priceData, livePrice);
            renderStats(stats, 'stats-dashboard');
        });

        // Init Chart
        initChart("#chart-container", priceData, eventsData, marketCyclesData, onEventClick);

        // Init Timeline
        renderTimeline(eventsData, onEventClick);

        // Filters
        const categories = [
            { id: 'all', i18nKey: 'filterAll' },
            { id: 'Technology', i18nKey: 'filterTech' },
            { id: 'Market', i18nKey: 'filterMarket' },
            { id: 'Adoption', i18nKey: 'filterAdoption' },
            { id: 'Regulation', i18nKey: 'filterRegulation' },
            { id: 'Security', i18nKey: 'filterSecurity' },
            { id: 'Halving', i18nKey: 'filterHalving' }
        ];
        setupFilters(categories, translations);

        // Legends
        renderMarketCycleLegend(translations);

        // Language Logic
        const onLanguageChange = (lang) => {
            updateChart(); // Redraw chart (axis formats etc)
            updateTimelineLanguage();
            renderMarketCycleLegend(translations); // Update Legend text
        };

        const preferredLang = localStorage.getItem('bitcoinHistoryLang') || (navigator.language.startsWith('es') ? 'es' : 'en');
        setLanguage(preferredLang, { onLanguageChange });

        // Event Listeners
        d3.select("#scale-toggle").on("click", () => {
             state.scale = state.scale === 'log' ? 'linear' : 'log';
             const key = state.scale === 'log' ? 'scaleLog' : 'scaleLinear';
             const icon = state.scale === 'log' ? 'bi-graph-up' : 'bi-graph-up-arrow';
             d3.select("#scale-toggle").html(`<i class="bi ${icon}"></i> ${getTranslation(key)}`);
             
             updateChart();
        });

        d3.select("#reset-zoom").on("click", resetZoom);
        
        d3.select("#lang-es").on("click", () => setLanguage('es', { onLanguageChange }));
        d3.select("#lang-en").on("click", () => setLanguage('en', { onLanguageChange }));

        themeToggleButton.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            setStoredTheme(newTheme);
            updateThemeButtonIcon(newTheme);
        });

    }).catch(error => {
        console.error("Error loading data:", error);
         if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (chartContainer) {
            chartContainer.innerHTML = `<p class="alert alert-danger" role="alert">No se pudieron cargar los datos del gráfico. ${error.message}</p>`;
        }
    });
});