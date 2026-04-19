const https = require('https');

const STEAM_CDN = 'https://community.cloudflare.steamstatic.com/economy/image/';

const PLACEHOLDER_HASHES = [
  'class/730/310777529/360fx360f',
  'class/730/310777530/360fx360f',
  'class/730/310777531/360fx360f',
  'class/730/310777532/360fx360f',
];

function buildImageUrl(hash) {
  if (!hash) return null;
  if (hash.startsWith('http')) return hash;
  if (hash.includes('/360fx360f')) return `${STEAM_CDN}${hash}`;
  return `${STEAM_CDN}${hash}/360fx360f`;
}

function getPlaceholder(seed = 0) {
  const idx = Math.abs(Number(seed) || 0) % PLACEHOLDER_HASHES.length;
  return `${STEAM_CDN}${PLACEHOLDER_HASHES[idx]}`;
}

function fetchJson(url, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (cs2-skins-arena/1.0)',
          Accept: 'application/json',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Steam API timeout'));
    });
  });
}

async function fetchFromSteamMarket(marketHashName) {
  const url = `https://steamcommunity.com/market/search/render/?query=${encodeURIComponent(
    marketHashName
  )}&start=0&count=1&search_descriptions=0&appid=730&norender=1`;
  const json = await fetchJson(url);
  const hit = json?.results?.[0]?.asset_description?.icon_url;
  if (!hit) throw new Error('No icon found for ' + marketHashName);
  return buildImageUrl(hit);
}

async function getSkinImage(marketHashName, seed = 0) {
  try {
    const url = await fetchFromSteamMarket(marketHashName);
    return { url, source: 'steam' };
  } catch (err) {
    console.warn(`[steamSkins] fallback placeholder for "${marketHashName}": ${err.message}`);
    return { url: getPlaceholder(seed), source: 'placeholder' };
  }
}

module.exports = {
  getSkinImage,
  fetchFromSteamMarket,
  buildImageUrl,
  getPlaceholder,
  STEAM_CDN,
};
