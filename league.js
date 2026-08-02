async function renderFixtures() {
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container =
    document.getElementById("fixtureList");
  
  if (!container) return;
  
  container.innerHTML = "";
  
  const search =
    document.getElementById(
      "fixtureSearchInput"
    )?.value.toLowerCase() || "";
  
  toggleRoundCarousel(search);
  
  const matches =
    getVisibleMatches(tournament, search);
  
  if (!matches.length) {
    renderEmptyFixtures(container, search);
    return;
  }
  
  let lastRound = null;
  
  matches.forEach(match => {
    
    const round = match.round || 1;
    
    if (round !== lastRound) {
      lastRound = round;
      container.appendChild(
        createRoundHeader(round)
      );
    }
    
    container.appendChild(
      createFixtureCard(
        tournament,
        match
      )
    );
    
  });
  
  renderRoundList();
}
function getVisibleMatches(tournament, search) {
  let matches = [...(tournament.matches ?? [])];
  
  const maxRound = Math.max(
    ...matches.map(m => m.round || 1),
    1
  );
  
  if (!search && maxRound !== 1) {
    matches = matches.filter(
      m => (m.round || 1) === getCurrentRound()
    );
  }
  
  if (search) {
    matches = matches.filter(m =>
      m.home.toLowerCase().includes(search) ||
      m.away.toLowerCase().includes(search)
    );
  }
  
  matches.sort((a, b) => (a.round || 1) - (b.round || 1));
  
  return matches;
}

function getSubmission(match, tournament) {
  return Object.values(
    tournament.matchSubmissions || {}
  ).find(
    s => String(s.matchId) === String(match.id)
  );
}

function replaceTeamLogo(container, selector, url, name) {
  
  if (!url) return;
  
  const row = container.querySelector(selector);
  
  const placeholder =
    row?.querySelector(".fixture-team-logo-placeholder");
  
  if (!row || !placeholder) return;
  
  const img = document.createElement("img");
  
  img.className = "fixture-team-logo";
  img.src = url;
  img.alt = name;
  
  row.replaceChild(img, placeholder);
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

function createFixtureCard(tournament, match) {
  
  const submission = getSubmission(match, tournament);
  
  const div = document.createElement("div");
  
  div.className =
    `fixture-row ${match.played ? "played" : "not-played"}`;
  
  div.innerHTML = `
    <div class="fixture-label">
      ${tournament.name || "Tournament"} • R${String(match.round || 1).padStart(2, "0")}
      ${getSubmissionBadge(match, submission)}
    </div>

    <div class="fixture-row-content">

      <div class="fixture-teams-stack">

        <div class="team-row-item team-home-container">
          <div class="fixture-team-logo-placeholder">?</div>
          <span class="fixture-team-name">
            ${match.home}
          </span>
        </div>

        <div class="team-row-item team-away-container">
          <div class="fixture-team-logo-placeholder">?</div>
          <span class="fixture-team-name">
            ${match.away}
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
                ${formatMatchDay(match.scheduledAt)}
              </span>
            `
        }

      </div>

    </div>

    ${
      match.played
        ? `
          <div class="match-playedTime">
            ${formatRecordedTime(match.playedAt)}
          </div>
        `
        : ""
    }
  `;
  
  replaceTeamLogo(
    div,
    ".team-home-container",
    tournament.teamLogos?.[match.home],
    match.home
  );
  
  replaceTeamLogo(
    div,
    ".team-away-container",
    tournament.teamLogos?.[match.away],
    match.away
  );
  
  div.style.cursor = "pointer";
  
  div.onclick = () =>
    onFixtureClick(match, submission);
  
  return div;
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
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  tournament.currentRound = Number(round);
  
  setCurrentTournament(tournament);
  
  localStorage.setItem(
    `currentRound_${tournament.id}`,
    String(round)
  );
}
function getCurrentRound() {
  const tournament = getCurrentTournament();
  
  if (!tournament) return 1;
  
  return Number(
    localStorage.getItem(`currentRound_${tournament.id}`) || 1
  );
}

async function nextRound() {
  const current = getCurrentRound();
  const max = getMaxRound();
  
  if (current >= max) return;
  
  setCurrentRound(current + 1);
  renderFixtures();
}


function prevRound() {
  const current = getCurrentRound();
  
  if (current <= 1) return;
  
  setCurrentRound(current - 1);
  renderFixtures();
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

function toggleScreenshotMode() {
  document.querySelector('.table-wrapper').classList.toggle('screenshot-mode');
}




function shareFixtures() {
  const element = document.getElementById('fixtureScreenshotArea');
  
  const track = document.querySelector('#roundCarousel .roundTrack');
  const activeRoundEl = track?.querySelector('.roundText.active');
  
  let titleText = activeRoundEl ? activeRoundEl.textContent.trim() : 'Fixtures';
  const roundText = titleText.replace(/\s+/g, '-');
  
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
      const cloned = doc.getElementById('fixtureScreenshotArea');
      if (cloned) {
        cloned.style.background = '#0d1117';
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
        `fixtures-${roundText}.png`, { type: 'image/png' }
      );
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: titleText,
          text: `Check out the latest ${titleText}!`
        }).catch(err => console.log('Share dismissed', err));
      } else {
        const link = document.createElement('a');
        link.download = `fixtures-${roundText}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
    
  }).catch(err => {
    console.error('Screenshot failed:', err);
    showAlert('Could not take screenshot');
  });
}



