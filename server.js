// server.js (Versão Simplificada - Sem lista.txt, Chat com Tipos)

// --- Dependências ---
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path'); // fs não é mais necessário

// --- Configuração Inicial ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- Rotas da API ---
// Nenhuma rota de API é necessária agora para buscar streams

// --- Configuração do Servidor HTTP e WebSocket ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

console.log('[WebSocket] Servidor WebSocket iniciando...');

wss.on('connection', (ws) => {
    console.log('[WebSocket] Cliente conectado.');

    ws.on('message', (message) => {
        let messageString = '';
        try {
            // Assume que a mensagem é um Buffer, converte para string
            messageString = message.toString();
            console.log('[WebSocket] Mensagem string recebida:', messageString);

            // Tenta parsear como JSON - TODAS as mensagens devem ser JSON agora
            const parsedMessage = JSON.parse(messageString);

            // Re-serializa para garantir que é JSON válido para broadcast
            const messageToSend = JSON.stringify(parsedMessage);

            // Broadcast (reenviar) a mensagem JSON para TODOS os outros clientes conectados
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    try {
                        client.send(messageToSend);
                    } catch (sendError) {
                        console.error('[WebSocket] Erro ao enviar mensagem JSON para cliente:', sendError);
                    }
                }
            });

        } catch (error) {
            // Se falhar o JSON.parse ou outra coisa
            console.error('[WebSocket] Erro ao processar/transmitir mensagem:', error, "Mensagem original:", messageString);
            // Decide se quer notificar o remetente ou apenas logar
            // ws.send(JSON.stringify({ type: 'error', content: 'Mensagem inválida.' }));
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket] Cliente desconectado.');
    });

    ws.on('error', (error) => {
        console.error('[WebSocket] Erro na conexão do cliente:', error);
    });
});

// --- Iniciar o Servidor ---
server.listen(PORT, () => {
    console.log(`-------------------------------------------------------`);
    console.log(`Servidor HTTP e WebSocket rodando na porta ${PORT}`);
    console.log(`(Player fixo, sem leitura de lista.txt)`);
    console.log(`Acesse localmente em: http://localhost:${PORT}`);
    console.log(`-------------------------------------------------------`);
});
