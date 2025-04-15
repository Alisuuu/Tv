const http = require('http');
const WebSocket = require('ws');

// Crie um servidor HTTP
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('WebSocket Server');
});

// Anexe o WebSocket ao mesmo servidor
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Novo cliente conectado');
  
  ws.on('message', (message) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });
});

// Use a porta do Render ou 8080 localmente
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
