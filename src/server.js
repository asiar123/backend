require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/dbConfig');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');

const app = express();

// Configuración de HTTPS
const privateKey = fs.readFileSync('localhost.key', 'utf8');
const certificate = fs.readFileSync('localhost.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);

// Configuración de Socket.io
const io = require('socket.io')(httpsServer, {
  cors: {
    origin: "https://192.168.1.7:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Evento personalizado que el cliente debería emitir después de iniciar sesión
  socket.on('registerUser', async (id_usuario) => {
    try {
      await pool.query(
        'UPDATE usuarios SET socket_id = $1 WHERE id_usuario = $2',
        [socket.id, id_usuario]
      );
      console.log(`Usuario ${id_usuario} registrado con socket ID ${socket.id}`);
    } catch (err) {
      console.error('Error al registrar socket ID:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      await pool.query(
        'UPDATE usuarios SET socket_id = NULL WHERE socket_id = $1',
        [socket.id]
      );
      console.log(`Socket ID ${socket.id} ha sido removido`);
    } catch (err) {
      console.error('Error al remover socket ID:', err);
    }
  });
});

app.use(express.json());
app.use(cors());

const geolocationRoutes = require('./routes/geolocationRoutes')(io);
const authRoutes = require('./routes/authRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/geolocation', geolocationRoutes);

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

app.get('/db', async (req, res) => {
  try {
    const response = await pool.query('SELECT NOW()');
    res.json(response.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al conectar con la base de datos');
  }
});

module.exports = { app, httpsServer, io };