window.onload = function() {
  renderTournamentList();
  
  const tournament = getCurrentTournament();
  
  if (tournament?.table) {
    renderTable(getSortedTable(tournament.table));
    
  }
};



function goToFixturePage() {
  
  setActiveNav('fixturesBtn')
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("fixturePage").style.display = "block";
  document.getElementById("fixturePageHead").style.display = "block";
  document.getElementById("nav").style.display = "flex";
  renderFixtures();
  
}


function goToStatPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("statPage").style.display = "block";
}



function goToTeamListPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("teamListPage").style.display = "block";
  document.getElementById("teamListPageHead").style.display = "block";
  document.getElementById("nav").style.display = "none";
  document.getElementById("cupPageHead").style.display = "none";
  renderTeams();
}




function goToTournamentPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  document.getElementById("nav").style.display = "flex";
  document.getElementById("tourListPageHead").style.display = "none";
  
  hideAllPages();
  
  const page = document.getElementById("tournamentPage");
  if (page) page.style.display = "block";
  
  
  goToTablePage();
}



function goToListOfTournamentPage() {
  hideAllPages();
  closeTournamentEvents();
  document.getElementById("listOfTournamentPage").style.display = "flex";
  document.getElementById("tourListPageHead").style.display = "flex";
  currentSwapView = 0;
  updateSwapView();
}




function goToTablePage() {
  toggleView('table')
  setActiveNav("standingsBtn");
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("cupPage").style.display = "none";
  document.getElementById("tablePage").style.display = "block";
  document.getElementById("tablePageHead").style.display = "block";
  document.getElementById("resultRecord").style.display = "none";
  document.getElementById("nav").style.display = "flex";
  showingForm = false;
  
  document.getElementById("tableView").style.display = "block";
  document.getElementById("formView").style.display = "none";
  document.getElementById("customDropdown").style.display = "block";
  
  

  const tournament = getCurrentTournament();
  if (tournament) {
    renderTable(getSortedTable(tournament.table || []));
  }
}



function handleSetScore() {
  const home = document.getElementById("homeTeam").textContent.trim();
  const away = document.getElementById("awayTeam").textContent.trim();
  
  const hg = parseInt(document.getElementById("homeGoals").value);
  const ag = parseInt(document.getElementById("awayGoals").value);
  
  if (!home || !away || home === away || isNaN(hg) || isNaN(ag)) {
    showAlert("Invalid Team or Score input");
    return;
  }
  
  setMatchResult(home, away, hg, ag);
  closeResultRecord();
}





