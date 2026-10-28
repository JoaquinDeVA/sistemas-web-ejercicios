// ==UserScript==
// @name         Blackboard infernal
// @namespace    http://tampermonkey.net/
// @version      2026-10-12
// @description  Fotos del infierno en las asignaturas y botón "Cursos" que vuelve a la lista
// @author       Joaquín de Vicente
// @match        https://ceu.blackboard.com/*
// @grant        none
// ==/UserScript==

/*
 * Qué consigo con este script en el Blackboard del CEU:
 *
 *  1. Añadir: cada asignatura muestra una foto de Mordor, del inframundo o de un
 *     cuadro famoso del infierno en vez del paisaje por defecto. La foto se sortea
 *     en cada carga y aparece tanto en la tarjeta de la lista de cursos como en la
 *     cabecera de dentro de la asignatura.
 *
 *  2. Eliminar: el botón "Cursos" de la cabecera de una asignatura deja de abrir el
 *     desplegable para cambiar de curso y vuelve a la lista de cursos, que es lo que
 *     hacía antes.
 */

(function() {
    'use strict';

    // Imágenes de Wikimedia Commons, todas a 1280 px de ancho
    const BASE = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';
    const FOTOS = [
        '0/08/John_Martin_Le_Pandemonium_Louvre.JPG/1280px-John_Martin_Le_Pandemonium_Louvre.JPG',                                                               // John Martin, Pandemonium
        '5/50/John_Martin_-_The_Great_Day_of_His_Wrath_-_Google_Art_Project.jpg/1280px-John_Martin_-_The_Great_Day_of_His_Wrath_-_Google_Art_Project.jpg',         // John Martin, El gran día de su ira
        '3/3e/Sandro_Botticelli_-_La_Carte_de_l%27Enfer.jpg/1280px-Sandro_Botticelli_-_La_Carte_de_l%27Enfer.jpg',                                                 // Botticelli, Mapa del Infierno
        'b/b3/The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg/1280px-The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg',                                   // Bruegel, El triunfo de la Muerte
        '1/1b/Crossing_the_River_Styx.jpg/1280px-Crossing_the_River_Styx.jpg',                                                                                     // Patinir, El paso de la laguna Estigia
        'd/dc/Jan_Brueghel_the_Elder_-_Aeneas_and_the_Sibyl_in_the_Underworld.jpg/1280px-Jan_Brueghel_the_Elder_-_Aeneas_and_the_Sibyl_in_the_Underworld.jpg',     // Brueghel, Eneas y la Sibila en el inframundo
        '9/9d/Pieter_Bruegel_the_Elder_-_The_Fall_of_the_Rebel_Angels_-_Google_Art_Project.jpg/1280px-Pieter_Bruegel_the_Elder_-_The_Fall_of_the_Rebel_Angels_-_Google_Art_Project.jpg', // Bruegel, La caída de los ángeles rebeldes
        '1/17/Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Hell.jpg/1280px-Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Hell.jpg',                   // El Bosco, El Infierno (Jardín de las Delicias)
        '2/27/William_Bouguereau_-_Dante_and_Virgile_-_Google_Art_Project_2.jpg/1280px-William_Bouguereau_-_Dante_and_Virgile_-_Google_Art_Project_2.jpg',         // Bouguereau, Dante y Virgilio
        'b/b6/The_Fall_of_the_Damned_-_Peter_Paul_Rubens.jpg/1280px-The_Fall_of_the_Damned_-_Peter_Paul_Rubens.jpg',                                               // Rubens, La caída de los condenados (foto: GoldenArtists, CC BY 4.0)
        '0/07/Mount_Ngauruhoe_06.jpg/1280px-Mount_Ngauruhoe_06.jpg',                                                                                               // Monte Ngauruhoe, el Monte del Destino (foto: Krzysztof Golik, CC BY-SA 4.0)
        '8/8e/Mordor.jpg/1280px-Mordor.jpg',                                                                                                                       // Tongariro, localización de Mordor (foto: Mrs. Gemstone, CC BY 2.0)
    ];

    // Foto que le ha tocado a cada curso en esta carga (ID del curso -> URL).
    // Se guarda para que tarjeta y cabecera coincidan y para no volver a sortear
    // cada vez que Blackboard redibuja la página.
    const fotoDeCurso = {};

    function fotoDe(idCurso) {
        if (!fotoDeCurso[idCurso]) {
            fotoDeCurso[idCurso] = BASE + FOTOS[Math.floor(Math.random() * FOTOS.length)];
        }
        return fotoDeCurso[idCurso];
    }

    // Tarjetas de la lista de cursos. Blackboard las crea vacías y las rellena al
    // hacer scroll, así que solo se pintan las que ya tienen ID de curso.
    function pintarTarjetas() {
        for (const tarjeta of document.querySelectorAll('article[data-course-id^="_"]')) {
            const banner = tarjeta.querySelector('.course-banner');
            const foto = fotoDe(tarjeta.dataset.courseId);
            if (banner && !banner.style.backgroundImage.includes(foto)) {
                banner.style.backgroundImage = `url("${foto}")`;
            }
        }
    }

    // Cabecera de dentro de una asignatura. El ID del curso se saca de la URL
    // (/ultra/courses/_361546_1/outline) y se conserva el degradado oscuro de
    // Blackboard, cambiando solo la imagen, para que el título siga leyéndose.
    function pintarCabecera() {
        const cabecera = document.querySelector('course-banner [class*="makeStylescourseBanner-"]');
        const id = location.pathname.match(/\/courses\/(_\d+_\d+)/);
        if (!cabecera || !id) return;

        const foto = fotoDe(id[1]);
        if (!cabecera.style.backgroundImage.includes(foto)) {
            cabecera.style.backgroundImage = getComputedStyle(cabecera).backgroundImage.replace(/url\(.*\)/, `url("${foto}")`);
        }
    }

    function pintar() {
        pintarTarjetas();
        pintarCabecera();
    }

    // Blackboard es una SPA: cambia de página sin recargar y va añadiendo elementos.
    // El observador vuelve a pintar cada vez que cambia el DOM o Blackboard reescribe
    // el estilo de un banner.
    new MutationObserver(pintar).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'data-course-id'],
    });
    pintar();

    // Botón "Cursos": se intercepta el clic en fase de captura, antes de que llegue
    // al manejador de Blackboard que abre el desplegable, y se pulsa en su lugar el
    // enlace de inicio de la misma cabecera, que lleva a /ultra/course sin recargar.
    document.addEventListener('click', function(evento) {
        if (evento.target.closest('[data-analytics-id="course.header.course-switcher.button"]')) {
            evento.stopPropagation();
            document.querySelector('[data-analytics-id="course.header.home"]').click();
        }
    }, true);
})();
