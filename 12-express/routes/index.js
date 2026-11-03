var express = require('express');
var router = express.Router();

// El scraper del ejercicio 11 sirve el estado de los productos vigilados
const URL_SCRAPER = 'http://localhost:3001';

async function cargarProductos() {
  try {
    const res = await fetch(URL_SCRAPER);
    return await res.json();
  } catch (err) {
    return null;
  }
}

const ETIQUETAS = { InStock: 'Disponible', OutOfStock: 'Agotado', PreOrder: 'Reserva', SoldOut: 'Agotado' };
const etiqueta = (d) => ETIQUETAS[d] || d;

// Usuario de prueba del ejercicio
const USUARIO = { nombre: 'admin', clave: '1234' };

/* GET home page. */
router.get('/', async function(req, res, next) {
  const productos = await cargarProductos();
  res.render('index', { title: 'Vigilante de stock', productos, etiqueta });
});

/* GET login page. */
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login' });
});

router.post('/login', function(req, res, next) {
  if (req.body.usuario === USUARIO.nombre && req.body.clave === USUARIO.clave) {
    req.session.usuario = USUARIO.nombre;
    return res.redirect('/privada');
  }
  res.status(401).render('login', { title: 'Login', error: 'Usuario o contraseña incorrectos' });
});

router.get('/logout', function(req, res, next) {
  req.session.destroy(() => res.redirect('/'));
});

/* Página restringida: solo con sesión iniciada */
router.get('/privada', async function(req, res, next) {
  if (!req.session.usuario) return res.redirect('/login');
  const productos = await cargarProductos();
  res.render('privada', { title: 'Detalle de productos', productos, etiqueta });
});

module.exports = router;
