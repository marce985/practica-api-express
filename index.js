require('dotenv').config();

const express = require('express');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para recibir datos en formato JSON
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.send('Servidor API en línea');
});

// GET /api/productos
// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT * FROM productos ORDER BY id ASC'
        );

        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al consultar productos:', error.message);

        res.status(500).json({
            mensaje: 'Error interno al consultar los productos'
        });
    }
});

// GET /api/productos/:id
// Obtener un producto por ID
app.get('/api/productos/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: 'El ID debe ser un número entero positivo'
            });
        }

        const resultado = await pool.query(
            'SELECT * FROM productos WHERE id = $1',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Producto no encontrado'
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Error al consultar producto:', error.message);

        res.status(500).json({
            mensaje: 'Error interno al consultar el producto'
        });
    }
});

// POST /api/productos
// Crear un nuevo producto
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, categoria } = req.body;

        if (
            typeof nombre !== 'string' ||
            !nombre.trim() ||
            precio === undefined ||
            precio === null ||
            precio === '' ||
            !Number.isFinite(Number(precio)) ||
            Number(precio) < 0 ||
            typeof categoria !== 'string' ||
            !categoria.trim()
        ) {
            return res.status(400).json({
                mensaje: 'Debes enviar nombre, precio válido y categoria'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO productos (nombre, precio, categoria)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [nombre.trim(), Number(precio), categoria.trim()]
        );

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('Error al crear producto:', error.message);

        res.status(500).json({
            mensaje: 'Error interno al crear el producto'
        });
    }
});

// PUT /api/productos/:id
// Actualizar un producto existente
app.put('/api/productos/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nombre, precio, categoria } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: 'El ID debe ser un número entero positivo'
            });
        }

        if (
            typeof nombre !== 'string' ||
            !nombre.trim() ||
            precio === undefined ||
            precio === null ||
            precio === '' ||
            !Number.isFinite(Number(precio)) ||
            Number(precio) < 0 ||
            typeof categoria !== 'string' ||
            !categoria.trim()
        ) {
            return res.status(400).json({
                mensaje: 'Debes enviar nombre, precio válido y categoria'
            });
        }

        const resultado = await pool.query(
            `UPDATE productos
             SET nombre = $1, precio = $2, categoria = $3
             WHERE id = $4
             RETURNING *`,
            [nombre.trim(), Number(precio), categoria.trim(), id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Producto no encontrado'
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Error al actualizar producto:', error.message);

        res.status(500).json({
            mensaje: 'Error interno al actualizar el producto'
        });
    }
});

// DELETE /api/productos/:id
// Eliminar un producto
app.delete('/api/productos/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: 'El ID debe ser un número entero positivo'
            });
        }

        const resultado = await pool.query(
            'DELETE FROM productos WHERE id = $1 RETURNING *',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Producto no encontrado'
            });
        }

        res.json({
            mensaje: 'Producto eliminado correctamente',
            producto: resultado.rows[0]
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error.message);

        res.status(500).json({
            mensaje: 'Error interno al eliminar el producto'
        });
    }
});

// Verificar la conexión e iniciar el servidor
async function iniciarServidor() {
    try {
        await pool.query('SELECT NOW()');

        console.log('Conectado exitosamente a PostgreSQL');

        app.listen(PORT, () => {
            console.log(
                `Servidor ejecutándose en http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            'No fue posible conectar con PostgreSQL:',
            error.message
        );

        process.exitCode = 1;
    }
}

iniciarServidor();