async function generateFixtures(rounds) {
  showLoader();
  try {
    
    const latest = await getMyTournaments();
    const tournament = latest.find(t => String(t.id) === String(getCurrentTournament()?.id));
    if (!tournament) return showAlert("No tournament selected");
    
    let teamsObj = tournament.teams || {};
    
    if (Array.isArray(teamsObj)) {
      const converted = {};
      teamsObj.forEach(name => {
        const id = crypto.randomUUID();
        converted[id] = { id, name, logo: tournament.teamLogos?.[name] || null };
      });
      teamsObj = converted;
    }
    
    const teamArray = Object.values(teamsObj);
    if (teamArray.length < 2) {
      return showAlert("Add at least 2 teams first");
    }
    
    
    let teamNames = teamArray.map(t => t.name);
    
    let matches = [];
    let teamList = [...teamNames];
    
    const hasBye = teamList.length % 2 !== 0;
    if (hasBye) teamList.push("__BYE__");
    
    const numTeams = teamList.length;
    const numRounds = numTeams - 1;
    const halfSize = numTeams / 2;
    
    for (let round = 0; round < numRounds; round++) {
      for (let i = 0; i < halfSize; i++) {
        const home = teamList[i];
        const away = teamList[numTeams - 1 - i];
        
        if (home !== "__BYE__" && away !== "__BYE__") {
          matches.push({
            id: crypto.randomUUID(),
            home,
            away,
            homeGoals: null,
            awayGoals: null,
            played: false,
            round: round + 1,
            date: null,
            time: null
          });
        }
      }
      
      const fixed = teamList[0];
      const rest = teamList.slice(1);
      rest.unshift(rest.pop());
      teamList = [fixed, ...rest];
    }
    
    if (rounds === 2) {
      const returnLegs = matches.map(m => ({
        ...m,
        id: crypto.randomUUID(),
        home: m.away,
        away: m.home,
        round: m.round + numRounds
      }));
      matches = [...matches, ...returnLegs];
    }
    
    matches = assignRoundDatesSmart(matches, tournament);
    
    tournament.matches = matches;
    
    tournament.records = {
      bestAttack: [],
      bestDefense: [],
      goalDifference: [],
      mostWins: [],
      biggestWins: [],
      highestScoringMatches: [],
      longestWinningRuns: [],
      longestUnbeatenRuns: []
    };
    
    
    tournament.table = teamArray.map(t => ({
      id: t.id,
      name: t.name,
      logo: t.logo || tournament.teamLogos?.[t.name] || null,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0
    }));
    
    setCurrentRound(1);
    
    
    await updateTournament(tournament.id, {
      updates: {
        matches: tournament.matches,
        table: tournament.table,
        records: tournament.records
      }
    });
    
    
    const cached = myTournaments.find(t => String(t.id) === String(tournament.id));
    if (cached) {
      cached.matches = tournament.matches;
      cached.table = tournament.table;
      cached.records = tournament.records;
    }
    currentTournament = tournament;
    
    renderFixtures();
    renderTable(tournament.table);
    renderRecords();
    
  } catch (err) {
    console.error("[generateFixtures]", err);
    showAlert(err.message || "Failed to generate fixtures");
  } finally {
    hideLoader();
  }
}



function resetLogoUI() {
  const logoInput = document.getElementById("teamLogoInput");
  const logoPreview = document.getElementById("teamLogoPreview");
  
  logoInput.value = null;
  
  logoPreview.src = "";
  logoPreview.removeAttribute("src");
  logoPreview.classList.remove("show");
}




function getTeamForm(teamName) {
  const tournament = getCurrentTournament();
  if (!tournament?.matches) return [];
  
  const teamMatches = tournament.matches
    .filter(m => m.played && (m.home === teamName || m.away === teamName))
    .filter(m => m.playedAt)
    .sort((a, b) => b.playedAt - a.playedAt)
    .slice(0, 5);
  
  console.log(teamName, "matches found:", teamMatches.length, teamMatches);
  
  return teamMatches.map(m => {
    const isHome = m.home === teamName;
    const goalsFor = isHome ? m.homeGoals : m.awayGoals;
    const goalsAgainst = isHome ? m.awayGoals : m.homeGoals;
    
    if (goalsFor > goalsAgainst) return '✓';
    if (goalsFor < goalsAgainst) return '✕';
    return '–';
  });
}



function renderFormView() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container = document.getElementById("formContainer");
  if (!container) return;
  
  container.innerHTML = "";
  
  const sortedTable = getSortedTable(
    [...(tournament.table || [])]
  );
  
  sortedTable.forEach((tableRow, index) => {
    const teamName = tableRow.name;
    const form = getTeamForm(teamName);
    
    const logoUrl = tournament.teamLogos?.[teamName];
    
    const row = document.createElement("div");
    row.className = "form-row";
    row.setAttribute("data-index", index);
    
    row.innerHTML = `
      <div class="form-team">

        <span class="form-position">
          ${index + 1}
        </span>

        ${
          logoUrl
          ? `<img 
              class="Form-team-logo"
              src="${logoUrl}"
              alt="${teamName}"
            >`
          : `<div class="team-logo-placeholder">⚽</div>`
        }

        <span>${teamName}</span>

      </div>

      <div class="form-results">
        ${form.map(result => `
          <span class="form-badge ${result}">
            ${result}
          </span>
        `).join("")}
      </div>
    `;
    
    container.appendChild(row);
  });
}


function getSortedTable(table) {
  return [...table].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    
    return gdB - gdA;
  });
}



function getPlayedMatches(matches) {
  return matches.filter(
    m =>
    m.played === true &&
    typeof m.homeGoals === "number" &&
    typeof m.awayGoals === "number"
  );
}


function getRecords(matches) {
  return {
    bestAttack: getBestAttack(matches),
    bestDefense: getBestDefense(matches),
    goalDifference: getGoalDifference(matches),
    mostWins: getMostWins(matches),
    
    biggestWins: getBiggestWins(matches),
    highestScoringMatches: getHighestScoringMatches(matches),
    mostGoalsInMatch: getMostGoalsInMatch(matches),
    
    longestWinningRuns: getLongestWinningRuns(matches),
    longestUnbeatenRuns: getLongestUnbeatenRuns(matches)
  };
}

