import { state } from './state.js';
import * as d3 from 'd3';
import { applyDateLocale } from './dateLocale.js';

export let translations = {};

export const setTranslations = (data) => {
    translations = data;
    // Inject stats translations if missing
    ['es', 'en'].forEach((lang) => {
        if (translations[lang]) {
            if (!translations[lang].statATH)
                translations[lang].statATH = lang === 'es' ? 'Máximo Histórico (ATH)' : 'All Time High (ATH)';
            if (!translations[lang].statCurrentPrice)
                translations[lang].statCurrentPrice = lang === 'es' ? 'Precio Reciente' : 'Latest Price';
            if (!translations[lang].statDaysGenesis)
                translations[lang].statDaysGenesis = lang === 'es' ? 'Días desde Genesis' : 'Days since Genesis';
        }
    });
};

export const getTranslation = (key) => {
    return translations[state.lang] ? translations[state.lang][key] : key;
};

const SITE_URL = 'https://bitcoin-history.vercel.app/';
const AUTHOR = {
    '@type': 'Person',
    name: 'Mikel Aramendia',
    url: 'https://mendiak.github.io/portfolio/',
};

/** Rango real de la serie, para declarar temporalCoverage con datos veraces. */
export let datasetMeta = { start: '2010-07-17', end: null };

export const setDatasetMeta = ({ start, end }) => {
    datasetMeta = { start: start || datasetMeta.start, end: end || datasetMeta.end };
};

function buildStructuredData(lang, seoTitle, metaDescription) {
    const base = SITE_URL;
    const end = datasetMeta.end || new Date().toISOString().slice(0, 10);
    const datasetName =
        lang === 'es'
            ? `Precio histórico de Bitcoin (${datasetMeta.start.slice(0, 4)}–${end.slice(0, 4)})`
            : `Bitcoin Price History (${datasetMeta.start.slice(0, 4)}–${end.slice(0, 4)})`;
    const datasetDescription =
        lang === 'es'
            ? 'Serie diaria del precio de Bitcoin en dólares estadounidenses, acompañada de 56 eventos históricos documentados y con fuentes.'
            : 'Daily Bitcoin price series in US dollars, paired with 56 documented and sourced historical events.';

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${base}#website`,
                url: base,
                name: 'Bitcoin History',
                description: metaDescription,
                inLanguage: [lang],
                publisher: AUTHOR,
            },
            {
                '@type': 'WebPage',
                '@id': `${base}#webpage`,
                url: base,
                name: seoTitle,
                description: metaDescription,
                isPartOf: { '@id': `${base}#website` },
                inLanguage: lang,
                dateModified: end,
                author: AUTHOR,
                primaryImageOfPage: {
                    '@type': 'ImageObject',
                    url: `${base}assets/images/screenshot.png`,
                },
                mainEntity: { '@id': `${base}#dataset` },
            },
            {
                '@type': 'Dataset',
                '@id': `${base}#dataset`,
                name: datasetName,
                description: datasetDescription,
                url: `${base}bitcoin-price-history.json`,
                creator: AUTHOR,
                license: 'https://github.com/Mendiak/bitcoin.history/blob/main/LICENSE',
                isAccessibleForFree: true,
                temporalCoverage: `${datasetMeta.start}/${end}`,
                spatialCoverage: 'Global',
                variableMeasured: 'BTC/USD daily close price',
                distribution: [
                    {
                        '@type': 'DataDownload',
                        encodingFormat: 'application/json',
                        contentUrl: `${base}bitcoin-price-history.json`,
                    },
                ],
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Bitcoin History', item: base }],
            },
        ],
    };
}

export const setLanguage = (lang, callbacks = {}) => {
    state.lang = lang;
    localStorage.setItem('bitcoinHistoryLang', lang);
    applyDateLocale(lang);

    // Actualizar botones de idioma
    d3.select('#lang-es').classed('active', lang === 'es');
    d3.select('#lang-en').classed('active', lang === 'en');

    // --- MEJORAS SEO ---
    if (translations[lang]) {
        const isHalvingPage = document.body.dataset.page === 'halving';
        const pageTitle = translations[lang].pageTitle;
        const seoTitle = isHalvingPage
            ? lang === 'es'
                ? 'Halving de Bitcoin: qué es y cuándo ocurre | Bitcoin History'
                : 'Bitcoin Halving: What It Is and When It Happens | Bitcoin History'
            : translations[lang].seoTitle || pageTitle;
        const metaDescription = translations[lang].metaDescription;

        // 1. Actualizar el título del documento y el idioma
        document.title = seoTitle;
        document.documentElement.lang = lang;

        // 2. Actualizar meta tags para SEO y redes sociales
        document.getElementById('meta-description')?.setAttribute('content', metaDescription);
        document.getElementById('og-title')?.setAttribute('content', seoTitle);
        document.getElementById('og-description')?.setAttribute('content', metaDescription);
        document.getElementById('og-locale')?.setAttribute('content', lang === 'es' ? 'es_ES' : 'en_US');
        document.getElementById('og-locale-alt')?.setAttribute('content', lang === 'es' ? 'en_US' : 'es_ES');
        document.getElementById('twitter-title')?.setAttribute('content', seoTitle);
        document.getElementById('twitter-description')?.setAttribute('content', metaDescription);

        // 3. Actualizar datos estructurados (JSON-LD) para Google
        const structuredData = buildStructuredData(lang, seoTitle, metaDescription);
        const sdElement = document.getElementById('structured-data');
        if (sdElement) sdElement.textContent = JSON.stringify(structuredData, null, 2);

        // Traducir todos los elementos de la UI
        document.querySelectorAll('[data-i18n-key]').forEach((el) => {
            const key = el.getAttribute('data-i18n-key');
            if (translations[lang][key]) {
                el.innerHTML = translations[lang][key];
            }
        });

        // Traducir títulos de botones y ARIA labels
        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            if (translations[lang][key]) {
                el.setAttribute('title', translations[lang][key]);
                el.setAttribute('aria-label', translations[lang][key]);
            }
        });

        // Actualizar ARIA labels específicos si existen traducciones
        const langEsBtn = document.getElementById('lang-es');
        const langEnBtn = document.getElementById('lang-en');
        if (langEsBtn)
            langEsBtn.setAttribute('aria-label', lang === 'es' ? 'Idioma actual: Español' : 'Cambiar idioma a Español');
        if (langEnBtn)
            langEnBtn.setAttribute(
                'aria-label',
                lang === 'en' ? 'Current language: English' : 'Change language to English'
            );

        // Ejecutar callbacks adicionales (para actualizar gráfico, etc)
        if (callbacks.onLanguageChange) {
            callbacks.onLanguageChange(lang);
        }
    }
};
