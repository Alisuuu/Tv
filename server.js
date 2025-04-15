const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Servidor WebSocket funcionando!');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Novo cliente conectado!');
  
  ws.on('message', (message) => {
    console.log('Mensagem recebida: ', message);

    // Enviar mensagem para todos os clientes conectados
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Cliente desconectado!');
  });
});

const port = process.env.PORT || 8080;  // Use a porta fornecida pelo Render
server.listen(port, () => {
  console.log(`Servidor WebSocket rodando na porta ${port}`);
});
