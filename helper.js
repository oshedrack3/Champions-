const PAGES = [
  "tournamentPage",
  "tablePage",
  "formViewPage",
  "fixturePage",
  "cupPage",
  "recordsView",
  "tablePageHead",
  "fixturePageHead",
  "nav",
  "cupHome",
  "customDropdown",
  "cupTab",
  "teamView",
  "authPage",
  "listOfTournamentPage",
  "tourListPageHead",
  "compPageHead",
  "competitionPage",
  "notificationPanel"
  
  
  
  
];

function hideAllPages() {
  PAGES.forEach(id => {
    const pageElement = document.getElementById(id);
    if (pageElement) {
      pageElement.style.display = "none";
    }
  });
}

function showAlert(title, message = null) {
  const modal = document.getElementById("alertModal");
  const titleElement = document.getElementById("alertTitle");
  const text = document.getElementById("alertText");
  
  if (message === null) {
    message = title;
    title = "";
  }
  
  titleElement.textContent = title;
  text.textContent = message;
  
  modal.style.display = "flex";
}


function closeAlert() {
  const modal = document.getElementById("alertModal");
  modal.style.display = "none";
}

let inputCallback = null;

function showInputModal(title, callback) {
  document.getElementById("inputTitle").textContent = title;
  document.getElementById("modalInput").value = "";
  document.getElementById("inputModal").style.display = "flex";
  
  inputCallback = callback;
}

function submitModalInput() {
  const value = document.getElementById("modalInput").value;
  closeInputModal();
  
  if (inputCallback) {
    inputCallback(value);
  }
}

function closeInputModal() {
  document.getElementById("inputModal").style.display = "none";
}


function showActionModal(message, type = "") {
  const modal = document.getElementById("actionModal");
  
  modal.textContent = message;
  modal.className = "action-modal";
  
  if (type) modal.classList.add(type);
  
  modal.classList.add("show");
  
  setTimeout(() => modal.classList.remove("show"), 1200);
}



let confirmCallback = null;

function showConfirmModal(
  message,
  yesText = null,
  noText = null
) {
  document.getElementById("confirmText").textContent = message;
  
  if (yesText !== null) {
    document.getElementById("confirmYesBtn").textContent = yesText;
  }
  
  if (noText !== null) {
    document.getElementById("confirmNoBtn").textContent = noText;
  }
  
  document.getElementById("confirmModal").style.display = "flex";
  
  return new Promise((resolve) => {
    confirmCallback = resolve;
  });
}

function closeConfirmModal() {
  document.getElementById("confirmModal").style.display = "none";
}

function confirmYes() {
  closeConfirmModal();
  
  if (confirmCallback) {
    confirmCallback(true);
    confirmCallback = null;
  }
}

function confirmNo() {
  closeConfirmModal();
  
  if (confirmCallback) {
    confirmCallback(false);
    confirmCallback = null;
  }
}


async function handleGenerateFixtures() {
  const tournament = getCurrentTournament();
  
  if (!tournament) {
    showAlert("No tournament found");
    return;
  }
  
  if (tournament.matches && tournament.matches.length > 0) {
    const confirmed = await showConfirmModal(
      "Fixtures already exist. Delete and regenerate?",
      "Generate",
      "Cancel"
    );
    
    if (!confirmed) return;
    
    deleteFixtures(true);
    proceedToInput();
  } else {
    proceedToInput();
  }
}

function proceedToInput() {
  showInputModal("Enter 1 for Single Round or 2 for Double Round:", (input) => {
    const rounds = parseInt(input);
    
    if (rounds !== 1 && rounds !== 2) {
      showAlert("Invalid input.", "Round must be 1 or 2");
      return;
    }
    
    generateFixtures(rounds);
    goToFixturePage();
    
  });
}


function getAllTournaments() {
  return JSON.parse(localStorage.getItem("tournaments") || "[]");
}




function showCreateTournament() {
  document.getElementById("createTour").style.display = "block";
}

function hideCreateTournament() {
  document.getElementById("createTour").style.display = "none";
}

function openCreateTournament() {
  
  document.getElementById("createTour").style.display = "block";
}


let activeInput = null;

document.getElementById('homeGoals').addEventListener('focus', () => openNumpad('homeGoals'));
document.getElementById('awayGoals').addEventListener('focus', () => openNumpad('awayGoals'));


function openNumpad(inputId) {
  activeInput = document.getElementById(inputId);
  
  document.getElementById("homeGoals").classList.remove("active");
  document.getElementById("awayGoals").classList.remove("active");
  
  activeInput.classList.add("active");
  
  document.getElementById("numpad").classList.remove("hidden");
}


