async function fetchPlayers() {
    const response = await fetch('/players');
    const players = await response.json();
    const playersList = document.querySelector('#playersList');
    playersList.innerHTML = '';
    players.forEach((player, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="checkbox" class="playerCheckbox" id="player-${player.id}" data-id="${player.id}" checked></td>
        <td>${index + 1}</td>
        <td>${player.name}</td>
        <td>${player.rating}</td>
        <td class="actions">
          <button onclick="editPlayer(${player.id}, '${player.name}', ${player.rating})">Edit</button>
          <button onclick="deletePlayer(${player.id})">Delete</button>
        </td>
      `;
      playersList.appendChild(row);
    });
  }
  
  document.getElementById('playerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const rating = document.getElementById('rating').value;
    await fetch('/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rating })
    });
    document.getElementById('name').value = '';
    document.getElementById('rating').value = '';
    fetchPlayers();
  });
  
  async function editPlayer(id, oldName, oldRating) {
    const newName = prompt('Enter new name:', oldName);
    const newRating = prompt('Enter new rating:', oldRating);
    if (newName && newRating) {
      await fetch(`/players/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, rating: newRating })
      });
      fetchPlayers();
    }
  }
  
  async function deletePlayer(id) {
    if (confirm('Are you sure you want to delete this player?')) {
      await fetch(`/players/${id}`, { method: 'DELETE' });
      fetchPlayers();
    }
  }
  
  document.getElementById('generateTeams').addEventListener('click', async () => {
    const playersPerTeam = document.getElementById('playersPerTeam').value;
    const numberOfTeams = document.getElementById('numberOfTeams').value;
    const selectedPlayerIds = Array.from(document.querySelectorAll('.playerCheckbox:checked')).map(cb => cb.dataset.id);
    const response = await fetch('/generate-teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playersPerTeam: parseInt(playersPerTeam), numberOfTeams: parseInt(numberOfTeams), selectedPlayerIds })
    });
    const result = await response.json();
    const { teams, leftovers } = result;
  
    const teamsDiv = document.getElementById('teams');
    teamsDiv.innerHTML = '';
    teams.forEach((team, index) => {
      teamsDiv.innerHTML += `
        <h3>Team ${index + 1} (Total Players: ${team.players.length})</h3>
        <ul>${team.players.map((player, i) => `<li>${i + 1}. ${player.name} - ${player.rating}</li>`).join('')}</ul>
        <p>Total Score: ${team.totalScore}</p>
        <p>Goalkeeper: ${team.goalkeeper ? team.goalkeeper.name : 'None'}</p>
      `;
    });
  
    const leftoversDiv = document.getElementById('leftovers');
    leftoversDiv.innerHTML = '';
    if (leftovers.length > 0) {
      leftoversDiv.innerHTML = `
        <h3>Leftover Players</h3>
        <ul>${leftovers.map((player, i) => `<li>${i + 1}. ${player.name} - ${player.rating}</li>`).join('')}</ul>
      `;
    } else {
      leftoversDiv.innerHTML = `<h3>No leftover players</h3>`;
    }
  });
  
  document.getElementById('updatePlayers').addEventListener('click', fetchPlayers);
  
  fetchPlayers();
  