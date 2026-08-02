let APP_MODE = "view";
const STORE = "tournaments";
let currentTournament = null;
let currentReviewMatch = null;
let currentReviewSubmission = null;
let activeRequest = null;
let loadTimeout = null;
let tournamentEvents = null;
let notificationEvents = null;
let notifications = [];

const notificationSound = new Audio(
  "/sounds/notifications.wav"
);


async function removeTournament(id) {
  const idStr = String(id).trim();
  
  showLoader();
  
  try {
    await deleteTournamentFromFirebase(idStr);
    
    myTournaments = myTournaments.filter(
      t => String(t.id) !== idStr
    );
    
    if (
      currentTournament &&
      String(currentTournament.id) === idStr
    ) {
      currentTournament = null;
    }
    
    await renderTournamentList();
    
    console.log("Tournament deleted:", idStr);
    
  } catch (err) {
    console.error("[DELETE] Failed:", err);
    showAlert("Failed to delete tournament: " + err.message);
    
    throw err;
    
  } finally {
    hideLoader();
  }
}


async function deleteFixtures(force = false) {
  const tournament = getCurrentTournament();
  
  if (!tournament) return;
  
  if (
    !force &&
    !confirm("Delete all fixtures and match results for this tournament?")
  ) {
    return;
  }
  
  tournament.matches = [];
  tournament.table = [];
  tournament.prevRanks = {};
  
  showLoader();
  
  try {
    await updateTournamentLocal(tournament);
    
    renderFixtures();
    renderTable([]);
    renderFormView();
    
    showActionModal("❌ Fixture Deleted", "delete");
    
  } catch (err) {
    console.error(err);
    showActionModal("Failed to delete fixtures", "error");
    
  } finally {
    hideLoader();
  }
}



function clearAllTournaments() {
  try {
    localStorage.removeItem(STORE);
    return true;
  } catch (error) {
    console.error("Error clearing tournaments:", error);
    return false;
  }
}




function getCurrentTournament() {
  return currentTournament;
}



async function saveInlineEdit(e) {
  e.stopPropagation();
  
  const card = document.querySelector(
    `.tournament-card[data-id="${window.editingTournamentId}"]`
  );
  
  if (!card) return;
  
  const input = card.querySelector("input");
  if (!input) return;
  
  const newName = input.value.trim();
  if (!newName) return;
  
  showLoader();
  
  try {
    await updateTournamentDetails(window.editingTournamentId, {
      name: newName
    });
    
    const tournament = myTournaments.find(
      t => String(t.id) === String(window.editingTournamentId)
    );
    
    if (tournament) {
      tournament.name = newName;
    }
    
    window.editingTournamentId = null;
    renderTournamentList();
    showActionModal("Tournament Updated", "success");
  } catch (err) {
    showAlert(err.message);
  } finally {
    hideLoader();
  }
}

async function deleteTournament(id) {
  const tournament = myTournaments.find(
    t => String(t.id) === String(id)
  );
  
  showConfirmModal(
    `Delete "${tournament?.name || "this tournament"}" permanently? This cannot be undone.`,
    async () => {
      showLoader();
      
      try {
        await removeTournament(id);
        await renderTournamentList();
        showActionModal("❌ Tournament Deleted", "delete");
      } catch (err) {
        console.error(err);
        showAlert(err.message);
      } finally {
        hideLoader();
      }
    }
  );
}
function getTournamentFromMemory(id) {
  return myTournaments.find(
    t => String(t.id) === String(id)
  ) || null;
}




