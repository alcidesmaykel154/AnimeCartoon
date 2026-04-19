const express = require("express")
const metas = express.Router()
const lacartoonsAPI = require('./lacartoons.js')

function HandleMetaRequest(req, res, next) {
  console.log(`\x1b[96mMeta Request:\x1b[39m ${req.originalUrl}`)
  const idDetails = req.params.videoId.split(':')
  const prefix = idDetails[0]
  const slug = idDetails[1]

  if (prefix === "lacartoons") {
    lacartoonsAPI.GetShowBySlug(slug).then((animeMeta) => {
      res.header('Cache-Control', "max-age=86400, stale-while-revalidate=86400, stale-if-error=259200")
      res.json({ meta: animeMeta });
    }).catch((err) => {
      console.error('\x1b[31mMeta error:\x1b[39m ' + err)
      res.json({ meta: {} });
    })
  } else {
    res.json({ meta: {} });
  }
}

metas.get("/meta/:type/:videoId.json", HandleMetaRequest)

module.exports = metas;
