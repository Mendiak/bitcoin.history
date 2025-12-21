import * as d3 from 'd3';
import { state } from './state.js';

// --- CONFIGURACIÓN ---
const margin = { top: 20, right: 50, bottom: 120, left: 70 };
const margin2 = { top: 430, right: 50, bottom: 50, left: 70 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;
const height2 = 500 - margin2.top - margin2.bottom;

// Variables globales del módulo
let svg, focus, context;
let x, x2, y, y2, xAxis, xAxis2;
let line, line2, brush;
let focusLineReal, focusLineFictitious, contextLine;
let marketAreasGroup, marketAreas;
let hoverLine, hoverDot, tooltip;
let eventMarkers;

let data = [];
let eventsData = [];
let visibleData = [];

// Callbacks
let onEventClickCallback = null;

// --- INICIALIZACIÓN ---
export function initChart(containerId, _priceData, _eventsData, _marketCyclesData, _onEventClick) {
    onEventClickCallback = _onEventClick;
    
    // Procesar datos
    data = _priceData.prices.map(d => ({
        date: new Date(d[0]),
        price: d[1]
    }));

    eventsData = _eventsData;
    eventsData.forEach(e => e.date = d3.timeParse("%Y-%m-%d")(e.date));

    _marketCyclesData.forEach(d => {
        d.startDate = d3.timeParse("%Y-%m-%d")(d.startDate);
        d.endDate = d3.timeParse("%Y-%m-%d")(d.endDate);
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
        .attr("viewBox", `0 0 960 500`);

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
        .data(_marketCyclesData)
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
    eventMarkers = focus.selectAll(".event-marker").data(eventsData).enter().append("circle")
        .attr("class", d => `event-marker category-${d.category.toLowerCase()}`)
        .attr("r", 6)
        .attr("clip-path", "url(#clip)")
        .style("cursor", "pointer")
        .attr("tabindex", 0)
        .attr("role", "button")
        .on("click", (event, d) => {
            if (onEventClickCallback) onEventClickCallback(d);
        });

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
            d3.select(this).classed('pulsing', true);
            hoverLine.style("opacity", 0);
            hoverDot.style("opacity", 0);
            tooltip.classed("tooltip-event", true)
                .style("opacity", 1)
                .html(`<strong>${d['title_' + state.lang]}</strong><br/><small>${d3.timeFormat("%d %b %Y")(d.date)}</small><hr/>${d['description_tooltip_' + state.lang]}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).classed('pulsing', false);
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

    hoverDot.attr("cx", x(d.date)).attr("cy", y(d.price || 0)); // handle 0 price if any
    hoverLine.attr("x1", x(d.date)).attr("x2", x(d.date));

    tooltip.html(
        `${d3.timeFormat("%d %b %Y")(d.date)}<br/>` +
        `<strong class="tooltip-price">${d3.format("$,.2f")(d.price)}</strong>`
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
    
    focus.selectAll(".event-marker").attr("cx", d => x(d.date));

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
    
    // update event markers Y position
    const bisectDate = d3.bisector(d => d.date).left;
    eventMarkers.transition(t).attr("cy", d => {
            const i = bisectDate(data, d.date, 1);
            const d0 = data[i - 1], d1 = data[i];
            const closest = (d1 && (d.date - d0.date > d1.date - d.date)) ? d1 : d0;                    
            return closest ? y(closest.price) : height;
        })
        .attr("aria-label", d => d['title_' + state.lang]); // Update accessibility label on update too
}

export function filterMarkers(category) {
   // Actualizar animación de marcadores
   eventMarkers.transition().duration(400)
       .attr("r", d => (category === 'all' || d.category === category) ? 6 : 0)
       .style("opacity", d => (category === 'all' || d.category === category) ? 1 : 0)
       .style("pointer-events", d => (category === 'all' || d.category === category) ? "all" : "none");
}

export function highlightMarker(date, highlight) {
    eventMarkers
        .filter(markerData => markerData.date.getTime() === date.getTime())
        .classed('highlighted', highlight);
}
