var express = require('express');
var router = express.Router();

// Elementos que se cargan desde el servidor
const elementos = ['Manzana', 'Naranja', 'Plátano', 'Pera', 'Uva'];

// Usuario de prueba del ejercicio
const USUARIO = { nombre: 'admin', clave: '1234' };

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Inicio', elementos });
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
router.get('/privada', function(req, res, next) {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('privada', { title: 'Zona privada' });
});

module.exports = router;
