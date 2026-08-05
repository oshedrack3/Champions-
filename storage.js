let APP_MODE = "view";
let myCompetitions = [];
let currentCompetition = null;
const STORE = "tournaments";

let currentTournament = null;
let currentReviewMatch = null;
let currentReviewSubmission = null;
let activeRequest = null;
let loadTimeout = null;
let tournamentEvents = null;
let notificationEvents = null;
let notifications = [];
let selectedCompetitionId = null;
let myTournaments = null;
let publicTournaments = [];
let editingTeamId = null;
const FetchGuard = {};

const RUN_KEYS = {
  LOAD_PUBLIC_TOURNAMENTS: "loadPublicTournaments",
};
const CallerGuard = {};

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
    loadPublicTournaments();
    await renderTournamentList();
    
    console.log("Tournament deleted:", idStr);
    
  } catch (err) {
    console.error("[DELETE] Failed:", err);
    
    showAlert(
      "Failed to delete tournament: " + err.message
    );
    
    throw err;
    
  } finally {
    hideLoader();
  }
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



async function saveInlineEdit(e) {
  e.stopPropagation();
  
  const id = window.editingTournamentId;
  
  if (!id) return;
  
  const card = document.querySelector(
    `.tournament-card[data-id="${id}"]`
  );
  
  if (!card) return;
  
  const input = card.querySelector(".edit-input");
  
  if (!input) return;
  
  const newName = input.value.trim();
  
  if (!newName) {
    return showAlert("Tournament name cannot be empty");
  }
  
  showLoader();
  
  try {
    await updateTournamentDetails(id, {
      name: newName
    });
    
    const tournament = myTournaments.find(
      t => String(t.id) === String(id)
    );
    
    if (tournament) {
      tournament.name = newName;
    }
    
    if (
      currentTournament &&
      String(currentTournament.id) === String(id)
    ) {
      currentTournament.name = newName;
    }
    
    window.editingTournamentId = null;
    
    renderTournamentList();
    
    showActionModal(
      "Tournament Updated",
      "success"
    );
    
  } catch (err) {
    console.error("[saveInlineEdit]", err);
    
    showAlert(
      err.message || "Failed to update tournament"
    );
    
  } finally {
    hideLoader();
  }
}

async function deleteTournament(id) {
  const tournament = myTournaments.find(
    t => String(t.id) === String(id)
  );
  
  const confirmed = await showConfirmModal(
    `Delete "${tournament?.name || "this tournament"}" permanently? This cannot be undone.`,
    "Yes",
    "No"
  );
  
  if (!confirmed) return;
  
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
  
  const latest = await getTournament(current.id);
  
  setCurrentTournament(latest);
  
  const index = myTournaments.findIndex(
    t => String(t.id) === String(latest.id)
  );
  
  if (index !== -1) {
    myTournaments[index] = latest;
  }
  
  return latest;
}

