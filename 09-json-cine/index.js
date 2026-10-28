const http = require("http");
const { peliculas } = require("./cartelera.json");

const PUERTO = 3003;

function responder(res, codigo, cuerpo) {
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(cuerpo));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const partes = url.pathname.split("/").filter(Boolean);
    if (req.method !== "GET" || partes[0] !== "peliculas" || partes.length > 2) {
      return responder(res, 404, { error: "No encontrado" });
    }

    // GET /peliculas/:titulo
    if (partes[1]) {
      const titulo = decodeURIComponent(partes[1]).toLowerCase();
      const pelicula = peliculas.find((p) => p.titulo.toLowerCase() === titulo);
      return pelicula ? responder(res, 200, pelicula) : responder(res, 404, { error: "Película no encontrada" });
    }

    // GET /peliculas?sala=17: solo las películas con sesión en esa sala
    const sala = url.searchParams.get("sala");
    const resultado = sala ? peliculas.filter((p) => p.sesiones.some((s) => s.sala === Number(sala))) : peliculas;
    responder(res, 200, resultado);
  })
  .listen(PUERTO, () => console.log(`http://localhost:${PUERTO}/peliculas`));
