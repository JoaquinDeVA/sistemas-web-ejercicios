var express = require('express');
var router = express.Router();

// Elementos que se cargan desde el servidor
const elementos = ['Manzana', 'Naranja', 'Plátano', 'Pera', 'Uva'];

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Inicio', elementos });
});

/* GET login page. */
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login' });
});

module.exports = router;
