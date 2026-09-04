const LOGO_DB_NAME = "TournamentLogosDB";
const LOGO_STORE = "logos";

async function renderFixtures() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const container =
    document.getElementById(
      "fixtureList"
    );
  
  if (!container) return;
  
  const search =
    document.getElementById(
      "fixtureSearchInput"
    )?.value
    .toLowerCase()
    .trim() || "";
  
  try {
    showLoader();
    
    await loadTournamentFixtures(
      tournament.id
    );
    
    toggleRoundCarousel(
      search
    );
    
    const visibleMatches =
      getVisibleMatches(
        search
      );
    
    container.innerHTML = "";
    
    if (!visibleMatches.length) {
      renderEmptyFixtures(
        container,
        search
      );
      
      renderRoundList();
      
      return;
    }
    
    let lastRound = null;
    
    visibleMatches.forEach(
      match => {
        const round =
          Number(match.round) || 1;
        
        if (round !== lastRound) {
          lastRound = round;
          
          container.appendChild(
            createRoundHeader(
              round
            )
          );
        }
        
        container.appendChild(
          createFixtureCard(
            tournament,
            match
          )
        );
      }
    );
    
    renderRoundList();
    
  } catch (err) {
    console.error(
      "[renderFixtures]",
      err
    );
    
    container.innerHTML = "";
    
    renderEmptyFixtures(
      container,
      false
    );
    
    showAlert(
      err.message ||
      "Failed to load fixtures."
    );
    
  } finally {
    hideLoader();
  }
}

function getVisibleMatches(search = "") {
  const matches =
    Array.isArray(fixtures) ? [...fixtures] : [];
  
  if (search) {
    return matches.filter(
      match =>
      (match.home || "")
      .toLowerCase()
      .includes(search) ||
      (match.away || "")
      .toLowerCase()
      .includes(search)
    );
  }
  
  const currentRound =
    getCurrentRound();
  
  return matches.filter(
    match =>
    Number(match.round) ===
    currentRound
  );
}

function getSubmission(match, tournament) {
  return Object.values(
    tournament.matchSubmissions || {}
  ).find(
    s => String(s.matchId) === String(match.id)
  );
}

function replaceTeamLogo(container, selector, logoUrl, teamName) {
  if (!logoUrl) return;
  
  const teamEl = container.querySelector(selector);
  const placeholder = teamEl?.querySelector(".fixture-team-logo-placeholder");
  
  if (!teamEl || !placeholder) return;
  
  const img = document.createElement("img");
  img.className = "fixture-team-logo";
  img.src = logoUrl;
  img.alt = teamName;
  
  teamEl.replaceChild(img, placeholder);
}

function replaceTeamLogo(container, selector, logoUrl, teamName, fallbackUrl = "") {
  // Extract URL string if logoUrl was passed as an object
  if (typeof logoUrl === "object" && logoUrl !== null) {
    logoUrl = logoUrl.url || logoUrl.src || logoUrl.href || "";
  }
  
  // Guard against non-string or empty values
  if (typeof logoUrl !== "string" || !logoUrl.trim()) {
    console.warn(`[replaceTeamLogo] Invalid logoUrl provided for ${teamName}:`, logoUrl);
    return;
  }
  
  const teamEl = container.querySelector(selector);
  const placeholder = teamEl?.querySelector(".fixture-team-logo-placeholder");
  if (!teamEl || !placeholder) return;
  
  const img = document.createElement("img");
  img.className = "fixture-team-logo";
  img.src = logoUrl;
  img.alt = teamName || "";
  
  // Handle broken/invalid image URLs
  img.onerror = () => {
    console.error(`Failed to load image at: ${logoUrl}`);
    if (fallbackUrl) {
      img.onerror = null; // Prevent infinite loop if fallback fails
      img.src = fallbackUrl;
    }
  };
  
  teamEl.replaceChild(img, placeholder);
}

function onFixtureClick(match, submission) {
  
  if (APP_MODE === "view") return;
  
  if (APP_MODE === "admin") {
    
    if (submission) {
      return openSubmissionReview(match, submission);
    }
    
    return openLeagueRecorder(match);
  }
  
  if (APP_MODE === "player") {
    
    if (submission) {
      return openSubmissionReview(match, submission);
    }
    
    return openLeagueRecorder(match);
  }
  
}

function toggleRoundCarousel(searchQuery) {
  const roundCarousel = document.getElementById("roundCarousel");
  if (!roundCarousel) return;
  
  roundCarousel.style.display = searchQuery ? "none" : "";
}

function createRoundHeader(round) {
  const header = document.createElement("div");
  
  header.className = "round-header";
  header.textContent = `Round ${round}`;
  
  return header;
}

function getSubmissionBadge(match, submission) {
  
  if (!submission) return "";
  
  const status = submission.status?.toLowerCase();
  
  if (status === "approved") {
    return "";
  }
  
  return `
    <span class="submission-badge ${status}">
      ${status}
    </span>
  `;
}

function getSubmission(match, tournament) {
  return Object.values(
    tournament.matchSubmissions || {}
  ).find(
    s => String(s.matchId) === String(match.id)
  );
}

function replaceTeamLogo(
  container,
  selector,
  logoUrl,
  teamName,
  fallbackUrl = ""
) {
  if (
    typeof logoUrl === "object" &&
    logoUrl !== null
  ) {
    logoUrl =
      logoUrl.url ||
      logoUrl.src ||
      logoUrl.href ||
      "";
  }
  if (
    typeof logoUrl !== "string" ||
    !logoUrl.trim()
  ) {
    return;
  }
  const teamEl =
    container.querySelector(selector);
  const placeholder =
    teamEl?.querySelector(
      ".fixture-team-logo-placeholder"
    );
  if (!teamEl || !placeholder) {
    return;
  }
  const img =
    document.createElement("img");
  img.className =
    "fixture-team-logo";
  img.src = logoUrl;
  img.alt =
    teamName || "";
  img.onerror = () => {
    if (fallbackUrl) {
      img.onerror = null;
      img.src = fallbackUrl;
    } else {
      img.remove();
    }
  };
  teamEl.replaceChild(
    img,
    placeholder
  );
}

function onFixtureClick(
  match,
  submission
) {
  if (APP_MODE === "view") {
    return;
  }
  if (APP_MODE === "admin") {
    if (submission) {
      return openSubmissionReview(
        match,
        submission
      );
    }
    return openLeagueRecorder(match);
  }
  if (APP_MODE === "player") {
    if (submission) {
      return openSubmissionReview(
        match,
        submission
      );
    }
    return openLeagueRecorder(match);
  }
}

function getSubmissionBadge(
  match,
  submission
) {
  if (!submission) {
    return "";
  }
  const status =
    submission.status?.toLowerCase();
  if (status === "approved") {
    return "";
  }
  return `
    <span class="submission-badge ${status}">
      ${status}
    </span>
  `;
}


function renderEmptyFixtures(
  container,
  search
) {
  let message = "";
  if (search) {
    message =
      "No fixtures match your search.";
  } else if (
    APP_MODE === "admin"
  ) {
    message =
      "No fixtures yet. <br>Generate fixtures to begin.";
  } else if (
    APP_MODE === "player"
  ) {
    message =
      "No fixtures available yet. <br>Fixtures will appear here as soon as they are created";
  } else {
    message =
      "No fixtures available.";
  }
  container.innerHTML = `
    <div class="emptyText">
      ${message}
    </div>
  `;
}

function formatMatchDay(
  value
) {
  if (!value) {
    return "Vs";
  }
  const date =
    new Date(value);
  if (
    isNaN(date.getTime())
  ) {
    return "";
  }
  const weekday =
    date.toLocaleDateString(
      "en-GB",
      {
        weekday: "short"
      }
    );
  const day =
    date.getDate();
  const monthYear =
    date
    .toLocaleDateString(
      "en-GB",
      {
        month: "long",
        year: "numeric"
      }
    )
    .replace(
      " ",
      ", "
    );
  return `${weekday} ${day}<br>${monthYear}`;
}

function formatRecordedTime(
  value
) {
  if (!value) {
    return "";
  }
  const date =
    new Date(value);
  if (
    isNaN(date.getTime())
  ) {
    return "";
  }
  const day =
    date.getDate();
  const month =
    date.toLocaleDateString(
      "en-GB",
      {
        month: "short"
      }
    );
  const year =
    date.getFullYear();
  return `${day} ${month}, ${year}`;
}

function renderEmptyFixtures(container, search) {
  
  let message = "";
  
  if (search) {
    message = "No fixtures match your search.";
  }
  else if (APP_MODE === "admin") {
    message = "No fixtures yet. <br>Generate fixtures to begin.";
  }
  else if (APP_MODE === "player") {
    message = "No fixtures available yet. <br> Fixtures will appear here as soon as they are created";
  }
  
  container.innerHTML = `
    <div class="emptyText">
      ${message}
    </div>
  `;
}

function formatMatchDay(value) {
  if (!value) return "Vs";
  
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" }); // Mon
  const day = date.getDate(); // 13
  
  const monthYear = date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  }).replace(" ", ", ");
  return `${weekday} ${day}<br>${monthYear}`;
}


function formatRecordedTime(value) {
  if (!value) return "";
  
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  const year = date.getFullYear();
  
  return `${day} ${month}, ${year}`;
}


function setCurrentRound(round) {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const maxRound =
    getMaxRound();
  
  const newRound =
    Math.max(
      1,
      Math.min(
        Number(round) || 1,
        maxRound
      )
    );
  
  localStorage.setItem(
    `currentRound_${tournament.id}`,
    String(newRound)
  );
}

function getCurrentRound() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return 1;
  
  const savedRound =
    localStorage.getItem(
      `currentRound_${tournament.id}`
    );
  
  const round =
    Number(savedRound);
  
  const maxRound =
    getMaxRound();
  
  if (
    !Number.isFinite(round) ||
    round < 1
  ) {
    return 1;
  }
  
  return Math.min(
    round,
    maxRound
  );
}
async function prevRound() {
  const current =
    getCurrentRound();
  
  if (current <= 1) {
    return;
  }
  
  setCurrentRound(
    current - 1
  );
  
  await renderFixtures();
}
async function nextRound() {
  const current =
    getCurrentRound();
  
  const max =
    getMaxRound();
  
  if (current >= max) {
    return;
  }
  
  setCurrentRound(
    current + 1
  );
  
  await renderFixtures();
}


function deleteTeam(index) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  if (!Array.isArray(tournament.teams)) tournament.teams = [];
  if (!Array.isArray(tournament.table)) tournament.table = [];
  if (!Array.isArray(tournament.matches)) tournament.matches = [];
  if (!tournament.teamLogos) tournament.teamLogos = {};
  
  const teamName = tournament.teams[index];
  if (!teamName) return;
  
  showConfirmModal(
    `Delete ${teamName}?`,
    (isConfirmed) => {
      if (!isConfirmed) return;
      
      tournament.teams.splice(index, 1);
      tournament.table = tournament.table.filter(
        t => t.name !== teamName
      );
      tournament.matches = tournament.matches.filter(
        m => m.home !== teamName && m.away !== teamName
      );
      
      delete tournament.teamLogos[teamName];
      
      showLoader();
      
      updateTournament(tournament.id, {
          updates: {
            teams: tournament.teams,
            table: tournament.table,
            matches: tournament.matches,
            teamLogos: tournament.teamLogos
          }
        })
        .then(() => {
          const cached = myTournaments.find(
            t => String(t.id) === String(tournament.id)
          );
          
          if (cached) {
            cached.teams = [...tournament.teams];
            cached.table = [...tournament.table];
            cached.matches = [...tournament.matches];
            cached.teamLogos = { ...tournament.teamLogos };
          }
          
          renderTeams();
          renderTeams("cupTeamsContainer");
          renderTable(getSortedTable(tournament.table));
          renderFixtures();
          
          showActionModal("❌ Team Deleted", "delete");
        })
        .catch(err => {
          console.error(err);
          showActionModal("Failed to delete team", "error");
        })
        .finally(() => {
          hideLoader();
        });
    }
  );
}


function openLogoDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LOGO_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOGO_STORE)) {
        db.createObjectStore(LOGO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function saveLogoToIndexedDB(key, base64Data) {
  return openLogoDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LOGO_STORE, "readwrite");
      tx.objectStore(LOGO_STORE).put(base64Data, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  });
}




function renderKnockoutFixtures(roundIndex = 1) {
  currentKnockoutRoundIndex = roundIndex;
  
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.knockoutMatches) return;
  
  const container =
    document.getElementById("knockOutFixtureList");
  
  if (!container) return;
  
  container.innerHTML = "";
  
  const matches =
    tournament.knockoutMatches.filter(
      m =>
      Number(m.roundIndex || 1) ===
      Number(roundIndex)
    );
  
  if (!matches.length) {
    container.innerHTML = `
      <p class="emptyText">
        Group stage in progress.....<br>
        Knockout Matches will appear here as soon as group stage is completed
      </p>
    `;
    
    return;
  }
  
  const roundSize =
    tournament.settings.knockoutSize /
    Math.pow(2, roundIndex - 1);
  
  const roundName =
    roundSize === 8 ?
    "Quarter-Finals" :
    roundSize === 4 ?
    "Semi-Finals" :
    roundSize === 2 ?
    "Final" :
    `Round of ${roundSize}`;
  
  const roundLabel =
    document.getElementById("roundLabel");
  
  if (roundLabel) {
    roundLabel.innerText = roundName;
  }
  
  const header =
    document.createElement("div");
  
  header.className =
    "round-header";
  
  header.innerText =
    roundName;
  
  container.appendChild(header);
  
  matches.forEach(match => {
    const homeName =
      getBracketTeamName(match.home);
    
    const awayName =
      getBracketTeamName(match.away);
    
    const div =
      document.createElement("div");
    
    div.className =
      `fixture-row ${
        match.played
          ? "played"
          : "not-played"
      }`;
    
    div.innerHTML = `
      <div class="fixture-label">
        ${tournament.name || "Tournament"} • ${roundName}
      </div>

      <div class="fixture-row-content">

        <div class="fixture-teams-stack">

          <div class="team-row-item team-home-container">
            <div class="fixture-team-logo-placeholder">
              ?
            </div>

            <span class="fixture-team-name">
              ${homeName}
            </span>
          </div>

          <div class="team-row-item team-away-container">
            <div class="fixture-team-logo-placeholder">
              ?
            </div>

            <span class="fixture-team-name">
              ${awayName}
            </span>
          </div>

        </div>

        <div class="fixture-status-pane">

          ${
            match.played
              ? `
                <div class="score-stack">
                  <span class="score-badge played">
                    ${match.homeGoals}
                  </span>

                  <span class="ft-badge">
                    Full Time
                  </span>

                  <span class="score-badge played">
                    ${match.awayGoals}
                  </span>
                </div>
              `
              : `
                <span class="vs-text-alt">
                  ${
                    match.scheduledAt
                      ? formatMatchDay(
                          match.scheduledAt
                        )
                      : "Vs"
                  }
                </span>
              `
          }

        </div>

      </div>

      ${
        match.played
          ? `
            <div class="match-playedTime">
              ${formatRecordedTime(
                match.playedAt
              )}
            </div>
          `
          : ""
      }
    `;
    
    attachKnockoutFixtureLogo(
      div,
      tournament,
      homeName,
      ".team-home-container"
    );
    
    attachKnockoutFixtureLogo(
      div,
      tournament,
      awayName,
      ".team-away-container"
    );
    
    div.style.cursor =
      "pointer";
    
    div.addEventListener(
      "click",
      () => {
        openLeagueRecorder(
          match
        );
      }
    );
    
    container.appendChild(div);
  });
}

function attachKnockoutFixtureLogo(
  fixture,
  tournament,
  teamName,
  selector
) {
  if (
    !teamName ||
    teamName === "Awaiting Winner" ||
    teamName === "TBD"
  ) {
    return;
  }
  
  const logoUrl =
    getTeamLogo(
      tournament,
      teamName
    );
  
  if (!logoUrl) {
    return;
  }
  
  const teamRow =
    fixture.querySelector(
      selector
    );
  
  const placeholder =
    teamRow?.querySelector(
      ".fixture-team-logo-placeholder"
    );
  
  if (!teamRow || !placeholder) {
    return;
  }
  
  const img =
    document.createElement("img");
  
  img.className =
    "fixture-team-logo";
  
  img.src =
    logoUrl;
  
  img.alt =
    `${teamName} logo`;
  
  img.onerror = () => {
    img.remove();
  };
  
  teamRow.replaceChild(
    img,
    placeholder
  );
}


function toggleBracketMode(mode) {
  document
    .querySelectorAll(".bracketTopActions .bracket-tab")
    .forEach(btn => btn.classList.remove("active"));
  
  const bracketView = document.getElementById("bracketViewport");
  const fixturesView = document.getElementById("bracketFixturesView");
  
  if (mode === "bracket") {
    bracketView.style.display = "block";
    fixturesView.style.display = "none";
    
    renderFullBracket();
    
    const tabs = document.querySelectorAll(".bracketTopActions .bracket-tab");
    if (tabs[1]) tabs[1].classList.add("active");
  }
  
  else {
    bracketView.style.display = "none";
    fixturesView.style.display = "block";
    
    renderKnockoutFixtures();
    
    const tabs = document.querySelectorAll(".bracketTopActions .bracket-tab");
    if (tabs[0]) tabs[0].classList.add("active");
  }
}