function pressNum(n) {
  if (!activeInput) return;
  activeInput.value = (activeInput.value || '') + n;
}

function clearNum() {
  if (!activeInput) return;
  activeInput.value = '';
}

function goToCupPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("cupSchedule").style.display = "block";
  document.getElementById("tourListPageHead").style.display = "none";
  document.getElementById("cupPage").style.display = "block";
  renderCupFixtures();
  document.getElementById("cupPageHead").style.display = "block";
  document.getElementById("cupHome").style.display = "flex";
  
  const tournament = getCurrentTournament();
  if (tournament) {
    renderCupTables();
    renderCupFixtures()
    toggleCupView("tables");
  }
  
}


function openTournamentPage() {
  const format = localStorage.getItem("currentTournamentFormat");
  
  if (!format) {
    showAlert("No tournament open");
    return;
  }
  
  if (format === "league") {
    goToTournamentPage();
  } else {
    goToCupPage();
  }
}


function closeResultRecord() {
  document.getElementById("resultRecord").style.display = "none";
  
  document.getElementById("homeGoals").classList.remove("active");
  document.getElementById("awayGoals").classList.remove("active");
  
  activeInput = null;
}



function setActiveNav(buttonId) {
  document
    .querySelectorAll(".bottom-nav button")
    .forEach(btn => btn.classList.remove("active"));
  
  document.getElementById(buttonId)?.classList.add("active");
}


function openLeagueRecorder(match) {
  if (!match) return;
  
  currentMatch = match;
  
  document.getElementById("homeTeam").textContent = match.home;
  document.getElementById("awayTeam").textContent = match.away;
  
  document.getElementById("homeGoals").value =
    match.played ? match.homeGoals : "";
  
  document.getElementById("awayGoals").value =
    match.played ? match.awayGoals : "";
  
  if (APP_MODE === "admin") {
    
    setupAdminResultModal();
    
  } else {
    
    setupPlayerResultModal();
    
    document.getElementById("matchScreenshot").value = "";
    
  }
  
  document.getElementById("resultRecord").style.display = "block";
  
  activeInput = "homeGoals";
  
  const homeInput = document.getElementById("homeGoals");
  const awayInput = document.getElementById("awayGoals");
  
  homeInput.classList.add("active");
  awayInput.classList.remove("active");
  
  homeInput.focus();
  
  document.getElementById("numpad").classList.remove("hidden");
}

const logoInput = document.getElementById("teamLogoInput");
const logoPreview = document.getElementById("teamLogoPreview");

logoInput.addEventListener("change", function() {
  const file = this.files[0];
  
  if (!file) {
    logoPreview.src = "";
    logoPreview.classList.remove("show");
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    logoPreview.src = e.target.result;
    logoPreview.classList.add("show");
  };
  
  reader.readAsDataURL(file);
});


function toggleView(view) {
  const tableView = document.getElementById("tableView");
  const formView = document.getElementById("formView");
  const recordsView = document.getElementById("recordsView");
  const teamView = document.getElementById("teamView");
  
  const views = [tableView, formView, recordsView, teamView];
  
  views.forEach(v => {
    if (!v) return;
    v.style.display = "none";
  });
  
  document.querySelectorAll(".btn-tablePage button").forEach(btn => {
    btn.classList.remove("active");
  });
  
  const activeBtn =
    document.querySelector(`[data-view="${view}"]`) ||
    document.getElementById(`${view}Btn`);
  
  if (activeBtn) activeBtn.classList.add("active");
  
  currentView = view;
  
  let activeView = null;
  
  if (view === "table") {
    activeView = tableView;
    updateDropdownLabel("table")
  } else if (view === "form") {
    activeView = formView;
    renderFormView();
    updateDropdownLabel("forms")
  } else if (view === "records") {
    activeView = recordsView;
    renderRecords();
    updateDropdownLabel("records")
  } else if (view === "team") {
    activeView = teamView;
    renderTeams();
    updateDropdownLabel("teams")
  }
  
  if (!activeView) return;
  
  activeView.style.display = "block";
}



let currentPage = null;

function setPageAndToggleMenu(page) {
  currentPage = page;
  toggleMenu();
}


function closeMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");
  
  menu.classList.remove("open");
  overlay.classList.remove("active");
}


function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");
  
  menu.classList.toggle("open");
  overlay.classList.toggle("active");
  
  if (menu.classList.contains("open")) {
    renderMenu();
  }
}


