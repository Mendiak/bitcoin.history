#!/usr/bin/env node
/**
 * Notifica a IndexNow (Bing, Yandex y otros) que las URLs han cambiado.
 * Requiere que el archivo /<KEY>.txt esté publicado en el dominio.
 *
 * Uso: node scripts/indexnow.mjs
 */

const HOST = 'bitcoin-history.vercel.app';
const KEY = '949ccd040be5de489ea82b3d66610686';
const URLS = [`https://${HOST}/`, `https://${HOST}/halving.html`];

const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: URLS,
    }),
});

console.log(`IndexNow: ${response.status} ${response.statusText}`);
if (!response.ok) {
    console.error(await response.text());
    process.exit(1);
}