function enableKnockoutSwipe() {
  const container = document.getElementById("knockOutFixtureList");
  if (!container) return;
  
  let startX = 0;
  let endX = 0;
  
  container.addEventListener("touchstart", e => {
    startX = e.changedTouches[0].screenX;
  });
  
  container.addEventListener("touchend", e => {
    endX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    const diff = startX - endX;
    const threshold = 50;
    
    const tournament = getCurrentTournament();
    const maxRounds = Math.max(
      ...tournament.knockoutMatches.map(m => m.roundIndex || 1)
    );
    
    
    if (diff > threshold && currentKnockoutRoundIndex < maxRounds) {
      renderKnockoutFixtures(currentKnockoutRoundIndex + 1);
    }
    
    
    if (diff < -threshold && currentKnockoutRoundIndex > 1) {
      renderKnockoutFixtures(currentKnockoutRoundIndex - 1);
    }
  }
}


function shareKnockoutFixtures() {
  closeMenu();
  const element = document.getElementById('knockOutFixtureList');
  const titleText = document.getElementById('roundLabel')?.textContent || 'Knockout Fixtures';
  const fileName = titleText.replace(/\s/g, '-');
  
  if (!element) {
    showAlert('Knockout fixture list not found!');
    return;
  }
  
  const options = {
    backgroundColor: '#0d1117',
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 0,
    scale: Math.min(4, window.devicePixelRatio * 2),
    width: element.scrollWidth,
    height: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    
    onclone: (doc) => {
      const cloned = doc.getElementById('knockOutFixtureList');
      if (cloned) {
        cloned.style.background = '#0d1117';
        cloned.style.overflow = 'visible';
        cloned.style.height = 'auto';
        cloned.style.width = '100%';
        
        cloned.querySelectorAll('*').forEach(el => {
          el.style.webkitFontSmoothing = 'antialiased';
          el.style.textRendering = 'geometricPrecision';
        });
      }
    }
  };
  
  html2canvas(element, options).then(canvas => {
    canvas.toBlob(blob => {
      if (!blob) {
        show('Failed to process screenshot image.');
        return;
      }
      
      const file = new File(
        [blob],
        `knockout-${fileName}.png`, { type: 'image/png' }
      );
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: titleText,
          text: `Check out the latest ${titleText}!`
        }).catch(err => console.log('Share dismissed', err));
      } else {
        const link = document.createElement('a');
        link.download = `knockout-${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
  }).catch(err => {
    console.error(err);
    showAlert('Could not take screenshot');
  });
}




function populateTournamentMapping() {
  const tournaments = getTournaments();
  
  const selects = {
    league: document.getElementById("mapLeague"),
    ucl: document.getElementById("mapUCL"),
    uel: document.getElementById("mapUEL"),
    cup: document.getElementById("mapCup"),
    super: document.getElementById("mapSuper")
  };
  
  
  Object.values(selects).forEach(select => {
    if (!select) return;
    select.innerHTML = `<option value="">-- Select Tournament --</option>`;
  });
  
  tournaments.forEach(t => {
    const format = (t.format || "").toLowerCase();
    
    const optionHTML = `<option value="${t.id}">${t.name}</option>`;
    
    
    if (format === "league") {
      selects.league?.insertAdjacentHTML("beforeend", optionHTML);
    }
    
    
    else {
      selects.ucl?.insertAdjacentHTML("beforeend", optionHTML);
      selects.uel?.insertAdjacentHTML("beforeend", optionHTML);
      selects.cup?.insertAdjacentHTML("beforeend", optionHTML);
      selects.super?.insertAdjacentHTML("beforeend", optionHTML);
    }
  });
}



function setActiveTourPageButton(activeBtnId) {
  document.getElementById("showTournamentsBtn")?.classList.remove("active");
  document.getElementById("showPOTSBtn")?.classList.remove("active");
  
  document.getElementById(activeBtnId)?.classList.add("active");
}



function savePOTConfig() {
  const config = {
    league: document.getElementById("mapLeague")?.value || "",
    ucl: document.getElementById("mapUCL")?.value || "",
    uel: document.getElementById("mapUEL")?.value || "",
    cup: document.getElementById("mapCup")?.value || "",
    super: document.getElementById("mapSuper")?.value || "",
    lastUpdated: Date.now()
  };
  
  localStorage.setItem("posConfig", JSON.stringify(config));
  
  console.log("✅ POTS config saved:", config);
}


function setupPOTListeners() {
  const ids = ["mapLeague", "mapUCL", "mapUEL", "mapCup", "mapSuper"];
  
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.addEventListener("change", () => {
      savePOTConfig();
      calculatePOT();
      refreshPOTMapping();
    });
  });
}


function loadPOTConfig() {
  const config = JSON.parse(localStorage.getItem("posConfig")) || {};
  
  document.getElementById("mapLeague").value = config.league || "";
  document.getElementById("mapUCL").value = config.ucl || "";
  document.getElementById("mapUEL").value = config.uel || "";
  document.getElementById("mapCup").value = config.cup || "";
  document.getElementById("mapSuper").value = config.super || "";
}



function refreshPOTMapping() {
  const oldConfig = JSON.parse(localStorage.getItem("posConfig")) || {};
  
  populateTournamentMapping();
  
  
  document.getElementById("mapLeague").value = oldConfig.league || "";
  document.getElementById("mapUCL").value = oldConfig.ucl || "";
  document.getElementById("mapUEL").value = oldConfig.uel || "";
  document.getElementById("mapCup").value = oldConfig.cup || "";
  document.getElementById("mapSuper").value = oldConfig.super || "";
}



function calculatePOT() {
  
  const config = JSON.parse(localStorage.getItem("posConfig") || "{}");
  
  const league = getTournamentFromMemory(config.league);
  const ucl = getTournamentFromMemory(config.ucl);
  const uel = getTournamentFromMemory(config.uel);
  const cup = getTournamentFromMemory(config.cup);
  const superCup = getTournamentFromMemory(config.super);
  
  if (!league) {
    document.querySelector("#posTable tbody").innerHTML = `
      <tr>
        <td colspan="10">Select a league tournament</td>
      </tr>
    `;
    return;
  }
  
  
  const teams = {};
  
  
  
  buildLeagueData(teams, league);
  
  
  
  addCompetitionData(teams, ucl, "ucl");
  addCompetitionData(teams, uel, "uel");
  addCompetitionData(teams, cup, "cup");
  addCompetitionData(teams, superCup, "super");
  
  
  const ranking = Object.values(teams);
  
  
  calculatePOTBonuses(ranking);
  
  
  ranking.forEach(team => {
    
    team.total =
      team.leaguePoints +
      team.uclPoints +
      team.uelPoints +
      team.cupPoints +
      team.superPoints +
      team.attackPoints +
      team.topScorerPoints +
      team.defensePoints;
    
  });
  
  
  ranking.sort((a, b) => b.total - a.total);
  
  
  renderPOTTable(ranking);
  
}


function getLeaguePoints(position) {
  
  const points = {
    1: 75,
    2: 65,
    3: 55,
    4: 45,
    5: 35,
    6: 25,
    7: 15,
    8: 10
  };
  
  return points[position] || 5;
  
}



function buildLeagueData(store, tournament) {
  
  if (!Array.isArray(tournament.table)) return;
  
  
  
  const sortedTable = [...tournament.table].sort((a, b) => {
    
    if (b.pts !== a.pts) {
      return b.pts - a.pts;
    }
    
    return b.gd - a.gd;
    
  });
  
  
  sortedTable.forEach((team, index) => {
    
    const position = index + 1;
    
    
    store[team.name] = {
      
      name: team.name,
      
      position: position,
      
      gf: team.gf || 0,
      ga: team.ga || 0,
      played: team.played || 0,
      
      
      leaguePoints: getLeaguePoints(position),
      
      
      uclPoints: 0,
      uelPoints: 0,
      cupPoints: 0,
      superPoints: 0,
      
      attackPoints: 0,
      topScorerPoints: 0,
      defensePoints: 0
    };
    
  });
  
}




function calculatePOTBonuses(teams) {
  
  teams.forEach(team => {
    
    const gpg = team.played ?
      team.gf / team.played :
      0;
    
    team.attackPoints = Math.min(Math.round(gpg), 10);
    
    team.topScorerPoints = 0;
    team.defensePoints = 0;
    
  });
  
  const scorers = [...teams]
    .sort((a, b) => b.gf - a.gf);
  
  if (scorers[0]) scorers[0].topScorerPoints = 20;
  if (scorers[1]) scorers[1].topScorerPoints = 15;
  if (scorers[2]) scorers[2].topScorerPoints = 10;
  
  const defense = [...teams]
    .sort((a, b) => a.ga - b.ga);
  
  if (defense[0]) defense[0].defensePoints = 20;
  if (defense[1]) defense[1].defensePoints = 15;
  if (defense[2]) defense[2].defensePoints = 10;
  
}


function renderPOTTable(teams) {
  
  const tbody = document.querySelector("#posTable tbody");
  
  if (!tbody) return;
  
  tbody.innerHTML = teams.map((team, index) => {
    
    return `
      <tr>
        <td>${index + 1}</td>

        <td>
          <strong>${team.name}</strong>
        </td>

        <td>${team.leaguePoints}</td>

        <td>${team.uclPoints}</td>

        <td>${team.uelPoints}</td>

        <td>${team.cupPoints}</td>

        <td>${team.superPoints}</td>

        <td>${team.attackPoints}</td>

        <td>${team.topScorerPoints}</td>

        <td>${team.defensePoints}</td>

        <td>
          <strong>${team.total}</strong>
        </td>

      </tr>
    `;
    
  }).join("");
  
}



function addCompetitionData(store, tournament, type) {
  
  if (!tournament || !tournament.knockoutMatches) return;
  
  
  const matches = tournament.knockoutMatches;
  
  
  const getName = (team) => {
    
    if (!team) return null;
    
    if (typeof team === "string") {
      return team;
    }
    
    return team.name || null;
    
  };
  
  
  let points;
  
  
  if (type === "ucl") {
    points = {
      winner: 55,
      runner: 35,
      semi: 20,
      quarter: 8
    };
  }
  
  
  else if (type === "uel") {
    points = {
      winner: 35,
      runner: 22,
      semi: 12,
      quarter: 5
    };
  }
  
  
  else if (type === "cup") {
    points = {
      winner: 18,
      runner: 10,
      semi: 5,
      quarter: 0
    };
  }
  
  
  else if (type === "super") {
    points = {
      winner: 8,
      runner: 4,
      semi: 0,
      quarter: 0
    };
  }
  
  
  
  const rounds = {};
  
  
  matches.forEach(match => {
    
    if (!rounds[match.roundIndex]) {
      rounds[match.roundIndex] = [];
    }
    
    rounds[match.roundIndex].push(match);
    
  });
  
  
  
  const finalRound =
    Math.max(...Object.keys(rounds));
  
  
  const finalMatches =
    rounds[finalRound] || [];
  
  
  
  // 🏆 Winner + Runner up
  
  const final = finalMatches[0];
  
  
  if (final && final.played) {
    
    const winner =
      final.homeGoals > final.awayGoals ?
      getName(final.home) :
      getName(final.away);
    
    
    const runner =
      final.homeGoals > final.awayGoals ?
      getName(final.away) :
      getName(final.home);
    
    
    
    if (store[winner]) {
      
      store[winner][type + "Points"] =
        points.winner;
      
    }
    
    
    if (store[runner]) {
      
      store[runner][type + "Points"] =
        points.runner;
      
    }
    
  }
  
  
  
  
  
  Object.keys(rounds).forEach(round => {
    
    
    const size =
      rounds[round].length * 2;
    
    
    
    let bonus = 0;
    
    
    if (size === 4) {
      bonus = points.semi;
    }
    
    
    if (size === 8) {
      bonus = points.quarter;
    }
    
    
    
    rounds[round].forEach(match => {
      
      
      if (!match.played) return;
      
      
      const teams = [
        getName(match.home),
        getName(match.away)
      ];
      
      
      
      teams.forEach(team => {
        
        
        if (!store[team]) return;
        
        
        
        
        if (store[team][type + "Points"] === 0) {
          
          store[team][type + "Points"] = bonus;
          
        }
        
      });
      
      
    });
    
    
  });
  
  
}


async function sharePOTSTable() {
  const wrapper = document.querySelector('.pos-table-container');
  const table = wrapper.querySelector('table');
  
  const prev = {
    overflow: wrapper.style.overflow,
    width: wrapper.style.width,
    maxWidth: wrapper.style.maxWidth,
    tableWidth: table.style.width
  };
  
  wrapper.classList.add('screenshot-mode');
  
  wrapper.style.overflow = 'visible';
  wrapper.style.width = 'max-content';
  wrapper.style.maxWidth = 'none';
  table.style.width = 'max-content';
  
  await new Promise(r => setTimeout(r, 150));
  
  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#161b22',
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: wrapper.scrollWidth
    });
    
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'rankings.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Player of the Season Rankings',
          text: 'Player Of The Season Ranking',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rankings.png';
        a.click();
        URL.revokeObjectURL(url);
        showActionModal('Image downloaded! Share it manually.', 'success');
      }
    });
    
  } catch (err) {
    console.error(err);
    showActionModal('Could not capture table', 'delete');
  } finally {
    wrapper.classList.remove('screenshot-mode');
    
    wrapper.style.overflow = prev.overflow;
    wrapper.style.width = prev.width;
    wrapper.style.maxWidth = prev.maxWidth;
    table.style.width = prev.tableWidth;
  }
}


function renderTable(data) {
  const tbody =
    document.getElementById("tableBody");
  
  if (!tbody) {
    return;
  }
  
  tbody.innerHTML = "";
  
  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;">
          No table data
        </td>
      </tr>
    `;
    
    return;
  }
  
  data.forEach((team, index) => {
    const tr =
      document.createElement("tr");
    
    tr.setAttribute(
      "data-row-index",
      index
    );
    
    const played =
      Number(team.played) || 0;
    
    const wins =
      Number(team.wins) || 0;
    
    const draws =
      Number(team.draws) || 0;
    
    const losses =
      Number(team.losses) || 0;
    
    const gf =
      Number(team.gf) || 0;
    
    const ga =
      Number(team.ga) || 0;
    
    const gd =
      team.gd !== undefined &&
      team.gd !== null ?
      Number(team.gd) || 0 :
      gf - ga;
    
    const pts =
      team.pts !== undefined &&
      team.pts !== null ?
      Number(team.pts) || 0 :
      Number(team.points) || 0;
    
    const gdClass =
      gd < 0 ? "neg" : "";
    
    const indicator =
      typeof getChangeIndicator ===
      "function" ?
      getChangeIndicator(
        team.change
      ) :
      "";
    
    tr.innerHTML = `
      <td>
        <div class="rank-cell">
          <span class="rank-num">
            ${index + 1}
          </span>
          ${indicator}
        </div>
      </td>

      <td>
        <div class="table-team-cell">
          <div class="team-logo-placeholder">
            ?
          </div>

          <strong class="team-name"></strong>
        </div>
      </td>

      <td>${played}</td>
      <td>${wins}</td>
      <td>${draws}</td>
      <td>${losses}</td>
      <td>${gf}</td>
      <td>${ga}</td>

      <td class="${gdClass}">
        ${gd >= 0 ? "+" + gd : gd}
      </td>

      <td>
        <strong>
          ${pts}
        </strong>
      </td>
    `;
    
    const teamName =
      tr.querySelector(
        ".team-name"
      );
    
    if (teamName) {
      teamName.textContent =
        team.name || "";
    }
    
    if (team.logo) {
      const teamCell =
        tr.querySelector(
          ".table-team-cell"
        );
      
      const placeholder =
        teamCell?.querySelector(
          ".team-logo-placeholder"
        );
      
      if (
        teamCell &&
        placeholder
      ) {
        const img =
          document.createElement("img");
        
        img.className =
          "table-team-logo";
        
        img.src =
          team.logo;
        
        img.alt =
          team.name || "Logo";
        
        img.onerror = () => {
          img.replaceWith(
            placeholder
          );
        };
        
        teamCell.replaceChild(
          img,
          placeholder
        );
      }
    }
    
    tbody.appendChild(tr);
  });
}

function getChangeIndicator(change) {
  if (change === 'up') {
    return `<span class="pos-change up" title="Moved up">&#9650;</span>`;
  } else if (change === 'down') {
    return `<span class="pos-change down" title="Moved down">&#9660;</span>`;
  }
  return `<span class="pos-change same" title="No change"></span>`;
}

function getTeamLogo(tournament, teamName) {
  if (!tournament || !teamName) return null;
  
  const logo = tournament.teamLogos?.[teamName];
  
  if (!logo) return null;
  
  
  if (typeof logo === "string") return logo;
  
  
  if (typeof logo === "object" && logo.url) {
    return logo.url;
  }
  
  return null;
}


function recordMatchResult(matchId, homeGoals, awayGoals) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  
  const currentRanks = {};
  if (Array.isArray(tournament.table)) {
    tournament.table.forEach((team, index) => {
      currentRanks[team.name] = index;
    });
  }
  
  tournament.prevRanks = currentRanks;
  
  const match = tournament.matches.find(m => String(m.id) === String(matchId));
  if (match) {
    match.played = true;
    match.homeGoals = Number(homeGoals);
    match.awayGoals = Number(awayGoals);
  }
  
  updateTournament(tournament);
  
  
  rebuildTableFromMatches();
}



function toggleDropdown() {
  document.getElementById("dropdownMenu").classList.toggle("show");
}

function handleMenuClick(value) {
  
  if (value === "fullview") toggleScreenshotMode();
  else if (value === "share") shareTable();
  else toggleView(value);
  
  
  document.getElementById("dropdownMenu").classList.remove("show");
}



document.addEventListener("click", function(e) {
  const dropdown = document.querySelector(".custom-dropdown");
  if (!dropdown.contains(e.target)) {
    document.getElementById("dropdownMenu").classList.remove("show");
  }
});





let currentSwapView = 0;
const slider = document.getElementById("viewSlider");

function updateSwapView() {
  return;
  slider.style.transform = `translate3d(-${currentSwapView * 50}%, 0, 0)`;
  
  if (currentSwapView === 0) {
    showTournamentView();
  } else {
    showPOTSView();
  }
}


let startX = 0;

document.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", (e) => {
  let endX = e.changedTouches[0].clientX;
  let diff = startX - endX;
  
  if (diff > 50) {
    currentSwapView = 1;
  } else if (diff < -50) {
    currentSwapView = 0;
  }
  
  updateSwapView();
});