async function loadMyCompetitions() {
  showLoader();
  
  try {
    const user = getCurrentUser();
    
    if (user && user.role === "admin") {
      myCompetitions = await getMyCompetitions();
    } else {
      myCompetitions = await getPublicCompetitions();
    }
    
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
    
    
    const result = await createCompetition({
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
      .src = "images/default-tournament.png";
    
    
   closeCreateCompetitionModal();
    
    
    showAlert(
      "Competition created successfully!"
    );
    
    
  } catch (err) {
    
    showAlert(err.message);
    
  } finally {
    
    hideLoader();
    
  }
  
}

function setSelectedCompetition(id) {
  selectedCompetitionId = id;
}
async function addTeam(name, logo) {
  showLoader();
  
  try {
    const current = getCurrentTournament();
    
    if (!current) {
      showAlert("No tournament selected");
      return;
    }
    
    let tournament =
      myTournaments.find(
        t => String(t.id) === String(current.id)
      ) || current;
    
    const teamsObj = tournament.teams || {};
    
    const exists = Object.values(teamsObj).some(
      team =>
      team.name &&
      team.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    
    if (exists) {
      showAlert("Team already exists");
      return;
    }
    
    const teamId = crypto.randomUUID();
    const currentUser = getCurrentUser();
    
    const image = await uploadTeamLogo(
      tournament.id,
      teamId,
      name,
      logo
    );
    
    const newTeam = {
      id: teamId,
      name,
      ownerUid: currentUser?.uid || null,
      createdAt: Date.now(),
      logo: image.url
    };
    
    const updates = {
      [`teams/${teamId}`]: newTeam,
      [`teamLogos/${name}`]: image
    };
    
    await updateTournament(tournament.id, { updates });
    
    if (!tournament.teams) tournament.teams = {};
    if (!tournament.teamLogos) tournament.teamLogos = {};
    
    tournament.teams[teamId] = newTeam;
    tournament.teamLogos[name] = image;
    
    const index = myTournaments.findIndex(
      t => String(t.id) === String(tournament.id)
    );
    
    if (index !== -1) {
      myTournaments[index] = tournament;
    }
    
    currentTournament = tournament;
    
    showActionModal("✅ Team Registered", "success");
    
    if (typeof loadTournament === "function") {
      await loadTournament(tournament.id);
    } else {
      if (typeof renderTeams === "function") renderTeams();
      if (typeof renderTable === "function") renderTable();
    }
    
  } catch (err) {
    console.error("[addTeam]", err);
    showAlert(err.message || "Failed to add team");
    
  } finally {
    hideLoader();
   closeAddTeam();
  }
}


async function handleAddTeam() {
  const nameInput = document.getElementById("teamNameInput");
  const logoInput = document.getElementById("teamLogoInput");
  
  if (!nameInput || !logoInput) {
    showAlert("Error: Form elements not found");
    return;
  }
  
  const name = nameInput.value.trim();
  
  if (!name) {
    showAlert("Enter a team name");
    return;
  }
  
  const file = logoInput.files[0];
  
  if (!file) {
    showAlert("Team logo is required");
    return;
  }
  
  if (!file.type.startsWith("image/")) {
    showAlert("Please select an image file");
    return;
  }
  
  if (file.size > 500 * 1024) {
    showAlert("Logo size must not exceed 500KB");
    logoInput.value = "";
    resetLogoUI();
    return;
  }
  
  removeBackground(file, async (logo) => {
    if (!logo) {
      showAlert("Failed to process logo");
      return;
    }
    
    try {
      await addTeam(name, logo);
      
      nameInput.value = "";
      resetLogoUI();
      
    } catch (err) {
      console.error("[handleAddTeam] Error:", err);
      showAlert("Something went wrong");
    }
  });
}

async function saveEdit() {
  const tournament = getCurrentTournament();
  
  if (!tournament || editingIndex === null) {
    showAlert("Something went wrong. Please try again");
    return;
  }
  
  const newName = document
    .getElementById("editNameInput")
    .value.trim();
  
  const fileInput = document.getElementById("editLogoInput");
  
  const teams = Object.values(tournament.teams || {});
  
  const team = teams[editingIndex];
  
  if (!team) {
    showAlert("Team not found");
    return;
  }
  
  if (!newName) {
    showAlert("Team name cannot be empty");
    return;
  }
  
  const duplicate = teams.some(
    t =>
    t.id !== team.id &&
    t.name.trim().toLowerCase() ===
    newName.toLowerCase()
  );
  
  if (duplicate) {
    showAlert("A team with this name already exists");
    return;
  }
  
  let logo = null;
  
  if (fileInput?.files?.length) {
    const file = fileInput.files[0];
    
    if (!file.type.startsWith("image/")) {
      showAlert("Please select an image file");
      return;
    }
    
    if (file.size > 500 * 1024) {
      showAlert("Logo size must not exceed 500KB");
      return;
    }
    
    logo = await fileToBase64(file);
  }
  
  try {
    showLoader();
    
    await updateTeam(
      tournament.id,
      team.id,
      {
        name: newName,
        logo
      }
    );
    
    await refreshCurrentTournament();
    
    closeEditModal();
    
    renderTeams();
    
    showActionModal(
      "✅ Team updated",
      "success"
    );
    
  } catch (err) {
    console.error("[saveEdit]", err);
    showAlert(err.message || "Failed to update team");
  } finally {
    hideLoader();
  }
}

function editTournament(tournamentId) {
  const card = document.querySelector(
    `.tournament-card[data-id="${tournamentId}"]`
  );
  
  if (!card) return;
  
  const titleEl = card.querySelector("h3");
  const currentName = titleEl.textContent;
  
  titleEl.innerHTML = `
    <input type="text" class="edit-input" value="${currentName}" />
  `;
  
  let actionBox = card.querySelector(".edit-actions");
  
  if (!actionBox) {
    actionBox = document.createElement("div");
    actionBox.className = "edit-actions";
    card.appendChild(actionBox);
  }
  
  actionBox.innerHTML = `
    <div class="menu-itemList save">Save</div>
    <div class="menu-itemList cancel">Cancel</div>
  `;
  
  const input = titleEl.querySelector("input");
  
  window.editingTournamentId = tournamentId;
  
  input.focus();
  input.select();
  
  actionBox.querySelector(".save").addEventListener("click", (e) => {
    e.stopPropagation();
    saveInlineEdit(e);
  });
  
  actionBox.querySelector(".cancel").addEventListener("click", (e) => {
    e.stopPropagation();
    window.editingTournamentId = null;
    renderTournamentList();
  });
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
    
    currentCompetition = myCompetitions.find(
      c => String(c.id) === String(id)
    );
    
    goToListOfTournamentPage();
    
    const key = `${RUN_KEYS.LOAD_PUBLIC_TOURNAMENTS}_${id}`;
    
    if (!FetchGuard[key]) {
      const rawTournaments = await getMyTournaments();
      
      myTournaments = rawTournaments.filter(
        t => String(t.competitionId) === String(id)
      );
      
      FetchGuard[key] = true;
    }
    
    setTimeout(() => {
      renderTournamentList("tournamentList", myTournaments);
    }, 50);
    
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

