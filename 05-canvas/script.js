const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');
const ANCHO = lienzo.width;
const ALTO = lienzo.height;

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
let tiempo = 0; // segundos totales, para las animaciones
const avisos = []; // mensajes flotantes al pulsar un botón

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
    avisos.push({ texto: `${accion.texto}: -${accion.calor} °C`, color: '#93c5fd', vida: 1.5 });
    // Sin HDMI no hay vídeo por HDMI
    for (const otra of ACCIONES) {
      if (otra.requiere === accion.id) activas.delete(otra.id);
    }
  } else {
    activas.add(accion.id);
    avisos.push({ texto: `${accion.texto}: +${accion.calor} °C`, color: '#fca5a5', vida: 1.5 });
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
  tiempo += dt;
  for (const a of avisos) a.vida -= dt;
  while (avisos.length && avisos[0].vida <= 0) avisos.shift();
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
function fraccion() {
  return Math.max(0, Math.min(1, (temperatura - TEMP_AMBIENTE) / (TEMP_APAGADO - TEMP_AMBIENTE)));
}

function colorTemperatura(t) {
  // De azul (35 °C) a rojo (105 °C) pasando por verde y amarillo
  const f = Math.max(0, Math.min(1, (t - TEMP_AMBIENTE) / (TEMP_APAGADO - TEMP_AMBIENTE)));
  return `hsl(${220 - f * 220}, 85%, 55%)`;
}

// Ejecuta "dibujo" recortado al rectángulo y con el origen en su esquina
function enRecuadro(x, y, w, h, dibujo) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  dibujo(w, h);
  ctx.restore();
}

function texto(t, x, y, color, fuente = '14px monospace', alinear = 'left') {
  ctx.fillStyle = color;
  ctx.font = fuente;
  ctx.textAlign = alinear;
  ctx.fillText(t, x, y);
}

function dibujarEscritorio(w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1e3a8a');
  g.addColorStop(1, '#0f172a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const hora = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  texto(hora, w / 2, h / 2, 'rgba(255,255,255,.25)', 'bold 48px system-ui', 'center');
}

function dibujarPantallaPortatil(w, h) {
  dibujarEscritorio(w, h);

  if (activas.has('chrome')) {
    // Ventana de Chrome a pantalla completa: las pestañas se encogen hasta ser iconos
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, w, 32);
    const ancho = (w - 40) / 40;
    for (let i = 0; i < 40; i++) {
      const x = 6 + i * ancho;
      ctx.fillStyle = i === 3 ? '#f8fafc' : '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(x, 6, ancho - 2, 26, [6, 6, 0, 0]);
      ctx.fill();
      ctx.fillStyle = `hsl(${i * 47}, 65%, 50%)`;
      ctx.beginPath();
      ctx.arc(x + Math.min(8, ancho / 2), 19, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Barra de direcciones y contenido de la página
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 32, w, 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(40, 37, w - 80, 18, 9);
    ctx.fill();
    texto('campusvirtual.unizar.es/blackboard', 52, 50, '#475569', '11px system-ui');
    ctx.fillStyle = '#e2e8f0';
    for (let k = 0; k < 6; k++) ctx.fillRect(20, 80 + k * 22, k % 2 ? w - 120 : w - 60, 10);
    texto('40 pestañas · 6 GB de RAM', w - 10, 22, '#b91c1c', 'bold 12px system-ui', 'right');
  }

  if (activas.has('codigo')) {
    ctx.fillStyle = 'rgba(2, 6, 23, .92)';
    ctx.fillRect(10, 66, 300, 170);
    const lineas = ['for (let i = 0; i < n; i++) {', '  suma += datos[i] * peso;', '  if (suma > MAX) break;', '}', 'console.log(suma);', 'while (true) { /* ¿? */ }', 'node index.js'];
    const desplazamiento = (tiempo * 6) % lineas.length;
    for (let k = 0; k < 9; k++) {
      const l = lineas[(Math.floor(desplazamiento) + k) % lineas.length];
      texto('$ ' + l, 18, 90 + k * 17, k === 8 ? '#4ade80' : '#86efac', '13px monospace');
    }
    if (Math.floor(tiempo * 2) % 2) texto('█', 18 + 8 * 17, 90 + 8 * 17, '#4ade80', '13px monospace');
  }

  if (activas.has('compilar')) {
    ctx.fillStyle = 'rgba(2, 6, 23, .92)';
    ctx.fillRect(320, 66, 250, 170);
    texto('make -j16 vmlinux', 330, 90, '#fbbf24');
    const p = (tiempo * 0.12) % 1;
    ctx.fillStyle = '#374151';
    ctx.fillRect(330, 104, 230, 16);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(330, 104, 230 * p, 16);
    texto(`${Math.floor(p * 100)} %`, 445, 117, '#fff', 'bold 12px monospace', 'center');
    for (let k = 0; k < 6; k++) texto(`  CC  kernel/sched/${Math.floor(tiempo * 9 + k * 3)}.o`, 330, 144 + k * 15, '#9ca3af', '11px monospace');
  }

  if (activas.has('rendimiento')) {
    ctx.fillStyle = 'rgba(2, 6, 23, .92)';
    ctx.fillRect(10, 246, 300, 70);
    texto('CPU  MODO RENDIMIENTO', 18, 262, '#f87171', 'bold 12px monospace');
    for (let k = 0; k < 24; k++) {
      const alto = 12 + 36 * (0.5 + 0.5 * Math.sin(tiempo * 8 + k * 1.7));
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(18 + k * 12, 310 - alto, 8, alto);
    }
  }

  if (activas.has('docker')) {
    for (let k = 0; k < 3; k++) {
      const x = 330 + k * 82;
      ctx.fillStyle = `rgba(14, 165, 233, ${0.7 + 0.3 * Math.sin(tiempo * 3 + k)})`;
      ctx.fillRect(x, 262, 74, 40);
      texto(`ctr-${k + 1}`, x + 37, 286, '#fff', 'bold 13px monospace', 'center');
    }
    texto('Docker', 330, 254, '#38bdf8', 'bold 12px system-ui');
  }
}

function dibujarPantallaExterna(w, h) {
  if (activas.has('video')) {
    // Escena animada: cielo, sol que se mueve y olas
    const cielo = ctx.createLinearGradient(0, 0, 0, h);
    cielo.addColorStop(0, '#7dd3fc');
    cielo.addColorStop(1, '#fde68a');
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(w * (0.2 + 0.6 * ((tiempo * 0.05) % 1)), 70 + 30 * Math.sin(tiempo), 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, h * 0.65 + 14 * Math.sin(x / 30 + tiempo * 3));
    ctx.lineTo(w, h);
    ctx.fill();
    // Barra de reproducción
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, h - 28, w, 28);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(10, h - 16, (w - 20) * ((tiempo * 0.03) % 1), 4);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(14, h - 24);
    ctx.lineTo(14, h - 8);
    ctx.lineTo(26, h - 16);
    ctx.fill();
    texto('4K · 60 fps', w - 10, 22, '#fff', 'bold 13px system-ui', 'right');
  } else if (activas.has('hdmi')) {
    dibujarEscritorio(w, h);
    texto('Pantalla extendida', w / 2, h - 20, 'rgba(255,255,255,.6)', '14px system-ui', 'center');
  } else {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);
    texto('Sin señal', w / 2, h / 2, '#475569', '20px system-ui', 'center');
  }
}

