import * as d3 from 'd3';
import { state } from './state.js';
import { translations } from './i18n.js';

// --- CONFIGURACIÓN ---
let margin = { top: 20, right: 50, bottom: 120, left: 70 };
let margin2 = { top: 430, right: 50, bottom: 50, left: 70 };
let width = 960 - margin.left - margin.right;
let height = 500 - margin.top - margin.bottom;
let height2 = 500 - margin2.top - margin2.bottom;
let fullWidth = 960;
let fullHeight = 500;

// Variables globales del módulo
let svg, focus, context;
let x, x2, y, y2, xAxis, xAxis2;
let line, line2, brush;
let focusLineReal, focusLineFictitious, contextLine;
let marketAreasGroup, marketAreas;
let hoverLine, hoverDot, tooltip;
let eventMarkers, milestoneMarkers;
let liveDotGroup;

let data = [];
let eventsData = [];
let marketCyclesData = [];
let visibleData = [];

// Callbacks
let onEventClickCallback = null;

let factHighlightTimeout = null;

// --- INICIALIZACIÓN ---
export function initChart(containerId, _priceData, _eventsData, _marketCyclesData, _onEventClick) {
    onEventClickCallback = _onEventClick;
    marketCyclesData = _marketCyclesData;

    // Responsive Setup
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        fullWidth = 400;
        fullHeight = 500;
        margin = { top: 10, right: 10, bottom: 90, left: 45 }; 
    } else {
        fullWidth = 960;
        fullHeight = 500;
        margin = { top: 20, right: 50, bottom: 120, left: 70 };
    }

    width = fullWidth - margin.left - margin.right;
    height = fullHeight - margin.top - margin.bottom;

    // Ajustar posición del gráfico de contexto (brush)
    const contextHeight = 30;
    const contextBottomMargin = isMobile ? 30 : 50; 
    
    margin2 = { 
        top: fullHeight - contextBottomMargin - contextHeight, 
        right: margin.right, 
        bottom: contextBottomMargin, 
        left: margin.left 
    };
    height2 = fullHeight - margin2.top - margin2.bottom;
    
    // Procesar datos
    data = _priceData.prices.map(d => ({
        date: new Date(d[0]),
        price: d[1]
    }));

    eventsData = _eventsData;
    eventsData.forEach(e => {
        if (typeof e.date === 'string') {
            e.date = d3.timeParse("%Y-%m-%d")(e.date);
        }
    });

    marketCyclesData.forEach(d => {
        if (typeof d.startDate === 'string') {
            d.startDate = d3.timeParse("%Y-%m-%d")(d.startDate);
            d.endDate = d3.timeParse("%Y-%m-%d")(d.endDate);
        }
    });

    // Lógica Datos Ficticios
    const earliestEventDate = d3.min(eventsData, e => e.date);
    const firstPriceDate = data[0].date;

    if (earliestEventDate < firstPriceDate) {
        const fictitiousStart = { date: earliestEventDate, price: 0.01, isFictitious: true };
        const fictitiousCorner = { date: firstPriceDate, price: 0.01, isFictitious: true };
        const fictitiousEnd = { date: firstPriceDate, price: data[0].price, isFictitious: true };
        data.unshift(fictitiousStart, fictitiousCorner, fictitiousEnd);
        
        const legendEl = document.getElementById('chart-legend');
        if (legendEl) legendEl.style.display = 'flex';
    }

    // --- SVG ---
    d3.select(containerId).html(''); // Limpiar contenedor
    svg = d3.select(containerId).append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect").attr("width", width).attr("height", height);

    tooltip = d3.select("body").append("div").attr("class", "tooltip");
        
    focus = svg.append("g").attr("class", "focus")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    context = svg.append("g").attr("class", "context")
        .attr("transform", `translate(${margin2.left},${margin2.top})`);

    // --- ESCALAS ---
    const [minDate, maxDate] = d3.extent(data, d => d.date);
    const timeRange = maxDate.getTime() - minDate.getTime();
    const paddingTime = timeRange * 0.02;
    const paddedDomain = [new Date(minDate.getTime() - paddingTime), new Date(maxDate.getTime() + paddingTime)];

    x = d3.scaleTime().range([0, width]).domain(paddedDomain);
    x2 = d3.scaleTime().range([0, width]).domain(x.domain());

    xAxis = d3.axisBottom(x);
    xAxis2 = d3.axisBottom(x2);

    // --- ELEMENTOS ---
    line = d3.line().x(d => x(d.date));
    line2 = d3.line().x(d => x2(d.date));
    brush = d3.brushX().extent([[0, 0], [width, height2]]).on("brush end", brushed);

    focus.append("g").attr("class", "axis axis--x").attr("transform", `translate(0,${height})`).call(xAxis);
    focus.append("g").attr("class", "axis axis--y");

    marketAreasGroup = focus.insert("g", ".line").attr("class", "market-areas").attr("clip-path", "url(#clip)");
    focusLineReal = focus.append("path").attr("class", "line real-line").attr("clip-path", "url(#clip)");
    focusLineFictitious = focus.append("path").attr("class", "line fictitious-line").attr("clip-path", "url(#clip)");

    contextLine = context.append("path").datum(data).attr("class", "line");
    context.append("g").attr("class", "axis axis--x").attr("transform", `translate(0,${height2})`).call(xAxis2);
    const brushGroup = context.append("g").attr("class", "brush").call(brush);

    marketAreas = marketAreasGroup.selectAll(".market-area")
        .data(marketCyclesData)
        .enter().append("rect")
        .attr("class", d => `market-area ${d.type}`)
        .attr("y", 0)
        .attr("height", height);

    // --- TOOLTIP INTERACTIVO ---
    hoverLine = focus.append("line").attr("class", "hover-line").attr("y1", 0).attr("y2", height).style("opacity", 0);
    hoverDot = focus.append("circle").attr("class", "hover-dot").attr("r", 4).style("opacity", 0);
    
    focus.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", () => {
            tooltip.style("opacity", 1);
            hoverLine.style("opacity", 1);
            hoverDot.style("opacity", 1);
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
            hoverLine.style("opacity", 0);
            hoverDot.style("opacity", 0);
        })
        .on("mousemove", mousemove);

    // --- MARCADORES DE EVENTOS ---
    eventMarkers = focus.selectAll(".event-marker")
        .data(eventsData)
        .enter().append("circle")
        .attr("class", d => `event-marker category-${d.category.toLowerCase()} ${d.category === 'Halving' ? 'milestone' : ''}`)
        .attr("r", d => d.category === 'Halving' ? 7 : 5)
        .attr("stroke", "#fdfdfc") // Paper stroke
        .attr("stroke-width", 1)
        .attr("clip-path", "url(#clip)")
        .style("cursor", "pointer")
        .style("transition", "transform 0.1s ease")
        .attr("tabindex", 0)
        .attr("role", "button")
        .on("click", (event, d) => {
            if (onEventClickCallback) onEventClickCallback(d);
        });

    // Marcadores descriptivos (Emojis para hitos)
    milestoneMarkers = focus.selectAll(".milestone-icon")
        .data(eventsData.filter(d => d.category === 'Halving' || d.title_es.includes('Génesis') || d.title_es.includes('Whitepaper')))
        .enter().append("text")
        .attr("class", "milestone-icon")
        .attr("text-anchor", "middle")
        .attr("dy", "-1.2em")
        .attr("font-size", "14px")
        .attr("clip-path", "url(#clip)")
        .style("pointer-events", "none")
        .text(d => {
            const emojiMatch = d.title_es.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u);
            return emojiMatch ? emojiMatch[0] : '';
        });

    // --- LIVE DOT ---
    liveDotGroup = focus.append("g").attr("class", "live-dot-container").attr("clip-path", "url(#clip)");
    liveDotGroup.append("circle").attr("class", "live-dot-pulse").attr("r", 6);
    liveDotGroup.append("circle").attr("class", "live-dot-core").attr("r", 4);

    setupMarkerInteractions();

    updateYScales(); // 1. Inicializar escalas Y
    redrawFocus(false); // 2. Vincular datos y dibujar primera vez (necesita Y scales)
    updateChart(0); // 3. Actualizar ejes y transiciones (si las hubiera)
}

