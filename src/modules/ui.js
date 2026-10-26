import * as d3 from 'd3';
import { state } from './state.js';
import { filterMarkers, highlightMarker, focusOnDate } from './chart.js';
import { injectGlossary, trackEvent } from './utils.js';
import { getTranslation, translations } from './i18n.js';
import { renderIcons } from './icons.js';

let eventModal, glossaryModal;
let eventModalTitle, eventModalBody, eventModalLinks, glossaryModalBody;

export function initUI() {
    renderIcons();

    eventModal = document.getElementById('eventModal');
    eventModalTitle = document.getElementById('eventModalLabel');
    eventModalBody = document.getElementById('eventModalBody');
    eventModalLinks = document.getElementById('eventModalLinks');

    glossaryModal = document.getElementById('glossaryModal');
    glossaryModalBody = document.getElementById('glossaryModalBody');

    // Close buttons logic
    document.querySelectorAll('[data-modal-close]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('[id$="Modal"]');
            if (modal) hideModal(modal);
        });
    });

    // Close on backdrop click
    [eventModal, glossaryModal].forEach((modal) => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                // Cerramos si el usuario hace clic en el contenedor principal que cubre la pantalla
                if (e.target === modal) {
                    hideModal(modal);
                }
            });
        }
    });

    // Auto-rotate "Did You Know" (solo visible, sin hover y con movimiento reducido)
    const didYouKnow = document.getElementById('did-you-know');
    if (didYouKnow) {
        let isVisible = false;
        let isHovered = false;

        const observer = new IntersectionObserver(
            (entries) => {
                isVisible = entries[0].isIntersecting;
            },
            { threshold: 0.4 }
        );
        observer.observe(didYouKnow);

        didYouKnow.addEventListener('mouseenter', () => {
            isHovered = true;
        });
        didYouKnow.addEventListener('mouseleave', () => {
            isHovered = false;
        });

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduceMotion) {
            setInterval(() => {
                if (isVisible && !isHovered && !document.hidden) {
                    nextDidYouKnow(translations);
                }
            }, 10000);
        }
    }

    document.getElementById('view-glossary-link').addEventListener('click', (e) => {
        e.preventDefault();
        showGlossaryModal();
    });

    // Glossary Tooltip Handling
    const tooltip = d3.select('body').append('div').attr('class', 'tooltip glossary-tooltip').style('opacity', 0);

    document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('glossary-term')) {
            const termKey = e.target.getAttribute('data-term');
            const glossary = getTranslation('glossary');
            const definition = glossary[termKey];

            if (definition) {
                tooltip.transition().duration(200).style('opacity', 1);
                tooltip
                    .html(`<strong>${termKey}</strong><br>${definition}`)
                    .style('left', e.pageX + 10 + 'px')
                    .style('top', e.pageY - 28 + 'px');
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (e.target.classList.contains('glossary-term')) {
            tooltip.style('left', e.pageX + 10 + 'px').style('top', e.pageY - 28 + 'px');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('glossary-term')) {
            tooltip.transition().duration(200).style('opacity', 0);
        }
    });
}

