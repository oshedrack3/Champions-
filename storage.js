let pairingModalMode = null;
let pairingModalData = null;
let APP_MODE = "view";
let myCompetitions = [];
let currentCompetition = null;
myTournaments = null;
let currentKnockoutRoundIndex = 1;
const STORE = "tournaments";
let noticeScrollTimer = null;
let noticeScrollIndex = 0;
let noticeInteractionTimeout = null;
let hallOfFameAdminData = null;
let submissionDeadlineInterval = null;
const submissionAlertedTournaments =
  new Set();
let noticesMemoryCache = null;
let noticesSyncChecked = false;

let teamsByTournament = {};
let tournamentRefreshRunning = false;
let tableCache = null;
let cachedTournamentId = null;

let tournamentRefreshQueued = false;

let currentTournament = null;
let currentReviewMatch = null;
let currentReviewSubmission = null;
let activeRequest = null;
let loadTimeout = null;
let tournamentEvents = null;
let notificationEvents = null;
let notifications = [];
let selectedCompetitionId = null;

let editingCompetitionId = null;
let publicTournaments = [];
let editingTeamId = null;
let currentPage = null;
let cupRound = 1;
let fixtures = [];
let fixturesLoaded = false;
let fixturesTournamentId = null;

let TournamentListStyle = "row";
const FetchGuard = {};

const RUN_KEYS = {
  LOAD_PUBLIC_TOURNAMENTS: "loadPublicTournaments",
};
const CallerGuard = {};
const CACHE_DB_NAME = "TournamentAppCache";
const CACHE_DB_VERSION = 1;

let cacheDBPromise = null;

function openCacheDB() {
  if (cacheDBPromise) {
    return cacheDBPromise;
  }
  
  cacheDBPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(
      CACHE_DB_NAME,
      CACHE_DB_VERSION
    );
    
    request.onupgradeneeded = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains("data")) {
        db.createObjectStore("data", {
          keyPath: "key"
        });
      }
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
  
  return cacheDBPromise;
}

function getCacheKey(type, id = "") {
  const user = getCurrentUser();
  
  const uid = user?.uid || "guest";
  
  return `${uid}:${type}:${id}`;
}