function showPOTSView() {
  document.getElementById("viewIndicator").textContent = "POTS Rankings";
  
  populateTournamentMapping();
  loadPOTConfig();
  setupPOTListeners();
  calculatePOT();
}


function showTournamentView() {
  document.getElementById("viewIndicator").textContent = "Tournaments";
}

function enableSwipeForRounds() {
  const container = document.getElementById("fixtureList");
  if (!container) return;
  
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 60;
  
  container.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  
  container.addEventListener("touchend", e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
  
  
  let mouseDown = false;
  container.addEventListener("mousedown", e => {
    mouseDown = true;
    touchStartX = e.screenX;
  });
  container.addEventListener("mouseup", e => {
    if (!mouseDown) return;
    mouseDown = false;
    touchEndX = e.screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    const diff = touchEndX - touchStartX;
    
    if (Math.abs(diff) < swipeThreshold) return;
    
    if (diff > 0) {
      
      console.log("[Swipe] Right -> Prev Round");
      prevRound();
    } else {
      
      console.log("[Swipe] Left -> Next Round");
      nextRound();
    }
  }
}

function updateDropdownLabel(view) {
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  
  const labels = {
    table: "📊 Table",
    forms: "📈 Forms",
    teams: "👥 Teams",
    records: "🏆 Records"
  };
  
  if (APP_MODE === "admin") {
    labels.register = "📝 Register Team";
  }
  
  dropdownToggle.textContent = labels[view] || "📊 Table";
}

function getMaxRound() {
  if (!Array.isArray(fixtures) || !fixtures.length) {
    return 1;
  }
  
  return Math.max(
    ...fixtures.map(
      match =>
      Number(match.round) || 1
    ),
    1
  );
}

function getTournaments() {
  return myTournaments || [];
}

function renderRoundList() {
  const container =
    document.getElementById("roundCarousel");
  
  if (!container) return;
  
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const current =
    getCurrentRound();
  
  const matches =
    Array.isArray(fixtures) ?
    fixtures :
    Array.isArray(tournament.matches) ?
    tournament.matches : [];
  
  const max = Math.max(
    ...matches.map(
      match =>
      Number(match.round) || 1
    ),
    1
  );
  
  let track =
    container.querySelector(
      ".roundTrack"
    );
  
  if (!track) {
    track =
      document.createElement("div");
    
    track.className =
      "roundTrack";
    
    container.appendChild(track);
  }
  
  track.innerHTML = "";
  
  for (
    let i = 1; i <= max; i++
  ) {
    const el =
      document.createElement("h2");
    
    el.className =
      "roundText";
    
    if (i === current) {
      el.classList.add("active");
    }
    else if (i === current - 1) {
      el.classList.add("prev");
    }
    else if (i === current + 1) {
      el.classList.add("next");
    }
    
    el.textContent =
      `Round ${i} / ${max}`;
    
    el.onclick = () =>
      goToRound(i);
    
    track.appendChild(el);
  }
  
  requestAnimationFrame(
    centerActiveRound
  );
}

async function goToRound(round) {
  setCurrentRound(round);
  
  updateRoundClasses();
  
  await renderFixtures();
  
  requestAnimationFrame(
    centerActiveRound
  );
}



function centerActiveRound() {
  const container = document.getElementById("roundCarousel");
  const track = container?.querySelector(".roundTrack");
  const active = track?.querySelector(".roundText.active");
  if (!container || !track || !active) return;
  
  const containerRect = container.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  
  const offset = activeRect.left - containerRect.left -
    containerRect.width / 2 +
    activeRect.width / 2;
  
  const currentTranslate = getTranslateX(track);
  
  track.style.transform = `translateX(${currentTranslate - offset}px)`;
}



function updateRoundClasses() {
  const track = document.querySelector(".roundTrack");
  if (!track) return;
  
  const current = getCurrentRound();
  
  track.querySelectorAll(".roundText").forEach((el, index) => {
    const i = index + 1;
    
    el.classList.remove("active", "prev", "next");
    
    if (i === current) el.classList.add("active");
    else if (i === current - 1) el.classList.add("prev");
    else if (i === current + 1) el.classList.add("next");
  });
}

function getTranslateX(el) {
  const style = window.getComputedStyle(el);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return matrix.m41;
}


function shareForm() {
  const element = document.getElementById('formContainer');
  
  const titleText = 'Recent Forms';
  const formText = titleText.replace(/\s/g, '-');
  
  if (!element) {
    showAlert('Screenshot target area not found!');
    return;
  }
  
  const options = {
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 0,
    
    scale: Math.min(4, window.devicePixelRatio * 2),
    
    onclone: (doc) => {
      const cloned = doc.getElementById('formContainer');
      if (cloned) {
        cloned.style.background = '#21262d';
        cloned.style.webkitFontSmoothing = 'antialiased';
        cloned.style.textRendering = 'geometricPrecision';
      }
    }
  };
  
  html2canvas(element, options).then(canvas => {
    
    canvas.toBlob(blob => {
      if (!blob) {
        show('Failed to process screenshot image.');
        return;
      }
      
      const file = new File(
        [blob],
        `form-${formText}.png`, { type: 'image/png' }
      );
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: titleText,
          text: `Check out the latest ${titleText}!`
        }).catch(err => console.log('Share dismissed', err));
      } else {
        const link = document.createElement('a');
        link.download = `form-${formText}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
    
  }).catch(err => {
    console.error('Screenshot failed:', err);
    showAlert('Could not take screenshot');
  });
}

function shareBracket() {
  closeMenu();
  const element = document.getElementById('bracket-container');
  const titleText = document.getElementById('roundLabel')?.textContent || 'Bracket';
  const fileName = titleText.replace(/\s/g, '-');
  
  if (!element) {
    showAlert('Bracket container not found!');
    return;
  }
  
  
  const width = element.scrollWidth;
  const height = element.scrollHeight;
  
  const options = {
    useCORS: true,
    allowTaint: false,
    logging: false,
    imageTimeout: 0,
    backgroundColor: '#21262d',
    scale: Math.min(2, window.devicePixelRatio),
    
    
    width: width,
    height: height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    
    onclone: (doc) => {
      const original = doc.getElementById('bracket-container');
      if (!original) return;
      
      
      original.style.transform = 'none';
      original.style.position = 'static';
      original.style.margin = '0';
      
      
      doc.body.style.overflow = 'visible';
      doc.documentElement.style.overflow = 'visible';
    }
  };
  
  html2canvas(element, options).then(canvas => {
    canvas.toBlob(blob => {
      if (!blob) {
        showAlert('Failed to process screenshot image.');
        return;
      }
      
      const file = new File([blob], `bracket-${fileName}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: titleText,
          text: `Check out the latest ${titleText}!`
        }).catch(() => {});
      } else {
        const link = document.createElement('a');
        link.download = `bracket-${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
  }).catch((err) => {
    console.error(err);
    showAlert('Could not take screenshot');
  });
}


function previewTournamentImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    document.getElementById("tournamentImagePreview").src = e.target.result;
  };
  
  reader.readAsDataURL(file);
}




async function renderTeams(
  containerId = "teamList"
) {
  showLoader();
  
  try {
    const container =
      document.getElementById(
        containerId
      );
    
    if (!container) return;
    
    const tournament =
      getCurrentTournament();
    
    if (!tournament) {
      showAlert(
        "No tournament selected"
      );
      return;
    }
    
    const teams =
      await loadTournamentTeams(
        tournament.id
      );
    
    container.className =
      "CupTeamsContainer";
    
    container.innerHTML = "";
    
    const counterLabel =
      document.getElementById(
        "teamCount"
      );
    
    const teamadded =
      document.getElementById(
        "teamsadded"
      );
    
    if (counterLabel) {
      counterLabel.textContent =
        `Total Teams Register : ${teams.length}`;
    }
    
    if (teamadded) {
      teamadded.textContent =
        teams.length;
    }
    
    if (!teams.length) {
      container.innerHTML =
        "<p>No teams added yet</p>";
      return;
    }
    
    teams.forEach(team => {
      const div =
        document.createElement(
          "div"
        );
      
      div.className =
        "team-card";
      
      div.innerHTML = `
        <div class="team-swipe-wrapper">
          <div class="team-actions">
            <button
              class="btn-edit data-admin"
              onclick="openEditTeam('${team.id}')"
            >
              Edit
            </button>

            <button
              class="btn-delete data-admin"
              onclick="deleteTeam('${team.id}')"
            >
              Delete
            </button>
          </div>

          <div class="team-content">
            ${
              team.logo
                ? `
                  <img
                    class="team-logo"
                    src="${team.logo}"
                    alt="${team.name}"
                  />
                `
                : `
                  <div class="team-logo-placeholder">
                    ?
                  </div>
                `
            }

            <span>${team.name}</span>
          </div>
        </div>
      `;
      
      let startX = 0;
      let currentX = 0;
      let isSwiping = false;
      
      const content =
        div.querySelector(
          ".team-content"
        );
      
      const start = x => {
        startX = x;
        currentX = x;
        isSwiping = true;
      };
      
      const move = x => {
        if (!isSwiping) return;
        
        currentX = x;
        
        const diff =
          currentX - startX;
        
        if (diff < 0) {
          content.style.transform =
            `translateX(${diff}px)`;
        }
      };
      
      const end = () => {
        if (!isSwiping) return;
        
        isSwiping = false;
        
        const diff =
          currentX - startX;
        
        content.style.transform =
          diff < -80 ?
          "translateX(-120px)" :
          "translateX(0)";
      };
      
      div.addEventListener(
        "touchstart",
        e =>
        start(
          e.touches[0].clientX
        )
      );
      
      div.addEventListener(
        "mousedown",
        e =>
        start(
          e.clientX
        )
      );
      
      div.addEventListener(
        "touchmove",
        e =>
        move(
          e.touches[0].clientX
        )
      );
      
      div.addEventListener(
        "mousemove",
        e =>
        move(
          e.clientX
        )
      );
      
      div.addEventListener(
        "touchend",
        end
      );
      
      div.addEventListener(
        "mouseup",
        end
      );
      
      div.addEventListener(
        "mouseleave",
        end
      );
      
      container.appendChild(
        div
      );
    });
    
  } catch (err) {
    console.error(
      "[renderTeams]",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to load teams."
    );
    
  } finally {
    hideLoader();
  }
}

function renderNotifications() {
  
  const list = document.getElementById(
    "notificationList"
  );
  
  const badge = document.getElementById(
    "notificationBadge"
  );
  
  
  const unread = notifications.filter(
    n => !n.read
  );
  
  
  badge.textContent = unread.length;
  
  badge.style.display =
    unread.length > 0 ?
    "flex" :
    "none";
  
  
  if (!notifications.length) {
    
    list.innerHTML = `
      <p class="empty-notification">
        No notifications
      </p>
    `;
    
    return;
  }
  
  
  list.innerHTML = notifications.map(n => `

    <div 
      class="
        notification-item
        ${n.read ? "" : "unread"}
      "
      onclick="openNotification('${n.id}')"
    >

      <div class="notification-title">
        ${n.title}
      </div>

      <div class="notification-message">
        ${n.message}
      </div>

      <div class="notification-time">
        ${new Date(
          n.createdAt
        ).toLocaleString()}
      </div>

    </div>

  `).join("");
  
}





function handleNewNotification(notification) {
  
  notifications.unshift(notification);
  
  renderNotifications();
  
  playNotificationSound();
  
  animateNotificationBell();
  
}


function playNotificationSound() {
  
  notificationSound.currentTime = 0;
  
  notificationSound.play()
    .catch(err => {
      console.log(
        "Notification sound blocked:",
        err
      );
    });
  
}


function animateNotificationBell() {
  
  const button = document.getElementById(
    "notificationBtn"
  );
  
  if (!button) return;
  
  button.classList.add("ringing");
  
  
  setTimeout(() => {
    button.classList.remove("ringing");
  }, 1000);
  
}

function getSortedCompetitions(competitions) {
  return [...competitions].sort((a, b) => {
    const timeA = new Date(
      a.createdAt || a.dateCreated || a.timestamp || 0
    ).getTime();
    
    const timeB = new Date(
      b.createdAt || b.dateCreated || b.timestamp || 0
    ).getTime();
    
    return timeA - timeB;
  });
}

async function renderCompetitionList() {
  const container = document.getElementById("competitionList");
  if (!container) return;
  
  const currentUser = getCurrentUser();
  const competitions = getSortedCompetitions(myCompetitions || []);
  
  container.innerHTML = "";
  
  if (!competitions || competitions.length === 0) {
    container.innerHTML = `
      <p class="emptyText">
        No competitions available
        <br><br>
        ${
          currentUser?.role === "player"
            ? "Competitions will appear here when you are invited to a tournament."
            : "Competitions will appear here as soon as you create one. Click the side menu to create one."
        }
      </p>
    `;
    return;
  }
  
  competitions.forEach(competition => {
    const card = createCompetitionCard(competition);
    container.appendChild(card);
  });
}

function getCompetitionTournamentCount(competition) {
  return competition.tournament_count ?? 0;
}

function getCompetitionActiveSeasons(competition) {
  return competition.active_seasons ?? 0;
}

function getActiveSeasonText(competition) {
  const count =
    competition.active_seasons ?? 0;
  
  return count === 1 ?
    "1 Active Season" :
    `${count} Active Seasons`;
}

function createCompetitionCard(competition) {
  const div = document.createElement("div");
  div.className = "competition-card";
  div.dataset.id = competition.id;
  
  const imgId =
    `competition-img-${competition.id}`;
  
  div.innerHTML = `
    <div class="card-header">
      <div class="competition-meta">
      </div>

      <div class="competition-menu-btn data-admin">
        ☰
      </div>
    </div>

    <div class="competition-body">
      <div class="competition-info">
        <h3>${competition.name}</h3>
      </div>

      <div class="competition-image">
        <span
          id="${imgId}"
          class="competition-image-placeholder"
        >
          🏆
        </span>
      </div>
    </div>

    <div
      class="menu-dropdown hidden"
      id="menu-${competition.id}"
    >
      <div class="menu-itemList edit data-admin">
        Edit
      </div>

      <div class="menu-itemList delete data-admin">
        Delete
      </div>
    </div>
  `;
  
  const menuBtn =
    div.querySelector(".competition-menu-btn");
  
  const dropdown =
    div.querySelector(".menu-dropdown");
  
  const editBtn =
    div.querySelector(".menu-itemList.edit");
  
  const deleteBtn =
    div.querySelector(".menu-itemList.delete");
  
  menuBtn?.addEventListener("click", e => {
    e.stopPropagation();
    
    document
      .querySelectorAll(".menu-dropdown")
      .forEach(el => {
        if (el !== dropdown) {
          el.classList.add("hidden");
        }
      });
    
    dropdown.classList.toggle("hidden");
  });
  
  editBtn?.addEventListener("click", e => {
    e.stopPropagation();
    
    editCompetition(competition.id);
    
    dropdown.classList.add("hidden");
  });
  
  deleteBtn?.addEventListener("click", e => {
    e.stopPropagation();
    
    deleteCompetition(competition.id);
    
    dropdown.classList.add("hidden");
  });
  
  div.addEventListener("click", e => {
    if (e.target.closest(".menu-dropdown")) {
      return;
    }
    
    openCompetition(competition.id);
  });
  
  const logoUrl =
    competition.logo_url || "";
  
  if (logoUrl) {
    const placeholder =
      div.querySelector(`#${imgId}`);
    
    if (placeholder) {
      const img =
        document.createElement("img");
      
      img.src = logoUrl;
      img.alt =
        competition.name || "";
      
      img.className =
        "competition-image-img";
      
      img.onerror = () => {
        console.error(
          "Failed to load competition logo:",
          logoUrl
        );
      };
      
      placeholder.replaceWith(img);
    }
  }
  
  return div;
}




function loadTournamentImage(tournament, imgId, container) {
  const placeholder = container.querySelector(
    `#${CSS.escape(imgId)}`
  );
  
  if (
    !placeholder ||
    !tournament.tournament_image
  ) {
    return;
  }
  
  const img = document.createElement("img");
  
  img.src = tournament.tournament_image;
  img.alt = tournament.name || "Tournament";
  img.className = "tournament-image-img";
  
  img.onerror = () => {
    img.replaceWith(placeholder);
  };
  
  placeholder.replaceWith(img);
}

function getGroupedAndSortedTournaments(tournaments) {
  const sorted = [...tournaments].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.dateCreated || a.timestamp || 0).getTime();
    const timeB = new Date(b.createdAt || b.dateCreated || b.timestamp || 0).getTime();
    return timeB - timeA;
  });
  
  return sorted.reduce((acc, tournament) => {
    const name = tournament.name || "Untitled Tournament";
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(tournament);
    return acc;
  }, {});
}