function handleMenuAction(action) {
  closeMenu();
  
  const actions = {
    addTeam: openAddTeam,
    importTeams: importTeams,
    deleteTeam: deleteTeamInfo,
    createTournament: openCreateTournament,
    enableExportMode: enableExportMode,
    newCup: openCupBox,
    importTournament: openImportTournament,
    openTournament: openTournamentInfo,
    deleteTournament: deleteTournamentInfo,
    sharePOTS: sharePOTS,
    openPOTS: openPOTSSetup,
    shareGroupTable: shareCupTable,
    createFixture: handleGenerateFixtures,
    inviteplayer: openInvitePlayerModal,
    createComp:openCreateCompetitionModal,
    deleteAcc: openDeleteAccountModal,
    deleteUser: openDeleteAccountModal,
    dateEdit: openDateResetModal,
    deleteCupTeam: deleteCupTeamInfo
    
    
  };
  
  actions[action]?.();
}


const menuConfig = {
  competition: [
  
  {
    label: "Create New Competition",
    action: "createComp",
    roles: ["admin"]
  },
  {
  label: "Delete My Account",
  action: "deleteAcc",
  roles: ["admin", "player"]
},
{
  label: "Delete User Account",
  action: "managerDeleteUser",
  roles: ["admin","management"]
},
  /*
  {
    label: "Create New Tournament",
    action: "createTournament",
    roles: ["admin"]
  },
  
  {
    label: "Import Tournament",
    action: "importTournament",
    roles: ["admin"]
  },
  
  {
    label: "Export Tournament",
    action: "enableExportMode",
    roles: ["admin"]
  },
  
  {
    label: "Delete Tournament",
    action: "deleteTournament",
    roles: ["admin"]
  },
  
  {
    label: "Setup POTS Tournaments",
    action: "openPOTS",
    roles: ["admin"]
  },
  
  {
    label: "Share POTS Ranking",
    action: "sharePOTS",
    roles: ["admin", "player"]
  }
  */
],
  tournaments: [
    
    {
      label: "Open Tournament",
      action: "openTournament",
      roles: ["admin", "player"]
    },
    
    {
      label: "Create New Tournament",
      action: "createTournament",
      roles: ["admin"]
    },
    
    {
      label: "Import Tournament",
      action: "importTournament",
      roles: ["admin"]
    },
    
    {
      label: "Export Tournament",
      action: "enableExportMode",
      roles: ["admin"]
    },
    
    {
      label: "Delete Tournament",
      action: "deleteTournament",
      roles: ["admin"]
    },
    
    {
      label: "Setup POTS Tournaments",
      action: "openPOTS",
      roles: ["admin"]
    },
    
    {
      label: "Share POTS Ranking",
      action: "sharePOTS",
      roles: ["admin", "player"]
    }
    
  ],
  
  league: [
    
    {
      label: "Invite Player",
      action: "inviteplayer",
      roles: ["admin"]
    },
    
    {
      label: "Register Your Teams",
      action: "addTeam",
      roles: ["admin", "player"]
    },
    
    {
      label: "Import Teams",
      action: "importTeams",
      roles: ["admin"]
    },
    
    {
      label: "Edit or Delete Team",
      action: "deleteTeam",
      roles: ["admin"]
    }
    
  ],
  
  fixture: [
    
    {
      label: "Generate New Fixture",
      action: "createFixture",
      roles: ["admin"]
    },
    
    {
      label: "Change Played Match Date",
      action: "dateEdit",
      roles: ["admin"]
    }
    
  ],
  
  cup: [
    
    {
      label: "Start New Tournament",
      action: "newCup",
      roles: ["admin"]
    },
    
    {
      label: "Register New Teams",
      action: "addTeam",
      roles: ["admin", "player"]
    },
    
    {
      label: "Import Teams",
      action: "importTeams",
      roles: ["admin"]
    },
    
    {
      label: "Delete or Edit Team",
      action: "deleteCupTeam",
      roles: ["admin", "player"]
    },
    
    {
      label: "Share Group Table",
      action: "shareGroupTable",
      roles: ["admin", "player"]
    }
    
  ]
  
};

