// Patrones de validación
const NOMBRE = /^\p{L}+(\s+\p{L}+)+$/u;          // Al menos dos palabras, solo letras (acepta acentos)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^\d+$/;                         // Solo números, sin espacios
const CONTRASENA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const FORMULARIO = `
  <form id="formulario" novalidate>
    <h2>Registro</h2>
    <label>Nombre y apellidos
      <input type="text" id="nombre">
      <span class="error"></span>
    </label>
    <label>Email
      <input type="email" id="email">
      <span class="error"></span>
    </label>
    <label>Teléfono
      <input type="tel" id="telefono">
      <span class="error"></span>
    </label>
    <label>Contraseña
      <input type="password" id="contrasena">
      <span class="error"></span>
    </label>
    <div>
      <button type="submit">Enviar</button>
      <button type="button" id="cancelar">Cancelar</button>
    </div>
  </form>`;

// Muestra el error de un campo y devuelve si es válido
function validar(id, patron, mensaje) {
  const valido = patron.test($(id).val().trim());
  $(id).siblings(".error").text(valido ? "" : mensaje);
  return valido;
}

function cerrarFormulario() {
  $("#formulario").remove();
  $("#contenido").show();
  $("#registro").show();
}

$(function () {
  $("#registro").click(function () {
    $("#mensaje").text("");
    $("#contenido").hide();
    $(this).hide();
    $("main").append(FORMULARIO);
  });

  // El formulario se crea después de cargar la página, así que los eventos
  // se delegan en main
  $("main").on("click", "#cancelar", cerrarFormulario);

  $("main").on("submit", "#formulario", function (e) {
    e.preventDefault();

    // Se validan todos los campos (sin cortocircuito) para mostrar todos los errores
    const resultados = [
      validar("#nombre", NOMBRE, "Introduce al menos dos palabras, solo letras."),
      validar("#email", EMAIL, "El email no tiene un formato válido."),
      validar("#telefono", TELEFONO, "Solo números, sin espacios."),
      validar("#contrasena", CONTRASENA, "Mínimo 8 caracteres con una mayúscula, una minúscula y un número.")
    ];

    if (resultados.every(Boolean)) {
      const nombre = $("#nombre").val().trim();
      cerrarFormulario();
      $("#mensaje").text(`Registro completado. ¡Bienvenido/a, ${nombre}!`);
    }
  });
});
