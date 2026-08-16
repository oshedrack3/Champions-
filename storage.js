let APP_MODE = "view";
let myCompetitions = [];
let currentCompetition = null;
const STORE = "tournaments";

let hallOfFameAdminData = null;

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
let editingCompetitionId = null;
let publicTournaments = [];
let editingTeamId = null;
let currentPage = null;
let cupRound = 1;
let currentKnockoutRoundIndex = 1;
let TournamentListStyle = "row";
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
      document.getElementById("cupName2").textContent = `${name} Bracket`;
      
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
      
      competitionId,
      
      season,
      
      seasonStatus
      
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
  
  document.getElementById("homeTeam").textContent =
    match.home;
  
  document.getElementById("awayTeam").textContent =
    match.away;
  
  document.getElementById("homeGoals").value =
    match.played ? match.homeGoals : "";
  
  document.getElementById("awayGoals").value =
    match.played ? match.awayGoals : "";
  
  if (APP_MODE === "admin") {
    setupAdminResultModal();
  } else {
    setupPlayerResultModal();
    
    document.getElementById(
      "matchScreenshot"
    ).value = "";
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

function handleSetScore() {
  closeResultRecord();
  if (!currentMatch) {
    return;
  }
  
  const hg = parseInt(
    document.getElementById("homeGoals").value
  );
  
  const ag = parseInt(
    document.getElementById("awayGoals").value
  );
  
  if (
    !currentMatch.home ||
    !currentMatch.away ||
    isNaN(hg) ||
    isNaN(ag)
  ) {
    showAlert("Invalid Team or Score input");
    return;
  }
  
  setMatchResult(
    currentMatch,
    hg,
    ag
  );
}

async function setMatchResult(match, hg, ag) {
  const tournament = getCurrentTournament();
  
  if (!tournament || !match) {
    return;
  }
  
  const homeGoals = Number(hg);
  const awayGoals = Number(ag);
  
  if (
    !Number.isFinite(homeGoals) ||
    !Number.isFinite(awayGoals)
  ) {
    return;
  }
  
  const groupMatch = (
    tournament.groupMatches || []
  ).find(
    m => String(m.id) === String(match.id)
  );
  
  if (groupMatch) {
    groupMatch.homeGoals = homeGoals;
    groupMatch.awayGoals = awayGoals;
    groupMatch.played = true;
    
    if (!groupMatch.playedAt) {
      groupMatch.playedAt = Date.now();
    }
    
    return await saveCupGroupResult(
      tournament
    );
  }
  
  const knockoutMatch = (
    tournament.knockoutMatches || []
  ).find(
    m => String(m.id) === String(match.id)
  );
  
  if (knockoutMatch) {
    knockoutMatch.homeGoals = homeGoals;
    knockoutMatch.awayGoals = awayGoals;
    knockoutMatch.played = true;
    
    if (!knockoutMatch.playedAt) {
      knockoutMatch.playedAt = Date.now();
    }
    
    return await saveKnockoutResult(
      tournament,
      knockoutMatch
    );
  }
  
  if (tournament.matches?.length) {
    const leagueMatch =
      tournament.matches.find(
        m => String(m.id) === String(match.id)
      );
    
    if (leagueMatch) {
      leagueMatch.homeGoals = homeGoals;
      leagueMatch.awayGoals = awayGoals;
      leagueMatch.played = true;
      
      if (!leagueMatch.playedAt) {
        leagueMatch.playedAt = Date.now();
      }
      
      return await saveLeagueResult(
        tournament
      );
    }
  }
}

async function saveLeagueResult(
  tournament
) {
  updateStreaks(
    tournament
  );

  showLoader();

  try {
    await updateTournament(
      tournament.id,
      {
        updates: {
          matches:
            tournament.matches,
          table:
            tournament.table,
          prevRanks:
            tournament.prevRanks,
          records:
            tournament.records
        }
      }
    );

    const cached =
      myTournaments.find(
        t =>
          String(t.id) ===
          String(tournament.id)
      );

    if (cached) {
      cached.matches =
        tournament.matches;

      cached.table =
        tournament.table;

      cached.prevRanks =
        tournament.prevRanks;

      cached.records =
        tournament.records;
    }

    renderFixtures();
    rebuildTableFromMatches();
    renderTable(
      tournament.table
    );
    renderRecords();

    showActionModal(
      "Result Saved",
      "success"
    );

  } catch (err) {
    console.error(err);
  } finally {
    hideLoader();
  }
}

async function saveCupGroupResult(tournament) {
  if (!tournament) return;
  
  generateGroupTables(tournament);
 
  showLoader();
  
  try {
    await updateTournament(
      tournament.id,
      {
        updates: {
          groupMatches: tournament.groupMatches,
          groupTables: tournament.groupTables
        }
      }
    );
    
    const cached = myTournaments.find(
      t =>
      String(t.id) ===
      String(tournament.id)
    );
    
    if (cached) {
      cached.groupMatches = [
        ...(tournament.groupMatches || [])
      ];
      
      cached.groupTables = {
        ...(tournament.groupTables || {})
      };
    }
    
    renderCupFixtures();
    renderCupTables();
    checkForEndOfGroupstage();
    showActionModal(
      "Result Saved",
      "success"
    );
    
  } catch (err) {
    console.error(
      "Error saving cup group result:",
      err
    );
  } finally {
    hideLoader();
  }
}
function processKnockoutUpdate(match, tournament) {
  if (
    !match ||
    !tournament?.knockoutMatches?.length
  ) {
    return;
  }
  
  if (!match.played) {
    return;
  }
  
  const homeGoals =
    Number(match.homeGoals);
  
  const awayGoals =
    Number(match.awayGoals);
  
  if (
    !Number.isFinite(homeGoals) ||
    !Number.isFinite(awayGoals)
  ) {
    return;
  }
  
  if (homeGoals === awayGoals) {
    return;
  }
  
  const winner =
    homeGoals > awayGoals ?
    match.home :
    match.away;
  
  const winnerName =
    typeof winner === "string" ?
    winner :
    winner?.name;
  
  if (!winnerName) {
    return;
  }
  
  match.winner = winnerName;
  
  const finalRound =
    Math.max(
      ...tournament.knockoutMatches.map(
        m =>
        Number(m.roundIndex) || 0
      )
    );
  
  if (
    Number(match.roundIndex) ===
    finalRound
  ) {
    tournament.champion =
      winnerName;
    
    tournament.championName =
      winnerName;
    
    return;
  }
  
  const nextRound =
    Number(match.roundIndex) + 1;
  
  const nextSlot =
    Math.floor(
      Number(match.slot) / 2
    );
  
  const nextMatch =
    tournament.knockoutMatches.find(
      m =>
      Number(m.roundIndex) ===
      nextRound &&
      Number(m.slot) ===
      nextSlot
    );
  
  if (!nextMatch) {
    throw new Error(
      `Next knockout match not found for ${match.id}`
    );
  }
  
  const winnerGoesHome =
    Number(match.slot) % 2 === 0;
  
  if (winnerGoesHome) {
    nextMatch.home =
      winnerName;
  } else {
    nextMatch.away =
      winnerName;
  }
  
  nextMatch.homeGoals = null;
  nextMatch.awayGoals = null;
  nextMatch.played = false;
  nextMatch.playedAt = null;
  nextMatch.winner = null;
}

async function saveKnockoutResult(
  tournament,
  match
) {
  processKnockoutUpdate(
    match,
    tournament
  );

  showLoader();

  try {
    await updateTournament(
      tournament.id,
      {
        updates: {
          knockoutMatches:
            tournament.knockoutMatches
        }
      }
    );

    const cached =
      myTournaments.find(
        t =>
          String(t.id) ===
          String(tournament.id)
      );

    if (cached) {
      cached.knockoutMatches =
        tournament.knockoutMatches;
    }

    closeResultRecord();

    await renderFullBracket();

    showActionModal(
      "Result Saved",
      "success"
    );

  } catch (err) {
    console.error(
      "Error saving knockout result:",
      err
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


async function showHallOfFameEditor () {

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
function closeHallofFameEditor () {
  document.getElementById("hallOfFameAdminPanel").style.display="none"
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