// signaling-server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

let clients = [];

wss.on('connection', function connection(ws) {
  clients.push(ws);
  console.log('Cliente conectado. Total:', clients.length);

  ws.on('message', function incoming(message) {
    // Relay the message to the other peer
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('Cliente desconectado. Total:', clients.length);
  });
});

console.log('Servidor de señalización WebSocket en puerto 3000');