function renderTournamentList(containerId = "tournamentList", tournaments = myTournaments) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = "";
  
  if (!tournaments || tournaments.length === 0) {
    renderEmptyTournamentState(container);
    return;
  }
  
  const currentUser = getCurrentUser();
  
  renderTournamentsByGroup(
    tournaments,
    currentUser,
    container
  );
  
  setupTournamentMenuListener();
}

function getGroupedAndSortedTournaments(tournaments) {
  const sorted = [...tournaments].sort((a, b) => {
    const timeA =
      Number(a.created_at || a.createdAt || 0);
    
    const timeB =
      Number(b.created_at || b.createdAt || 0);
    
    return timeB - timeA;
  });
  
  return sorted.reduce((acc, tournament) => {
    const name =
      tournament.name ||
      "Untitled Tournament";
    
    if (!acc[name]) {
      acc[name] = [];
    }
    
    acc[name].push(tournament);
    
    return acc;
  }, {});
}


function renderTournamentsByGroup(tournaments, currentUser, container) {
  const grouped = getGroupedAndSortedTournaments(tournaments);
  
  Object.entries(grouped).forEach(([groupName, groupItems]) => {
    const groupSection = document.createElement("div");
    groupSection.className = "tournament-group-section";
    
    const title = document.createElement("h3");
    title.className = "tournament-group-title";
    title.textContent = groupName;
    groupSection.appendChild(title);
    
    const tournamentContainer = document.createElement("div");
    
    // Global TournamentListStyle controls the layout
    tournamentContainer.className =
      TournamentListStyle === "column" ?
      "tournament-column" :
      "tournament-scroll-row";
    
    groupItems.forEach(tournament => {
      const card = createTournamentCard(tournament, currentUser);
      tournamentContainer.appendChild(card);
    });
    
    groupSection.appendChild(tournamentContainer);
    container.appendChild(groupSection);
  });
}

function setupTournamentMenu(div, tournament) {
  const menuBtn = div.querySelector(".tournament-menu-btn");
  const dropdown = div.querySelector(`#menu-${tournament.id}`);
  const editBtn = div.querySelector(".menu-itemList.edit");
  const deleteBtn = div.querySelector(".menu-itemList.delete");
  
  menuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    
    document.querySelectorAll(".menu-dropdown").forEach(el => {
      if (el !== dropdown) {
        el.classList.add("hidden");
      }
    });
    
    dropdown?.classList.toggle("hidden");
  });
  
  editBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    
    if (typeof editTournament === "function") {
      editTournament(tournament.id);
    }
    
    dropdown?.classList.add("hidden");
  });
  
  deleteBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    
    if (typeof deleteTournament === "function") {
      deleteTournament(tournament.id);
    }
    
    dropdown?.classList.add("hidden");
  });
}

function setupPublicJoinAction(div, tournament) {
  const joinBtn = div.querySelector(".join-tournament-btn");
  
  joinBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await joinTournament(tournament.id);
  });
}

function setupTournamentClick(div, tournament, disableCardClick = false) {
  div.addEventListener("click", (e) => {
    if (disableCardClick) return;
    
    if (e.target.closest(".menu-dropdown")) {
      return;
    }
    
    if (typeof exportMode !== "undefined" && exportMode) {
      if (typeof toggleSelect === "function") {
        toggleSelect(tournament.id);
      }
      return;
    }
    
    openTournament(tournament.id);
  });
}

function setupTournamentMenuListener() {
  if (window._tournamentMenuListener) {
    return;
  }
  
  document.addEventListener("click", () => {
    document.querySelectorAll(".menu-dropdown").forEach(el => {
      el.classList.add("hidden");
    });
  });
  
  window._tournamentMenuListener = true;
}

function renderEmptyTournamentState(container) {
  
  const isPublicPage = window.currentPage === "public";
  
  container.innerHTML = `
    <p class="emptyText">
      No tournaments available
      <br><br>
      ${
        isPublicPage
          ? "No public tournaments available right now."
          : "Tournaments will appear here when you are invited or create one."
      }
    </p>
  `;
}

