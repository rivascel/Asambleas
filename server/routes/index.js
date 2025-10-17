const express=require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const  sendMagicLink  = require("../utils/sendMagicLink");
const { createRoom, requestToJoinRoom }= require("../utils/js/webrtc/supabase");
const { getPendingRequest }= require("../utils/js/webrtc/supabase");
const { approveUser }= require("../utils/js/webrtc/supabase");
const { ApprovedUserQuery }= require("../utils/js/webrtc/supabase");
const { deleteCandidate }= require("../utils/js/webrtc/supabase");
const { getPendingRequestById }= require("../utils/js/webrtc/supabase");
const { getApprovedUserById }= require("../utils/js/webrtc/supabase");
const { offers }= require("../utils/js/webrtc/supabase");

// const { getPeerConnection, getRemoteStream, closeConnection }= require("../utils/js/webrtc/webrtc-no");


//Traemos el config para el jwtSecret
const { config } = require('../config/config');

const isLoggedIn = require("../middlewares/IsLoggedIn");

const { requireAuth } = require('../middlewares/auth');


router.get('/owner-data', requireAuth, (req, res) => {
    // Este endpoint solo devuelve datos si la cookie está presente
    const email = req.cookies.username;
    res.json({ email, dashboardData: "Aquí van tus datos" });
});

router.get("/file", (req, res)=>{
    const filePath = path.join(__dirname,'data','votacion.txt'); // Ruta segura al archivo
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer en el archivo:', err);
            return res.status(500).send('Error al leer en el archivo.');
        }

        try {
            // Dividir las líneas y parsearlas a objetos JSON
            const votes = data.split('\n') // Dividir por líneas
                .filter(line => line.trim() !== '') // Eliminar líneas vacías
                .map(line => JSON.parse(line)); // Parsear cada línea como JSON
            res.json(votes);
        } catch (parseError) {
            console.error('Error al parsear los datos:', parseError);
            res.status(500).send('Error al procesar los datos');
        }
    }); 
});

// ================= Archivos de correo validar Quorum ==================
router.get("/emailFile", (req, res)=>{
    const filePath = path.join(__dirname,'data','correos.txt'); // Ruta segura al archivo
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer en el archivo:', err);
            return res.status(500).send('Error al leer en el archivo.');
        }

        // res.send('Archivo escrito exitosamente.');
        try {
            // Dividir las líneas y parsearlas a objetos JSON
            const votes = data.split('\n') // Dividir por líneas
                .filter(line => line.trim() !== '') // Eliminar líneas vacías
                .map(line => JSON.parse(line)); // Parsear cada línea como JSON
            res.json(votes);
        } catch (parseError) {
            console.error('Error al parsear los datos:', parseError);
            res.status(500).send('Error al procesar los datos');
        }
    }); 
});

router.post("/fileOwnerByEmail", (req, res)=>{
    const  { email }  = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).send('Email es requerido y debe ser un string.');
    }

    const filePath = path.join(__dirname,'data','correos.txt'); // Ruta segura al archivo

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer en el archivo:', err);
            return res.status(500).send('Error al leer en el archivo.');
        }

        try {
            // const owners = JSON.parse(data);
            const lines = data.split('\n') // Dividir por líneas
                .filter(line => line.trim() !== '') // Eliminar líneas vacías

            // Intentar parsear cada línea y manejar errores individualmente
            const owners = lines.map((line, index) => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    console.error(`Error al parsear la línea ${index + 1}:`, error);
                    throw new Error('Archivo contiene líneas inválidas.');
                }
            });

            const owner = owners.find(o => o.correo.trim().toLowerCase() === email.trim().toLowerCase());

            if (owner) {
                const participacion = owner['participacion'];

                return res.json({message:"contenido del archivo parseado y participacion", owner, participacion});
            } else {
                
                return res.status(404).send('Correo no encontrado.');
            }
        } catch (parseError) {
            console.error('Error al parsear los datos:', parseError);
            res.status(500).send('Error al procesar los datos');
        }
    }); 
});

