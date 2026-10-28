const http = require("http");
const fs = require("fs");
const path = require("path");

// Reutiliza el diccionario del ejercicio de contraseñas del navegador
const codigo = fs.readFileSync(path.join(__dirname, "..", "04-contrasena", "diccionario.js"), "utf8");
const DICCIONARIO = new Function(`${codigo}; return DICCIONARIO;`)();

const PUERTO = 3000;

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("No encontrado");
  }
  // X = número de palabras, por defecto 4
  const x = Number.parseInt(url.searchParams.get("palabras") ?? "4", 10);
  if (!Number.isInteger(x) || x < 1 || x > 20) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("El parámetro 'palabras' debe ser un entero entre 1 y 20");
  }
  const palabras = Array.from({ length: x }, () => DICCIONARIO[Math.floor(Math.random() * DICCIONARIO.length)]);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<h1>Contraseña</h1><p>${palabras.join("-")}</p>`);
});

servidor.listen(PUERTO, () => console.log(`http://localhost:${PUERTO}/?palabras=4`));
