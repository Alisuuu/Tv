// public/script.js (Versão com MAIS Diagnósticos)

// Adiciona um log global para saber se o script começou a rodar
console.log("[DEBUG] script.js iniciado.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("[DEBUG] DOM totalmente carregado.");

    // --- Seleção de Elementos DOM ---
    const videoPlayer = document.getElementById('videoPlayer');
    const chatbox = document.getElementById('chatbox');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const gifButton = document.getElementById('gifButton');
    const stickerButton = document.getElementById('stickerButton');

    // Verifica se os elementos essenciais foram encontrados
    if (!videoPlayer) console.error("[DEBUG] ERRO: Elemento #videoPlayer não encontrado!");
    if (!chatbox) console.error("[DEBUG] ERRO: Elemento #chatbox não encontrado!");
    if (!messageInput) console.error("[DEBUG] ERRO: Elemento #messageInput não encontrado!");
    if (!sendButton) console.error("[DEBUG] ERRO: Elemento #sendButton não encontrado!");
    if (!gifButton) console.log("[DEBUG] Aviso: Elemento #gifButton não encontrado (opcional)."); // Aviso em vez de erro
    if (!stickerButton) console.log("[DEBUG] Aviso: Elemento #stickerButton não encontrado (opcional)."); // Aviso em vez de erro

    let hls = null;
    let socket = null;

    // URL Fixa do Stream
    const fixedStreamUrl = "https://stitcher-ipv4.pluto.tv/v1/stitch/embed/hls/channel/5f1212ad1728050007a523b8/master.m3u8?deviceType=unknown&deviceMake=unknown&deviceModel=unknown&deviceVersion=unknown&appVersion=unknown&deviceLat=90&deviceLon=0&deviceDNT=TARGETOPT&deviceId=PSID&advertisingId=PSID&us_privacy=1YNY&profileLimit=&profileFloor=&embedPartner=";
    console.log("[DEBUG] URL do Stream definida:", fixedStreamUrl);

    // --- Configuração e Carregamento do Player HLS.js ---
    function setupAndLoadPlayer(videoElement, streamUrl) {
        console.log("[DEBUG] Iniciando setupAndLoadPlayer...");
        if (!videoElement) {
             console.error("[DEBUG] Player de vídeo não encontrado, não é possível configurar HLS.");
             return;
        }
        if (!streamUrl) {
            console.error("[DEBUG] Nenhuma URL de stream fornecida para carregar.");
            return;
        }

        try {
            if (typeof Hls === 'undefined') {
                 console.error("[DEBUG] ERRO: Biblioteca HLS.js não foi carregada. Verifique o <script> no HTML.");
                 alert("Erro crítico: Biblioteca de vídeo não carregada.");
                 return; // Interrompe aqui se HLS não existe
            }

            if (Hls.isSupported()) {
                console.log('[DEBUG] HLS.js é suportado. Configurando...');
                if (hls) {
                    console.log("[DEBUG] Destruindo instância HLS anterior.");
                    hls.destroy();
                }
                hls = new Hls();
                console.log("[DEBUG] Carregando source:", streamUrl);
                hls.loadSource(streamUrl);
                hls.attachMedia(videoElement);
                hls.on(Hls.Events.MANIFEST_PARSED, function () {
                    console.log("[DEBUG] Manifest HLS carregado.");
                });
                hls.on(Hls.Events.ERROR, function (event, data) {
                    console.error('[DEBUG] Erro HLS:', data);
                    // Adiciona mensagem de erro ao chat ou tela
                    addSystemMessage(`Erro ao carregar vídeo HLS: ${data.details || data.type || 'Erro desconhecido'}. Verifique o console (F12) para detalhes.`);
                });
                 console.log("[DEBUG] HLS.js configurado e source carregado.");
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                console.log('[DEBUG] HLS.js não suportado, tentando HLS nativo...');
                videoElement.src = streamUrl;
                videoElement.addEventListener('loadedmetadata', () => {
                    console.log("[DEBUG] Metadados do vídeo nativo carregados.");
                });
                 videoElement.addEventListener('error', (e) => {
                    console.error('[DEBUG] Erro ao carregar vídeo nativamente:', e);
                    addSystemMessage(`Erro ao carregar stream nativo: Verifique o console (F12).`);
                });
            } else {
                console.error('[DEBUG] HLS não é suportado neste navegador.');
                alert('Seu navegador não suporta a reprodução destes streams.');
            }
        } catch (error) {
            console.error("[DEBUG] ERRO CRÍTICO durante a configuração do player:", error);
            alert("Ocorreu um erro inesperado ao configurar o player de vídeo.");
        }
    }

    // --- Configuração do WebSocket (Chat com JSON) ---
    function connectWebSocket() {
        console.log("[DEBUG] Iniciando connectWebSocket...");
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}`;
            console.log(`[DEBUG] Tentando conectar WebSocket em: ${wsUrl}`);

            // Limpa socket antigo se existir e estiver fechando/fechado
             if (socket && (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED)) {
                socket = null;
             }
             // Previne múltiplas conexões
             if (socket && socket.readyState === WebSocket.OPEN) {
                console.warn("[DEBUG] Tentativa de reconectar WebSocket já aberto.");
                return;
             }

            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('[DEBUG] WebSocket conectado com sucesso!');
                addSystemMessage('Conectado ao chat.');
            };

            socket.onmessage = (event) => {
                console.log('[DEBUG] Mensagem bruta recebida do servidor:', event.data);
                try {
                    const msg = JSON.parse(event.data);
                    console.log('[DEBUG] Mensagem JSON parseada:', msg);
                    displayChatMessage(msg, 'received');
                } catch (error) {
                    console.error("[DEBUG] Erro ao parsear JSON recebido:", error, "Data:", event.data);
                    // Exibe como texto simples se falhar
                    displayChatMessage({ type: 'text', content: event.data.toString() }, 'received');
                }
            };

            socket.onclose = (event) => {
                console.log('[DEBUG] WebSocket desconectado.', event.code, event.reason);
                addSystemMessage('Desconectado do chat. Tentando reconectar...');
                socket = null; // Limpa referência
                // Tenta reconectar apenas se não foi um fechamento limpo ou intencional
                if (!event.wasClean) {
                   setTimeout(connectWebSocket, 5000); // Tenta reconectar após 5s
                }
            };

            socket.onerror = (error) => {
                // O evento 'error' geralmente é seguido por 'close'.
                console.error('[DEBUG] Erro no WebSocket:', error);
                // A mensagem no 'onclose' geralmente é mais informativa
                // addSystemMessage('Erro na conexão do chat.');
            };
            console.log("[DEBUG] Objeto WebSocket criado e listeners adicionados.");
        } catch (error) {
             console.error("[DEBUG] ERRO CRÍTICO durante a conexão WebSocket:", error);
             alert("Ocorreu um erro inesperado ao conectar ao chat.");
        }
    }

    // --- Lógica de Envio de Mensagem do Chat (Adaptada para JSON) ---
    function sendTextMessage() {
        console.log("[DEBUG] sendTextMessage chamada.");
        if (!messageInput) {
             console.error("[DEBUG] Input de mensagem não encontrado para enviar.");
             return;
        }
        const messageText = messageInput.value.trim();
        if (messageText) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                const messageObject = { type: 'text', content: messageText };
                try {
                    const jsonMessage = JSON.stringify(messageObject);
                    console.log('[DEBUG] Enviando objeto de texto:', jsonMessage);
                    socket.send(jsonMessage);
                    displayChatMessage(messageObject, 'sent');
                    messageInput.value = '';
                } catch (error) {
                     console.error("[DEBUG] Erro ao converter mensagem para JSON:", error);
                     addSystemMessage("Erro ao formatar mensagem para envio.");
                }
            } else {
                 console.warn("[DEBUG] WebSocket não está conectado. Não foi possível enviar.");
                 addSystemMessage('Você não está conectado para enviar mensagens.');
            }
        } else {
            console.warn("[DEBUG] Tentativa de enviar mensagem vazia.");
        }
    }

    function sendImageMessage(imageUrl, imageType = 'gif') {
         console.log(`[DEBUG] sendImageMessage chamada: ${imageType}, ${imageUrl}`);
         // Lógica similar a sendTextMessage, mas com type 'gif' ou 'sticker'
         if (imageUrl && socket && socket.readyState === WebSocket.OPEN) {
            const messageObject = { type: imageType, content: imageUrl };
             try {
                const jsonMessage = JSON.stringify(messageObject);
                console.log(`[DEBUG] Enviando objeto de ${imageType}:`, jsonMessage);
                socket.send(jsonMessage);
                displayChatMessage(messageObject, 'sent');
             } catch (error) {
                 console.error("[DEBUG] Erro ao converter imagem para JSON:", error);
                 addSystemMessage("Erro ao formatar imagem para envio.");
             }
         } else {
             console.warn("[DEBUG] WebSocket não conectado ou URL da imagem vazia.");
             addSystemMessage('Não foi possível enviar a imagem.');
         }
    }

    // Adiciona listeners aos botões (se eles existirem)
    if (sendButton) {
        sendButton.addEventListener('click', sendTextMessage);
    } else {
         console.error("[DEBUG] Botão #sendButton não encontrado para adicionar listener.");
    }
    if (messageInput) {
        messageInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendTextMessage();
            }
        });
    } else {
         console.error("[DEBUG] Input #messageInput não encontrado para adicionar listener de Enter.");
    }

    // Listeners placeholder para GIF/Sticker (se existirem)
     if (gifButton) gifButton.addEventListener('click', () => { console.log("[DEBUG] Botão GIF placeholder clicado."); alert("Seleção de GIF não implementada."); });
     if (stickerButton) stickerButton.addEventListener('click', () => { console.log("[DEBUG] Botão Sticker placeholder clicado."); alert("Seleção de Sticker não implementada."); });


    // --- Funções Auxiliares do Chat ---
    function displayChatMessage(msg, direction) {
        // console.log(`[DEBUG] displayChatMessage: direction=${direction}, msg=`, msg);
        if (!chatbox) return; // Não faz nada se o chatbox não existe

        const messageElement = document.createElement('p');
        messageElement.classList.add(direction); // 'sent' ou 'received'

        try {
            switch (msg.type) {
                case 'text':
                    messageElement.textContent = msg.content;
                    break;
                case 'gif':
                case 'sticker':
                    const imgElement = document.createElement('img');
                    imgElement.src = msg.content;
                    imgElement.alt = msg.type;
                    imgElement.classList.add('chat-image');
                     // Adiciona tratamento de erro para imagens quebradas
                     imgElement.onerror = () => { imgElement.alt = `Erro ao carregar ${msg.type}`; imgElement.src = ''; /* ou uma imagem placeholder */ }
                    messageElement.appendChild(imgElement);
                    break;
                case 'error':
                    messageElement.textContent = `[Erro Servidor]: ${msg.content}`;
                    messageElement.style.color = 'red';
                    messageElement.style.fontStyle = 'italic';
                    break;
                default:
                    console.warn("[DEBUG] Tipo de mensagem desconhecido recebido:", msg.type);
                    messageElement.textContent = `[Mensagem ${msg.type}]: ${msg.content}`;
            }
             chatbox.appendChild(messageElement);
             chatbox.scrollTop = chatbox.scrollHeight; // Auto-scroll
        } catch (error) {
             console.error("[DEBUG] Erro ao exibir mensagem no chat:", error, "Mensagem:", msg);
        }
    }

     function addSystemMessage(message) {
        console.log(`[DEBUG] System Message: ${message}`);
        if (!chatbox) return;
        const messageElement = document.createElement('p');
        messageElement.textContent = `[Sistema]: ${message}`;
        messageElement.style.fontStyle = 'italic';
        messageElement.style.color = '#777';
        chatbox.appendChild(messageElement);
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    // --- Inicialização ---
    console.log("[DEBUG] Iniciando setup do Player e conexão WebSocket...");
    // Verifica se videoPlayer existe antes de chamar
    if (videoPlayer) {
        setupAndLoadPlayer(videoPlayer, fixedStreamUrl);
    } else {
        console.error("[DEBUG] Player de vídeo não encontrado na inicialização.");
    }
    connectWebSocket();

}); // Fim do DOMContentLoaded

console.log("[DEBUG] script.js finalizado.");
