function toggleScreenshotMode() {
  document.querySelector('.table-wrapper').classList.toggle('screenshot-mode');
}
async function generateFixtures(rounds) {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) {
    showAlert(
      "No tournament selected"
    );
    return;
  }
  
  const user =
    getCurrentUser();
  
  if (
    !user ||
    user.role !== "admin"
  ) {
    showAlert(
      "Access denied"
    );
    return;
  }
  
  const confirmed =
    await showConfirmModal(
      "Existing fixtures will be replaced. Continue?",
      "Generate",
      "Cancel"
    );
  
  if (!confirmed) return;
  
  showLoader();
  
  try {
    const token =
      getToken();
    
    const res =
      await fetch(
        `${API}/tournaments/${tournament.id}/generate-fixtures`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token
          },
          body: JSON.stringify({
            rounds: Number(rounds || 1)
          })
        }
      );
    
    const result =
      await res.json();
    
    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Failed to generate fixtures"
      );
    }
    
    const newMatches =
      result.matches || [];
    
    fixtures =
      await buildFixturesFromMatches(
        newMatches,
        tournament.id
      );
    
    fixturesLoaded =
      true;
    
    fixturesTournamentId =
      tournament.id;
    
    currentTournament = {
      ...tournament,
      matches: newMatches
    };
    
    const cached =
      myTournaments.find(
        t =>
        String(t.id) ===
        String(tournament.id)
      );
    
    if (cached) {
      cached.matches =
        newMatches;
    }
    
    setCurrentTournament(
      currentTournament
    );
    
    setCurrentRound(1);
    
    await renderFixtures();
    
    await rebuildTableFromMatches();
    
  } catch (err) {
    console.error(
      "[generateFixtures]",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to generate fixtures"
    );
    
  } finally {
    hideLoader();
  }
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


function toggleFriendlyFixtureButtons() {
  const buttons = document.getElementById(
    "friendlyFixtureButtons"
  );
  
  if (!buttons) return;
  
  const tournament = getCurrentTournament();
  
  const isFriendly =
    tournament?.format?.toLowerCase() === "friendly";
  
  buttons.style.display = isFriendly ? "flex" : "none";
}


function goToCupPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("cupPage").style.display = "block";
  document.getElementById("cupPageHead").style.display = "none";
  
  if (shouldOpenKnockoutDirectly()) {
    toggleCupView("knockOut");
    document.getElementById("cupTab").style.display = "none";
    document.getElementById("btnbackBracket").style.display = "block";
    return;
  }
  
  toggleCupView("tables");
}

function goToFixturePage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("fixturePage").style.display = "block";
  document.getElementById("fixturePageHead").style.display = "none";
  document.querySelectorAll(".competition-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === "fixtures");
  });
  
  toggleFriendlyFixtureButtons();
  renderFixtures();
}

function goToStatPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("recordsView").style.display = "block";
  initializeStatsNavigation();
  renderRecords();
  document.querySelectorAll(".competition-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === "stats");
  });
}





function goToTournamentPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  
  hideAllPages();
  
  const page = document.getElementById("tournamentPage");
  if (page) page.style.display = "block";
  
  const header = document.getElementById("tournamentHeader");
  if (header) header.style.display = "block";
  
  const tableButton = document.querySelector(
    '.competition-nav-btn[data-view="standings"]'
  );
  
  const searchInput = document.getElementById(
    "fixtureSearchInput"
  );
  
  if (
    getCurrentTournament()?.format === "cup" &&
    shouldOpenKnockoutDirectly()
  ) {
    goToFixturePage();
    
    if (tableButton) {
      tableButton.style.display = "none";
    }
    
    if (searchInput) {
      searchInput.style.display = "none";
    }
    
    return;
  }
  
  if (tableButton) {
    tableButton.style.display = "";
  }
  
  if (searchInput) {
    searchInput.style.display = "";
  }
  
  goToTablePage();
}

function goToTablePage() {
  toggleView("table");
  setActiveNav("standingsBtn");
  
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("cupPage").style.display = "none";
  document.getElementById("tablePage").style.display = "block";
  document.getElementById("tablePageHead").style.display = "none";
  document.getElementById("resultRecord").style.display = "none";
  
  document.getElementById("tableView").style.display = "block";
  document.getElementById("formView").style.display = "none";
  document.querySelectorAll(".competition-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === "standings");
  });
  
  showingForm = false;
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
  const menu = document.getElementById("dropdownMenu");
  
  if (dropdown && menu && !dropdown.contains(e.target)) {
    menu.classList.remove("show");
  }
});





function resetLogoUI() {
  const logoInput = document.getElementById("teamLogoInput");
  const logoPreview = document.getElementById("teamLogoPreview");
  
  logoInput.value = null;
  
  logoPreview.src = "";
  logoPreview.removeAttribute("src");
  logoPreview.classList.remove("show");
}






function resolvePlayerStatsMatches(matches, tournament) {
  const participantsByTeamId = new Map(
    (tournament?.tournament_players || [])
    .filter(player => player.team_id)
    .map(player => [
      String(player.team_id),
      player
    ])
  );
  
  return matches.map(match => {
    const homeParticipant = participantsByTeamId.get(
      String(match.home_team_id || "")
    );
    
    const awayParticipant = participantsByTeamId.get(
      String(match.away_team_id || "")
    );
    
    return {
      ...match,
      home: homeParticipant?.username || match.home || "Unknown",
      away: awayParticipant?.username || match.away || "Unknown",
      homeParticipant,
      awayParticipant,
      homeTeamName: homeParticipant?.team_name || "",
      awayTeamName: awayParticipant?.team_name || "",
      homeLogo: homeParticipant?.team_logo || "",
      awayLogo: awayParticipant?.team_logo || "",
      homeGoals: Number(match.homeGoals ?? match.home_score ?? 0),
      awayGoals: Number(match.awayGoals ?? match.away_score ?? 0),
      played: match.played === true || Number(match.played) === 1,
      playedAt: match.playedAt ?? match.played_at
    };
  });
}


function getRecordPlayer(username) {
  const tournament = getCurrentTournament();
  
  return (tournament?.tournament_players || []).find(
    player => player.username === username
  ) || null;
}



function getPlayedMatches(matches) {
  return matches.filter(
    match =>
    (match.played === true || Number(match.played) === 1) &&
    Number.isFinite(match.homeGoals) &&
    Number.isFinite(match.awayGoals)
  );
}

function switchStatsTab(tab) {
  const navigation =
    document.getElementById("statsNavigation");
  
  if (!navigation) return;
  
  const validTabs = [
    "overview",
    "teams",
    "players",
    "records",
    "matches"
  ];
  
  if (!validTabs.includes(tab)) return;
  
  navigation.querySelectorAll(".stats-nav-btn")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.statsTab === tab
      );
    });
  
  document.querySelectorAll("#recordsView .stats-panel")
    .forEach(panel => {
      panel.classList.toggle(
        "active",
        panel.id === `stats-${tab}`
      );
    });
}

