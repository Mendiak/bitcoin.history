import * as bootstrap from 'bootstrap';
import * as d3 from 'd3';
import { state } from './state.js';
import { filterMarkers, highlightMarker } from './chart.js';

let eventModal;
let eventModalTitle, eventModalBody, eventModalLinks;

export function initUI() {
    const eventModalEl = document.getElementById('eventModal');
    eventModal = new bootstrap.Modal(eventModalEl);
    eventModalTitle = document.getElementById('eventModalLabel');
    eventModalBody = document.getElementById('eventModalBody');
    eventModalLinks = document.getElementById('eventModalLinks');
}

export function showEventModal(d) {
    if (!eventModal) initUI();
    
    eventModalTitle.textContent = d['title_' + state.lang];

    const descriptionHTML = d['description_full_' + state.lang]
        .split('\n\n')
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    eventModalBody.innerHTML = descriptionHTML;

    eventModalLinks.innerHTML = '';
    if (d.links && d.links.length > 0) {
        d.links.forEach(link => {
            const linkEl = document.createElement('a');
            linkEl.href = link.url;
            linkEl.innerHTML = `<i class="bi bi-link-45deg"></i> ${link['text_' + state.lang]}`;
            linkEl.className = 'btn btn-primary me-2';
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';
            eventModalLinks.appendChild(linkEl);
        });
    }
    eventModal.show();
}

export function renderTimeline(eventsData, onEventClick) {
    const timelineContainer = d3.select("#events-timeline");
    timelineContainer.html('');

    const timelineItems = timelineContainer.selectAll(".list-group-item")
        .data(eventsData)
        .enter()
        .append("a")
        .attr("href", "#chart-container")
        .attr("class", "list-group-item list-group-item-action d-flex justify-content-between align-items-center")
        .attr("data-category", d => d.category) // Helper for filtering
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
        .html(d => `<span class="filter-dot category-${d.category.toLowerCase()}"></span> <span class="timeline-title"><strong>${d['title_' + state.lang]}</strong></span>`);

    timelineItems.append("small").attr("class", "text-muted").text(d => d3.timeFormat("%d %b %Y")(d.date));
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
