'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

// Cache com TTL de 30 minutos para catálogo e 10 minutos para streams
const catalogCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });
const streamCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const BASE_URL = 'https://bludv1.xyz';
const WP_API = `${BASE_URL}/wp-json/wp/v2`;

// IDs de categorias do WordPress do BluDV
const CATEGORIES = {
  FILMES: 92,
  SERIES: 10,
};

// Headers para simular um navegador real
const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

/**
 * Faz requisição HTTP com retry automático
 */
async function httpGet(url, params = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        params,
        headers: HTTP_HEADERS,
        timeout: 15000,
      });
      return response.data;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

/**
 * Extrai informações de metadados do conteúdo HTML de um post
 */
function parsePostContent(html) {
  const $ = cheerio.load(html);
  const info = {};

  // Extrair imagem do poster
  const posterImg = $('img').first();
  if (posterImg.length) {
    const src = posterImg.attr('src');
    if (src && !src.startsWith('data:')) {
      info.poster = src;
    }
  }

  // Extrair campos de informação usando regex no texto
  const text = $.text();

  const extractField = (fieldName) => {
    const patterns = [
      new RegExp(`${fieldName}:\\s*([^\\n\\r]+)`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  info.tituloOriginal = extractField('Título Original');
  info.tituloTraduzido = extractField('Título Traduzido');
  info.genero = extractField('Gênero');
  info.duracao = extractField('Duração');
  info.lancamento = extractField('Lançamento');
  info.qualidade = extractField('Qualidade');
  info.audio = extractField('Áudio');
  info.tamanho = extractField('Tamanho');

  // Extrair sinopse
  const sinopseMatch = text.match(/SINOPSE:\s*([\s\S]+?)(?:\n\n|\r\n\r\n|Trailer|VERSÃO|EPISÓDIO|$)/i);
  if (sinopseMatch) {
    info.sinopse = sinopseMatch[1].trim().substring(0, 1000);
  }

  // Extrair link IMDb
  const imdbLink = $('a[href*="imdb.com"]').first().attr('href');
  if (imdbLink) {
    const imdbMatch = imdbLink.match(/tt\d+/);
    if (imdbMatch) info.imdbId = imdbMatch[0];
  }

  // Extrair links magnet
  info.magnets = [];
  $('a[href^="magnet:"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href) {
      info.magnets.push({ url: href, label: text || `Link ${i + 1}` });
    }
  });

  // Extrair links de episódios com padrão "EPISÓDIO XX:"
  info.episodios = [];
  const episodioPattern = /EPISÓDIO\s+(\d+)[:\s]+.*?href="(magnet:[^"]+)"/gi;
  const htmlStr = html;
  let epMatch;
  while ((epMatch = episodioPattern.exec(htmlStr)) !== null) {
    info.episodios.push({
      numero: parseInt(epMatch[1]),
      magnet: epMatch[2],
    });
  }

  // Se não encontrou episódios com o padrão acima, usar magnets gerais
  if (info.episodios.length === 0 && info.magnets.length > 0) {
    info.episodios = info.magnets.map((m, i) => ({
      numero: i + 1,
      magnet: m.url,
    }));
  }

  return info;
}

/**
 * Converte um post da API WordPress em objeto de metadados Stremio
 */
function wpPostToMeta(post, type) {
  const title = post.title?.rendered || '';
  // Limpar título removendo qualidades e formatos
  const cleanTitle = title
    .replace(/\s*\(?\d{4}\)?\s*(WEB-DL|BluRay|BDRip|DVDRip|WEBRip|HDTV|4K|1080p|720p|480p|Dual\s*Áudio|Dublado|Legendado|Nacional|Torrent).*$/i, '')
    .replace(/\s+\d+[aª°]\s+Temporada.*$/i, '')
    .trim();

  // Extrair ano
  const yearMatch = title.match(/\((\d{4})\)/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  // Extrair temporada para séries
  const seasonMatch = title.match(/(\d+)[aª°]\s+Temporada/i);
  const season = seasonMatch ? parseInt(seasonMatch[1]) : null;

  // Extrair ID do post
  const postId = post.id;

  // Extrair imagem do excerpt/content se disponível
  let poster = null;
  if (post.content?.rendered) {
    const $ = cheerio.load(post.content.rendered);
    const img = $('img[src]').filter((i, el) => {
      const src = $(el).attr('src');
      return src && !src.startsWith('data:');
    }).first();
    if (img.length) poster = img.attr('src');
  }

  const meta = {
    id: `bludv:${postId}`,
    type: type,
    name: cleanTitle,
    year: year,
    poster: poster,
    description: null,
    genres: [],
    bludvPostId: postId,
    bludvUrl: post.link,
    season: season,
  };

  return meta;
}

/**
 * Busca catálogo de filmes ou séries via API WordPress
 */
async function getCatalog(type, page = 1, search = null) {
  const cacheKey = `catalog:${type}:${page}:${search || ''}`;
  const cached = catalogCache.get(cacheKey);
  if (cached) return cached;

  const categoryId = type === 'movie' ? CATEGORIES.FILMES : CATEGORIES.SERIES;
  const perPage = 20;

  try {
    let posts;

    if (search) {
      // Busca por texto
      posts = await httpGet(`${WP_API}/posts`, {
        search: search,
        categories: categoryId,
        per_page: perPage,
        page: page,
        _fields: 'id,title,link,content,categories,date',
        orderby: 'relevance',
      });
    } else {
      // Listagem normal
      posts = await httpGet(`${WP_API}/posts`, {
        categories: categoryId,
        per_page: perPage,
        page: page,
        _fields: 'id,title,link,content,categories,date',
        orderby: 'date',
        order: 'desc',
      });
    }

    const metas = posts.map(post => wpPostToMeta(post, type));
    catalogCache.set(cacheKey, metas);
    return metas;
  } catch (err) {
    console.error(`[BluDV] Erro ao buscar catálogo ${type}:`, err.message);
    return [];
  }
}

/**
 * Busca detalhes completos de um post pelo ID
 */
async function getPostDetails(postId) {
  const cacheKey = `post:${postId}`;
  const cached = streamCache.get(cacheKey);
  if (cached) return cached;

  try {
    const post = await httpGet(`${WP_API}/posts/${postId}`, {
      _fields: 'id,title,link,content,categories,date',
    });

    const info = parsePostContent(post.content?.rendered || '');
    const result = {
      postId,
      title: post.title?.rendered || '',
      url: post.link,
      ...info,
    };

    streamCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`[BluDV] Erro ao buscar post ${postId}:`, err.message);
    return null;
  }
}

