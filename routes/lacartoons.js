const LACARTOONS_BASE = "https://www.lacartoons.com"

const cheerio = require("cheerio");
const streamParser = require("../lib/streamParsing.js");

exports.SearchLACartoons = async function (query) {
  // As search is tricky, we'll try to find it on the homepage or via categories
  // For now, let's try a simple fetch with a possible search param
  const url = `${LACARTOONS_BASE}/?tag=${encodeURIComponent(query)}`;
  return fetch(url).then(r => r.text()).then(html => {
    const $ = cheerio.load(html);
    const results = [];
    // Based on common patterns in these sites
    $(".serie-card, .card, .post").each((i, el) => {
      const title = $(el).find(".title, h2, h3").text().trim();
      const link = $(el).find("a").attr("href");
      const poster = $(el).find("img").attr("src");
      if (title && link && link.includes("/serie/")) {
        results.push({
          title,
          slug: link.split("/").pop(),
          poster: poster ? (poster.startsWith("http") ? poster : LACARTOONS_BASE + poster) : "",
          type: "series"
        });
      }
    });
    return results;
  });
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
      type: "series"
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
