const http = require("http");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const config = require("./config.json");
const productos = require("./productos.json");

const PUERTO = 3001;
const RUTA_ESTADO = path.join(__dirname, "estado.json");

// Última comprobación de cada producto, indexada por URL. Se recupera del disco
// para no perder desde cuándo está agotado un producto al reiniciar.
let estado = fs.existsSync(RUTA_ESTADO) ? JSON.parse(fs.readFileSync(RUTA_ESTADO, "utf8")) : {};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Lenovo incluye en el HTML un JSON-LD (schema.org) con precio y disponibilidad,
// así que no hace falta ejecutar JavaScript
async function consultar(producto) {
  const res = await fetch(producto.url, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    const datos = JSON.parse($(script).text());
    if (datos["@type"] === "Product") {
      return {
        precio: datos.offers.price,
        // "http://schema.org/InStock" -> "InStock"
        disponibilidad: datos.offers.availability.split("/").pop(),
      };
    }
  }
  throw new Error("No se encontró el JSON-LD del producto");
}

async function comprobarTodos() {
  for (const producto of productos) {
    const ahora = new Date().toISOString();
    const anterior = estado[producto.url];
    try {
      const { precio, disponibilidad } = await consultar(producto);
      const cambio = !anterior || anterior.disponibilidad !== disponibilidad;
      estado[producto.url] = {
        nombre: producto.nombre,
        precio,
        disponibilidad,
        ultimaComprobacion: ahora,
        // Solo se actualiza cuando cambia la disponibilidad
        desde: cambio ? ahora : anterior.desde,
      };
      console.log(`${producto.nombre}: ${disponibilidad} (${precio} €)`);
      if (anterior && cambio) console.log(`  CAMBIO: ${anterior.disponibilidad} -> ${disponibilidad}`);
    } catch (err) {
      console.error(`${producto.nombre}: error (${err.message})`);
    }
    // No se hacen muchas peticiones seguidas
    await dormir(config.pausaEntrePeticionesSegundos * 1000);
  }
  fs.writeFileSync(RUTA_ESTADO, JSON.stringify(estado, null, 2));
}

comprobarTodos();
setInterval(comprobarTodos, config.intervaloMinutos * 60 * 1000);

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(Object.values(estado)));
  })
  .listen(PUERTO, () => console.log(`http://localhost:${PUERTO}`));