function getBestAttack(matches) {
  const playedMatches = getPlayedMatches(matches);
  
  const goals = {};
  
  playedMatches.forEach(m => {
    goals[m.home] = (goals[m.home] || 0) + m.homeGoals;
    goals[m.away] = (goals[m.away] || 0) + m.awayGoals;
  });
  
  return Object.entries(goals)
    .sort((a, b) => b[1] - a[1]);
}


function getBestDefense(matches) {
  const conceded = {};
  
  matches.forEach(m => {
    conceded[m.home] = (conceded[m.home] || 0) + m.awayGoals;
    conceded[m.away] = (conceded[m.away] || 0) + m.homeGoals;
  });
  
  return Object.entries(conceded)
    .sort((a, b) => a[1] - b[1]);
}



function getGoalDifference(matches) {
  const gd = {};
  
  matches.forEach(m => {
    gd[m.home] = (gd[m.home] || 0) + (m.homeGoals - m.awayGoals);
    gd[m.away] = (gd[m.away] || 0) + (m.awayGoals - m.homeGoals);
  });
  
  return Object.entries(gd)
    .sort((a, b) => b[1] - a[1]);
}

function getMostWins(matches) {
  const playedMatches = matches.filter(
    m => m.played
  );
  
  const wins = {};
  
  playedMatches.forEach(m => {
    if (m.homeGoals > m.awayGoals) {
      wins[m.home] = (wins[m.home] || 0) + 1;
    } else if (m.awayGoals > m.homeGoals) {
      wins[m.away] = (wins[m.away] || 0) + 1;
    }
  });
  
  return Object.entries(wins)
    .sort((a, b) => b[1] - a[1]);
}



function getBiggestWins(matches) {
  return getPlayedMatches(matches)
    .map(match => ({
      ...match,
      margin: Math.abs(
        match.homeGoals - match.awayGoals
      )
    }))
    .sort((a, b) => b.margin - a.margin);
}


function getHighestScoringMatches(matches) {
  return getPlayedMatches(matches)
    .map(m => ({
      ...m,
      totalGoals: m.homeGoals + m.awayGoals
    }))
    .sort((a, b) => b.totalGoals - a.totalGoals);
}



function getMostGoalsInMatch(matches) {
  return getHighestScoringMatches(matches);
}

function getLongestWinningRuns(matches) {
  const playedMatches = getPlayedMatches(matches);
  
  const streaks = {};
  
  playedMatches.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = { current: 0, best: 0 };
      }
    });
    
    if (m.homeGoals > m.awayGoals) {
      streaks[m.home].current++;
      streaks[m.away].current = 0;
    } else if (m.awayGoals > m.homeGoals) {
      streaks[m.away].current++;
      streaks[m.home].current = 0;
    } else {
      streaks[m.home].current = 0;
      streaks[m.away].current = 0;
    }
    
    streaks[m.home].best = Math.max(
      streaks[m.home].best,
      streaks[m.home].current
    );
    
    streaks[m.away].best = Math.max(
      streaks[m.away].best,
      streaks[m.away].current
    );
  });
  
  return Object.entries(streaks)
    .map(([team, data]) => [team, data.best])
    .sort((a, b) => b[1] - a[1]);
}

function renderRecords() {
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.matches) return;
  
  renderChampionPodium();
  const records = getRecords(tournament.matches);
  
  renderTop5("bestAttack", records.bestAttack, "⚽ Top Scorers", "goals");
  
  renderTop5(
    "bestDefense",
    records.bestDefense,
    "🛡 Best Defensive Teams",
    "conceded"
  );
  
  renderTop5(
    "goalDifference",
    records.goalDifference,
    "📈 Best Goal Difference"
  );
  
  renderTop5(
    "mostWins",
    records.mostWins,
    "👑 Most Wins",
    "wins"
  );
  
  renderMatchCard(
    "biggestWin",
    records.biggestWins[0],
    "💥 Biggest Win",
    `Margin: +${records.biggestWins[0]?.margin || 0}`
  );
  
  renderMatchCard(
    "highestScoringMatch",
    records.highestScoringMatches[0],
    "🔥 Highest Scoring Match",
    `Total Goals: ${records.highestScoringMatches[0]?.totalGoals || 0}`
  );
  
  renderStreakCard(
    "longestWinningRun",
    records.longestWinningRuns,
    "👑 Longest Winning Run",
    "wins"
  );
  
  renderStreakCard(
    "longestUnbeatenRun",
    records.longestUnbeatenRuns,
    "🚧 Longest Unbeaten Run",
    "matches"
  );
}

