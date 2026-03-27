'use strict';

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { getCatalog, getMeta, getStreams } = require('./bludv');

// ============================================================
// MANIFEST DO ADDON (SIMPLIFICADO - TORRENT DIRETO)
// ============================================================

const manifest = {
  id: 'community.bludv.stremio',
  version: '1.0.0',
  name: 'BluDV (Torrent)',
  description: 'Filmes e Séries do BluDV. Conteúdo em Português com Dual Áudio. (Apenas Torrent)',
  logo: 'https://bludv1.xyz/wp-content/uploads/2020/09/cropped-logo-bludv-192x192.png',
  resources: ['catalog', 'meta', 'stream'],
  types: ['movie', 'series'],
  idPrefixes: ['bludv:'],
  catalogs: [
    {
      id: 'bludv-filmes',
      type: 'movie',
      name: 'BluDV Filmes',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false },
      ],
    },
    {
      id: 'bludv-series',
      type: 'series',
      name: 'BluDV Séries',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false },
      ],
    },
  ],
  // Configuração para reivindicar autoria no stremio-addons.net
  stremioAddonsConfig: {
    emissor: "https://stremio-addons.net/users/paeveio",
    assinatura: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..aXC95dmM4hGiAdTcHHzqVw.0jaoNps2XTE6kzEVmNP501iwH1ktJdtdkf7MGj2ucdDX9qXNGNz8H3kVCfxta87gSMZl8XKcUxrNpyUHCWw0TgbzVgBWmBhP8AO5yjkgrd8PEKWM7F3X70-DSkXN4jbi.vQxPNGd2ZFq-L5ElE1b5sw"
  }
};

// ============================================================
// HANDLERS DO ADDON
// ============================================================

const builder = new addonBuilder(manifest);

// Catálogo: Lista filmes e séries do BluDV
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  console.log(`[Catalog] type=${type} id=${id}`);
  const search = extra?.search || null;
  const skip = parseInt(extra?.skip || 0);
  const page = Math.floor(skip / 20) + 1;

  try {
    const metas = await getCatalog(type, page, search);
    return {
      metas: metas.map(m => ({
        id: m.id,
        type: m.type,
        name: m.name,
        poster: m.poster || null,
        year: m.year || null,
        description: m.description || null,
        genres: m.genres || [],
      })),
      cacheMaxAge: 1800,
    };
  } catch (err) {
    console.error('[Catalog] Erro:', err.message);
    return { metas: [] };
  }
});

// Meta: Detalhes do filme/série
builder.defineMetaHandler(async ({ type, id }) => {
  console.log(`[Meta] type=${type} id=${id}`);
  if (!id.startsWith('bludv:')) return { meta: null };

  try {
    const meta = await getMeta(id, type);
    if (!meta) return { meta: null };
    
    const result = {
      id: meta.id,
      type: meta.type,
      name: meta.name,
      poster: meta.poster || null,
      background: meta.background || null,
      description: meta.description || null,
      year: meta.year || null,
      genres: meta.genres || [],
    };

    if (meta.videos && meta.videos.length > 0) {
      result.videos = meta.videos;
    }

    return { meta: result, cacheMaxAge: 3600 };
  } catch (err) {
    console.error('[Meta] Erro:', err.message);
    return { meta: null };
  }
});

// Stream: Links torrent diretos
builder.defineStreamHandler(async ({ type, id }) => {
  console.log(`[Stream] type=${type} id=${id}`);
  if (!id.startsWith('bludv:')) return { streams: [] };

  // Parsear episódio do ID (ex: bludv:12345:1:5 = postId:season:episode)
  const parts = id.replace('bludv:', '').split(':');
  const postId = parts[0];
  const season = parts[1] ? parseInt(parts[1]) : null;
  const episode = parts[2] ? parseInt(parts[2]) : null;

  try {
    const rawStreams = await getStreams(`bludv:${postId}`, type, season, episode);
    const streams = rawStreams.map(s => ({
      name: '🔵 BluDV | Torrent',
      title: s.title || 'BluDV',
      infoHash: s.infoHash,
      fileIdx: 0,
      behaviorHints: s.behaviorHints || {},
    }));

    return { streams, cacheMaxAge: 600 };
  } catch (err) {
    console.error('[Stream] Erro:', err.message);
    return { streams: [] };
  }
});

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================

const PORT = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port: PORT });

console.log(`\n🔵 BluDV Stremio Addon (Simplificado) iniciado!`);
console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
console.log(`📋 Manifest: http://localhost:${PORT}/manifest.json\n`);
