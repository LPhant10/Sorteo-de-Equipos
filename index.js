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

  // Convertir selectedPlayerIds a enteros
  const selectedIds = selectedPlayerIds.map(id => parseInt(id));

  // Filtrar los jugadores seleccionados
  const selectedPlayers = players.filter(player => selectedIds.includes(player.id));

  // Verificar si hay suficientes jugadores seleccionados
  if (selectedPlayers.length < playersPerTeam * numberOfTeams) {
    return res.status(400).send('Not enough players selected to form the requested number of teams.');
  }

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

  // Distribuir jugadores de manera equitativa
  for (let i = 0; i < players.length; i++) {
    let player = players[i];
    let team = teams.reduce((prev, curr) => (prev.totalScore < curr.totalScore ? prev : curr)); // Equipo con la puntuación más baja
    if (team.players.length < playersPerTeam) {
      team.players.push(player);
      team.totalScore += player.rating;
    } else {
      leftovers.push(player);
    }
  }

  // Ajustar para asegurar que la diferencia de puntuación entre equipos no sea mayor a 1
  balanceTeams(teams, playersPerTeam);

  return { teams, leftovers };
}

// Función para balancear las puntuaciones de los equipos
function balanceTeams(teams, playersPerTeam) {
  let maxScore = Math.max(...teams.map(team => team.totalScore));
  let minScore = Math.min(...teams.map(team => team.totalScore));

  while (maxScore - minScore > 1) {
    let maxTeam = teams.find(team => team.totalScore === maxScore);
    let minTeam = teams.find(team => team.totalScore === minScore);

    let playerToMove = maxTeam.players.pop(); // Mover el último jugador agregado
    maxTeam.totalScore -= playerToMove.rating;

    if (minTeam.players.length < playersPerTeam) {
      minTeam.players.push(playerToMove);
      minTeam.totalScore += playerToMove.rating;
    } else {
      maxTeam.players.push(playerToMove); // Devolver el jugador si no hay espacio en el equipo con la puntuación más baja
      maxTeam.totalScore += playerToMove.rating;
      break;
    }

    maxScore = Math.max(...teams.map(team => team.totalScore));
    minScore = Math.min(...teams.map(team => team.totalScore));
  }
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