router.post("/votacion", (req, res)=>{
    const   globalNewDict   = req.body;
    
    const filePath=path.join(__dirname,'data','votacion.txt'); // Ruta segura al archivo

    // Validar la entrada
    if (!filePath || !globalNewDict) {
        return res.status(400).send('Falta filePath o data en el cuerpo de la solicitud.');
    }

    // Escribir en el archivo
    fs.appendFile(filePath, JSON.stringify(globalNewDict) + '\n', (err) => {
        if (err) {
            console.error('Error al escribir en el archivo:', err);
            return res.status(500).send('Error al escribir en el archivo.');
        }

        res.send('Archivo escrito exitosamente.');
    });
});

// ============================= envio del enlace ======================

// Endpoint para solicitar un enlace mágico

router.post('/request-magic-link', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email es requerido' });
    }

    // Generar un token JWT con un tiempo de expiración (15 minutos)
    const token = jwt.sign({ email }, config.jwtSecret, { expiresIn: '24h' });

    const result = await sendMagicLink(email, token);

    if (result.success) {
      res.json({ message: 'Correo enviado' });
    } else {
      res.status(500).json({ error: 'No se pudo enviar el correo' });
    }
});

// Endpoint para manejar el enlace mágico
router.get('/magic-link', (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: 'Token es requerido' });
    }

    try {
        // Verificar el token
        const payload = jwt.verify(token, config.jwtSecret);

        res.cookie('username', payload.email, {
            httpOnly: true,
            // secure: config.isProd,
            secure: true,
            sameSite: 'None', // Necesario para cross-origin
            // maxAge: 1000 * 60 * 60 * 2, // 2 horas
            });

        // Enviar cookie segura con el token
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,       // solo en HTTPS
            sameSite: 'Strict', // protege CSRF
            // maxAge: 15 * 60 * 1000 * 2 // 15 minutos
            });


        // En lugar de redirigir directamente
        return res.json({ 
            redirectTo: `${config.FrontEndBaseUrl}/owner`,
            email: payload.email, 
        });
    
    } catch (error) {
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
});