async function getCachedData(type, id = "") {
  try {
    const db = await openCacheDB();
    
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        "data",
        "readonly"
      );
      
      const store = transaction.objectStore("data");
      
      const request = store.get(
        getCacheKey(type, id)
      );
      
      request.onsuccess = () => {
        resolve(request.result?.data ?? null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error(
      "Failed to read cache:",
      err
    );
    
    return null;
  }
}

async function saveCachedData(type, id, data) {
  try {
    const db = await openCacheDB();
    
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        "data",
        "readwrite"
      );
      
      const store = transaction.objectStore("data");
      
      store.put({
        key: getCacheKey(type, id),
        data,
        updatedAt: Date.now()
      });
      
      transaction.oncomplete = () => {
        resolve(true);
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.error(
      "Failed to save cache:",
      err
    );
    
    return false;
  }
}

async function deleteCachedData(type, id = "") {
  try {
    const db = await openCacheDB();
    
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        "data",
        "readwrite"
      );
      
      const store = transaction.objectStore("data");
      
      store.delete(
        getCacheKey(type, id)
      );
      
      transaction.oncomplete = () => {
        resolve(true);
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.error(
      "Failed to delete cache:",
      err
    );
    
    return false;
  }
}


const notificationSound = new Audio(
  "/sounds/notifications.wav"
);

function runOnce(key, caller, fn) {
  if (!CallerGuard[key]) {
    CallerGuard[key] = {};
  }
  
  if (CallerGuard[key][caller]) {
    return;
  }
  
  CallerGuard[key][caller] = true;
  
  fn();
}


async function deleteFixtures() {
  
  const tournament = getCurrentTournament();
  
  if (!tournament) return;
  
  
  const confirmed = await showConfirmModal(
    "Delete all fixtures, results, submissions and screenshots?",
    "Delete",
    "Cancel"
  );
  
  
  if (!confirmed) return;
  
  
  showLoader();
  
  
  try {
    
    await deleteTournamentFixtures(
      tournament.id
    );
    
    
    tournament.matches = [];
    tournament.table = [];
    tournament.prevRanks = {};
    tournament.matchSubmissions = {};
    tournament.records = {};
    
    
    setCurrentTournament(tournament);
    
    
    renderFixtures();
    renderTable([]);
    renderFormView();
    
    
    showActionModal(
      "Fixtures deleted successfully",
      "delete"
    );
    
    
  } catch (err) {
    
    showAlert(err.message);
    
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



function getTournamentFromMemory(id) {
  return myTournaments.find(
    t => String(t.id) === String(id)
  ) || null;
}


async function openTournament(id) {
  showLoader();
  
  try {
    const tournament =
      await getTournament(id);
    
    currentTournament =
      tournament;
    
    startTournamentEvents(id);
    
    const name =
      tournament.name;
    
    const formatType =
      (
        tournament.format ||
        "league"
      ).toLowerCase();
    
    if (formatType === "league") {
      document.getElementById(
        "leagueName"
      ).textContent = name;
      
      goToTournamentPage();
      
      await rebuildTableFromMatches();
      
      loadSubmissionDeadlineCountdown(
        tournament
      );
      
    } else {
      document.getElementById(
        "cupName"
      ).textContent = name;
      
      document.getElementById(
          "cupName2"
        ).textContent =
        `${name} Bracket`;
      
      goToCupPage();
    }
    
  } catch (err) {
    console.error(
      "openTournament error:",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to open tournament."
    );
    
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
  
  
 
  tournament.table.forEach(team => {
    if (team?.name === oldName) {
      team.name = newName;
    }
  });
  
  

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




function setCurrentTournament(tournament) {
  currentTournament = tournament;
}


function updateTableCacheFromPlayers(updatedPlayers) {
  if (
    !Array.isArray(updatedPlayers) ||
    !Array.isArray(tableCache)
  ) {
    return;
  }

  updatedPlayers.forEach(player => {
    if (!player || !player.team_id) return;

    const tableIndex =
      tableCache.findIndex(
        team =>
          String(team.id) ===
          String(player.team_id)
      );

    if (tableIndex === -1) return;

    const gf =
      Number(player.gf) || 0;

    const ga =
      Number(player.ga) || 0;

    tableCache[tableIndex] = {
      ...tableCache[tableIndex],
      id: player.team_id,
      name:
        player.team_name ||
        player.team?.name ||
        tableCache[tableIndex].name ||
        "",
      logo:
        player.team_logo ||
        player.team?.logo ||
        tableCache[tableIndex].logo ||
        null,
      played:
        Number(player.played) || 0,
      wins:
        Number(player.wins) || 0,
      draws:
        Number(player.draws) || 0,
      losses:
        Number(player.losses) || 0,
      gf,
      ga,
      gd: gf - ga,
      pts:
        Number(player.points) || 0
    };
  });

  tableCache.sort((a, b) => {
    if (b.pts !== a.pts) {
      return b.pts - a.pts;
    }

    if (b.gd !== a.gd) {
      return b.gd - a.gd;
    }

    if (b.gf !== a.gf) {
      return b.gf - a.gf;
    }

    return a.name.localeCompare(b.name);
  });

  tableCache.forEach((team, index) => {
    team.pos = index + 1;
  });
}


async function approveSubmission() {
  
  if (!currentReviewSubmission) return;
  
  const tournament =
    getCurrentTournament();
  
  showLoader();
  
  try {
    
    const result =
      await reviewMatchSubmission(
        tournament.id,
        currentReviewSubmission.id,
        "approved"
      );
    
    const updatedMatch =
      result.match;
    
    if (updatedMatch) {
      
      const matchIndex =
        fixtures.findIndex(
          match =>
            String(match.id) ===
            String(updatedMatch.id)
        );
      
      if (matchIndex !== -1) {
        
        fixtures[matchIndex] = {
          ...fixtures[matchIndex],
          ...updatedMatch,
          homeGoals:
            updatedMatch.home_score,
          awayGoals:
            updatedMatch.away_score,
          played:
            Number(updatedMatch.played) === 1,
          playedAt:
            updatedMatch.played_at,
          scheduledAt:
            updatedMatch.scheduled_at,
          submission_status:
            "approved"
        };
        
      }
      
    }
    
    tournament.prevRanks =
      result.prevRanks ||
      tournament.prevRanks;
    
    tournament.records =
      result.records ||
      tournament.records;
    
    tournament.matchSubmissions =
      result.matchSubmissions ||
      tournament.matchSubmissions;
    
    if (
      Array.isArray(result.players) &&
      Array.isArray(tournament.tournament_players)
    ) {
      
      result.players.forEach(
        updatedPlayer => {
          
          const playerIndex =
            tournament.tournament_players.findIndex(
              player =>
                String(player.id) ===
                String(updatedPlayer.id)
            );
          
          if (playerIndex !== -1) {
            tournament.tournament_players[
              playerIndex
            ] = updatedPlayer;
          }
          
        }
      );
      
      updateTableCacheFromPlayers(
        result.players
      );
      
      tournament.table =
        tableCache;
      
    }
    
    const cached =
      myTournaments.find(
        t =>
          String(t.id) ===
          String(tournament.id)
      );
    
    if (cached) {
      
      cached.table =
        tableCache;
      
      cached.prevRanks =
        tournament.prevRanks;
      
      cached.records =
        tournament.records;
      
      cached.matchSubmissions =
        tournament.matchSubmissions;
      
      if (
        Array.isArray(
          result.players
        ) &&
        Array.isArray(
          cached.tournament_players
        )
      ) {
        
        result.players.forEach(
          updatedPlayer => {
            
            const playerIndex =
              cached.tournament_players.findIndex(
                player =>
                  String(player.id) ===
                  String(updatedPlayer.id)
              );
            
            if (playerIndex !== -1) {
              cached.tournament_players[
                playerIndex
              ] = updatedPlayer;
            }
            
          }
        );
        
      }
      
    }
    
    closeReviewModal();
    
    await renderFixtures();
    
    renderTable(
      tableCache
    );
    
    if (
      typeof renderRecords ===
      "function"
    ) {
      renderRecords();
    }
    
    showActionModal(
      "Result Approved",
      "success"
    );
    
  } catch (err) {
    
    showAlert(
      err.message
    );
    
  } finally {
    
    hideLoader();
    
  }
  
}



async function rejectSubmission() {
  
  if (!currentReviewSubmission) return;
  
  const reason =
    document
      .getElementById(
        "reviewModalRejectReason"
      )
      .value
      .trim();
  
  if (!reason) {
    return showAlert(
      "Enter a rejection reason."
    );
  }
  
  const tournament =
    getCurrentTournament();
  
  showLoader();
  
  try {
    
    const result =
      await reviewMatchSubmission(
        tournament.id,
        currentReviewSubmission.id,
        "rejected",
        reason
      );
    
    const matchIndex =
      fixtures.findIndex(
        match =>
          String(match.id) ===
          String(
            currentReviewSubmission.match_id
          )
      );
    
    if (matchIndex !== -1) {
      
      fixtures[matchIndex] = {
        ...fixtures[matchIndex],
        submission_status:
          "rejected"
      };
      
    }
    
    tournament.matchSubmissions =
      result.matchSubmissions ||
      tournament.matchSubmissions;
    
    const cached =
      myTournaments.find(
        t =>
          String(t.id) ===
          String(tournament.id)
      );
    
    if (cached) {
      cached.matchSubmissions =
        tournament.matchSubmissions;
    }
    
    closeReviewModal();
    
    await renderFixtures();
    
    if (
      tournament.table
    ) {
      renderTable(
        tournament.table
      );
    }
    
    if (
      typeof renderRecords ===
      "function"
    ) {
      renderRecords();
    }
    
    showActionModal(
      "Submission Rejected",
      "success"
    );
    
  } catch (err) {
    
    showAlert(
      err.message
    );
    
  } finally {
    
    hideLoader();
    
  }
  
}

async function refreshCurrentTournament() {
  
  const current = getCurrentTournament();
  
  if (!current) return null;
  
  const latest = await getTournament(
    current.id,
    true
  );
  
  setCurrentTournament(latest);
  
  const index = myTournaments.findIndex(
    t => String(t.id) === String(latest.id)
  );
  
  if (index !== -1) {
    myTournaments[index] = latest;
  }
  
  return latest;
}
async function refreshTournamentFromSSE() {
  
  if (tournamentRefreshRunning) {
    tournamentRefreshQueued = true;
    return;
  }
  
  tournamentRefreshRunning = true;
  
  try {
    
    const latest = await refreshCurrentTournament();
    
    if (!latest) return;
    
    renderFixtures();
    renderRecords();
    renderFormView();
    
    if (latest.format === "league") {
      renderTable(latest.table);
    } else {
      renderFullBracket();
    }
    
  } catch (err) {
    
    console.error(
      "Tournament UI refresh error:",
      err
    );
    
  } finally {
    
    tournamentRefreshRunning = false;
    
    if (tournamentRefreshQueued) {
      tournamentRefreshQueued = false;
      refreshTournamentFromSSE();
    }
    
  }
}
async function loadMyCompetitions() {
  showLoader();
  
  try {
    myCompetitions =
      await getMyCompetitions();
    
    renderCompetitionList();
    
  } catch (err) {
    console.error(err);
    showAlert(err.message);
  } finally {
    hideLoader();
  }
}
async function handleCreateCompetition() {
  
  const name =
    document
    .getElementById("competitionNameInput")
    .value
    .trim();
  
  const logoInput =
    document.getElementById("competitionLogoInput");
  
  
  if (!name) {
    showAlert("Enter competition name");
    return;
  }
  
  
  showLoader();
  
  
  try {
    
    let logo = null;
    
    
    if (logoInput.files.length > 0) {
      
      logo = await new Promise((resolve, reject) => {
        
        const reader = new FileReader();
        
        reader.onload = () => resolve(reader.result);
        
        reader.onerror = reject;
        
        reader.readAsDataURL(
          logoInput.files[0]
        );
        
      });
      
    }
    
    
    if (editingCompetitionId) {
      
      const changes = {
        name
      };
      
      
      if (logo) {
        changes.logo = logo;
      }
      
      
      const updatedCompetition =
        await updateCompetition(
          editingCompetitionId,
          changes
        );
      
      
      const index =
        myCompetitions.findIndex(
          competition =>
          String(competition.id) ===
          String(editingCompetitionId)
        );
      
      
      if (index !== -1) {
        myCompetitions[index] =
          updatedCompetition;
      }
      
      
      editingCompetitionId = null;
      
      
      renderCompetitionList();
      
      
      document
        .getElementById("competitionNameInput")
        .value = "";
      
      
      logoInput.value = "";
      
      
      document
        .getElementById("competitionLogoPreview")
        .src =
        "images/default-tournament.png";
      
      
      closeCreateCompetitionModal();
      
      
      showAlert(
        "Competition updated successfully!"
      );
      
      
    } else {
      
      const result =
        await createCompetition({
          name,
          logo
        });
      
      
      myCompetitions.unshift(
        result.competition
      );
      
      
      renderCompetitionList();
      
      
      document
        .getElementById("competitionNameInput")
        .value = "";
      
      
      logoInput.value = "";
      
      
      document
        .getElementById("competitionLogoPreview")
        .src =
        "images/default-tournament.png";
      
      
      closeCreateCompetitionModal();
      
      
      showAlert(
        "Competition created successfully!"
      );
      
    }
    
    
  } catch (err) {
    
    showAlert(err.message);
    
  } finally {
    
    hideLoader();
    
  }
  
}


function editCompetition(id) {
  const competition = myCompetitions.find(
    c => String(c.id) === String(id)
  );
  
  if (!competition) {
    showAlert("Competition not found.");
    return;
  }
  
  editingCompetitionId = competition.id;
  
  const title = document.getElementById(
    "competitionModalTitle"
  );
  
  const submitBtn = document.getElementById(
    "competitionModalSubmitBtn"
  );
  
  const nameInput = document.getElementById(
    "competitionNameInput"
  );
  
  const logoInput = document.getElementById(
    "competitionLogoInput"
  );
  
  const logoPreview = document.getElementById(
    "competitionLogoPreview"
  );
  
  if (title) {
    title.textContent = "Edit Competition";
  }
  
  if (submitBtn) {
    submitBtn.textContent = "Save Changes";
  }
  
  if (nameInput) {
    nameInput.value = competition.name || "";
  }
  
  if (logoInput) {
    logoInput.value = "";
    logoInput.style.display = "block";
  }
  
  const rawLogo =
    competition.logo ||
    competition.competitionImage;
  
  const logoUrl =
    typeof rawLogo === "object" && rawLogo !== null ?
    (
      rawLogo.url ||
      rawLogo.src ||
      rawLogo.href ||
      ""
    ) :
    rawLogo;
  
  if (logoPreview) {
    logoPreview.src =
      logoUrl || "images/default-tournament.png";
  }
  
  document.getElementById(
    "createCompetitionModal"
  ).style.display = "block";
}

function setSelectedCompetition(id) {
  selectedCompetitionId = id;
}

async function addTeam(name, file) {
  showLoader();
  
  try {
    const token =
      getToken();
    
    if (!token) {
      throw new Error(
        "You are not logged in."
      );
    }
    
    const logo =
      await fileToBase64(
        file,
        300
      );
    
    const res =
      await apiRequest(
        `${API}/teams/create`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            logo
          })
        },
        () =>
        addTeam(
          name,
          file
        )
      );
    
    if (!res) {
      throw new Error(
        "No response from server."
      );
    }
    
    const result =
      await res.json();
    
    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Failed to create team."
      );
    }
    
    showActionModal(
      "✅ Team Created",
      "success"
    );
    
    if (
      typeof loadMyTeams ===
      "function"
    ) {
      await loadMyTeams();
    }
    
    if (
      typeof renderTeams ===
      "function"
    ) {
      await renderTeams();
    }
    
  } catch (err) {
    console.error(
      "[addTeam]",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to create team"
    );
    
  } finally {
    hideLoader();
    closeAddTeam();
  }
}
async function handleAddTeam() {
  const nameInput =
    document.getElementById(
      "teamNameInput"
    );
  
  const logoInput =
    document.getElementById(
      "teamLogoInput"
    );
  
  if (!nameInput || !logoInput) {
    showAlert(
      "Error: Form elements not found"
    );
    return;
  }
  
  const name =
    nameInput.value.trim();
  
  if (!name) {
    showAlert(
      "Enter a team name"
    );
    return;
  }
  
  const file =
    logoInput.files[0];
  
  if (!file) {
    showAlert(
      "Team logo is required"
    );
    return;
  }
  
  if (
    !file.type.startsWith("image/")
  ) {
    showAlert(
      "Please select an image file"
    );
    return;
  }
  
  if (
    file.size >
    500 * 1024
  ) {
    showAlert(
      "Logo size must not exceed 500KB"
    );
    return;
  }
  
  try {
    await addTeam(
      name,
      file
    );
    
    nameInput.value = "";
    
    resetLogoUI();
    
  } catch (err) {
    console.error(
      "[handleAddTeam] Error:",
      err
    );
    
    showAlert(
      err.message ||
      "Something went wrong"
    );
  }
}
async function saveEdit() {
  if (
    editingIndex === null
  ) {
    showAlert(
      "Something went wrong. Please try again"
    );
    return;
  }

  const newName =
    document
      .getElementById(
        "editNameInput"
      )
      .value
      .trim();

  const fileInput =
    document.getElementById(
      "editLogoInput"
    );

  try {
    const profile =
      await getUserProfile();

    const teams =
      Array.isArray(profile?.teams)
        ? profile.teams
        : [];

    const team =
      teams[editingIndex];

    if (!team) {
      showAlert(
        "Team not found"
      );
      return;
    }

    if (!newName) {
      showAlert(
        "Team name cannot be empty"
      );
      return;
    }

    const duplicate =
      teams.some(
        t =>
          String(t.id) !==
            String(team.id) &&
          String(t.name || "")
            .trim()
            .toLowerCase() ===
            newName.toLowerCase()
      );

    if (duplicate) {
      showAlert(
        "A team with this name already exists"
      );
      return;
    }

    let logo;

    if (
      fileInput?.files?.length
    ) {
      const file =
        fileInput.files[0];

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        showAlert(
          "Please select an image file"
        );
        return;
      }

      if (
        file.size >
        500 * 1024
      ) {
        showAlert(
          "Logo size must not exceed 500KB"
        );
        return;
      }

      logo =
        await fileToBase64(
          file
        );
    }

    showLoader();

    const token =
      getToken();

    if (!token) {
      throw new Error(
        "You are not logged in."
      );
    }

    const updates = {
      name: newName
    };

    if (
      logo !== undefined
    ) {
      updates.logo = logo;
    }

    const res =
      await apiRequest(
        `${API}/teams/${encodeURIComponent(
          team.id
        )}`,
        {
          method: "PATCH",
          headers: {
            Authorization: token,
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify(updates)
        },
        saveEdit
      );

    if (!res) {
      throw new Error(
        "No response from server."
      );
    }

    const result =
      await res.json();

    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Failed to update team."
      );
    }

    const updatedTeam =
      result.team;

    if (!updatedTeam) {
      throw new Error(
        "Team updated but no team data was returned."
      );
    }

    teams[editingIndex] =
      updatedTeam;

    profile.teams =
      teams;

    await saveCachedData(
      "profile",
      "",
      profile
    );

    closeEditModal();

    if (
      typeof renderUserProfile ===
      "function"
    ) {
      renderUserProfile(
        profile
      );
    }

    showActionModal(
      "✅ Team updated",
      "success"
    );

  } catch (err) {
    console.error(
      "[saveEdit]",
      err
    );

    showAlert(
      err.message ||
      "Failed to update team"
    );
  } finally {
    hideLoader();
  }
}


