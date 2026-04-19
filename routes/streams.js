const express = require("express")
const stream = express.Router()
const lacartoonsAPI = require('./lacartoons.js')

function HandleStreamRequest(req, res, next) {
  console.log(`\x1b[96mStream Request:\x1b[39m ${req.originalUrl}`)
  const idDetails = req.params.videoId.split(':')
  const prefix = idDetails[0]
  const epId = idDetails[1]

  if (prefix === "lacartoons") {
    lacartoonsAPI.GetItemStreams(epId).then((streams) => {
      res.header('Cache-Control', "max-age=86400, stale-while-revalidate=86400, stale-if-error=259200")
      res.json({ streams });
    }).catch((err) => {
      console.error('\x1b[31mStream error:\x1b[39m ' + err)
      res.json({ streams: [] });
    })
  } else {
    res.json({ streams: [] });
  }
}

stream.get("/stream/:type/:videoId/*.json", HandleStreamRequest)
stream.get("/stream/:type/:videoId.json", HandleStreamRequest)

module.exports = stream;
