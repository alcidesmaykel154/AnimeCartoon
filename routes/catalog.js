const express = require("express")
const catalog = express.Router()
const lacartoonsAPI = require('./lacartoons.js')

function SearchParamsRegex(extraParams) {
  if (extraParams !== undefined) {
    const paramMap = new Map()
    const keyVals = extraParams.split('&');
    for (let keyVal of keyVals) {
      const keyValArr = keyVal.split('=')
      const param = keyValArr[0]; const val = keyValArr[1];
      paramMap.set(param, val)
    }
    return Object.fromEntries(paramMap)
  } else return {}
}

function HandleCatalogRequest(req, res, next) {
  console.log(`\x1b[96mCatalog Request [${req.params.type}]:\x1b[39m ${req.originalUrl}`)
  const extraParams = SearchParamsRegex(req.params[0])
  
  let catalogPromise
  if (extraParams.search) {
    catalogPromise = lacartoonsAPI.SearchLACartoons(extraParams.search)
  } else if (extraParams.genre) {
    const category = lacartoonsAPI.CATEGORIES.find(c => c.name === decodeURIComponent(extraParams.genre));
    if (category) {
      catalogPromise = lacartoonsAPI.GetByCategory(category.id)
    } else {
      catalogPromise = lacartoonsAPI.GetFeaturedSeries()
    }
  } else {
    catalogPromise = lacartoonsAPI.GetFeaturedSeries()
  }

  catalogPromise.then((metas) => {
    const formattedMetas = metas.map((item) => ({
      id: `lacartoons:${item.slug}`,
      type: "LACartoons",
      name: item.title,
      poster: item.poster,
      description: item.overview
    }))
    res.header('Cache-Control', "max-age=86400, stale-while-revalidate=86400, stale-if-error=259200")
    res.json({ metas: formattedMetas });
  }).catch((err) => {
    console.error('\x1b[31mCatalog error:\x1b[39m ' + err)
    res.json({ metas: [] });
  })
}

catalog.get("/catalog/:type/:videoId/*.json", HandleCatalogRequest)
catalog.get("/catalog/:type/:videoId.json", HandleCatalogRequest)

module.exports = catalog;