function updateYScales() {
    const maxPrice = d3.max(data, d => d.price);
    if (state.scale === 'log') {
        y = d3.scaleLog().range([height, 0]).domain([0.008, maxPrice]);
        y2 = d3.scaleLog().range([height2, 0]).domain(y.domain());
    } else {
        y = d3.scaleLinear().range([height, 0]).domain([-maxPrice * 0.03, maxPrice]).nice();
        y2 = d3.scaleLinear().range([height2, 0]).domain(y.domain());
    }

    line.y(d => y(d.price));
    line2.y(d => y2(d.price));
}

function setupMarkerInteractions() {
    eventMarkers
        .on("mouseover", function(event, d) {
            d3.select(this).classed('highlighted', true);
            hoverLine.style("opacity", 0);
            hoverDot.style("opacity", 0);

            let extraContent = "";
            if (d.category === 'Halving') {
                let reward = "";
                const year = d.date.getFullYear();
                if (year === 2012) reward = "50 BTC ➔ 25 BTC";
                else if (year === 2016) reward = "25 BTC ➔ 12.5 BTC";
                else if (year === 2020) reward = "12.5 BTC ➔ 6.25 BTC";
                else if (year >= 2024) reward = "6.25 BTC ➔ 3.125 BTC";
                
                if (reward) {
                    extraContent = `<div class="mt-2 pt-2 border-top small text-muted">${reward}</div>`;
                }
            }

            tooltip.classed("tooltip-event", true)
                .style("opacity", 1)
                .html(`<strong>${d['title_' + state.lang]}</strong><br/><small class="text-[11px] opacity-70">${d3.timeFormat("%d %b %Y")(d.date)}</small><hr/>${d['description_tooltip_' + state.lang]}${extraContent}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).classed('highlighted', false);
            tooltip.style("opacity", 0).classed("tooltip-event", false);
        })
        .on("keydown", (event, d) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (onEventClickCallback) onEventClickCallback(d);
            }
        });
}

function mousemove(event) {
    const bisectDate = d3.bisector(d => d.date).left;
    const [mx, my] = d3.pointer(event);
    const x0 = x.invert(mx);
    const i = bisectDate(visibleData, x0, 1);
    const d0 = visibleData[i - 1];
    const d1 = visibleData[i];
    const d = (d1 && (x0 - d0.date > d1.date - x0)) ? d1 : d0;
    if (!d) return;

    hoverDot.attr("cx", x(d.date)).attr("cy", y(d.price || 0)); 
    hoverLine.attr("x1", x(d.date)).attr("x2", x(d.date));

    // Find current market cycle
    const cycle = marketCyclesData.find(c => d.date >= c.startDate && d.date <= c.endDate);
    let cycleInfo = "";
    if (cycle) {
        const cycleName = cycle.label;
        const cycleColor = cycle.type === 'bull' ? '#28a745' : '#dc3545';
        cycleInfo = `<div class="mt-2 pt-2 border-top small" style="color: ${cycleColor}">
            <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i> ${cycleName}
        </div>`;
    }

    // Purchasing Power Calculation
    const price = d.price || 0.01;
    const currentTranslations = translations[state.lang];
    let purchasingInfo = "";

    if (price > 0 && currentTranslations) {
        // Items configuration
        const itemsList = [
            { id: "bread", price: 1 },
            { id: "netflix", price: 15 },
            { id: "pizza", price: 20 },
            { id: "playstation", price: 500 },
            { id: "macbook", price: 2000 },
            { id: "rolex", price: 10000 },
            { id: "car", price: 40000 },
            { id: "gold", price: 75000 },
            { id: "house", price: 400000 }
        ];

        // Find the most appropriate item tier
        let selectedItem = itemsList[0];
        for (let i = 0; i < itemsList.length; i++) {
            if (price >= itemsList[i].price) {
                selectedItem = itemsList[i];
            } else {
                break;
            }
        }

        const quantity = Math.floor(price / selectedItem.price);
        const itemLabel = currentTranslations.items?.[selectedItem.id] || "";
        const itemText = itemLabel ? `${quantity} ${itemLabel}` : "";

        if (itemText) {
            purchasingInfo = `<div class="mt-2 pt-2 border-top small">
                <span class="text-muted-foreground uppercase text-[11px] tracking-wider">${currentTranslations.purchasingPower}</span><br/>
                <span class="text-foreground font-semibold flex items-center gap-1">
                    <i class="bi bi-cart-fill text-bitcoin-orange"></i> ${currentTranslations.canBuy} ${itemText}
                </span>
            </div>`;
        }
    }

    tooltip.html(
        `${d3.timeFormat("%d %b %Y")(d.date)}<br/>` +
        `<strong class="tooltip-price">${d3.format("$,.2f")(d.price)}</strong>` +
        cycleInfo +
        purchasingInfo
    ).style("left", (event.pageX + 15) + "px")
     .style("top", (event.pageY - 28) + "px");
}

function brushed(event) {
    const selection = event.selection;
    x.domain(selection ? selection.map(x2.invert, x2) : x2.domain());
    redrawFocus(false);
}

export function resetZoom() {
    d3.select(".brush").call(brush.move, null);
}

export function showFactOnChart(dateStr) {
    if (!dateStr) return;
    const date = d3.timeParse("%Y-%m-%d")(dateStr);
    if (!date) return;

    if (factHighlightTimeout) {
        clearTimeout(factHighlightTimeout);
    }

    // 1. Asegurar visibilidad sin cambiar el nivel de zoom (solo desplazar si es necesario)
    const [currentStart, currentEnd] = x.domain();
    const duration = currentEnd.getTime() - currentStart.getTime();
    
    if (date < currentStart || date > currentEnd) {
        const halfDuration = duration / 2;
        let newStart = new Date(date.getTime() - halfDuration);
        let newEnd = new Date(date.getTime() + halfDuration);

        const [minD, maxD] = x2.domain();
        if (newStart < minD) {
            newStart = minD;
            newEnd = new Date(minD.getTime() + duration);
        }
        if (newEnd > maxD) {
            newEnd = maxD;
            newStart = new Date(maxD.getTime() - duration);
        }

        d3.select(".brush").transition().duration(800).call(brush.move, [x2(newStart), x2(newEnd)]);
    }

    // 2. Resaltar el marcador (animación de pulso y escala)
    const marker = eventMarkers.filter(d => d.date.getTime() === date.getTime());
    
    if (!marker.empty()) {
        eventMarkers.classed('highlighted pulsing', false);
        marker.classed('highlighted pulsing', true);

        // 3. Mostrar el Tooltip y la línea de forma programada
        const d = marker.datum();
        const bisectDate = d3.bisector(d => d.date).left;
        const i = bisectDate(data, d.date, 1);
        const priceData = data[i-1]; 

        if (priceData) {
            hoverDot.attr("cx", x(d.date)).attr("cy", y(priceData.price || 0)).style("opacity", 1);
            hoverLine.attr("x1", x(d.date)).attr("x2", x(d.date)).style("opacity", 1);
            
            const svgNode = svg.node();
            const rect = svgNode.getBoundingClientRect();
            const screenX = rect.left + window.scrollX + margin.left + x(d.date);
            const screenY = rect.top + window.scrollY + margin.top + y(priceData.price || 0);

            tooltip.style("opacity", 1)
                .classed("tooltip-event", true)
                .html(`<strong>${d['title_' + state.lang]}</strong><br/><small>${d3.timeFormat("%d %b %Y")(d.date)}</small><hr/>${d['description_tooltip_' + state.lang]}`)
                .style("left", (screenX + 15) + "px")
                .style("top", (screenY - 28) + "px");

            factHighlightTimeout = setTimeout(() => {
                marker.classed('highlighted pulsing', false);
                if (tooltip.classed("tooltip-event")) {
                   tooltip.style("opacity", 0).classed("tooltip-event", false);
                   hoverDot.style("opacity", 0);
                   hoverLine.style("opacity", 0);
                }
                factHighlightTimeout = null;
            }, 5000);
        }
    }
}

export function focusOnDate(dateStr) {
    showFactOnChart(dateStr);
}

function redrawFocus(withTransition = true) {
    const t = withTransition ? focus.transition().duration(750) : focus;
    t.select(".axis--x").call(xAxis);

    const [startDate, endDate] = x.domain();
    const bisectDate = d3.bisector(d => d.date).left;
    let startIndex = bisectDate(data, startDate) - 1;
    let endIndex = bisectDate(data, endDate) + 1;
    if (startIndex < 0) startIndex = 0;
    visibleData = data.slice(startIndex, endIndex);

    const realVisibleData = visibleData.filter(d => !d.isFictitious);
    const fictitiousVisibleData = visibleData.filter(d => d.isFictitious);

    focus.select(".real-line").datum(realVisibleData).attr("d", line);
    focus.select(".fictitious-line").datum(fictitiousVisibleData).attr("d", line);
    
    focus.selectAll(".event-marker")
        .attr("cx", d => x(d.date))
        .attr("cy", d => {
            const i = bisectDate(data, d.date, 1);
            const d0 = data[i - 1], d1 = data[i];
            const closest = (d1 && (d.date - d0.date > d1.date - d.date)) ? d1 : d0;                    
            return closest ? y(closest.price) : height;
        });

    focus.selectAll(".milestone-icon")
        .attr("x", d => x(d.date))
        .attr("y", d => {
            const i = bisectDate(data, d.date, 1);
            const d0 = data[i - 1], d1 = data[i];
            const closest = (d1 && (d.date - d0.date > d1.date - d.date)) ? d1 : d0;                    
            return closest ? y(closest.price) : height;
        });

    // Position Live Dot
    const lastPoint = realVisibleData[realVisibleData.length - 1];
    if (lastPoint && lastPoint.date >= startDate && lastPoint.date <= endDate) {
        const xPos = x(lastPoint.date);
        const yPos = y(lastPoint.price);
        liveDotGroup.style("display", "block")
            .attr("transform", `translate(${xPos},${yPos})`);
    } else {
        liveDotGroup.style("display", "none");
    }

    marketAreas
        .attr("x", d => x(d.startDate))
        .attr("width", d => Math.max(0, x(d.endDate) - x(d.startDate)));

    d3.select("#reset-zoom").style("display", d3.brushSelection(d3.select(".brush").node()) ? "inline-block" : "none");
}

export function updateChart(transitionDuration = 750) {
    updateYScales(); // Update scales

    const t = svg.transition().duration(transitionDuration);

    if (state.scale === 'log') {
        d3.select(".axis--y").transition(t).call(d3.axisLeft(y).ticks(10, d3.format("$,.0f")));
    } else {
        d3.select(".axis--y").transition(t).call(d3.axisLeft(y).tickFormat(d3.format("$,.2s")));
    }

    focus.select(".real-line").transition(t).attr("d", line);
    focus.select(".fictitious-line").transition(t).attr("d", line);
    contextLine.transition(t).attr("d", line2);
    
    const bisectDate = d3.bisector(d => d.date).left;
    eventMarkers.transition(t).attr("cy", d => {
            const i = bisectDate(data, d.date, 1);
            const d0 = data[i - 1], d1 = data[i];
            const closest = (d1 && (d.date - d0.date > d1.date - d.date)) ? d1 : d0;                    
            return closest ? y(closest.price) : height;
        })
        .attr("aria-label", d => d['title_' + state.lang]); 

    milestoneMarkers.transition(t).attr("y", d => {
        const i = bisectDate(data, d.date, 1);
        const d0 = data[i - 1], d1 = data[i];
        const closest = (d1 && (d.date - d0.date > d1.date - d.date)) ? d1 : d0;                    
        return closest ? y(closest.price) : height;
    });

    // Update Live Dot Position
    const lastPoint = data[data.length - 1];
    if (lastPoint && !lastPoint.isFictitious) {
        const xPos = x(lastPoint.date);
        const yPos = y(lastPoint.price);
        liveDotGroup.transition(t).attr("transform", `translate(${xPos},${yPos})`);
    }
}

export function filterMarkers(category) {
   const duration = 400;
   eventMarkers.transition().duration(duration)
       .attr("r", d => (category === 'all' || d.category === category) ? (d.category === 'Halving' ? 8 : 6) : 0)
       .style("opacity", d => (category === 'all' || d.category === category) ? 1 : 0)
       .style("pointer-events", d => (category === 'all' || d.category === category) ? "all" : "none");

   milestoneMarkers.transition().duration(duration)
       .style("opacity", d => (category === 'all' || d.category === category) ? 1 : 0);
}

export function highlightMarker(date, highlight) {
    eventMarkers
        .filter(markerData => markerData.date.getTime() === date.getTime())
        .classed('highlighted', highlight);
}