async function openTournament(id) {
  showLoader();
  
  try {
    const tournament = await getTournament(id);
    
    currentTournament = tournament;
    
    startTournamentEvents(id);
    
    const name = tournament.name;
    const formatType = (tournament.format || "league").toLowerCase();
    
    if (formatType === "league") {
      document.getElementById("leagueName").textContent = name;
      
      goToTournamentPage();
      rebuildTableFromMatches();
      
    } else {
      document.getElementById("cupName").textContent = name;
      
      goToCupPage();
    }
    
  } catch (err) {
    showAlert(err.message);
  } finally {
    hideLoader();
  }
}
async function handleSave(tournament, newName, oldName) {
  tournament.matches = tournament.matches || [];
  tournament.groupMatches = tournament.groupMatches || [];
  tournament.knockoutMatches = tournament.knockoutMatches || [];
  tournament.teamLogos = tournament.teamLogos || {};
  tournament.table = tournament.table || [];
  
  // Update team names everywhere
  const updateMatches = (matches) => {
    if (!Array.isArray(matches)) return;
    
    matches.forEach(match => {
      if (!match) return;
      
      if (match.home === oldName) {
        match.home = newName;
      }
      
      if (match.away === oldName) {
        match.away = newName;
      }
      
      if (
        typeof match.home === "object" &&
        match.home?.name === oldName
      ) {
        match.home.name = newName;
      }
      
      if (
        typeof match.away === "object" &&
        match.away?.name === oldName
      ) {
        match.away.name = newName;
      }
    });
  };
  
  updateMatches(tournament.matches);
  updateMatches(tournament.groupMatches);
  updateMatches(tournament.knockoutMatches);
  
  
  // Update table team name
  tournament.table.forEach(team => {
    if (team?.name === oldName) {
      team.name = newName;
    }
  });
  
  
  // Update logo key if team name changed
  if (
    oldName !== newName &&
    tournament.teamLogos[oldName]
  ) {
    tournament.teamLogos[newName] =
      tournament.teamLogos[oldName];
    
    delete tournament.teamLogos[oldName];
  }
  
  
  showLoader();
  
  try {
    
    await updateTournament(tournament.id, {
      updates: {
        teams: tournament.teams,
        matches: tournament.matches,
        groupMatches: tournament.groupMatches,
        knockoutMatches: tournament.knockoutMatches,
        teamLogos: tournament.teamLogos,
        table: tournament.table
      }
    });
    
    
    
    const cached = myTournaments.find(
      t => String(t.id) === String(tournament.id)
    );
    
    if (cached) {
      cached.teams = tournament.teams;
      cached.matches = tournament.matches;
      cached.groupMatches = tournament.groupMatches;
      cached.knockoutMatches = tournament.knockoutMatches;
      cached.teamLogos = tournament.teamLogos;
      cached.table = tournament.table;
    }
    
    
    // Refresh UI
    if (typeof renderTeams === "function") {
      
      if (document.getElementById("teamList")) {
        renderTeams("teamList");
      }
      
      if (document.getElementById("cupTeamsContainer")) {
        renderTeams("cupTeamsContainer");
      }
    }
    
    
    if (typeof rebuildTableFromMatches === "function") {
      rebuildTableFromMatches();
    }
    
    if (typeof renderFixtures === "function") {
      renderFixtures();
    }
    
    if (typeof renderFullBracket === "function") {
      renderFullBracket();
    }
    
    if (typeof renderRecords === "function") {
      renderRecords();
    }
    
    
    closeEditModal();
    
    showActionModal(
      "Team updated successfully",
      "success"
    );
    
    
  } catch (err) {
    
    console.error("Team update failed:", err);
    
    showActionModal(
      "Failed to save team changes",
      "delete"
    );
    
  } finally {
    
    hideLoader();
    
  }
}

let pendingMatchSubmissions = [];

