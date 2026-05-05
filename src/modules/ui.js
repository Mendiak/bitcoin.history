import * as bootstrap from 'bootstrap';
import * as d3 from 'd3';
import { state } from './state.js';
import { filterMarkers, highlightMarker, focusOnDate } from './chart.js';
import { injectGlossary } from './utils.js';
import { getTranslation } from './i18n.js';

let eventModal, glossaryModal;
let eventModalTitle, eventModalBody, eventModalLinks, glossaryModalBody;

export function initUI() {
    const eventModalEl = document.getElementById('eventModal');
    eventModal = new bootstrap.Modal(eventModalEl);
    eventModalTitle = document.getElementById('eventModalLabel');
    eventModalBody = document.getElementById('eventModalBody');
    eventModalLinks = document.getElementById('eventModalLinks');

    const glossaryModalEl = document.getElementById('glossaryModal');
    glossaryModal = new bootstrap.Modal(glossaryModalEl);
    glossaryModalBody = document.getElementById('glossaryModalBody');

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

export function showEventModal(d) {
    if (!eventModal) initUI();
    
    eventModalTitle.textContent = d['title_' + state.lang];

    const glossary = getTranslation('glossary');
    const fullDescription = d['description_full_' + state.lang];
    const processedDescription = injectGlossary(fullDescription, glossary);

    const descriptionHTML = processedDescription
        .split('\n\n')
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    eventModalBody.innerHTML = descriptionHTML;

    eventModalLinks.innerHTML = '';
    if (d.links && d.links.length > 0) {
        d.links.forEach(link => {
            const linkEl = document.createElement('a');
            linkEl.href = link.url;
            linkEl.textContent = link['text_' + state.lang];
            linkEl.className = 'btn me-2';
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';
            eventModalLinks.appendChild(linkEl);
        });
    }
    eventModal.show();
}

export function showGlossaryModal() {
    if (!glossaryModal) initUI();
    
    const glossary = getTranslation('glossary');
    const terms = Object.keys(glossary).sort();
    
    let html = '<div class="glossary-list">';
    terms.forEach(term => {
        html += `
            <div class="glossary-item mb-4">
                <h3 class="h6 text-warning text-uppercase mb-2" style="letter-spacing: 0.05em;">${term}</h3>
                <p class="small text-muted mb-0" style="line-height: 1.5;">${glossary[term]}</p>
            </div>
        `;
    });
    html += '</div>';
    
    glossaryModalBody.innerHTML = html;
    glossaryModal.show();
}

export function renderTimeline(eventsData, onEventClick) {
    const timelineContainer = d3.select("#events-timeline");
    timelineContainer.html('');

    const timelineItems = timelineContainer.selectAll(".list-group-item")
        .data(eventsData)
        .enter()
        .append("a")
        .attr("href", "#chart-container")
        .attr("class", "list-group-item") // Removed list-group-item-action to use custom styles
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
        .html(d => `<span class="filter-dot category-${d.category.toLowerCase()}"></span> <span class="timeline-title">${d['title_' + state.lang]}</span>`);

    timelineItems.append("small").text(d => d3.timeFormat("%d %b %Y")(d.date));
}

export function updateTimelineLanguage() {
    // Re-render titles in timeline without rebuilding DOM if possible, or just re-render is fine.
    // Easier to re-render but we need the data.
    // If we simply select elements we can update text.
     d3.selectAll("#events-timeline .list-group-item").each(function(d) {
        d3.select(this).select(".timeline-title strong").text(d['title_' + state.lang]);
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
        .attr("class", "btn btn-sm btn-outline-secondary d-flex align-items-center")
        .attr("id", d => `filter-${d.id}`)
        .html(d => {
            if (d.id === 'all') {
                return `<span data-i18n-key="${d.i18nKey}"></span>`;
            }
            return `<span class="filter-dot category-${d.id.toLowerCase()}"></span> <span data-i18n-key="${d.i18nKey}"></span>`;
        })
        .on("click", (event, d) => {
            state.activeFilter = d.id;
            filterContainer.selectAll("button").classed("active", btnD => btnD.id === d.id);
            
            // Filter Chart
            filterMarkers(d.id);

            // Filter Timeline
             const timelineItems = d3.select("#events-timeline").selectAll(".list-group-item");
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
     d3.select(`#filter-${state.activeFilter}`).classed('active', true);
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
    bullLegendItem.className = 'd-flex align-items-center gap-2';
    bullLegendItem.innerHTML = `
        <svg width="25" height="10" style="flex-shrink: 0;"><rect x="0" y="0" width="25" height="10" fill="#28a745"></rect></svg>
        <small class="text-muted" data-i18n-key="legendBullMarket">${translations[state.lang].legendBullMarket}</small>
    `;
    legendEl.appendChild(bullLegendItem);

    const bearLegendItem = document.createElement('div');
    bearLegendItem.className = 'd-flex align-items-center gap-2';
    bearLegendItem.innerHTML = `
        <svg width="25" height="10" style="flex-shrink: 0;"><rect x="0" y="0" width="25" height="10" fill="#dc3545"></rect></svg>
        <small class="text-muted" data-i18n-key="legendBearMarket">${translations[state.lang].legendBearMarket}</small>
    `;
    legendEl.appendChild(bearLegendItem);
}
