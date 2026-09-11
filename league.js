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
  
  
  
}







function resetLogoUI() {
  const logoInput = document.getElementById("teamLogoInput");
  const logoPreview = document.getElementById("teamLogoPreview");
  
  logoInput.value = null;
  
  logoPreview.src = "";
  logoPreview.removeAttribute("src");
  logoPreview.classList.remove("show");
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

async function renderRecords() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  try {
    showLoader();
    
    await loadTournamentFixtures(
      tournament.id
    );
    
    await rebuildTableFromMatches(
      false
    );
    
    const records =
      getRecords(fixtures);
    
    renderChampionPodium();
    
    renderTeamPerformance(
      fixtures
    );
    
    renderTop5(
      "bestAttack",
      records.bestAttack,
      "⚽ Top Scorers",
      "goals"
    );
    
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
      `Margin: +${
        records.biggestWins[0]?.margin || 0
      }`
    );
    
    renderMatchCard(
      "highestScoringMatch",
      records.highestScoringMatches[0],
      "🔥 Highest Scoring Match",
      `Total Goals: ${
        records
          .highestScoringMatches[0]
          ?.totalGoals || 0
      }`
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
    
  } catch (err) {
    console.error(
      "[renderRecords]",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to load records."
    );
    
  } finally {
    hideLoader();
  }
}


function getLeagueWinnerFinal() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return null;
  
  const table =
    tableCache || [];
  
  if (!Array.isArray(table) ||
    !table.length) {
    return null;
  }
  
  const matches =
    fixtures || [];
  
  const sorted =
    getSortedTable(
      [...table]
    );
  
  if (!sorted.length) {
    return null;
  }
  
  const remaining = {};
  
  sorted.forEach(team => {
    remaining[
      String(team.id)
    ] = 0;
  });
  
  matches.forEach(match => {
    if (!match) return;
    
    const homeId =
      String(
        match.home_team_id || ""
      );
    
    const awayId =
      String(
        match.away_team_id || ""
      );
    
    if (
      !remaining.hasOwnProperty(
        homeId
      ) ||
      !remaining.hasOwnProperty(
        awayId
      )
    ) {
      return;
    }
    
    if (
      Number(match.played) !== 1
    ) {
      remaining[homeId]++;
      remaining[awayId]++;
    }
  });
  
  const leader =
    sorted[0];
  
  const second =
    sorted[1];
  
  const third =
    sorted[2];
  
  const leaderRemaining =
    remaining[
      String(leader.id)
    ] || 0;
  
  const allGamesPlayed =
    sorted.every(
      team =>
      (
        remaining[
          String(team.id)
        ] || 0
      ) === 0
    );
  
  if (allGamesPlayed) {
    return {
      id: leader.id,
      team: leader.name,
      pts: leader.pts || 0,
      gd: Number(leader.gf || 0) -
        Number(leader.ga || 0),
      finished: true,
      decided: true
    };
  }
  
  if (
    second &&
    third &&
    leaderRemaining === 0 &&
    (
      remaining[
        String(second.id)
      ] || 0
    ) === 0
  ) {
    const thirdRemaining =
      remaining[
        String(third.id)
      ] || 0;
    
    const thirdMax =
      Number(third.pts || 0) +
      thirdRemaining * 3;
    
    const topTwoMinimum =
      Math.min(
        Number(leader.pts || 0),
        Number(second.pts || 0)
      );
    
    if (
      thirdMax <
      topTwoMinimum
    ) {
      return {
        id: leader.id,
        team: leader.name,
        pts: leader.pts || 0,
        gd: Number(leader.gf || 0) -
          Number(leader.ga || 0),
        finished: false,
        decided: true
      };
    }
  }
  
  const decided =
    sorted.every(team => {
      if (
        String(team.id) ===
        String(leader.id)
      ) {
        return true;
      }
      
      const teamRemaining =
        remaining[
          String(team.id)
        ] || 0;
      
      const maximumPossible =
        Number(team.pts || 0) +
        teamRemaining * 3;
      
      return (
        maximumPossible <
        Number(leader.pts || 0)
      );
    });
  
  if (!decided) {
    return {
      id: null,
      team: "TBD",
      pts: 0,
      gd: 0,
      finished: false,
      decided: false
    };
  }
  
  return {
    id: leader.id,
    team: leader.name,
    pts: leader.pts || 0,
    gd: Number(leader.gf || 0) -
      Number(leader.ga || 0),
    finished: false,
    decided: true
  };
}

function getRecordTeamLogo(teamName) {
  if (!teamName) return null;
  
  const table =
    Array.isArray(tableCache) ?
    tableCache :
    [];
  
  const tableTeam =
    table.find(
      team =>
      String(team.name || "")
      .toLowerCase() ===
      String(teamName)
      .toLowerCase()
    );
  
  if (tableTeam?.logo) {
    return tableTeam.logo;
  }
  
  const loadedFixtures =
    Array.isArray(fixtures) ?
    fixtures :
    [];
  
  for (const match of loadedFixtures) {
    if (
      String(match.home || "")
      .toLowerCase() ===
      String(teamName)
      .toLowerCase()
    ) {
      if (match.homeLogo) {
        return match.homeLogo;
      }
    }
    
    if (
      String(match.away || "")
      .toLowerCase() ===
      String(teamName)
      .toLowerCase()
    ) {
      if (match.awayLogo) {
        return match.awayLogo;
      }
    }
  }
  
  return null;
}

