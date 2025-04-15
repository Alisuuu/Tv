const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Porta para o Render ou local

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint API para buscar a lista de streams
app.get('/api/streams', (req, res) => {
    const filePath = path.join(__dirname, 'lista.txt');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Erro ao ler lista.txt:", err);
            return res.status(500).json({ error: 'Erro ao carregar a lista de streams.' });
        }

        try {
            const lines = data.split('\n');
            const streams = lines
                .map(line => line.trim()) // Remove espaços extras
                .filter(line => line && line.includes('|')) // Garante que não está vazia e tem o separador
                .map(line => {
                    const parts = line.split('|');
                    if (parts.length >= 2) {
                        return {
                            title: parts[0].trim(),
                            url: parts[1].trim() // Pega a URL (primeira parte após o '|')
                        };
                    }
                    return null; // Ignora linhas mal formatadas
                })
                .filter(stream => stream !== null); // Remove nulos

            res.json(streams);
        } catch (parseError) {
            console.error("Erro ao processar lista.txt:", parseError);
            res.status(500).json({ error: 'Erro ao processar a lista de streams.' });
        }
    });
});

// Criar servidor HTTP a partir do app Express
const server = http.createServer(app);

// Criar servidor WebSocket anexado ao servidor HTTP
const wss = new WebSocket.Server({ server });

console.log('Servidor WebSocket iniciando...');

wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');

    // Enviar mensagem para todos, exceto para quem enviou
    ws.on('message', (message) => {
        console.log('Mensagem recebida:', message.toString());
        // Broadcast para outros clientes
        wss.clients.forEach((client) => {
            // Verifica se o cliente está aberto e não é o remetente
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message.toString()); // Reenvia a mensagem como string
                } catch (sendError) {
                    console.error('Erro ao enviar mensagem para cliente:', sendError);
                }
            }
        });
    });

    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
    });

    ws.on('error', (error) => {
        console.error('Erro no WebSocket:', error);
    });

    // Opcional: Enviar mensagem de boas-vindas ou lista inicial de usuários
    // ws.send('Bem-vindo ao chat!');
});

// Iniciar o servidor HTTP (que também serve o WebSocket)
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse em http://localhost:${PORT}`);
});

console.log('Configuração do servidor concluída.');