/**
 * Busca metadados completos de um item pelo ID do addon
 */
async function getMeta(id, type) {
  const postId = id.replace('bludv:', '');
  const cacheKey = `meta:${postId}`;
  const cached = catalogCache.get(cacheKey);
  if (cached) return cached;

  try {
    const post = await httpGet(`${WP_API}/posts/${postId}`, {
      _fields: 'id,title,link,content,categories,date',
    });

    const info = parsePostContent(post.content?.rendered || '');
    const meta = wpPostToMeta(post, type);

    // Enriquecer com dados do conteúdo
    if (info.poster) meta.poster = info.poster;
    if (info.sinopse) meta.description = info.sinopse;
    if (info.genero) {
      meta.genres = info.genero.split('|').map(g => g.trim()).filter(Boolean);
    }
    if (info.imdbId) meta.imdbId = info.imdbId;
    if (info.lancamento) meta.year = parseInt(info.lancamento) || meta.year;

    // Para séries, criar lista de vídeos (episódios)
    if (type === 'series' && info.episodios.length > 0) {
      meta.videos = info.episodios.map(ep => ({
        id: `${meta.id}:ep${ep.numero}`,
        title: `Episódio ${ep.numero}`,
        season: meta.season || 1,
        episode: ep.numero,
        released: new Date().toISOString(),
      }));
    }

    catalogCache.set(cacheKey, meta);
    return meta;
  } catch (err) {
    console.error(`[BluDV] Erro ao buscar meta ${postId}:`, err.message);
    return null;
  }
}

/**
 * Extrai o hash de infohash de um link magnet
 */
function extractInfohash(magnetUrl) {
  const match = magnetUrl.match(/xt=urn:btih:([a-fA-F0-9]{40}|[A-Z2-7]{32})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Busca streams (links magnet) para um item
 */
async function getStreams(id, type, season, episode) {
  const postId = id.replace('bludv:', '').split(':')[0];
  const cacheKey = `streams:${postId}:${season || 0}:${episode || 0}`;
  const cached = streamCache.get(cacheKey);
  if (cached) return cached;

  try {
    const details = await getPostDetails(postId);
    if (!details) return [];

    const streams = [];

    if (type === 'movie') {
      // Para filmes, usar todos os links magnet disponíveis
      for (const magnet of details.magnets) {
        const infohash = extractInfohash(magnet.url);
        if (infohash) {
          streams.push({
            name: '🔵 BluDV',
            title: `${magnet.label}\n${details.tituloOriginal || ''}`,
            infoHash: infohash,
            magnetUrl: magnet.url,
            behaviorHints: {
              bingeGroup: `bludv-${postId}`,
            },
          });
        }
      }
    } else if (type === 'series') {
      // Para séries, filtrar por episódio
      const targetEp = episode ? parseInt(episode) : 1;

      for (const ep of details.episodios) {
        if (ep.numero === targetEp) {
          const infohash = extractInfohash(ep.magnet);
          if (infohash) {
            streams.push({
              name: '🔵 BluDV',
              title: `Episódio ${ep.numero}\n${details.tituloOriginal || ''}`,
              infoHash: infohash,
              magnetUrl: ep.magnet,
              behaviorHints: {
                bingeGroup: `bludv-${postId}`,
              },
            });
          }
        }
      }

      // Se não encontrou o episódio específico, tentar todos
      if (streams.length === 0) {
        for (const ep of details.episodios) {
          const infohash = extractInfohash(ep.magnet);
          if (infohash) {
            streams.push({
              name: '🔵 BluDV',
              title: `Episódio ${ep.numero}\n${details.tituloOriginal || ''}`,
              infoHash: infohash,
              magnetUrl: ep.magnet,
              behaviorHints: {
                bingeGroup: `bludv-${postId}`,
              },
            });
          }
        }
      }
    }

    streamCache.set(cacheKey, streams);
    return streams;
  } catch (err) {
    console.error(`[BluDV] Erro ao buscar streams ${postId}:`, err.message);
    return [];
  }
}

module.exports = {
  getCatalog,
  getMeta,
  getStreams,
  getPostDetails,
  extractInfohash,
};