router.post('/request-participation', async (req, res) => {
  try {

     const token = req.cookies?.token;
    //  const io = req.io; // Usa la instancia compartida
    
    if (!token) {
        console.log('Token no encontrado en cookies');
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const email = decoded.email;
    const { roomId } = req.body;

    if (!roomId) return res.status(400).json({ error: 'roomId requerido' });

    await requestToJoinRoom(roomId, email);

    res.status(200).json({ message: 'Solicitud enviada' });
  } catch (err) {
    console.error("Error al procesar solicitud:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

//recupera solicitudes por id
router.post('/recover-users-id', async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) return res.status(400).json({ error: 'roomId/userId y userId son requeridos' });

    const pendingUsersById = await getPendingRequestById(roomId, userId);
    const approvedUsersById = await getApprovedUserById(roomId, userId);

    // console.log("usuarios pendientes",pendingUsers);
    res.status(200).json({ 
      pendingUsersById, 
      approvedUsersById
    });

    // const approvedUsersById = await approveUser(roomId, userId);
    // console.log("usuarios pendientes",pendingUsers);
    // res.status(200).json({ approvedUsersById});

    // res.status(200).json({ message: 'Solicitantes enviados' });
  } catch (err) {
    console.error("Error al procesar solicitud:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/searched-users-approved', async (req, res) => {
    
  try {
    const { roomId } = req.body;
    // console.log('Request recibido con roomId:', roomId); // Debug 1

    if (!roomId) return res.status(400).json({ error: 'roomId requerido' });
    const data = await ApprovedUserQuery(roomId);
    // console.log('Datos obtenidos de Supabase:', data); // Debug 2

    res.status(200).json({ 
        success: true,
        approvedUsers: data });
  } catch (err) {
    console.error("Error al procesar solicitud:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


//recupera los que piden la palabra de supabase
router.post('/recover-users', async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) return res.status(400).json({ error: 'roomId requerido' });

    const pendingUsers = await getPendingRequest(roomId);
    // console.log("usuarios pendientes",pendingUsers);
    res.status(200).json({ pendingUsers});


    // res.status(200).json({ message: 'Solicitantes enviados' });
  } catch (err) {
    console.error("Error al procesar solicitud:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});



router.post('/approved-users', async (req, res) => {
    
  try {
    const { roomId, userId } = req.body;

    if (!roomId) return res.status(400).json({ error: 'roomId requerido' });
    await approveUser(roomId, userId);

    res.status(200).json({ message: 'Solicitante aprobado' });
  } catch (err) {
    console.error("Error al procesar solicitud:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/offer', async (req, res) => {
    
  try {
    const { offer } = req.body;

    if (!offer) return res.status(400).json({ error: 'userId requerido' });
    await offers(offer);

    res.status(200).json({ message: 'Solicitante aprobado' });
  } catch (err) {
    console.error("Error al procesar solicitud:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/answer', async (req, res) => {
    
  try {
    const { answer } = req.body;

    if (!answer) return res.status(400).json({ error: 'userId requerido' });
    await offersAnswer(answer);

    res.status(200).json({ message: 'Solicitante aprobado' });
  } catch (err) {
    console.error("Error al procesar solicitud:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});



router.post('/cancel-users', async (req, res) => {
    
  try {
    const { userId } = req.body;

    await deleteCandidate(userId);

    res.status(200).json({ message: 'Solicitante cancelado' });
  } catch (err) {
    console.error("Error al procesar solicitud:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


//================== ENDPOINTS WEBRTC-CLIENT - SUPABASE============================
router.post('/activate-call', async (req, res)=> {
    try {
        const { roomId, userId, offerId } = req.body;
        
        requestToJoinRoom(roomId, userId, offerId)

        res.status(200).json({ message: 'LLamada activada' });

        }catch(err){
            console.error("Error al procesar solicitud:", err);
            res.status(500).json({ error: 'Error del servidor' });
        }
    });


router.post('/create-room', (req, res) => {

    try{
        createRoom(roomId);
    }catch(err){
        console.error("Error al procesar solicitud:", err);
        res.status(500).json({ error: 'Error del servidor' });
    }
    
});

// Exponer configuración WebRTC
router.get('/webrtc-config', (req, res) => {
  res.json({
    iceServers: [
      { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },

      // Servidor TURN (más lento, como plan B para casos difíciles)
      // {
      //   urls: 'turn:mi-servidor-turn.com:19403', // URL de tu servidor TURN
      //   username: 'rivascel@gmail.com',                // Usuario para autenticación
      //   credential: 'J3susg0d!'            // Contraseña o token
      // },
      //  {
      //   urls: "stun:stun.relay.metered.ca:80",
      // },
      // {
      //   urls: "turn:standard.relay.metered.ca:80",
      //   username: "6e91ed4ca990de235a21a66f",
      //   credential: "mqzh0ARtqA3rjU6e",
      // },
      // {
      //   urls: "turn:standard.relay.metered.ca:80?transport=tcp",
      //   username: "6e91ed4ca990de235a21a66f",
      //   credential: "mqzh0ARtqA3rjU6e",
      // },
      // {
      //   urls: "turn:standard.relay.metered.ca:443",
      //   username: "6e91ed4ca990de235a21a66f",
      //   credential: "mqzh0ARtqA3rjU6e",
      // },
      {
        urls: "turns:standard.relay.metered.ca:443?transport=tcp",
        username: "6e91ed4ca990de235a21a66f",
        credential: "mqzh0ARtqA3rjU6e",
      },

    ],
    iceCandidatePoolSize: 10
  });
});

module.exports = router;