function renderMenu() {
  const menu = document.getElementById("sideMenu");
  
  if (!menu) return;
  
  const role = APP_MODE || "view";
  
  const items = (menuConfig[currentPage] || []).filter(item => {
    
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    
    return item.roles.includes(role);
    
  });
  
  menu.innerHTML = `
    <div class="menu-header">
      ${currentPage ? currentPage.toUpperCase() : "MENU"}
    </div>

    ${items.map(item => `
      <button
        class="menu-item"
        onclick="handleMenuAction('${item.action}')">
        ${item.label}
      </button>
    `).join("")}

    <button
      class="btn-logout"
      style="display:none"
      onclick="handleLogout()">
      Logout
    </button>
  `;
  
  const logoutBtn = menu.querySelector(".btn-logout");
  
  if (logoutBtn) {
    logoutBtn.style.display =
      currentPage === "competition" ?
      "block" :
      "none";
  }
}

function openAddTeam() {
  closeMenu();
  toggleView('team');
  document.getElementById("addNewTeam").style.display = "block";
  
}


function openPOTSSetup() {
  showPOTSView();
  closeMenu();
  document.getElementById("POTS").style.display = "block";
  
}

function showRulesModal() {
  document.getElementById("rulesModal").style.display = "flex";
}

function hideRulesModal() {
  document.getElementById("rulesModal").style.display = "none";
}


function closePOTSSetup() {
  closeMenu();
  document.getElementById("POTS").style.display = "none";
  
}

function sharePOTS() {
  showPOTSView();
  closeMenu();
  sharePOTSTable();
  
}



function closeAddTeam() {
  document.getElementById("addNewTeam").style.display = "none";
  toggleView('team');
}


function deleteTeamInfo() {
  closeMenu();
  showAlert("Swap to the left on  the team you want to delete or edit");
  
  toggleView("team");
}


function deleteCupTeamInfo() {
  closeMenu();
  toggleCupView("cupBox");
  toggleCupSetUpView("teams")
  showAlert("Swap to the left on the Team  to show the  Edit and Delete Team button");
  
  
}


function deleteTournamentInfo() {
  closeMenu();
  showAlert("Click on the menu icon on the tornament to see the delete button");
  
}

function openTournamentInfo() {
  
  showAlert("Click on the tournament You want to Open");
  closeMenu();
}



function openCupBox() {
  
  closeMenu();
  toggleCupView('cupBox');
  
}


function openImportTournament() {
  document.getElementById("importTournamentInput").click();
}


function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    if (e.target?.result) {
      await importTournamentsData(e.target.result);
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}


let exportMode = false;
let selectedTournaments = [];


function enableExportMode() {
  exportMode = true;
  selectedTournaments = [];
  
  document.getElementById("confirmExportBtn").style.display = "inline-flex";
  document.getElementById("exitExportBtn").style.display = "inline-flex";
  
  
  showAlert("Tap tournaments to select then export")
  
  renderTournamentList();
}

function exitExportMode() {
  exportMode = false;
  selectedTournaments = [];
  
  document.getElementById("confirmExportBtn").style.display = "none";
  document.getElementById("exitExportBtn").style.display = "none";
  
  
  renderTournamentList();
}


function toggleSelect(id) {
  if (selectedTournaments.includes(id)) {
    selectedTournaments = selectedTournaments.filter(t => t !== id);
  } else {
    selectedTournaments.push(id);
  }
  
  renderTournamentList();
}


async function exportSelectedTournaments() {
  const tournaments = getTournaments();
  
  const selected = tournaments.filter(t =>
    selectedTournaments.includes(t.id)
  );
  
  if (selected.length === 0) {
    showAlert("No tournaments selected");
    return;
  }
  
  // Deep clone the selected data so we don't accidentally pollute our current runtime state
  const exportData = JSON.parse(JSON.stringify(selected));
  
  // Loop through the clone and embed the real base64 images from IndexedDB
  for (const tournament of exportData) {
    if (tournament.teamLogos) {
      const teams = Object.keys(tournament.teamLogos);
      for (const team of teams) {
        const logoKey = tournament.teamLogos[team];
        
        // If it is an IndexedDB tracking key, grab the raw image text string
        if (logoKey && !logoKey.startsWith("data:image")) {
          try {
            const base64Data = await getLogoFromIndexedDB(logoKey);
            if (base64Data) {
              // Temporarily pack the heavy image data back into the exported map
              tournament.teamLogos[team] = base64Data;
            }
          } catch (err) {
            console.error(`Failed to package logo for team ${team}:`, err);
          }
        }
      }
    }
  }
  
  const blob = new Blob(
    [JSON.stringify(exportData, null, 2)], { type: "application/json" }
  );
  
  const file = new File(
    [blob],
    `tournaments-${selected.length}.json`, { type: "application/json" }
  );
  
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      title: "Tournaments Export",
      text: "Selected tournaments backup",
      files: [file]
    });
  } else {
    fallbackDownload(file);
  }
  
  exitExportMode();
}

