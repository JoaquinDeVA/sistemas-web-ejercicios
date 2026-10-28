// Recomendaciones del NIST: mínimo 8 caracteres, recomendado 15
const LONGITUD_MINIMA = 8;
const LONGITUD_RECOMENDADA = 15;

// Número aleatorio entre 0 y max-1 usando el generador criptográfico del navegador
// (Math.random no es seguro para contraseñas)
function aleatorio(max) {
  const valor = new Uint32Array(1);
  crypto.getRandomValues(valor);
  return valor[0] % max;
}

function capitalizar(palabra) {
  return palabra.charAt(0).toUpperCase() + palabra.slice(1);
}

function generarContrasena(numPalabras, mayusculas, noRepetir, separador) {
  const disponibles = [...DICCIONARIO];
  const elegidas = [];

  for (let i = 0; i < numPalabras; i++) {
    const indice = aleatorio(disponibles.length);
    let palabra = disponibles[indice];

    // Si no se permiten repeticiones, se quita la palabra de las disponibles
    if (noRepetir) {
      disponibles.splice(indice, 1);
    }
    if (mayusculas) {
      palabra = capitalizar(palabra);
    }
    elegidas.push(palabra);
  }

  return elegidas.join(separador);
}

document.getElementById("formulario").addEventListener("submit", (evento) => {
  evento.preventDefault();

  const numPalabras = Number(document.getElementById("numPalabras").value);
  const mayusculas = document.getElementById("mayusculas").checked;
  const noRepetir = document.getElementById("noRepetir").checked;
  const separador = document.getElementById("separador").value;

  const contrasena = generarContrasena(numPalabras, mayusculas, noRepetir, separador);

  document.getElementById("resultado").textContent =
    `La contraseña generada es: ${contrasena} (${contrasena.length} caracteres)`;

  const aviso = document.getElementById("aviso");
  if (contrasena.length < LONGITUD_MINIMA) {
    aviso.textContent = `Demasiado corta: el NIST exige al menos ${LONGITUD_MINIMA} caracteres.`;
  } else if (contrasena.length < LONGITUD_RECOMENDADA) {
    aviso.textContent = `Válida, pero el NIST recomienda al menos ${LONGITUD_RECOMENDADA} caracteres.`;
  } else {
    aviso.textContent = "";
  }
});
