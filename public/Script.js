document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('videoPlayer');
    const streamSelector = document.getElementById('streamSelector');
    const chatbox = document.getElementById('chatbox');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    let hls = null; // Variável para a instância do HLS.js
    let socket = null; // Variável para a conexão WebSocket

    // --- Configuração do Player HLS.js ---
    function setupHlsPlayer(videoElement) {
        if (Hls.isSupported()) {
            console.log('HLS.js é suportado. Iniciando...');
            hls = new Hls();
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                console.log("Manifest HLS carregado, pronto para tocar.");
                // Opcional: Iniciar o play automaticamente
                // videoElement.play().catch(e => console.error("Erro ao tentar tocar vídeo:", e));
            });
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Erro fatal de rede ao carregar HLS:', data);
                            // Tentar recuperar, se possível
                            // hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Erro fatal de mídia HLS:', data);
                            // Tentar recuperar mídia
                            // hls.recoverMediaError();
                            break;
                        default:
                            console.error('Erro fatal HLS não recuperável:', data);
                            // Destruir instância HLS se o erro for irrecuperável
                            // hls.destroy();
                            break;
                    }
                } else {
                     console.warn('Erro HLS não fatal:', data);
                }
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('HLS.js não suportado, mas o navegador suporta HLS nativamente.');
            // Navegador (ex: Safari) suporta HLS nativamente, não precisa de HLS.js
            // Apenas definiremos a URL diretamente no 'src' do vídeo.
        } else {
             console.error('HLS não é suportado neste navegador.');
             alert('Seu navegador não suporta a reprodução de streams HLS.');
        }
    }

    // --- Carregar Lista de Streams ---
    function loadStreamList() {
        fetch('/api/streams')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP! status: ${response.status}`);
                }
                return response.json();
            })
            .then(streams => {
                streamSelector.innerHTML = '<option value="">-- Selecione --</option>'; // Limpa e adiciona opção padrão
                streams.forEach(stream => {
                    const option = document.createElement('option');
                    option.value = stream.url;
                    option.textContent = stream.title;
                    streamSelector.appendChild(option);
                });
                console.log("Lista de streams carregada:", streams);
            })
            .catch(error => {
                console.error('Erro ao buscar a lista de streams:', error);
                alert('Não foi possível carregar a lista de canais.');
            });
    }

    // --- Lógica de Seleção de Stream ---
    streamSelector.addEventListener('change', (event) => {
        const selectedUrl = event.target.value;
        if (selectedUrl) {
            console.log(`Canal selecionado: ${event.target.options[event.target.selectedIndex].text} (${selectedUrl})`);
            if (hls) { // Se HLS.js está ativo
                console.log("Carregando stream com HLS.js...");
                hls.loadSource(selectedUrl);
                // hls.attachMedia(videoPlayer); // Geralmente não precisa re-anexar após a primeira vez
                 videoPlayer.play().catch(e => console.warn("Play automático bloqueado pelo navegador?", e));
            } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) { // Suporte Nativo
                console.log("Carregando stream nativamente...");
                videoPlayer.src = selectedUrl;
                videoPlayer.addEventListener('loadedmetadata', () => {
                   videoPlayer.play().catch(e => console.warn("Play automático bloqueado pelo navegador?", e));
                });
            } else {
                 console.error("Não é possível tocar HLS neste navegador.");
            }
        } else {
             // Opcional: parar o vídeo se "Selecione" for escolhido
             if (hls) hls.stopLoad();
             videoPlayer.pause();
             videoPlayer.removeAttribute('src'); // Limpa a fonte
        }
    });

    // --- Configuração do WebSocket (Chat) ---
    function connectWebSocket() {
        // Determina o protocolo (ws ou wss) e o host
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`; // Conecta ao mesmo host/porta do site

        console.log(`Tentando conectar WebSocket em: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WebSocket conectado com sucesso!');
            addSystemMessage('Conectado ao chat.');
        };

        socket.onmessage = (event) => {
            console.log('Mensagem recebida do servidor:', event.data);
            displayChatMessage(event.data.toString(), 'received');
        };

        socket.onclose = (event) => {
            console.log('WebSocket desconectado.', event.reason);
            addSystemMessage('Desconectado do chat. Tentando reconectar em 5 segundos...');
            // Tenta reconectar após um tempo
            setTimeout(connectWebSocket, 5000);
        };

        socket.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            addSystemMessage('Erro na conexão do chat.');
        };
    }

    // --- Lógica de Envio de Mensagem do Chat ---
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message && socket && socket.readyState === WebSocket.OPEN) {
            console.log('Enviando mensagem:', message);
            socket.send(message);
            displayChatMessage(message, 'sent'); // Mostra a própria mensagem
            messageInput.value = ''; // Limpa o input
        } else if (!message) {
            console.warn("Tentativa de enviar mensagem vazia.");
        } else {
            console.warn("WebSocket não está conectado. Não foi possível enviar mensagem.");
            addSystemMessage('Você não está conectado para enviar mensagens.');
        }
    }

    sendButton.addEventListener('click', sendMessage);
    // Permite enviar com Enter
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // --- Funções Auxiliares do Chat ---
    function displayChatMessage(message, type) { // type = 'sent' ou 'received'
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.classList.add(type); // Adiciona classe para estilização
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
    setupHlsPlayer(videoPlayer); // Configura o player
    loadStreamList();        // Carrega os canais
    connectWebSocket();      // Inicia a conexão do chat
});