function initializeStatsNavigation() {
  const navigation =
    document.getElementById("statsNavigation");
  
  if (!navigation || navigation.dataset.initialized) {
    return;
  }
  
  navigation.dataset.initialized = "true";
  
  navigation.addEventListener("click", event => {
    const button = event.target.closest(".stats-nav-btn");
    
    if (!button) return;
    
    switchStatsTab(button.dataset.statsTab);
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
  
  getPlayedMatches(matches).forEach(match => {
    conceded[match.home] =
      (conceded[match.home] || 0) + match.awayGoals;
    
    conceded[match.away] =
      (conceded[match.away] || 0) + match.homeGoals;
  });
  
  return Object.entries(conceded)
    .sort((a, b) => a[1] - b[1]);
}

function getGoalDifference(matches) {
  const gd = {};
  
  getPlayedMatches(matches).forEach(match => {
    gd[match.home] =
      (gd[match.home] || 0) +
      (match.homeGoals - match.awayGoals);
    
    gd[match.away] =
      (gd[match.away] || 0) +
      (match.awayGoals - match.homeGoals);
  });
  
  return Object.entries(gd)
    .sort((a, b) => b[1] - a[1]);
}

function getMostWins(matches) {
  const wins = {};
  
  getPlayedMatches(matches).forEach(match => {
    if (match.homeGoals > match.awayGoals) {
      wins[match.home] = (wins[match.home] || 0) + 1;
    } else if (match.awayGoals > match.homeGoals) {
      wins[match.away] = (wins[match.away] || 0) + 1;
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
  const playedMatches = getPlayedMatches(matches)
    .sort((a, b) => {
      return new Date(a.playedAt) - new Date(b.playedAt);
    });
  
  const streaks = {};
  
  playedMatches.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = {
          current: 0,
          best: 0
        };
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





function getRecordTeamLogo(username) {
  if (!username) return null;
  
  const tournament = getCurrentTournament();
  
  const participant = (tournament?.tournament_players || []).find(
    player =>
    String(player.username || "").toLowerCase() ===
    String(username).toLowerCase()
  );
  
  return participant?.team_logo || null;
}


function renderStreakCard(
  containerId,
  dataArray,
  title,
  suffix = ""
) {
  const el = document.getElementById(containerId);
  
  if (!el || !Array.isArray(dataArray)) return;
  
  const normalizedData = Array.isArray(dataArray[0]) ?
    dataArray : [dataArray];
  
  const top3 = normalizedData.slice(0, 3);
  
  let rowsHtml = "";
  
  top3.forEach((data, index) => {
    if (!data || data.length < 2) return;
    
    const username = data[0];
    const value = data[1];
    const player = getRecordPlayer(username);
    
    const medal = ["🥇", "🥈", "🥉"][index];
    const logo = player?.team_logo || "";
    const teamName = player?.team_name || "";
    
    rowsHtml += `
      <div
        class="streak-row streak-row-item-${index}"
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:8px;
        "
      >
        <div
          class="team-side"
          style="
            display:flex;
            align-items:center;
            gap:8px;
          "
        >
          <span class="medal">${medal}</span>

          ${
            logo
              ? `
                <img
                  src="${escapeHtml(logo)}"
                  class="team-logo"
                  alt=""
                  style="
                    width:24px;
                    height:24px;
                    min-width:24px;
                    min-height:24px;
                    object-fit:contain;
                  "
                >
              `
              : `
                <div class="team-logo-placeholder">?</div>
              `
          }

          <div>
            <div>${escapeHtml(String(username))}</div>
            ${
              teamName
                ? `
                  <div style="font-size:11px;opacity:0.65;">
                    ${escapeHtml(teamName)}
                  </div>
                `
                : ""
            }
          </div>
        </div>

        <div class="record-sub">
          <b>${escapeHtml(String(value))}</b> ${escapeHtml(suffix)}
        </div>
      </div>
    `;
  });
  
  el.innerHTML = `
    <div class="record-card hero streak-card">
      <div
        class="record-title"
        style="margin-bottom:12px;font-weight:bold;"
      >
        ${escapeHtml(title)}
      </div>

      <div class="streak-list">
        ${rowsHtml}
      </div>
    </div>
  `;
}





function renderStatRecord(
  containerId,
  record,
  title,
  suffix = ""
) {
  const el = document.getElementById(containerId);
  
  if (!el) return;
  
  if (!record) {
    el.innerHTML = "";
    return;
  }
  
  const player = record.team;
  const value = record.value ?? 0;
  const playerData = record.player || null;
  const logo = playerData?.team_logo || getRecordTeamLogo(player);
  const teamName = playerData?.team_name || "";
  
  el.innerHTML = `
    <div class="record-card hero streak-card">
      <div
        class="record-title"
        style="
          margin-bottom:12px;
          font-weight:bold;
        "
      >
        ${escapeHtml(title)}
      </div>

      <div class="streak-list">
        <div
          class="streak-row streak-row-item-0"
          style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            margin-bottom:8px;
          "
        >
          <div
            class="team-side"
            style="
              display:flex;
              align-items:center;
              gap:8px;
            "
          >
            <span class="medal">🥇</span>

            ${
              logo
                ? `
                  <img
                    src="${escapeHtml(logo)}"
                    class="team-logo"
                    alt=""
                    style="
                      width:24px;
                      height:24px;
                      min-width:24px;
                      min-height:24px;
                      display:inline-block;
                      object-fit:contain;
                    "
                  >
                `
                : `
                  <div
                    class="team-logo-placeholder"
                    style="
                      width:24px;
                      height:24px;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      background:#eee;
                      border-radius:50%;
                    "
                  >
                    ?
                  </div>
                `
            }

            <div>
              <span>${escapeHtml(String(player))}</span>
              ${
                teamName
                  ? `
                    <div style="font-size:11px;opacity:0.65;">
                      ${escapeHtml(teamName)}
                    </div>
                  `
                  : ""
              }
            </div>
          </div>

          <div class="record-sub">
            <b>${escapeHtml(String(value))}${escapeHtml(suffix)}</b>
          </div>
        </div>

        <div
          style="
            margin-top:8px;
            font-size:12px;
            opacity:0.7;
            text-align:right;
          "
        >
          vs ${escapeHtml(String(record.opponent ?? ""))}
          ${
            record.opponentValue != null
              ? ` (${escapeHtml(String(record.opponentValue))})`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function renderTop5(
  containerId,
  dataArray,
  title,
  suffix = ""
) {
  const el =
    document.getElementById(
      containerId
    );
  
  if (
    !el ||
    !Array.isArray(dataArray)
  ) {
    return;
  }
  
  const top5 =
    dataArray.slice(0, 5);
  
  let rowsHtml = "";
  
  top5.forEach(
    (item, index) => {
      let teamName = "";
      let value = "";
      
      if (Array.isArray(item)) {
        teamName =
          item[0];
        
        value =
          item[1];
        
      } else if (
        item &&
        typeof item === "object"
      ) {
        teamName =
          item.team ||
          item.name ||
          "";
        
        if (
          "value" in item
        ) {
          value =
            item.value;
          
        } else if (
          suffix &&
          item[suffix] !==
          undefined
        ) {
          value =
            item[suffix];
          
        } else {
          const keys =
            Object.keys(item)
            .filter(
              key =>
              ![
                "team",
                "name"
              ].includes(key)
            );
          
          value =
            keys.length ?
            item[keys[0]] :
            "";
        }
      }
      
      if (
        value === undefined ||
        value === null ||
        Number.isNaN(value)
      ) {
        value = "";
      }
      
      const logo =
        getRecordTeamLogo(
          teamName
        );
      
      rowsHtml += `
        <div
          class="top5-row item-index-${index}"
        >

          <div class="team-side">

            <span class="rank-number">
              ${index + 1}.
            </span>

            ${
              logo
                ? `
                  <img
                    src="${logo}"
                    class="team-logo"
                    alt=""
                    style="
                      width:24px;
                      height:24px;
                      min-width:24px;
                      min-height:24px;
                      display:inline-block;
                      object-fit:contain;
                    "
                  >
                `
                : `
                  <div class="team-logo-placeholder">
                    ?
                  </div>
                `
            }

            <span>
              ${escapeHtml(
                String(teamName)
              )}
            </span>

          </div>

          <div class="record-value">
            ${value}

            ${
              suffix
                ? `
                  <span class="record-suffix">
                    ${suffix}
                  </span>
                `
                : ""
            }

          </div>

        </div>
      `;
    }
  );
  
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
}




function renderMatchCard(
  containerId,
  match,
  title,
  extraLabel = ""
) {
  const el =
    document.getElementById(
      containerId
    );
  
  if (
    !el ||
    !match
  ) {
    return;
  }
  
  const homeLogo =
    match.homeLogo ||
    getRecordTeamLogo(
      match.home
    );
  
  const awayLogo =
    match.awayLogo ||
    getRecordTeamLogo(
      match.away
    );
  
  el.innerHTML = `
    <div class="record-card hero">

      <div class="record-title">
        ${title}
      </div>

      <div class="match-vertical">

        <div
          class="team-row card-home-container"
        >

          <div class="team-side">

            ${
              homeLogo
                ? `
                  <img
                    src="${homeLogo}"
                    class="team-logo"
                    alt=""
                    style="
                      width:24px;
                      height:24px;
                      min-width:24px;
                      min-height:24px;
                      display:inline-block;
                      object-fit:contain;
                    "
                  >
                `
                : `
                  <div class="team-logo-placeholder">
                    ?
                  </div>
                `
            }

            <span>
              ${escapeHtml(
                String(
                  match.home ||
                  "Unknown Team"
                )
              )}
            </span>

          </div>

          <div class="team-score">
            <b>
              ${match.homeGoals}
            </b>
          </div>

        </div>

        <div
          class="team-row card-away-container"
        >

          <div class="team-side">

            ${
              awayLogo
                ? `
                  <img
                    src="${awayLogo}"
                    class="team-logo"
                    alt=""
                    style="
                      width:24px;
                      height:24px;
                      min-width:24px;
                      min-height:24px;
                      display:inline-block;
                      object-fit:contain;
                    "
                  >
                `
                : `
                  <div class="team-logo-placeholder">
                    ?
                  </div>
                `
            }

            <span>
              ${escapeHtml(
                String(
                  match.away ||
                  "Unknown Team"
                )
              )}
            </span>

          </div>

          <div class="team-score">
            <b>
              ${match.awayGoals}
            </b>
          </div>

        </div>

        <div class="record-sub center">
          ${extraLabel}
        </div>

      </div>

    </div>
  `;
}
''

function getPlayerLeaderboards(matches, tournament) {
  const players = new Map();
  
  (tournament?.tournament_players || []).forEach(player => {
    if (!player.team_id) return;
    
    players.set(String(player.team_id), {
      username: player.username,
      logo: player.team_logo || "",
      teamName: player.team_name || "",
      goals: Number(player.gf) || 0,
      shots: 0,
      cleanSheets: 0
    });
  });
  
  getPlayedMatches(matches).forEach(match => {
    const homeKey = String(match.homeParticipant?.team_id || "");
    const awayKey = String(match.awayParticipant?.team_id || "");
    
    const home = players.get(homeKey);
    const away = players.get(awayKey);
    
    if (!home || !away) return;
    
    if (match.awayGoals === 0) {
      home.cleanSheets++;
    }
    
    if (match.homeGoals === 0) {
      away.cleanSheets++;
    }
    
    const stats = getMatchStats(match);
    
    if (stats) {
      const homeShots = Number(stats.shots[0]);
      const awayShots = Number(stats.shots[1]);
      
      if (Number.isFinite(homeShots)) {
        home.shots += homeShots;
      }
      
      if (Number.isFinite(awayShots)) {
        away.shots += awayShots;
      }
    }
  });
  
  const allPlayers = [...players.values()];
  
  return {
    goals: allPlayers
      .filter(player => player.goals > 0)
      .sort((a, b) => b.goals - a.goals),
    
    shots: allPlayers
      .filter(player => player.shots > 0)
      .sort((a, b) => b.shots - a.shots),
    
    cleanSheets: allPlayers
      .filter(player => player.cleanSheets > 0)
      .sort((a, b) => b.cleanSheets - a.cleanSheets)
  };
}

function renderPlayerLeaderboard(containerId, players, stat) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const top5 = players.slice(0, 5);
  
  if (!top5.length) {
    container.innerHTML = `
      <div class="player-leaderboard-empty">
        No statistics available yet.
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="player-leaderboard-list">
      ${top5.map((player, index) => `
        <div class="player-leaderboard-row">
          <span class="player-leaderboard-rank">${index + 1}</span>

          <div class="player-leaderboard-player">
            ${
              player.logo
                ? `<img src="${escapeHtml(player.logo)}" alt="">`
                : `<div class="player-leaderboard-avatar">?</div>`
            }
          </div>

          <div>
            <div class="player-leaderboard-name">
              ${escapeHtml(player.username)}
            </div>
            ${
              player.teamName
                ? `<div class="player-leaderboard-team">${escapeHtml(player.teamName)}</div>`
                : ""
            }
          </div>

          <span class="player-leaderboard-value">
            ${player[stat]}
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderPlayerStatistics(matches, tournament) {
  const stats = getPlayerLeaderboards(matches, tournament);
  
  renderPlayerLeaderboard("playerGoals", stats.goals, "goals");
  renderPlayerLeaderboard("playerShots", stats.shots, "shots");
  renderPlayerLeaderboard("playerCleanSheets", stats.cleanSheets, "cleanSheets");
}

async function renderRecords() {
  const tournament = getCurrentTournament();
  
  if (!tournament) return;
  
  try {
    showLoader();
    
    await loadTournamentFixtures(tournament.id);
    await rebuildTableFromMatches(false);
    
    const statsMatches = resolvePlayerStatsMatches(
      fixtures || [],
      tournament
    );
    
    const records = getRecords(statsMatches);
    
    renderPlayerStatistics(statsMatches, tournament);
    
    renderTournamentHighlight("overviewBestDefense", records.bestDefense);
    renderTournamentHighlight("overviewMostWins", records.mostWins);
    renderTournamentHighlight("overviewGoalDifference", records.goalDifference);
    
    renderTournamentHighlight("mostDraws", records.mostDraws);
    renderTournamentHighlight("fewestLosses", records.fewestLosses);
    renderTournamentHighlight("mostGoalsConceded", records.mostGoalsConceded);
    renderTournamentHighlight("mostCleanSheets", records.mostCleanSheets);
    
    
    
    renderTournamentHighlight("longestWinningRun", records.longestWinningRuns);
    renderTournamentHighlight("longestUnbeatenRun", records.longestUnbeatenRuns);
    
    renderTournamentHighlight(
      "mostGoalsByTeamInMatch",
      records.mostGoalsByTeamInMatch.map(record => ({
        team: record.team,
        value: `${record.goals} goals`,
        opponent: record.opponent,
        opponentValue: `${record.opponentGoals} goals`
      }))
    );
    
    renderTournamentHighlight("longestScoringRun", records.longestScoringRuns);
    renderTournamentHighlight("longestCleanSheetRun", records.longestCleanSheetRuns);
    renderTournamentHighlight("longestScoringDrought", records.longestScoringDroughts);
    
    renderTournamentHighlight(
      "highestPossession",
      records.highestPossession.map(record => ({
        team: record.team,
        value: `${record.value}%`,
        opponent: record.opponent,
        opponentValue: `${record.opponentValue}%`
      }))
    );
    
    renderTournamentHighlight(
      "mostShots",
      records.mostShots.map(record => ({
        team: record.team,
        value: record.value,
        opponent: record.opponent,
        opponentValue: record.opponentValue
      }))
    );
    
    renderTournamentHighlight(
      "mostShotsOnTarget",
      records.mostShotsOnTarget.map(record => ({
        team: record.team,
        value: record.value,
        opponent: record.opponent,
        opponentValue: record.opponentValue
      }))
    );
    
  } catch (err) {
    console.error("[renderRecords]", err);
    showAlert(err.message || "Failed to load records.");
  } finally {
    hideLoader();
  }
}

function getTeamPerformance(matches) {
  const teams = {};
  
  const playedMatches = matches.filter(
    m =>
    (m.played === true || Number(m.played) === 1) &&
    typeof m.homeGoals === "number" &&
    typeof m.awayGoals === "number"
  );
  
  function getStats(match) {
    if (!match.stats) return null;
    
    try {
      const stats =
        typeof match.stats === "string" ?
        JSON.parse(match.stats) :
        match.stats;
      
      if (
        !stats ||
        !Array.isArray(stats.possession) ||
        !Array.isArray(stats.shots) ||
        !Array.isArray(stats.shotsOnTarget) ||
        stats.possession.length < 2 ||
        stats.shots.length < 2 ||
        stats.shotsOnTarget.length < 2
      ) {
        return null;
      }
      
      return stats;
    } catch {
      return null;
    }
  }
  
  function getTeamKey(match, side) {
    if (side === "home") {
      return (
        match.home_team_id ||
        match.homeTeamId ||
        match.home
      );
    }
    
    return (
      match.away_team_id ||
      match.awayTeamId ||
      match.away
    );
  }
  
  function getTeamName(match, side) {
    return side === "home" ?
      match.home :
      match.away;
  }
  
  function createTeam(match, side) {
    const key =
      getTeamKey(match, side);
    
    if (!key) return null;
    
    if (!teams[key]) {
      teams[key] = {
        id: key,
        name: getTeamName(match, side),
        matchesPlayed: 0,
        goals: 0,
        cleanSheets: 0,
        statMatches: 0,
        statGoals: 0,
        possession: 0,
        shots: 0,
        shotsOnTarget: 0
      };
    }
    
    return teams[key];
  }
  
  playedMatches.forEach(match => {
    const home =
      createTeam(match, "home");
    
    const away =
      createTeam(match, "away");
    
    if (!home || !away) return;
    
    home.matchesPlayed++;
    away.matchesPlayed++;
    
    home.goals += match.homeGoals;
    away.goals += match.awayGoals;
    
    if (match.awayGoals === 0) {
      home.cleanSheets++;
    }
    
    if (match.homeGoals === 0) {
      away.cleanSheets++;
    }
    
    const stats =
      getStats(match);
    
    if (!stats) return;
    
    const homePossession =
      Number(stats.possession[0]);
    
    const awayPossession =
      Number(stats.possession[1]);
    
    const homeShots =
      Number(stats.shots[0]);
    
    const awayShots =
      Number(stats.shots[1]);
    
    const homeShotsOnTarget =
      Number(stats.shotsOnTarget[0]);
    
    const awayShotsOnTarget =
      Number(stats.shotsOnTarget[1]);
    
    if (
      !Number.isFinite(homePossession) ||
      !Number.isFinite(awayPossession) ||
      !Number.isFinite(homeShots) ||
      !Number.isFinite(awayShots) ||
      !Number.isFinite(homeShotsOnTarget) ||
      !Number.isFinite(awayShotsOnTarget)
    ) {
      return;
    }
    
    home.statMatches++;
    away.statMatches++;
    
    home.statGoals +=
      match.homeGoals;
    
    away.statGoals +=
      match.awayGoals;
    
    home.possession +=
      homePossession;
    
    away.possession +=
      awayPossession;
    
    home.shots +=
      homeShots;
    
    away.shots +=
      awayShots;
    
    home.shotsOnTarget +=
      homeShotsOnTarget;
    
    away.shotsOnTarget +=
      awayShotsOnTarget;
  });
  
  const performance =
    Object.values(teams)
    .map(team => {
      const averagePossession =
        team.statMatches ?
        team.possession /
        team.statMatches :
        0;
      
      const averageShots =
        team.statMatches ?
        team.shots /
        team.statMatches :
        0;
      
      const averageShotsOnTarget =
        team.statMatches ?
        team.shotsOnTarget /
        team.statMatches :
        0;
      
      const shotAccuracy =
        team.shots > 0 ?
        (team.shotsOnTarget /
          team.shots) *
        100 :
        0;
      
      const goalEfficiency =
        team.shots > 0 ?
        (team.statGoals /
          team.shots) *
        100 :
        0;
      
      return {
        ...team,
        averagePossession,
        averageShots,
        averageShotsOnTarget,
        shotAccuracy,
        goalEfficiency
      };
    });
  
  if (
    Array.isArray(tableCache) &&
    tableCache.length
  ) {
    const tableOrder =
      new Map();
    
    tableCache.forEach(
      (team, index) => {
        const key =
          team.team_id ||
          team.teamId ||
          team.id ||
          team.name;
        
        if (key) {
          tableOrder.set(
            String(key),
            index
          );
        }
      }
    );
    
    performance.sort(
      (a, b) => {
        const aIndex =
          tableOrder.get(
            String(a.id)
          );
        
        const bIndex =
          tableOrder.get(
            String(b.id)
          );
        
        if (
          aIndex !== undefined &&
          bIndex !== undefined
        ) {
          return aIndex - bIndex;
        }
        
        if (
          aIndex !== undefined
        ) {
          return -1;
        }
        
        if (
          bIndex !== undefined
        ) {
          return 1;
        }
        
        return 0;
      }
    );
  }
  
  return performance;
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
    longestUnbeatenRuns: getLongestUnbeatenRuns(matches),
    
    mostDraws: getMostDraws(matches),
    fewestLosses: getFewestLosses(matches),
    mostGoalsConceded: getMostGoalsConceded(matches),
    mostCleanSheets: getMostCleanSheets(matches),
    mostGoalsByTeamInMatch: getMostGoalsByTeamInMatch(matches),
    longestScoringRuns: getLongestScoringRuns(matches),
    longestCleanSheetRuns: getLongestCleanSheetRuns(matches),
    longestScoringDroughts: getLongestScoringDroughts(matches),
    highestPossession: getHighestPossession(matches),
    mostShots: getMostShots(matches),
    mostShotsOnTarget: getMostShotsOnTarget(matches)
  };
}


function getMostDraws(matches) {
  const playedMatches =
    getPlayedMatches(matches);
  
  const draws = {};
  
  playedMatches.forEach(m => {
    if (m.homeGoals === m.awayGoals) {
      draws[m.home] =
        (draws[m.home] || 0) + 1;
      
      draws[m.away] =
        (draws[m.away] || 0) + 1;
    }
  });
  
  return Object.entries(draws)
    .sort((a, b) => b[1] - a[1]);
}


function getFewestLosses(matches) {
  const playedMatches =
    getPlayedMatches(matches);
  
  const teams = {};
  
  playedMatches.forEach(m => {
    if (!teams[m.home]) {
      teams[m.home] = 0;
    }
    
    if (!teams[m.away]) {
      teams[m.away] = 0;
    }
    
    if (m.homeGoals > m.awayGoals) {
      teams[m.away]++;
    } else if (m.awayGoals > m.homeGoals) {
      teams[m.home]++;
    }
  });
  
  return Object.entries(teams)
    .sort((a, b) => a[1] - b[1]);
}


function getMostGoalsConceded(matches) {
  const playedMatches =
    getPlayedMatches(matches);
  
  const conceded = {};
  
  playedMatches.forEach(m => {
    conceded[m.home] =
      (conceded[m.home] || 0) +
      m.awayGoals;
    
    conceded[m.away] =
      (conceded[m.away] || 0) +
      m.homeGoals;
  });
  
  return Object.entries(conceded)
    .sort((a, b) => b[1] - a[1]);
}


function getMostCleanSheets(matches) {
  const playedMatches =
    getPlayedMatches(matches);
  
  const cleanSheets = {};
  
  playedMatches.forEach(m => {
    if (!cleanSheets[m.home]) {
      cleanSheets[m.home] = 0;
    }
    
    if (!cleanSheets[m.away]) {
      cleanSheets[m.away] = 0;
    }
    
    if (m.awayGoals === 0) {
      cleanSheets[m.home]++;
    }
    
    if (m.homeGoals === 0) {
      cleanSheets[m.away]++;
    }
  });
  
  return Object.entries(cleanSheets)
    .sort((a, b) => b[1] - a[1]);
}


function getMostGoalsByTeamInMatch(matches) {
  const playedMatches =
    getPlayedMatches(matches);
  
  return playedMatches
    .map(m => {
      if (m.homeGoals >= m.awayGoals) {
        return {
          team: m.home,
          goals: m.homeGoals,
          opponent: m.away,
          opponentGoals: m.awayGoals,
          match: m
        };
      }
      
      return {
        team: m.away,
        goals: m.awayGoals,
        opponent: m.home,
        opponentGoals: m.homeGoals,
        match: m
      };
    })
    .sort((a, b) => b.goals - a.goals);
}


function getLongestScoringRuns(matches) {
  const playedMatches =
    getPlayedMatches(matches)
    .sort((a, b) => {
      return Number(a.played_at) -
        Number(b.played_at);
    });
  
  const streaks = {};
  
  playedMatches.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = {
          current: 0,
          best: 0
        };
      }
    });
    
    if (m.homeGoals > 0) {
      streaks[m.home].current++;
    } else {
      streaks[m.home].current = 0;
    }
    
    if (m.awayGoals > 0) {
      streaks[m.away].current++;
    } else {
      streaks[m.away].current = 0;
    }
    
    streaks[m.home].best =
      Math.max(
        streaks[m.home].best,
        streaks[m.home].current
      );
    
    streaks[m.away].best =
      Math.max(
        streaks[m.away].best,
        streaks[m.away].current
      );
  });
  
  return Object.entries(streaks)
    .map(([team, data]) => [
      team,
      data.best
    ])
    .sort((a, b) => b[1] - a[1]);
}


function getLongestCleanSheetRuns(matches) {
  const playedMatches =
    getPlayedMatches(matches)
    .sort((a, b) => {
      return Number(a.played_at) -
        Number(b.played_at);
    });
  
  const streaks = {};
  
  playedMatches.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = {
          current: 0,
          best: 0
        };
      }
    });
    
    if (m.awayGoals === 0) {
      streaks[m.home].current++;
    } else {
      streaks[m.home].current = 0;
    }
    
    if (m.homeGoals === 0) {
      streaks[m.away].current++;
    } else {
      streaks[m.away].current = 0;
    }
    
    streaks[m.home].best =
      Math.max(
        streaks[m.home].best,
        streaks[m.home].current
      );
    
    streaks[m.away].best =
      Math.max(
        streaks[m.away].best,
        streaks[m.away].current
      );
  });
  
  return Object.entries(streaks)
    .map(([team, data]) => [
      team,
      data.best
    ])
    .sort((a, b) => b[1] - a[1]);
}


function getLongestScoringDroughts(matches) {
  const playedMatches =
    getPlayedMatches(matches)
    .sort((a, b) => {
      return Number(a.played_at) -
        Number(b.played_at);
    });
  
  const droughts = {};
  
  playedMatches.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!droughts[team]) {
        droughts[team] = {
          current: 0,
          best: 0
        };
      }
    });
    
    if (m.homeGoals === 0) {
      droughts[m.home].current++;
      
      droughts[m.home].best =
        Math.max(
          droughts[m.home].best,
          droughts[m.home].current
        );
    } else {
      droughts[m.home].current = 0;
    }
    
    if (m.awayGoals === 0) {
      droughts[m.away].current++;
      
      droughts[m.away].best =
        Math.max(
          droughts[m.away].best,
          droughts[m.away].current
        );
    } else {
      droughts[m.away].current = 0;
    }
  });
  
  return Object.entries(droughts)
    .map(([team, data]) => [
      team,
      data.best
    ])
    .sort((a, b) => b[1] - a[1]);
}

function renderTournamentHighlight(containerId, records) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const top5 = (records || []).slice(0, 5);
  
  if (!top5.length) {
    container.innerHTML = `
      <div class="player-leaderboard-empty">
        No statistics available yet.
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="player-leaderboard-list">
      ${top5.map((record, index) => {
        const isObject = !Array.isArray(record);
        const username = isObject ? record.team : record[0];
        const value = isObject ? record.value : record[1];
        const opponent = isObject ? record.opponent : "";
        const opponentValue = isObject ? record.opponentValue : null;
        const player = getRecordPlayer(username);
        const logo = player?.team_logo || getRecordTeamLogo(username);
        const teamName = player?.team_name || "";

        return `
          <div class="player-leaderboard-row">
            <span class="player-leaderboard-rank">${index + 1}</span>

            <div class="player-leaderboard-player">
              ${
                logo
                  ? `<img src="${escapeHtml(logo)}" alt="">`
                  : `<div class="player-leaderboard-avatar">?</div>`
              }
            </div>

            <div>
              <div class="player-leaderboard-name">
                ${escapeHtml(String(username || ""))}
              </div>
              ${
                teamName
                  ? `<div class="player-leaderboard-team">${escapeHtml(teamName)}</div>`
                  : ""
              }
              ${
                opponent
                  ? `<div class="player-leaderboard-team">vs ${escapeHtml(String(opponent))}${opponentValue != null ? ` (${escapeHtml(String(opponentValue))})` : ""}</div>`
                  : ""
              }
            </div>

            <span class="player-leaderboard-value">
              ${escapeHtml(String(value ?? ""))}
            </span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function getMatchStats(match) {
  if (!match || !match.stats) {
    return null;
  }
  
  try {
    const stats =
      typeof match.stats === "string" ?
      JSON.parse(match.stats) :
      match.stats;
    
    if (!stats) {
      return null;
    }
    
    if (
      !Array.isArray(stats.possession) ||
      !Array.isArray(stats.shots) ||
      !Array.isArray(stats.shotsOnTarget)
    ) {
      return null;
    }
    
    if (
      stats.possession.length < 2 ||
      stats.shots.length < 2 ||
      stats.shotsOnTarget.length < 2
    ) {
      return null;
    }
    
    return stats;
  } catch {
    return null;
  }
}


function getHighestPossession(matches) {
  const playedMatches =
    getPlayedMatches(matches);
  
  return playedMatches
    .map(m => {
      const stats =
        getMatchStats(m);
      
      if (!stats) {
        return null;
      }
      
      const homePossession =
        Number(stats.possession[0]);
      
      const awayPossession =
        Number(stats.possession[1]);
      
      if (
        !Number.isFinite(homePossession) ||
        !Number.isFinite(awayPossession)
      ) {
        return null;
      }
      
      if (homePossession >= awayPossession) {
        return {
          team: m.home,
          value: homePossession,
          opponent: m.away,
          opponentValue: awayPossession,
          match: m
        };
      }
      
      return {
        team: m.away,
        value: awayPossession,
        opponent: m.home,
        opponentValue: homePossession,
        match: m
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);
}


function getMostShots(matches) {
  const playedMatches =
    getPlayedMatches(matches);
  
  return playedMatches
    .map(m => {
      const stats =
        getMatchStats(m);
      
      if (!stats) {
        return null;
      }
      
      const homeShots =
        Number(stats.shots[0]);
      
      const awayShots =
        Number(stats.shots[1]);
      
      if (
        !Number.isFinite(homeShots) ||
        !Number.isFinite(awayShots)
      ) {
        return null;
      }
      
      if (homeShots >= awayShots) {
        return {
          team: m.home,
          value: homeShots,
          opponent: m.away,
          opponentValue: awayShots,
          match: m
        };
      }
      
      return {
        team: m.away,
        value: awayShots,
        opponent: m.home,
        opponentValue: homeShots,
        match: m
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);
}


function getMostShotsOnTarget(matches) {
  const playedMatches =
    getPlayedMatches(matches);
  
  return playedMatches
    .map(m => {
      const stats =
        getMatchStats(m);
      
      if (!stats) {
        return null;
      }
      
      const homeShotsOnTarget =
        Number(stats.shotsOnTarget[0]);
      
      const awayShotsOnTarget =
        Number(stats.shotsOnTarget[1]);
      
      if (
        !Number.isFinite(homeShotsOnTarget) ||
        !Number.isFinite(awayShotsOnTarget)
      ) {
        return null;
      }
      
      if (
        homeShotsOnTarget >=
        awayShotsOnTarget
      ) {
        return {
          team: m.home,
          value: homeShotsOnTarget,
          opponent: m.away,
          opponentValue: awayShotsOnTarget,
          match: m
        };
      }
      
      return {
        team: m.away,
        value: awayShotsOnTarget,
        opponent: m.home,
        opponentValue: homeShotsOnTarget,
        match: m
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);
}

function setupCompetitionNavigation() {
  document.querySelectorAll(".competition-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      
      if (view === "standings") {
        goToTablePage();
      } else if (view === "fixtures") {
        goToFixturePage();
      } else if (view === "stats") {
        goToStatPage();
      }
    });
  });
}


let activeStandingsFilter = "basic";
let originalStandingsData = [];

function setupStandingsFilters() {
  document.querySelectorAll("[data-table-filter]").forEach(button => {
    button.onclick = async () => {
      const filter = button.dataset.tableFilter;
      
      if (!["full", "basic", "form"].includes(filter)) return;
      
      activeStandingsFilter = filter;
      
      document.querySelectorAll("[data-table-filter]").forEach(btn => {
        btn.classList.toggle("active", btn === button);
      });
      
      await renderFilteredStandings();
    };
  });
}

async function renderTable(data) {
  if (!Array.isArray(data)) return;
  
  originalStandingsData = [...data];
  activeStandingsFilter = "basic";
  
  document.querySelectorAll("[data-table-filter]").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.tableFilter === "basic"
    );
  });
  
  await renderFilteredStandings();
}

async function renderFilteredStandings() {
  const tournament = getCurrentTournament();
  const filter = activeStandingsFilter;
  
  if (filter === "form" && tournament) {
    try {
      showLoader();
      
      await loadTournamentFixtures(tournament.id);
    } catch (err) {
      console.error("[renderFilteredStandings]", err);
    } finally {
      hideLoader();
    }
  }
  
  renderStandingsRows(originalStandingsData, filter);
}


function renderStandingsRows(data, filter = "basic") {
  const tbody = document.getElementById("tableBody");
  const table = document.getElementById("leagueTable");
  
  if (!tbody || !table) return;
  
  table.classList.remove("full-view", "basic-view", "form-view");
  table.classList.add(`${filter}-view`);
  
  const formHeader = document.getElementById("formColumnHeader");
  
  if (formHeader) {
    formHeader.style.display =
      filter === "form" ? "table-cell" : "none";
  }
  
  const scrollContainer = table.closest(".table-responsive");
  
  if (scrollContainer) {
    scrollContainer.classList.toggle(
      "standings-horizontal-scroll",
      filter === "full" || filter === "form"
    );
  }
  
  tbody.innerHTML = "";
  
  if (!Array.isArray(data) || !data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;">
          No table data
        </td>
      </tr>
    `;
    return;
  }
  
  const groups = new Map();
  
  data.forEach(team => {
    const groupId = team.groupId;
    
    if (!groupId) {
      if (!groups.has("__ungrouped__")) {
        groups.set("__ungrouped__", {
          name: "Other Teams",
          teams: []
        });
      }
      
      groups.get("__ungrouped__").teams.push(team);
      return;
    }
    
    if (!groups.has(String(groupId))) {
      groups.set(String(groupId), {
        name: team.groupName || "Group",
        teams: []
      });
    }
    
    groups.get(String(groupId)).teams.push(team);
  });
  
  const hasGroups = data.some(
    team => team.groupId && team.groupName
  );
  
  const renderTeamRow = (team, index, groupLength) => {
    const tr = document.createElement("tr");
    
    tr.setAttribute("data-row-index", index);
    
    if (index < 4) {
      tr.classList.add("champions-league");
    }
    
    if (index >= groupLength - 3) {
      tr.classList.add("relegation");
    }
    
    const played = Number(team.played) || 0;
    const wins = Number(team.wins) || 0;
    const draws = Number(team.draws) || 0;
    const losses = Number(team.losses) || 0;
    const gf = Number(team.gf) || 0;
    const ga = Number(team.ga) || 0;
    
    const gd =
      team.gd !== undefined && team.gd !== null ?
      Number(team.gd) || 0 :
      gf - ga;
    
    const pts =
      team.pts !== undefined && team.pts !== null ?
      Number(team.pts) || 0 :
      Number(team.points) || 0;
    
    const indicator =
      typeof getChangeIndicator === "function" ?
      getChangeIndicator(team.change) :
      "";
    
    const teamId = String(team.id || "");
    
    const hasPointDeduction =
      team.has_point_deduction === true ||
      Number(team.has_point_deduction) === 1;
    
    const form =
      filter === "form" ?
      getTeamForm(teamId, fixtures) : [];
    
    tr.innerHTML = `
      <td>
        <div class="rank-cell">
          <span class="rank-num">${index + 1}</span>
          ${indicator}
        </div>
      </td>

      <td>
        <div class="table-team-cell">
          <div class="team-logo-placeholder">?</div>
        </div>
      </td>

      <td>
        <div class="team-name-wrapper">
          <strong class="team-name"></strong>
          ${
            hasPointDeduction
              ? `<span class="deduction-dot" title="Active disciplinary point deduction"></span>`
              : ""
          }
        </div>
      </td>

      <td>${played}</td>
      <td>${wins}-${draws}-${losses}</td>
      <td>${gf}:${ga}</td>

      <td class="${gd < 0 ? "neg" : "positive"}">
        ${gd >= 0 ? "+" + gd : gd}
      </td>

      <td><strong>${pts}</strong></td>

      <td class="table-form-cell" data-team-id="${teamId}">
        <div class="form-results">
          ${
            form.length
              ? form.map(result => `
                  <span class="form-badge ${result}">${result}</span>
                `).join("")
              : `<span class="empty-state">-</span>`
          }
        </div>
      </td>
    `;
    
    const teamName = tr.querySelector(".team-name");
    
    if (teamName) {
      teamName.textContent = team.name || "";
    }
    
    if (team.logo) {
      const teamCell = tr.querySelector(".table-team-cell");
      const placeholder = teamCell.querySelector(
        ".team-logo-placeholder"
      );
      
      const img = document.createElement("img");
      
      img.className = "table-team-logo";
      img.src = team.logo;
      img.alt = team.name || "Logo";
      
      img.onerror = () => img.replaceWith(placeholder);
      
      teamCell.replaceChild(img, placeholder);
    }
    
    tbody.appendChild(tr);
  };
  
  if (hasGroups) {
    groups.forEach(group => {
      const headerRow = document.createElement("tr");
      
      headerRow.className = "standings-group-header";
      
      headerRow.innerHTML = `
        <td colspan="9">
          <strong></strong>
        </td>
      `;
      
      headerRow.querySelector("strong").textContent =
        group.name;
      
      tbody.appendChild(headerRow);
      
      group.teams.forEach((team, index) => {
        renderTeamRow(team, index, group.teams.length);
      });
    });
    
    return;
  }
  
  data.forEach((team, index) => {
    renderTeamRow(team, index, data.length);
  });
}

function getTeamForm(teamId, matches) {
  const playedMatches = (matches || [])
    .filter(match =>
      Number(match.played) === 1 &&
      (
        String(match.home_team_id) === String(teamId) ||
        String(match.away_team_id) === String(teamId)
      )
    )
    .sort((a, b) => {
      const dateA = new Date(
        a.playedAt ??
        a.played_at ??
        a.updated_at ??
        a.created_at ??
        0
      ).getTime();
      
      const dateB = new Date(
        b.playedAt ??
        b.played_at ??
        b.updated_at ??
        b.created_at ??
        0
      ).getTime();
      
      return dateA - dateB;
    });
  
  return playedMatches.slice(-5).map(match => {
    const isHome =
      String(match.home_team_id) === String(teamId);
    
    const teamGoals = Number(
      isHome ?
      match.homeGoals ?? match.home_goals :
      match.awayGoals ?? match.away_goals
    );
    
    const opponentGoals = Number(
      isHome ?
      match.awayGoals ?? match.away_goals :
      match.homeGoals ?? match.home_goals
    );
    
    if (teamGoals > opponentGoals) return "W";
    if (teamGoals < opponentGoals) return "L";
    
    return "D";
  });
}




function createFixtureCard(tournament, match) {
  const div = document.createElement("div");
  
  const played = match.played === true || Number(match.played) === 1;
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  
  const roundText = String(match.round || "").trim();
  
  const isPlayoff =
    match.match_type === "knockout" &&
    roundText.toLowerCase() === "playoff";
  
  const round =
    Number(match.round_index) ||
    Number(roundText.match(/Round\s+(\d+)/i)?.[1]) ||
    Number(roundText) ||
    1;
  
  const roundLabel = isPlayoff ?
    `PLAYOFF${Number(match.leg || 1) > 1 ? ` - LEG ${match.leg}` : ""}` :
    `ROUND ${String(round).padStart(2, "0")}`;
  
  const homeName = match.home || "Home";
  const awayName = match.away || "Away";
  
  const status = String(match.submission_status || "").toLowerCase();
  
  const statusText = !status && played && isAdmin ?
    "Recorded" :
    status ?
    status.charAt(0).toUpperCase() + status.slice(1) :
    "Not submitted";
  
  const statusClass = ["pending", "rejected", "approved"].includes(status) ?
    status :
    !status && played && isAdmin ?
    "recorded" :
    "not-submitted";
  
  let stats = null;
  
  if (match.stats) {
    try {
      stats = typeof match.stats === "string" ?
        JSON.parse(match.stats) :
        match.stats;
    } catch {
      stats = null;
    }
  }
  
  const hasStats =
    stats &&
    stats.possession &&
    stats.shots &&
    stats.shotsOnTarget;
  
  const seasonCompleted =
    String(tournament.season_status || "").toLowerCase() === "completed";
  
  let actionLabel = "";
  
  if (APP_MODE !== "view" && !seasonCompleted) {
    if (isAdmin) {
      actionLabel = ["pending", "rejected", "approved"].includes(status) ?
        "Review Submission" :
        "Record Result";
    } else if (status === "pending" || status === "rejected") {
      actionLabel = "Review Submission";
    } else if (status !== "approved" && !played) {
      actionLabel = "Submit Result";
    }
  }
  
  const matchDate = played ?
    formatRecordedTime(match.playedAt) :
    match.scheduledAt ?
    formatMatchDay(match.scheduledAt) :
    "Schedule not set";
  
  div.className = `fixture-card ${played ? "played" : "not-played"}`;
  
  div.innerHTML = `
    <div class="fixture-main" role="button" tabindex="0" aria-expanded="false">

      <div class="fixture-main-label">
        <span>${roundLabel}</span>

        ${
          status === "pending" || status === "rejected"
            ? `<span class="submission-badge ${status}">${statusText}</span>`
            : ""
        }
      </div>

      <div class="fixture-main-content">

        <div class="fixture-team home">
          <div class="fixture-team-logo-placeholder">?</div>
          <span class="fixture-team-name">${homeName}</span>
        </div>

        <div class="fixture-center">
          ${
            played
              ? `<strong class="fixture-score">${match.homeGoals ?? 0} - ${match.awayGoals ?? 0}</strong>`
              : `<span class="fixture-versus">X</span>`
          }
        </div>

        <div class="fixture-team away">
          <span class="fixture-team-name">${awayName}</span>
          <div class="fixture-team-logo-placeholder">?</div>
        </div>

        <button
          type="button"
          class="fixture-expand-toggle"
          aria-label="Show match details"
        >
          <span class="fixture-expand-icon">⌄</span>
        </button>

      </div>
    </div>

    <div class="fixture-details" hidden>

      <div class="fixture-details-heading">MATCH DETAILS</div>

      <div class="fixture-details-info">
        <div>
          <span>Round</span>
          <strong>${roundLabel}</strong>
        </div>

        <div>
          <span>Submission Status</span>
          <strong class="fixture-status-text ${statusClass}">
            ${statusText}
          </strong>
        </div>

        <div>
          <span>${played ? "Recorded" : "Scheduled"}</span>
          <strong>${matchDate}</strong>
        </div>
      </div>

      ${
        played
          ? `
            <div class="fixture-result-details">
              <span>${homeName}</span>
              <strong>${match.homeGoals ?? 0} - ${match.awayGoals ?? 0}</strong>
              <span>${awayName}</span>
            </div>
          `
          : ""
      }

      ${
        played && hasStats
          ? `
            <div class="fixture-details-heading">MATCH STATISTICS</div>

            <div class="fixture-match-stats">
              <div class="fixture-stat-row">
                <span>Possession</span>
                <strong>${stats.possession[0]}% - ${stats.possession[1]}%</strong>
              </div>

              <div class="fixture-stat-row">
                <span>Shots</span>
                <strong>${stats.shots[0]} - ${stats.shots[1]}</strong>
              </div>

              <div class="fixture-stat-row">
                <span>Shots on Target</span>
                <strong>${stats.shotsOnTarget[0]} - ${stats.shotsOnTarget[1]}</strong>
              </div>
            </div>
          `
          : ""
      }

      <div class="fixture-details-actions">
        ${
          actionLabel
            ? `
              <button type="button" class="fixture-submit-btn">
                ${actionLabel}
              </button>
            `
            : ""
        }

        ${
          isAdmin && !played
            ? `
              <button type="button" class="fixture-live-btn">
                📺 Live
              </button>
            `
            : ""
        }

        <button type="button" class="fixture-squad-btn">👕 Squads</button>

        <button type="button" class="fixture-contact-btn">☎ Contacts</button>
      </div>

    </div>
  `;
  
  replaceTeamLogo(div, ".fixture-team.home", match.homeLogo, homeName);
  replaceTeamLogo(div, ".fixture-team.away", match.awayLogo, awayName);
  
  const main = div.querySelector(".fixture-main");
  const details = div.querySelector(".fixture-details");
  const expandButton = div.querySelector(".fixture-expand-toggle");
  
  function toggleDetails() {
    const isOpen = !details.hidden;
    
    details.hidden = isOpen;
    main.setAttribute("aria-expanded", String(!isOpen));
    
    expandButton.setAttribute(
      "aria-label",
      isOpen ? "Show match details" : "Hide match details"
    );
    
    div.classList.toggle("expanded", !isOpen);
  }
  
  main.addEventListener("click", toggleDetails);
  
  main.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleDetails();
    }
  });
  
  const submitBtn = div.querySelector(".fixture-submit-btn");
  
  if (submitBtn) {
    submitBtn.onclick = event => {
      event.stopPropagation();
      onFixtureClick(match);
    };
  }
  
  const liveBtn = div.querySelector(".fixture-live-btn");
  
  if (liveBtn) {
    liveBtn.onclick = event => {
      event.stopPropagation();
      openLiveInviteModal(match);
    };
  }
  
  const contactBtn = div.querySelector(".fixture-contact-btn");
  
  if (contactBtn) {
    contactBtn.onclick = event => {
      event.stopPropagation();
      openMatchContacts(match);
    };
  }
  
  const squadBtn = div.querySelector(".fixture-squad-btn");
  
  if (squadBtn) {
    squadBtn.onclick = event => {
      event.stopPropagation();
      openFixtureSquads(match);
    };
  }
  
  return div;
}

async function onFixtureClick(match) {
  if (APP_MODE === "view") return;
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  if (
    String(tournament.season_status || "").toLowerCase() ===
    "completed"
  ) return;
  
  const status = String(
    match.submission_status || ""
  ).toLowerCase();
  
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  
  const isPlayed =
    status === "approved" || ["played", "completed"].includes(
      String(match.status || "").toLowerCase()
    );
  
  if (!isAdmin && isPlayed) {
    return openMatchOptions(match);
  }
  
  if (!isAdmin && status === "approved") return;
  
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
    
    let submission;
    
    if (isAdmin) {
      const submissions = await getMatchSubmissions(
        tournament.id,
        match.id
      );
      
      submission = Array.isArray(submissions) ?
        submissions[0] :
        null;
    } else {
      submission = await getMatchSubmission(
        tournament.id,
        match.id
      );
    }
    
    if (!submission) {
      showAlert("Submission not found.");
      return;
    }
    
    openSubmissionReview(match, submission);
  } catch (err) {
    console.error("[onFixtureClick]", err);
    showAlert(err.message || "Failed to load submission.");
  } finally {
    hideLoader();
  }
}


async function renderFixtures() {
  const tournament = getCurrentTournament();
  
  if (!tournament) return;
  
  const container = document.getElementById("fixtureList");
  
  if (!container) return;
  
  const search =
    document.getElementById("fixtureSearchInput")
    ?.value.toLowerCase().trim() || "";
  
  try {
    showLoader();
    
    await loadTournamentFixtures(tournament.id);
    
    toggleRoundCarousel(search);
    
    const selectedStage =
      getFixtureRoundOptions()[getCurrentRound() - 1];
    
    if (selectedStage?.type === "knockout") {
      await renderFullBracket();
      return;
    }
    
    const visibleMatches = getVisibleMatches(search)
      .filter(match => {
        const round = String(match.round || "")
          .trim()
          .toLowerCase();
        
        return (
          match.match_type !== "knockout" ||
          round.includes("playoff")
        );
      });
    
    visibleMatches.sort((a, b) => {
      const roundDiff =
        (Number(a.round_index) || 0) -
        (Number(b.round_index) || 0);
      
      if (roundDiff !== 0) return roundDiff;
      
      const aPending =
        getMatchSubmissionStatus(a) === "pending";
      
      const bPending =
        getMatchSubmissionStatus(b) === "pending";
      
      return Number(bPending) - Number(aPending);
    });
    
    container.innerHTML = "";
    
    if (!visibleMatches.length) {
      renderEmptyFixtures(container, search);
      return;
    }
    
    const settings = readTournamentSettings(tournament);
    
    const isSingleGroup =
      settings.tournamentMode === "champions_league" ||
      (
        settings.isChampionsLeague === true &&
        settings.groupFormat === "single"
      );
    
    const allGroupIds = [
      ...new Set(
        fixtures
        .filter(match =>
          match.match_type === "group" && match.group_id
        )
        .map(match => String(match.group_id))
      )
    ];
    
    const groupNames = new Map();
    
    allGroupIds.forEach((groupId, index) => {
      groupNames.set(
        groupId,
        isSingleGroup ?
        "League Phase" :
        `Group ${String.fromCharCode(65 + index)}`
      );
    });
    
    const rounds = new Map();
    
    visibleMatches.forEach(match => {
      const roundName = String(match.round || "Fixtures");
      
      if (!rounds.has(roundName)) {
        rounds.set(roundName, []);
      }
      
      rounds.get(roundName).push(match);
    });
    
    rounds.forEach((matches, roundName) => {
      const roundHeader = document.createElement("div");
      
      roundHeader.className = "fixture-round-header";
      roundHeader.textContent = roundName;
      
      container.appendChild(roundHeader);
      
      const groups = new Map();
      
      matches.forEach(match => {
        const groupId = match.group_id ?
          String(match.group_id) :
          "__ungrouped__";
        
        if (!groups.has(groupId)) {
          groups.set(groupId, []);
        }
        
        groups.get(groupId).push(match);
      });
      
      const hasGroups = matches.some(match => match.group_id);
      
      if (!hasGroups) {
        matches.forEach(match => {
          container.appendChild(
            createFixtureCard(tournament, match)
          );
        });
        
        return;
      }
      
      groups.forEach((groupMatches, groupId) => {
        if (groupId !== "__ungrouped__") {
          const groupHeader = document.createElement("div");
          
          groupHeader.className = "fixture-group-header";
          
          groupHeader.textContent =
            groupNames.get(groupId) || "League Phase";
          
          container.appendChild(groupHeader);
        }
        
        groupMatches.forEach(match => {
          container.appendChild(
            createFixtureCard(tournament, match)
          );
        });
      });
    });
    
  } catch (err) {
    console.error("[renderFixtures]", err);
    
    container.innerHTML = "";
    
    renderEmptyFixtures(container, false);
    
    showAlert(err.message || "Failed to load fixtures.");
    
  } finally {
    hideLoader();
  }
}

function getFixtureRoundOptions() {
  const matches = Array.isArray(fixtures) ? fixtures : [];
  
  const leagueRounds = [
    ...new Set(
      matches
      .filter(match => match.match_type === "league")
      .map(match => Number(match.round))
      .filter(round => Number.isInteger(round) && round > 0)
    )
  ].sort((a, b) => a - b);
  
  const groupRounds = [
    ...new Set(
      matches
      .filter(match => match.match_type === "group")
      .map(match => Number(match.round_index))
      .filter(round => Number.isInteger(round) && round > 0)
    )
  ].sort((a, b) => a - b);
  
  const playoffLegs = [
    ...new Set(
      matches
      .filter(match =>
        match.match_type === "knockout" &&
        String(match.round || "").toLowerCase().includes("playoff")
      )
      .map(match => Number(match.leg || 1))
      .filter(leg => Number.isInteger(leg) && leg > 0)
    )
  ].sort((a, b) => a - b);
  
  const hasKnockoutStage = matches.some(match =>
    match.match_type === "third_place" ||
    (
      match.match_type === "knockout" &&
      !String(match.round || "").toLowerCase().includes("playoff")
    )
  );
  
  return [
    ...leagueRounds.map(round => ({ type: "league", round })),
    ...groupRounds.map(round => ({ type: "group", round })),
    ...playoffLegs.map(leg => ({ type: "playoff", leg })),
    ...(hasKnockoutStage ? [{ type: "knockout" }] : [])
  ];
}

function getVisibleMatches(search = "") {
  const matches = Array.isArray(fixtures) ? fixtures : [];
  const options = getFixtureRoundOptions();
  const selected = options[getCurrentRound() - 1];
  
  if (search) {
    const query = search.toLowerCase();
    
    return matches.filter(match => ["league", "group"].includes(
        String(match.match_type || "").toLowerCase()
      ) &&
      (
        (match.home || "").toLowerCase().includes(query) ||
        (match.away || "").toLowerCase().includes(query)
      )
    );
  }
  
  if (!selected || selected.type === "knockout") {
    return [];
  }
  
  return matches.filter(match => {
    const type = String(match.match_type || "").toLowerCase();
    
    if (selected.type === "league") {
      return type === "league" &&
        Number(match.round) === selected.round;
    }
    
    if (selected.type === "group") {
      return type === "group" &&
        Number(match.round_index) === selected.round;
    }
    
    if (selected.type === "playoff") {
      return type === "knockout" &&
        String(match.round || "").toLowerCase().includes("playoff") &&
        Number(match.leg || 1) === selected.leg;
    }
    
    return false;
  });
}

function getMaxRound() {
  return Math.max(getFixtureRoundOptions().length, 1);
}

function setCurrentRound(round) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const maxRound = getMaxRound();
  
  const newRound = Math.max(
    1,
    Math.min(Number(round) || 1, maxRound)
  );
  
  localStorage.setItem(
    `currentRound_${tournament.id}`,
    String(newRound)
  );
}

function getCurrentRound() {
  const tournament = getCurrentTournament();
  if (!tournament) return 1;
  
  const savedRound = Number(
    localStorage.getItem(`currentRound_${tournament.id}`)
  );
  
  const maxRound = getMaxRound();
  
  if (!Number.isFinite(savedRound) || savedRound < 1) {
    return 1;
  }
  
  return Math.min(savedRound, maxRound);
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