import * as d3 from 'd3';
import { state } from './state.js';
import { getTranslation } from './i18n.js';

const halvingData = [
    { year: 2009, reward: 50, inflation: '100%', supply: '1,300,000', era: 'Genesis' },
    { year: 2012, reward: 25, inflation: '12%', supply: '10,500,000', era: '1st Halving' },
    { year: 2016, reward: 12.5, inflation: '4%', supply: '15,750,000', era: '2nd Halving' },
    { year: 2020, reward: 6.25, inflation: '1.8%', supply: '18,375,000', era: '3rd Halving' },
    { year: 2024, reward: 3.125, inflation: '0.8%', supply: '19,687,500', era: '4th Halving' },
    { year: 2028, reward: 1.5625, inflation: '0.4%', supply: '20,343,750', era: '5th Halving' }
];

let currentEraIndex = 4; // Empezamos en 2024

export function initHalvingInfographic() {
    renderSelectors();
    updateEraInfo();
    renderEmissionChart();
}

function renderSelectors() {
    const container = document.getElementById('halving-selector');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'flex flex-wrap gap-2 justify-center mb-6';

    halvingData.forEach((d, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `era-btn px-4 py-2 text-sm font-medium border rounded-md transition-all ${
            index === currentEraIndex 
            ? 'bg-[var(--bitcoin-orange)] text-white border-[var(--bitcoin-orange)] shadow-lg' 
            : 'bg-transparent border-border hover:bg-secondary text-foreground'
        }`;
        btn.textContent = d.year;
        btn.onclick = () => {
            currentEraIndex = index;
            updateUI();
        };
        container.appendChild(btn);
    });
}

function updateUI() {
    // Actualizar botones
    const buttons = document.querySelectorAll('.era-btn');
    buttons.forEach((btn, i) => {
        if (i === currentEraIndex) {
            btn.className = 'era-btn px-4 py-2 text-sm font-medium border rounded-md transition-all bg-[var(--bitcoin-orange)] text-white border-[var(--bitcoin-orange)] shadow-lg';
        } else {
            btn.className = 'era-btn px-4 py-2 text-sm font-medium border rounded-md transition-all bg-transparent border-border hover:bg-secondary text-foreground';
        }
    });

    updateEraInfo();
}

function updateEraInfo() {
    const data = halvingData[currentEraIndex];
    document.getElementById('current-reward').textContent = `${data.reward} BTC`;
    document.getElementById('current-inflation').textContent = data.inflation;
    document.getElementById('total-supply').textContent = `${data.supply} BTC`;
    
    // Actualizar indicador visual estático
    const emissionRateEl = document.getElementById('current-emission-rate');
    if (emissionRateEl) {
        emissionRateEl.textContent = data.reward;
    }
    
    // Inyectar la historia de la era
    const storyText = document.getElementById('era-story-text');
    if (storyText) {
        const stories = getTranslation('halvingStories');
        storyText.textContent = stories[data.year] || '';
    }

    const desc = document.getElementById('halving-description');
    if (desc) {
        const isPast = data.year <= new Date().getFullYear();
        const key = isPast ? 'halvingDescPast' : 'halvingDescFuture';
        let translation = getTranslation(key);
        translation = translation.replace('{year}', data.year).replace('{reward}', data.reward);
        desc.textContent = translation;
    }
}

function renderEmissionChart() {
    const container = d3.select("#emission-chart");
    const width = container.node().getBoundingClientRect().width;
    const height = 250;
    const margin = { top: 10, right: 20, bottom: 40, left: 60 }; // Reduced top margin

    container.html(''); // Limpiar

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleLinear()
        .domain([2009, 2040])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, 22000000]) // Tightened domain to fit data better
        .range([height - margin.bottom, margin.top]);

    // Línea de Suministro Total (Teórica)
    const supplyPoints = [];
    let currentSupply = 0;
    const blocksPerYear = 52560; // 6 blocks/hour * 24 hours * 365 days
    
    for (let year = 2009; year <= 2040; year++) {
        supplyPoints.push({ year, supply: currentSupply });
        
        // Calcular reward actual basado en el año
        const halvingCount = Math.floor((year - 2009) / 4);
        const currentYearReward = 50 / Math.pow(2, halvingCount);
        currentSupply += (currentYearReward * blocksPerYear);
    }

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.supply))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(supplyPoints)
        .attr("fill", "none")
        .attr("stroke", "var(--bitcoin-orange)")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Ejes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")))
        .attr("class", "emission-chart-axis");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d / 1000000 + "M"))
        .attr("class", "emission-chart-axis");

    // Interactive Tooltip Elements
    const focus = svg.append("g")
        .style("display", "none");

    focus.append("line")
        .attr("class", "focus-line")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .style("stroke", "var(--ui-border-strong)")
        .style("stroke-width", 1)
        .style("stroke-dasharray", "3,3");

    focus.append("circle")
        .attr("r", 5)
        .attr("fill", "var(--bitcoin-orange)")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    const tooltip = d3.select("body").append("div")
        .attr("class", "halving-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "var(--popover)")
        .style("border", "1px solid var(--border)")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
        .style("opacity", 0);

    const bisectYear = d3.bisector(d => d.year).left;

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", () => {
            focus.style("display", null);
            tooltip.style("opacity", 1);
        })
        .on("mouseout", () => {
            focus.style("display", "none");
            tooltip.style("opacity", 0);
        })
        .on("mousemove", (event) => {
            const x0 = x.invert(d3.pointer(event)[0]);
            const i = bisectYear(supplyPoints, x0, 1);
            const d0 = supplyPoints[i - 1];
            const d1 = supplyPoints[i];
            const d = x0 - d0.year > d1.year - x0 ? d1 : d0;

            focus.attr("transform", `translate(${x(d.year)},0)`);
            focus.select("circle").attr("cy", y(d.supply));

            tooltip.html(`
                <div class="p-2 bg-popover border border-border rounded shadow-lg text-xs">
                    <strong class="block mb-1 text-bitcoin-orange">${d.year}</strong>
                    <span class="text-muted-foreground">${getTranslation('chartTooltipSupply')}:</span>
                    <strong class="text-foreground">${Math.floor(d.supply).toLocaleString()} BTC</strong>
                </div>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        });
}