function fallbackDownload(file) {
  const url = URL.createObjectURL(file);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
  
  showAlert("File downloaded");
}
function goToListOfTournamentPage() {
  hideAllPages();
  closeTournamentEvents();
  document.getElementById("listOfTournamentPage").style.display = "flex";
  document.getElementById("tourListPageHead").style.display = "flex";
  currentSwapView = 0;
  updateSwapView();
}
function openListModal(title, html) {
  document.getElementById("listModalTitle").textContent = title;
  document.getElementById("listModalContent").innerHTML = html;
  
  document.getElementById("listModal").style.display = "flex";
}

function closeListModal() {
  document.getElementById("listModal").style.display = "none";
}


function getTournamentTeams(tournamentId) {
  const tournaments = getTournaments();
  
  const tournament = tournaments.find(
    t => String(t.id) === String(tournamentId)
  );
  
  return tournament?.teams || [];
}

function getImportSources() {
  const currentId = localStorage.getItem("currentTournamentId");
  
  return getTournaments().filter(
    t => String(t.id) !== String(currentId)
  );
}

function openListModal(title, contentHTML) {
  const modal = document.getElementById("listModal");
  const titleEl = document.getElementById("listModalTitle");
  const contentEl = document.getElementById("listModalContent");
  
  if (!modal || !titleEl || !contentEl) return;
  
  titleEl.textContent = title;
  contentEl.innerHTML = contentHTML;
  modal.style.display = "flex";
}

function closeListModal() {
  const modal = document.getElementById("listModal");
  if (modal) modal.style.display = "none";
}

async function goToCompetitionPage() {
  
  hideAllPages();
  
  closeTournamentEvents();
  
  document.getElementById("competitionPage").style.display = "block";
  document.getElementById("tourListPageHead").style.display = "none";
  document.getElementById("compPageHead").style.display = "block";
  const currentUser= getCurrentUser();
  document.getElementById("usernameText").textContent = currentUser.username;
  await renderCompetitionList();
  
  currentSwapView = 0;
  
  updateSwapView();
}

function removeBackground(file, callback) {
  const img = new Image();
  
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    callback(canvas.toDataURL("image/png"));
  };
  
  img.src = URL.createObjectURL(file);
}



let editingIndex = null;

function openEditTeam(index) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  editingIndex = index;
  const currentName = tournament.teams[index];
  
  document.getElementById("editTitle").textContent = "Edit Team";
  document.getElementById("editNameInput").value = currentName;
  document.getElementById("editLogoInput").value = "";
  
  document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
  editingIndex = null;
  document.getElementById("editModal").classList.remove("show");
  document.getElementById("editNameInput").value = "";
  document.getElementById("editLogoInput").value = "";
  const preview = document.getElementById("logoPreview");
  
  preview.src = "";
  renderTeams("cupTeamsContainer");
  preview.style.display = "none";
}


document.getElementById("editLogoInput").addEventListener("change", function(e) {
  const file = e.target.files[0];
  const preview = document.getElementById("logoPreview");
  
  if (file) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      preview.src = event.target.result;
      preview.style.display = "block";
    };
    
    reader.readAsDataURL(file);
  } else {
    preview.src = "";
    preview.style.display = "none";
  }
});



async function shareTable() {
  const wrapper = document.querySelector('.table-wrapper');
  const wasInScreenshotMode = wrapper.classList.contains('screenshot-mode');
  
  wrapper.classList.add('screenshot-mode');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#161b22',
      scale: 2,
      useCORS: true
    });
    
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'league-table.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'eFootball League Table',
          text: 'League Volume 8',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'league-table.png';
        a.click();
        URL.revokeObjectURL(url);
        showActionModal('Image downloaded! Share it manually.', 'success');
      }
    });
    
  } catch (err) {
    console.error('Share failed:', err);
    showActionModal('Could not capture table', 'delete');
  } finally {
    if (!wasInScreenshotMode) {
      wrapper.classList.remove('screenshot-mode');
    }
  }
}


