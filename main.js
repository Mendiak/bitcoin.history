document.addEventListener('DOMContentLoaded', function() {
    // 1. Configuración del gráfico
    const margin = { top: 20, right: 50, bottom: 50, left: 70 };
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#chart-container").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 2. Crear el Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    // 3. Carga de datos
    const priceDataURL = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily";
    const eventsDataURL = "events.json";

    Promise.all([
        d3.json(priceDataURL),
        d3.json(eventsDataURL)
    ]).then(([priceData, eventsData]) => {

        // Procesar datos de precios
        const data = priceData.prices.map(d => ({
            date: new Date(d[0]),
            price: d[1]
        }));

        // Procesar fechas de eventos
        eventsData.forEach(event => {
            event.date = d3.timeParse("%Y-%m-%d")(event.date);
        });

        // 4. Definir Escalas
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.price)])
            .range([height, 0]);

        // 5. Dibujar Ejes
        // Eje X
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Eje Y
        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d => `$${d.toLocaleString()}`))
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "-5em")
            .attr("text-anchor", "end")
            .text("Precio (USD)");

        // 6. Dibujar la línea de precio
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.price));

        svg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", line);

        // 7. Dibujar marcadores de eventos
        svg.selectAll(".event-marker")
            .data(eventsData)
            .enter()
            .append("circle")
            .attr("class", "event-marker")
            .attr("cx", d => x(d.date))
            .attr("cy", d => {
                // Encontrar el precio más cercano en la data para posicionar el marcador
                const bisectDate = d3.bisector(item => item.date).left;
                const i = bisectDate(data, d.date, 1);
                const d0 = data[i - 1];
                const d1 = data[i];
                const closestDataPoint = d.date - d0.date > d1.date - d.date ? d1 : d0;
                return y(closestDataPoint.price);
            })
            .attr("r", 6)
            .on("mouseover", (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`<strong>${d.title}</strong><br/>${d.description}`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

    }).catch(error => {
        console.error("Error al cargar los datos:", error);
        d3.select("#chart-container").append("p")
            .attr("class", "text-danger text-center")
            .text("No se pudieron cargar los datos del gráfico. Por favor, inténtalo de nuevo más tarde.");
    });
});