function showModal(modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function stripEmojis(text) {
    return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

let priceSeries = [];

/**
 * Serie de precios para calcular el impacto real de cada evento.
 * Se llama una vez tras cargar los datos.
 */
export function setPriceSeries(priceData) {
    if (!priceData || !Array.isArray(priceData.prices)) return;

    priceSeries = priceData.prices
        .map(([timestamp, price]) => ({ date: new Date(timestamp), price }))
        .filter((d) => Number.isFinite(d.price) && d.price > 0)
        .sort((a, b) => a.date - b.date);
}

function priceAt(date) {
    if (!priceSeries.length) return null;

    const index = d3.bisector((d) => d.date).center(priceSeries, date);
    const point = priceSeries[index];
    return point ? point.price : null;
}

function computeImpact(eventDate) {
    const basePrice = priceAt(eventDate);
    const lastDate = priceSeries.length ? priceSeries[priceSeries.length - 1].date : null;
    if (!basePrice || !lastDate) return null;

    const windows = [30, 90, 365].map((days) => {
        const target = new Date(eventDate.getTime() + days * 86400000);
        if (target > lastDate) return { days, pct: null, price: null };

        const price = priceAt(target);
        return { days, price, pct: price ? (price / basePrice - 1) * 100 : null };
    });

    const from = new Date(eventDate.getTime() - 30 * 86400000);
    const to = new Date(Math.min(eventDate.getTime() + 365 * 86400000, lastDate.getTime()));

    return { windows, sparkline: buildSparkline(from, to, eventDate) };
}

function buildSparkline(from, to, eventDate) {
    const points = priceSeries.filter((d) => d.date >= from && d.date <= to);
    if (points.length < 2) return '';

    const width = 240;
    const height = 44;
    const padding = 3;
    const x = d3.scaleTime().domain([from, to]).range([0, width]);
    const y = d3
        .scaleLog()
        .domain(d3.extent(points, (d) => d.price))
        .range([height - padding, padding]);
    const path = d3
        .line()
        .x((d) => x(d.date))
        .y((d) => y(d.price))(points);
    const markerX = Math.max(0, Math.min(width, x(eventDate)));

    return `
        <svg viewBox="0 0 ${width} ${height}" class="mt-5 h-9 w-full" preserveAspectRatio="none" aria-hidden="true">
            <line x1="${markerX}" y1="0" x2="${markerX}" y2="${height}" stroke="currentColor" stroke-width="1"
                stroke-dasharray="2 3" class="text-border"></line>
            <path d="${path}" fill="none" stroke="#f7931a" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>
        </svg>
    `;
}

function renderImpact(event) {
    const eventDate = event._date || asDate(event.date);
    const impact = computeImpact(eventDate);
    if (!impact) return '';

    const cells = impact.windows
        .map(({ days, pct }) => {
            const hasValue = pct !== null;
            const color = hasValue ? (pct >= 0 ? 'text-green-500' : 'text-red-400') : 'text-muted-foreground/40';
            const value = hasValue ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—';

            return `
            <div>
                <span class="block text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/60">+${days} d</span>
                <span class="font-mono text-xl font-bold ${color}">${value}</span>
            </div>
        `;
        })
        .join('');

    return `
        <div class="mt-2 border-t border-border pt-6">
            <p class="editorial-label text-bitcoin-orange mb-4">${getTranslation('eventImpactTitle')}</p>
            <div class="grid grid-cols-3 gap-4">${cells}</div>
            ${impact.sparkline}
            <p class="mt-4 text-xs leading-relaxed text-muted-foreground/70">${getTranslation('impactDisclaimer')}</p>
        </div>
    `;
}

export function showEventModal(d) {
    if (!eventModal) initUI();

    eventModalTitle.textContent = stripEmojis(d['title_' + state.lang]);

    const glossary = getTranslation('glossary');
    const fullDescription = d['description_full_' + state.lang];
    const processedDescription = injectGlossary(fullDescription, glossary);

    const descriptionHTML = processedDescription
        .split('\n\n')
        .map(
            (p) =>
                `<p class="mb-6 font-serif text-base sm:text-lg leading-relaxed text-foreground/90">${p.replace(/\n/g, '<br>')}</p>`
        )
        .join('');
    eventModalBody.innerHTML = descriptionHTML + renderImpact(d);

    eventModalLinks.innerHTML = '';
    if (d.links && d.links.length > 0) {
        d.links.forEach((link) => {
            const linkEl = document.createElement('a');
            linkEl.href = link.url;
            linkEl.textContent = link['text_' + state.lang];
            linkEl.className =
                'px-3 py-1 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors inline-flex items-center gap-2';
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';
            linkEl.innerHTML += '<i data-lucide="external-link" class="w-3 h-3"></i>';
            eventModalLinks.appendChild(linkEl);
        });
        renderIcons();
    }
    showModal(eventModal);
}

export function showGlossaryModal() {
    if (!glossaryModal) initUI();

    const glossary = getTranslation('glossary');
    const terms = Object.keys(glossary).sort();

    let html = '<div class="space-y-8">';
    terms.forEach((term) => {
        html += `
            <div class="glossary-item pb-6 border-b border-border last:border-0">
                <h3 class="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-bitcoin-orange mb-3">${term}</h3>
                <p class="font-serif text-lg leading-relaxed text-muted-foreground">${glossary[term]}</p>
            </div>
        `;
    });
    html += '</div>';

    glossaryModalBody.innerHTML = html;
    showModal(glossaryModal);
}

// Icono, color y clave i18n por categoría
const CATEGORY_META = {
    Technology: { icon: 'cpu', iconClass: 'icon-technology', labelKey: 'filterTech' },
    Adoption: { icon: 'users', iconClass: 'icon-adoption', labelKey: 'filterAdoption' },
    Market: { icon: 'trending-up', iconClass: 'icon-market', labelKey: 'filterMarket' },
    Regulation: { icon: 'landmark', iconClass: 'icon-regulation', labelKey: 'filterRegulation' },
    Security: { icon: 'shield', iconClass: 'icon-security', labelKey: 'filterSecurity' },
    Halving: { icon: 'droplet', iconClass: 'icon-halving', labelKey: 'filterHalving' },
};

const asDate = (value) => (value instanceof Date ? value : new Date(value));

const formatTimelineDate = (date) => d3.utcFormat(state.lang === 'es' ? '%d %b' : '%b %d')(date);

const eventTitle = (event) => stripEmojis(event['title_' + state.lang] || '');

const categoryLabel = (event) => {
    const meta = CATEGORY_META[event.category];
    return (meta && getTranslation(meta.labelKey)) || event.category || '';
};

export function renderTimeline(eventsData, onEventClick) {
    const timelineContainer = document.getElementById('events-timeline');
    if (!timelineContainer) return;

    timelineContainer.innerHTML = '';

    const events = eventsData
        .map((event) => ({ ...event, _date: asDate(event.date) }))
        .sort((a, b) => a._date - b._date);

    // Un capítulo por año: la lista se lee como un archivo, no como una pared de filas.
    const byYear = d3.group(events, (event) => event._date.getFullYear());

    byYear.forEach((yearEvents, year) => {
        const section = document.createElement('section');
        section.className = 'timeline-year';
        section.dataset.year = year;

        const header = document.createElement('div');
        header.className = 'timeline-year-label';
        header.innerHTML = `
            <span class="timeline-year-number">${year}</span>
            <span class="timeline-year-count">${yearEvents.length}</span>
        `;
        section.appendChild(header);

        const list = document.createElement('div');
        list.className = 'timeline-year-items';

        yearEvents.forEach((event) => {
            const meta = CATEGORY_META[event.category] || {};

            const item = document.createElement('a');
            item.href = '#chart-container';
            item.className = 'timeline-item group';
            item.dataset.category = event.category || '';
            item.__event = event;
            item.innerHTML = `
                <i data-lucide="${meta.icon || 'info'}" class="category-icon ${meta.iconClass || ''}"></i>
                <span class="timeline-text">
                    <span class="timeline-title">${eventTitle(event)}</span>
                    <span class="timeline-category">${categoryLabel(event)}</span>
                </span>
                <time class="timeline-date" datetime="${event._date.toISOString().slice(0, 10)}">${formatTimelineDate(event._date)}</time>
            `;

            item.addEventListener('mouseenter', () => highlightMarker(event._date, true));
            item.addEventListener('mouseleave', () => highlightMarker(event._date, false));
            item.addEventListener('click', (e) => {
                e.preventDefault();
                if (onEventClick) onEventClick(event);
            });

            list.appendChild(item);
        });

        section.appendChild(list);
        timelineContainer.appendChild(section);
    });

    renderIcons();
}

/**
 * Muestra u oculta eventos y elimina del DOM los años que se quedan vacíos.
 */
export function filterTimeline(category) {
    document.querySelectorAll('#events-timeline .timeline-year').forEach((section) => {
        let visible = 0;

        section.querySelectorAll('.timeline-item').forEach((item) => {
            const show = category === 'all' || item.dataset.category === category;
            item.hidden = !show;
            if (show) visible++;
        });

        section.hidden = visible === 0;
        const countEl = section.querySelector('.timeline-year-count');
        if (countEl) countEl.textContent = visible;
    });
}

export function updateTimelineLanguage() {
    document.querySelectorAll('#events-timeline .timeline-item').forEach((item) => {
        const event = item.__event;
        if (!event) return;

        item.querySelector('.timeline-title').textContent = eventTitle(event);
        item.querySelector('.timeline-category').textContent = categoryLabel(event);

        const dateEl = item.querySelector('.timeline-date');
        dateEl.textContent = formatTimelineDate(event._date);
        dateEl.setAttribute('datetime', event._date.toISOString().slice(0, 10));
    });
}

export function setupFilters(categories, translations, onFilterChange) {
    const filterContainer = d3.select('#event-filters');
    filterContainer.html(''); // Clear

    // Mapeo de colores por categoría
    const categoryColors = {
        Technology: '#5db0c6',
        Adoption: '#7fb069',
        Market: '#8b5cf6',
        Regulation: '#d66874',
        Security: '#5e81ac',
        Halving: '#f7931a',
        all: '#6b6565',
    };

    filterContainer
        .selectAll('button')
        .data(categories)
        .enter()
        .append('button')
        .attr('type', 'button')
        .attr(
            'class',
            'px-3 py-1 text-[9px] font-mono uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground border border-border/30 hover:border-bitcoin-orange/50 transition-colors flex items-center gap-2 flex-shrink-0'
        )
        .attr('id', (d) => `filter-${d.id}`)
        .html((d) => {
            const color = categoryColors[d.id] || categoryColors['all'];
            const label = d.i18nKey ? `<span data-i18n-key="${d.i18nKey}"></span>` : d.id;
            return `
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
                ${label}
            `;
        })
        .on('click', (event, d) => {
            state.activeFilter = d.id;
            trackEvent('filter_events', { category: d.id });
            filterContainer
                .selectAll('button')
                .attr(
                    'class',
                    'px-3 py-1 text-[9px] font-mono uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground border border-border/30 hover:border-bitcoin-orange/50 transition-colors flex items-center gap-2 flex-shrink-0'
                );

            d3.select(`#filter-${d.id}`).attr(
                'class',
                'px-3 py-1 text-[9px] font-mono uppercase tracking-[0.15em] opacity-100 border border-bitcoin-orange bg-bitcoin-orange/5 transition-all flex items-center gap-2 flex-shrink-0'
            );

            // Filter Chart
            filterMarkers(d.id);

            // Filter Timeline
            filterTimeline(d.id);

            if (onFilterChange) onFilterChange(d.id);
        });

    // Set active
    d3.select(`#filter-${state.activeFilter}`).attr(
        'class',
        'px-3 py-1 text-[9px] font-mono uppercase tracking-[0.15em] opacity-100 border border-bitcoin-orange bg-bitcoin-orange/5 transition-all flex items-center gap-2 flex-shrink-0'
    );
}

// ... existing imports ...

export function renderEducationalContent(translations) {
    const t = translations[state.lang];
    if (!t) return;

    // 1. Did You Know
    if (t.didYouKnow && t.didYouKnow.length > 0) {
        const fact = t.didYouKnow[state.currentFactIndex % t.didYouKnow.length];
        const container = document.getElementById('did-you-know');
        const titleEl = document.getElementById('did-you-know-title');
        const textEl = document.getElementById('did-you-know-text');
        const contentEl = document.getElementById('did-you-know-content');

        if (container && titleEl && textEl) {
            titleEl.textContent = t.didYouKnowTitle + ' ';
            textEl.textContent = fact.text;
            container.style.display = 'flex';

            // Click interaction
            contentEl.onclick = () => {
                if (fact.date) {
                    focusOnDate(fact.date);
                }
            };

            // Tooltip or cursor style if date exists
            contentEl.style.cursor = fact.date ? 'pointer' : 'default';
            if (fact.date) {
                contentEl.title = state.lang === 'es' ? 'Haz clic para ver en el gráfico' : 'Click to see on chart';
            } else {
                contentEl.title = '';
            }
        }
    }

    // 2. Quote
    if (t.quotes && t.quotes.length > 0) {
        const randomQuote = t.quotes[Math.floor(Math.random() * t.quotes.length)];
        const quoteEl = document.getElementById('footer-quote');

        if (quoteEl) {
            quoteEl.innerHTML = `&ldquo;${randomQuote.text}&rdquo; <br> <small>&mdash; ${randomQuote.author}</small>`;
        }
    }
}

export function nextDidYouKnow(translations) {
    state.currentFactIndex++;
    renderEducationalContent(translations);
}

export function renderMarketCycleLegend(translations) {
    const legendEl = document.getElementById('chart-legend');
    if (!legendEl) return;

    // Recordamos si el gráfico dibujó la línea de datos ficticios
    if (legendEl.dataset.hasFictitious === undefined) {
        legendEl.dataset.hasFictitious = legendEl.style.display === 'none' ? 'false' : 'true';
    }
    if (legendEl.firstElementChild) {
        legendEl.firstElementChild.hidden = legendEl.dataset.hasFictitious === 'false';
    }

    const childrenToRemove = Array.from(legendEl.children).slice(1);
    childrenToRemove.forEach((child) => legendEl.removeChild(child));

    const bullLegendItem = document.createElement('div');
    bullLegendItem.className = 'flex items-center gap-2';
    bullLegendItem.innerHTML = `
        <div class="w-4 h-4 bg-[#28a745]/10 border border-[#28a745]/20"></div>
        <span class="editorial-label text-[11px] !tracking-widest !normal-case" data-i18n-key="legendBullMarket">${translations[state.lang].legendBullMarket}</span>
    `;
    legendEl.appendChild(bullLegendItem);

    const bearLegendItem = document.createElement('div');
    bearLegendItem.className = 'flex items-center gap-2';
    bearLegendItem.innerHTML = `
        <div class="w-4 h-4 bg-[#dc3545]/10 border border-[#dc3545]/20"></div>
        <span class="editorial-label text-[11px] !tracking-widest !normal-case" data-i18n-key="legendBearMarket">${translations[state.lang].legendBearMarket}</span>
    `;
    legendEl.appendChild(bearLegendItem);

    legendEl.style.display = 'flex';
}

/**
 * Sincroniza el botón de escala (icono + etiqueta) con el estado actual.
 */
export function renderScaleButton() {
    const button = document.getElementById('scale-toggle');
    if (!button) return;

    const isLog = state.scale === 'log';
    const label = getTranslation(isLog ? 'scaleLog' : 'scaleLinear');

    button.innerHTML = `<i data-lucide="${isLog ? 'maximize-2' : 'trending-up'}" class="w-3 h-3"></i><span>${label}</span>`;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(isLog));

    renderIcons();
}