function renderTop5(containerId, dataArray, title, suffix = "") {
  const el = document.getElementById(containerId);
  
  if (!el || !Array.isArray(dataArray)) return;
  
  const tournament = getCurrentTournament();
  const top5 = dataArray.slice(0, 5);
  
  let rowsHtml = "";
  
  top5.forEach((item, index) => {
    let teamName = "";
    let value = "";
    
    if (Array.isArray(item)) {
      teamName = item[0];
      value = item[1];
    } else if (item && typeof item === "object") {
      teamName = item.team || item.name || "";
      
      if ("value" in item) {
        value = item.value;
      } else if (suffix && item[suffix] !== undefined) {
        value = item[suffix];
      } else {
        const keys = Object.keys(item).filter(
          key => !["team", "name"].includes(key)
        );
        
        value = keys.length ? item[keys[0]] : "";
      }
    }
    
    if (value === undefined || value === null || Number.isNaN(value)) {
      value = "";
    }
    
    rowsHtml += `
      <div class="top5-row item-index-${index}">
        <div class="team-side">
          <span class="rank-number">${index + 1}.</span>
          <div class="team-logo-placeholder">?</div>
          <span>${teamName}</span>
        </div>

        <div class="record-value">
          ${value}
          ${
            suffix
              ? `<span class="record-suffix">${suffix}</span>`
              : ""
          }
        </div>
      </div>
    `;
  });
  
  el.innerHTML = `
    <div class="record-card top5-card">
      <div class="record-title">
        ${title}
      </div>

      <div class="top5-list">
        ${rowsHtml}
      </div>
    </div>
  `;
  
  top5.forEach((item, index) => {
    const teamName = Array.isArray(item) ?
      item[0] :
      (item.team || item.name);
    
    const logo = tournament?.teamLogos?.[teamName];
    
    if (!logo) return;
    
    const row = el.querySelector(
      `.item-index-${index} .team-side`
    );
    
    const placeholder = row?.querySelector(
      ".team-logo-placeholder"
    );
    
    if (!row || !placeholder) return;
    
    const img = document.createElement("img");
    img.className = "team-logo";
    img.src = logo;
    img.alt = teamName;
    
    row.replaceChild(img, placeholder);
  });
}

function renderStreakCard(containerId, dataArray, title, suffix = "") {
  const el = document.getElementById(containerId);
  if (!el || !dataArray) return;
  
  const tournament = getCurrentTournament();
  
  const normalizedData = Array.isArray(dataArray[0]) ?
    dataArray : [dataArray];
  
  const top3 = normalizedData.slice(0, 3);
  
  let rowsHtml = "";
  
  top3.forEach((data, index) => {
    if (!data || data.length < 2) return;
    
    const [team, value] = data;
    
    const medal =
      index === 0 ? "🥇" :
      index === 1 ? "🥈" : "🥉";
    
    rowsHtml += `
      <div class="streak-row streak-row-item-${index}" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div class="team-side" style="display:flex;align-items:center;gap:8px;">
          <span class="medal">${medal}</span>
          <div class="team-logo-placeholder">?</div>
          <span>${team}</span>
        </div>

        <div class="record-sub">
          <b>${value}</b> ${suffix}
        </div>
      </div>
    `;
  });
  
  el.innerHTML = `
    <div class="record-card hero streak-card">
      <div class="record-title" style="margin-bottom:12px;font-weight:bold;">
        ${title}
      </div>

      <div class="streak-list">
        ${rowsHtml}
      </div>
    </div>
  `;
  
  top3.forEach((data, index) => {
    if (!data || data.length < 2) return;
    
    const [team] = data;
    
    const logoKey = tournament.teamLogos?.[team];
    
    if (logoKey) {
      const rowNode = el.querySelector(`.streak-row-item-${index} .team-side`);
      const placeholder = rowNode?.querySelector(".team-logo-placeholder");
      
      if (rowNode && placeholder) {
        const img = document.createElement("img");
        img.className = "team-logo";
        img.src = logoKey;
        img.alt = team;
        img.style.width = "24px";
        img.style.height = "24px";
        img.style.objectFit = "contain";
        
        img.onerror = () => {
          console.warn("Failed to load logo:", logoKey);
        };
        
        rowNode.replaceChild(img, placeholder);
      }
    }
  });
}