async function handleDeleteAccount() {
  console.log("Delete clicked");
  const password =
    document.getElementById("deletePasswordInput")
    .value.trim();
  
  const managementCode =
    document.getElementById("managementCodeInput")
    .value.trim();
  
  
  const isManagement =
    document.querySelector(
      ".management-delete-section"
    )?.style.display === "block";
  
  
  if (!password && !isManagement) {
    return showAlert("Enter your password.");
  }
  
  
  if (isManagement && !managementCode) {
    return showAlert("Enter management access code.");
  }
  
  
  const confirmed = confirm(
    "Are you sure you want to delete this account?"
  );
  
  
  if (!confirmed) return;
  
  
  showLoader();
  
  
  try {
    
    if (isManagement) {
      
      const uid = prompt(
        "Enter user ID to delete:"
      );
      
      
      if (!uid) {
        hideLoader();
        return;
      }
      
      
      await managerDeleteUser(
        uid,
        managementCode
      );
      
      
    } else {
      
      
      await deleteMyAccount(
        password
      );
      
      
      localStorage.removeItem("token");
      
    }
    
    
    closeDeleteAccountModal();
    
    
    showActionModal(
      "Account deleted successfully",
      "success"
    );
    
    
    setTimeout(() => {
      location.reload();
    }, 1500);
    
    
  } catch (err) {
    
    console.error(
      "[DELETE ACCOUNT]",
      err
    );
    
    showAlert(
      err.message || "Failed to delete account."
    );
    
    
  } finally {
    
    hideLoader();
    
  }
  
}

async function handleDeleteAccount() {
  
  const password =
    document.getElementById("deletePasswordInput")
    ?.value.trim();
  
  const managementCode =
    document.getElementById("managementCodeInput")
    ?.value.trim();
  
  
  const managementSection =
    document.querySelector(".management-delete-section");
  
  
  const isManagement =
    managementSection &&
    getComputedStyle(managementSection).display !== "none";
  
  
  if (!isManagement && !password) {
    return showAlert("Enter your password.");
  }
  
  
  if (isManagement && !managementCode) {
    return showAlert("Enter management access code.");
  }
  
  
  // Close delete modal before confirmation
  closeDeleteAccountModal();
  
  
  const confirmed = await showConfirmModal(
    "Are you sure you want to delete this account? This action cannot be undone.",
    "Delete",
    "Cancel"
  );
  
  
  if (!confirmed) {
    return;
  }
  
  
  showLoader();
  
  
  try {
    
    if (isManagement) {
      
      const uid = prompt(
        "Enter user ID to delete:"
      );
      
      
      if (!uid) {
        return;
      }
      
      
      await managerDeleteUser(
        uid,
        managementCode
      );
      
      
    } else {
      
      
      await deleteMyAccount(
        password
      );
      
      
      localStorage.removeItem("token");
      
    }
    
    
    showActionModal(
      "Account deleted successfully",
      "success"
    );
    
    
    setTimeout(() => {
      location.reload();
    }, 1500);
    
    
  } catch (err) {
    
    console.error(
      "[DELETE ACCOUNT ERROR]",
      err
    );
    
    
    showAlert(
      err.message || "Failed to delete account."
    );
    
    
  } finally {
    
    hideLoader();
    
  }
  
}

async function removeCompetition(id) {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/competitions/${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: token
      }
    },
    () => removeCompetition(id)
  );
  
  if (!res) return null;
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to delete competition.");
  }
  
  return result;
}

async function loadPublicTournaments() {
  try {
    const tournaments = await getPublicTournaments();
    
    publicTournaments = tournaments || [];
    
    renderTournamentList(
      "publicTournaments",
      publicTournaments
    );
    
  } catch (err) {
    showAlert(err.message || "Failed to load public tournaments");
  }
}

async function openCompetition(id) {
  showLoader();
  
  try {
    pageOrigin = "MyComp";
    
    setSelectedCompetition(id);
    
    currentCompetition =
      myCompetitions.find(
        c => String(c.id) === String(id)
      );
    
    goToListOfTournamentPage();
    
    myTournaments =
      await getMyTournaments(id);
    
    renderTournamentList(
      "tournamentList",
      myTournaments
    );
    
  } catch (err) {
    console.error(err);
    showAlert(err.message);
  } finally {
    hideLoader();
  }
}

async function loadMyTournaments() {
  try {
    const tournaments = await getMyTournaments();
    myTournaments = tournaments || [];
    
    return myTournaments;
  } catch (err) {
    console.error("[loadMyTournaments]", err);
    if (typeof showAlert === "function") {
      showAlert(err.message || "Failed to load tournaments");
    }
    return [];
  }
}

function editTournament(tournamentId) {
  const tournament = myTournaments.find(
    t => String(t.id) === String(tournamentId)
  );
  
  if (!tournament) {
    showAlert("Tournament not found.");
    return;
  }
  
  window.editingTournamentId = tournament.id;
  
  const modal = document.getElementById("createTour");
  const title = document.getElementById("tournamentModalTitle");
  const submitBtn = document.getElementById("tournamentModalSubmitBtn");
  
  const nameInput = document.getElementById("tournamentNameInput");
  const formatInput = document.getElementById("tournamentFormatInput");
  const seasonInput = document.getElementById("seasonInput");
  const seasonStatusInput = document.getElementById("seasonStatusInput");
  const startDateInput = document.getElementById("tournamentStartDate");
  const endDateInput = document.getElementById("tournamentEndDate");
  const imageInput = document.getElementById("tournamentImageInput");
  const imagePreview = document.getElementById("tournamentImagePreview");
  
  if (title) {
    title.textContent = "Edit Tournament";
  }
  
  if (submitBtn) {
    submitBtn.textContent = "Save Changes";
    submitBtn.onclick = saveInlineEdit;
  }
  
  if (nameInput) {
    nameInput.value = tournament.name || "";
  }
  
  if (formatInput) {
    formatInput.value = tournament.format || "league";
  }
  
  if (seasonInput) {
    seasonInput.value = tournament.season || "";
  }
  
  if (seasonStatusInput) {
    seasonStatusInput.value =
      tournament.seasonStatus || "upcoming";
  }
  
  if (startDateInput) {
    startDateInput.value = tournament.startDate || "";
  }
  
  if (endDateInput) {
    endDateInput.value = tournament.endDate || "";
  }
  
  if (imageInput) {
    imageInput.value = "";
  }
  
  const rawImage =
    tournament.tournamentImage ||
    tournament.logo;
  
  const imageUrl =
    typeof rawImage === "object" && rawImage !== null ?
    (
      rawImage.url ||
      rawImage.src ||
      rawImage.href ||
      ""
    ) :
    rawImage;
  
  if (imagePreview) {
    imagePreview.src =
      imageUrl || "images/default-tournament.png";
  }
  
  const selectedDays = tournament.matchDays || [];
  
  document
    .querySelectorAll("#matchDaysSelector input[type='checkbox']")
    .forEach(checkbox => {
      checkbox.checked = selectedDays.some(
        day => String(day) === String(checkbox.value)
      );
    });
  
  if (modal) {
    modal.style.display = "block";
  }
}

async function saveInlineEdit(e) {
  if (e) {
    e.stopPropagation();
  }
  
  const id = window.editingTournamentId;
  
  if (!id) return;
  
  const nameInput =
    document.getElementById("tournamentNameInput");
  
  const formatInput =
    document.getElementById("tournamentFormatInput");
  
  const seasonInput =
    document.getElementById("seasonInput");
  
  const seasonStatusInput =
    document.getElementById("seasonStatusInput");
  
  const startDateInput =
    document.getElementById("tournamentStartDate");
  
  const endDateInput =
    document.getElementById("tournamentEndDate");
  
  const imageInput =
    document.getElementById("tournamentImageInput");
  
  const name = nameInput.value.trim();
  
  if (!name) {
    showAlert("Tournament name cannot be empty");
    return;
  }
  
  const matchDays = Array.from(
    document.querySelectorAll(
      "#matchDaysSelector input[type='checkbox']:checked"
    )
  ).map(input => Number(input.value));
  
  showLoader();
  
  try {
    
    let tournamentImage = null;
    
    if (
      imageInput &&
      imageInput.files &&
      imageInput.files.length > 0
    ) {
      
      tournamentImage = await new Promise(
        (resolve, reject) => {
          
          const reader = new FileReader();
          
          reader.onload = () => {
            resolve(reader.result);
          };
          
          reader.onerror = reject;
          
          reader.readAsDataURL(
            imageInput.files[0]
          );
        }
      );
    }
    
    const changes = {
      name,
      format: formatInput.value,
      season: seasonInput.value.trim(),
      seasonStatus: seasonStatusInput.value,
      startDate: startDateInput.value,
      endDate: endDateInput.value,
      matchDays
    };
    
    if (tournamentImage) {
      changes.tournamentImage = tournamentImage;
    }
    
    const updatedTournament =
      await updateTournamentDetails(
        id,
        changes
      );
    
    const tournament =
      myTournaments.find(
        t => String(t.id) === String(id)
      );
    
    if (tournament) {
      Object.assign(
        tournament,
        updatedTournament
      );
    }
    
    if (
      currentTournament &&
      String(currentTournament.id) === String(id)
    ) {
      Object.assign(
        currentTournament,
        updatedTournament
      );
    }
    
    window.editingTournamentId = null;
    
    document.getElementById("createTour").style.display =
      "none";
    
    document.getElementById(
      "tournamentModalTitle"
    ).textContent = "Create New Tournament";
    
    document.getElementById(
      "tournamentModalSubmitBtn"
    ).textContent = "Create";
    
    document.getElementById(
      "tournamentModalSubmitBtn"
    ).onclick = tournamentCreator;
    
    if (imageInput) {
      imageInput.value = "";
    }
    
    document.getElementById(
      "tournamentImagePreview"
    ).src = "images/default-tournament.png";
    
    renderTournamentList();
    
    showActionModal(
      "Tournament Updated",
      "success"
    );
    
  } catch (err) {
    
    console.error(
      "[saveInlineEdit]",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to update tournament"
    );
    
  } finally {
    
    hideLoader();
    
  }
}

