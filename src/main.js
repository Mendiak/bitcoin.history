import './index.css';

import * as d3 from 'd3';

import { state } from './modules/state.js';
import { loadData, fetchLivePrice } from './modules/data.js';
import { setTranslations, setLanguage, getTranslation, setDatasetMeta } from './modules/i18n.js';
import { initTheme, setTheme, setStoredTheme, trackEvent } from './modules/utils.js';
import { initChart, updateChart, resetZoom } from './modules/chart.js';
import {
    initUI,
    showEventModal,
    renderTimeline,
    setupFilters,
    renderMarketCycleLegend,
    updateTimelineLanguage,
    renderEducationalContent,
    nextDidYouKnow,
    renderScaleButton,
    setPriceSeries,
} from './modules/ui.js';
import { calculateStats, renderStats } from './modules/stats.js';
import { renderIcons } from './modules/icons.js';
import { applyDateLocale } from './modules/dateLocale.js';

document.addEventListener('DOMContentLoaded', function () {
    renderIcons();

    // UI Elements
    const chartContainer = document.getElementById('chart-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingPhrase = document.getElementById('loading-phrase');
    const themeToggleButton = document.getElementById('theme-toggle');

    // Loading Phrases from Translations
    fetch('translations.json')
        .then((response) => response.json())
        .then((translations) => {
            window.translationsData = translations; // Expose globally for modules that might still need it
            const phrases = translations[state.lang].loadingPhrases;
            if (loadingPhrase && phrases) {
                loadingPhrase.textContent = phrases[Math.floor(Math.random() * phrases.length)];
            }
        })
        .catch(() => {
            if (loadingPhrase) {
                loadingPhrase.textContent = state.lang === 'es' ? 'Cargando datos...' : 'Loading data...';
            }
        });

    if (themeToggleButton) {
        themeToggleButton.setAttribute('title', 'Cambiar Tema');
        themeToggleButton.setAttribute('aria-label', 'Cambiar Tema');
    }

    // Init Theme
    initTheme();

    // Reserva la altura final del gráfico antes de cargar datos (evita CLS)
    const reserveChartHeight = () => {
        const container = document.getElementById('chart-container');
        if (!container) return;

        const isMobile = window.innerWidth < 768;
        const viewBoxWidth = isMobile ? 400 : 960;
        const viewBoxHeight = 500;
        const padding = 64; // glass-panel p-8 (arriba + abajo)
        const innerWidth = container.clientWidth - padding;
        const height = Math.max(420, (innerWidth * viewBoxHeight) / viewBoxWidth + padding);
        container.style.minHeight = `${Math.round(height)}px`;
    };
    reserveChartHeight();
    window.addEventListener('resize', reserveChartHeight);

    const updateThemeButtonIcon = (theme) => {
        const iconName = theme === 'dark' ? 'sun' : 'moon';
        themeToggleButton.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4"></i>`;
        renderIcons();
    };
    updateThemeButtonIcon(document.documentElement.getAttribute('data-bs-theme'));

    // Loading
    loadData()
        .then(([priceData, eventsData, marketCyclesData, translations]) => {
            window.translationsData = translations;
            setTranslations(translations);
            initUI(); // Setup modal etc

            // Idioma antes de dibujar: ejes y fechas deben formatearse en el idioma correcto
            const preferredLang =
                localStorage.getItem('bitcoinHistoryLang') || (navigator.language.startsWith('es') ? 'es' : 'en');
            applyDateLocale(preferredLang);

            // Serie de precios para calcular el impacto real de cada evento
            setPriceSeries(priceData);

            // Fecha de corte de los datos (rigor: el usuario debe saber hasta cuándo llega la serie)
            const lastPricePoint =
                priceData.prices && priceData.prices.length ? priceData.prices[priceData.prices.length - 1] : null;
            const lastPriceDate = lastPricePoint ? new Date(lastPricePoint[0]) : null;

            // Rango real de la serie para el JSON-LD (temporalCoverage)
            if (priceData.prices && priceData.prices.length) {
                setDatasetMeta({
                    start: new Date(priceData.prices[0][0]).toISOString().slice(0, 10),
                    end: new Date(priceData.prices[priceData.prices.length - 1][0]).toISOString().slice(0, 10),
                });
            }

            const updateDataCutoff = () => {
                const cutoffEl = document.getElementById('data-cutoff');
                if (!cutoffEl) return;

                if (!lastPriceDate) {
                    cutoffEl.textContent = '';
                    return;
                }

                const formatted = d3.utcFormat(state.lang === 'es' ? '%d %b %Y' : '%b %d, %Y')(lastPriceDate);
                cutoffEl.textContent = `${getTranslation('dataAsOf')} ${formatted} · Kaggle / Bitcoinity / Coinbase`;
            };
            updateDataCutoff();

            // Hide Spinner
            loadingSpinner.style.display = 'none';
            chartContainer.style.display = 'block';

            // Event Click Handler
            const onEventClick = (d) => {
                trackEvent('open_event', {
                    event_category: d.category,
                    event_title: d['title_' + state.lang],
                });
                showEventModal(d);
            };

            // Stats
            let latestStats = null;
            fetchLivePrice().then((livePrice) => {
                latestStats = calculateStats(priceData, livePrice);
                renderStats(latestStats, 'stats-dashboard');
            });

            // Init Chart
            initChart('#chart-container', priceData, eventsData, marketCyclesData, onEventClick);

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
                { id: 'Halving', i18nKey: 'filterHalving' },
            ];
            setupFilters(categories, translations);

            // Legends & Educational Content
            renderMarketCycleLegend(translations);
            renderEducationalContent(translations);

            d3.select('#next-did-you-know').on('click', () => nextDidYouKnow(translations));

            // Language Logic
            const onLanguageChange = (lang) => {
                updateChart(); // Redraw chart (axis formats etc)
                updateTimelineLanguage();
                renderScaleButton(); // Icono + etiqueta del botón de escala
                updateDataCutoff(); // Fecha de corte en el idioma activo
                if (latestStats) renderStats(latestStats, 'stats-dashboard'); // Fechas/labels de stats
                renderMarketCycleLegend(translations);
                renderEducationalContent(translations); // Update educational content
                trackEvent('switch_language', { language: lang });
            };

            setLanguage(preferredLang, { onLanguageChange });

            // Event Listeners
            // Initialize button text for linear default
            renderScaleButton();

            d3.select('#scale-toggle').on('click', () => {
                state.scale = state.scale === 'log' ? 'linear' : 'log';
                renderScaleButton();
                updateChart();
                trackEvent('toggle_scale', { scale: state.scale });
            });

            d3.select('#reset-zoom').on('click', resetZoom);

            d3.select('#lang-es').on('click', () => setLanguage('es', { onLanguageChange }));
            d3.select('#lang-en').on('click', () => setLanguage('en', { onLanguageChange }));

            themeToggleButton.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-bs-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                setTheme(newTheme);
                setStoredTheme(newTheme);
                updateThemeButtonIcon(newTheme);
                trackEvent('toggle_theme', { theme: newTheme });
            });
        })
        .catch((error) => {
            console.error('Error loading data:', error);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (chartContainer) {
                chartContainer.innerHTML = `
                <div class="text-center py-16">
                    <p class="editorial-label text-bitcoin-orange mb-4">Error</p>
                    <p class="font-serif italic text-muted-foreground">No se pudieron cargar los datos del gráfico. ${error.message}</p>
                </div>`;
            }
        });
});
