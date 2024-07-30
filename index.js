const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Inicializar la aplicación Express
const app = express();
const port = 3000;

// Middleware para parsear JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para obtener todos los jugadores
app.get('/players', (req, res) => {
  const players = readPlayers();
  res.json(players);
});

// Ruta para agregar un nuevo jugador
app.post('/players', (req, res) => {
  const { name, rating } = req.body;
  if (!name || !rating) {
    return res.status(400).send('Name and rating are required');
  }
  const players = readPlayers();
  const newPlayer = { id: Date.now(), name, rating: parseInt(rating) };
  players.push(newPlayer);
  savePlayers(players);
  res.status(201).json(newPlayer);
});

// Ruta para editar un jugador
app.put('/players/:id', (req, res) => {
  const { id } = req.params;
  const { name, rating } = req.body;
  const players = readPlayers();
  const player = players.find(p => p.id === parseInt(id));
  if (!player) {
    return res.status(404).send('Player not found');
  }
  player.name = name || player.name;
  player.rating = rating !== undefined ? parseInt(rating) : player.rating;
  savePlayers(players);
  res.json(player);
});

// Ruta para eliminar un jugador
app.delete('/players/:id', (req, res) => {
  const { id } = req.params;
  let players = readPlayers();
  players = players.filter(p => p.id !== parseInt(id));
  savePlayers(players);
  res.status(204).send();
});

// Ruta para generar equipos
app.post('/generate-teams', (req, res) => {
  const players = readPlayers();
  const { playersPerTeam, numberOfTeams, selectedPlayerIds } = req.body;
  const selectedPlayers = players.filter(player => selectedPlayerIds.includes(player.id.toString()));

  // Mezclar los jugadores aleatoriamente
  shuffleArray(selectedPlayers);

  // Identificar arqueros
  const goalkeepers = selectedPlayers.filter(player => player.rating === 1);
  const fieldPlayers = selectedPlayers.filter(player => player.rating > 1);

  // Generar equipos con arqueros
  const { teams, leftovers } = generateTeams(fieldPlayers, playersPerTeam - 1, numberOfTeams);

  // Asignar arqueros a los equipos
  goalkeepers.forEach((goalkeeper, index) => {
    const team = teams[index % numberOfTeams]; // Asignar arqueros de manera equitativa
    team.goalkeeper = goalkeeper;
  });

  res.status(200).send({ teams, leftovers });
});

// Función para barajar un array aleatoriamente
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Lógica para generar equipos balanceados
function generateTeams(players, playersPerTeam, numberOfTeams) {
  players.sort((a, b) => b.rating - a.rating); // Ordenar jugadores por puntuación

  let teams = Array.from({ length: numberOfTeams }, () => ({ players: [], totalScore: 0, goalkeeper: null }));
  let leftovers = [];

  // Función para encontrar el equipo con la puntuación total más baja
  function getTeamWithMinScore() {
    return teams.reduce((minTeam, team) => team.totalScore < minTeam.totalScore ? team : minTeam, teams[0]);
  }

  // Función para encontrar el equipo con menos jugadores altos (rating >= 4)
  function getTeamWithFewerHighRatingPlayers() {
    return teams.reduce((minTeam, team) => {
      const highRatingPlayersCount = team.players.filter(p => p.rating >= 4).length;
      const minHighRatingPlayersCount = minTeam.players.filter(p => p.rating >= 4).length;
      return highRatingPlayersCount < minHighRatingPlayersCount ? team : minTeam;
    }, teams[0]);
  }

  while (players.length > 0) {
    let player = players.pop(); // Tomar el siguiente jugador con la puntuación más alta

    // Si el jugador tiene una puntuación alta, priorizar equipos con menos jugadores altos
    let team = player.rating >= 4 ? getTeamWithFewerHighRatingPlayers() : getTeamWithMinScore();

    if (team.players.length < playersPerTeam) {
      team.players.push(player);
      team.totalScore += player.rating;
    } else {
      leftovers.push(player);
    }
  }

  // Verificar si hay jugadores restantes que no encajaron en los equipos
  if (leftovers.length > 0) {
    leftovers.forEach(player => {
      let team = getTeamWithMinScore(); // Encontrar el equipo con la puntuación más baja
      if (team.players.length < playersPerTeam) {
        team.players.push(player);
        team.totalScore += player.rating;
      }
    });
  }

  // Ajustar para asegurar que la diferencia de puntuación entre equipos no sea mayor a 1
  let maxScore = Math.max(...teams.map(team => team.totalScore));
  let minScore = Math.min(...teams.map(team => team.totalScore));
  if (maxScore - minScore > 1) {
    // Mover jugadores entre equipos si es necesario para equilibrar las puntuaciones
    for (let i = 0; i < teams.length; i++) {
      let team = teams[i];
      if (team.totalScore > minScore + 1) {
        let playerToMove = team.players.pop(); // Mover el último jugador agregado
        team.totalScore -= playerToMove.rating;

        let targetTeam = getTeamWithMinScore(); // Encontrar el equipo con la puntuación más baja
        if (targetTeam.players.length < playersPerTeam) {
          targetTeam.players.push(playerToMove);
          targetTeam.totalScore += playerToMove.rating;
        } else {
          leftovers.push(playerToMove);
        }
      }
    }
  }

  return { teams, leftovers };
}


// Función para leer jugadores desde un archivo
function readPlayers() {
  const filePath = path.join(__dirname, 'public', 'data', 'players.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return [];
}

// Función para guardar jugadores en un archivo
function savePlayers(players) {
  const filePath = path.join(__dirname, 'public', 'data', 'players.json');
  fs.writeFileSync(filePath, JSON.stringify(players, null, 2));
}

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