async function tournamentCreator() {
  const input = document.getElementById("tournamentNameInput");
  const formatInput = document.getElementById("tournamentFormatInput");
  const startDateInput = document.getElementById("tournamentStartDate");
  const endDateInput = document.getElementById("tournamentEndDate");
  const imageInput = document.getElementById("tournamentImageInput");
  const seasonInput = document.getElementById("seasonInput");
  const seasonStatusInput = document.getElementById("seasonStatusInput");
  
  const name = input.value.trim();
  const format = formatInput.value;
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const season = seasonInput.value.trim();
  const seasonStatus = seasonStatusInput.value;
  const competitionId = selectedCompetitionId;
  
  const matchDays = getSelectedMatchDays();
  
  
  if (!name) {
    showAlert("Enter tournament name");
    return;
  }
  
  
  if (!competitionId) {
    showAlert("Select a competition");
    return;
  }
  
  
  if (!season) {
    showAlert("Enter season");
    return;
  }
  
  
  if (!["upcoming", "active", "completed"].includes(seasonStatus)) {
    showAlert("Invalid season status");
    return;
  }
  
  
  if (!startDate || !endDate) {
    showAlert("Select start and end dates");
    return;
  }
  
  
  if (new Date(startDate) > new Date(endDate)) {
    showAlert("Start date must be before end date");
    return;
  }
  
  
  if (!matchDays.length) {
    showAlert("Select at least one match day");
    return;
  }
  
  
  matchDays.sort((a, b) => a - b);
  
  
  showLoader();
  
  
  try {
    
    let tournamentImage = null;
    
    
    if (imageInput.files.length > 0) {
      
      const file = imageInput.files[0];
      
      
      tournamentImage = await new Promise((resolve, reject) => {
        
        const reader = new FileReader();
        
        reader.onload = () => resolve(reader.result);
        
        reader.onerror = reject;
        
        reader.readAsDataURL(file);
        
      });
      
    }
    
    
    
    const result = await createTournament({
      name,
      format,
      startDate,
      endDate,
      matchDays,
      tournamentImage,
      competition_id: competitionId,
      season,
      season_status: seasonStatus
    });
    
    
    if (!result.success) {
      
      throw new Error(
        result.message || "Failed to create tournament."
      );
      
    }
    
    
    
    myTournaments.unshift(result.tournament);
    
    
    
    input.value = "";
    
    formatInput.selectedIndex = 0;
    
    startDateInput.value = "";
    
    endDateInput.value = "";
    
    seasonInput.value = "";
    
    seasonStatusInput.selectedIndex = 0;
    
    imageInput.value = "";
    
    
    
    document.getElementById(
      "tournamentImagePreview"
    ).src = "images/default-tournament.png";
    
    
    
    document
      .querySelectorAll(
        '#matchDaysSelector input[type="checkbox"]'
      )
      .forEach(cb => cb.checked = false);
    
    
    
    hideCreateTournament();
    
    showAlert("Tournament season created successfully!");
    
    renderTournamentList(myTournaments);
    
    
  } catch (err) {
    
    showAlert(err.message);
    
    
  } finally {
    
    hideLoader();
    
  }
}

function openLeagueRecorder(match) {
  if (!match) return;
  
  currentMatch = match;
  
  const homeTeam =
    match.home_team_name ||
    match.home_name ||
    match.home ||
    "Home Team";
  
  const awayTeam =
    match.away_team_name ||
    match.away_name ||
    match.away ||
    "Away Team";
  
  document.getElementById("homeTeam").textContent =
    homeTeam;
  
  document.getElementById("awayTeam").textContent =
    awayTeam;
  
  document.getElementById("homeGoals").value =
    match.played ?
    Number(match.home_score ?? 0) :
    "";
  
  document.getElementById("awayGoals").value =
    match.played ?
    Number(match.away_score ?? 0) :
    "";
  
  if (APP_MODE === "admin") {
    setupAdminResultModal();
  } else {
    setupPlayerResultModal();
    
    const screenshot =
      document.getElementById("matchScreenshot");
    
    if (screenshot) {
      screenshot.value = "";
    }
  }
  
  document.getElementById(
    "resultRecord"
  ).style.display = "block";
  
  activeInput = "homeGoals";
  
  const homeInput =
    document.getElementById("homeGoals");
  
  const awayInput =
    document.getElementById("awayGoals");
  
  homeInput.classList.add("active");
  awayInput.classList.remove("active");
  
  homeInput.focus();
  
  document.getElementById(
    "numpad"
  ).classList.remove("hidden");
}

async function handleSetScore() {
  if (!currentMatch) {
    closeResultRecord();
    return;
  }

  const hg =
    parseInt(
      document.getElementById("homeGoals").value,
      10
    );

  const ag =
    parseInt(
      document.getElementById("awayGoals").value,
      10
    );

  if (
    !currentMatch.home_team_id ||
    !currentMatch.away_team_id ||
    !Number.isInteger(hg) ||
    !Number.isInteger(ag) ||
    hg < 0 ||
    ag < 0
  ) {
    showAlert(
      "Invalid Team or Score input"
    );
    return;
  }

  const tournament =
    getCurrentTournament();

  if (!tournament) {
    showAlert(
      "Tournament not found."
    );
    return;
  }

  await setMatchResult(
    currentMatch,
    hg,
    ag
  );
}

async function setMatchResult(
  match,
  hg,
  ag
) {
  const tournament =
    getCurrentTournament();

  if (!tournament || !match) {
    return;
  }

  const homeGoals =
    Number(hg);

  const awayGoals =
    Number(ag);

  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0
  ) {
    showAlert(
      "Invalid Team or Score input"
    );
    return;
  }

  if (
    !match.id ||
    !match.home_team_id ||
    !match.away_team_id
  ) {
    showAlert(
      "This match is missing team information."
    );
    return;
  }

  showLoader();

  try {
    const response =
      await apiRequest(
        `${API}/tournaments/${encodeURIComponent(
          tournament.id
        )}/matches/${encodeURIComponent(
          match.id
        )}/result`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            home_score: homeGoals,
            away_score: awayGoals
          })
        },
        () =>
          setMatchResult(
            match,
            hg,
            ag
          )
      );

    if (!response) {
      throw new Error(
        "No response from server."
      );
    }

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Failed to save match result."
      );
    }

    const updatedMatch =
      data.match;

    const updatedPlayers =
      Array.isArray(data.players)
        ? data.players
        : [];

    if (updatedMatch) {
      const replaceMatch = array => {
        if (!Array.isArray(array)) {
          return;
        }

        const index =
          array.findIndex(
            item =>
              String(item.id) ===
              String(updatedMatch.id)
          );

        if (index !== -1) {
          array[index] =
            updatedMatch;
        }
      };

      replaceMatch(
        tournament.matches
      );

      replaceMatch(
        tournament.groupMatches
      );

      replaceMatch(
        tournament.knockoutMatches
      );

      replaceMatch(
        tournament.thirdPlaceMatch
      );

      const fixtureIndex =
        fixtures.findIndex(
          item =>
            String(item.id) ===
            String(updatedMatch.id)
        );

      if (fixtureIndex !== -1) {
        fixtures[fixtureIndex] = {
          ...fixtures[fixtureIndex],
          ...updatedMatch,
          homeGoals:
            updatedMatch.home_score,
          awayGoals:
            updatedMatch.away_score,
          played:
            Number(
              updatedMatch.played
            ) === 1,
          playedAt:
            updatedMatch.played_at,
          scheduledAt:
            updatedMatch.scheduled_at
        };
      }
    }

    if (
      Array.isArray(
        tournament.tournament_players
      )
    ) {
      for (
        const player of updatedPlayers
      ) {
        const index =
          tournament.tournament_players.findIndex(
            item =>
              String(item.id) ===
              String(player.id)
          );

        if (index !== -1) {
          tournament.tournament_players[
            index
          ] = player;
        }
      }
    }

    const cached =
      myTournaments.find(
        item =>
          String(item.id) ===
          String(tournament.id)
      );

    if (cached) {
      if (
        Array.isArray(
          tournament.matches
        )
      ) {
        cached.matches =
          tournament.matches;
      }

      if (
        Array.isArray(
          tournament.groupMatches
        )
      ) {
        cached.groupMatches =
          tournament.groupMatches;
      }

      if (
        Array.isArray(
          tournament.knockoutMatches
        )
      ) {
        cached.knockoutMatches =
          tournament.knockoutMatches;
      }

      if (
        Array.isArray(
          tournament.tournament_players
        )
      ) {
        cached.tournament_players =
          tournament.tournament_players;
      }
    }

    tableCache = null;
    cachedTournamentId = null;

    fixturesLoaded = false;
    fixturesTournamentId = null;
    fixtures = [];

    const table =
      buildTableFromTournamentPlayers(
        tournament
      );

    tournament.table =
      table;

    if (cached) {
      cached.table =
        table;
    }

    await loadTournamentFixtures(
      tournament.id
    );

    if (
      tournament.type === "cup" ||
      tournament.format === "cup"
    ) {
      await renderCupFixtures();
      await renderCupTables();

      if (
        typeof renderFullBracket ===
        "function"
      ) {
        await renderFullBracket();
      }
    } else {
      renderFixtures();
      renderTable(table);
    }

    if (
      typeof renderRecords ===
      "function"
    ) {
      renderRecords();
    }

    closeResultRecord();

    showActionModal(
      "Result Saved",
      "success"
    );

    return data;

  } catch (error) {
    console.error(
      "Error saving match result:",
      error
    );

    showAlert(
      error.message ||
      "Failed to save match result."
    );

  } finally {
    hideLoader();
  }
}

function getStableMatchOrder(matches) {
  return [...matches]
    .filter(m => m.played)
    .sort((a, b) => (a.playedAt || 0) - (b.playedAt || 0));
}

function updateStreaks(tournament) {
  if (!tournament?.matches) return;
  
  const ordered = getStableMatchOrder(tournament.matches);
  const streaks = {};
  
  ordered.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = { current: 0, best: 0 };
      }
    });
    
    const homeUnbeaten = m.homeGoals >= m.awayGoals;
    const awayUnbeaten = m.awayGoals >= m.homeGoals;
    
    streaks[m.home].current = homeUnbeaten ? streaks[m.home].current + 1 : 0;
    streaks[m.away].current = awayUnbeaten ? streaks[m.away].current + 1 : 0;
    
    streaks[m.home].best = Math.max(streaks[m.home].best, streaks[m.home].current);
    streaks[m.away].best = Math.max(streaks[m.away].best, streaks[m.away].current);
  });
  
  tournament.streaks = Object.entries(streaks).map(([team, data]) => ({
    team,
    current: data.current,
    best: data.best
  }));
}


