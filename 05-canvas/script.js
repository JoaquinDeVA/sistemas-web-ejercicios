const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');
const ANCHO = lienzo.width;
const ALTO = lienzo.height;

// Imagen de la nave
const imgNave = new Image();
imgNave.src = 'nave.svg';

// Estado del juego. Las velocidades están en píxeles por segundo,
// así el movimiento no depende de la tasa de refresco del monitor.
const nave = { x: ANCHO / 2, y: ALTO - 50, tam: 64, velocidad: 400 };
const teclas = {};
let estrellas = [];
let fondo = [];
let puntos = 0;
let vidas = 3;
let pausado = false;
let tiempoHastaEstrella = 0;
let ultimoTiempo = null;

// Estrellas del fondo, decorativas
for (let i = 0; i < 80; i++) {
  fondo.push({ x: Math.random() * ANCHO, y: Math.random() * ALTO, vel: 20 + Math.random() * 60 });
}

function reiniciar() {
  estrellas = [];
  puntos = 0;
  vidas = 3;
  pausado = false;
}

function crearEstrella() {
  estrellas.push({
    x: 20 + Math.random() * (ANCHO - 40),
    y: -20,
    radio: 10 + Math.random() * 8,
    vel: 100 + Math.random() * 100 + puntos * 5,
    angulo: 0,
    giro: (Math.random() - 0.5) * 6 // radianes por segundo
  });
}

// --- Entrada del usuario ---
document.addEventListener('keydown', (e) => {
  teclas[e.key] = true;
  if (e.key === ' ') {
    e.preventDefault();
    if (vidas <= 0) reiniciar();
    else pausado = !pausado;
  }
});
document.addEventListener('keyup', (e) => { teclas[e.key] = false; });

lienzo.addEventListener('mousemove', (e) => {
  const rect = lienzo.getBoundingClientRect();
  // El canvas puede estar escalado por CSS, convertimos a coordenadas internas
  nave.x = (e.clientX - rect.left) * (ANCHO / rect.width);
});

// --- Lógica ---
function actualizar(dt) {
  for (const s of fondo) {
    s.y += s.vel * dt;
    if (s.y > ALTO) { s.y = 0; s.x = Math.random() * ANCHO; }
  }

  if (pausado || vidas <= 0) return;

  if (teclas['ArrowLeft']) nave.x -= nave.velocidad * dt;
  if (teclas['ArrowRight']) nave.x += nave.velocidad * dt;
  nave.x = Math.max(nave.tam / 2, Math.min(ANCHO - nave.tam / 2, nave.x));

  tiempoHastaEstrella -= dt;
  if (tiempoHastaEstrella <= 0) {
    crearEstrella();
    tiempoHastaEstrella = 0.4 + Math.random() * 0.6;
  }

  for (const e of estrellas) {
    e.y += e.vel * dt;
    e.angulo += e.giro * dt;
  }

  estrellas = estrellas.filter((e) => {
    const dx = e.x - nave.x;
    const dy = e.y - nave.y;
    if (Math.hypot(dx, dy) < e.radio + nave.tam / 3) {
      puntos++;
      return false;
    }
    if (e.y - e.radio > ALTO) {
      vidas--;
      return false;
    }
    return true;
  });
}

// --- Dibujo ---
function dibujarEstrella(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angulo);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? e.radio : e.radio / 2.2;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.restore();
}

function dibujar() {
  // Fondo con degradado
  const degradado = ctx.createLinearGradient(0, 0, 0, ALTO);
  degradado.addColorStop(0, '#0f172a');
  degradado.addColorStop(1, '#312e81');
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (const s of fondo) ctx.fillRect(s.x, s.y, 2, 2);

  for (const e of estrellas) dibujarEstrella(e);

  if (imgNave.complete) {
    ctx.drawImage(imgNave, nave.x - nave.tam / 2, nave.y - nave.tam / 2, nave.tam, nave.tam);
  }

  // Marcador
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Puntos: ${puntos}`, 12, 28);
  for (let i = 0; i < vidas; i++) {
    ctx.beginPath();
    ctx.arc(ANCHO - 20 - i * 24, 20, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f87171';
    ctx.fill();
  }

  if (pausado || vidas <= 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText(vidas <= 0 ? 'Fin del juego' : 'Pausa', ANCHO / 2, ALTO / 2);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(vidas <= 0 ? 'Pulsa Espacio para jugar otra vez' : 'Pulsa Espacio para seguir', ANCHO / 2, ALTO / 2 + 32);
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

requestAnimationFrame(bucle);
