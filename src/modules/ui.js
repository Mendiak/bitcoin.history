import * as d3 from 'd3';import { createIcons, icons, Sun, Moon, Droplet, X, ExternalLink, ChevronRight, FileText, Rocket, Users, Landmark, AlertTriangle, Shield, TrendingUp, Cpu, Gift, Zap, DollarSign, BookOpen, Layers, Search, Info, Award } from 'lucide';
import { state } from './state.js';
import { filterMarkers, highlightMarker, focusOnDate } from './chart.js';
import { injectGlossary } from './utils.js';
import { getTranslation, translations } from './i18n.js';

let eventModal, glossaryModal;
let eventModalTitle, eventModalBody, eventModalLinks, glossaryModalBody;

export function initUI() {
    createIcons({
        icons: {
            Sun,
            Moon,
            Droplet,
            X,
            ExternalLink,
            ChevronRight
        }
    });

    eventModal = document.getElementById('eventModal');
    eventModalTitle = document.getElementById('eventModalLabel');
    eventModalBody = document.getElementById('eventModalBody');
    eventModalLinks = document.getElementById('eventModalLinks');

    glossaryModal = document.getElementById('glossaryModal');
    glossaryModalBody = document.getElementById('glossaryModalBody');

    // Close buttons logic
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('[id$="Modal"]');
            if (modal) hideModal(modal);
        });
    });

    // Close on backdrop click
    [eventModal, glossaryModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                // Cerramos si el usuario hace clic en el contenedor principal que cubre la pantalla
                if (e.target === modal) {
                    hideModal(modal);
                }
            });
        }
    });

    // Auto-rotate "Did You Know"
    setInterval(() => {
        nextDidYouKnow(translations);
    }, 10000);

    document.getElementById('view-glossary-link').addEventListener('click', (e) => {
        e.preventDefault();
        showGlossaryModal();
    });

    // Glossary Tooltip Handling
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip glossary-tooltip")
        .style("opacity", 0);

    document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('glossary-term')) {
            const termKey = e.target.getAttribute('data-term');
            const glossary = getTranslation('glossary');
            const definition = glossary[termKey];
            
            if (definition) {
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip.html(`<strong>${termKey}</strong><br>${definition}`)
                    .style("left", (e.pageX + 10) + "px")
                    .style("top", (e.pageY - 28) + "px");
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (e.target.classList.contains('glossary-term')) {
            tooltip.style("left", (e.pageX + 10) + "px")
                .style("top", (e.pageY - 28) + "px");
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('glossary-term')) {
            tooltip.transition().duration(200).style("opacity", 0);
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

export function showEventModal(d) {
    if (!eventModal) initUI();
    
    eventModalTitle.textContent = stripEmojis(d['title_' + state.lang]);

    const glossary = getTranslation('glossary');
    const fullDescription = d['description_full_' + state.lang];
    const processedDescription = injectGlossary(fullDescription, glossary);

    const descriptionHTML = processedDescription
        .split('\n\n')
        .map(p => `<p class="mb-6 font-serif text-lg sm:text-xl leading-relaxed text-foreground/90">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    eventModalBody.innerHTML = descriptionHTML;

    eventModalLinks.innerHTML = '';
    if (d.links && d.links.length > 0) {
        d.links.forEach(link => {
            const linkEl = document.createElement('a');
            linkEl.href = link.url;
            linkEl.textContent = link['text_' + state.lang];
            linkEl.className = 'px-3 py-1 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors inline-flex items-center gap-2';
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';
            linkEl.innerHTML += '<i data-lucide="external-link" class="w-3 h-3"></i>';
            eventModalLinks.appendChild(linkEl);
        });
        createIcons({ icons: { ExternalLink } });
    }
    showModal(eventModal);
}

export function showGlossaryModal() {
    if (!glossaryModal) initUI();
    
    const glossary = getTranslation('glossary');
    const terms = Object.keys(glossary).sort();
    
    let html = '<div class="space-y-8">';
    terms.forEach(term => {
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

function getIconForTitle(title) {
    if (title.includes('Whitepaper')) return 'file-text';
    if (title.includes('Génesis') || title.includes('Rocket')) return 'rocket';
    if (title.includes('transacción')) return 'users';
    if (title.includes('USD')) return 'dollar-sign';
    if (title.includes('exchange')) return 'landmark';
    if (title.includes('Pizza')) return 'gift';
    if (title.includes('Slashdot')) return 'search';
    if (title.includes('bug')) return 'alert-triangle';
    if (title.includes('Satoshi')) return 'user';
    if (title.includes('Mt. Gox') || title.includes('hack')) return 'shield';
    if (title.includes('halving') || title.includes('Halving')) return 'droplet';
    if (title.includes('FinCEN') || title.includes('bancaria')) return 'landmark';
    if (title.includes('Silk Road')) return 'lock';
    if (title.includes('ATM')) return 'credit-card';
    if (title.includes('1,000') || title.includes('ATH') || title.includes('100,000') || title.includes('80,000')) return 'trending-up';
    if (title.includes('Ethereum')) return 'cpu';
    if (title.includes('HODL')) return 'shield-check';
    if (title.includes('Tesla')) return 'car';
    if (title.includes('Coinbase')) return 'trending-up';
    if (title.includes('China')) return 'power';
    if (title.includes('El Salvador')) return 'map-pin';
    if (title.includes('Taproot')) return 'layers';
    if (title.includes('Terra')) return 'zap';
    if (title.includes('Ordinals')) return 'book-open';
    if (title.includes('Lightning')) return 'zap';
    return 'info';
}

export function renderTimeline(eventsData, onEventClick) {
    const timelineContainer = d3.select("#events-timeline");
    timelineContainer.html('');

    const timelineItems = timelineContainer.selectAll(".timeline-item")
        .data(eventsData)
        .enter()
        .append("a")
        .attr("href", "#chart-container")
        .attr("class", "timeline-item flex items-center justify-between py-6 border-b border-border/10 hover:bg-muted/5 px-4 -mx-4 transition-all duration-300 group cursor-pointer")
        .attr("data-category", d => d.category)
        .on("mouseover", function(event, d) {
            highlightMarker(d.date, true);
        })
        .on("mouseout", function(event, d) {
            highlightMarker(d.date, false);
        })
        .on("click", (event, d) => {
            event.preventDefault();
            if (onEventClick) onEventClick(d);
        });

    timelineItems.append("div")
        .attr("class", "flex items-center gap-6")
        .html(d => {
            const title = d['title_' + state.lang].replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim();
            const icon = getIconForTitle(d['title_es']);
            return `
                <div class="w-8 h-8 flex items-center justify-center bg-muted/10 opacity-40 group-hover:opacity-100 group-hover:bg-bitcoin-orange/10 transition-all">
                    <i data-lucide="${icon}" class="w-4 h-4 text-foreground group-hover:text-bitcoin-orange"></i>
                </div>
                <div class="flex flex-col">
                    <span class="editorial-label text-[10px] opacity-40">${d.category}</span>
                    <span class="timeline-title text-lg font-heading font-bold tracking-tight group-hover:text-bitcoin-orange transition-colors">${title}</span>
                </div>
            `;
        });

    timelineItems.append("small")
        .attr("class", "text-xs text-muted-foreground font-mono")
        .text(d => d3.timeFormat("%d %b %Y")(d.date));

    createIcons({ icons });
}


export function updateTimelineLanguage() {
     d3.selectAll("#events-timeline .timeline-item").each(function(d) {
        d3.select(this).select(".timeline-title").text(d['title_' + state.lang]);
     });
}

export function setupFilters(categories, translations, onFilterChange) {
    const filterContainer = d3.select("#event-filters");
    filterContainer.html(''); // Clear

    filterContainer.selectAll("button")
        .data(categories)
        .enter()
        .append("button")
        .attr("type", "button")
        .attr("class", "px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 hover:opacity-100 border-b-2 border-transparent transition-all")
        .attr("id", d => `filter-${d.id}`)
        .html(d => `
            <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full ${d.id === 'all' ? 'bg-foreground/40' : 'filter-dot category-' + d.id.toLowerCase()}"></span>
                <span data-i18n-key="${d.i18nKey}"></span>
            </div>
        `)
        .on("click", (event, d) => {
            state.activeFilter = d.id;
            filterContainer.selectAll("button")
                .attr("class", "px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 hover:opacity-100 border-b-2 border-transparent transition-all");
            
            d3.select(`#filter-${d.id}`)
                .attr("class", "px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] opacity-100 border-b-2 border-bitcoin-orange transition-all");
            
            // Filter Chart
            filterMarkers(d.id);

            // Filter Timeline
             const timelineItems = d3.select("#events-timeline").selectAll(".timeline-item");
             timelineItems
                .filter(item => !(d.id === 'all' || item.category === d.id))
                .transition().duration(300).style("opacity", 0)
                .on("end", function() { d3.select(this).style("display", "none"); });

            timelineItems
                .filter(item => d.id === 'all' || item.category === d.id)
                .style("display", "flex")
                .transition().duration(300).style("opacity", 1);
            
            if (onFilterChange) onFilterChange(d.id);
        });
        
     // Set active
     d3.select(`#filter-${state.activeFilter}`)
        .attr("class", "px-3 py-1 text-sm font-medium border border-foreground bg-foreground text-background rounded-md flex items-center gap-2");
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
            titleEl.textContent = t.didYouKnowTitle + " ";
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
    // ... same logic as before ...
     const childrenToRemove = Array.from(legendEl.children).slice(1);
    childrenToRemove.forEach(child => legendEl.removeChild(child));

    const bullLegendItem = document.createElement('div');
    bullLegendItem.className = 'flex items-center gap-2';
    bullLegendItem.innerHTML = `
        <div class="w-4 h-4 bg-[#28a745]/10 border border-[#28a745]/20"></div>
        <span class="editorial-label text-[11px] !tracking-widest !normal-case opacity-60" data-i18n-key="legendBullMarket">${translations[state.lang].legendBullMarket}</span>
    `;
    legendEl.appendChild(bullLegendItem);

    const bearLegendItem = document.createElement('div');
    bearLegendItem.className = 'flex items-center gap-2';
    bearLegendItem.innerHTML = `
        <div class="w-4 h-4 bg-[#dc3545]/10 border border-[#dc3545]/20"></div>
        <span class="editorial-label text-[11px] !tracking-widest !normal-case opacity-60" data-i18n-key="legendBearMarket">${translations[state.lang].legendBearMarket}</span>
    `;
    legendEl.appendChild(bearLegendItem);
}
