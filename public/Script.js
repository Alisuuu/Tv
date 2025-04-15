document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('videoPlayer');
    // const streamSelector = document.getElementById('streamSelector'); // REMOVIDO
    const chatbox = document.getElementById('chatbox');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const gifButton = document.getElementById('gifButton'); // Placeholder
    const stickerButton = document.getElementById('stickerButton'); // Placeholder

    let hls = null;
    let socket = null;

    // URL Fixa do Stream
    const fixedStreamUrl = "https://stitcher-ipv4.pluto.tv/v1/stitch/embed/hls/channel/5f1212ad1728050007a523b8/master.m3u8?deviceType=unknown&deviceMake=unknown&deviceModel=unknown&deviceVersion=unknown&appVersion=unknown&deviceLat=90&deviceLon=0&deviceDNT=TARGETOPT&deviceId=PSID&advertisingId=PSID&us_privacy=1YNY&profileLimit=&profileFloor=&embedPartner=";

    // --- Configuração e Carregamento do Player HLS.js ---
    function setupAndLoadPlayer(videoElement, streamUrl) {
        if (!streamUrl) {
            console.error("Nenhuma URL de stream fornecida para carregar.");
            return;
        }

        if (Hls.isSupported()) {
            console.log('HLS.js é suportado. Iniciando...');
            if (hls) { // Destrói instância anterior se existir
                hls.destroy();
            }
            hls = new Hls();
            hls.loadSource(streamUrl); // Carrega a URL fixa
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                console.log("Manifest HLS carregado, pronto para tocar.");
                 // videoPlayer.play().catch(e => console.warn("Play automático bloqueado?", e));
            });
            hls.on(Hls.Events.ERROR, function (event, data) {
                console.error('Erro HLS:', data);
                // Lógica de tratamento de erro HLS...
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('HLS.js não suportado, tentando HLS nativo...');
            videoElement.src = streamUrl; // Define a URL fixa para player nativo
            videoElement.addEventListener('loadedmetadata', () => {
                // videoPlayer.play().catch(e => console.warn("Play automático bloqueado?", e));
            });
             videoElement.addEventListener('error', (e) => {
                console.error('Erro ao carregar vídeo nativamente:', e);
                addSystemMessage(`Erro ao carregar stream: ${e.message || 'Verifique o console do navegador (F12).'}`);
            });
        } else {
            console.error('HLS não é suportado neste navegador.');
            alert('Seu navegador não suporta a reprodução destes streams.');
        }
    }

    // --- Carregar Lista de Streams (REMOVIDO) ---
    // function loadStreamList() { ... } // Não é mais necessário

    // --- Lógica de Seleção de Stream (REMOVIDO) ---
    // streamSelector.addEventListener('change', (event) => { ... }); // Não é mais necessário

    // --- Configuração do WebSocket (Chat com JSON) ---
    function connectWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        console.log(`Tentando conectar WebSocket em: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WebSocket conectado com sucesso!');
            addSystemMessage('Conectado ao chat.');
        };

        socket.onmessage = (event) => {
            console.log('Mensagem JSON recebida do servidor:', event.data);
            try {
                const msg = JSON.parse(event.data);
                // Passa o objeto JSON para a função de exibição
                displayChatMessage(msg, 'received');
            } catch (error) {
                console.error("Erro ao parsear JSON recebido:", error, "Data:", event.data);
                // Exibe a mensagem como texto simples se não for JSON válido
                 displayChatMessage({ type: 'text', content: event.data.toString() }, 'received');
            }
        };

        socket.onclose = (event) => {
            console.log('WebSocket desconectado.', event.reason);
            addSystemMessage('Desconectado do chat. Tentando reconectar em 5 segundos...');
            socket = null; // Garante que a referência antiga seja limpa
            setTimeout(connectWebSocket, 5000);
        };

        socket.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            addSystemMessage('Erro na conexão do chat.');
        };
    }

    // --- Lógica de Envio de Mensagem do Chat (Adaptada para JSON) ---
    function sendTextMessage() {
        const messageText = messageInput.value.trim();
        if (messageText && socket && socket.readyState === WebSocket.OPEN) {
            const messageObject = {
                type: 'text',
                content: messageText
            };
            console.log('Enviando objeto de texto:', messageObject);
            socket.send(JSON.stringify(messageObject));
            displayChatMessage(messageObject, 'sent'); // Mostra a própria mensagem
            messageInput.value = ''; // Limpa o input
        } else if (!messageText) {
            console.warn("Tentativa de enviar mensagem vazia.");
        } else {
            console.warn("WebSocket não está conectado. Não foi possível enviar mensagem.");
            addSystemMessage('Você não está conectado para enviar mensagens.');
        }
    }

    // Função para enviar GIFs/Stickers (Exemplo - Precisa da URL da imagem)
    function sendImageMessage(imageUrl, imageType = 'gif') { // imageType pode ser 'gif' ou 'sticker'
         if (imageUrl && socket && socket.readyState === WebSocket.OPEN) {
            const messageObject = {
                type: imageType, // 'gif' ou 'sticker'
                content: imageUrl // URL da imagem
            };
            console.log(`Enviando objeto de ${imageType}:`, messageObject);
            socket.send(JSON.stringify(messageObject));
            displayChatMessage(messageObject, 'sent'); // Mostra a própria imagem enviada
        } else {
            console.warn("WebSocket não está conectado ou URL da imagem está vazia.");
            addSystemMessage('Não foi possível enviar a imagem.');
        }
    }


    sendButton.addEventListener('click', sendTextMessage);
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendTextMessage();
        }
    });

    // --- Lógica Placeholder para Botões GIF/Sticker ---
    gifButton.addEventListener('click', () => {
        console.log("Botão GIF clicado - Lógica de seleção não implementada.");
        alert("Funcionalidade de GIF ainda não implementada!");
        // Aqui você abriria um painel de seleção de GIFs (Giphy API, etc.)
        // Exemplo após selecionar um GIF:
        // const selectedGifUrl = "https://media.giphy.com/media/....../giphy.gif"; // URL obtida do seletor
        // sendImageMessage(selectedGifUrl, 'gif');
    });

    stickerButton.addEventListener('click', () => {
        console.log("Botão Sticker clicado - Lógica de seleção não implementada.");
         alert("Funcionalidade de Sticker ainda não implementada!");
        // Aqui você abriria um painel com seus stickers pré-definidos
        // Exemplo após selecionar um sticker:
        // const selectedStickerUrl = "/path/to/your/sticker.png"; // URL do seu sticker
        // sendImageMessage(selectedStickerUrl, 'sticker');
    });


    // --- Funções Auxiliares do Chat (Adaptada para Tipos) ---
    function displayChatMessage(msg, direction) { // direction = 'sent' ou 'received', msg é o objeto JSON {type, content}
        const messageElement = document.createElement('p');
        messageElement.classList.add(direction); // Adiciona classe para estilização (sent/received)

        switch (msg.type) {
            case 'text':
                messageElement.textContent = msg.content;
                break;
            case 'gif':
            case 'sticker':
                const imgElement = document.createElement('img');
                imgElement.src = msg.content;
                imgElement.alt = msg.type; // 'gif' or 'sticker'
                imgElement.classList.add('chat-image'); // Classe para estilização CSS
                messageElement.appendChild(imgElement);
                break;
            case 'error': // Exemplo de tipo de mensagem de erro do servidor
                 messageElement.textContent = `[Erro Servidor]: ${msg.content}`;
                 messageElement.style.color = 'red';
                 messageElement.style.fontStyle = 'italic';
                break;
            default:
                console.warn("Tipo de mensagem desconhecido recebido:", msg.type);
                messageElement.textContent = `[Mensagem ${msg.type}]: ${msg.content}`; // Fallback
        }

        chatbox.appendChild(messageElement);
        // Auto-scroll para a última mensagem
        chatbox.scrollTop = chatbox.scrollHeight;
    }

     function addSystemMessage(message) {
        const messageElement = document.createElement('p');
        messageElement.textContent = `[Sistema]: ${message}`;
        messageElement.style.fontStyle = 'italic';
        messageElement.style.color = '#777';
        chatbox.appendChild(messageElement);
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    // --- Inicialização ---
    setupAndLoadPlayer(videoPlayer, fixedStreamUrl); // Carrega o player com a URL fixa
    connectWebSocket();      // Inicia a conexão do chat
});