async function shareCupTable() {
  const wrapper = document.getElementById('cupTables');
  
  if (!wrapper) {
    showActionModal('Screenshot target area not found!', 'delete');
    return;
  }
  
  const wasInScreenshotMode = wrapper.classList.contains('screenshot-mode');
  wrapper.classList.add('screenshot-mode');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#161b22',
      scale: 2,
      useCORS: true
    });
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        showActionModal('Failed to process screenshot image.', 'delete');
        return;
      }
      
      const file = new File([blob], 'match-records.png', {
        type: 'image/png'
      });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'eFootball Match Records',
          text: 'Group Stage Matches',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'match-records.png';
        a.click();
        URL.revokeObjectURL(url);
        
        showActionModal('Image downloaded! Share it manually.', 'success');
      }
    });
    
  } catch (err) {
    console.error('Share failed:', err);
    showActionModal('Could not capture records', 'delete');
  } finally {
    if (!wasInScreenshotMode) {
      wrapper.classList.remove('screenshot-mode');
    }
  }
}


async function shareCupFixture() {
  const wrapper = document.getElementById('cupFixtures');
  
  if (!wrapper) {
    showActionModal('Screenshot target area not found!', 'delete');
    return;
  }
  
  const wasInScreenshotMode = wrapper.classList.contains('screenshot-mode');
  wrapper.classList.add('screenshot-mode');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#161b22',
      scale: 2,
      useCORS: true
    });
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        showActionModal('Failed to process screenshot image.', 'delete');
        return;
      }
      
      const file = new File([blob], 'match-records.png', {
        type: 'image/png'
      });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'eFootball Match Records',
          text: 'Group Stage Matches',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'match-records.png';
        a.click();
        URL.revokeObjectURL(url);
        
        showActionModal('Image downloaded! Share it manually.', 'success');
      }
    });
    
  } catch (err) {
    console.error('Share failed:', err);
    showActionModal('Could not capture records', 'delete');
  } finally {
    if (!wasInScreenshotMode) {
      wrapper.classList.remove('screenshot-mode');
    }
  }
}



const adminTools = [
  
  ".shareBtn",
  ".data-admin"
];


function hideAdminTools() {
  adminTools.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.display = "none";
    });
  });
}

function showAdminTools() {
  adminTools.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.display = "";
    });
  });
}


function setAppMode(mode) {
  
  APP_MODE = mode;
  
  document.querySelectorAll(".data-admin, [data-admin]").forEach(el => {
    el.style.display = APP_MODE === "admin" ? "" : "none";
  });
  
  const root = document.body;
  
  root.classList.remove(
    "admin-mode",
    "player-mode",
    "view-mode"
  );
  
  switch (mode) {
    case "admin":
      root.classList.add("admin-mode");
      showAdminTools();
      break;
      
    case "player":
      root.classList.add("player-mode");
      hideAdminTools();
      break;
      
    default:
      root.classList.add("view-mode");
      hideAdminTools();
      break;
  }
  
  console.log("App mode:", mode);
}
function goToLoginPage() {
  document.getElementById("authPage").style.display = "flex";
  
  showLogin();
  
  clearSession();
}

function showLogin() {
  document.getElementById("loginSection").style.display = "block";
  document.getElementById("registerSection").style.display = "none";
}

function showRegister() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("registerSection").style.display = "block";
}

function showLoader() {
  document.getElementById("loader").style.display = "flex";
}

function showNotification() {
  const panel = document.getElementById("notificationPanel");
  
  panel.style.display =
    panel.style.display === "block" ?
    "none" :
    "block";
}
function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

async function saveTournamentFields(fields) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  Object.assign(tournament, fields);
  
  await updateTournament(tournament.id, {
    updates: fields
  });
  
  const cached = myTournaments.find(t => t.id === tournament.id);
  
  if (cached) {
    Object.assign(cached, fields);
  }
}

let invitationModalOptions = null;

function showInvitationModal(options = {}) {
  invitationModalOptions = options;
  
  const modal = document.getElementById("invitationModal");
  const title = document.getElementById("invitationModalTitle");
  const message = document.getElementById("invitationModalMessage");
  const input = document.getElementById("invitationModalInput");
  const confirmBtn = document.getElementById("invitationModalConfirm");
  const cancelBtn = document.getElementById("invitationModalCancel");
  
  if (!modal) return;
  
  title.textContent = options.title || "";
  
  message.textContent = options.message || "";
  
  confirmBtn.textContent = options.confirmText || "Confirm";
  cancelBtn.textContent = options.cancelText || "Cancel";
  
  if (options.showInput) {
    input.style.display = "";
    input.placeholder = options.placeholder || "";
    input.value = options.value || "";
    
    setTimeout(() => input.focus(), 50);
  } else {
    input.style.display = "none";
    input.value = "";
  }
  
  modal.style.display = "flex";
}

