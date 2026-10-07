const express = require('express');

const app = express();
const PORT = 3001;

// Middleware para recibir datos en formato JSON
app.use(express.json());

// Arreglo en memoria para simular una base de datos
let productos = [
    {
        id: 1,
        nombre: 'Laptop Lenovo',
        precio: 15000,
        categoria: 'Computación'
    },
    {
        id: 2,
        nombre: 'Mouse Logitech',
        precio: 500,
        categoria: 'Accesorios'
    },
    {
        id: 3,
        nombre: 'Teclado Mecánico',
        precio: 1200,
        categoria: 'Accesorios'
    }
];

// Ruta principal
app.get('/', (req, res) => {
    res.send('Servidor API en línea');
});

// GET /api/productos
// Obtener todos los productos
app.get('/api/productos', (req, res) => {
    res.json(productos);
});

// GET /api/productos/:id
// Obtener un producto por ID
app.get('/api/productos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const producto = productos.find(p => p.id === id);

    if (!producto) {
        return res.status(404).json({
            mensaje: 'Producto no encontrado'
        });
    }

    res.json(producto);
});

// POST /api/productos
// Crear un nuevo producto
app.post('/api/productos', (req, res) => {
    const nuevoProducto = {
        id: productos.length > 0
            ? Math.max(...productos.map(p => p.id)) + 1
            : 1,
        nombre: req.body.nombre,
        precio: req.body.precio,
        categoria: req.body.categoria
    };

    productos.push(nuevoProducto);

    res.status(201).json(nuevoProducto);
});

// PUT /api/productos/:id
// Actualizar un producto
app.put('/api/productos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const indice = productos.findIndex(p => p.id === id);

    if (indice === -1) {
        return res.status(404).json({
            mensaje: 'Producto no encontrado'
        });
    }

    productos[indice] = {
        id: id,
        nombre: req.body.nombre,
        precio: req.body.precio,
        categoria: req.body.categoria
    };

    res.json(productos[indice]);
});

// DELETE /api/productos/:id
// Eliminar un producto
app.delete('/api/productos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const indice = productos.findIndex(p => p.id === id);

    if (indice === -1) {
        return res.status(404).json({
            mensaje: 'Producto no encontrado'
        });
    }

    productos.splice(indice, 1);

    res.json({
        mensaje: 'Producto eliminado correctamente'
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
