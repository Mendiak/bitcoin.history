(() => {
    'use strict'

    const getStoredTheme = () => localStorage.getItem('theme')
    const setStoredTheme = theme => localStorage.setItem('theme', theme)

    const getPreferredTheme = () => {
        const storedTheme = getStoredTheme()
        if (storedTheme) {
            return storedTheme
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    const setTheme = theme => {
        document.documentElement.setAttribute('data-bs-theme', theme)
    }

    setTheme(getPreferredTheme())
})();

document.addEventListener('DOMContentLoaded', function() {
    // --- 1. CONFIGURACIÓN ---
    const margin = { top: 20, right: 50, bottom: 120, left: 70 };
    const margin2 = { top: 430, right: 50, bottom: 50, left: 70 };
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    const height2 = 500 - margin2.top - margin2.bottom;

    let state = {
        scale: 'log' // 'log' o 'linear'
    };

    // --- 2. CREACIÓN DE ELEMENTOS SVG ---
    const svg = d3.select("#chart-container").append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("viewBox", `0 0 960 500`);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect").attr("width", width).attr("height", height);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");
        
    const focus = svg.append("g").attr("class", "focus")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const context = svg.append("g").attr("class", "context")
        .attr("transform", `translate(${margin2.left},${margin2.top})`);

    // --- 3. CARGA DE DATOS ---
    const priceDataURL = "bitcoin-price-history.json";
    const eventsDataURL = "events.json";
    const marketCyclesURL = "market-cycles.json";

    Promise.all([
        d3.json(priceDataURL),
        d3.json(eventsDataURL),
        d3.json(marketCyclesURL)
    ]).then(([priceData, eventsData, marketCyclesData]) => {
        
        // --- 4. PROCESAMIENTO DE DATOS ---
        const data = priceData.prices.map(d => ({
            date: new Date(d[0]),
            price: d[1]
        }));

        eventsData.forEach(e => e.date = d3.timeParse("%Y-%m-%d")(e.date));

        marketCyclesData.forEach(d => {
            d.startDate = d3.timeParse("%Y-%m-%d")(d.startDate);
            d.endDate = d3.timeParse("%Y-%m-%d")(d.endDate);
        });

        // --- 5. ESCALAS Y EJES ---
        const x = d3.scaleTime().range([0, width]).domain(d3.extent(data, d => d.date));
        const x2 = d3.scaleTime().range([0, width]).domain(x.domain());
        let y, y2, yAxis;

        const xAxis = d3.axisBottom(x);
        const xAxis2 = d3.axisBottom(x2);

        // --- 6. GENERADORES Y ELEMENTOS DINÁMICOS ---
        const line = d3.line().x(d => x(d.date));
        const line2 = d3.line().x(d => x2(d.date));
        const brush = d3.brushX()
            .extent([[0, 0], [width, height2]])
            .on("brush end", brushed);

        const xAxisGroup = focus.append("g").attr("class", "axis axis--x")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);
        const yAxisGroup = focus.append("g").attr("class", "axis axis--y");

        const marketAreasGroup = focus.insert("g", ".line") // Insertar antes que la línea
            .attr("class", "market-areas")
            .attr("clip-path", "url(#clip)");

        const focusLine = focus.append("path").datum(data).attr("class", "line").attr("clip-path", "url(#clip)");

        const contextLine = context.append("path").datum(data).attr("class", "line");
        context.append("g").attr("class", "axis axis--x")
            .attr("transform", `translate(0,${height2})`)
            .call(xAxis2);
        const brushGroup = context.append("g").attr("class", "brush").call(brush);

        const marketAreas = marketAreasGroup.selectAll(".market-area")
            .data(marketCyclesData)
            .enter().append("rect")
            .attr("class", d => `market-area ${d.type}`)
            .attr("y", 0)
            .attr("height", height);

        // --- 7. TOOLTIP INTERACTIVO ---
        const hoverLine = focus.append("line").attr("class", "hover-line").attr("y1", 0).attr("y2", height).style("opacity", 0);
        const hoverDot = focus.append("circle").attr("class", "hover-dot").attr("r", 4).style("opacity", 0);
        const bisectDate = d3.bisector(d => d.date).left;

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

        function mousemove(event) {
            const [mx, my] = d3.pointer(event);
            const x0 = x.invert(mx);
            const i = bisectDate(data, x0, 1);
            const d0 = data[i - 1];
            const d1 = data[i];
            const d = (d1 && (x0 - d0.date > d1.date - x0)) ? d1 : d0;

            hoverDot.attr("cx", x(d.date)).attr("cy", y(d.price));
            hoverLine.attr("x1", x(d.date)).attr("x2", x(d.date));

            tooltip.html(
                `${d3.timeFormat("%d %b %Y")(d.date)}<br/>` +
                `<strong>${d3.format("$,.2f")(d.price)}</strong>`
            ).style("left", (event.pageX + 15) + "px")
             .style("top", (event.pageY - 28) + "px");
        }

        // Los marcadores de eventos se dibujan encima del overlay para capturar sus propios eventos de ratón
        const eventMarkers = focus.selectAll(".event-marker").data(eventsData).enter().append("circle")
            .attr("class", "event-marker").attr("r", 6).attr("clip-path", "url(#clip)")
            .on("mouseover", function(event, d) {
                // Ocultar los elementos del tooltip general
                hoverLine.style("opacity", 0);
                hoverDot.style("opacity", 0);

                // Mostrar el tooltip del evento con su estilo específico
                tooltip.classed("tooltip-event", true)
                    .style("opacity", 1)
                    .html(`<strong>${d.title}</strong><br/><small>${d3.timeFormat("%d %b %Y")(d.date)}</small><hr/>${d.description}`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0).classed("tooltip-event", false);
            });

        // --- 8. FUNCIONES DE ACTUALIZACIÓN Y EVENTOS ---
        function update(transitionDuration = 750) {
            const t = svg.transition().duration(transitionDuration);
            const maxPrice = d3.max(data, d => d.price);

            // Actualizar escala Y según el estado
            if (state.scale === 'log') {
                y = d3.scaleLog().range([height, 0]).domain([1, maxPrice]);
                y2 = d3.scaleLog().range([height2, 0]).domain(y.domain());
                yAxis = d3.axisLeft(y).ticks(10, d3.format("$,.0f"));
            } else {
                y = d3.scaleLinear().range([height, 0]).domain([0, d3.max(data, d => y.invert(d.price)) || maxPrice]).nice();
                y2 = d3.scaleLinear().range([height2, 0]).domain(y.domain());
                yAxis = d3.axisLeft(y).tickFormat(d3.format("$,.2s"));
            }

            // Actualizar generadores de línea
            line.y(d => y(d.price));
            line2.y(d => y2(d.price));

            // Actualizar elementos del gráfico con transiciones
            yAxisGroup.transition(t).call(yAxis);
            focusLine.transition(t).attr("d", line);
            contextLine.transition(t).attr("d", line2);
            
            eventMarkers
                .attr("cy", d => {
                    const i = bisectDate(data, d.date, 1);
                    const d0 = data[i - 1], d1 = data[i];
                    const closest = (d1 && (d.date - d0.date > d1.date - d.date)) ? d1 : d0;
                    return closest ? y(closest.price) : -10; // Ocultar si no hay precio cercano
                }).transition(t);
        }

        function brushed(event) {
            if (!event.sourceEvent) return;
            const selection = event.selection;
            x.domain(selection ? selection.map(x2.invert, x2) : x2.domain());
            redrawFocus(false);
        }
        
        function resetZoom() {
            x.domain(x2.domain());
            brushGroup.call(brush.move, null); // Esto también dispara 'brushed'
        }

        function redrawFocus(withTransition = true) {
            const t = withTransition ? focus.transition().duration(750) : focus;
            
            t.select(".axis--x").call(xAxis);
            focus.select(".line").attr("d", line); // Sin transición para un cepillado suave
            focus.selectAll(".event-marker").attr("cx", d => x(d.date));

            marketAreas
                .attr("x", d => x(d.startDate))
                .attr("width", d => Math.max(0, x(d.endDate) - x(d.startDate)));

            d3.select("#reset-zoom").style("display", d3.brushSelection(brushGroup.node()) ? "inline-block" : "none");
        }

        function toggleScale() {
            state.scale = state.scale === 'log' ? 'linear' : 'log';
            const button = d3.select("#scale-toggle");
            if (state.scale === 'log') {
                button.html('<i class="bi bi-graph-up"></i> Escala Logarítmica');
            } else {
                button.html('<i class="bi bi-graph-up-arrow"></i> Escala Lineal');
            }
            update();
        }

        // --- 9. MANEJADORES DE EVENTOS ---
        d3.select("#scale-toggle").on("click", toggleScale);
        d3.select("#reset-zoom").on("click", resetZoom);

        const themeToggleButton = d3.select("#theme-toggle");
        const updateThemeButtonIcon = (theme) => {
            if (theme === 'dark') {
                themeToggleButton.html('<i class="bi bi-sun-fill"></i>');
            } else {
                themeToggleButton.html('<i class="bi bi-moon-stars-fill"></i>');
            }
        };

        themeToggleButton.on("click", () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            updateThemeButtonIcon(newTheme);
        });

        // --- 10. DIBUJO INICIAL ---
        update(0); // Dibuja el gráfico por primera vez sin transición
        redrawFocus(false); // Posiciona los elementos X por primera vez
        updateThemeButtonIcon(document.documentElement.getAttribute('data-bs-theme'));

    }).catch(error => {
        console.error("Error al cargar los datos:", error);
        d3.select("#chart-container").append("p")
            .attr("class", "alert alert-danger")
            .text("No se pudieron cargar los datos del gráfico. Por favor, inténtalo de nuevo más tarde.");
    });
});