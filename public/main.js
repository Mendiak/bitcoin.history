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

    // Referencias y creación de la instancia del Modal de Bootstrap
    const eventModalEl = document.getElementById('eventModal');
    const eventModal = new bootstrap.Modal(eventModalEl);
    const eventModalTitle = document.getElementById('eventModalLabel');
    const eventModalBody = document.getElementById('eventModalBody');
    const eventModalLinks = document.getElementById('eventModalLinks');
    const helpToggleEl = document.getElementById('help-toggle');
    const chartContainer = document.getElementById('chart-container');
    const loadingSpinner = document.getElementById('loading-spinner');

    let state = {
        scale: 'log', // 'log' o 'linear'
        lang: 'es', // 'es' o 'en'
        activeFilter: 'all' // Filtro de eventos activo
    };

    let translations = {};

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
        .attr("transform", `translate(${margin.left},${margin.top})
    `);

    const context = svg.append("g").attr("class", "context")
        .attr("transform", `translate(${margin2.left},${margin2.top})
    `);

    // --- 3. CARGA DE DATOS ---
    const priceDataURL = "bitcoin-price-history.json";
    const eventsDataURL = "events.json";
    const marketCyclesURL = "market-cycles.json";
    const translationsURL = "translations.json";

    Promise.all([
        d3.json(priceDataURL),
        d3.json(eventsDataURL),
        d3.json(marketCyclesURL),
        d3.json(translationsURL)
    ]).then(([priceData, eventsData, marketCyclesData, i18nData]) => {
        
        const legendEl = document.getElementById('chart-legend');
        translations = i18nData;

        // Inicializar Popover con funciones para que el contenido sea dinámico y dependa del idioma
        new bootstrap.Popover(helpToggleEl, {
            html: true,
            placement: 'bottom',
            title: () => translations[state.lang].chartExplanationTitle,
            content: () => translations[state.lang].chartExplanation
        });
        
        // --- OCULTAR SPINNER Y PREPARAR CONTENEDOR ---
        loadingSpinner.style.display = 'none';
        chartContainer.style.display = 'block'; // Revertir a 'block' para que D3 renderice correctamente
        chartContainer.style.minHeight = 'auto'; // Resetear la altura mínima

        
        // --- FUNCIÓN REUTILIZABLE PARA MOSTRAR MODAL ---
        function showEventModal(d) {
            // Rellenar el modal con los datos del evento
            eventModalTitle.textContent = d['title_' + state.lang];

            // Procesar la descripción para respetar los saltos de línea del JSON
            const descriptionHTML = d['description_full_' + state.lang]
                .split('\n\n') // Separar por párrafos (doble salto de línea)
                .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`) // Reemplazar saltos simples por <br>
                .join('');
            eventModalBody.innerHTML = descriptionHTML;

            // Limpiar enlaces anteriores y añadir los nuevos
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

        // --- 4. PROCESAMIENTO DE DATOS ---
        let data = priceData.prices.map(d => ({
            date: new Date(d[0]),
            price: d[1]
        }));

        eventsData.forEach(e => e.date = d3.timeParse("%Y-%m-%d")(e.date));

        marketCyclesData.forEach(d => {
            d.startDate = d3.timeParse("%Y-%m-%d")(d.startDate);
            d.endDate = d3.timeParse("%Y-%m-%d")(d.endDate);
        });

        // --- LÓGICA PARA DATOS FICTICIOS ---
        // Comprobar si el primer evento es anterior al primer dato de precio
        const earliestEventDate = d3.min(eventsData, e => e.date);
        const firstPriceDate = data[0].date;

        if (earliestEventDate < firstPriceDate) {
            // --- Lógica del "Escalón" para el período sin precios ---
            // 1. Punto de inicio de la línea horizontal en la parte inferior
            const fictitiousStart = {
                date: earliestEventDate,
                price: 0.01, // Un valor muy bajo pero > 0 para la escala logarítmica
                isFictitious: true
            };
            // 2. Punto "esquina" que finaliza la línea horizontal y comienza la vertical
            const fictitiousCorner = {
                date: firstPriceDate,
                price: 0.01, // Mantenemos el precio bajo para crear la línea horizontal
                isFictitious: true
            };
            // 3. Punto final que conecta con el primer precio real (línea vertical)
            const fictitiousEnd = {
                date: firstPriceDate,
                price: data[0].price,
                isFictitious: true
            };
            // Añadir los tres puntos ficticios al principio del array principal
            data.unshift(fictitiousStart, fictitiousCorner, fictitiousEnd);

            // Mostrar la leyenda, ya que estamos usando datos ficticios
            legendEl.style.display = 'flex';
        }

        // Variable para almacenar los datos visibles y optimizar el renderizado
        let visibleData = [];

        // --- 5. ESCALAS Y EJES ---
        const [minDate, maxDate] = d3.extent(data, d => d.date);

        // Añadir un "colchón" o padding al eje X para que los puntos extremos no queden pegados a los bordes.
        // Calculamos un 2% del rango total de tiempo para el padding a cada lado.
        const timeRange = maxDate.getTime() - minDate.getTime();
        const paddingTime = timeRange * 0.02;

        const paddedDomain = [
            new Date(minDate.getTime() - paddingTime),
            new Date(maxDate.getTime() + paddingTime)
        ];

        const x = d3.scaleTime().range([0, width]).domain(paddedDomain);
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
            .attr("transform", `translate(0,${height})
        `)
            .call(xAxis);
        const yAxisGroup = focus.append("g").attr("class", "axis axis--y");

        const marketAreasGroup = focus.insert("g", ".line") // Insertar antes que la línea
            .attr("class", "market-areas")
            .attr("clip-path", "url(#clip)");

        // Se crean dos paths: uno para la línea real y otro para la ficticia
        const focusLineReal = focus.append("path").attr("class", "line real-line").attr("clip-path", "url(#clip)");
        const focusLineFictitious = focus.append("path").attr("class", "line fictitious-line").attr("clip-path", "url(#clip)");


        const contextLine = context.append("path").datum(data).attr("class", "line");
        context.append("g").attr("class", "axis axis--x")
            .attr("transform", `translate(0,${height2})
        `)
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
            // Usamos visibleData para una búsqueda mucho más rápida
            const i = bisectDate(visibleData, x0, 1);
            const d0 = visibleData[i - 1];
            const d1 = visibleData[i];
            const d = (d1 && (x0 - d0.date > d1.date - x0)) ? d1 : d0;

            if (!d) return; // Salir si no hay punto de datos cercano

            hoverDot.attr("cx", x(d.date)).attr("cy", y(d.price));
            hoverLine.attr("x1", x(d.date)).attr("x2", x(d.date));

            tooltip.html(
                `${d3.timeFormat("%d %b %Y")(d.date)}<br/>` +
                `<strong class="tooltip-price">${d3.format("$,.2f")(d.price)}</strong>`
            ).style("left", (event.pageX + 15) + "px")
             .style("top", (event.pageY - 28) + "px");
        }

        // --- FILTROS DE EVENTOS ---
        const categories = [
            { id: 'all', i18nKey: 'filterAll' },
            { id: 'Technology', i18nKey: 'filterTech' },
            { id: 'Market', i18nKey: 'filterMarket' },
            { id: 'Adoption', i18nKey: 'filterAdoption' },
            { id: 'Regulation', i18nKey: 'filterRegulation' },
            { id: 'Security', i18nKey: 'filterSecurity' },
            { id: 'Halving', i18nKey: 'filterHalving' }
        ];

        const filterContainer = d3.select("#event-filters");

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
                // La clase para el punto de color y el marcador será la versión en minúsculas del ID
                return `<span class="filter-dot category-${d.id.toLowerCase()}"></span> <span data-i18n-key="${d.i18nKey}"></span>`;
            })
            .on("click", (event, d) => filterEvents(d.id));

        function filterEvents(category) {
            state.activeFilter = category;
            filterContainer.selectAll("button").classed("active", d => d.id === category);
            
            // Animar los marcadores del gráfico para que se "reorganicen" de forma fluida.
            // Los puntos seleccionados crecen y los no seleccionados se encogen.
            eventMarkers.transition().duration(400)
                .attr("r", d => (category === 'all' || d.category === category) ? 6 : 0)
                .style("opacity", d => (category === 'all' || d.category === category) ? 1 : 0)
                .style("pointer-events", d => (category === 'all' || d.category === category) ? "all" : "none");

            // --- MEJORA UX: Lógica de filtrado mejorada para la cronología ---
            const timelineItems = timelineContainer.selectAll(".list-group-item");

            // 1. Ocultar los elementos que no coinciden con el filtro
            timelineItems
                .filter(d => !(category === 'all' || d.category === category))
                .transition().duration(300)
                .style("opacity", 0)
                .on("end", function() {
                    // Una vez terminada la transición, los quitamos del layout para que el espacio se colapse
                    d3.select(this).style("display", "none");
                });

            // 2. Mostrar los elementos que sí coinciden
            timelineItems
                .filter(d => category === 'all' || d.category === category)
                .style("display", "flex") // Primero aseguramos que ocupen espacio
                .transition().duration(300)
                .style("opacity", 1); // Luego los hacemos visibles
        }

        // Los marcadores de eventos se dibujan encima del overlay para capturar sus propios eventos de ratón
        const eventMarkers = focus.selectAll(".event-marker").data(eventsData).enter().append("circle")
            .attr("class", d => `event-marker category-${d.category.toLowerCase()}`)
            .attr("r", 6)
            .attr("clip-path", "url(#clip)")
            .style("cursor", "pointer")
            // --- MEJORAS DE ACCESIBILIDAD ---
            .attr("tabindex", 0) // Hace que el círculo sea enfocable con el teclado
            .attr("role", "button") // Informa a los lectores de pantalla que es un botón
            .attr("aria-label", d => d['title_' + state.lang]) // Etiqueta accesible
            .on("mouseover", function(event, d) {
                // Añadir la clase para la animación de pulso
                d3.select(this).classed('pulsing', true);

                // Ocultar los elementos del tooltip general
                hoverLine.style("opacity", 0);
                hoverDot.style("opacity", 0);

                // Mostrar el tooltip del evento con su estilo específico
                tooltip.classed("tooltip-event", true)
                    .style("opacity", 1)
                    .html(`<strong>${d['title_' + state.lang]}</strong><br/><small>${d3.timeFormat("%d %b %Y")(d.date)}</small><hr/>${d['description_tooltip_' + state.lang]}`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                // Quitar la clase de la animación
                d3.select(this).classed('pulsing', false);

                tooltip.style("opacity", 0).classed("tooltip-event", false);
            })
            .on("click", (event, d) => showEventModal(d))
            .on("keydown", (event, d) => {
                // Activar con Enter o Espacio para accesibilidad
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault(); // Prevenir scroll de la página con la barra espaciadora
                    showEventModal(d);
                }
            });

        // --- 8. FUNCIONES DE ACTUALIZACIÓN Y EVENTOS ---
        function update(transitionDuration = 750) {
            const t = svg.transition().duration(transitionDuration);
            const maxPrice = d3.max(data, d => d.price);

            // Actualizar escala Y según el estado
            if (state.scale === 'log') {
                // Se baja el dominio mínimo para dar un margen inferior y que se vean los primeros puntos.
                y = d3.scaleLog().range([height, 0]).domain([0.008, maxPrice]);
                y2 = d3.scaleLog().range([height2, 0]).domain(y.domain());
                yAxis = d3.axisLeft(y).ticks(10, d3.format("$,.0f"));
            } else {
                // Se añade un pequeño dominio negativo para que el eje X no quede pegado abajo.
                // Esto levanta la línea de base y hace visibles los puntos cercanos a cero.
                y = d3.scaleLinear().range([height, 0]).domain([-maxPrice * 0.03, maxPrice]).nice();
                y2 = d3.scaleLinear().range([height2, 0]).domain(y.domain());
                yAxis = d3.axisLeft(y).tickFormat(d3.format("$,.2s"));
            }

            // Actualizar generadores de línea
            line.y(d => y(d.price));
            line2.y(d => y2(d.price));

            // Actualizar elementos del gráfico con transiciones
            yAxisGroup.transition(t).call(yAxis);
            // Se actualizan ambas líneas. Si no hay datos ficticios, una de ellas no se dibujará.
            focusLineReal.transition(t).attr("d", line);
            focusLineFictitious.transition(t).attr("d", line);
            contextLine.transition(t).attr("d", line2);
            
            eventMarkers
                .attr("cy", d => {
                    const i = bisectDate(data, d.date, 1);
                    const d0 = data[i - 1], d1 = data[i];
                    const closest = (d1 && (d.date - d0.date > d1.date - d.date)) ? d1 : d0;                    
                    return closest ? y(closest.price) : height; // Si no hay precio, colocar en la parte inferior
                }).transition(t);
        }

        function brushed(event) {
            // Esta función se llama tanto por la interacción del usuario como programáticamente.
            const selection = event.selection;
            // Si hay una selección, actualiza el dominio de X. Si no (reset), usa el dominio completo.
            x.domain(selection ? selection.map(x2.invert, x2) : x2.domain());
            redrawFocus(false); // Redibuja el gráfico principal sin transición para una respuesta fluida.
        }
        
        function resetZoom() {
            // Dispara el evento 'brush' con una selección nula, lo que hace que la función 'brushed' resetee el gráfico.
            brushGroup.call(brush.move, null);
        }

        function redrawFocus(withTransition = true) {
            const t = withTransition ? focus.transition().duration(750) : focus;
            
            t.select(".axis--x").call(xAxis);

            // --- OPTIMIZACIÓN ---
            // 1. Obtener el rango de fechas visible
            const [startDate, endDate] = x.domain();

            // 2. Encontrar los índices de inicio y fin en el array de datos
            let startIndex = bisectDate(data, startDate) - 1;
            let endIndex = bisectDate(data, endDate) + 1;
            if (startIndex < 0) startIndex = 0;

            // 3. Cortar el array para obtener solo los datos visibles
            visibleData = data.slice(startIndex, endIndex);

            // 4. Separar los datos visibles en reales y ficticios y dibujar cada línea
            const realVisibleData = visibleData.filter(d => !d.isFictitious);
            const fictitiousVisibleData = visibleData.filter(d => d.isFictitious);

            focus.select(".real-line").datum(realVisibleData).attr("d", line);
            focus.select(".fictitious-line").datum(fictitiousVisibleData).attr("d", line);
            
            focus.selectAll(".event-marker").attr("cx", d => x(d.date));

            marketAreas
                .attr("x", d => x(d.startDate))
                .attr("width", d => Math.max(0, x(d.endDate) - x(d.startDate)));

            d3.select("#reset-zoom").style("display", d3.brushSelection(brushGroup.node()) ? "inline-block" : "none");
        }

        function toggleScale() {
            state.scale = state.scale === 'log' ? 'linear' : 'log';
            const button = d3.select("#scale-toggle");
            const key = state.scale === 'log' ? 'scaleLog' : 'scaleLinear';
            const icon = state.scale === 'log' ? 'bi-graph-up' : 'bi-graph-up-arrow';
            button.html(`<i class="bi ${icon}"></i> ${translations[state.lang][key]}`);
            update();
        }

        const timelineContainer = d3.select("#events-timeline");

        function renderTimeline(lang) {
            timelineContainer.html(''); // Limpiar elementos anteriores

            const timelineItems = timelineContainer.selectAll(".list-group-item")
                .data(eventsData)
                .enter()
                .append("a")
                .attr("href", "#chart-container") // Enlazar al gráfico para accesibilidad
                .attr("class", "list-group-item list-group-item-action d-flex justify-content-between align-items-center")
                .on("mouseover", function(event, d) {
                    // Al pasar el ratón por la cronología, resalta el punto en el gráfico
                    eventMarkers
                        .filter(markerData => markerData.date.getTime() === d.date.getTime())
                        .classed('highlighted', true);
                })
                .on("mouseout", function(event, d) {
                    // Quitar el resaltado
                    eventMarkers
                        .filter(markerData => markerData.date.getTime() === d.date.getTime())
                        .classed('highlighted', false);
                })
                .on("click", (event, d) => {
                    event.preventDefault(); // Prevenir el salto de página
                    
                    // Se ha eliminado el zoom automático al hacer clic en la cronología para una UX más directa.
                    showEventModal(d);
                });

            timelineItems.append("div")
                .html(d => `<span class="filter-dot category-${d.category.toLowerCase()}"></span> <strong>${d['title_' + lang]}</strong>`);

            timelineItems.append("small").attr("class", "text-muted").text(d => d3.timeFormat("%d %b %Y")(d.date));
        }

        // --- FUNCIÓN PARA RENDERIZAR LA LEYENDA DE CICLOS DE MERCADO ---
        function renderMarketCycleLegend(lang) {
            const legendEl = document.getElementById('chart-legend');
            // Find the fictitious data legend item if it exists
            const fictitiousLegendItem = legendEl.querySelector('div.fictitious-data-legend-item');
            
            // Clear all existing legend items except the first one (fictitious data legend)
            // The fictitious data legend is the first child in index.html
            const childrenToRemove = Array.from(legendEl.children).slice(1); // Get all children except the first
            childrenToRemove.forEach(child => {
                legendEl.removeChild(child);
            });

            // Bull Market Legend
            const bullLegendItem = document.createElement('div');
            bullLegendItem.className = 'd-flex align-items-center gap-2';
            bullLegendItem.innerHTML = `
                <svg width="25" height="10" style="flex-shrink: 0;">
                    <rect x="0" y="0" width="25" height="10" fill="#28a745"></rect>
                </svg>
                <small class="text-muted" data-i18n-key="legendBullMarket">${translations[lang].legendBullMarket}</small>
            `;
            legendEl.appendChild(bullLegendItem);

            // Bear Market Legend
            const bearLegendItem = document.createElement('div');
            bearLegendItem.className = 'd-flex align-items-center gap-2';
            bearLegendItem.innerHTML = `
                <svg width="25" height="10" style="flex-shrink: 0;">
                    <rect x="0" y="0" width="25" height="10" fill="#dc3545"></rect>
                </svg>
                <small class="text-muted" data-i18n-key="legendBearMarket">${translations[lang].legendBearMarket}</small>
            `;
            legendEl.appendChild(bearLegendItem);

            // Ensure the legend container is visible if any item is present
            if (legendEl.children.length > 0) {
                legendEl.style.display = 'flex';
            } else {
                legendEl.style.display = 'none';
            }
        }

        function setLanguage(lang) {
            state.lang = lang;
            localStorage.setItem('bitcoinHistoryLang', lang);

            // Actualizar botones de idioma
            d3.select('#lang-es').classed('active', lang === 'es');
            d3.select('#lang-en').classed('active', lang === 'en');

            // --- MEJORAS SEO ---
            const pageTitle = translations[lang].pageTitle;
            const metaDescription = translations[lang].metaDescription;

            // 1. Actualizar el título del documento
            document.title = pageTitle;

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
            document.getElementById('structured-data').textContent = JSON.stringify(structuredData, null, 2);

            // Traducir todos los elementos de la UI
            document.querySelectorAll('[data-i18n-key]').forEach(el => {
                const key = el.getAttribute('data-i18n-key');
                if (translations[lang][key]) {
                    el.innerHTML = translations[lang][key];
                }
            });

            // Traducir títulos de botones
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                if (translations[lang][key]) {
                    el.setAttribute('title', translations[lang][key]);
                }
            });

            // Actualizar ARIA labels de los marcadores de eventos para que coincidan con el idioma
            focus.selectAll(".event-marker")
                .attr("aria-label", d => d['title_' + lang]);

            // Actualizar texto del botón de escala
            if (state.scale === 'log') {
                d3.select("#scale-toggle").html(`<i class="bi bi-graph-up"></i> ${translations[lang].scaleLog}`);
            } else {
                d3.select("#scale-toggle").html(`<i class="bi bi-graph-up-arrow"></i> ${translations[lang].scaleLinear}`);
            }

            // Volver a renderizar la cronología con el nuevo idioma
            renderTimeline(lang);

            // Forzar un redibujado para actualizar tooltips y otros elementos dinámicos
            redrawFocus(false);
        }

        filterEvents('all'); // Establecer el filtro inicial

        // --- 9. MANEJADORES DE EVENTOS ---
        d3.select("#scale-toggle").on("click", toggleScale);
        d3.select("#reset-zoom").on("click", resetZoom);
        d3.select("#lang-es").on("click", () => setLanguage('es'));
        d3.select("#lang-en").on("click", () => setLanguage('en'));

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

        // --- 10. INICIALIZACIÓN ---
        const preferredLang = localStorage.getItem('bitcoinHistoryLang') || (navigator.language.startsWith('es') ? 'es' : 'en');
        setLanguage(preferredLang);

        // --- 10. DIBUJO INICIAL ---
        update(0); // Dibuja el gráfico por primera vez sin transición
        redrawFocus(false); // Posiciona los elementos X por primera vez
        updateThemeButtonIcon(document.documentElement.getAttribute('data-bs-theme'));

        // Renderizado inicial de la cronología
        renderTimeline(preferredLang);

        // Renderizado inicial de la leyenda de ciclos de mercado
        renderMarketCycleLegend(preferredLang);

    }).catch(error => {
        console.error("Error al cargar los datos:", error);
        // Ocultar el spinner y mostrar un mensaje de error en su lugar
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (chartContainer) {
            chartContainer.style.minHeight = 'auto';
            // Reemplazar el contenido del contenedor con el mensaje de error
            chartContainer.innerHTML = `<p class="alert alert-danger" role="alert">No se pudieron cargar los datos del gráfico. Por favor, inténtalo de nuevo más tarde.</p>`;
        }
    });
});