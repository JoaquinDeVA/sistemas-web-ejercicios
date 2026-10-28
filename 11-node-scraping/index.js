const http = require("http");
const cheerio = require("cheerio");
const config = require("./config.json");

const PUERTO = 3001;
let ultimo = null;

// Descarga el HTML y extrae el título y el primer párrafo
async function descargar() {
  try {
    const res = await fetch(config.url);
    const $ = cheerio.load(await res.text());
    ultimo = {
      fecha: new Date().toISOString(),
      titulo: $("h1").first().text().trim(),
      parrafo: $("p").first().text().trim(),
    };
    console.log(ultimo);
  } catch (err) {
    console.error("Error al descargar:", err.message);
  }
}

descargar();
setInterval(descargar, config.intervaloSegundos * 1000);

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(ultimo));
  })
  .listen(PUERTO, () => console.log(`http://localhost:${PUERTO}`));