function getLeagueWinnerFinal() {
  const tournament = getCurrentTournament();
  if (!tournament) return null;
  
  const matches = tournament.matches || [];
  
  // Support object teams
  const teams = Object.values(tournament.teams || {});
  
  const table = {};
  
  teams.forEach(team => {
    table[team.name] = {
      name: team.name,
      p: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      pts: 0,
      remaining: 0
    };
  });
  
  let allPlayed = true;
  
  matches.forEach(match => {
    if (!match) return;
    
    if (!table[match.home] || !table[match.away]) return;
    
    if (!match.played) {
      allPlayed = false;
      table[match.home].remaining++;
      table[match.away].remaining++;
      return;
    }
    
    const hg = Number(match.homeGoals ?? match.homeScore ?? 0);
    const ag = Number(match.awayGoals ?? match.awayScore ?? 0);
    
    const home = table[match.home];
    const away = table[match.away];
    
    home.p++;
    away.p++;
    
    home.gf += hg;
    home.ga += ag;
    
    away.gf += ag;
    away.ga += hg;
    
    if (hg > ag) {
      home.w++;
      home.pts += 3;
      away.l++;
    } else if (ag > hg) {
      away.w++;
      away.pts += 3;
      home.l++;
    } else {
      home.d++;
      away.d++;
      home.pts++;
      away.pts++;
    }
  });
  
  const sorted = Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    
    if (gdB !== gdA) return gdB - gdA;
    
    return b.gf - a.gf;
  });
  
  if (!sorted.length) return null;
  
  const leader = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  
  const allGamesPlayed = sorted.every(t => t.remaining === 0);
  
  if (allGamesPlayed) {
    return {
      team: leader.name,
      pts: leader.pts,
      gd: leader.gf - leader.ga,
      finished: true,
      decided: true
    };
  }
  
  if (
    second &&
    third &&
    leader.remaining === 0 &&
    second.remaining === 0
  ) {
    const thirdMax = third.pts + third.remaining * 3;
    const top2Min = Math.min(leader.pts, second.pts);
    
    if (thirdMax < top2Min) {
      return {
        team: leader.name,
        pts: leader.pts,
        gd: leader.gf - leader.ga,
        finished: false,
        decided: true
      };
    }
  }
  
  const decided = sorted.every(team => {
    if (team.name === leader.name) return true;
    
    return team.pts + team.remaining * 3 < leader.pts;
  });
  
  if (!decided) {
    return {
      team: "TBD",
      pts: null,
      gd: null,
      finished: false,
      decided: false
    };
  }
  
  return {
    team: leader.name,
    pts: leader.pts,
    gd: leader.gf - leader.ga,
    finished: false,
    decided: true
  };
}

