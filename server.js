const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
app.use(cors());
app.use(express.static('public'));

// Proxy para a playlist
app.get('/api/playlist', async (req, res) => {
  try {
    const response = await fetch('http://server10.maxcdn.link:2052/get.php?username=md854a&password=abc125ad&type=m3u_plus&output=m3u8');
    const data = await response.text();
    res.send(data);
  } catch (error) {
    res.status(500).send('Erro na playlist');
  }
});

// Proxy para TMDB
app.get('/api/tmdb', async (req, res) => {
  try {
    const { query } = req.query;
    const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=5e5da432e96174227b25086fe8637985&query=${encodeURIComponent(query)}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro TMDB' });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
