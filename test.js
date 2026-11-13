const LOGO_DB_NAME = "TournamentLogosDB";
const LOGO_STORE = "logos";


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
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    return "Unknown";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  const formattedDate = new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos"
  }).format(date);
  const formattedTime = new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos"
  }).format(date);
  return `${formattedDate}, ${formattedTime}`;
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
  populateTournamentMapping();
  loadPOTConfig();
  setupPOTListeners();
  calculatePOT();
}


function showTournamentView() {
  
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

function getSortedCompetitions(
  competitions
) {
  return [...competitions].sort(
    (a, b) =>
    Number(a.created_at || 0) -
    Number(b.created_at || 0)
  );
}




async function renderCompetitionList() {
  const container =
    document.getElementById(
      "competitionList"
    );
  if (!container) return;
  const currentUser =
    getCurrentUser();
  const competitions =
    getSortedCompetitions(
      myCompetitions || []
    );
  container.innerHTML = "";
  if (
    !competitions ||
    competitions.length === 0
  ) {
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
  competitions.forEach(
    competition => {
      const card =
        createCompetitionCard(
          competition
        );
      container.appendChild(
        card
      );
    }
  );
}

function getCompetitionTournamentCount(competition) {
  return competition.tournament_count ?? 0;
}

function getCompetitionActiveSeasons(competition) {
  return competition.active_seasons ?? 0;
}

function getActiveSeasonText(competition) {
  const count = getCompetitionActiveSeasons(competition);
  
  return count === 1 ?
    "1 ACTIVE SEASON" :
    `${count} ACTIVE SEASONS`;
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


function createCompetitionCard(competition) {
  const div = document.createElement("div");
  
  div.className = "competition-card";
  div.dataset.id = competition.id;
  
  const imgId = `competition-img-${competition.id}`;
  
  const tournamentCount =
    getCompetitionTournamentCount(competition);
  
  const isAdmin =
    getCurrentUser()?.role !== "player";
  
  div.innerHTML = `
    <div class="competition-card-content">
      <div class="competition-info">
        <h3 class="competition-name"></h3>
      </div>

      <div class="competition-card-top">
        ${
          isAdmin
            ? `
              <button
                type="button"
                class="competition-menu-btn data-admin"
                aria-label="Competition options"
                aria-expanded="false"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            `
            : ""
        }
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

    <div class="competition-card-footer">
      <div class="competition-footer-info">
        <span class="competition-footer-icon">
          ◈
        </span>

        <span class="competition-footer-label"></span>
      </div>

      <span class="competition-card-arrow">
        &#8599;
      </span>
    </div>

    <div
      class="menu-dropdown hidden"
      id="menu-${competition.id}"
    >
      <button
        type="button"
        class="menu-itemList edit data-admin"
      >
        Edit Competition
      </button>

      <button
        type="button"
        class="menu-itemList delete data-admin"
      >
        Delete Competition
      </button>
    </div>
  `;
  
  div.querySelector(".competition-name").textContent =
    competition.name || "Unnamed Competition";
  
  div.querySelector(".competition-footer-label").textContent =
    `${tournamentCount} ${
      tournamentCount === 1 ? "TOURNAMENT" : "TOURNAMENTS"
    }`;
  
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
      .forEach(menu => {
        if (menu !== dropdown) {
          menu.classList.add("hidden");
          
          const otherBtn = menu
            .closest(".competition-card")
            ?.querySelector(".competition-menu-btn");
          
          otherBtn?.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      });
    
    const isOpening =
      dropdown.classList.contains("hidden");
    
    dropdown.classList.toggle("hidden");
    
    menuBtn.setAttribute(
      "aria-expanded",
      String(isOpening)
    );
  });
  
  editBtn?.addEventListener("click", e => {
    e.stopPropagation();
    
    dropdown.classList.add("hidden");
    
    menuBtn?.setAttribute(
      "aria-expanded",
      "false"
    );
    
    editCompetition(competition.id);
  });
  
  deleteBtn?.addEventListener("click", e => {
    e.stopPropagation();
    
    dropdown.classList.add("hidden");
    
    menuBtn?.setAttribute(
      "aria-expanded",
      "false"
    );
    
    deleteCompetition(competition.id);
  });
  
  div.addEventListener("click", e => {
    if (
      e.target.closest(".menu-dropdown") ||
      e.target.closest(".competition-menu-btn")
    ) {
      return;
    }
    
    openCompetition(competition.id);
  });
  
  const logoUrl = competition.logo_url || "";
  
  if (logoUrl) {
    const placeholder =
      div.querySelector(`#${imgId}`);
    
    if (placeholder) {
      const img = document.createElement("img");
      
      img.src = logoUrl;
      
      img.alt =
        `${competition.name || "Competition"} logo`;
      
      img.className =
        "competition-image-img";
      
      img.loading = "lazy";
      
      img.onerror = () => {
        const fallback =
          document.createElement("span");
        
        fallback.className =
          "competition-image-placeholder";
        
        fallback.textContent = "🏆";
        
        img.replaceWith(fallback);
      };
      
      placeholder.replaceWith(img);
    }
  }
  
  return div;
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

    ${
      status === "completed" &&
      tournament.champion_name
        ? `
          <div class="tournament-champion">
            <span class="tournament-champion-label">
              Champion
            </span>

            <span class="tournament-champion-name">
              ${tournament.champion_name}
            </span>
          </div>
        `
        : ""
    }

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
        <div>
          <div style="font-size: 38px; margin-bottom: 12px;">
            🏆
          </div>
          <div style="font-size: 17px; font-weight: 700; color: #f7d98b; margin-bottom: 6px;">
            The Hall of Fame
          </div>
          <div>
            No records yet. Your champions will be celebrated here.
          </div>
        </div>
      </div>
    `;
    
    return;
  }
  
  container.innerHTML = categories.map(category => {
    const winners =
      Array.isArray(category.winners) ?
      category.winners : [];
    
    return `
      <section class="hallOfFameCategory">

        <h3 class="hallOfFameTitle">
          ${escapeHtml(category.title)}
        </h3>

        <div class="hallOfFameWinners">
          ${
            winners.length
              ? winners.map(winner => `
                  <div class="hallOfFameWinner">
                    <span>
                      ${escapeHtml(winner.name)}
                    </span>

                    <span>
                      ${escapeHtml(category.icon || "🏆")}
                      ×${Number(winner.wins) || 0}
                    </span>
                  </div>
                `).join("")
              : `
                  <div class="empty-state">
                    No champions recorded yet.
                  </div>
                `
          }
        </div>

      </section>
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
  const container = document.getElementById("noticeBoard");
  const noticeSection = document.getElementById("noticeSection");
  const galaticoGlow = document.getElementById("galaticoGlow");

  if (!container || !noticeSection || !galaticoGlow) return;

  const hasNotices = Array.isArray(notices) && notices.length > 0;

  noticeSection.style.display = hasNotices ? "" : "none";
  galaticoGlow.style.display = hasNotices ? "none" : "flex";

  if (!hasNotices) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = notices.map(notice => {
    const images = Array.isArray(notice.images) ? notice.images : [];

    const imagesHTML = images.length
      ? `
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
      `
      : "";

    return `
      <article
        class="notice-card"
        data-notice-id="${notice.id}"
      >
        <div class="notice-card-header">
          <span class="notice-category">
            ${escapeHtml(notice.category || "General")}
          </span>
          <span class="notice-date">
            ${formatNoticeDate(notice.createdAt)}
          </span>
        </div>
        <h3 class="notice-title">
          ${escapeHtml(notice.title)}
        </h3>
        <div class="notice-content">${escapeHtml(
          notice.content
            .split("\n")
            .map(line => line.trim())
            .join("\n")
        )}</div>
        ${imagesHTML}
        <button
          type="button"
          class="notice-delete-btn data-admin"
          onclick="deleteNotice('${notice.id}')"
        >
          Delete
        </button>
      </article>
    `;
  }).join("");

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
let teamSelectionMode = "tournament";

function showTeamSelectionModal(teams, options = {}) {
  return new Promise(resolve => {
    if (teamSelectionResolver) {
      const previousResolve = teamSelectionResolver;
      teamSelectionResolver = null;
      previousResolve([]);
    }

    teamSelectionResolver = resolve;
    teamSelectionMode = options.mode || "tournament";

    teamSelectionTeams = Array.isArray(teams) ? teams : [];
    selectedTeamIds = new Set();

    const modal = document.getElementById("teamSelectionModal");
    const list = document.getElementById("teamSelectionList");
    const message = document.getElementById("teamSelectionMessage");
    const confirmBtn = document.getElementById("confirmTeamSelectionBtn");

    if (!modal || !list || !message || !confirmBtn) {
      const pendingResolve = teamSelectionResolver;
      teamSelectionResolver = null;
      pendingResolve([]);
      return;
    }

    const isEditMode = teamSelectionMode === "edit";

    const isAdmin =
      typeof currentUser !== "undefined" &&
      currentUser?.role === "admin";

    const maxTeams = isEditMode ? 1 : isAdmin ? 20 : 1;

    message.textContent = isEditMode
      ? "Select the team you want to edit."
      : isAdmin
        ? "Select the teams you want to use in this tournament. You can select up to 20 teams."
        : "Select the team you want to use in this tournament.";

    confirmBtn.textContent = isEditMode
      ? "Edit Selected Team"
      : "Join Tournament";

    list.innerHTML = "";

    teamSelectionTeams.forEach(team => {
      const teamId = String(team.id);
      const item = document.createElement("div");

      item.className = "team-selection-item";
      item.dataset.teamId = teamId;

      const logo = team.logo || team.team_logo || "";

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
            ${escapeHtml(team.name || "Unnamed Team")}
          </div>
        </div>
        <div class="team-selection-check">
          <input type="checkbox" value="${escapeHtml(teamId)}">
        </div>
      `;

      const checkbox = item.querySelector("input");

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (selectedTeamIds.size >= maxTeams) {
            checkbox.checked = false;

            showAlert(
              isEditMode
                ? "You can select only one team."
                : isAdmin
                  ? "You can select a maximum of 20 teams."
                  : "You can select only one team."
            );

            return;
          }

          selectedTeamIds.add(teamId);
          item.classList.add("selected");
        } else {
          selectedTeamIds.delete(teamId);
          item.classList.remove("selected");
        }
      });

      item.addEventListener("click", event => {
        if (event.target === checkbox) return;

        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      });

      list.appendChild(item);
    });

    modal.style.display = "flex";

    requestAnimationFrame(() => {
      modal.classList.add("active");
    });
  });
}

function confirmTeamSelection() {
  if (!selectedTeamIds.size) {
    showAlert("Select at least one team.");
    return;
  }

  closeTeamSelectionModal(
    Array.from(selectedTeamIds)
  );
}

function closeTeamSelectionModal(selected = []) {
  const modal = document.getElementById("teamSelectionModal");

  if (modal) {
    modal.classList.remove("active");

    setTimeout(() => {
      modal.style.display = "none";
    }, 150);
  }

  const resolve = teamSelectionResolver;

  teamSelectionResolver = null;
  teamSelectionTeams = [];
  selectedTeamIds = new Set();

  if (resolve) {
    resolve(selected);
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
    
    const players =
      Array.isArray(
        tournament.tournament_players
      ) ?
      tournament.tournament_players : [];
    
    const registeredPlayers =
      players.filter(
        player =>
        player &&
        player.team_id
      );
    
    let sourceTeams = [];
    
    if (
      Array.isArray(
        teamsByTournament[tournament.id]
      )
    ) {
      sourceTeams =
        teamsByTournament[
          tournament.id
        ];
    } else {
      sourceTeams =
        await loadTournamentTeams(
          tournament.id
        );
    }
    
    const teamMap =
      new Map();
    
    sourceTeams.forEach(
      team => {
        if (!team?.id) return;
        
        teamMap.set(
          String(team.id),
          team
        );
      }
    );
    
    const teams =
      registeredPlayers.map(
        player => {
          const team =
            teamMap.get(
              String(
                player.team_id
              )
            );
          
          return {
            id: player.team_id,
            playerId: player.id,
            name: player.team_name ||
              player.team?.name ||
              team?.name ||
              "Unknown Team",
            logo: player.team_logo ||
              player.team?.logo ||
              team?.logo ||
              null
          };
        }
      );
    
    const uniqueTeams =
      Array.from(
        new Map(
          teams.map(
            team => [
              String(team.id),
              team
            ]
          )
        ).values()
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
        `Total Teams Register : ${uniqueTeams.length}`;
    }
    
    if (teamadded) {
      teamadded.textContent = `Teams added: ${uniqueTeams.length}`;
    }
    
    updateChampionsLeagueSetupOptions(
      uniqueTeams.length
    );
    
    
    if (!uniqueTeams.length) {
      container.innerHTML =
        "<p>No teams added yet</p>";
      return;
    }
    
    uniqueTeams.forEach(
      team => {
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
                class="btn-delete data-admin"
                onclick="removeTournamentPlayer('${team.playerId}')"
              >
                Remove
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
      }
    );
    
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




function checkOpenCV() {
  if (typeof cv !== "undefined") {
    console.log("OpenCV loaded successfully");
  } else {
    console.log("OpenCV not loaded");
  }
}

checkOpenCV();






function openLiveInviteModal(match) {
  const overlay = document.createElement("div");

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const modal = document.createElement("div");

  modal.style.cssText = `
    width: 100%;
    max-width: 380px;
    background: #fff;
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 15px 50px rgba(0,0,0,0.2);
  `;

  modal.innerHTML = `
    <h3 style="
      margin: 0 0 7px;
      color: #1f2937;
      font-size: 18px;
    ">Invite to Live</h3>

    <p style="
      margin: 0 0 20px;
      color: #64748b;
      font-size: 13px;
    ">Select the team you want to invite.</p>

    <div id="liveInviteTeams"></div>

    <button
      type="button"
      id="liveInviteCancel"
      style="
        width: 100%;
        margin-top: 12px;
        padding: 13px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
        color: #475569;
        font-weight: 700;
      "
    >Cancel</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const teamsContainer =
    modal.querySelector("#liveInviteTeams");

  const teams = [
    {
      id: match.home_team_id,
      name: match.home || "Home Team"
    },
    {
      id: match.away_team_id,
      name: match.away || "Away Team"
    }
  ];

  function closeModal() {
    overlay.remove();
  }

  teams.forEach(team => {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = team.name;

    button.style.cssText = `
      display: block;
      width: 100%;
      padding: 15px;
      margin-bottom: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      color: #1f2937;
      font-size: 14px;
      font-weight: 800;
      text-align: left;
    `;

    button.onclick = () => {
      closeModal();
      createLiveBroadcast(match.id, team.id);
    };

    teamsContainer.appendChild(button);
  });

  modal.querySelector(
    "#liveInviteCancel"
  ).onclick = closeModal;

  overlay.onclick = event => {
    if (event.target === overlay) {
      closeModal();
    }
  };
}
async function createLiveBroadcast(matchId, teamId) {
  const token = getToken();

  if (!token) {
    showAlert("Please log in again.");
    return;
  }

  showLoader();

  try {
    const res = await apiRequest(
      `${API}/live/broadcasts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          matchId,
          teamId
        })
      },
      () => createLiveBroadcast(matchId, teamId)
    );

    if (!res) return;

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(
        result.message || "Unable to create broadcast."
      );
    }

    showAlert(
      "Live invitation sent successfully."
    );

  } catch (error) {
    showAlert(
      error.message || "Unable to create broadcast."
    );
  } finally {
    hideLoader();
  }
}



