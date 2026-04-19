const express = require("express")
const app = express()
const fsPromises = require("fs/promises")

function setCORS(_req, res, next) {
  res.header(`Access-Control-Allow-Origin`, `*`);
  res.header(`Access-Control-Allow-Methods`, `GET,PUT,POST,DELETE`);
  res.header(`Access-Control-Allow-Headers`, `Content-Type`);
  next();
}
app.use(setCORS);

app.use(express.static('public'))

function ReadManifest() {
  return fsPromises.readFile('./package.json', 'utf8').then((data) => {
    const packageJSON = JSON.parse(data);

    let manifest = {
      "id": "com.lacartoons.stremio",
      "version": packageJSON.version,
      "name": "LACartoons",
      "logo": "https://www.lacartoons.com/assets/favicon-da907fb005ebb8eef5d862002ec98c648a927a4fce446874a672b6daee984fb9.ico",
      "background": "https://images6.alphacoders.com/113/1135890.jpg",
      "description": packageJSON.description,
      "catalogs": [
        {
          "id": "lacartoons",
          "type": "series",
          "name": "LACartoons",
          "extra": [{ "name": "search", "isRequired": false }]
        }
      ],
      "resources": [
        "stream",
        "meta",
        "catalog"
      ],
      "types": [
        "series",
        "movie"
      ],
      "idPrefixes": [
        "lacartoons:",
        "tt"
      ]
    }
    return manifest;
  })
}

app.get("/manifest.json", (_req, res) => {
  ReadManifest().then((manif) => {
    res.header('Cache-Control', "max-age=86400, stale-while-revalidate=86400, stale-if-error=259200")
    res.json(manif);
  }).catch((err) => {
    res.status(500).statusMessage("Error reading file: " + err);
  })
})

const streams = require("./routes/streams");
app.use(streams);

const meta = require("./routes/meta");
app.use(meta);

const catalog = require("./routes/catalog");
app.use(catalog);

app.listen(process.env.PORT || 3000, () => {
  console.log(`\x1b[32mLACartoons Addon is listening on port ${process.env.PORT || 3000}\x1b[39m`)
  
  const lacartoonsAPI = require('./routes/lacartoons.js')
  lacartoonsAPI.UpdateAiringAnimeFile().then(() => {
    setInterval(lacartoonsAPI.UpdateAiringAnimeFile.bind(lacartoonsAPI), 86400000); //Update every 24h
  })
});
