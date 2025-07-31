// process-data.js
const fs = require('fs');
const csv = require('csv-parser');

const inputFile = 'btcusd_1-min_data.csv'; // Asegúrate de que el CSV de Kaggle esté en la misma carpeta
const outputFile = 'public/bitcoin-price-history.json';

const dailyPrices = new Map();

console.log(`Iniciando el procesamiento de ${inputFile}...`);
console.log('Esto puede tardar unos minutos debido al tamaño del archivo.');

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (row) => {
    // El timestamp está en segundos, lo convertimos a milisegundos para JS
    const timestamp = parseInt(row.Timestamp, 10) * 1000;
    const closePrice = parseFloat(row.Close);

    // Nos aseguramos de que los datos son válidos y el precio no es nulo
    if (isNaN(timestamp) || isNaN(closePrice) || row.Close === 'NaN') {
      return;
    }

    // Creamos una clave para el día (YYYY-MM-DD) para agrupar los datos
    const date = new Date(timestamp);
    const dayKey = date.toISOString().split('T')[0];

    // Almacenamos el último precio de cierre para cada día.
    // Como el CSV está ordenado, el último que procesemos será el de cierre del día.
    dailyPrices.set(dayKey, { timestamp, price: closePrice });
  })
  .on('end', () => {
    console.log(`Procesamiento completado. Se encontraron ${dailyPrices.size} días únicos.`);
    
    const pricesArray = Array.from(dailyPrices.values()).map(entry => [entry.timestamp, entry.price]);
    pricesArray.sort((a, b) => a[0] - b[0]);

    const outputData = { prices: pricesArray };

    fs.writeFileSync(outputFile, JSON.stringify(outputData)); // Guardamos el JSON sin formato para que ocupe menos espacio
    console.log(`¡Éxito! Los datos diarios han sido guardados en ${outputFile}`);
  });