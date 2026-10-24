/*
 * URL de nuestra API REST.
 * El backend está funcionando en el puerto 3001.
 */
const API_URL = 'http://localhost:3001/api/productos';

let miGrafica = null;

// Función para consultar los productos
async function cargarProductos() {
    const estado = document.getElementById('estado');
    const tabla = document.getElementById('tabla-datos');

    try {
        estado.textContent = 'Cargando productos...';

        // Realizar petición GET a la API
        const respuesta = await fetch(API_URL);

        // Verificar si la petición fue exitosa
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        // Convertir la respuesta a JSON
        const productos = await respuesta.json();

        if (!Array.isArray(productos)) {
            throw new Error('La API no devolvió una lista de productos.');
        }

        // Limpiar la tabla antes de insertar los registros
        tabla.replaceChildren();

        // Recorrer los productos recibidos
        productos.forEach((producto) => {
            const fila = document.createElement('tr');

            const celdaId = document.createElement('td');
            celdaId.textContent = producto.id;

            const celdaNombre = document.createElement('td');
            celdaNombre.textContent = producto.nombre;

            const celdaPrecio = document.createElement('td');
            celdaPrecio.textContent =
                Number(producto.precio).toLocaleString('es-MX', {
                    style: 'currency',
                    currency: 'MXN'
                });

            const celdaCategoria = document.createElement('td');
            celdaCategoria.textContent = producto.categoria;

            fila.append(
                celdaId,
                celdaNombre,
                celdaPrecio,
                celdaCategoria
            );

            tabla.appendChild(fila);
        });

        // Mostrar cuántos productos se recibieron
        estado.textContent =
            `Se encontraron ${productos.length} productos.`;

        // Preparar los datos para la gráfica
        const nombres = productos.map(
            producto => producto.nombre
        );

        const precios = productos.map(
            producto => Number(producto.precio)
        );

        // Dibujar la gráfica
        dibujarGrafica(nombres, precios);

    } catch (error) {
        console.error('Error al cargar los productos:', error);

        estado.textContent =
            'No se pudieron cargar los productos. Verifica que el backend esté encendido y que la API funcione.';
    }
}

// Función para crear la gráfica con Chart.js
function dibujarGrafica(nombres, precios) {
    const canvas = document.getElementById('miGrafica');

    // Evitar que se creen varias gráficas sobre el mismo canvas
    if (miGrafica) {
        miGrafica.destroy();
    }

    miGrafica = new Chart(canvas, {
        type: 'bar',

        data: {
            labels: nombres,

            datasets: [{
                label: 'Precio en pesos mexicanos',
                data: precios,

                backgroundColor: [
                    '#2563eb',
                    '#0d9488',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ec4899'
                ],

                borderRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                title: {
                    display: true,
                    text: 'Precio de los productos'
                },

                legend: {
                    display: true
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    title: {
                        display: true,
                        text: 'Precio (MXN)'
                    }
                },

                x: {
                    title: {
                        display: true,
                        text: 'Nombre del producto'
                    }
                }
            }
        }
    });
}

// Ejecutar cuando el HTML termine de cargarse
document.addEventListener('DOMContentLoaded', cargarProductos);