async function backfillPlayedAtOnce(tournament) {
  if (!tournament) return;
  
  if (!Array.isArray(tournament.matches)) {
    tournament.matches = [];
  }
  
  if (tournament.backfillDone) return;
  
  const now = Date.now();
  let time = now - tournament.matches.length * 1000;
  
  tournament.matches.forEach(match => {
    if (match.played && !match.playedAt) {
      match.playedAt = time;
      time += 1000;
    }
  });
  
  tournament.backfillDone = true;
  
  await updateTournament(tournament.id, {
    updates: {
      matches: tournament.matches,
      backfillDone: true
    }
  });
  
  const cached = myTournaments.find(
    t => String(t.id) === String(tournament.id)
  );
  
  if (cached) {
    cached.matches = tournament.matches;
    cached.backfillDone = true;
  }
  
  console.log("Backfill ran once for", tournament.name);
}

function getPlayedMatches(matches = []) {
  return matches
    .filter(m =>
      m.played === true &&
      typeof m.playedAt === "number" &&
      typeof m.homeGoals === "number" &&
      typeof m.awayGoals === "number"
    )
    .sort((a, b) => a.playedAt - b.playedAt);
}

function getLongestUnbeatenRuns(matches) {
  const playedMatches = getPlayedMatches(matches);
  
  const streaks = {};
  
  playedMatches.forEach(m => {
    
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = { current: 0, best: 0 };
      }
    });
    
    if (m.homeGoals >= m.awayGoals) {
      streaks[m.home].current++;
    } else {
      streaks[m.home].current = 0;
    }
    
    if (m.awayGoals >= m.homeGoals) {
      streaks[m.away].current++;
    } else {
      streaks[m.away].current = 0;
    }
    
    
    streaks[m.home].best = Math.max(streaks[m.home].best, streaks[m.home].current);
    streaks[m.away].best = Math.max(streaks[m.away].best, streaks[m.away].current);
  });
  
  return Object.entries(streaks)
    .map(([team, data]) => [team, data.best])
    .sort((a, b) => b[1] - a[1]);
}


function resetMatchPlayedAt(tournament, homeTeam, awayTeam, newDate) {
  const match = tournament?.matches?.find(
    m => m.home === homeTeam && m.away === awayTeam
  );
  
  if (!match) {
    showAlert('Match not found');
    return false;
  }
  
  match.playedAt = newDate ? new Date(newDate).getTime() : Date.now();
  
  updateTournament(tournament);
  rebuildTableFromMatches();
  updateStreaks(tournament);
  renderFixtures();
  renderTable?.(tournament.table);
  
  showAlert(`Date updated for ${homeTeam} vs ${awayTeam}`);
  return true;
}


function openDateResetModal(homeTeam = '', awayTeam = '') {
  const modal = document.getElementById('dateResetModal');
  if (!modal) {
    showAlert('Modal not found');
    return;
  }
  
  
  document.getElementById('dateResetHome').value = homeTeam || '';
  document.getElementById('dateResetAway').value = awayTeam || '';
  document.getElementById('dateResetDate').value = '';
  
  modal.style.display = 'block';
}

function handleDateReset() {
  const tournament = getCurrentTournament();
  if (!tournament) {
    showAlert('No tournament loaded');
    return;
  }
  
  let homeTeam = document.getElementById('dateResetHome').value.trim();
  let awayTeam = document.getElementById('dateResetAway').value.trim();
  const dateInput = document.getElementById('dateResetDate').value;
  
  
  
  if (!homeTeam || !awayTeam) {
    if (!tournament.matches) {
      showAlert('No matches in tournament');
      return;
    }
    
    homeTeam = prompt('Enter Home Team name:');
    if (!homeTeam) return;
    
    awayTeam = prompt('Enter Away Team name:');
    if (!awayTeam) return;
    
    
    document.getElementById('dateResetHome').value = homeTeam.trim();
    document.getElementById('dateResetAway').value = awayTeam.trim();
  }
  
  
  const matchExists = tournament.matches.some(m =>
    m.home.toLowerCase() === homeTeam.toLowerCase() &&
    m.away.toLowerCase() === awayTeam.toLowerCase()
  );
  
  if (!matchExists) {
    showAlert(`Match not found: ${homeTeam} vs ${awayTeam}`);
    return;
  }
  
  const newDate = dateInput ? dateInput : null;
  const success = resetMatchPlayedAt(tournament, homeTeam, awayTeam, newDate);
  
  if (success) {
    closeDateResetModal();
    if (typeof renderFixtures === 'function') renderFixtures();
    showAlert('Match date updated');
  }
}

function getSelectedMatchDays() {
  const checkboxes = document.querySelectorAll(
    '#matchDaysSelector input[type="checkbox"]:checked'
  );
  
  return Array.from(checkboxes).map(cb => Number(cb.value));
}



