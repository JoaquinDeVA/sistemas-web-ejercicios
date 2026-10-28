const http = require("http");
const crypto = require("crypto");
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
  // crypto.randomInt: Math.random no es seguro para contraseñas
  let palabras = Array.from({ length: x }, () => DICCIONARIO[crypto.randomInt(DICCIONARIO.length)]);
  if (url.searchParams.get("mayusculas") === "1") {
    palabras = palabras.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  }
  const contrasena = palabras.join(url.searchParams.get("separador") ?? "-");

  if (url.searchParams.get("formato") === "json") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ contrasena, longitud: contrasena.length }));
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<h1>Contraseña</h1><p>${contrasena}</p>`);
});

servidor.listen(PUERTO, () => console.log(`http://localhost:${PUERTO}/?palabras=4`));
