import { state } from './state.js';
import * as d3 from 'd3';

let translations = {};

export const setTranslations = (data) => {
    translations = data;
    // Inject stats translations if missing
    ['es', 'en'].forEach(lang => {
        if (!translations[lang].statATH) translations[lang].statATH = lang === 'es' ? 'Máximo Histórico (ATH)' : 'All Time High (ATH)';
        if (!translations[lang].statCurrentPrice) translations[lang].statCurrentPrice = lang === 'es' ? 'Precio Reciente' : 'Latest Price';
        if (!translations[lang].statDaysGenesis) translations[lang].statDaysGenesis = lang === 'es' ? 'Días desde Genesis' : 'Days since Genesis';
    });
};

export const getTranslation = (key) => {
    return translations[state.lang] ? translations[state.lang][key] : key;
};

export const setLanguage = (lang, callbacks = {}) => {
    state.lang = lang;
    localStorage.setItem('bitcoinHistoryLang', lang);

    // Actualizar botones de idioma
    d3.select('#lang-es').classed('active', lang === 'es');
    d3.select('#lang-en').classed('active', lang === 'en');

    // --- MEJORAS SEO ---
    if (translations[lang]) {
        const pageTitle = translations[lang].pageTitle;
        const metaDescription = translations[lang].metaDescription;

        // 1. Actualizar el título del documento y el idioma
        document.title = pageTitle;
        document.documentElement.lang = lang;

        // 2. Actualizar meta tags para SEO y redes sociales
        document.getElementById('meta-description')?.setAttribute('content', metaDescription);
        document.getElementById('og-title')?.setAttribute('content', pageTitle);
        document.getElementById('og-description')?.setAttribute('content', metaDescription);
        document.getElementById('twitter-title')?.setAttribute('content', pageTitle);
        document.getElementById('twitter-description')?.setAttribute('content', metaDescription);

        // 3. Actualizar datos estructurados (JSON-LD) para Google
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": pageTitle,
            "description": metaDescription,
            "inLanguage": lang,
            "url": document.querySelector('link[rel="canonical"]')?.href,
            "publisher": {
                "@type": "Person",
                "name": "Mikel Aramendia",
                "url": "https://mendiak.github.io/portfolio/"
            },
            "mainEntity": {
                "@type": "Dataset",
                "name": "Bitcoin Price History (2009-Present)",
                "description": "Historical daily price of Bitcoin (BTC) in USD, combined with key historical events that influenced its value.",
            }
        };
        const sdElement = document.getElementById('structured-data');
        if (sdElement) sdElement.textContent = JSON.stringify(structuredData, null, 2);
    
        // Traducir todos los elementos de la UI
        document.querySelectorAll('[data-i18n-key]').forEach(el => {
            const key = el.getAttribute('data-i18n-key');
            if (translations[lang][key]) {
                el.innerHTML = translations[lang][key];
            }
        });

        // Traducir títulos de botones y ARIA labels
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (translations[lang][key]) {
                el.setAttribute('title', translations[lang][key]);
                el.setAttribute('aria-label', translations[lang][key]);
            }
        });

        // Actualizar ARIA labels específicos si existen traducciones
        const langEsBtn = document.getElementById('lang-es');
        const langEnBtn = document.getElementById('lang-en');
        if (langEsBtn) langEsBtn.setAttribute('aria-label', lang === 'es' ? 'Idioma actual: Español' : 'Cambiar idioma a Español');
        if (langEnBtn) langEnBtn.setAttribute('aria-label', lang === 'en' ? 'Current language: English' : 'Change language to English');
        
        // Actualizar texto del botón de escala y su ARIA label
        const scaleBtn = d3.select("#scale-toggle");
        if (state.scale === 'log') {
            scaleBtn.html(`<i class="bi bi-graph-up"></i> ${translations[lang].scaleLog}`);
            scaleBtn.attr('aria-label', translations[lang].scaleLog);
        } else {
            scaleBtn.html(`<i class="bi bi-graph-up-arrow"></i> ${translations[lang].scaleLinear}`);
            scaleBtn.attr('aria-label', translations[lang].scaleLinear);
        }

        // Ejecutar callbacks adicionales (para actualizar gráfico, etc)
        if (callbacks.onLanguageChange) {
            callbacks.onLanguageChange(lang);
        }
    }
};