function getMatchDates(startDate, endDate, matchDays) {
  const dates = [];
  
  let current = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(current) || isNaN(end)) {
    return [];
  }
  
  while (current <= end) {
    if (matchDays.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}


function assignRoundDatesSmart(matches, tournament) {
  let matchDays = tournament.matchDays;
  const startDate = tournament.startDate;
  const endDate = tournament.endDate;
  
  if (!matchDays || matchDays.length === 0) {
    showAlert("No valid match days selected");
    return matches;
  }
  
  const matchDates = getMatchDates(startDate, endDate, matchDays);
  const totalRounds = Math.max(...matches.map(m => m.round));
  
  if (matchDates.length === 0) {
    showAlert("No valid match days selected");
    return matches;
  }
  
  let warning = false;
  
  const schedule = matchDates.map(date => ({
    date,
    rounds: []
  }));
  
  let round = 1;
  
  
  const extraRounds = totalRounds - matchDates.length;
  
  
  const indices = [...Array(schedule.length).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  const doubleRoundDays = new Set(indices.slice(0, Math.max(0, extraRounds)));
  
  for (let i = 0; i < schedule.length && round <= totalRounds; i++) {
    schedule[i].rounds.push(round);
    round++;
    
    if (doubleRoundDays.has(i) && round <= totalRounds) {
      schedule[i].rounds.push(round);
      round++;
      warning = true;
    }
  }
  
  const roundToDateMap = {};
  
  schedule.forEach(slot => {
    slot.rounds.forEach(r => {
      roundToDateMap[r] = slot.date;
    });
  });
  
  const updatedMatches = matches.map(match => {
    const date = roundToDateMap[match.round];
    
    return {
      ...match,
      scheduledAt: date ? date.toISOString() : null,
      playedAt: null
    };
  });
  
  if (warning) {
    showAlert(
      "⚠ Schedule adjusted: some days have two consecutive rounds due to limited match days."
    );
  }
  
  return updatedMatches;
}

function assignKnockoutDates(matches, tournament) {
  if (!matches?.length) return matches;
  
  const matchDays = tournament.matchDays;
  const startDate = tournament.startDate;
  
  if (!matchDays?.length) {
    showAlert("No valid match days selected");
    return matches;
  }
  
  let knockStart = new Date(startDate);
  const groupsEnabled = tournament.settings?.enableGroups;
  
  if (groupsEnabled && tournament.groupMatches?.length) {
    const lastGroupDate = tournament.groupMatches.reduce((max, m) => {
      const d = m.scheduledAt ? new Date(m.scheduledAt) : null;
      return d && d > max ? d : max;
    }, new Date(0));
    
    if (lastGroupDate.getTime() > 0) {
      knockStart = new Date(lastGroupDate);
      knockStart.setDate(knockStart.getDate() + 1);
    }
  }
  
  const farFuture = new Date(knockStart);
  farFuture.setFullYear(farFuture.getFullYear() + 1);
  
  const matchDates = getMatchDates(knockStart, farFuture, matchDays);
  const totalRounds = Math.max(...matches.map(m => m.roundIndex));
  
  if (matchDates.length === 0) {
    showAlert("No valid match days selected");
    return matches;
  }
  
  const schedule = matchDates.map(date => ({ date, rounds: [] }));
  
  let round = 1;
  let warning = false;
  
  for (let i = 0; i < schedule.length && round <= totalRounds; i++) {
    schedule[i].rounds.push(round);
    round++;
  }
  
  if (round <= totalRounds) {
    let lastDate = schedule[schedule.length - 1].date;
    while (round <= totalRounds) {
      const nextSearchStart = new Date(lastDate);
      nextSearchStart.setDate(nextSearchStart.getDate() + 1);
      
      const nextValidDates = getMatchDates(nextSearchStart, farFuture, matchDays);
      if (!nextValidDates.length) break;
      
      const nextValid = nextValidDates[0];
      schedule.push({ date: nextValid, rounds: [round] });
      lastDate = nextValid;
      round++;
      warning = true;
    }
  }
  
  const roundToDateMap = {};
  schedule.forEach(slot => {
    slot.rounds.forEach(r => {
      roundToDateMap[r] = slot.date;
    });
  });
  
  const updatedMatches = matches.map(match => {
    const date = roundToDateMap[match.roundIndex];
    return {
      ...match,
      scheduledAt: date ? date.toISOString() : null,
      playedAt: null
    };
  });
  
  if (warning) {
    showAlert("⚠ Schedule extended beyond tournament end date on your selected match days.");
  }
  
  return updatedMatches;
}


async function loadHallOfFame() {
  const container =
    document.getElementById("hallOfFameList");
  
  if (!container) return;
  
  try {
    showLoader();
    
    const hallOfFame = await getHallOfFame();
    
    if (!hallOfFame) {
      container.innerHTML = "";
      return;
    }
    
    renderHallOfFame(hallOfFame);
    
    
  } catch (err) {
    console.error("Failed to load Hall of Fame:", err);
    
    container.innerHTML = `
      <div class="empty-state">
        Failed to load Hall of Fame.
      </div>
    `;
    
  } finally {
    hideLoader();
  }
}


async function showHallOfFameEditor() {
  
  closeMenu();
  showLoader();
  const hallOfFame = await getHallOfFame();
  
  if (!hallOfFame) {
    container.innerHTML = "";
    return;
  }
  
  openHallOfFameEditor(hallOfFame);
  hideLoader();
}

function closeHallofFameEditor() {
  document.getElementById("hallOfFameAdminPanel").style.display = "none"
}

function openHallOfFameEditor(hallOfFame) {
  const panel =
    document.getElementById("hallOfFameAdminPanel");
  
  if (!panel) return;
  
  hallOfFameAdminData = JSON.parse(
    JSON.stringify(hallOfFame || { categories: [] })
  );
  
  hallOfFameAdminData.categories ||= [];
  
  panel.style.display = "block";
  
  renderHallOfFameAdminEditor();
}

function renderHallOfFameAdminEditor() {
  const container =
    document.getElementById("hallOfFameAdminList");
  
  if (!container || !hallOfFameAdminData) return;
  
  container.innerHTML =
    hallOfFameAdminData.categories.map(
      (category, categoryIndex) => `
        <div class="hallOfFameAdminCategory">

          <div class="hallOfFameAdminCategoryTop">
            <input
              type="text"
              value="${escapeHtml(category.icon || "🏆")}"
              placeholder="Icon"
              oninput="
                updateHallOfFameCategoryIcon(
                  ${categoryIndex},
                  this.value
                )
              "
            >

            <input
              type="text"
              value="${escapeHtml(category.title || "")}"
              placeholder="Category title"
              oninput="
                updateHallOfFameCategoryTitle(
                  ${categoryIndex},
                  this.value
                )
              "
            >

            <button
              type="button"
              onclick="
                deleteHallOfFameCategory(
                  ${categoryIndex}
                )
              "
            >
              Delete
            </button>
          </div>

          <div class="hallOfFameAdminWinners">
            ${(category.winners || []).map(
              (winner, winnerIndex) => `
                <div class="hallOfFameAdminWinner">

                  <input
                    type="text"
                    value="${escapeHtml(winner.name || "")}"
                    placeholder="Competitor name"
                    oninput="
                      updateHallOfFameWinnerName(
                        ${categoryIndex},
                        ${winnerIndex},
                        this.value
                      )
                    "
                  >

                  <button
                    type="button"
                    onclick="
                      changeHallOfFameWins(
                        ${categoryIndex},
                        ${winnerIndex},
                        -1
                      )
                    "
                  >
                    −
                  </button>

                  <span>
                    ${Number(winner.wins) || 0}
                  </span>

                  <button
                    type="button"
                    onclick="
                      changeHallOfFameWins(
                        ${categoryIndex},
                        ${winnerIndex},
                        1
                      )
                    "
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onclick="
                      deleteHallOfFameWinner(
                        ${categoryIndex},
                        ${winnerIndex}
                      )
                    "
                  >
                    Delete
                  </button>

                </div>
              `
            ).join("")}
          </div>

          <button
            type="button"
            onclick="
              addHallOfFameWinner(
                ${categoryIndex}
              )
            "
          >
            + Add Winner
          </button>

        </div>
      `
    ).join("");
}

function updateHallOfFameCategoryIcon(
  categoryIndex,
  value
) {
  hallOfFameAdminData
    .categories[categoryIndex]
    .icon = value;
}

function updateHallOfFameCategoryTitle(
  categoryIndex,
  value
) {
  hallOfFameAdminData
    .categories[categoryIndex]
    .title = value;
}

function updateHallOfFameWinnerName(
  categoryIndex,
  winnerIndex,
  value
) {
  hallOfFameAdminData
    .categories[categoryIndex]
    .winners[winnerIndex]
    .name = value;
}

function changeHallOfFameWins(
  categoryIndex,
  winnerIndex,
  amount
) {
  const winner =
    hallOfFameAdminData
    .categories[categoryIndex]
    .winners[winnerIndex];
  
  winner.wins =
    Math.max(
      0,
      Number(winner.wins || 0) + amount
    );
  
  renderHallOfFameAdminEditor();
}

function addHallOfFameWinner(categoryIndex) {
  hallOfFameAdminData
    .categories[categoryIndex]
    .winners ||= [];
  
  hallOfFameAdminData
    .categories[categoryIndex]
    .winners.push({
      name: "New Competitor",
      wins: 1
    });
  
  renderHallOfFameAdminEditor();
}

function deleteHallOfFameWinner(
  categoryIndex,
  winnerIndex
) {
  hallOfFameAdminData
    .categories[categoryIndex]
    .winners.splice(
      winnerIndex,
      1
    );
  
  renderHallOfFameAdminEditor();
}

function addHallOfFameCategory() {
  hallOfFameAdminData.categories.push({
    icon: "🏆",
    id: `hall-${Date.now()}`,
    title: "New Category",
    winners: []
  });
  
  renderHallOfFameAdminEditor();
}

function deleteHallOfFameCategory(
  categoryIndex
) {
  hallOfFameAdminData.categories.splice(
    categoryIndex,
    1
  );
  
  renderHallOfFameAdminEditor();
}

function buildTableFromTournamentPlayers(tournament) {
  if (
    !tournament ||
    !Array.isArray(tournament.tournament_players)
  ) {
    return [];
  }
  
  const table =
    tournament.tournament_players
    .filter(
      player =>
      player &&
      player.team_id
    )
    .map(player => {
      const gf =
        Number(player.gf) || 0;
      
      const ga =
        Number(player.ga) || 0;
      
      return {
        id: player.team_id,
        name: player.team_name ||
          player.team?.name ||
          "",
        logo: player.team_logo ||
          player.team?.logo ||
          null,
        played: Number(player.played) || 0,
        wins: Number(player.wins) || 0,
        draws: Number(player.draws) || 0,
        losses: Number(player.losses) || 0,
        gf,
        ga,
        gd: gf - ga,
        pts: Number(player.points) || 0
      };
    });
  
  table.sort((a, b) => {
    if (b.pts !== a.pts) {
      return b.pts - a.pts;
    }
    
    if (b.gd !== a.gd) {
      return b.gd - a.gd;
    }
    
    if (b.gf !== a.gf) {
      return b.gf - a.gf;
    }
    
    return a.name.localeCompare(b.name);
  });
  
  table.forEach((team, index) => {
    team.pos = index + 1;
  });
  
  return table;
}

async function importTournamentsData(jsonString) {
  try {
    const token = getToken();
    
    if (!token) {
      showAlert("Invalid session. Please log in again.");
      return;
    }
    
    const competitionId = selectedCompetitionId;
    
    if (!competitionId) {
      showAlert("Please select a competition before importing.");
      return;
    }
    
    const importedData = JSON.parse(jsonString);
    
    if (!importedData) {
      showAlert("Invalid backup file structure.");
      return;
    }
    
    const tournament = Array.isArray(importedData) ?
      importedData[0] :
      importedData;
    
    if (!tournament || typeof tournament !== "object") {
      showAlert("Invalid tournament data.");
      return;
    }
    
    const name = tournament.name || tournament.title;
    
    if (!name) {
      showAlert("Imported file is missing a tournament name.");
      return;
    }
    
    showLoader();
    
    const payload = {
      name,
      format: tournament.format || "league",
      competitionId,
      season: tournament.season || "Season 1",
      seasonStatus: tournament.seasonStatus || "upcoming",
      startDate: tournament.startDate ||
        new Date().toISOString().split("T")[0],
      endDate: tournament.endDate ||
        new Date().toISOString().split("T")[0],
      matchDays: Array.isArray(tournament.matchDays) &&
        tournament.matchDays.length ?
        tournament.matchDays :
        [1],
      tournamentImage: typeof tournament.tournamentImage === "string" ?
        tournament.tournamentImage :
        null
    };
    
    const result = await createTournament(payload);
    
    if (!result?.success) {
      throw new Error(
        result?.message ||
        "Failed to create imported tournament."
      );
    }
    
    const newTournament = result.tournament;
    
    if (!newTournament?.id) {
      throw new Error(
        "Tournament was created but no tournament ID was returned."
      );
    }
    
    const patchUpdates = {};
    
    const fields = [
      "teams",
      "teamLogos",
      "matches",
      "table",
      "groups",
      "groupMatches",
      "groupTables",
      "qualifiedTeams",
      "knockoutMatches",
      "settings"
    ];
    
    fields.forEach(field => {
      if (tournament[field] !== undefined) {
        patchUpdates[field] = tournament[field];
      }
    });
    
    if (Object.keys(patchUpdates).length > 0) {
      try {
        await updateTournament(
          newTournament.id, { updates: patchUpdates }
        );
      } catch (err) {
        console.warn(
          "Tournament created, but internal data restore failed:",
          err
        );
      }
    }
    
    if (Array.isArray(window.myTournaments)) {
      window.myTournaments.unshift(newTournament);
    }
    
    showAlert(
      `Tournament "${name}" imported successfully!`
    );
    
    await openCompetition();
    
  } catch (err) {
    console.error("Import error:", err);
    showAlert(
      err?.message ||
      "Failed to import tournament data."
    );
  } finally {
    hideLoader();
  }
}

async function saveSubmissionDeadline() {
  const tournament = getCurrentTournament();
  
  if (!tournament) {
    showAlert("No tournament selected.");
    return;
  }
  
  const fromRound = Number(
    document.getElementById("submissionFromRound").value
  );
  
  const toRound = Number(
    document.getElementById("submissionToRound").value
  );
  
  const deadlineValue =
    document.getElementById("submissionDeadline").value;
  
  const enabled =
    document.getElementById("submissionDeadlineEnabled").checked;
  
  if (
    !Number.isInteger(fromRound) ||
    !Number.isInteger(toRound)
  ) {
    showAlert("Enter a valid round range.");
    return;
  }
  
  if (fromRound < 1 || toRound < fromRound) {
    showAlert("Invalid round range.");
    return;
  }
  
  if (!deadlineValue) {
    showAlert("Please select a deadline.");
    return;
  }
  
  const deadline =
    new Date(deadlineValue).getTime();
  
  if (
    !Number.isFinite(deadline) ||
    deadline <= Date.now()
  ) {
    showAlert("Deadline must be a future date or time.");
    return;
  }
  
  showLoader();
  
  try {
    const submissionDeadline =
      await updateSubmissionDeadline(
        tournament.id,
        fromRound,
        toRound,
        deadline,
        enabled
      );
    
    tournament.settings =
      tournament.settings || {};
    
    tournament.settings.submissionDeadline =
      submissionDeadline;
    
    showActionModal(
      "Submission deadline updated successfully.",
      "success"
    );
    
  } catch (err) {
    showAlert(
      err.message ||
      "Failed to update submission deadline."
    );
    
  } finally {
    hideLoader();
  }
}

function loadSubmissionDeadlineSettings(tournament) {
  const settings =
    tournament?.settings?.submissionDeadline;
  
  const fromInput =
    document.getElementById("submissionFromRound");
  
  const toInput =
    document.getElementById("submissionToRound");
  
  const deadlineInput =
    document.getElementById("submissionDeadline");
  
  const enabledInput =
    document.getElementById("submissionDeadlineEnabled");
  
  if (!fromInput || !toInput || !deadlineInput || !enabledInput) {
    return;
  }
  
  if (!settings) {
    fromInput.value = 1;
    toInput.value = 1;
    deadlineInput.value = "";
    enabledInput.checked = false;
    return;
  }
  
  fromInput.value =
    settings.fromRound ?? 1;
  
  toInput.value =
    settings.toRound ?? settings.fromRound ?? 1;
  
  enabledInput.checked =
    settings.enabled === true;
  
  if (settings.deadline) {
    const date =
      new Date(settings.deadline);
    
    const offset =
      date.getTimezoneOffset() * 60000;
    
    deadlineInput.value =
      new Date(
        date.getTime() - offset
      )
      .toISOString()
      .slice(0, 16);
  } else {
    deadlineInput.value = "";
  }
}


function loadSubmissionDeadlineCountdown(tournament) {
  const countdownElement =
    document.getElementById("submissionDeadlineCountdown");
  
  const settings =
    tournament?.settings?.submissionDeadline;
  
  if (!countdownElement) return;
  
  if (submissionDeadlineInterval) {
    clearInterval(submissionDeadlineInterval);
    submissionDeadlineInterval = null;
  }
  
  if (
    !settings ||
    settings.enabled !== true ||
    !settings.deadline
  ) {
    countdownElement.style.display = "none";
    return;
  }
  
  const deadline = Number(settings.deadline);
  const fromRound = Number(settings.fromRound);
  const toRound = Number(settings.toRound);
  
  if (
    !Number.isFinite(deadline) ||
    !Number.isInteger(fromRound) ||
    !Number.isInteger(toRound)
  ) {
    countdownElement.style.display = "none";
    return;
  }
  
  countdownElement.style.display = "block";
  
  const roundText =
    fromRound === toRound ?
    `Round ${fromRound}` :
    `Rounds ${fromRound}–${toRound}`;
  
  function updateCountdown() {
    const remaining = deadline - Date.now();
    
    if (remaining <= 0) {
      countdownElement.textContent =
        `${roundText} submission deadline has passed.`;
      
      clearInterval(submissionDeadlineInterval);
      submissionDeadlineInterval = null;
      return;
    }
    
    const totalSeconds = Math.floor(remaining / 1000);
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let timeText;
    
    if (days > 0) {
      timeText =
        `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
      timeText =
        `${hours}h ${minutes}m ${seconds}s`;
    }
    
    countdownElement.textContent =
      `${roundText} submission deadline: ${timeText}`;
  }
  
  updateCountdown();
  
  submissionDeadlineInterval =
    setInterval(updateCountdown, 1000);
}

async function loadNotices() {
  const container =
    document.getElementById("noticeBoard");
  
  if (!container) return;
  
  container.innerHTML = `
    <div class="notice-loader">
      Loading notices...
    </div>
  `;
  
  try {
    const notices = await getNotices();
    
    renderNotices(notices);
    
  } catch (err) {
    console.error("[loadNotices]", err);
    
    container.innerHTML = `
      <div class="notice-empty">
        Failed to load notices.
      </div>
    `;
  }
}

async function buildFixturesFromMatches(
  matches,
  tournamentId
) {
  const teams =
    await getTeams(
      tournamentId
    );
  
  const teamMap = {};
  
  teams.forEach(team => {
    teamMap[String(team.id)] =
      team;
  });
  
  return matches.map(match => {
    const homeTeam =
      teamMap[
        String(match.home_team_id)
      ];
    
    const awayTeam =
      teamMap[
        String(match.away_team_id)
      ];
    
    return {
      ...match,
      home: homeTeam?.name ||
        "Unknown Team",
      away: awayTeam?.name ||
        "Unknown Team",
      homeGoals: match.home_score,
      awayGoals: match.away_score,
      played: Number(match.played) === 1,
      playedAt: match.played_at,
      scheduledAt: match.scheduled_at,
      homeLogo: homeTeam?.logo ||
        null,
      awayLogo: awayTeam?.logo ||
        null
    };
  });
}

async function loadTournamentFixtures(
  tournamentId
) {
  if (!tournamentId) {
    throw new Error(
      "Tournament ID is required."
    );
  }
  
  if (
    fixturesLoaded &&
    String(fixturesTournamentId) ===
    String(tournamentId)
  ) {
    return fixtures;
  }
  
  const matches =
    await getTournamentMatches(
      tournamentId
    );
  
  fixtures =
    await buildFixturesFromMatches(
      matches,
      tournamentId
    );
  
  fixturesTournamentId =
    tournamentId;
  
  fixturesLoaded =
    true;
  
  return fixtures;
}



function checkSubmissionAlerts(
  tournament
) {
  if (
    !tournament ||
    !Array.isArray(fixtures) ||
    !fixtures.length
  ) {
    return;
  }
  
  const user =
    getCurrentUser();
  
  if (!user) return;
  
  const tournamentId =
    String(tournament.id);
  
  if (
    submissionAlertedTournaments.has(
      tournamentId
    )
  ) {
    return;
  }
  
  const role =
    String(
      user.role ||
      tournament.user_role ||
      ""
    ).toLowerCase();
  
  if (role === "admin") {
    const hasPending =
      fixtures.some(match =>
        String(
          match.submission_status || ""
        ).toLowerCase() === "pending"
      );
    
    if (!hasPending) {
      return;
    }
    
    submissionAlertedTournaments.add(
      tournamentId
    );
    
    showAlert(
      "You have a pending match submission to review."
    );
    
    return;
  }
  
  const player =
    tournament.tournament_players?.find(
      item =>
      String(item.user_id) ===
      String(user.id)
    );
  
  if (!player?.team_id) {
    return;
  }
  
  const hasRejected =
    fixtures.some(match => {
      const status =
        String(
          match.submission_status || ""
        ).toLowerCase();
      
      const isMyMatch =
        String(match.home_team_id) ===
        String(player.team_id) ||
        String(match.away_team_id) ===
        String(player.team_id);
      
      return (
        isMyMatch &&
        status === "rejected"
      );
    });
  
  if (!hasRejected) {
    return;
  }
  
  submissionAlertedTournaments.add(
    tournamentId
  );
  
  showAlert(
    "Your match submission was rejected."
  );
}

async function rebuildTableFromMatches(
  shouldRender = true
) {
  const tournament =
    getCurrentTournament();

  if (!tournament) return;

  if (
    cachedTournamentId === tournament.id &&
    tableCache
  ) {
    if (
      shouldRender &&
      typeof renderTable === "function"
    ) {
      renderTable(tableCache);
    }

    return tableCache;
  }

  showLoader();

  try {
    let table = null;

    if (
      Array.isArray(
        tournament.tournament_players
      )
    ) {
      table =
        buildTableFromTournamentPlayers(
          tournament
        );
    } else {
      const response =
        await fetch(
          `/tournaments/${tournament.id}/table`,
          {
            headers: {
              Authorization:
                `Bearer ${getToken()}`
            }
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "Failed to load tournament table."
        );
      }

      table =
        data.table || [];
    }

    tableCache = table;

    cachedTournamentId =
      tournament.id;

    tournament.table =
      table;

    if (
      shouldRender &&
      typeof renderTable === "function"
    ) {
      renderTable(table);
    }

    return table;

  } catch (err) {
    console.error(
      "[rebuildTableFromMatches]",
      err
    );

    showAlert(
      err.message ||
      "Failed to rebuild table."
    );

  } finally {
    hideLoader();
  }
}
async function loadTournamentTeams(tournamentId) {
  if (!tournamentId) {
    throw new Error("Tournament ID is required.");
  }
  
  if (
    Array.isArray(
      teamsByTournament[tournamentId]
    ) &&
    teamsByTournament[tournamentId].length
  ) {
    return teamsByTournament[tournamentId];
  }
  
  const teams =
    await getTeams(tournamentId);
  
  teamsByTournament[tournamentId] =
    Array.isArray(teams) ?
    teams : [];
  
  return teamsByTournament[tournamentId];
}

async function openMatchContacts(match) {
  const existing =
    document.getElementById(
      "matchContactsModal"
    );
  if (existing) {
    existing.remove();
  }
  const homeTeamId =
    match.home_team_id ||
    match.homeTeamId;
  const awayTeamId =
    match.away_team_id ||
    match.awayTeamId;
  const homeName =
    match.home || "Home";
  const awayName =
    match.away || "Away";
  const homeLogo =
    match.homeLogo || null;
  const awayLogo =
    match.awayLogo || null;
  const modal =
    document.createElement("div");
  modal.id =
    "matchContactsModal";
  modal.className =
    "match-contacts-modal";
  modal.innerHTML = `
    <div class="match-contacts-backdrop"></div>
    <div
      class="match-contacts-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="matchContactsTitle"
    >
      <div class="match-contacts-header">
        <div>
          <h3 id="matchContactsTitle">
            Team Contacts
          </h3>
          <p>
            Select a team to view their contact
          </p>
        </div>
        <button
          type="button"
          class="match-contacts-close"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div class="match-contacts-teams">
        <button
          type="button"
          class="match-contact-team"
          data-team-id="${homeTeamId || ""}"
        >
          <div class="match-contact-team-logo">
            ${
              homeLogo
                ? `
                  <img
                    src="${homeLogo}"
                    alt="${homeName}"
                  >
                `
                : `
                  <span>?</span>
                `
            }
          </div>
          <div class="match-contact-team-info">
            <span class="match-contact-team-name">
              ${homeName}
            </span>
            <span class="match-contact-team-action">
              View contact
            </span>
          </div>
          <span class="match-contact-arrow">
            ›
          </span>
        </button>
        <button
          type="button"
          class="match-contact-team"
          data-team-id="${awayTeamId || ""}"
        >
          <div class="match-contact-team-logo">
            ${
              awayLogo
                ? `
                  <img
                    src="${awayLogo}"
                    alt="${awayName}"
                  >
                `
                : `
                  <span>?</span>
                `
            }
          </div>
          <div class="match-contact-team-info">
            <span class="match-contact-team-name">
              ${awayName}
            </span>
            <span class="match-contact-team-action">
              View contact
            </span>
          </div>
          <span class="match-contact-arrow">
            ›
          </span>
        </button>
      </div>
      <div
        class="match-contact-details"
        hidden
      ></div>
    </div>
  `;
  document.body.appendChild(
    modal
  );
  const closeModal = () => {
    modal.remove();
  };
  const closeBtn =
    modal.querySelector(
      ".match-contacts-close"
    );
  const backdrop =
    modal.querySelector(
      ".match-contacts-backdrop"
    );
  closeBtn.onclick =
    closeModal;
  backdrop.onclick =
    closeModal;
  const teamButtons =
    modal.querySelectorAll(
      ".match-contact-team"
    );
  const details =
    modal.querySelector(
      ".match-contact-details"
    );
  teamButtons.forEach(
    (button) => {
      button.onclick =
        async () => {
          const teamId =
            button.dataset.teamId;
          if (!teamId) {
            showAlert(
              "Team information is unavailable."
            );
            return;
          }
          teamButtons.forEach(
            item => {
              item.disabled = true;
            }
          );
          details.hidden =
            false;
          details.innerHTML = `
            <div class="match-contact-loading">
              Loading contact...
            </div>
          `;
          try {
            const token =
              getToken();
            if (!token) {
              throw new Error(
                "You are not logged in."
              );
            }
            const res =
              await apiRequest(
                `${API}/teams/${encodeURIComponent(
                  teamId
                )}/contact`,
                {
                  method: "GET",
                  headers: {
                    Authorization:
                      token
                  }
                },
                () =>
                  openMatchContacts(
                    match
                  )
              );
            if (!res) {
              return;
            }
            const result =
              await res.json();
            if (
              !res.ok ||
              !result.success
            ) {
              throw new Error(
                result.message ||
                "Failed to load team contact."
              );
            }
            const contact =
              result.contact || {};
            const username =
              contact.username ||
              "Not available";
            const phone =
              contact.phone ||
              null;
            let whatsappNumber = null;
            if (phone) {
              let cleaned =
                String(phone)
                  .replace(
                    /[^\d+]/g,
                    ""
                  );
              if (
                cleaned.startsWith("+")
              ) {
                cleaned =
                  cleaned.substring(1);
              }
              if (
                cleaned.startsWith("0")
              ) {
                cleaned =
                  "234" +
                  cleaned.substring(1);
              }
              whatsappNumber =
                cleaned;
            }
            details.innerHTML = `
              <div class="match-contact-details-inner">
                <div class="match-contact-details-header">
                  <strong>
                    ${contact.team_name || "Team"}
                  </strong>
                </div>
                <div class="match-contact-info-row">
                  <span class="match-contact-info-label">
                    Owner
                  </span>
                  <span class="match-contact-info-value">
                    ${username}
                  </span>
                </div>
                <div class="match-contact-info-row">
                  <span class="match-contact-info-label">
                    WhatsApp
                  </span>
                  <span class="match-contact-info-value">
                    ${
                      whatsappNumber
                        ? `
                          <a
                            href="https://wa.me/${whatsappNumber}"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            ${phone}
                          </a>
                        `
                        : `
                          Not provided
                        `
                    }
                  </span>
                </div>
              </div>
            `;
          } catch (error) {
            console.error(
              "[openMatchContacts]",
              error
            );
            details.innerHTML = `
              <div class="match-contact-error">
                ${
                  error.message ||
                  "Failed to load contact."
                }
              </div>
            `;
          } finally {
            teamButtons.forEach(
              item => {
                item.disabled = false;
              }
            );
          }
        };
    }
  );
}


async function importTeams() {
  const current =
    getCurrentTournament();
  
  if (!current?.id) {
    showAlert(
      "No tournament is currently selected."
    );
    return;
  }
  
  const token =
    getToken();
  
  if (!token) {
    showAlert(
      "You must be logged in."
    );
    return;
  }
  
  showLoader();
  
  try {
    const res =
      await apiRequest(
        `${API}/tournaments/importable`,
        {
          method: "GET",
          headers: {
            Authorization: token
          }
        },
        () =>
        importTeams()
      );
    
    if (!res) {
      throw new Error(
        "No response from server."
      );
    }
    
    const result =
      await res.json();
    
    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Failed to load tournaments."
      );
    }
    
    const tournaments =
      (result.tournaments || [])
      .filter(
        t =>
        String(t.id) !==
        String(current.id)
      );
    
    if (!tournaments.length) {
      throw new Error(
        "No tournaments available."
      );
    }
    
    const html =
      tournaments
      .map(
        t => `
            <button
              type="button"
              class="list-item-btn"
              data-import-tournament="${t.id}"
            >
              ${t.name}
            </button>
          `
      )
      .join("");
    
    hideLoader();
    
    openListModal(
      "Import Teams From",
      html
    );
    
  } catch (err) {
    console.error(
      "[importTeams]",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to load tournaments."
    );
    
    hideLoader();
  }
}

document.addEventListener(
  "click",
  function (e) {
    const btn =
      e.target.closest(
        ".list-item-btn[data-import-tournament]"
      );

    if (!btn) {
      return;
    }

    const sourceId =
      btn.dataset.importTournament;

    importAllTeamsFromTournament(
      sourceId
    );
  }
);

async function importAllTeamsFromTournament(
  sourceId
) {
  const current =
    getCurrentTournament();

  if (!current?.id) {
    showAlert(
      "No tournament is currently selected."
    );
    return;
  }

  if (!sourceId) {
    showAlert(
      "Source tournament is required."
    );
    return;
  }

  if (
    String(sourceId) ===
    String(current.id)
  ) {
    showAlert(
      "You cannot import from the current tournament."
    );
    return;
  }

  const token =
    getToken();

  if (!token) {
    showAlert(
      "You must be logged in."
    );
    return;
  }

  showLoader();

  try {
    const res =
      await apiRequest(
        `${API}/tournaments/${encodeURIComponent(
          current.id
        )}/import-teams`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            source_tournament_id:
              sourceId
          })
        },
        () =>
          importAllTeamsFromTournament(
            sourceId
          )
      );

    if (!res) {
      throw new Error(
        "No response from server."
      );
    }

    const result =
      await res.json();

    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Failed to import teams."
      );
    }

    const updatedPlayers =
      Array.isArray(result.players)
        ? result.players
        : [];

    const tournament =
      getCurrentTournament();

    if (
      tournament &&
      String(tournament.id) ===
        String(current.id)
    ) {
      if (
        !Array.isArray(
          tournament.tournament_players
        )
      ) {
        tournament.tournament_players =
          [];
      }

      const existingPlayers =
        new Map(
          tournament.tournament_players.map(
            player => [
              String(
                player.team_id
              ),
              player
            ]
          )
        );

      updatedPlayers.forEach(
        player => {
          existingPlayers.set(
            String(
              player.team_id
            ),
            player
          );
        }
      );

      tournament.tournament_players =
        Array.from(
          existingPlayers.values()
        );

      tableCache = null;
      cachedTournamentId = null;

      if (
        tournament.format ===
        "league"
      ) {
        await rebuildTableFromMatches();
      } else {
        await renderFullBracket();
      }

      if (
        typeof renderTeams ===
        "function"
      ) {
        renderTeams();
      }
    }

    closeListModal();

    showActionModal(
      result.message ||
        "Teams imported successfully.",
      "success"
    );

  } catch (err) {
    console.error(
      "[importAllTeamsFromTournament]",
      err
    );

    showAlert(
      err.message ||
      "Failed to import teams."
    );

  } finally {
    hideLoader();
  }
}
async function removeTournamentPlayer(
  playerId
) {
  const current =
    getCurrentTournament();

  if (!current?.id) {
    showAlert(
      "No tournament is currently selected."
    );
    return;
  }

  if (!playerId) {
    showAlert(
      "Player is required."
    );
    return;
  }

  const player =
    Array.isArray(
      current.tournament_players
    )
      ? current.tournament_players.find(
          item =>
            String(item.id) ===
            String(playerId)
        )
      : null;

  const teamName =
    player?.team_name ||
    player?.team?.name ||
    "this team";

  showConfirmModal(
    `Are you sure you want to remove ${teamName} from this tournament?`,
    "Remove",
    "Cancel"
  );

  confirmYes = async () => {
    closeConfirmModal();

    const token =
      getToken();

    if (!token) {
      showAlert(
        "You must be logged in."
      );
      return;
    }

    showLoader();

    try {
      const tournamentId =
        current.id;

      const res =
        await apiRequest(
          `${API}/tournaments/${encodeURIComponent(
            tournamentId
          )}/players/${encodeURIComponent(
            playerId
          )}`,
          {
            method: "DELETE",
            headers: {
              Authorization: token
            }
          },
          () =>
            removeTournamentPlayer(
              playerId
            )
        );

      if (!res) {
        throw new Error(
          "No response from server."
        );
      }

      const result =
        await res.json();

      if (
        !res.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
          "Failed to remove player."
        );
      }

      const tournament =
        getCurrentTournament();

      if (
        tournament &&
        String(tournament.id) ===
          String(tournamentId)
      ) {
        if (
          !Array.isArray(
            tournament.tournament_players
          )
        ) {
          tournament.tournament_players =
            [];
        }

        tournament.tournament_players =
          tournament.tournament_players.filter(
            player =>
              String(player.id) !==
              String(playerId)
          );
      }

      if (
        teamsByTournament &&
        Array.isArray(
          teamsByTournament[
            tournamentId
          ]
        )
      ) {
        teamsByTournament[
          tournamentId
        ] =
          teamsByTournament[
            tournamentId
          ].filter(
            team =>
              String(team.id) !==
              String(
                result.player?.team_id
              )
          );
      }

      tableCache = null;
      cachedTournamentId = null;

      if (
        tournament?.format ===
        "league"
      ) {
        await rebuildTableFromMatches();
        await renderTeams(
          "teamList"
        );
      } else {
        await renderTeams(
          "cupTeamsContainer"
        );
        await renderFullBracket();
      }

      showActionModal(
        result.message ||
          "Player removed successfully.",
        "success"
      );

    } catch (error) {
      console.error(
        "[removeTournamentPlayer]",
        error
      );

      showAlert(
        error.message ||
          "Failed to remove player."
      );

    } finally {
      hideLoader();
    }
  };

  confirmNo = () => {
    closeConfirmModal();
  };
}



async function deleteTournament(id) {
  const tournament =
    myTournaments.find(
      t =>
      String(t.id) ===
      String(id)
    );
  
  const confirmed =
    await showConfirmModal(
      `Delete "${tournament?.name || "this tournament"}" permanently? This cannot be undone.`,
      "Yes",
      "No"
    );
  
  if (!confirmed) {
    return;
  }
  
  showLoader();
  
  try {
    await removeTournament(id);
    
    await renderTournamentList();
    
    showActionModal(
      "❌ Tournament Deleted",
      "delete"
    );
    
  } catch (err) {
    console.error(
      "Failed to delete tournament:",
      err
    );
    
    showAlert(
      err?.message ||
      "Failed to delete tournament."
    );
    
  } finally {
    hideLoader();
  }
}


async function removeTournament(id) {
  const idStr =
    String(id).trim();
  
  try {
    const token =
      getToken();
    
    if (!token) {
      throw new Error(
        "You are not logged in."
      );
    }
    
    const res =
      await apiRequest(
        `${API}/tournaments/${encodeURIComponent(idStr)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token
          }
        },
        () =>
        removeTournament(id)
      );
    
    if (!res) {
      throw new Error(
        "No response from server."
      );
    }
    
    const responseText =
      await res.text();
    
    let result;
    
    try {
      result =
        JSON.parse(responseText);
    } catch {
      throw new Error(
        `Server returned invalid JSON. HTTP ${res.status}`
      );
    }
    
    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Failed to delete tournament."
      );
    }
    
    myTournaments =
      myTournaments.filter(
        t =>
        String(t.id) !==
        idStr
      );
    
    if (
      currentTournament &&
      String(
        currentTournament.id
      ) === idStr
    ) {
      currentTournament = null;
    }
    
    return result;
    
  } catch (err) {
    console.error(
      "Failed to delete tournament:",
      err
    );
    
    throw err;
  }
}