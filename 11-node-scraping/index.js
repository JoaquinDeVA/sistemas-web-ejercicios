const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const config = require("./config.json");

const PUERTO = 3001;
const RUTA_ESTADO = path.join(__dirname, "estado.json");

// Estado de cada configuración, indexado por código de producto. Se recupera del
// disco para no perder desde cuándo está agotada una configuración al reiniciar.
let estado = fs.existsSync(RUTA_ESTADO) ? JSON.parse(fs.readFileSync(RUTA_ESTADO, "utf8")) : {};

// La búsqueda de Lenovo pinta las tarjetas con JavaScript, por eso se usa un navegador.
// Una sola carga por ciclo: no se hacen muchas peticiones en poco tiempo.
async function leerBusqueda() {
  const navegador = await puppeteer.launch({ executablePath: config.chrome, headless: true });
  try {
    const pagina = await navegador.newPage();
    await pagina.goto(config.urlBusqueda, { waitUntil: "networkidle2" });
    await pagina.waitForSelector("li.product_item .product_title a");
    return await pagina.$$eval("li.product_item", (tarjetas) =>
      tarjetas.map((li) => {
        const enlace = li.querySelector(".product_title a");
        const texto = li.innerText;
        // Con descuento salen dos precios, el último es el vigente
        const precios = [...texto.matchAll(/(\d[\d.]*,\d\d)\s*€/g)].map((m) => m[1]);
        return {
          codigo: [...li.classList].find((c) => c.startsWith("productCode_")).slice("productCode_".length),
          modelo: enlace.innerText.trim(),
          url: new URL(enlace.getAttribute("href"), location.origin).href,
          precio: precios[precios.length - 1],
          ram: (texto.match(/\d+ GB \w*DDR\w*/) || [""])[0],
          so: (texto.match(/Windows 11 \w+|FreeDOS|Sin sistema operativo/) || ["Sin SO"])[0],
          agotado: /NO DISPONIBLE/i.test(texto),
        };
      })
    );
  } finally {
    await navegador.close();
  }
}

async function comprobar() {
  try {
    const ahora = new Date().toISOString();
    // La búsqueda también devuelve otros modelos, solo interesan los E16
    for (const p of (await leerBusqueda()).filter((p) => p.modelo.includes("E16"))) {
      const disponibilidad = p.agotado ? "OutOfStock" : "InStock";
      const anterior = estado[p.codigo];
      const cambio = !anterior || anterior.disponibilidad !== disponibilidad;
      estado[p.codigo] = {
        nombre: `${p.modelo} · ${p.ram} · ${p.so} (${p.codigo})`,
        url: p.url,
        precio: p.precio,
        disponibilidad,
        ultimaComprobacion: ahora,
        // Solo se actualiza cuando cambia la disponibilidad
        desde: cambio ? ahora : anterior.desde,
      };
      if (anterior && cambio) console.log(`CAMBIO ${p.codigo}: ${anterior.disponibilidad} -> ${disponibilidad}`);
    }
    fs.writeFileSync(RUTA_ESTADO, JSON.stringify(estado, null, 2));
    const agotados = Object.values(estado).filter((e) => e.disponibilidad === "OutOfStock").length;
    console.log(`${new Date().toLocaleTimeString()}: ${Object.keys(estado).length} configuraciones, ${agotados} agotadas`);
  } catch (err) {
    console.error("Error al comprobar:", err.message);
  }
}

comprobar();
setInterval(comprobar, config.intervaloMinutos * 60 * 1000);

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(Object.values(estado)));
  })
  .listen(PUERTO, () => console.log(`http://localhost:${PUERTO}`));