async function loadMatchSubmissions() {
  
  const tournament = getCurrentTournament();
  
  if (!tournament) return;
  
  showLoader();
  
  try {
    
    pendingMatchSubmissions =
      await getMatchSubmissions(tournament.id);
    
    renderMatchSubmissions();
    
  } catch (err) {
    
    console.error(err);
    showAlert(err.message);
    
  } finally {
    
    hideLoader();
    
  }
  
}
function setCurrentTournament(tournament) {
  currentTournament = tournament;
}
async function rebuildTableFromMatches() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const user = getCurrentUser();
  
  if (!user || user.role !== "admin")
  {  return;
  }
  
  showLoader();
  
  try {
    const updatedTournament = await rebuildTournamentTable(tournament.id);
    
    currentTournament = updatedTournament;
    
    const cached = myTournaments.find(
      t => String(t.id) === String(updatedTournament.id)
    );
    
    if (cached) {
      Object.assign(cached, updatedTournament);
    }
    
    if (typeof renderTable === "function") {
      renderTable(updatedTournament.table);
    }
    
    if (typeof renderFixtures === "function") {
      renderFixtures();
    }
    
    if (typeof renderRecords === "function") {
      renderRecords();
    }
    
  } catch (err) {
    console.error(err);
    showAlert(err.message);
    
  } finally {
    hideLoader();
  }
}


async function approveSubmission() {
  
  if (!currentReviewSubmission) return;
  
  const tournament = getCurrentTournament();
  
  showLoader();
  
  try {
    
    const result = await reviewMatchSubmission(
      tournament.id,
      currentReviewSubmission.id,
      "approved"
    );
    
    
    tournament.matches = result.matches;
    tournament.table = result.table;
    tournament.prevRanks = result.prevRanks;
    tournament.records = result.records;
    tournament.matchSubmissions = result.matchSubmissions;
    
    
    const cached = myTournaments.find(
      t => String(t.id) === String(tournament.id)
    );
    
    if (cached) {
      cached.matches = result.matches;
      cached.table = result.table;
      cached.prevRanks = result.prevRanks;
      cached.records = result.records;
      cached.matchSubmissions = result.matchSubmissions;
    }
    
    closeReviewModal();
    
    renderFixtures();
    renderTable(tournament.table);
    
    if (typeof renderRecords === "function") {
      renderRecords();
    }
    
    showActionModal(
      "Result Approved",
      "success"
    );
    
  } catch (err) {
    
    showAlert(err.message);
    
  } finally {
    
    hideLoader();
    
  }
  
}

async function rejectSubmission() {
  
  if (!currentReviewSubmission) return;
  
  const reason =
    document.getElementById(
      "reviewModalRejectReason"
    ).value.trim();
  
  if (!reason) {
    return showAlert(
      "Enter a rejection reason."
    );
  }
  
  const tournament = getCurrentTournament();
  
  showLoader();
  
  try {
    
    const result = await reviewMatchSubmission(
      tournament.id,
      currentReviewSubmission.id,
      "rejected",
      reason
    );
    
    
    tournament.matches = result.matches;
    tournament.table = result.table;
    tournament.prevRanks = result.prevRanks;
    tournament.records = result.records;
    tournament.matchSubmissions = result.matchSubmissions;
    
    
    const cached = myTournaments.find(
      t => String(t.id) === String(tournament.id)
    );
    
    if (cached) {
      cached.matches = result.matches;
      cached.table = result.table;
      cached.prevRanks = result.prevRanks;
      cached.records = result.records;
      cached.matchSubmissions = result.matchSubmissions;
    }
    
    closeReviewModal();
   await renderFixtures();
   
    renderTable(tournament.table);
    
    if (typeof renderRecords === "function") {
      renderRecords();
    }
    
    showActionModal(
      "Submission Rejected",
      "success"
    );
    
  } catch (err) {
    
    showAlert(err.message);
    
  } finally {
    
    hideLoader();
    
  }
  
}

async function refreshCurrentTournament() {
  const current = getCurrentTournament();
  if (!current) return null;
  const currentRound = current.currentRound || 1;
  const latest = await getTournament(current.id);
 latest.currentRound = currentRound; 
  setCurrentTournament(latest);
  
  const index = myTournaments.findIndex(
    t => String(t.id) === String(latest.id)
  );
  
  if (index !== -1) {
    myTournaments[index] = latest;
  }
  
  return latest;
}