function closeInvitationModal() {
  const modal = document.getElementById("invitationModal");
  const input = document.getElementById("invitationModalInput");
  
  invitationModalOptions = null;
  
  input.value = "";
  
  modal.style.display = "none";
}

document
  .getElementById("invitationModalConfirm")
  .addEventListener("click", async () => {
    if (!invitationModalOptions) return;
    
    const input = document.getElementById("invitationModalInput");
    
    if (typeof invitationModalOptions.onConfirm === "function") {
      if (invitationModalOptions.showInput) {
        await invitationModalOptions.onConfirm(input.value.trim());
      } else {
        await invitationModalOptions.onConfirm();
      }
    }
    
    closeInvitationModal();
  });

document
  .getElementById("invitationModalCancel")
  .addEventListener("click", async () => {
    if (invitationModalOptions?.onCancel) {
      await invitationModalOptions.onCancel();
    }
    
    closeInvitationModal();
  });

function openInvitePlayerModal() {
  showInvitationModal({
    title: "Invite Player",
    message: "Enter the player's username.",
    showInput: true,
    placeholder: "Username",
    confirmText: "Invite",
    cancelText: "Cancel",
    
    onConfirm: async (username) => {
      if (!username) {
        showAlert("Enter a username");
        return;
      }
      
      await invitePlayer(username);
    }
  });
}

function canCurrentPlayerRegisterTeam() {
  const tournament = getCurrentTournament();
  const user = getCurrentUser();
  
  if (!tournament || !user) return false;
  
  if (user.role === "admin") return true;
  
  const player = tournament.players?.[user.uid];
  
  return player?.status === "accepted";
}


function setupAdminResultModal() {
  
  document.getElementById(
    "resultModalTitle"
  ).textContent = "Record Match Result";
  
  document.getElementById(
      "resultModalSubtitle"
    ).textContent =
    "Enter the final score.";
  
  document.getElementById(
    "resultSaveBtn"
  ).textContent = "Save";
  
  document.getElementById(
    "submissionSection"
  ).style.display = "none";
  
}


function setupPlayerResultModal() {
  
  document.getElementById(
    "resultModalTitle"
  ).textContent = "Submit Match Result";
  
  document.getElementById(
      "resultModalSubtitle"
    ).textContent =
    "Enter the score and upload a screenshot for admin approval.";
  
  document.getElementById(
    "resultSaveBtn"
  ).textContent = "Submit";
  
  document.getElementById(
    "submissionSection"
  ).style.display = "block";
  document.getElementById(
    "matchScreenshot"
  ).style.display = "block";
  
  
}

async function handleResultAction() {
  
  if (!currentMatch) {
    return;
  }
  
  if (APP_MODE === "admin") {
    
    return await handleSetScore();
    
  }
  
  return await sendMatchSubmission();
  
}

function fileToBase64(file) {
  
  return new Promise((resolve, reject) => {
    
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = e => {
      img.src = e.target.result;
    };
    
    reader.onerror = reject;
    
    img.onload = () => {
      
      const canvas = document.createElement("canvas");
      
      let width = img.width;
      let height = img.height;
      
      const maxWidth = 1200;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.8;
      let base64 = canvas.toDataURL("image/jpeg", quality);
      
      while (
        base64.length > 500 * 1024 &&
        quality > 0.3
      ) {
        quality -= 0.1;
        base64 = canvas.toDataURL("image/jpeg", quality);
      }
      
      resolve(base64);
    };
    
    img.onerror = reject;
    
    reader.readAsDataURL(file);
    
  });
  
}

function openSubmissionReview(match, submission) {
  
  currentReviewMatch = match;
  currentReviewSubmission = submission;
  
  document.getElementById("reviewModalFixture").textContent =
    `${match.home} vs ${match.away}`;
  
  document.getElementById("reviewModalScore").textContent =
    `${submission.homeGoals} - ${submission.awayGoals}`;
  
  document.getElementById("reviewModalImage").src =
    submission.screenshot;
  
  document.getElementById("reviewModalPlayer").textContent =
    submission.username || submission.submittedBy;
  
  document.getElementById("reviewModalTime").textContent =
    formatRecordedTime(submission.createdAt);
  document.getElementById("reviewModalStatus").textContent =
    submission.status;
  const statusEl = document.getElementById("reviewModalStatus");

statusEl.textContent = submission.status;
statusEl.className = submission.status.toLowerCase();

  document.getElementById("reviewModalReasonRow").style.display = "none";
  document.getElementById("reviewModalRejectInputRow").style.display = "none";
  
  buildReviewActions(match, submission);
  
  document.getElementById("reviewModal").style.display = "flex";
  
}

