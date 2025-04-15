// server.js Completo (Adaptado para estrutura Título/Link em linhas separadas)

// --- Dependências ---
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// --- Configuração Inicial ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Rotas da API ---

// Endpoint API para buscar a lista de streams (ADAPTADO PARA NOVA ESTRUTURA)
app.get('/api/streams', (req, res) => {
    const filePath = path.join(__dirname, 'lista.txt');
    console.log(`[LOG API v2] Tentando ler o arquivo em: ${filePath}`); // Log 1

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("[LOG API v2] ERRO ao ler lista.txt:", err); // Log 2
            return res.status(500).json({
                error: 'Erro ao carregar a lista de streams do servidor.',
                details: err.message
            });
        }

        console.log("[LOG API v2] Arquivo lista.txt lido com sucesso."); // Log 3
        // console.log("[LOG API v2] Conteúdo bruto:\n", data);

        try {
            const lines = data.split('\n') // Divide em linhas
                              .map(line => line.trim()) // Remove espaços extras
                              .filter(line => line); // Remove linhas vazias

            console.log(`[LOG API v2] Número de linhas não vazias encontradas: ${lines.length}`); // Log 4

            const streams = [];
            // Itera pelas linhas de 2 em 2 (Título, Link)
            for (let i = 0; i < lines.length; i += 2) {
                // Garante que existe um par (Título e Link)
                if (i + 1 < lines.length) {
                    const title = lines[i];
                    const url = lines[i + 1];
                    // Validação básica da URL (opcional, mas útil)
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                        const streamData = { title: title, url: url };
                        streams.push(streamData);
                        // console.log(`[LOG API v2] Par adicionado: Título='${title}', URL='${url}'`);
                    } else {
                         console.warn(`[LOG API v2] URL inválida ou faltando no par iniciado com Título='${title}'. Link encontrado='${url}'. Par ignorado.`);
                    }
                } else {
                    console.warn(`[LOG API v2] Linha de Título encontrada sem um Link correspondente no final do arquivo: "${lines[i]}". Ignorando.`);
                }
            }

            console.log(`[LOG API v2] Número de streams processados com sucesso: ${streams.length}`); // Log 5
            console.log("[LOG API v2] Enviando streams para o frontend:", JSON.stringify(streams, null, 2)); // Log 6

            res.json(streams);

        } catch (parseError) {
            console.error("[LOG API v2] ERRO ao processar o conteúdo de lista.txt:", parseError); // Log 7
            res.status(500).json({
                error: 'Erro ao processar a lista de streams no servidor.',
                details: parseError.message
             });
        }
    });
});

// --- Configuração do Servidor HTTP e WebSocket ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

console.log('[WebSocket] Servidor WebSocket iniciando...');

wss.on('connection', (ws) => {
    console.log('[WebSocket] Cliente conectado.');
    ws.on('message', (message) => {
        const messageString = message.toString();
        console.log('[WebSocket] Mensagem recebida:', messageString);
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageString);
                } catch (sendError) {
                    console.error('[WebSocket] Erro ao enviar mensagem para cliente:', sendError);
                }
            }
        });
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
    console.log(`Acesse localmente em: http://localhost:${PORT}`);
    console.log(`(No Render, acesse pela URL fornecida pelo Render)`);
    console.log(`-------------------------------------------------------`);
});
