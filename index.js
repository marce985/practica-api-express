require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

//configurar dónde se guardarán temporalmente los archivos
const almacenamiento = multer.diskStorage({
    destination: (req, archivo, callback) => {
        callback(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, archivo, callback) =>{
        callback(null, archivo.originalname);
    }
});

// configurar multer para recibir archivos
const upload = multer({
    storage: almacenamiento
});


const app = express();
const PORT = process.env.PORT || 3001;

//Permitir peticiones desde el frontend
app.use(cors());

// Middleware para recibir datos en formato JSON
app.use(express.json());

 // Importar productos desde archivos JSON o CSV
app.post('/api/productos/importar', upload.single('archivo'), async (req, res) => {
    let archivoTemporal;

    try {
        if (!req.file) {
            return res.status(400).json({
                mensaje: 'Debes seleccionar un archivo para importar'
            });
        }

        archivoTemporal = req.file.path;

        const extension = path.extname(req.file.originalname).toLowerCase();
        let productos = [];

        // Leer archivo JSON
        if (extension === '.json') {
            const contenido = fs.readFileSync(archivoTemporal, 'utf8');
            productos = JSON.parse(contenido);
        }
        // Leer archivo CSV
        else if (extension === '.csv') {
            productos = await new Promise((resolve, reject) => {
                const filas = [];

                fs.createReadStream(archivoTemporal)
                    .pipe(csv())
                    .on('data', (fila) => filas.push(fila))
                    .on('end', () => resolve(filas))
                    .on('error', reject);
            });
        } else {
            return res.status(400).json({
                mensaje: 'El archivo debe ser .json o .csv'
            });
        }

        if (!Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({
                mensaje: 'El archivo debe contener una lista de productos'
            });
        }

        // Validar los datos antes de insertarlos
        for (const producto of productos) {
            if (
                typeof producto.nombre !== 'string' ||
                !producto.nombre.trim() ||
                producto.nombre.trim().length > 100 ||
                producto.precio === undefined ||
                producto.precio === null ||
                String(producto.precio).trim() === '' ||
                !Number.isFinite(Number(producto.precio)) ||
                Number(producto.precio) < 0 ||
                typeof producto.categoria !== 'string' ||
                !producto.categoria.trim() ||
                producto.categoria.trim().length > 100
            ) {
                return res.status(400).json({
                    mensaje: 'Cada producto debe tener nombre, precio válido y categoria'
                });
            }
        }

        // Insertar todos los productos en una transacción
        const cliente = await pool.connect();

        try {
            await cliente.query('BEGIN');

            for (const producto of productos) {
                await cliente.query(
                    `INSERT INTO productos (nombre, precio, categoria)
                     VALUES ($1, $2, $3)`,
                    [
                        producto.nombre.trim(),
                        Number(producto.precio),
                        producto.categoria.trim()
                    ]
                );
            }

            await cliente.query('COMMIT');
        } catch (error) {
            await cliente.query('ROLLBACK');
            throw error;
        } finally {
            cliente.release();
        }

        return res.status(200).json({
            mensaje: 'Productos importados correctamente',
            total: productos.length
        });

    } catch (error) {
        console.error('Error al importar productos:', error.message);

        return res.status(500).json({
            mensaje: 'No se pudieron importar los productos. Verifica el formato del archivo.'
        });

    } finally {
        if (archivoTemporal && fs.existsSync(archivoTemporal)) {
            fs.unlinkSync(archivoTemporal);
        }
    }
});

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

//GET /api/productos/exportar/:formato
//Exportar productos en formato JSON o CSV
app.get('/api/productos/exportar/:formato', async (req, res) =>{
    try {
        const formato = req.params.formato.toLowerCase();

        if (!['json', 'csv'].includes(formato)){
            return res.status(400).json({
                mensaje: 'Formato no valido. Usar json o csv'
            });
        }
        const resultado = await pool.query(
            'SELECT id, nombre, precio, categoria FROM productos ORDER BY id'
        );
        if(formato === 'json'){
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="productos.json"'

            );
            return res.json(resultado.rows);
        }

        const {Parser} = require('json2csv');
        const parser = new Parser({
            fields: ['id', 'nombre', 'precio', 'categoria']
        });
        const csv = parser.parse(resultado.rows);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="productos.csv"'
        );
        return res.send('\uFEFF' + csv);


    }catch (error) {
        console.error('Error al exportar productos: ', error);
        return res.status(500).json({
            mensaje: 'Error al exportar los productos'
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