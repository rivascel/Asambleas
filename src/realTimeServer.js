//una funcion que se esta exportando para ser usada en otro
//archivo, y crea el servidor socket.io en tiempo real

module.exports = httpServer =>{
    const { Server } = require("socket.io");
    const io = new Server(httpServer);
    let connectedUsers = [];
    administrador = "";

    io.on("connection", socket => {

        // const cookie = socket.handshake.headers.cookie;

        // if (cookie != administrador) {
        // const user = cookie.split("=").pop();
        // const user = cookie.split("username=").pop()?.split(";")[0]; // Validar la existencia de la cookie

        const cookie = socket.handshake.headers.cookie || "";
        if (cookie != administrador) {
            const user = decodeURIComponent(cookie.split("username=").pop()?.split(";")[0]); // Validar la existencia de la cookie

        // const user = cookie.split("=").pop(); // Obtener el usuario de la cookie

            if (user != '') {
                if (user) {
                    if (!connectedUsers.includes(user)) {
                        connectedUsers.push(user); // Agregar usuario si no está en la lista
                    };
                    console.log("Usuario conectado:", user);
        
                    //Enviar la lista actualizada a todos los clientes
                    io.emit("updateConnectedUsers", connectedUsers);
                    console.log("lista de conectados",connectedUsers)
                }
        
                socket.emit("updatedUser", user );
                // console.log("updatedUser", user);

                // Manejar la desconexión
                socket.on("disconnect", () => {
                    // console.log("Usuario desconectado:", user);
                    connectedUsers = connectedUsers.filter(id => id !== user);
                });

                socket.on("wordUser", ({ user, action}) =>{
                    if (!global.currentAskUsers){ //si no hay usuarios solicitando, array en blanco
                        global.currentAskUsers = []
                    }
                    if (action === 'add'){
                        if(!global.currentAskUsers.includes(user)){
                            global.currentAskUsers.push(user)
                        }
                    
                    }else if (action === 'remove'){
                        global.currentAskUsers = global.currentAskUsers.filter(u => u !== user);
                    }

                    io.emit("wordUser", global.currentAskUsers);
                    console.log("wordUser:", global.currentAskUsers);
                });
                
                // ================= ENVIO DEL DECISION A CLIENTES ===================
                socket.on("send-decision", (data) => {
                    io.emit("receive-decision", (data) );
                });
                
            // ================= ENVIO DE VOTOS A CLIENTES =================
                socket.on("send-votes", data => {
                    console.log("Votos emitidos", data);
                    io.emit("receive-votes", { data });
                    console.log("Votos recibidos del emisor:", data);
                });
                
                //enviar el mensaje y el usuario
                socket.on("message", message => {
                    io.emit("message", {
                        user,message
                    });
                });
        
                //Enviar resultado votacion a todos los sockets conectados
                socket.on("vote1", voto1 =>{
                    io.emit("vote1", {
                        user,voto1
                    });
                });
        
                socket.on("vote2", voto2  =>{
                    io.emit("vote2", {
                        user,voto2
                    });
                });
        
                socket.on("vote3", voto3  =>{
                    io.emit("vote3", {
                        user,voto3 
                    });
                });
            }
            // ===============CONEXION VIDEO ===================================
            // Manejar eventos de WebRTC (señalización)
            // socket.on("offer", data => {
            //     const { to, offer } = data;
            //     io.to(to).emit("offer", { from: socket.id, offer });
            // });

            // socket.on("answer", data => {
            //     const { to, answer } = data;
            //     io.to(to).emit("answer", { from: socket.id, answer });
            // });

            // socket.on("ice-candidate", data => {
            //     const { to, candidate } = data;
            //     io.to(to).emit("ice-candidate", { from: socket.id, candidate });
            // });

            // // Notificar a otros usuarios sobre nuevas conexiones
            // socket.on("join-room", roomId => {
            //     socket.join(roomId);
            //     socket.to(roomId).emit("user-connected", socket.id);
            // });

            // socket.on("disconnect", () => {
            //     console.log("Cliente desconectado:", socket.id);
            //     io.emit("user-disconnected", socket.id);
            // });
            

            // ================= ENVIO DEL CRONOMETRO A CLIENTES ===================
            // Escuchar el inicio del cronómetro
            socket.on('start-cronometer', ({ time, aprueba, rechaza, blanco })  => {

                // const { time, aprueba, rechaza, blanco } = data;
                // Retransmitir a todos los clientes
                io.emit('start-cronometer', { 
                    time, aprueba, rechaza, blanco 

                });
                console.log("cronometro iniciado", time, aprueba, rechaza, blanco);
            });

            // Escuchar las actualizaciones del cronómetro
            socket.on('update-cronometer', data => {
                io.emit('update-cronometer', data);
            });

            socket.on('end-cronometer', () => {
                io.emit('end-cronometer');
            });
        }
    });
};
