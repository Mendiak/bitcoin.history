// merge-data.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// --- CONFIGURACIÓN DE ARCHIVOS ---
const newCsvPath = path.join(__dirname, 'public', 'new-price-data.csv');
const oldJsonPath = path.join(__dirname, 'public', 'bitcoin-price-history.json');
const outputJsonPath = oldJsonPath; // Sobrescribiremos el archivo existente

async function mergeData() {
    console.log('Iniciando el proceso de fusión de datos...');

    // --- 1. LEER Y PARSEAR EL NUEVO CSV ---
    const newPriceData = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream(newCsvPath)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim(), // Limpiar espacios en los encabezados
                mapValues: ({ value }) => value.trim()     // Limpiar espacios en los valores
            }))
            .on('data', (row) => {
                // El CSV tiene las columnas 'Time' y 'others'
                const cleanedTimeString = row.Time.replace(/\+AC0-/g, '-');
                const timestamp = new Date(cleanedTimeString).getTime();
                const price = parseFloat(row.others);

                // Asegurarse de que los datos son válidos antes de añadirlos
                if (!isNaN(timestamp) && !isNaN(price)) {
                    newPriceData.push([timestamp, price]);
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });
    console.log(`✅ Se han parseado ${newPriceData.length} nuevos puntos de datos desde el CSV.`);

    // --- NUEVO PASO: CORREGIR ANOMALÍAS ---
    // Ordenar los datos nuevos por fecha para poder comparar precios consecutivos
    newPriceData.sort((a, b) => a[0] - b[0]);
    console.log('Buscando y corrigiendo anomalías en los nuevos datos...');
    let correctedCount = 0;
    for (let i = 1; i < newPriceData.length; i++) {
        const previousPrice = newPriceData[i - 1][1];
        let currentPrice = newPriceData[i][1];

        // Si el precio actual es 100 veces mayor que el anterior, es probablemente una anomalía
        if (previousPrice > 0 && currentPrice > previousPrice * 100) {
            const originalPrice = currentPrice;
            newPriceData[i][1] = currentPrice / 1000;
            console.log(`   - Anomalía detectada en fecha ${new Date(newPriceData[i][0]).toISOString().split('T')[0]}: ${originalPrice} -> ${newPriceData[i][1]}`);
            correctedCount++;
        }
    }
    console.log(`✅ Se corrigieron ${correctedCount} anomalías.`);

    // --- 2. LEER EL JSON ANTIGUO ---
    const oldJsonContent = fs.readFileSync(oldJsonPath, 'utf-8');
    const oldPriceData = JSON.parse(oldJsonContent).prices;
    console.log(`✅ Se han cargado ${oldPriceData.length} puntos de datos antiguos desde el JSON.`);

    // --- 3. COMBINAR, DEDUPLICAR Y ORDENAR ---
    const combinedData = [...oldPriceData, ...newPriceData];
    console.log(`Total de puntos combinados (antes de deduplicar): ${combinedData.length}`);

    // Usamos un Map para eliminar duplicados por timestamp de forma eficiente
    const uniqueDataMap = new Map();
    for (const entry of combinedData) {
        const timestamp = entry[0];
        const price = entry[1];
        uniqueDataMap.set(timestamp, price);
    }

    // Convertir el Map de nuevo a un array y ordenarlo por fecha (timestamp)
    const sortedUniqueData = Array.from(uniqueDataMap.entries())
        .sort((a, b) => a[0] - b[0]);

    console.log(`✅ El conjunto de datos final tiene ${sortedUniqueData.length} puntos únicos y ordenados.`);

    // --- 4. ESCRIBIR EL NUEVO ARCHIVO JSON ---
    const finalJsonObject = { prices: sortedUniqueData };
    fs.writeFileSync(outputJsonPath, JSON.stringify(finalJsonObject)); // No usamos pretty-print para un archivo más pequeño
    console.log(`🚀 ¡Éxito! Se han guardado los datos fusionados en: ${outputJsonPath}`);
}

mergeData().catch(error => {
    console.error('❌ Ocurrió un error durante el proceso:', error);
});