function canJoinTournament(tournament, currentUser) {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return
  const playerInfo = tournament.players?.[currentUser.uid];
  
  const isJoined = Boolean(
    playerInfo && (playerInfo.joined || playerInfo.status === "joined" || playerInfo.status === "accepted")
  );
  
  const hasPendingInvite = playerInfo?.hasNewInvitation === true;
  
  const isPrivate = tournament.isPrivate === true || tournament.type === "private" || tournament.visibility === "private";
  
  return !isPrivate && !isJoined && !hasPendingInvite;
}

function createTournamentCard(tournament, currentUser) {
  const div = document.createElement("div");
  
  div.className = "tournament-card";
  
  div.dataset.id = tournament.id;
  
  const imgId =
    `tournament-img-${tournament.id}`;
  
  const playerInfo =
    tournament.players?.[currentUser?.uid];
  
  const pendingInvitation =
    currentUser?.role === "player" &&
    playerInfo?.hasNewInvitation === true;
  
  const showPublicJoin =
    canJoinTournament(
      tournament,
      currentUser
    );
  
  const status =
    (
      tournament.season_status ||
      tournament.seasonStatus ||
      tournament.status ||
      ""
    ).toLowerCase();
  
  const statusClass =
    status === "active" ?
    "active" :
    status === "upcoming" ?
    "upcoming" :
    status === "completed" ?
    "completed" :
    "";
  
  div.innerHTML = `
    <div class="card-header">

      <div class="tournament-meta">

        <div class="tournament-format">
          ${tournament.format || "League"}
        </div>

        <div class="tournament-season">
          ${tournament.season || "Season 1"}
        </div>

        <div class="tournament-status ${statusClass}">
          ${
            tournament.season_status ||
            tournament.seasonStatus ||
            tournament.status ||
            ""
          }
        </div>

      </div>

      ${
        pendingInvitation || showPublicJoin
          ? ""
          : `
            <div class="tournament-menu-btn data-admin">
              ☰
            </div>
          `
      }

    </div>

    <div class="tournament-image">
      <span
        id="${imgId}"
        class="tournament-image-placeholder"
      >
        🏆
      </span>
    </div>

    <h3 class="tournament-name">
      ${tournament.name}
    </h3>

    ${
      pendingInvitation
        ? `
          <div class="invitation-actions">
            <button class="accept-btn">
              Join
            </button>

            <button class="decline-btn">
              Decline
            </button>
          </div>
        `
        : showPublicJoin
          ? `
            <div class="public-actions">
              <button class="join-tournament-btn">
                Join
              </button>
            </div>
          `
          : `
            <div
              class="menu-dropdown hidden"
              id="menu-${tournament.id}"
            >
              <div class="menu-itemList edit data-admin">
                Edit
              </div>

              <div class="menu-itemList delete data-admin">
                Delete
              </div>
            </div>
          `
    }
  `;
  
  if (pendingInvitation) {
    setupInvitationActions(
      div,
      tournament
    );
  } else if (showPublicJoin) {
    setupPublicJoinAction(
      div,
      tournament
    );
  } else {
    setupTournamentMenu(
      div,
      tournament
    );
  }
  
  setupTournamentClick(
    div,
    tournament,
    pendingInvitation || showPublicJoin
  );
  
  loadTournamentImage(
    tournament,
    imgId,
    div
  );
  
  return div;
}

function setupPublicJoinAction(div, tournament) {
  const joinBtn = div.querySelector(".join-tournament-btn");
  
  joinBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await joinTournament(tournament.id);
  });
}

function setupInvitationActions(div, tournament) {
  
  const acceptBtn =
    div.querySelector(".accept-btn");
  
  const declineBtn =
    div.querySelector(".decline-btn");
  
  
  acceptBtn?.addEventListener("click", (e) => {
    
    e.stopPropagation();
    
    
    showInvitationModal({
      
      title: "Tournament Invitation",
      
      message: `You are invited to join "${tournament.name}"?`,
      
      showInput: false,
      
      confirmText: "Join",
      
      cancelText: "Cancel",
      
      
      onConfirm: async () => {
        
        await respondToInvitation(
          tournament.id,
          "accept"
        );
        
      }
      
    });
    
  });
  
  
  
  declineBtn?.addEventListener("click", (e) => {
    
    e.stopPropagation();
    
    
    showInvitationModal({
      
      title: "Tournament Invitation",
      
      message: `Decline invitation to "${tournament.name}"?`,
      
      showInput: false,
      
      confirmText: "Decline",
      
      cancelText: "Cancel",
      
      
      onConfirm: async () => {
        
        await respondToInvitation(
          tournament.id,
          "decline"
        );
        
      }
      
    });
    
  });
  
}

function setupTournamentClick(
  div,
  tournament,
  pendingInvitation
) {
  
  div.addEventListener("click", (e) => {
    
    
    if (pendingInvitation) return;
    
    
    if (e.target.closest(".menu-dropdown")) {
      return;
    }
    
    
    if (
      typeof exportMode !== "undefined" &&
      exportMode
    ) {
      
      if (typeof toggleSelect === "function") {
        
        toggleSelect(tournament.id);
        
      }
      
      
      return;
      
    }
    
    
    openTournament(tournament.id);
    
  });
  
}

function setupTournamentMenuListener() {
  
  if (window._tournamentMenuListener) {
    return;
  }
  
  
  document.addEventListener("click", () => {
    
    document
      .querySelectorAll(".menu-dropdown")
      .forEach(el => {
        
        el.classList.add("hidden");
        
      });
    
  });
  
  
  window._tournamentMenuListener = true;
  
}



function createTournamentCard(tournament, currentUser) {
  const div = document.createElement("div");
  
  div.className = "tournament-card";
  
  div.dataset.id = tournament.id;
  
  const imgId =
    `tournament-img-${tournament.id}`;
  
  const status =
    (
      tournament.season_status ||
      tournament.seasonStatus ||
      tournament.status ||
      ""
    ).toLowerCase();
  
  const statusClass =
    status === "active" ?
    "active" :
    status === "upcoming" ?
    "upcoming" :
    status === "completed" ?
    "completed" :
    "";
  
  div.innerHTML = `
    <div class="card-header">

      <div class="tournament-meta">

        <div class="tournament-format">
          ${tournament.format || "League"}
        </div>

        <div class="tournament-season">
          ${tournament.season || "Season 1"}
        </div>

        <div class="tournament-status ${statusClass}">
          ${
            tournament.season_status ||
            tournament.seasonStatus ||
            tournament.status ||
            ""
          }
        </div>

      </div>

      <div class="tournament-menu-btn data-admin">
        ☰
      </div>

    </div>

    <div class="tournament-image">
      <span
        id="${imgId}"
        class="tournament-image-placeholder"
      >
        🏆
      </span>
    </div>

    <h3 class="tournament-name">
      ${tournament.name}
    </h3>

    <div
      class="menu-dropdown hidden"
      id="menu-${tournament.id}"
    >
      <div class="menu-itemList edit data-admin">
        Edit
      </div>

      <div class="menu-itemList delete data-admin">
        Delete
      </div>
    </div>
  `;
  
  setupTournamentMenu(
    div,
    tournament
  );
  
  setupTournamentClick(
    div,
    tournament
  );
  
  loadTournamentImage(
    tournament,
    imgId,
    div
  );
  
  return div;
}

function setupTournamentClick(
  div,
  tournament
) {
  div.addEventListener("click", (e) => {
    
    if (
      e.target.closest(".menu-dropdown")
    ) {
      return;
    }
    
    if (
      typeof exportMode !== "undefined" &&
      exportMode
    ) {
      if (
        typeof toggleSelect === "function"
      ) {
        toggleSelect(tournament.id);
      }
      
      return;
    }
    
    openTournament(
      tournament.id
    );
  });
}