function renderStreakCard(
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
  
  const normalizedData =
    Array.isArray(dataArray[0]) ?
    dataArray :
    [dataArray];
  
  const top3 =
    normalizedData.slice(0, 3);
  
  let rowsHtml = "";
  
  top3.forEach(
    (data, index) => {
      if (
        !data ||
        data.length < 2
      ) {
        return;
      }
      
      const team =
        data[0];
      
      const value =
        data[1];
      
      const medal =
        index === 0 ?
        "🥇" :
        index === 1 ?
        "🥈" :
        "🥉";
      
      const logo =
        getRecordTeamLogo(team);
      
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

            <span class="medal">
              ${medal}
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

            <span>
              ${escapeHtml(
                String(team)
              )}
            </span>

          </div>

          <div class="record-sub">
            <b>${value}</b>
            ${suffix}
          </div>

        </div>
      `;
    }
  );
  
  el.innerHTML = `
    <div class="record-card hero streak-card">

      <div
        class="record-title"
        style="
          margin-bottom:12px;
          font-weight:bold;
        "
      >
        ${title}
      </div>

      <div class="streak-list">
        ${rowsHtml}
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

function renderChampionPodium() {
  const el =
    document.getElementById(
      "championPodium"
    );
  
  const tournament =
    getCurrentTournament();
  
  if (
    !el ||
    !tournament
  ) {
    return;
  }
  
  const winner =
    getLeagueWinnerFinal();
  
  if (!winner) {
    return;
  }
  
  const winnerLogo =
    getRecordTeamLogo(
      winner.team
    );
  
  const rawTournamentLogo =
    tournament.tournamentImage ||
    tournament.logo ||
    "";
  
  const tournamentLogoUrl =
    typeof rawTournamentLogo ===
    "object" &&
    rawTournamentLogo !== null ?
    (
      rawTournamentLogo.url ||
      rawTournamentLogo.src ||
      rawTournamentLogo.href ||
      ""
    ) :
    rawTournamentLogo;
  
  const isDecided =
    winner.decided &&
    winner.team !== "TBD";
  
  el.innerHTML = `
    <div class="champion-card">

      <div class="champion-tournament-logo">
        ${
          tournamentLogoUrl
            ? `
              <img
                src="${tournamentLogoUrl}"
                class="tournament-logo"
                style="
                  max-width:48px;
                  max-height:48px;
                  display:inline-block;
                  object-fit:contain;
                "
                alt=""
              >
            `
            : ""
        }
      </div>

      <div class="champion-title">
        🏆 ${
          isDecided
            ? "CHAMPION"
            : "WINNER TBD"
        }
      </div>

      ${
        isDecided
          ? `
            <div class="champion-team-logo-wrap">

              ${
                winnerLogo
                  ? `
                    <img
                      src="${winnerLogo}"
                      class="champion-team-logo"
                      alt=""
                      style="
                        width:48px;
                        height:48px;
                        min-width:48px;
                        min-height:48px;
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

            </div>
          `
          : ""
      }

      <div class="champion-name">
        ${escapeHtml(
          winner.team || "TBD"
        )}
      </div>

      ${
        isDecided
          ? `
            <div class="champion-stats">
              ${winner.pts ?? 0}
              pts • GD
              ${winner.gd ?? 0}
            </div>
          `
          : `
            <div class="champion-stats">
              League in progress
            </div>
          `
      }

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
        statMatches: 0,
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
    
    home.possession += homePossession;
    away.possession += awayPossession;
    
    home.shots += homeShots;
    away.shots += awayShots;
    
    home.shotsOnTarget +=
      homeShotsOnTarget;
    
    away.shotsOnTarget +=
      awayShotsOnTarget;
  });
  
  return Object.values(teams)
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
        (team.goals /
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
    })
    .sort(
      (a, b) =>
      b.goals - a.goals ||
      b.goalEfficiency -
      a.goalEfficiency
    );
}

function renderTeamPerformance(
  matches
) {
  const container =
    document.getElementById(
      "teamPerformance"
    );
  
  if (!container) return;
  
  const teams =
    getTeamPerformance(matches);
  
  if (!teams.length) {
    container.innerHTML = `
      <div class="team-performance-empty">
        No team performance data available yet.
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="team-performance-card">
      
      <div class="team-performance-header">
        <h3>📊 Team Performance Statistics </h3>
         </div>
      <p class="team-performance-description">
  These statistics show how each team has performed in the tournament.
  Possession shows the average share of the ball, Shots shows average attempts
  per match, SOT means shots on target, Shot Accuracy is the percentage of
  shots that were on target, and Goal Efficiency is the percentage of shots
  converted into goals.
</p>

      <div class="team-performance-table-wrap">
        <table class="team-performance-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>MP</th>
              <th>Poss</th>
              <th>Shots</th>
              <th>SOT</th>
              <th>Accuracy</th>
              <th>Efficiency</th>
            </tr>
          </thead>

          <tbody>
            ${teams.map(team => `
              <tr>
                <td>
                  <div class="team-performance-name">
                    ${
                      team.name ||
                      "Unknown Team"
                    }
                  </div>
                </td>

                <td>
                  ${team.matchesPlayed}
                </td>

                <td>
                  ${
                    team.statMatches
                      ? team.averagePossession.toFixed(1)
                      : "-"
                  }%
                </td>

                <td>
                  ${
                    team.statMatches
                      ? team.averageShots.toFixed(1)
                      : "-"
                  }
                </td>

                <td>
                  ${
                    team.statMatches
                      ? team.averageShotsOnTarget.toFixed(1)
                      : "-"
                  }
                </td>

                <td>
                  ${
                    team.statMatches
                      ? team.shotAccuracy.toFixed(1)
                      : "-"
                  }%
                </td>

                <td>
                  ${
                    team.statMatches
                      ? team.goalEfficiency.toFixed(1)
                      : "-"
                  }%
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

    </div>
  `;
}