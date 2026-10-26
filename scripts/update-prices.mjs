#!/usr/bin/env node
/**
 * Actualiza public/bitcoin-price-history.json con las velas diarias de Coinbase.
 *
 * - Conserva los datos históricos existentes (Kaggle/Bitcoinity).
 * - Sustituye el último día parcial y añade los días nuevos.
 * - Usa el cierre diario (close) en UTC, con marca de tiempo a las 23:59 como
 *   el resto de la serie reciente.
 *
 * Uso: node scripts/update-prices.mjs [--dry-run]
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATA_URL = 'https://api.exchange.coinbase.com/products/BTC-USD/candles';
const GRANULARITY = 86400; // velas diarias
const DAY_MS = 86400000;
const CANDLE_CLOSE_OFFSET_MS = 86340000; // 23:59:00 UTC
const MAX_CANDLES_PER_REQUEST = 300;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'public', 'bitcoin-price-history.json');
const dryRun = process.argv.includes('--dry-run');

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

function buildCandleUrl(fromMs, toMs) {
    const start = new Date(fromMs).toISOString();
    const end = new Date(toMs).toISOString();
    return `${DATA_URL}?granularity=${GRANULARITY}&start=${start}&end=${end}`;
}

async function fetchCandles(fromMs, toMs) {
    const res = await fetch(buildCandleUrl(fromMs, toMs), {
        headers: { 'User-Agent': 'bitcoin-history/1.0 (+https://bitcoin-history.vercel.app)' },
    });

    if (!res.ok) {
        throw new Error(`Coinbase respondió ${res.status}: ${await res.text()}`);
    }

    const candles = await res.json();
    if (!Array.isArray(candles)) throw new Error('Respuesta inesperada de Coinbase');

    // [time, low, high, open, close, volume] y vienen de más reciente a más antigua
    return candles.map(([time, , , , close]) => ({ dayMs: time * 1000, close: Number(close) }));
}

async function main() {
    const raw = JSON.parse(await readFile(dataPath, 'utf8'));
    if (!Array.isArray(raw.prices) || raw.prices.length === 0) {
        throw new Error('El JSON no tiene una serie de precios válida');
    }

    const existing = raw.prices;
    const lastPointMs = existing[existing.length - 1][0];
    const lastDayMs = Date.parse(`${dayKey(lastPointMs)}T00:00:00Z`);

    console.log(`Serie actual: ${existing.length} puntos, hasta ${dayKey(lastPointMs)}`);

    // Recorremos desde el último día (para corregir el punto parcial) hasta hoy,
    // en bloques de 300 velas.
    const todayMs = Date.now();
    const newByDay = new Map();

    for (let cursor = lastDayMs; cursor <= todayMs; cursor += MAX_CANDLES_PER_REQUEST * DAY_MS) {
        const chunkEnd = Math.min(cursor + (MAX_CANDLES_PER_REQUEST - 1) * DAY_MS, todayMs);
        const candles = await fetchCandles(cursor, chunkEnd);

        for (const { dayMs, close } of candles) {
            if (Number.isFinite(close) && close > 0) {
                newByDay.set(dayKey(dayMs), close);
            }
        }
    }

    if (newByDay.size === 0) {
        console.log('No hay velas nuevas todavía.');
        return;
    }

    // Fusionamos: todo lo anterior al último día se conserva tal cual; el último
    // día y los posteriores se reemplazan por el cierre oficial.
    const merged = existing.filter(([ts]) => Date.parse(`${dayKey(ts)}T00:00:00Z`) < lastDayMs);
    const addedDays = [];

    for (const [day, close] of [...newByDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const dayMs = Date.parse(`${day}T00:00:00Z`);
        merged.push([dayMs + CANDLE_CLOSE_OFFSET_MS, Number(close.toFixed(2))]);
        addedDays.push(day);
    }

    merged.sort((a, b) => a[0] - b[0]);

    const firstNew = addedDays[0];
    const lastNew = addedDays[addedDays.length - 1];
    console.log(`Añadidos/actualizados ${addedDays.length} días: ${firstNew} → ${lastNew}`);
    console.log(`Total: ${merged.length} puntos (antes ${existing.length})`);

    if (dryRun) {
        console.log('Dry run: no se escribe el archivo.');
        return;
    }

    await writeFile(dataPath, JSON.stringify({ prices: merged }), 'utf8');
    console.log(`Actualizado ${path.relative(root, dataPath)}`);

    // Mantener el lastmod del sitemap alineado con la serie
    const sitemapPath = path.join(root, 'public', 'sitemap.xml');
    try {
        const sitemap = await readFile(sitemapPath, 'utf8');
        const updated = sitemap.replace(/<lastmod>.*?<\/lastmod>/g, `<lastmod>${lastNew}</lastmod>`);
        if (updated !== sitemap) {
            await writeFile(sitemapPath, updated, 'utf8');
            console.log(`Actualizado ${path.relative(root, sitemapPath)}`);
        }
    } catch {
        // El sitemap es opcional
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
