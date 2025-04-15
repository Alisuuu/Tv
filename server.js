// server.js Completo

// --- Dependências ---
const express = require('express');
const http = require('http'); // Necessário para integrar Express e WebSocket na mesma porta
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// --- Configuração Inicial ---
const app = express();
const PORT = process.env.PORT || 3000; // Porta definida pelo Render ou 3000 localmente

// --- Middleware ---
// Servir arquivos estáticos da pasta 'public' (HTML, CSS, JS do cliente)
app.use(express.static(path.join(__dirname, 'public')));

// --- Rotas da API ---

// Endpoint API para buscar a lista de streams (COM MAIS LOGS)
app.get('/api/streams', (req, res) => {
    const filePath = path.join(__dirname, 'lista.txt');
    console.log(`[LOG API] Tentando ler o arquivo em: ${filePath}`); // Log 1: Caminho do arquivo

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("[LOG API] ERRO ao ler lista.txt:", err); // Log 2: Erro na leitura
            // Envia o erro específico para o cliente também, ajuda a depurar no navegador
            return res.status(500).json({
                error: 'Erro ao carregar a lista de streams do servidor.',
                details: err.message // Mensagem de erro real
            });
        }

        console.log("[LOG API] Arquivo lista.txt lido com sucesso."); // Log 3: Sucesso na leitura
        // console.log("[LOG API] Conteúdo bruto:\n", data); // Descomente se quiser ver o conteúdo exato

        try {
            const lines = data.split('\n');
            console.log(`[LOG API] Número de linhas encontradas: ${lines.length}`); // Log 4: Total de linhas

            const streams = lines
                .map(line => line.trim())
                .filter(line => {
                    const hasContent = !!line; // Linha não é vazia
                    const hasSeparator = line.includes('|');
                    // Log para cada linha sendo filtrada
                    // console.log(`[LOG API] Filtrando linha: "${line}" | Tem conteúdo: ${hasContent} | Tem separador: ${hasSeparator}`);
                    return hasContent && hasSeparator; // Garante que não está vazia E tem o separador '|'
                 })
                .map(line => {
                    const parts = line.split('|');
                    if (parts.length >= 2) {
                         const streamData = {
                             title: parts[0].trim(),
                             url: parts[1].trim()
                         };
                         // console.log('[LOG API] Stream processado:', streamData); // Log de stream individual
                         return streamData;
                    }
                     console.warn(`[LOG API] Linha ignorada (formato inválido após split): "${line}"`);
                     return null; // Ignora linhas mal formatadas que passaram o filtro inicial
                })
                .filter(stream => stream !== null); // Remove nulos de linhas mal formatadas

            console.log(`[LOG API] Número de streams processados com sucesso: ${streams.length}`); // Log 5: Streams válidos
            console.log("[LOG API] Enviando streams para o frontend:", JSON.stringify(streams, null, 2)); // Log 6: Resultado final

            res.json(streams);

        } catch (parseError) {
            console.error("[LOG API] ERRO ao processar o conteúdo de lista.txt:", parseError); // Log 7: Erro no processamento
            res.status(500).json({
                error: 'Erro ao processar a lista de streams no servidor.',
                details: parseError.message
             });
        }
    });
});

// Rota principal (opcional, se /public/index.html for servido automaticamente)
// app.get('/', (req, res) => {
//    res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });


// --- Configuração do Servidor HTTP e WebSocket ---

// Criar servidor HTTP a partir do app Express
// Isso é necessário para que o servidor WebSocket possa "ouvir" na mesma porta
const server = http.createServer(app);

// Criar servidor WebSocket e anexá-lo ao servidor HTTP
const wss = new WebSocket.Server({ server });

console.log('[WebSocket] Servidor WebSocket iniciando...');

// Lógica para quando um cliente WebSocket se conecta
wss.on('connection', (ws) => {
    console.log('[WebSocket] Cliente conectado.');

    // Lógica para quando uma mensagem é recebida de um cliente
    ws.on('message', (message) => {
        const messageString = message.toString(); // Converte buffer para string
        console.log('[WebSocket] Mensagem recebida:', messageString);

        // Broadcast (reenviar) a mensagem para TODOS os outros clientes conectados
        wss.clients.forEach((client) => {
            // Verifica se o cliente está pronto para receber e não é o próprio remetente
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageString); // Reenvia a mensagem recebida
                } catch (sendError) {
                    console.error('[WebSocket] Erro ao enviar mensagem para cliente:', sendError);
                }
            }
        });
    });

    // Lógica para quando um cliente se desconecta
    ws.on('close', () => {
        console.log('[WebSocket] Cliente desconectado.');
    });

    // Lógica para lidar com erros na conexão WebSocket do cliente
    ws.on('error', (error) => {
        console.error('[WebSocket] Erro na conexão do cliente:', error);
    });

    // Opcional: Enviar uma mensagem de boas-vindas apenas para o cliente que acabou de conectar
    // ws.send('Bem-vindo ao chat!');
});


// --- Iniciar o Servidor ---
server.listen(PORT, () => {
    console.log(`-------------------------------------------------------`);
    console.log(`Servidor HTTP e WebSocket rodando na porta ${PORT}`);
    console.log(`Acesse localmente em: http://localhost:${PORT}`);
    console.log(`(No Render, acesse pela URL fornecida pelo Render)`);
    console.log(`-------------------------------------------------------`);
});