function renderChampionPodium() {
  const el = document.getElementById("championPodium");
  const tournament = getCurrentTournament();
  if (!el || !tournament) return;
  
  const winner = getLeagueWinnerFinal();
  if (!winner) return;
  
  const logoKey = tournament.teamLogos?.[winner.team];
  const tournamentLogo = tournament.tournamentImage || "";
  
  const isDecided = winner.decided && winner.team !== "TBD";
  
  el.innerHTML = `
    <div class="champion-card">

      <div class="champion-tournament-logo">
        ${
          tournamentLogo
            ? `<img src="${tournamentLogo}" class="tournament-logo">`
            : ""
        }
      </div>

      <div class="champion-title">
        🏆 ${isDecided ? "CHAMPION" : "WINNER TBD"}
      </div>

      ${
        isDecided
          ? `
          <div class="champion-team-logo-wrap">
            <div class="team-logo-placeholder">?</div>
          </div>
        `
          : ""
      }

      <div class="champion-name">
        ${winner.team}
      </div>

      ${
        isDecided
          ? `<div class="champion-stats">${winner.pts} pts • GD ${winner.gd}</div>`
          : `<div class="champion-stats">League in progress</div>`
      }

    </div>
  `;
  
  if (isDecided && logoKey) {
    const wrap = el.querySelector(".champion-team-logo-wrap");
    const placeholder = wrap?.querySelector(".team-logo-placeholder");
    
    if (wrap && placeholder) {
      const img = document.createElement("img");
      img.className = "champion-team-logo";
      img.src = logoKey;
      img.alt = winner.team;
      
      img.onerror = () => {
        console.warn("Failed to load champion logo:", logoKey);
      };
      
      wrap.replaceChild(img, placeholder);
    }
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



function renderMatchCard(containerId, match, title, extraLabel = "") {
  const el = document.getElementById(containerId);
  if (!el || !match) return;
  
  const tournament = getCurrentTournament();
  
  const homeLogoKey = tournament.teamLogos?.[match.home];
  const awayLogoKey = tournament.teamLogos?.[match.away];
  
  el.innerHTML = `
    <div class="record-card hero">
      <div class="record-title">${title}</div>

      <div class="match-vertical">

        <div class="team-row card-home-container">
          <div class="team-side">
            <div class="team-logo-placeholder">?</div>
            <span>${match.home}</span>
          </div>

          <div class="team-score">
            <b>${match.homeGoals}</b>
          </div>
        </div>

        <div class="team-row card-away-container">
          <div class="team-side">
            <div class="team-logo-placeholder">?</div>
            <span>${match.away}</span>
          </div>

          <div class="team-score">
            <b>${match.awayGoals}</b>
          </div>
        </div>

        <div class="record-sub center">
          ${extraLabel}
        </div>

      </div>
    </div>
  `;
  
  if (homeLogoKey) {
    const homeRow = el.querySelector(".card-home-container .team-side");
    const placeholder = homeRow?.querySelector(".team-logo-placeholder");
    
    if (homeRow && placeholder) {
      const img = document.createElement("img");
      img.className = "team-logo";
      img.src = homeLogoKey;
      img.alt = match.home;
      
      homeRow.replaceChild(img, placeholder);
    }
  }
  
  if (awayLogoKey) {
    const awayRow = el.querySelector(".card-away-container .team-side");
    const placeholder = awayRow?.querySelector(".team-logo-placeholder");
    
    if (awayRow && placeholder) {
      const img = document.createElement("img");
      img.className = "team-logo";
      img.src = awayLogoKey;
      img.alt = match.away;
      
      awayRow.replaceChild(img, placeholder);
    }
  }
}


let myTournaments = [];

async function renderTournamentList() {
  const container = document.getElementById("tournamentList");
  if (!container) return;
  
  container.innerHTML = `<p class="emptyText">Loading tournaments...</p>`;
  
  let tournaments = [];
  
  try {
    tournaments = await getMyTournaments();
    myTournaments = tournaments;
  } catch (err) {
    container.innerHTML = `
      <p class="emptyText">
        ${err.message}
      </p>
    `;
    return;
  }
  
  const currentUser = getCurrentUser();
  
  container.innerHTML = "";
  
if (!tournaments || tournaments.length === 0) {
  
  const user = getCurrentUser();
  
  container.innerHTML = `
    <p class="emptyText">
      No tournaments available
      <br><br>
      ${
        user?.role === "player"
          ? "Tournaments will appear here as soon as you are invited to join."
          : "Tournaments will appear here as soon as you create one. Click the side menu to create one."
      }
    </p>
  `;
  
  return;
}  
  for (const tournament of tournaments) {
    
    const div = document.createElement("div");
    div.className = "tournament-card";
    div.dataset.id = tournament.id;
    
    const isSelected =
      typeof selectedTournaments !== "undefined" &&
      selectedTournaments.includes(tournament.id);
    
    const imgId = `tournament-img-${tournament.id}`;
    
    const playerInfo = tournament.players?.[currentUser?.uid];
    const isPlayer = currentUser?.role === "player";
    const pendingInvitation =
      isPlayer &&
      playerInfo?.hasNewInvitation === true;
    
    div.innerHTML = `
      ${(typeof exportMode !== "undefined" && exportMode) ? `
        <div class="check">
          ${isSelected ? "✔" : ""}
        </div>
      ` : ""}

      <div class="card-header">

        <div class="tournament-format">
          ${tournament.format || "League"}
        </div>

        ${
          pendingInvitation
            ? ""
            : `
              <div class="tournament-menu-btn data-admin">☰</div>
            `
        }

      </div>

      <div class="tournament-image">
        <span id="${imgId}" class="tournament-image-placeholder">🏆</span>
      </div>

      <h3>${tournament.name}</h3>

      ${
        pendingInvitation
          ? `
            <div class="invitation-actions">
              <button class="accept-btn">Join</button>
              <button class="decline-btn">Decline</button>
            </div>
          `
          : `
            <div class="menu-dropdown hidden" id="menu-${tournament.id}">
              <div class="menu-itemList edit data-admin">Edit</div>
              <div class="menu-itemList delete data-admin">Delete</div>
            </div>
          `
      }
    `;
    
    if (!pendingInvitation) {
      
      const menuBtn = div.querySelector(".tournament-menu-btn");
      const dropdown = div.querySelector(`#menu-${tournament.id}`);
      const editBtn = div.querySelector(".menu-itemList.edit");
      const deleteBtn = div.querySelector(".menu-itemList.delete");
      
      menuBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        
        document.querySelectorAll(".menu-dropdown").forEach(el => {
          if (el !== dropdown) el.classList.add("hidden");
        });
        
        dropdown.classList.toggle("hidden");
      });
      
      editBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        
        if (typeof editTournament === "function") {
          editTournament(tournament.id);
        }
        
        dropdown.classList.add("hidden");
      });
      
      deleteBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        
        if (typeof deleteTournament === "function") {
          deleteTournament(tournament.id);
        }
        
        dropdown.classList.add("hidden");
      });
      
    } else {
      
      div.querySelector(".accept-btn")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        
        showInvitationModal({
          title: "Tournament Invitation",
          message: `You are invited to join "${tournament.name}"?`,
          showInput: false,
          confirmText: "Join",
          cancelText: "Cancel",
          onConfirm: async () => {
            await respondToInvitation(tournament.id, "accept");
          }
        });
      });
      
      div.querySelector(".decline-btn")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        
        showInvitationModal({
          title: "Tournament Invitation",
          message: `Decline invitation to "${tournament.name}"?`,
          showInput: false,
          confirmText: "Decline",
          cancelText: "Cancel",
          onConfirm: async () => {
            await respondToInvitation(tournament.id, "decline");
          }
        });
      });
      
    }
    
    div.addEventListener("click", (e) => {
      
      if (pendingInvitation) return;
      
      if (e.target.closest(".menu-dropdown")) return;
      
      if (typeof exportMode !== "undefined" && exportMode) {
        
        if (typeof toggleSelect === "function") {
          toggleSelect(tournament.id);
        }
        
        return;
      }
      
      openTournament(tournament.id);
      
    });
    
    
    container.appendChild(div);
    
    
    if (tournament.tournamentImage) {
      
      const placeholder = document.getElementById(imgId);
      
      if (placeholder) {
        
        const img = document.createElement("img");
        img.src = tournament.tournamentImage;
        img.alt = tournament.name;
        img.className = "tournament-image-img";
        
        placeholder.replaceWith(img);
        
      }
      
    }
    
    
  }
  
  
  if (!window._tournamentMenuListener) {
    
    document.addEventListener("click", () => {
      
      document.querySelectorAll(".menu-dropdown").forEach(el => {
        el.classList.add("hidden");
      });
      
    });
    
    window._tournamentMenuListener = true;
    
  }
  
  
}