function importTeams() {
  
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

async function deleteCompetition(competitionId) {
  if (!competitionId) {
    showAlert("No competition selected for deletion.");
    return;
  }
  
  showConfirmModal(
    "Are you sure you want to delete this competition? All associated tournament seasons will be removed.",
    "Delete Competition",
    "Cancel"
  );
  
  confirmYes = async () => {
    closeConfirmModal();
    showLoader();
    
    try {
      await removeCompetition(competitionId);
      
      showAlert("Competition deleted successfully.");
      
      if (typeof selectedCompetitionId !== "undefined" && selectedCompetitionId === competitionId) {
        selectedCompetitionId = null;
      }
      
      if (typeof loadMyCompetitions === "function") {
        await loadMyCompetitions();
      }
    } catch (err) {
      showAlert(err.message || "Failed to delete competition.");
    } finally {
      hideLoader();
    }
  };
  
  confirmNo = () => {
    closeConfirmModal();
  };
}



async function renderTeams(containerId = "teamList") {
  showLoader();
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const current = getCurrentTournament();
  if (!current) return;
  
  const latestTournaments = await getMyTournaments();
  const tournament = latestTournaments.find(t => String(t.id) === String(current.id));
  
  if (!tournament) {
    hideLoader();
    return showAlert("Tournament not found");
  }
  
  currentTournament = tournament;
  const index = myTournaments.findIndex(t => String(t.id) === String(tournament.id));
  if (index !== -1) myTournaments[index] = tournament;
  
  container.className = "CupTeamsContainer";
  container.innerHTML = "";
  
  const counterLabel = document.getElementById("teamCount");
  const teamadded = document.getElementById("teamsadded");
  
  let teamsObj = tournament.teams || {};
  if (Array.isArray(teamsObj)) {
    const converted = {};
    teamsObj.forEach((oldName, i) => {
      const id = `old_${i}`;
      converted[id] = typeof oldName === "object" ? oldName : { id, name: oldName, logo: tournament.teamLogos?.[oldName] || null };
    });
    teamsObj = converted;
  }
  
  const teams = Object.values(teamsObj);
  
  if (counterLabel) counterLabel.textContent = `Total Teams Register : ${teams.length}`;
  if (teamadded) teamadded.textContent = teams.length;
  
  if (teams.length === 0) {
    container.innerHTML = "<p>No teams added yet</p>";
  }
  
  teams.forEach((team) => {
    const div = document.createElement("div");
    div.className = "team-card";
    
    div.innerHTML = `
      <div class="team-swipe-wrapper">
        <div class="team-actions">
          <button class="btn-edit data-admin" onclick="openEditTeam('${team.id}')">Edit</button>
          <button class="btn-delete data-admin" onclick="deleteTeam('${team.id}')">Delete</button>
        </div>

        <div class="team-content">
          ${team.logo ? `<img class="team-logo" src="${team.logo}" alt="${team.name}" />` : `<div class="team-logo-placeholder">?</div>`}
          <span>${team.name}</span>
        </div>
      </div>
    `;
    
    let startX = 0,
      currentX = 0,
      isSwiping = false;
    const content = div.querySelector(".team-content");
    const start = (x) => {
      startX = x;
      currentX = x;
      isSwiping = true;
    };
    const move = (x) => {
      if (!isSwiping) return;
      currentX = x;
      const diff = currentX - startX;
      if (diff < 0) content.style.transform = `translateX(${diff}px)`;
    };
    const end = () => {
      if (!isSwiping) return;
      isSwiping = false;
      const diff = currentX - startX;
      content.style.transform = diff < -80 ? "translateX(-120px)" : "translateX(0)";
    };
    div.addEventListener("touchstart", e => start(e.touches[0].clientX));
    div.addEventListener("mousedown", e => start(e.clientX));
    div.addEventListener("touchmove", e => move(e.touches[0].clientX));
    div.addEventListener("mousemove", e => move(e.clientX));
    div.addEventListener("touchend", end);
    div.addEventListener("mouseup", end);
    div.addEventListener("mouseleave", end);
    
    container.appendChild(div);
  });
  
  hideLoader();
}







function renderTeams(containerId = "teamList") {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  container.className = "CupTeamsContainer";
  container.innerHTML = "";
  
  const counterLabel = document.getElementById("teamCount");
  const teamadded = document.getElementById("teamsadded");
  
  let teamsObj = tournament.teams || {};
  if (Array.isArray(teamsObj)) {
    const converted = {};
    teamsObj.forEach((oldName, i) => {
      const id = `old_${i}`;
      converted[id] = typeof oldName === "object" ? oldName : { id, name: oldName, logo: tournament.teamLogos?.[oldName] || null };
    });
    teamsObj = converted;
  }
  
  const teams = Object.values(teamsObj);
  
  if (counterLabel) counterLabel.textContent = `Total Teams Register : ${teams.length}`;
  if (teamadded) teamadded.textContent = teams.length;
  
  if (teams.length === 0) {
    container.innerHTML = "<p>No teams added yet</p>";
    return;
  }
  
  teams.forEach((team) => {
    const div = document.createElement("div");
    div.className = "team-card";
    
    div.innerHTML = `
      <div class="team-swipe-wrapper">
        <div class="team-actions">
          <button class="btn-edit data-admin" onclick="openEditTeam('${team.id}')">Edit</button>
          <button class="btn-delete data-admin" onclick="deleteTeam('${team.id}')">Delete</button>
        </div>

        <div class="team-content">
          ${team.logo ? `<img class="team-logo" src="${team.logo}" alt="${team.name}" />` : `<div class="team-logo-placeholder">?</div>`}
          <span>${team.name}</span>
        </div>
      </div>
    `;
    
    let startX = 0,
      currentX = 0,
      isSwiping = false;
    const content = div.querySelector(".team-content");
    const start = (x) => {
      startX = x;
      currentX = x;
      isSwiping = true;
    };
    const move = (x) => {
      if (!isSwiping) return;
      currentX = x;
      const diff = currentX - startX;
      if (diff < 0) content.style.transform = `translateX(${diff}px)`;
    };
    const end = () => {
      if (!isSwiping) return;
      isSwiping = false;
      const diff = currentX - startX;
      content.style.transform = diff < -80 ? "translateX(-120px)" : "translateX(0)";
    };
    
    div.addEventListener("touchstart", e => start(e.touches[0].clientX));
    div.addEventListener("mousedown", e => start(e.clientX));
    div.addEventListener("touchmove", e => move(e.touches[0].clientX));
    div.addEventListener("mousemove", e => move(e.clientX));
    div.addEventListener("touchend", end);
    div.addEventListener("mouseup", end);
    div.addEventListener("mouseleave", end);
    
    container.appendChild(div);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderHallOfFame(hallOfFame) {
  const container =
    document.getElementById("hallOfFameList");
  
  if (!container) return;
  
  const categories =
    hallOfFame?.categories || [];
  
  if (!categories.length) {
    container.innerHTML = `
      <div class="empty-state">
        No Hall of Fame records yet.
      </div>
    `;
    
    return;
  }
  
  container.innerHTML = categories.map(category => {
    
    const winners =
      Array.isArray(category.winners) ?
      category.winners : [];
    
    return `
      <div class="hallOfFameCategory">
        
        <div class="hallOfFameTitle">
          ${escapeHtml(category.title)}
        </div>
        
        <div class="hallOfFameWinners">
          ${winners.map(winner => `
            <span class="hallOfFameWinner">
              ${escapeHtml(winner.name)}
              ×${Number(winner.wins) || 0}
              ${category.icon || "🏆"}
            </span>
          `).join("")}
        </div>
        
      </div>
    `;
    
  }).join("");
}
document.addEventListener("DOMContentLoaded", enableSwipeForRounds);
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewId = urlParams.get('view');
  
  if (viewId) {
    
    setAppMode("view");
    await loadTournamentFromCloud(viewId);
    
    
    setInterval(() => loadTournamentFromCloud(viewId), 30000);
    
  } else {
    
    renderTournamentList();
  }
});


function renderNotices(notices) {
  const container =
    document.getElementById("noticeBoard");
  
  if (!container) return;
  
  if (!notices.length) {
    container.innerHTML = `
      <div class="notice-empty">
        No notices available.
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="notice-slider-wrapper">
      <div class="notice-slider">
        ${notices.map(notice => {
          const images =
            Array.isArray(notice.images) ?
            notice.images :
            [];

          const imagesHTML = images.length ?
            `
              <div class="notice-images">
                ${images.map(image => `
                  <img
                    src="${escapeHtml(image.url)}"
                    alt="${escapeHtml(notice.title)}"
                    loading="lazy"
                    class="notice-image"
                  >
                `).join("")}
              </div>
            ` :
            "";

          return `
            <article
              class="notice-card"
              data-notice-id="${notice.id}"
            >
              <div class="notice-card-header">
                <span class="notice-category">
                  ${escapeHtml(
                    notice.category || "General"
                  )}
                </span>

                <span class="notice-date">
                  ${formatNoticeDate(
                    notice.createdAt
                  )}
                </span>
              </div>

              <h3 class="notice-title">
                ${escapeHtml(notice.title)}
              </h3>

              <div class="notice-content">
                ${escapeHtml(notice.content)}
              </div>

              ${imagesHTML}
            </article>
          `;
        }).join("")}
      </div>
    </div>
  `;
  
  setupNoticeInteraction();
  setupNoticeScrollTracking();
  startNoticeAutoScroll();
}

function formatNoticeDate(timestamp) {
  if (!timestamp) return "";
  
  return new Date(timestamp).toLocaleString(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }
  );
}

function startNoticeAutoScroll() {
  const slider =
    document.querySelector(".notice-slider");
  
  if (!slider) return;
  
  const cards =
    slider.querySelectorAll(".notice-card");
  
  if (cards.length <= 1) return;
  
  if (noticeScrollTimer) {
    clearInterval(noticeScrollTimer);
  }
  
  noticeScrollIndex = 0;
  
  noticeScrollTimer = setInterval(() => {
    if (slider.dataset.interacting === "true") {
      return;
    }
    
    noticeScrollIndex++;
    
    if (noticeScrollIndex >= cards.length) {
      noticeScrollIndex = 0;
    }
    
    slider.scrollTo({
      left: slider.clientWidth * noticeScrollIndex,
      behavior: "smooth"
    });
    
  }, 5000);
}

function setupNoticeInteraction() {
  const slider =
    document.querySelector(".notice-slider");
  
  if (!slider) return;
  
  slider.addEventListener(
    "touchstart",
    () => {
      slider.dataset.interacting = "true";
      
      if (noticeInteractionTimeout) {
        clearTimeout(noticeInteractionTimeout);
      }
    }, { passive: true }
  );
  
  slider.addEventListener(
    "touchend",
    () => {
      resumeNoticeAutoScroll(slider);
    }, { passive: true }
  );
  
  slider.addEventListener(
    "touchcancel",
    () => {
      resumeNoticeAutoScroll(slider);
    }, { passive: true }
  );
  
  slider.addEventListener(
    "mousedown",
    () => {
      slider.dataset.interacting = "true";
      
      if (noticeInteractionTimeout) {
        clearTimeout(noticeInteractionTimeout);
      }
    }
  );
  
  slider.addEventListener(
    "mouseup",
    () => {
      resumeNoticeAutoScroll(slider);
    }
  );
}

function resumeNoticeAutoScroll(slider) {
  if (!slider) return;
  
  if (noticeInteractionTimeout) {
    clearTimeout(noticeInteractionTimeout);
  }
  
  noticeInteractionTimeout = setTimeout(() => {
    slider.dataset.interacting = "false";
  }, 2000);
}

function setupNoticeScrollTracking() {
  const slider =
    document.querySelector(".notice-slider");
  
  if (!slider) return;
  
  slider.addEventListener("scroll", () => {
    const width = slider.clientWidth;
    
    if (!width) return;
    
    const index =
      Math.round(slider.scrollLeft / width);
    
    if (index >= 0) {
      noticeScrollIndex = index;
    }
  }, { passive: true });
}




let teamSelectionResolver = null;
let teamSelectionTeams = [];
let selectedTeamIds = new Set();


function showTeamSelectionModal(
  teams
) {
  return new Promise(
    resolve => {
      teamSelectionResolver =
        resolve;
      
      teamSelectionTeams =
        Array.isArray(teams) ?
        teams : [];
      
      selectedTeamIds =
        new Set();
      
      const modal =
        document.getElementById(
          "teamSelectionModal"
        );
      
      const list =
        document.getElementById(
          "teamSelectionList"
        );
      
      const message =
        document.getElementById(
          "teamSelectionMessage"
        );
      
      if (!modal || !list) {
        resolve([]);
        return;
      }
      
      const isAdmin =
        typeof currentUser !==
        "undefined" &&
        currentUser?.role ===
        "admin";
      
      const maxTeams =
        isAdmin ? 20 : 1;
      
      message.textContent =
        isAdmin ?
        "Select the teams you want to use in this tournament. You can select up to 20 teams." :
        "Select the team you want to use in this tournament.";
      
      list.innerHTML = "";
      
      teamSelectionTeams.forEach(
        team => {
          const teamId =
            String(team.id);
          
          const item =
            document.createElement(
              "div"
            );
          
          item.className =
            "team-selection-item";
          
          item.dataset.teamId =
            teamId;
          
          const logo =
            team.logo ||
            team.team_logo ||
            "";
          
          item.innerHTML = `
            <div class="team-selection-left">

              <div class="team-selection-logo">
                ${
                  logo
                    ? `<img src="${escapeHtml(logo)}" alt="">`
                    : `<span>⚽</span>`
                }
              </div>

              <div class="team-selection-name">
                ${escapeHtml(
                  team.name || "Unnamed Team"
                )}
              </div>

            </div>

            <div class="team-selection-check">
              <input
                type="checkbox"
                value="${escapeHtml(teamId)}"
              >
            </div>
          `;
          
          const checkbox =
            item.querySelector(
              "input"
            );
          
          checkbox.addEventListener(
            "change",
            () => {
              if (
                checkbox.checked
              ) {
                if (
                  selectedTeamIds.size >=
                  maxTeams
                ) {
                  checkbox.checked =
                    false;
                  
                  showAlert(
                    isAdmin ?
                    "You can select a maximum of 20 teams." :
                    "You can select only one team."
                  );
                  
                  return;
                }
                
                selectedTeamIds.add(
                  teamId
                );
                
                item.classList.add(
                  "selected"
                );
                
              } else {
                selectedTeamIds.delete(
                  teamId
                );
                
                item.classList.remove(
                  "selected"
                );
              }
            }
          );
          
          item.addEventListener(
            "click",
            event => {
              if (
                event.target ===
                checkbox
              ) {
                return;
              }
              
              checkbox.checked = !checkbox.checked;
              
              checkbox.dispatchEvent(
                new Event(
                  "change"
                )
              );
            }
          );
          
          list.appendChild(
            item
          );
        }
      );
      
      modal.style.display =
        "flex";
      
      requestAnimationFrame(
        () => {
          modal.classList.add(
            "active"
          );
        }
      );
    }
  );
}


function confirmTeamSelection() {
  if (
    !selectedTeamIds.size
  ) {
    showAlert(
      "Select at least one team."
    );
    
    return;
  }
  
  const selected =
    Array.from(
      selectedTeamIds
    );
  
  closeTeamSelectionModal(
    selected
  );
}


function closeTeamSelectionModal(
  selected = []
) {
  const modal =
    document.getElementById(
      "teamSelectionModal"
    );
  
  if (modal) {
    modal.classList.remove(
      "active"
    );
    
    setTimeout(
      () => {
        modal.style.display =
          "none";
      },
      150
    );
  }
  
  if (
    teamSelectionResolver
  ) {
    const resolve =
      teamSelectionResolver;
    
    teamSelectionResolver =
      null;
    
    teamSelectionTeams = [];
    
    selectedTeamIds =
      new Set();
    
    resolve(
      selected
    );
  }
}

async function onFixtureClick(match) {
  if (APP_MODE === "view") {
    return;
  }
  
  const status =
    String(
      match.submission_status || ""
    ).toLowerCase();
  
  const user =
    getCurrentUser();
  
  const isAdmin =
    user?.role === "admin";
  
  if (
    !isAdmin &&
    status === "approved"
  ) {
    return;
  }
  
  if (
    !isAdmin &&
    status !== "pending" &&
    status !== "rejected"
  ) {
    return openLeagueRecorder(match);
  }
  
  if (
    isAdmin &&
    status !== "pending" &&
    status !== "rejected" &&
    status !== "approved"
  ) {
    return openLeagueRecorder(match);
  }
  
  try {
    showLoader();
    
    const tournament =
      getCurrentTournament();
    
    if (!tournament) return;
    
    let submission;
    
    if (isAdmin) {
      const submissions =
        await getMatchSubmissions(
          tournament.id,
          match.id
        );
      
      submission =
        Array.isArray(submissions) ?
        submissions[0] :
        null;
    } else {
      submission =
        await getMatchSubmission(
          tournament.id,
          match.id
        );
    }
    
    if (!submission) {
      showAlert(
        "Submission not found."
      );
      return;
    }
    
    openSubmissionReview(
      match,
      submission
    );
    
  } catch (err) {
    console.error(
      "[onFixtureClick]",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to load submission."
    );
    
  } finally {
    hideLoader();
  }
}


function getMatchSubmissionStatus(match) {
  return String(
    match.submission_status || ""
  ).toLowerCase();
}


function getSubmissionBadge(match) {
  const status =
    getMatchSubmissionStatus(match);
  
  if (
    !status ||
    status === "approved"
  ) {
    return "";
  }
  
  return `
    <span class="submission-badge ${status}">
      ${status}
    </span>
  `;
}

async function onFixtureClick(match) {
  if (APP_MODE === "view") {
    return;
  }
  
  const status =
    String(
      match.submission_status || ""
    ).toLowerCase();
  
  const user =
    getCurrentUser();
  
  const isAdmin =
    user?.role === "admin";
  
  if (
    !isAdmin &&
    status === "approved"
  ) {
    return;
  }
  
  if (
    !isAdmin &&
    status !== "pending" &&
    status !== "rejected"
  ) {
    return openLeagueRecorder(match);
  }
  
  if (
    isAdmin &&
    status !== "pending" &&
    status !== "rejected" &&
    status !== "approved"
  ) {
    return openLeagueRecorder(match);
  }
  
  try {
    showLoader();
    
    const tournament =
      getCurrentTournament();
    
    if (!tournament) return;
    
    let submission;
    
    if (isAdmin) {
      const submissions =
        await getMatchSubmissions(
          tournament.id,
          match.id
        );
      
      submission =
        Array.isArray(submissions) ?
        submissions[0] :
        null;
    } else {
      submission =
        await getMatchSubmission(
          tournament.id,
          match.id
        );
    }
    
    if (!submission) {
      showAlert(
        "Submission not found."
      );
      return;
    }
    
    openSubmissionReview(
      match,
      submission
    );
    
  } catch (err) {
    console.error(
      "[onFixtureClick]",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to load submission."
    );
    
  } finally {
    hideLoader();
  }
}

function createFixtureCard(
  tournament,
  match
) {
  const div =
    document.createElement("div");
  const played =
    Boolean(match.played);
  const round =
    Number(match.round) || 1;
  const homeName =
    match.home || "Home";
  const awayName =
    match.away || "Away";
  div.className =
    `fixture-row ${
      played
        ? "played"
        : "not-played"
    }`;
  div.innerHTML = `
    <div class="fixture-label">
      ${tournament.name || "Tournament"} •
      R${String(round).padStart(2, "0")}
      ${getSubmissionBadge(match)}
    </div>
    <div class="fixture-row-content">
      <div class="fixture-teams-stack">
        <div class="team-row-item team-home-container">
          <div class="fixture-team-logo-placeholder">
            ?
          </div>
          <span class="fixture-team-name">
            ${homeName}
          </span>
        </div>
        <div class="team-row-item team-away-container">
          <div class="fixture-team-logo-placeholder">
            ?
          </div>
          <span class="fixture-team-name">
            ${awayName}
          </span>
        </div>
      </div>
      <div class="fixture-status-pane">
        ${
          played
            ? `
              <div class="score-stack">
                <span class="score-badge played">
                  ${match.homeGoals ?? 0}
                </span>
                <span class="ft-badge">
                  Full Time
                </span>
                <span class="score-badge played">
                  ${match.awayGoals ?? 0}
                </span>
              </div>
            `
            : `
              <span class="vs-text-alt">
                ${formatMatchDay(
                  match.scheduledAt
                )}
              </span>
            `
        }
      </div>
      <div class="fixture-contact-area">
        <button
          class="fixture-contact-btn"
          type="button"
          aria-label="Team contacts"
          title="Team contacts"
        >
          ☎
        </button>
      </div>
    </div>
    ${
      played
        ? `
          <div class="match-playedTime">
            ${formatRecordedTime(
              match.playedAt
            )}
          </div>
        `
        : ""
    }
  `;
  replaceTeamLogo(
    div,
    ".team-home-container",
    match.homeLogo,
    homeName
  );
  replaceTeamLogo(
    div,
    ".team-away-container",
    match.awayLogo,
    awayName
  );
  div.style.cursor =
    "pointer";
  div.onclick = () =>
    onFixtureClick(match);
  const contactBtn =
    div.querySelector(
      ".fixture-contact-btn"
    );
  if (contactBtn) {
    contactBtn.onclick = (event) => {
      event.stopPropagation();
      openMatchContacts(match);
    };
  }
  return div;
}

async function openProfileModal() {
  const modal =
    document.getElementById(
      "profileModal"
    );
  if (!modal) return;
  modal.classList.add("active");
  modal.setAttribute(
    "aria-hidden",
    "false"
  );
  try {
    const profile =
      await getUserProfile();
    renderUserProfile(profile);
  } catch (error) {
    console.error(
      "Failed to load profile:",
      error
    );
  }
}

function renderUserProfile(profile) {
  const usernameElement =
    document.getElementById(
      "profileUsername"
    );
  const phoneElement =
    document.getElementById(
      "profilePhone"
    );
  const teamsElement =
    document.getElementById(
      "profileTeams"
    );
  const emptyElement =
    document.getElementById(
      "profileTeamsEmpty"
    );
  if (
    !usernameElement ||
    !phoneElement ||
    !teamsElement ||
    !emptyElement
  ) {
    return;
  }
  usernameElement.textContent =
    profile?.username ||
    "Username";
  const phone =
    profile?.phone;
  phoneElement.textContent =
    phone ?
    `WhatsApp: ${phone}` :
    "WhatsApp number not added";
  teamsElement.innerHTML = "";
  const teams =
    Array.isArray(profile?.teams) ?
    profile.teams :
    [];
  if (!teams.length) {
    emptyElement.hidden = false;
    return;
  }
  emptyElement.hidden = true;
  teams.forEach(team => {
    const teamElement =
      document.createElement("div");
    teamElement.className =
      "profile-page-team-card";
    teamElement.innerHTML = `
      <div class="profile-page-team-logo">
        ${
          team.logo
            ? `<img
                src="${team.logo}"
                alt=""
                loading="lazy"
              >`
            : `<div class="profile-page-team-logo-placeholder"></div>`
        }
      </div>
      <div class="profile-page-team-name">
        ${escapeHtml(
          team.name ||
          "Unnamed Team"
        )}
      </div>
    `;
    teamsElement.appendChild(
      teamElement
    );
  });
}


async function renderFormView() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const container =
    document.getElementById(
      "formContainer"
    );
  
  if (!container) return;
  
  try {
    showLoader();
    
    await loadTournamentFixtures(
      tournament.id
    );
    
    const table =
      await rebuildTableFromMatches(
        false
      );
    
    if (
      !Array.isArray(table) ||
      !table.length
    ) {
      container.innerHTML = `
        <div class="empty-state">
          No team form available.
        </div>
      `;
      
      return;
    }
    
    const sortedTable =
      getSortedTable(
        [...table]
      );
    
    container.innerHTML = "";
    
    sortedTable.forEach(
      (tableRow, index) => {
        const teamId =
          String(
            tableRow.id || ""
          );
        
        const teamName =
          tableRow.name ||
          "Unknown Team";
        
        const logoUrl =
          tableRow.logo ||
          null;
        
        const form =
          getTeamForm(
            teamId,
            fixtures
          );
        
        const row =
          document.createElement(
            "div"
          );
        
        row.className =
          "form-row";
        
        row.setAttribute(
          "data-index",
          index
        );
        
        row.innerHTML = `
          <div class="form-team">

            <span class="form-position">
              ${tableRow.pos || index + 1}
            </span>

            ${
              logoUrl
                ? `<img
                    class="Form-team-logo"
                    src="${logoUrl}"
                    alt=""
                    loading="lazy"
                  >`
                : `<div class="team-logo-placeholder">
                    ⚽
                  </div>`
            }

            <span>
              ${escapeHtml(teamName)}
            </span>

          </div>

          <div class="form-results">
            ${form.map(result => `
              <span class="form-badge ${result}">
                ${result}
              </span>
            `).join("")}
          </div>
        `;
        
        container.appendChild(
          row
        );
      }
    );
    
  } catch (err) {
    console.error(
      "[renderFormView]",
      err
    );
    
    container.innerHTML = `
      <div class="empty-state">
        Failed to load team form.
      </div>
    `;
    
    showAlert(
      err.message ||
      "Failed to load team form."
    );
    
  } finally {
    hideLoader();
  }
}
function getTeamForm(
  teamId,
  fixtures
) {
  const playedMatches =
    (fixtures || [])
    .filter(match =>
      Number(match.played) === 1 &&
      (
        String(match.home_team_id) ===
        String(teamId) ||
        String(match.away_team_id) ===
        String(teamId)
      )
    )
    .sort(
      (a, b) =>
      Number(
        a.playedAt ??
        a.played_at ??
        a.updated_at ??
        a.created_at ??
        0
      ) -
      Number(
        b.playedAt ??
        b.played_at ??
        b.updated_at ??
        b.created_at ??
        0
      )
    );
  
  return playedMatches
    .slice(-5)
    .map(match => {
      const isHome =
        String(match.home_team_id) ===
        String(teamId);
      
      const teamGoals =
        Number(
          isHome ?
          match.homeGoals :
          match.awayGoals
        );
      
      const opponentGoals =
        Number(
          isHome ?
          match.awayGoals :
          match.homeGoals
        );
      
      if (
        teamGoals >
        opponentGoals
      ) {
        return "W";
      }
      
      if (
        teamGoals <
        opponentGoals
      ) {
        return "L";
      }
      
      return "D";
    });
}


