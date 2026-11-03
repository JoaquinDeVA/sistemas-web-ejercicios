const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');
const ANCHO = lienzo.width;
const ALTO = lienzo.height;

const imgPortatil = new Image();
imgPortatil.src = 'portatil.svg';

// Cada acción suma grados a la temperatura a la que tiende el portátil.
// "requiere" bloquea el botón hasta que esté activa otra acción.
const ACCIONES = [
  { id: 'hdmi', texto: 'Conectar HDMI', calor: 6 },
  { id: 'video', texto: 'Vídeo por HDMI', calor: 14, requiere: 'hdmi' },
  { id: 'codigo', texto: 'Ejecutar código', calor: 12 },
  { id: 'compilar', texto: 'Compilar el kernel', calor: 22 },
  { id: 'chrome', texto: '40 pestañas de Chrome', calor: 10 },
  { id: 'docker', texto: 'Docker + 3 contenedores', calor: 12 },
  { id: 'rendimiento', texto: 'Modo rendimiento', calor: 10 },
];

const TEMP_AMBIENTE = 35;
const TEMP_THROTTLING = 90; // A partir de aquí el portátil se frena
const TEMP_APAGADO = 105;

// Estado. Las velocidades están en unidades por segundo, así la animación
// no depende de la tasa de refresco del monitor.
const activas = new Set();
let temperatura = TEMP_AMBIENTE;
let anguloVentilador = 0;
let apagado = false;
let ultimoTiempo = null;

const contenedorBotones = document.getElementById('botones');
const botones = {};
for (const accion of ACCIONES) {
  const boton = document.createElement('button');
  boton.textContent = accion.texto;
  boton.addEventListener('click', () => alternar(accion));
  contenedorBotones.append(boton);
  botones[accion.id] = boton;
}

function alternar(accion) {
  if (apagado) return;
  if (activas.has(accion.id)) {
    activas.delete(accion.id);
    // Sin HDMI no hay vídeo por HDMI
    for (const otra of ACCIONES) {
      if (otra.requiere === accion.id) activas.delete(otra.id);
    }
  } else {
    activas.add(accion.id);
  }
  actualizarBotones();
}

function actualizarBotones() {
  for (const accion of ACCIONES) {
    botones[accion.id].classList.toggle('activo', activas.has(accion.id));
    botones[accion.id].disabled = apagado || (accion.requiere && !activas.has(accion.requiere));
  }
}

function reiniciar() {
  activas.clear();
  temperatura = TEMP_AMBIENTE;
  apagado = false;
  actualizarBotones();
}

document.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    e.preventDefault();
    reiniciar();
  }
});

// --- Lógica ---
function temperaturaObjetivo() {
  let objetivo = TEMP_AMBIENTE;
  for (const accion of ACCIONES) {
    if (activas.has(accion.id)) objetivo += accion.calor;
  }
  return objetivo;
}

function actualizar(dt) {
  if (!apagado) {
    // La temperatura se acerca al objetivo de forma exponencial
    // (el factor depende de dt para que no cambie con los FPS)
    temperatura += (temperaturaObjetivo() - temperatura) * (1 - Math.exp(-dt / 4));
    if (temperatura >= TEMP_APAGADO) {
      apagado = true;
      activas.clear();
      actualizarBotones();
    }
  } else {
    temperatura += (TEMP_AMBIENTE - temperatura) * (1 - Math.exp(-dt / 6));
  }

  // El ventilador gira más rápido cuanto más calor hace (vueltas por segundo)
  const vueltas = apagado ? 0 : Math.max(0, (temperatura - 40) / 8);
  anguloVentilador += vueltas * Math.PI * 2 * dt;
}

// --- Dibujo ---
function colorTemperatura(t) {
  // De azul (35 °C) a rojo (105 °C) pasando por verde y amarillo
  const f = Math.max(0, Math.min(1, (t - TEMP_AMBIENTE) / (TEMP_APAGADO - TEMP_AMBIENTE)));
  return `hsl(${220 - f * 220}, 85%, 55%)`;
}

function dibujarVentilador(x, y, radio) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(anguloVentilador);
  ctx.fillStyle = '#9ca3af';
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(radio * 0.55, 0, radio * 0.5, radio * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, radio * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#374151';
  ctx.fill();
}

function dibujarTermometro(x, y, ancho, alto) {
  const f = Math.max(0, Math.min(1, (temperatura - TEMP_AMBIENTE) / (TEMP_APAGADO - TEMP_AMBIENTE)));
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x, y, ancho, alto);
  ctx.fillStyle = colorTemperatura(temperatura);
  ctx.fillRect(x, y + alto * (1 - f), ancho, alto * f);
  ctx.strokeStyle = '#6b7280';
  ctx.strokeRect(x, y, ancho, alto);
  // Marca del throttling
  const yThrottling = y + alto * (1 - (TEMP_THROTTLING - TEMP_AMBIENTE) / (TEMP_APAGADO - TEMP_AMBIENTE));
  ctx.strokeStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(x - 6, yThrottling);
  ctx.lineTo(x + ancho + 6, yThrottling);
  ctx.stroke();
}

function dibujar() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Resplandor tras el portátil según la temperatura
  const f = Math.max(0, (temperatura - 50) / (TEMP_APAGADO - 50));
  const resplandor = ctx.createRadialGradient(ANCHO / 2, 190, 20, ANCHO / 2, 190, 260);
  resplandor.addColorStop(0, `rgba(239, 68, 68, ${Math.min(f, 1) * 0.6})`);
  resplandor.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = resplandor;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  if (imgPortatil.complete) ctx.drawImage(imgPortatil, ANCHO / 2 - 150, 90, 300, 200);
  dibujarVentilador(ANCHO / 2, 240, 30);

  dibujarTermometro(40, 40, 28, 280);

  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${temperatura.toFixed(0)} °C`, ANCHO / 2, 60);
  ctx.font = '18px system-ui, sans-serif';
  if (apagado) {
    ctx.fillStyle = '#f87171';
    ctx.fillText('Apagado térmico. Pulsa Espacio para encenderlo', ANCHO / 2, ALTO - 24);
  } else if (temperatura >= TEMP_THROTTLING) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Thermal throttling: el procesador se está frenando', ANCHO / 2, ALTO - 24);
  }
}

// --- Bucle principal ---
// requestAnimationFrame nos da la marca de tiempo; con la diferencia (dt)
// la animación avanza igual a 30, 60 o 144 Hz.
function bucle(tiempo) {
  if (ultimoTiempo === null) ultimoTiempo = tiempo;
  // Limitamos dt para que no haya saltos al volver de otra pestaña
  const dt = Math.min((tiempo - ultimoTiempo) / 1000, 0.1);
  ultimoTiempo = tiempo;

  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}

actualizarBotones();
requestAnimationFrame(bucle);
