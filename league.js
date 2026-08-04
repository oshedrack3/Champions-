function toggleScreenshotMode() {
  document.querySelector('.table-wrapper').classList.toggle('screenshot-mode');
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




function renderChampionPodium() {
  const el = document.getElementById("championPodium");
  const tournament = getCurrentTournament();
  if (!el || !tournament) return;
  
  const winner = getLeagueWinnerFinal();
  if (!winner) return;
  
  const winnerTeamKey = winner.id || winner.team;
  const rawLogo = tournament.teamLogos?.[winnerTeamKey] || tournament.teamLogos?.[winner.team];
  const logoUrl = typeof rawLogo === "object" && rawLogo !== null
    ? (rawLogo.url || rawLogo.src || rawLogo.href || "")
    : (rawLogo || "");

  const rawTournamentLogo = tournament.tournamentImage || tournament.logo || "";
  const tournamentLogoUrl = typeof rawTournamentLogo === "object" && rawTournamentLogo !== null
    ? (rawTournamentLogo.url || rawTournamentLogo.src || rawTournamentLogo.href || "")
    : (rawTournamentLogo || "");
  
  const isDecided = winner.decided && winner.team !== "TBD";
  
  el.innerHTML = `
    <div class="champion-card">

      <div class="champion-tournament-logo">
        ${
          tournamentLogoUrl
            ? `<img src="${tournamentLogoUrl}" class="tournament-logo" style="max-width:48px;max-height:48px;display:inline-block;object-fit:contain;">`
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
        ${winner.team || "TBD"}
      </div>

      ${
        isDecided
          ? `<div class="champion-stats">${winner.pts ?? 0} pts • GD ${winner.gd ?? 0}</div>`
          : `<div class="champion-stats">League in progress</div>`
      }

    </div>
  `;
  
  if (isDecided && logoUrl) {
    const wrap = el.querySelector(".champion-team-logo-wrap");
    const placeholder = wrap?.querySelector(".team-logo-placeholder");
    
    if (wrap && placeholder) {
      const img = document.createElement("img");
      img.className = "champion-team-logo";
      img.src = logoUrl;
      img.alt = winner.team || "";
      img.style.width = "48px";
      img.style.height = "48px";
      img.style.minWidth = "48px";
      img.style.minHeight = "48px";
      img.style.display = "inline-block";
      img.style.objectFit = "contain";
      
      img.onerror = () => {
        console.warn("Failed to load champion logo:", logoUrl);
      };
      
      wrap.replaceChild(img, placeholder);
    }
  }
}

function getLeagueWinnerFinal() {
  const tournament = getCurrentTournament();
  if (!tournament) return null;
  
  const matches = tournament.matches || [];
  const rawTeams = tournament.teams || {};
  
  const teamList = Array.isArray(rawTeams) ? rawTeams : Object.values(rawTeams);
  const table = {};
  const teamLookup = {};
  
  teamList.forEach((team) => {
    if (!team) return;

    const name = typeof team === "object" ? (team.name || team.id) : String(team);
    const id = typeof team === "object" ? (team.id || team.name) : String(team);

    if (!name && !id) return;

    const teamObj = {
      id: id || name,
      name: name || id,
      p: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      pts: 0,
      remaining: 0
    };

    table[teamObj.id] = teamObj;
    teamLookup[teamObj.id] = teamObj.id;
    teamLookup[teamObj.name] = teamObj.id;
  });

  let allPlayed = true;
  
  matches.forEach(match => {
    if (!match) return;

    const rawHome = typeof match.home === "object" ? (match.home.id || match.home.name) : match.home;
    const rawAway = typeof match.away === "object" ? (match.away.id || match.away.name) : match.away;
    
    const homeId = teamLookup[rawHome];
    const awayId = teamLookup[rawAway];

    if (!homeId || !awayId || !table[homeId] || !table[awayId]) return;
    
    if (!match.played) {
      allPlayed = false;
      table[homeId].remaining++;
      table[awayId].remaining++;
      return;
    }
    
    const hg = Number(match.homeGoals ?? match.homeScore ?? 0);
    const ag = Number(match.awayGoals ?? match.awayScore ?? 0);
    
    const home = table[homeId];
    const away = table[awayId];
    
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
      id: leader.id,
      team: leader.name,
      pts: leader.pts ?? 0,
      gd: (leader.gf ?? 0) - (leader.ga ?? 0),
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
        id: leader.id,
        team: leader.name,
        pts: leader.pts ?? 0,
        gd: (leader.gf ?? 0) - (leader.ga ?? 0),
        finished: false,
        decided: true
      };
    }
  }
  
  const decided = sorted.every(team => {
    if (team.id === leader.id) return true;
    return team.pts + team.remaining * 3 < leader.pts;
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
    pts: leader.pts ?? 0,
    gd: (leader.gf ?? 0) - (leader.ga ?? 0),
    finished: false,
    decided: true
  };
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