async function saveEdit() {
  const tournament = getCurrentTournament();
  
  if (!tournament || editingIndex === null) {
    showAlert("Something went wrong. Please try again");
    return;
  }
  
  const newName = document.getElementById("editNameInput").value.trim();
  const fileInput = document.getElementById("editLogoInput");
  const oldName = tournament.teams[editingIndex];
  
  if (!newName) {
    showAlert("Team name cannot be empty");
    return;
  }
  
  if (
    newName !== oldName &&
    tournament.teams.some(
      (team, i) => i !== editingIndex && team === newName
    )
  ) {
    showAlert("A team with this name already exists");
    return;
  }
  
  tournament.teams[editingIndex] = newName;
  
  if (fileInput?.files?.length) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result;
        
        const logoKey = `logo_${tournament.id}_${newName.replace(/\s+/g, "_")}`;
        
        await saveLogoToIndexedDB(logoKey, base64);
        
        tournament.teamLogos[newName] = logoKey;
        
        if (
          oldName !== newName &&
          tournament.teamLogos[oldName]
        ) {
          delete tournament.teamLogos[oldName];
        }
        
        await handleSave(tournament, newName, oldName);
        
      } catch (err) {
        console.error(err);
        showActionModal("Failed to save logo", "delete");
      }
    };
    
    reader.onerror = () => {
      showAlert(
        "Failed to read image.<br>Ensure you selected a PNG or JPEG file."
      );
    };
    
    reader.readAsDataURL(fileInput.files[0]);
    
    return;
  }
  
  await handleSave(tournament, newName, oldName);
}

async function sendMatchSubmission() {
  
  const tournament = getCurrentTournament();
  
  if (!tournament || !currentMatch) {
    return;
  }
  
  const homeGoals = Number(document.getElementById("homeGoals").value);
  const awayGoals = Number(document.getElementById("awayGoals").value);
  
  if (isNaN(homeGoals) || isNaN(awayGoals)) {
    return showAlert("Enter both scores.");
  }
  
  const file =
    document.getElementById("matchScreenshot").files[0];
  
  if (!file) {
    return showAlert("Please upload a match screenshot.");
  }
  
  showLoader();
  
  try {
    
    const screenshot = await fileToBase64(file);
    
    await submitMatchResult({
      tournamentId: tournament.id,
      matchId: currentMatch.id,
      homeGoals,
      awayGoals,
      screenshot
    });
    
    closeResultRecord();
    
    showActionModal(
      "Result submitted for admin approval.",
      "success"
    );
    await refreshCurrentTournament();
    await renderFixtures();
    
  } catch (err) {
    
    console.error(err);
    
    showAlert(err.message);
    
  } finally {
   
    hideLoader();
    
  }
  
}