function closeReviewModal() {
  
  currentReviewMatch = null;
  currentReviewSubmission = null;
  
  document.getElementById("reviewModal").style.display = "none";
  
}

function buildReviewActions(match, submission) {
  
  const actions = document.getElementById("reviewModalActions");
  
  actions.innerHTML = "";
  
  document.getElementById(
    "reviewModalRejectInputRow"
  ).style.display = "none";
  
  document.getElementById(
    "reviewModalReasonRow"
  ).style.display = "none";
  
  if (APP_MODE === "admin") {
    
    if (submission.status !== "pending") {
      
      if (submission.status === "rejected") {
        
        document.getElementById(
          "reviewModalReasonRow"
        ).style.display = "block";
        
        document.getElementById(
            "reviewModalReason"
          ).textContent =
          submission.rejectionReason || "No reason provided.";
        
      }
      
      return;
    }
    
    const approveBtn = document.createElement("button");
    
    approveBtn.className = "btn-save";
    approveBtn.textContent = "✅ Approve";
    approveBtn.onclick = approveSubmission;
    
    const rejectBtn = document.createElement("button");
    
    rejectBtn.className = "btn-clear";
    rejectBtn.textContent = "❌ Reject";
    
    rejectBtn.onclick = () => {
      
      document.getElementById(
        "reviewModalRejectInputRow"
      ).style.display = "block";
      
      rejectBtn.remove();
      
      const confirmBtn = document.createElement("button");
      
      confirmBtn.className = "btn-clear";
      confirmBtn.textContent = "Confirm Reject";
      confirmBtn.onclick = rejectSubmission;
      
      actions.appendChild(confirmBtn);
      
    };
    
    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
    
    return;
    
  }
  
  if (submission.status === "pending") {
    return;
  }
  
  if (submission.status === "approved") {
    return;
  }
  
  document.getElementById(
    "reviewModalReasonRow"
  ).style.display = "block";
  
  document.getElementById(
      "reviewModalReason"
    ).textContent =
    submission.rejectionReason || "No reason provided.";
  
  const resubmitBtn = document.createElement("button");
  
  resubmitBtn.className = "btn-resubmit";
  resubmitBtn.textContent = "Resubmit";
  
  resubmitBtn.onclick = () => {
    
    closeReviewModal();
    openLeagueRecorder(match);
    
  };
  
  actions.appendChild(resubmitBtn);
  
}

function startLoadRegulator(
  retryCallback,
  timeout = 15000
) {
  
  clearTimeout(loadTimeout);
  
  loadTimeout = setTimeout(() => {
    
    stopLoader();
    
    showConfirmModal(
      "Network is taking too long. Try again?",
      "Retry",
      "Cancel"
    );
    
    confirmYes = () => {
      
      retryCallback();
    };
    
    confirmNo = () => {};
    
  }, timeout);
}

function closeTournamentEvents() {
  
  if (tournamentEvents) {
    tournamentEvents.close();
    tournamentEvents = null;
  }
  
}

function openCreateCompetitionModal() {
  document.getElementById("competitionLogoInput").style.display = "block";
  document
    .getElementById("createCompetitionModal")
    .style.display="block";
}
function closeCreateCompetitionModal() {
  document
    .getElementById("createCompetitionModal")
    .style.display="none";
  
}

document
  .getElementById("competitionLogoInput")
  ?.addEventListener("change", function() {
    
    const file = this.files[0];
    
    if (!file) return;
    
    
    const reader = new FileReader();
    
    
    reader.onload = function(e) {
      
      document
        .getElementById("competitionLogoPreview")
        .src = e.target.result;
      
    };
    
    
    reader.readAsDataURL(file);
    
  });
  
  function openDeleteAccountModal(isManagement = false) {
  
  const modal = document.getElementById(
    "deleteAccountModal"
  );
  
  if (!modal) return;
  
  
  const managementSection =
    modal.querySelector(
      ".management-delete-section"
    );
  
  
  if (managementSection) {
    
    managementSection.style.display =
      isManagement ? "block" : "none";
    
  }
  
  
  modal.style.display = "flex";
  
}


function closeDeleteAccountModal() {
  
  const modal = document.getElementById(
    "deleteAccountModal"
  );
  
  if (!modal) return;
  
  
  modal.style.display = "none";
  
  
  document.getElementById(
    "deletePasswordInput"
  ).value = "";
  
  
  document.getElementById(
    "managementCodeInput"
  ).value = "";
  
}


