const LACARTOONS_BASE = "https://www.lacartoons.com"

const fsPromises = require("fs/promises");
const cheerio = require("cheerio");
const streamParser = require("../lib/streamParsing.js");

exports.GetAiringAnimeFromWeb = async function () {
  let allSeries = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page < 50) { // Limit to 50 pages just in case
    try {
      const url = `${LACARTOONS_BASE}/?page=${page}`;
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      const pageSeries = [];

      $("a[href*='/serie/']").each((i, el) => {
        const link = $(el).attr("href");
        if (link && !link.includes("/capitulo/") && !link.includes("/serie/capitulo/")) {
          const title = $(el).text().trim() || $(el).find("img").attr("alt");
          const poster = $(el).find("img").attr("src");
          const slug = link.split("/").pop();
          
          if (title && slug) {
            pageSeries.push({
              title,
              slug,
              poster: poster ? (poster.startsWith("http") ? poster : LACARTOONS_BASE + poster) : "",
              type: "LACartoons"
            });
          }
        }
      });

      if (pageSeries.length === 0) {
        hasMore = false;
      } else {
        // Deduplicate
        const newSeries = pageSeries.filter(ps => !allSeries.some(as => as.slug === ps.slug));
        if (newSeries.length === 0 && page > 1) {
          hasMore = false;
        } else {
          allSeries = allSeries.concat(newSeries);
          page++;
        }
      }
    } catch (e) {
      console.error(`Error fetching LACartoons page ${page}:`, e);
      hasMore = false;
    }
  }
  return allSeries;
}

exports.GetAiringAnime = async function () {
  return fsPromises.readFile('./onair_lacartoons.json').then((data) => JSON.parse(data)).catch((err) => {
    console.error('\x1b[31mFailed reading LACartoons cache:\x1b[39m ' + err)
    return this.GetAiringAnimeFromWeb()
  })
}

exports.UpdateAiringAnimeFile = function () {
  return this.GetAiringAnimeFromWeb().then((titles) => {
    console.log(`\x1b[36mGot ${titles.length} LACartoons titles\x1b[39m, saving to cache`)
    return fsPromises.writeFile('./onair_lacartoons.json', JSON.stringify(titles))
  }).then(() => console.log('\x1b[32mLACartoons titles cached successfully!\x1b[39m')
  ).catch((err) => {
    console.error('\x1b[31mFailed caching LACartoons titles:\x1b[39m ' + err)
  })
}

exports.SearchLACartoons = async function (query) {
  return this.GetAiringAnime().then(series => {
    if (!query) return series.slice(0, 20);
    const fuzzysort = require('fuzzysort');
    const results = fuzzysort.go(query, series, { key: 'title', threshold: -10000 });
    return results.map(r => r.obj);
  });
}

exports.GetFeaturedSeries = function() {
  return this.GetAiringAnime().then(series => series.slice(0, 24));
}

exports.GetShowBySlug = async function (slug) {
  // slug is the ID from /serie/[ID] or /serie/capitulo/[ID]
  const url = slug.includes("capitulo") ? `${LACARTOONS_BASE}/serie/capitulo/${slug.split("/").pop()}` : `${LACARTOONS_BASE}/serie/${slug}`;
  
  return fetch(url).then(r => r.text()).then(html => {
    const $ = cheerio.load(html);
    
    // In LACartoons, the series title and episodes are on the same page
    const name = $("h1, .serie-title").first().text().trim() || "LACartoons Series";
    const description = $(".resena, .description, p").first().text().trim();
    const poster = $(".poster img, .serie-img img").attr("src");
    
    const videos = [];
    let currentSeason = 1;
    
    // The episodes are usually listed in a way that we can group by season
    $(".episodes-container, .episodes, .lista-episodios").find("div, a, li").each((i, el) => {
      const text = $(el).text().trim();
      if (text.toLowerCase().includes("temporada")) {
        const seasonMatch = text.match(/temporada\s+(\d+)/i);
        if (seasonMatch) currentSeason = parseInt(seasonMatch[1]);
      } else if (text.toLowerCase().includes("capitulo")) {
        const link = $(el).attr("href") || $(el).find("a").attr("href");
        if (link) {
          const epMatch = text.match(/capitulo\s+(\d+)/i);
          const epNumber = epMatch ? parseInt(epMatch[1]) : i;
          const epId = link.split("/").pop().split("?")[0];
          
          videos.push({
            id: `lacartoons:${epId}:${currentSeason}:${epNumber}`,
            title: text,
            season: currentSeason,
            episode: epNumber,
            number: epNumber,
            available: true
          });
        }
      }
    });

    // If no videos found with selectors, try a more broad approach for LACartoons specifically
    if (videos.length === 0) {
      $("a[href*='/serie/capitulo/']").each((i, el) => {
        const link = $(el).attr("href");
        const text = $(el).text().trim();
        const epId = link.split("/").pop().split("?")[0];
        const tParam = link.match(/t=(\d+)/);
        const season = tParam ? parseInt(tParam[1]) : 1;
        const epMatch = text.match(/Capitulo\s+(\d+)/i);
        const epNumber = epMatch ? parseInt(epMatch[1]) : i + 1;

        videos.push({
          id: `lacartoons:${epId}:${season}:${epNumber}`,
          title: text,
          season: season,
          episode: epNumber,
          number: epNumber,
          available: true
        });
      });
    }

    return {
      name,
      videos,
      poster: poster ? (poster.startsWith("http") ? poster : LACARTOONS_BASE + poster) : "",
      description,
      id: `lacartoons:${slug}`,
      type: "LACartoons"
    };
  });
}

exports.GetItemStreams = async function (epId) {
  const url = `${LACARTOONS_BASE}/serie/capitulo/${epId}`;
  
  return fetch(url).then(r => r.text()).then(async html => {
    const $ = cheerio.load(html);
    const streams = [];
    
    // Look for iframes that might be video players
    const iframes = $("iframe").map((i, el) => $(el).attr("src")).get();
    
    // Also look for video tags as provided by the user
    $("video source").each((i, el) => {
      const src = $(el).attr("src");
      if (src && (src.includes("m3u8") || src.includes("rpmvid.com"))) {
        streams.push({
          url: src,
          name: "LACartoons\nDirect",
          title: "HLS Stream (Direct)",
          behaviorHints: {
            notWebReady: false,
            bingeGroup: "lacartoons|direct"
          }
        });
      }
    });

    for (const src of iframes) {
      if (src.includes("cubeembed.rpmvid.com") || src.includes("rpmvid.com")) {
        try {
          const hlsLink = await streamParser.GetCubeEmbedLink(src);
          if (hlsLink) {
            streams.push({
              url: hlsLink,
              name: "LACartoons\nCubeEmbed",
              title: "HLS Stream",
              behaviorHints: {
                notWebReady: false,
                bingeGroup: "lacartoons|cubeembed"
              }
            });
          }
        } catch (e) {
          console.error("Error parsing CubeEmbed link:", e);
        }
      }
      
      // Also add as external link just in case
      streams.push({
        externalUrl: src,
        name: "LACartoons\nExternal",
        title: "Open in browser"
      });
    }
    
    return streams;
  });
}