function dibujarPortatil() {
  // Tapa
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.roundRect(120, 110, 620, 400, 12);
  ctx.fill();
  if (apagado) {
    ctx.fillStyle = '#020617';
    ctx.fillRect(140, 130, 580, 360);
  } else {
    enRecuadro(140, 130, 580, 360, dibujarPantallaPortatil);
  }
  // Base con rejilla y ventilador
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.moveTo(100, 510);
  ctx.lineTo(760, 510);
  ctx.lineTo(790, 560);
  ctx.lineTo(70, 560);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#374151';
  ctx.fillRect(375, 520, 110, 8);
  dibujarVentilador(430, 545, 14);
  // Punto rojo de ThinkPad
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(430, 118, 3, 0, Math.PI * 2);
  ctx.fill();
}

function dibujarMonitor() {
  ctx.fillStyle = '#374151';
  ctx.fillRect(990, 420, 50, 70);
  ctx.fillRect(950, 490, 130, 12);
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.roundRect(790, 170, 450, 270, 8);
  ctx.fill();
  enRecuadro(798, 178, 434, 254, dibujarPantallaExterna);
  if (activas.has('hdmi')) {
    // Cable HDMI del portátil al monitor
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(780, 545);
    ctx.bezierCurveTo(850, 620, 1000, 600, 1015, 498);
    ctx.stroke();
  }
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
}

function dibujarTermometro(x, y, ancho, alto) {
  const f = fraccion();
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x, y, ancho, alto);
  ctx.fillStyle = colorTemperatura(temperatura);
  ctx.fillRect(x, y + alto * (1 - f), ancho, alto * f);
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, ancho, alto);
  // Marca del throttling
  const yThrottling = y + alto * (1 - (TEMP_THROTTLING - TEMP_AMBIENTE) / (TEMP_APAGADO - TEMP_AMBIENTE));
  ctx.strokeStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(x - 8, yThrottling);
  ctx.lineTo(x + ancho + 8, yThrottling);
  ctx.stroke();
}

function dibujarAvisos() {
  avisos.forEach((a, i) => {
    ctx.globalAlpha = Math.min(1, a.vida);
    texto(a.texto, ANCHO / 2, 600 + (1 - a.vida) * -40 - i * 0, a.color, 'bold 28px system-ui', 'center');
  });
  ctx.globalAlpha = 1;
}

function dibujar() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Resplandor según la temperatura
  const f = Math.max(0, (temperatura - 50) / (TEMP_APAGADO - 50));
  const resplandor = ctx.createRadialGradient(430, 330, 40, 430, 330, 520);
  resplandor.addColorStop(0, `rgba(239, 68, 68, ${Math.min(f, 1) * 0.55})`);
  resplandor.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = resplandor;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  dibujarMonitor();
  dibujarPortatil();
  dibujarTermometro(30, 110, 36, 460);

  texto(`${temperatura.toFixed(0)} °C`, ANCHO / 2, 70, '#e5e7eb', 'bold 56px system-ui', 'center');
  dibujarAvisos();
  if (apagado) {
    texto('Apagado térmico. Pulsa Espacio para encenderlo', ANCHO / 2, 680, '#f87171', '22px system-ui', 'center');
  } else if (temperatura >= TEMP_THROTTLING) {
    texto('Thermal throttling: el procesador se está frenando', ANCHO / 2, 680, '#fbbf24', '22px system-ui', 'center');
  }
}

// --- Bucle principal ---
// requestAnimationFrame nos da la marca de tiempo; con la diferencia (dt)
// la animación avanza igual a 30, 60 o 144 Hz.
function bucle(marca) {
  if (ultimoTiempo === null) ultimoTiempo = marca;
  // Limitamos dt para que no haya saltos al volver de otra pestaña
  const dt = Math.min((marca - ultimoTiempo) / 1000, 0.1);
  ultimoTiempo = marca;

  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}

actualizarBotones();
requestAnimationFrame(bucle);
