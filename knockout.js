async function generateTournament() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) {
    return;
  }
  
  const tournamentPlayers =
    Array.isArray(
      tournament.tournament_players
    ) ?
    tournament.tournament_players :
    [];
  
  const teams =
    tournamentPlayers
    .filter(
      player =>
      player.status === "accepted" &&
      player.team_id
    )
    .map(
      player => ({
        id: player.team_id,
        name: player.team_name,
        logo: player.team_logo
      })
    );
  
  if (teams.length < 2) {
    showAlert(
      "❌ Add at least 2 teams"
    );
    return;
  }
  
  const settings =
    getTournamentSettings();
  
  if (
    !Number.isInteger(
      settings.knockoutSize
    ) ||
    ![2, 4, 8, 16, 32].includes(
      settings.knockoutSize
    )
  ) {
    showAlert(
      "Select a valid tournament stage."
    );
    return;
  }
  
  const validation =
    validateTournamentSetup(
      tournament,
      settings
    );
  
  if (!validation.valid) {
    showAlert(
      validation.message
    );
    return;
  }
  
  const body = {
    settings
  };
  
  if (
    settings.enableGroups &&
    settings.groupingMode === "manual"
  ) {
    body.groups =
      Array.isArray(
        tournament.groups
      ) ?
      tournament.groups :
      [];
  }
  
  if (
    settings.knockoutPairingMode ===
    "manual"
  ) {
    body.manualKnockoutPairs =
      Array.isArray(
        tournament.manualKnockoutPairs
      ) ?
      tournament.manualKnockoutPairs :
      [];
  }
  
  showLoader();
  
  try {
    const res =
      await apiRequest(
        `${API}/tournaments/${encodeURIComponent(
          tournament.id
        )}/generate-cup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: getToken()
          },
          body: JSON.stringify(body)
        },
        generateTournament
      );
    
    if (!res) {
      return;
    }
    
    const responseText =
      await res.text();
    
    let result = {};
    
    try {
      result =
        responseText ?
        JSON.parse(
          responseText
        ) :
        {};
    } catch {
      throw new Error(
        `Server returned an invalid response (${res.status}).`
      );
    }
    
    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        result.error ||
        `Failed to generate tournament (${res.status}).`
      );
    }
    
    Object.assign(
  tournament,
  result.tournament || {}
);

fixtures = [];

fixturesLoaded = false;

fixturesTournamentId = null;

tableCache = null;

cachedTournamentId = null;

showActionModal(
  "✅ Tournament Generated",
  "success"
);
    
  } catch (err) {
    console.error(
      "[generateTournament] Error:",
      err
    );
    
    console.error(
      "[generateTournament] Message:",
      err?.message
    );
    
    console.error(
      "[generateTournament] Stack:",
      err?.stack
    );
    
    showAlert(
      err?.message ||
      "❌ Failed to generate tournament."
    );
    
  } finally {
    hideLoader();
  }
}


function validateTournamentSetup(
  tournament,
  settings
) {
  const teams =
    (tournament.tournament_players || [])
    .filter(
      player =>
      player.status === "accepted" &&
      player.team_id
    );
  
  if (teams.length < 2) {
    return {
      valid: false,
      message: "❌ Add at least 2 teams"
    };
  }
  
  if (settings.enableGroups) {
    const totalGroups =
      Math.ceil(
        teams.length /
        settings.teamsPerGroup
      );
    
    const totalQualifiers =
      totalGroups *
      settings.teamsQualify;
    
    if (
      totalQualifiers !==
      settings.knockoutSize
    ) {
      return {
        valid: false,
        message: `⚠️ Bracket Imbalance!\n\n` +
          `Your group setup yields ${totalQualifiers} qualifying teams, ` +
          `but your bracket size requires exactly ${settings.knockoutSize}.`
      };
    }
  } else {
    if (
      teams.length !==
      settings.knockoutSize
    ) {
      return {
        valid: false,
        message: `⚠️ Team Count Mismatch!\n\n` +
          `You selected a ${settings.knockoutSize}-team bracket ` +
          `but currently have ${teams.length} teams.`
      };
    }
  }
  
  return {
    valid: true
  };
}

function getTournamentSettings() {
  const startFrom =
    document.getElementById(
      "tournamentStartFrom"
    )?.value;
  
  const enableGroups =
    document.getElementById(
      "enableGroups"
    )?.checked || false;
  
  return {
    enableGroups,
    
    groupingMode: document.getElementById(
      "groupingMode"
    )?.value || "auto",
    
    groupRoundMode: document.getElementById(
      "groupRoundMode"
    )?.value || "single",
    
    teamsPerGroup: parseInt(
      document.getElementById(
        "teamsPerGroup"
      )?.value,
      10
    ) || 4,
    
    teamsQualify: parseInt(
      document.getElementById(
        "teamsQualify"
      )?.value,
      10
    ) || 2,
    
    knockoutSize: parseInt(
      startFrom,
      10
    ),
    
    knockoutPairingMode: document.getElementById(
      "knockoutPairingMode"
    )?.value || "auto",
    
    knockoutRoundMode: document.getElementById(
      "knockoutRoundMode"
    )?.value || "single",
    
    thirdPlaceMatch: document.getElementById(
      "thirdPlaceMatch"
    )?.checked || false
  };
}









window.addEventListener(
  "resize",
  () => {
    requestAnimationFrame(
      redrawBracketConnections
    );
  }
);

function setCupRound(round) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const value = Number(round);
  
  tournament.cupRound = value;
  
  setCurrentTournament(tournament);
  
  localStorage.setItem(
    `cupRound_${tournament.id}`,
    String(value)
  );
}

function getCupRound() {
  const tournament = getCurrentTournament();
  
  if (!tournament) return 1;
  
  return Number(
    localStorage.getItem(
      `cupRound_${tournament.id}`
    ) || 1
  );
}

function getMaxCupRound() {
  const tournament = getCurrentTournament();
  
  if (!tournament) return 1;
  
  const matches =
    tournament.groupMatches || [];
  
  if (!matches.length) return 1;
  
  return Math.max(
    ...matches.map(
      match => Number(match.round) || 1
    )
  );
}

function nextCupRound() {
  const current = getCupRound();
  const max = getMaxCupRound();
  
  if (current >= max) return;
  
  setCupRound(current + 1);
  
  renderCupFixtures();
}

function prevCupRound() {
  const current = getCupRound();
  
  if (current <= 1) return;
  
  setCupRound(current - 1);
  
  renderCupFixtures();
}

function updateCupRoundLabel(round) {
  const roundLabel =
    document.getElementById("cupRoundLabel");
  
  if (roundLabel) {
    roundLabel.textContent =
      `Matchday ${round}`;
  }
}

function renderCupFixtures() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container =
    document.getElementById("cupFixtures");
  
  if (!container) return;
  
  container.innerHTML = "";
  
  if (!tournament.groups?.length) {
    container.innerHTML = `
      <p class="emptyText">
        No Group Stage matches for Direct Knockout Cups
        <br>
        Check the bracket Section to see The KnockOut matches
      </p>
    `;
    return;
  }
  
  const currentRound =
    getCupRound();
  
  updateCupRoundLabel(
    currentRound
  );
  
  tournament.groups.forEach(
    group => {
      renderCupFixtureGroup(
        container,
        tournament,
        group,
        currentRound
      );
    }
  );
}

function renderCupFixtureGroup(
  container,
  tournament,
  group,
  currentRound
) {
  const matches =
    (tournament.groupMatches || []).filter(
      match =>
      match.group === group.name &&
      match.round === currentRound
    );
  
  if (!matches.length) return;
  
  const groupCard =
    document.createElement("div");
  
  groupCard.className = "groupCard";
  
  loadCupGroupWatermark(
    groupCard,
    tournament
  );
  
  groupCard.innerHTML = `
    <div class="groupHeader">
      <h3>${group.name}</h3>
    </div>

    <div class="groupMatches"></div>
  `;
  
  const matchesContainer =
    groupCard.querySelector(".groupMatches");
  
  matches.forEach((match, index) => {
    renderCupFixtureMatch(
      matchesContainer,
      tournament,
      group,
      match,
      index,
      currentRound
    );
  });
  
  container.appendChild(groupCard);
}


function renderCupFixtureMatch(
  container,
  tournament,
  group,
  match,
  index,
  currentRound
) {
  const submission =
    getSubmission(
      match,
      tournament
    );
  
  
  const homeName =
    getCupTeamName(match.home);
  
  const awayName =
    getCupTeamName(match.away);
  
  const groupClean =
    group.name.replace(/\s+/g, "");
  
  const row =
    document.createElement("div");
  
  row.className =
    `fixture-row ${
      match.played
        ? "played"
        : "not-played"
    }`;
  
  row.dataset.index = index;
  
  row.innerHTML = `
    <div class="fixture-label">
      ${tournament.name || "Tournament"}
      • ${group.name}
      • R${String(currentRound).padStart(2, "0")}
      ${getSubmissionBadge(
        match,
        submission
      )}
    </div>

    <div class="fixture-row-content">

      <div class="fixture-teams-stack">

        <div class="team-row-item team-home-${groupClean}-${index}">
          <div class="fixture-team-logo-placeholder">?</div>

          <span class="fixture-team-name">
            ${homeName}
          </span>
        </div>

        <div class="team-row-item team-away-${groupClean}-${index}">
          <div class="fixture-team-logo-placeholder">?</div>

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
                ${formatMatchDay(
                  match.scheduledAt
                )}
              </span>
            `
        }

      </div>

    </div>

    ${
      match.played
        ? `
          <div class="cup-playedTime">
            ${formatRecordedTime(
              match.playedAt
            )}
          </div>
        `
        : ""
    }
  `;
  
  loadCupFixtureLogos(
    row,
    tournament,
    homeName,
    awayName
  );
  
  row.style.cursor = "pointer";
  
  row.onclick = () =>
    onFixtureClick(
      match,
      submission
    );
  
  container.appendChild(row);
}

function loadCupFixtureLogos(
  row,
  tournament,
  homeName,
  awayName
) {
  const homeLogo =
    getTeamLogo(
      tournament,
      homeName
    );
  
  const awayLogo =
    getTeamLogo(
      tournament,
      awayName
    );
  
  loadCupFixtureLogo(
    row.querySelector(
      ".team-row-item:first-child"
    ),
    homeLogo,
    homeName
  );
  
  loadCupFixtureLogo(
    row.querySelector(
      ".team-row-item:last-child"
    ),
    awayLogo,
    awayName
  );
}

function loadCupFixtureLogo(
  teamRow,
  logoUrl,
  teamName
) {
  if (
    !teamRow ||
    !logoUrl ||
    !teamName ||
    teamName === "TBD" ||
    teamName === "BYE" ||
    teamName === "Awaiting Winner"
  ) {
    return;
  }
  
  const placeholder =
    teamRow.querySelector(
      ".fixture-team-logo-placeholder"
    );
  
  if (!placeholder) return;
  
  const img =
    document.createElement("img");
  
  img.className =
    "fixture-team-logo";
  
  img.src = logoUrl;
  img.alt = `${teamName} logo`;
  
  img.onerror = () => {
    img.remove();
  };
  
  teamRow.replaceChild(
    img,
    placeholder
  );
}

function loadCupGroupWatermark(
  groupCard,
  tournament
) {
  if (!tournament?.tournamentImage) {
    return;
  }
  
  const image =
    typeof tournament.tournamentImage === "string" ?
    tournament.tournamentImage :
    tournament.tournamentImage?.url;
  
  if (!image) {
    return;
  }
  
  groupCard.style.setProperty(
    "--watermark",
    `url("${image}")`
  );
  
  groupCard.classList.add(
    "has-watermark"
  );
}

function getCupTeamName(team) {
  if (!team || team === "BYE") {
    return "TBD";
  }
  
  if (typeof team === "string") {
    return team;
  }
  
  return team.name || "TBD";
}

function loadCupTableLogo(
  row,
  tournament,
  teamName
) {
  const logoUrl =
    getTeamLogo(
      tournament,
      teamName
    );
  
  if (!logoUrl) return;
  
  const teamCell =
    row.querySelector(
      ".table-team-cell"
    );
  
  const placeholder =
    teamCell?.querySelector(
      ".team-logo-placeholder"
    );
  
  if (!teamCell || !placeholder) {
    return;
  }
  
  const img =
    document.createElement("img");
  
  img.className =
    "table-team-logo";
  
  img.src = logoUrl;
  img.alt =
    `${teamName} logo`;
  
  img.onerror = () => {
    img.remove();
  };
  
  teamCell.replaceChild(
    img,
    placeholder
  );
}

function getKnockoutWinner(match) {
  if (
    match.homeGoals >
    match.awayGoals
  ) {
    return match.home;
  }
  
  if (
    match.awayGoals >
    match.homeGoals
  ) {
    return match.away;
  }
  
  return null;
}

function showChampionAnimation(
  teamName,
  logoUrl
) {
  const overlay =
    document.createElement("div");
  
  overlay.className =
    "champion-overlay";
  
  overlay.innerHTML = `
    <div class="champion-box">

      ${
        logoUrl
          ? `
            <img
              src="${logoUrl}"
              class="champion-logo"
              alt="${teamName} logo"
            >
          `
          : `
            <div class="champion-logo-placeholder">
              🏆
            </div>
          `
      }

      <div class="trophy">
        🏆
      </div>

      <h1>${teamName}</h1>

      <p>CHAMPION</p>

    </div>
  `;
  
  document.body.appendChild(
    overlay
  );
  
  setTimeout(() => {
    overlay.classList.add("show");
  }, 50);
  
  setTimeout(() => {
    overlay.classList.remove("show");
    
    setTimeout(() => {
      overlay.remove();
    }, 600);
  }, 3000);
  
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.remove();
    }
    
    startChampionLoop(
      teamName,
      logoUrl
    );
  }, 3000);
}

function startChampionLoop(teamName, logoUrl) {
  const logoHtml = logoUrl ?
    `
      <img
        src="${logoUrl}"
        class="loop-logo"
        alt="${teamName} logo"
      >
    ` :
    `
      <div class="loop-logo-placeholder">
        🏆
      </div>
    `;
  
  const loop =
    document.createElement("div");
  
  loop.className =
    "champion-loop";
  
  loop.innerHTML = `
    <div class="loop-content">
      ${logoHtml}

      <h2>
        ${teamName} - CHAMPION
      </h2>

      <div class="sparkles"></div>
    </div>
  `;
  
  document.body.appendChild(loop);
  
  setTimeout(() => {
    loop.classList.add("fade-out");
    
    setTimeout(() => {
      loop.remove();
    }, 600);
  }, 4000);
}

function toggleCupView(view) {
  document
    .querySelectorAll(".cupTopActions .cup-tab")
    .forEach(btn =>
      btn.classList.remove("active")
    );
  
  const cupBox =
    document.getElementById("cupBox");
  
  const setUpTop =
    document.getElementById("setUpTop");
  
  const fixtures =
    document.getElementById("cupFixtures");
  
  const tables =
    document.getElementById("cupTables");
  
  const knockOut =
    document.getElementById("knockOut");
  
  const bracketControl =
    document.getElementById("bracketControl");
  
  const home =
    document.getElementById("cupHome");
  
  const roundBar =
    document.querySelector(".cupRoundBar");
  
  const cupTab =
    document.getElementById("cupTab");
  const btnbackBracket =
    document.getElementById("btnbackBracket");
  
  const cupSchedule =
    document.getElementById("cupSchedule");
  
  cupBox.style.display = "none";
  setUpTop.style.display = "none";
  fixtures.style.display = "none";
  tables.style.display = "none";
  knockOut.style.display = "none";
  bracketControl.style.display = "none";
  home.style.display = "none";
  cupTab.style.display = "none";
  cupSchedule.style.display = "none";
  btnbackBracket.style.display = "none";
  
  if (roundBar) {
    roundBar.style.display = "none";
  }
  
  if (view === "cupBox") {
    cupBox.style.display = "block";
    setUpTop.style.display = "flex";
    
    renderTeams();
  }
  
  else if (view === "fixtures") {
    fixtures.style.display = "flex";
    cupTab.style.display = "flex";
    
    if (roundBar) {
      roundBar.style.display = "flex";
    }
    
    renderCupFixtures();
    
    const tabs =
      document.querySelectorAll(".cup-tab");
    
    if (tabs[0]) {
      tabs[0].classList.add("active");
    }
  }
  
  else if (view === "knockOut") {
    knockOut.style.display = "flex";
    bracketControl.style.display = "flex";
    cupTab.style.display = "flex";
    
    toggleBracketMode("bracket");
    enableKnockoutSwipe();
    
    const tabs =
      document.querySelectorAll(".cup-tab");
    
    if (tabs[2]) {
      tabs[2].classList.add("active");
    }
  }
  
  else {
    tables.style.display = "flex";
    cupTab.style.display = "flex";
    cupSchedule.style.display = "block";
    home.style.display = "flex";
    
    renderCupTables();
    
    const tabs =
      document.querySelectorAll(".cup-tab");
    
    if (tabs[1]) {
      tabs[1].classList.add("active");
    }
  }
}


function generateGroupStage(tournament) {
  if (!tournament?.settings) {
    return tournament;
  }
  
  const teamsPerGroup =
    Number(tournament.settings.teamsPerGroup);
  
  if (
    !Number.isFinite(teamsPerGroup) ||
    teamsPerGroup < 2
  ) {
    return tournament;
  }
  
  const teams =
    shuffleTeams(
      tournament.teams || []
    );
  
  const groups =
    createGroups(
      teams,
      teamsPerGroup
    );
  
  const groupMatches =
    createGroupMatches(
      groups
    );
  
  tournament.groups =
    groups;
  
  tournament.groupMatches =
    assignRoundDatesSmart(
      groupMatches,
      tournament
    );
  
  tournament.cupRound = 1;
  
  generateGroupTables(
    tournament
  );
  
  return tournament;
}

function shuffleTeams(teams) {
  const list = Array.isArray(teams) ?
    teams :
    Object.values(teams || {});
  
  return [...list].sort(
    () => Math.random() - 0.5
  );
}

function createGroups(
  teams,
  teamsPerGroup
) {
  const groups = [];
  
  const totalGroups =
    Math.ceil(
      teams.length /
      teamsPerGroup
    );
  
  let groupLetterCode = 65;
  
  for (
    let index = 0; index < totalGroups; index++
  ) {
    const groupTeams =
      teams.slice(
        index * teamsPerGroup,
        (index + 1) * teamsPerGroup
      );
    
    groups.push({
      name: `Group ${String.fromCharCode(
          groupLetterCode++
        )}`,
      
      index,
      
      teams: [
        ...groupTeams
      ]
    });
  }
  
  return groups;
}

function createGroupMatches(
  groups
) {
  const matches = [];
  
  groups.forEach(group => {
    const teams = [...group.teams];
    
    if (teams.length % 2 !== 0) {
      teams.push("BYE");
    }
    
    const totalTeams =
      teams.length;
    
    const totalRounds =
      totalTeams - 1;
    
    const halfSize =
      totalTeams / 2;
    
    for (
      let round = 0; round < totalRounds; round++
    ) {
      
      createRoundMatches(
        matches,
        group,
        teams,
        round + 1,
        halfSize,
        totalTeams
      );
      
      rotateGroupTeams(
        teams
      );
    }
  });
  
  return matches;
}

function createRoundMatches(
  matches,
  group,
  teams,
  round,
  halfSize,
  totalTeams
) {
  for (
    let i = 0; i < halfSize; i++
  ) {
    const home =
      teams[i];
    
    const away =
      teams[
        totalTeams - 1 - i
      ];
    
    if (
      home === "BYE" ||
      away === "BYE"
    ) {
      continue;
    }
    
    matches.push({
      id: `GR_${group.name}_R${round}_M${i + 1}`,
      
      type: "group",
      
      group: group.name,
      
      groupIndex: group.index,
      
      round,
      
      home,
      
      away,
      
      homeGoals: null,
      
      awayGoals: null,
      
      played: false
    });
  }
}

function rotateGroupTeams(teams) {
  teams.splice(
    1,
    0,
    teams.pop()
  );
}

function generateGroupTables(tournament) {
  tournament.groupTables = {};
  
  if (!tournament?.groups?.length) {
    return {};
  }
  
  tournament.groups.forEach(group => {
    tournament.groupTables[group.name] =
      generateSingleGroupTable(
        tournament,
        group
      );
  });
  
  return tournament.groupTables;
}

function generateSingleGroupTable(
  tournament,
  group
) {
  const table =
    createInitialGroupTable(group);
  
  const matches =
    getPlayedGroupMatches(
      tournament,
      group
    );
  
  matches.forEach(match => {
    applyMatchToGroupTable(
      table,
      match
    );
  });
  
  return sortGroupTable(table);
}

function createInitialGroupTable(group) {
  const table = {};
  
  group.teams.forEach(team => {
    const teamName =
      typeof team === "string" ?
      team :
      team?.name;
    
    if (
      !teamName ||
      teamName === "BYE"
    ) {
      return;
    }
    
    table[teamName] = {
      name: teamName,
      p: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
      pos: 0
    };
  });
  
  return table;
}

function getPlayedGroupMatches(
  tournament,
  group
) {
  return (
    tournament.groupMatches || []
  ).filter(
    match =>
    match.group === group.name &&
    match.played
  );
}

function applyMatchToGroupTable(
  table,
  match
) {
  const homeName =
    typeof match.home === "string" ?
    match.home :
    match.home?.name;
  
  const awayName =
    typeof match.away === "string" ?
    match.away :
    match.away?.name;
  
  const home =
    table[homeName];
  
  const away =
    table[awayName];
  
  if (!home || !away) {
    return;
  }
  
  const homeGoals =
    Number(match.homeGoals) || 0;
  
  const awayGoals =
    Number(match.awayGoals) || 0;
  
  updateTeamStats(
    home,
    homeGoals,
    awayGoals
  );
  
  updateTeamStats(
    away,
    awayGoals,
    homeGoals
  );
  
  updateMatchResult(
    home,
    away,
    homeGoals,
    awayGoals
  );
}

function updateTeamStats(
  team,
  goalsFor,
  goalsAgainst
) {
  team.p++;
  
  team.gf += goalsFor;
  team.ga += goalsAgainst;
  
  team.gd =
    team.gf - team.ga;
}

function updateMatchResult(
  home,
  away,
  homeGoals,
  awayGoals
) {
  if (homeGoals > awayGoals) {
    home.w++;
    home.pts += 3;
    away.l++;
    return;
  }
  
  if (awayGoals > homeGoals) {
    away.w++;
    away.pts += 3;
    home.l++;
    return;
  }
  
  home.d++;
  away.d++;
  
  home.pts++;
  away.pts++;
}

function sortGroupTable(table) {
  const sorted =
    Object.values(table).sort(
      (a, b) => {
        
        if (b.pts !== a.pts) {
          return b.pts - a.pts;
        }
        
        if (b.gd !== a.gd) {
          return b.gd - a.gd;
        }
        
        if (b.gf !== a.gf) {
          return b.gf - a.gf;
        }
        
        return a.name.localeCompare(
          b.name
        );
      }
    );
  
  assignTablePositions(
    sorted
  );
  
  return sorted;
}

function assignTablePositions(table) {
  table.forEach(
    (team, index) => {
      team.pos = index + 1;
    }
  );
}


function getQualifiedTeams(tournament) {
  if (
    !tournament ||
    !tournament.groups ||
    !tournament.settings
  ) {
    return [];
  }
  
  if (
    typeof generateGroupTables ===
    "function"
  ) {
    generateGroupTables(
      tournament
    );
  }
  
  const teamsQualify =
    tournament.settings.teamsQualify ||
    tournament.settings.qualifiersPerGroup ||
    2;
  
  const tournamentTeams =
    Object.values(
      tournament.teams || {}
    );
  
  const qualifiedTeams = [];
  
  tournament.groups.forEach(
    group => {
      const table =
        tournament.groupTables?.[
          group.name
        ] || [];
      
      const sortedTeams = [...table].sort(
        (a, b) =>
        Number(a.pos || 0) -
        Number(b.pos || 0)
      );
      
      for (
        let i = 0; i < teamsQualify; i++
      ) {
        const standingRow =
          sortedTeams[i];
        
        if (!standingRow) {
          continue;
        }
        
        const teamName =
          standingRow.name ||
          standingRow.team;
        
        const teamData =
          tournamentTeams.find(
            team =>
            String(
              team.name
            ).toLowerCase() ===
            String(
              teamName
            ).toLowerCase()
          );
        
        qualifiedTeams.push({
          id: teamData?.id ||
            null,
          
          name: teamName,
          
          group: group.name,
          
          pos: Number(
            standingRow.pos
          ),
          
          isBye: false
        });
      }
    }
  );
  
  return qualifiedTeams;
}

function getKnockoutPairings(
  teams,
  knockoutSize,
  useGroups
) {
  if (!teams.length) {
    return [];
  }
  
  if (!useGroups) {
    return [...teams]
      .sort(() => Math.random() - 0.5)
      .slice(0, knockoutSize);
  }
  
  return pairByGroupRules(
    teams,
    knockoutSize
  );
}

function pairByGroupRules(
  teams,
  knockoutSize
) {
  const seeds =
    teams.filter(
      team => Number(team.pos) === 1
    );
  
  const runners =
    teams.filter(
      team => Number(team.pos) === 2
    );
  
  seeds.sort(
    (a, b) =>
    String(a.group).localeCompare(
      String(b.group)
    )
  );
  
  runners.sort(
    (a, b) =>
    String(a.group).localeCompare(
      String(b.group)
    )
  );
  
  const result = [];
  
  const numMatches =
    knockoutSize / 2;
  
  const offset =
    Math.ceil(numMatches / 2);
  
  for (
    let i = 0; i < numMatches; i++
  ) {
    const seed = seeds[i];
    
    const runnerIndex =
      (i + offset) %
      runners.length;
    
    const runner =
      runners[runnerIndex];
    
    if (seed && runner) {
      result.push(seed);
      result.push(runner);
    }
  }
  
  return result;
}

function generateDirectKnockOut(
  tournament
) {
  if (!tournament) return;
  
  const knockoutSize =
    tournament.settings?.knockoutSize;
  
  if (!knockoutSize) return;
  
  if (
    knockoutSize < 2 ||
    !Number.isInteger(knockoutSize) ||
    (knockoutSize &
      (knockoutSize - 1)) !== 0
  ) {
    console.error(
      "Invalid knockout size:",
      knockoutSize
    );
    return;
  }
  
  const useGroups =
    Array.isArray(tournament.groups) &&
    tournament.groups.length > 0;
  
  const teams = useGroups ?
    getQualifiedTeams(tournament) :
    Object.values(
      tournament.teams || {}
    );
  
  if (!teams.length) {
    console.error(
      "No teams available for knockout generation"
    );
    return;
  }
  
  const pairedTeams =
    getKnockoutPairings(
      teams,
      knockoutSize,
      useGroups
    );
  
  if (
    pairedTeams.length !== knockoutSize
  ) {
    console.error(
      "Invalid knockout pairing count:",
      pairedTeams.length,
      "expected:",
      knockoutSize
    );
    return;
  }
  
  const totalRounds =
    Math.log2(knockoutSize);
  
  const knockoutMatches = [];
  
  for (
    let i = 0; i < pairedTeams.length; i += 2
  ) {
    knockoutMatches.push({
      id: `KO_R1_M${i / 2}`,
      roundIndex: 1,
      slot: i / 2,
      home: pairedTeams[i].name,
      away: pairedTeams[i + 1].name,
      homeGoals: null,
      awayGoals: null,
      played: false,
      winner: null
    });
  }
  
  for (
    let round = 2; round <= totalRounds; round++
  ) {
    const matchesInRound =
      Math.pow(
        2,
        totalRounds - round
      );
    
    for (
      let slot = 0; slot < matchesInRound; slot++
    ) {
      knockoutMatches.push({
        id: `KO_R${round}_M${slot}`,
        roundIndex: round,
        slot,
        home: "TBD",
        away: "TBD",
        homeGoals: null,
        awayGoals: null,
        played: false,
        winner: null
      });
    }
  }
  
  tournament.knockoutMatches =
    assignKnockoutDates(
      knockoutMatches,
      tournament
    );
  
  return tournament.knockoutMatches;
}

async function checkForEndOfGroupstage() {
  const tournament =
    typeof getCurrentTournament === "function" ?
    getCurrentTournament() :
    null;
  
  if (!tournament || !tournament.groups?.length) {
    return;
  }
  
  let totalExpectedMatches = 0;
  
  tournament.groups.forEach(group => {
    let teamCount =
      Array.isArray(group.teams) ?
      group.teams.length :
      0;
    
    if (teamCount % 2 !== 0) {
      teamCount++;
    }
    
    totalExpectedMatches +=
      (teamCount * (teamCount - 1)) / 2;
  });
  
  const playedMatches =
    (tournament.groupMatches || [])
    .filter(match => match.played)
    .length;
  
  if (
    playedMatches !==
    totalExpectedMatches
  ) {
    return;
  }
  
  const qualifiedTeams =
    getQualifiedTeams(tournament);
  
  if (!qualifiedTeams.length) {
    return;
  }
  
  tournament.qualifiedTeams =
    qualifiedTeams;
  
  const knockoutMatches =
    generateDirectKnockOut(
      tournament
    );
  
  if (!knockoutMatches?.length) {
    showAlert(
      "❌ Failed to generate knockout stage."
    );
    return;
  }
  
  try {
    await updateTournament(
      tournament.id,
      {
        updates: {
          groupStageComplete: true,
          qualifiedTeams: tournament.qualifiedTeams,
          knockoutMatches: tournament.knockoutMatches
        }
      }
    );
    
    tournament.groupStageComplete =
      true;
    
    setCurrentTournament(
      tournament
    );
    
    showAlert(
      "Group Stage Completed ✅",
      "Knockout matches had been Generated"
    );
    
    renderFullBracket();
    
  } catch (error) {
    console.error(
      "Failed to save knockout stage:",
      error
    );
    
    tournament.groupStageComplete =
      false;
    
    showAlert(
      "❌ Failed to save knockout stage. Please try again."
    );
  }
}














let bracketZoom = 1;
let initialDistance = 0;

function applyBracketZoom() { // renamed to match calls
  const bracket = document.getElementById("bracket-container"); // fixed ID case
  
  if (!bracket) return;
  
  bracket.style.transform = `scale(${bracketZoom})`;
  bracket.style.transformOrigin = "top left";
}

function zoomInBracket() {
  bracketZoom += 0.1;
  if (bracketZoom > 2) bracketZoom = 2;
  applyBracketZoom();
}

function zoomOutBracket() {
  bracketZoom -= 0.1;
  if (bracketZoom < 0.5) bracketZoom = 0.5;
  applyBracketZoom();
}

function resetBracketZoom() {
  bracketZoom = 1;
  applyBracketZoom();
}

function openPairingModal(
  mode,
  data = {}
) {
  pairingModalMode = mode;
  
  pairingModalData = {
    ...data
  };
  
  const modal =
    document.getElementById(
      "tmPairingModal"
    );
  
  const title =
    document.getElementById(
      "tmPairingModalTitle"
    );
  
  const content =
    document.getElementById(
      "tmPairingModalContent"
    );
  
  if (
    !modal ||
    !title ||
    !content
  ) {
    return;
  }
  
  if (mode === "groups") {
    title.textContent =
      "Assign Teams to Groups";
    
    renderGroupPairingModal(
      content,
      pairingModalData
    );
  }
  
  if (mode === "knockout") {
    title.textContent =
      "Manual Knockout Pairing";
    
    renderKnockoutPairingModal(
      content,
      pairingModalData
    );
  }
  
  modal.style.display = "flex";
}

function closePairingModal() {
  const modal =
    document.getElementById(
      "tmPairingModal"
    );
  
  if (modal) {
    modal.style.display = "none";
  }
  
  pairingModalMode = null;
  pairingModalData = null;
}

function openManualGroupSetup() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) {
    return;
  }
  
  if (
    !Array.isArray(
      tournament.tournament_players
    )
  ) {
    showAlert(
      "Tournament players not found."
    );
    
    return;
  }
  
  const teams =
    tournament.tournament_players
    .filter(
      player =>
      player.status === "accepted" &&
      player.team_id
    )
    .map(
      player => ({
        id: player.team_id,
        name: player.team_name,
        logo: player.team_logo
      })
    );
  
  if (teams.length < 2) {
    showAlert(
      "Add at least 2 teams first."
    );
    
    return;
  }
  
  const teamsPerGroup =
    parseInt(
      document.getElementById(
        "teamsPerGroup"
      )?.value,
      10
    ) || 4;
  
  const teamsQualify =
    parseInt(
      document.getElementById(
        "teamsQualify"
      )?.value,
      10
    ) || 1;
  
  const existingGroups =
    Array.isArray(
      tournament.groups
    ) ?
    tournament.groups : [];
  
  openPairingModal(
    "groups",
    {
      teams,
      teamsPerGroup,
      teamsQualify,
      groups: existingGroups
    }
  );
}

function renderGroupPairingModal(
  container,
  data
) {
  const teams =
    data.teams || [];
  
  const teamsPerGroup =
    Number(
      data.teamsPerGroup
    ) || 4;
  
  const totalGroups =
    Math.ceil(
      teams.length /
      teamsPerGroup
    );
  
  const existingGroups =
    Array.isArray(
      data.groups
    ) ?
    data.groups :
    [];
  
  let html = "";
  
  html += `
    <div class="tm-pairing-info">
      Assign every registered team to exactly one group.
      Each group can contain up to ${teamsPerGroup} teams.
    </div>
  `;
  
  for (
    let i = 0; i < totalGroups; i++
  ) {
    const existing =
      existingGroups[i] || {};
    
    const teamIds =
      Array.isArray(
        existing.teamIds
      ) ?
      existing.teamIds :
      [];
    
    html += `
      <div
        class="tm-pairing-group"
        data-group-index="${i}"
      >

        <div class="tm-pairing-group-header">

          <h4>
            ${escapeHtml(
              existing.name ||
              `Group ${String.fromCharCode(65 + i)}`
            )}
          </h4>

          <span
            id="tmPairingGroupCount${i}"
            class="tm-pairing-group-count"
          >
            ${teamIds.length}/${teamsPerGroup}
          </span>

        </div>

        <div
          id="tmPairingGroupTeams${i}"
          class="tm-pairing-team-list"
        >

          ${teams.map(team => `
            <label class="tm-pairing-team">

              <input
                type="checkbox"
                value="${escapeHtml(team.id)}"
                ${
                  teamIds.includes(
                    team.id
                  )
                    ? "checked"
                    : ""
                }
                onchange="updateManualGroupSelection(${i})"
              >

              <span>
                ${escapeHtml(
                  team.name
                )}
              </span>

            </label>
          `).join("")}

        </div>

      </div>
    `;
  }
  
  container.innerHTML =
    html;
}

function renderKnockoutPairingModal(
  container,
  data
) {
  const teams =
    data.teams || [];
  
  const knockoutSize =
    Number(
      data.knockoutSize
    );
  
  if (
    !Number.isInteger(
      knockoutSize
    ) ||
    ![2, 4, 8, 16, 32].includes(
      knockoutSize
    )
  ) {
    container.innerHTML = `
      <div class="tm-pairing-error">
        Invalid knockout size.
      </div>
    `;
    return;
  }
  
  const pairCount =
    knockoutSize / 2;
  
  const existingPairs =
    Array.isArray(
      data.pairs
    ) ?
    data.pairs :
    [];
  
  let html = "";
  
  html += `
    <div class="tm-pairing-info">
      Select the two teams for each first-round knockout match.
      Every qualified team must be used exactly once.
    </div>
  `;
  
  for (
    let i = 0; i < pairCount; i++
  ) {
    const existing =
      existingPairs[i] || [];
    
    const homeId =
      existing[0] || "";
    
    const awayId =
      existing[1] || "";
    
    html += `
      <div
        class="tm-pairing-knockout-pair"
        data-pair="${i}"
      >

        <div class="tm-pairing-knockout-title">
          Match ${i + 1}
        </div>

        <div class="tm-pairing-knockout-selects">

          <select
            id="tmPairingHome${i}"
            class="tm-pairing-select"
            onchange="validateKnockoutPairing()"
          >

            <option value="">
              Select Team
            </option>

            ${teams.map(team => `
              <option
                value="${escapeHtml(team.id)}"
                ${
                  homeId === team.id
                    ? "selected"
                    : ""
                }
              >
                ${escapeHtml(
                  team.name
                )}
              </option>
            `).join("")}

          </select>

          <span class="tm-pairing-vs">
            VS
          </span>

          <select
            id="tmPairingAway${i}"
            class="tm-pairing-select"
            onchange="validateKnockoutPairing()"
          >

            <option value="">
              Select Team
            </option>

            ${teams.map(team => `
              <option
                value="${escapeHtml(team.id)}"
                ${
                  awayId === team.id
                    ? "selected"
                    : ""
                }
              >
                ${escapeHtml(
                  team.name
                )}
              </option>
            `).join("")}

          </select>

        </div>

      </div>
    `;
  }
  
  container.innerHTML =
    html;
}

function updateManualGroupSelection(
  groupIndex
) {
  const group =
    document.getElementById(
      `tmPairingGroupTeams${groupIndex}`
    );
  
  const count =
    document.getElementById(
      `tmPairingGroupCount${groupIndex}`
    );
  
  const teamsPerGroup =
    Number(
      pairingModalData?.teamsPerGroup
    ) || 4;
  
  if (!group) {
    return;
  }
  
  const checked =
    group.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
  
  if (
    checked.length >
    teamsPerGroup
  ) {
    checked[
      checked.length - 1
    ].checked = false;
    
    showAlert(
      `A group can contain a maximum of ${teamsPerGroup} teams.`
    );
  }
  
  if (count) {
    count.textContent =
      `${group.querySelectorAll(
        'input[type="checkbox"]:checked'
      ).length}/${teamsPerGroup}`;
  }
}

function validateKnockoutPairing() {
  const knockoutSize =
    Number(
      pairingModalData?.knockoutSize
    );
  
  if (
    !Number.isInteger(
      knockoutSize
    )
  ) {
    return false;
  }
  
  const usedTeams =
    new Set();
  
  let valid = true;
  
  for (
    let i = 0; i < knockoutSize / 2; i++
  ) {
    const home =
      document.getElementById(
        `tmPairingHome${i}`
      )?.value;
    
    const away =
      document.getElementById(
        `tmPairingAway${i}`
      )?.value;
    
    if (!home || !away) {
      valid = false;
      continue;
    }
    
    if (home === away) {
      valid = false;
      continue;
    }
    
    if (usedTeams.has(home)) {
      valid = false;
    }
    
    if (usedTeams.has(away)) {
      valid = false;
    }
    
    usedTeams.add(home);
    usedTeams.add(away);
  }
  
  return valid;
}

function collectManualGroups() {
  const teams =
    pairingModalData?.teams || [];
  
  const teamsPerGroup =
    Number(
      pairingModalData?.teamsPerGroup
    ) || 4;
  
  const totalGroups =
    Math.ceil(
      teams.length /
      teamsPerGroup
    );
  
  const groups = [];
  
  const assignedTeams =
    new Set();
  
  for (
    let i = 0; i < totalGroups; i++
  ) {
    const group =
      document.getElementById(
        `tmPairingGroupTeams${i}`
      );
    
    if (!group) {
      throw new Error(
        `Group ${String.fromCharCode(65 + i)} is missing.`
      );
    }
    
    const selected = [
      ...group.querySelectorAll(
        'input[type="checkbox"]:checked'
      )
    ].map(
      input => input.value
    );
    
    if (
      selected.length === 0
    ) {
      throw new Error(
        `Group ${String.fromCharCode(65 + i)} cannot be empty.`
      );
    }
    
    if (
      selected.length >
      teamsPerGroup
    ) {
      throw new Error(
        `Group ${String.fromCharCode(65 + i)} has too many teams.`
      );
    }
    
    for (
      const teamId of selected
    ) {
      if (
        assignedTeams.has(
          teamId
        )
      ) {
        throw new Error(
          "A team cannot belong to more than one group."
        );
      }
      
      assignedTeams.add(
        teamId
      );
    }
    
    groups.push({
      id: pairingModalData?.groups?.[i]
        ?.id ||
        crypto.randomUUID(),
      
      name: pairingModalData?.groups?.[i]
        ?.name ||
        `Group ${String.fromCharCode(65 + i)}`,
      
      teamIds: selected
    });
  }
  
  if (
    assignedTeams.size !==
    teams.length
  ) {
    throw new Error(
      "Every registered team must be assigned to exactly one group."
    );
  }
  
  return groups;
}

function collectManualKnockoutPairs() {
  const knockoutSize =
    Number(
      pairingModalData?.knockoutSize
    );
  
  if (
    !Number.isInteger(
      knockoutSize
    )
  ) {
    throw new Error(
      "Invalid knockout size."
    );
  }
  
  const pairs = [];
  
  const usedTeams =
    new Set();
  
  for (
    let i = 0; i < knockoutSize / 2; i++
  ) {
    const home =
      document.getElementById(
        `tmPairingHome${i}`
      )?.value;
    
    const away =
      document.getElementById(
        `tmPairingAway${i}`
      )?.value;
    
    if (!home || !away) {
      throw new Error(
        `Match ${i + 1} is incomplete.`
      );
    }
    
    if (
      home === away
    ) {
      throw new Error(
        `Match ${i + 1} cannot contain the same team twice.`
      );
    }
    
    if (
      usedTeams.has(home) ||
      usedTeams.has(away)
    ) {
      throw new Error(
        "Each qualified team can only appear once in the first round."
      );
    }
    
    usedTeams.add(home);
    usedTeams.add(away);
    
    pairs.push([
      home,
      away
    ]);
  }
  
  if (
    usedTeams.size !==
    knockoutSize
  ) {
    throw new Error(
      `Exactly ${knockoutSize} qualified teams must be used.`
    );
  }
  
  return pairs;
}

async function savePairingModal() {
  if (
    pairingModalMode ===
    "groups"
  ) {
    await saveManualGroups();
    return;
  }
  
  if (
    pairingModalMode ===
    "knockout"
  ) {
    await saveManualKnockoutPairing();
    return;
  }
}

async function saveManualGroups() {
  try {
    const groups =
      collectManualGroups();
    
    const tournament =
      getCurrentTournament();
    
    if (!tournament) {
      return;
    }
    
    tournament.groups =
      groups;
    
    closePairingModal();
    
    showAlert(
      "Groups assigned successfully."
    );
    
  } catch (error) {
    showAlert(
      error.message ||
      "Failed to save groups."
    );
  }
}

async function saveManualKnockoutPairing() {
  try {
    const pairs =
      collectManualKnockoutPairs();
    
    const tournament =
      getCurrentTournament();
    
    if (!tournament) {
      return;
    }
    
    tournament.manualKnockoutPairs =
      pairs;
    
    closePairingModal();
    
    showAlert(
      "Knockout pairings saved successfully."
    );
    
  } catch (error) {
    showAlert(
      error.message ||
      "Failed to save knockout pairings."
    );
  }
}


function toggleGroupSettings() {
  const enableGroups =
    document.getElementById(
      "enableGroups"
    )?.checked;
  
  const groupOptions =
    document.getElementById(
      "groupOptions"
    );
  
  const manualGroupOptions =
    document.getElementById(
      "manualGroupOptions"
    );
  
  const groupStageCard =
    document.getElementById(
      "groupStageCard"
    );
  
  if (groupOptions) {
    groupOptions.style.display =
      enableGroups ?
      "block" :
      "none";
  }
  
  if (groupStageCard) {
    groupStageCard.style.display =
      "block";
  }
  
  if (!enableGroups) {
    if (manualGroupOptions) {
      manualGroupOptions.style.display =
        "none";
    }
  } else {
    handleGroupingModeChange();
  }
  
  handleKnockoutPairingModeChange();
}

function handleGroupingModeChange() {
  const enableGroups =
    document.getElementById(
      "enableGroups"
    )?.checked;
  
  const groupingMode =
    document.getElementById(
      "groupingMode"
    )?.value;
  
  const manualGroupOptions =
    document.getElementById(
      "manualGroupOptions"
    );
  
  if (!manualGroupOptions) {
    return;
  }
  
  manualGroupOptions.style.display =
    enableGroups &&
    groupingMode === "manual" ?
    "block" :
    "none";
}

function handleKnockoutPairingModeChange() {
  const knockoutPairingMode =
    document.getElementById(
      "knockoutPairingMode"
    )?.value;
  
  const manualKnockoutOptions =
    document.getElementById(
      "manualKnockoutOptions"
    );
  
  if (!manualKnockoutOptions) {
    return;
  }
  
  manualKnockoutOptions.style.display =
    knockoutPairingMode === "manual" ?
    "block" :
    "none";
}

function openPairingModal(
  mode,
  data = {}
) {
  pairingModalMode = mode;
  
  pairingModalData = {
    ...data
  };
  
  const modal =
    document.getElementById(
      "tmPairingModal"
    );
  
  const title =
    document.getElementById(
      "tmPairingModalTitle"
    );
  
  const content =
    document.getElementById(
      "tmPairingModalContent"
    );
  
  if (
    !modal ||
    !title ||
    !content
  ) {
    showAlert(
      "Pairing modal elements not found."
    );
    
    return;
  }
  
  if (mode === "groups") {
    title.textContent =
      "Assign Teams to Groups";
    
    if (
      typeof renderGroupPairingModal !==
      "function"
    ) {
      showAlert(
        "Group pairing function is missing."
      );
      
      return;
    }
    
    renderGroupPairingModal(
      content,
      pairingModalData
    );
  }
  
  if (mode === "knockout") {
    title.textContent =
      "Manual Knockout Pairing";
    
    if (
      typeof renderKnockoutPairingModal !==
      "function"
    ) {
      showAlert(
        "Knockout pairing function is missing."
      );
      
      return;
    }
    
    renderKnockoutPairingModal(
      content,
      pairingModalData
    );
  }
  
  modal.style.display = "flex";
}

function openManualKnockoutSetup() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) {
    showAlert(
      "No current tournament found."
    );
    
    return;
  }
  
  if (
    !Array.isArray(
      tournament.tournament_players
    )
  ) {
    showAlert(
      "Tournament players not found."
    );
    
    return;
  }
  
  const teams =
    tournament.tournament_players
    .filter(
      player =>
      player.status === "accepted" &&
      player.team_id
    )
    .map(
      player => ({
        id: player.team_id,
        name: player.team_name,
        logo: player.team_logo
      })
    );
  
  const knockoutSize =
    parseInt(
      document.getElementById(
        "tournamentStartFrom"
      )?.value,
      10
    );
  
  if (
    !Number.isInteger(knockoutSize) ||
    ![2, 4, 8, 16, 32].includes(
      knockoutSize
    )
  ) {
    showAlert(
      "Select a valid knockout round first."
    );
    
    return;
  }
  
  if (
    teams.length !== knockoutSize
  ) {
    showAlert(
      `You have ${teams.length} accepted teams, but ${knockoutSize} teams are required.`
    );
    
    return;
  }
  
  openPairingModal(
    "knockout",
    {
      teams,
      knockoutSize,
      pairs: tournament.manualKnockoutPairs || []
    }
  );
}

function loadCupFixtureLogos(
  row,
  match
) {
  const homeRow =
    row.querySelector(
      ".team-row-item:first-child"
    );
  
  const awayRow =
    row.querySelector(
      ".team-row-item:last-child"
    );
  
  loadCupFixtureLogo(
    homeRow,
    match.homeLogo,
    match.home || "Home"
  );
  
  loadCupFixtureLogo(
    awayRow,
    match.awayLogo,
    match.away || "Away"
  );
}

function loadCupFixtureLogo(
  teamRow,
  logoUrl,
  teamName
) {
  if (
    !teamRow ||
    !logoUrl ||
    !teamName ||
    teamName === "TBD" ||
    teamName === "BYE" ||
    teamName === "Awaiting Winner"
  ) {
    return;
  }
  
  const placeholder =
    teamRow.querySelector(
      ".fixture-team-logo-placeholder"
    );
  
  if (!placeholder) {
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
  
  placeholder.replaceWith(
    img
  );
}

async function renderCupFixtures() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) {
    return;
  }
  
  const container =
    document.getElementById(
      "cupFixtures"
    );
  
  if (!container) {
    return;
  }
  
  container.innerHTML = "";
  
  const fixtures =
    await loadTournamentFixtures(
      tournament.id
    );
  
  const currentRound =
    getCupRound();
  
  updateCupRoundLabel(
    currentRound
  );
  
  const groupFixtures =
    fixtures.filter(
      match =>
      match.match_type === "group" &&
      String(match.round).includes(
        `Round ${currentRound}`
      )
    );
  
  if (!groupFixtures.length) {
    container.innerHTML = `
      <p class="emptyText">
        No Group Stage matches for Round ${currentRound}
      </p>
    `;
    
    return;
  }
  
  const groupsMap =
    new Map();
  
  groupFixtures.forEach(
    match => {
      const groupId =
        match.group_id;
      
      if (!groupId) {
        return;
      }
      
      if (!groupsMap.has(groupId)) {
        let groupName =
          String(match.round || "")
          .match(
            /Group (.+?) - Round/i
          )?.[1];
        
        if (!groupName) {
          groupName =
            `Group ${groupsMap.size + 1}`;
        }
        
        groupsMap.set(
          groupId,
          {
            id: groupId,
            name: groupName
          }
        );
      }
    }
  );
  
  groupsMap.forEach(
    group => {
      renderCupFixtureGroup(
        container,
        tournament,
        group,
        currentRound,
        groupFixtures
      );
    }
  );
}

function renderCupFixtureGroup(
  container,
  tournament,
  group,
  currentRound,
  fixtures
) {
  const groupMatches =
    fixtures.filter(
      match =>
      String(match.group_id) ===
      String(group.id)
    );
  
  if (!groupMatches.length) {
    return;
  }
  
  const groupCard =
    document.createElement("div");
  
  groupCard.className =
    "groupCard";
  
  loadCupGroupWatermark(
    groupCard,
    tournament
  );
  
  groupCard.innerHTML = `
    <div class="groupHeader">
      <h3>${group.name}</h3>
    </div>

    <div class="groupMatches"></div>
  `;
  
  const matchesContainer =
    groupCard.querySelector(
      ".groupMatches"
    );
  
  groupMatches.forEach(
    (match, index) => {
      renderCupFixtureMatch(
        matchesContainer,
        tournament,
        group,
        match,
        index,
        currentRound
      );
    }
  );
  
  container.appendChild(
    groupCard
  );
}

function renderCupFixtureMatch(
  container,
  tournament,
  group,
  match,
  index,
  currentRound
) {
  const submission =
    getSubmission(
      match,
      tournament
    );
  
  const homeName =
    match.home || "Home";
  
  const awayName =
    match.away || "Away";
  
  const groupClean =
    String(group.name)
    .replace(/\s+/g, "");
  
  const row =
    document.createElement("div");
  
  row.className =
    `fixture-row ${
      match.played
        ? "played"
        : "not-played"
    }`;
  
  row.dataset.index =
    index;
  
  row.innerHTML = `
    <div class="fixture-label">
      ${tournament.name || "Tournament"}
      • ${group.name}
      • R${String(currentRound).padStart(2, "0")}
      ${getSubmissionBadge(
        match,
        submission
      )}
    </div>

    <div class="fixture-row-content">

      <div class="fixture-teams-stack">

        <div class="team-row-item team-home-${groupClean}-${index}">
          <div class="fixture-team-logo-placeholder">
            ?
          </div>

          <span class="fixture-team-name">
            ${homeName}
          </span>
        </div>

        <div class="team-row-item team-away-${groupClean}-${index}">
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
      match.played
        ? `
          <div class="cup-playedTime">
            ${formatRecordedTime(
              match.playedAt
            )}
          </div>
        `
        : ""
    }
  `;
  
  loadCupFixtureLogos(
    row,
    match
  );
  
  row.style.cursor =
    "pointer";
  
  row.onclick = () =>
    onFixtureClick(
      match,
      submission
    );
  
  const contactBtn =
    row.querySelector(
      ".fixture-contact-btn"
    );
  
  if (contactBtn) {
    contactBtn.onclick = event => {
      event.stopPropagation();
      
      openMatchContacts(
        match
      );
    };
  }
  
  container.appendChild(
    row
  );
}

async function renderCupTables() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const container =
    document.getElementById(
      "cupTables"
    );
  
  if (!container) return;
  
  container.innerHTML = "";
  
  const fixtures =
    await loadTournamentFixtures(
      tournament.id
    );
  
  const groupMatches =
    fixtures.filter(
      match =>
      match.match_type === "group"
    );
  
  if (!groupMatches.length) {
    container.innerHTML = `
      <p class="emptyText">
        No table for direct Knockout Cups
        <br>
        Check the bracket section for knockout matches
      </p>
    `;
    
    return;
  }
  
  const table =
    await rebuildTableFromMatches(
      false
    );
  
  if (!Array.isArray(table)) {
    container.innerHTML = `
      <p class="emptyText">
        Unable to load table.
      </p>
    `;
    
    return;
  }
  
  const teamGroupMap =
    new Map();
  
  const groupsMap =
    new Map();
  
  groupMatches.forEach(
    match => {
      const groupId =
        match.group_id;
      
      if (!groupId) return;
      
      let groupName =
        String(match.round || "")
        .match(
          /Group (.+?) - Round/i
        )?.[1];
      
      if (!groupName) {
        groupName =
          `Group ${groupsMap.size + 1}`;
      }
      
      if (!groupsMap.has(groupId)) {
        groupsMap.set(
          groupId,
          {
            id: groupId,
            name: groupName
          }
        );
      }
      
      if (match.home_team_id) {
        teamGroupMap.set(
          String(match.home_team_id),
          groupId
        );
      }
      
      if (match.away_team_id) {
        teamGroupMap.set(
          String(match.away_team_id),
          groupId
        );
      }
    }
  );
  
  groupsMap.forEach(
    group => {
      renderCupTableGroupFromTable(
        container,
        tournament,
        group,
        table,
        teamGroupMap
      );
    }
  );
}

function renderCupTableGroupFromTable(
  container,
  tournament,
  group,
  table,
  teamGroupMap
) {
  const groupTable =
    table.filter(
      team =>
      String(
        team.team_id ||
        team.teamId ||
        team.id
      ) &&
      String(
        teamGroupMap.get(
          String(
            team.team_id ||
            team.teamId ||
            team.id
          )
        )
      ) ===
      String(group.id)
    );
  
  const groupCard =
    createCupTableGroupCard(
      group.name
    );
  
  const tbody =
    groupCard.querySelector(
      "tbody"
    );
  
  if (!groupTable.length) {
    renderEmptyCupTable(
      tbody
    );
  } else {
    groupTable.forEach(
      (team, index) => {
        renderCupTableRow(
          tbody,
          tournament,
          {
            ...team,
            pos: team.pos ||
              index + 1
          }
        );
      }
    );
  }
  
  container.appendChild(
    groupCard
  );
}

function createCupTableGroupCard(
  groupName
) {
  const groupCard =
    document.createElement("div");
  
  groupCard.className =
    "groupCard";
  
  groupCard.innerHTML = `
    <div class="groupHeader">
      <h3>${groupName}</h3>
    </div>

    <div class="table-wrapper groupTableWrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>

        <tbody></tbody>
      </table>
    </div>
  `;
  
  return groupCard;
}

function renderEmptyCupTable(
  tbody
) {
  tbody.innerHTML = `
    <tr>
      <td colspan="5">
        Registration in Progress.....
      </td>
    </tr>
  `;
}

function renderCupTableRow(
  tbody,
  tournament,
  team
) {
  const tr =
    document.createElement("tr");
  
  tr.innerHTML = `
    <td>${team.pos}</td>

    <td>
      <div class="table-team-cell">
        <div class="team-logo-placeholder">?</div>

        <strong class="team-name">
          ${team.name}
        </strong>
      </div>
    </td>

    <td>${team.p}</td>
    <td>${team.gd}</td>
    <td>${team.pts}</td>
  `;
  
  tbody.appendChild(
    tr
  );
  
  loadCupTableLogo(
    tr,
    tournament,
    team.name
  );
}

function detectChampion(
  tournament
) {
  if (
    !tournament?.knockoutMatches
  ) {
    return null;
  }
  
  const finalRound =
    Math.max(
      ...tournament.knockoutMatches.map(
        match =>
        Number(
          match.roundIndex ??
          match.round_index ??
          0
        )
      )
    );
  
  const finalMatch =
    tournament.knockoutMatches.find(
      match =>
      Number(
        match.roundIndex ??
        match.round_index ??
        0
      ) === finalRound
    );
  
  if (
    !finalMatch ||
    !finalMatch.played
  ) {
    return null;
  }
  
  const winner =
    getKnockoutWinner(
      finalMatch
    );
  
  if (!winner) return null;
  
  const championName =
    getCupTeamName(
      winner
    );
  
  const logoUrl =
    getTeamLogo(
      tournament,
      championName
    );
  
  tournament.champion =
    winner;
  
  tournament.championName =
    championName;
  
  showChampionAnimation(
    championName,
    logoUrl
  );
  
  return winner;
}

async function renderCupTables() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const container =
    document.getElementById(
      "cupTables"
    );
  
  if (!container) return;
  
  container.innerHTML = "";
  
  const fixtures =
    await loadTournamentFixtures(
      tournament.id
    );
  
  const groupMatches =
    fixtures.filter(
      match =>
      match.match_type === "group" &&
      match.group_id
    );
  
  if (!groupMatches.length) {
    container.innerHTML = `
      <p class="emptyText">
        No table for direct Knockout Cups
        <br>
        Check the bracket section for knockout matches
      </p>
    `;
    
    return;
  }
  
  const table =
    await rebuildTableFromMatches(
      false
    );
  
  if (!Array.isArray(table)) {
    return;
  }
  
  const groupsMap =
    new Map();
  
  groupMatches.forEach(
    match => {
      const groupId =
        String(match.group_id);
      
      if (!groupsMap.has(groupId)) {
        const groupName =
          String(match.round || "")
          .match(
            /Group (.+?) - Round/i
          )?.[1] ||
          `Group ${groupsMap.size + 1}`;
        
        groupsMap.set(
          groupId,
          {
            id: groupId,
            name: groupName,
            teamIds: new Set()
          }
        );
      }
      
      const group =
        groupsMap.get(groupId);
      
      if (match.home_team_id) {
        group.teamIds.add(
          String(match.home_team_id)
        );
      }
      
      if (match.away_team_id) {
        group.teamIds.add(
          String(match.away_team_id)
        );
      }
    }
  );
  
  groupsMap.forEach(
    group => {
      const groupTable =
        table.filter(
          team =>
          group.teamIds.has(
            String(team.id)
          )
        );
      
      renderCupTableGroup(
        container,
        tournament,
        group,
        groupTable
      );
    }
  );
}

function renderCupTableGroup(
  container,
  tournament,
  group,
  table
) {
  const groupCard =
    createCupTableGroupCard(
      group.name
    );
  
  const tbody =
    groupCard.querySelector(
      "tbody"
    );
  
  if (!table.length) {
    renderEmptyCupTable(
      tbody
    );
  } else {
    table.forEach(
      (team, index) => {
        renderCupTableRow(
          tbody,
          tournament,
          {
            ...team,
            pos: index + 1
          }
        );
      }
    );
  }
  
  container.appendChild(
    groupCard
  );
}

function createCupTableGroupCard(
  groupName
) {
  const groupCard =
    document.createElement("div");
  
  groupCard.className =
    "groupCard";
  
  groupCard.innerHTML = `
    <div class="groupHeader">
      <h3>${groupName}</h3>
    </div>

    <div class="table-wrapper groupTableWrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>

        <tbody></tbody>
      </table>
    </div>
  `;
  
  return groupCard;
}

function renderEmptyCupTable(
  tbody
) {
  tbody.innerHTML = `
    <tr>
      <td colspan="5">
        Registration in Progress.....
      </td>
    </tr>
  `;
}

function renderCupTableRow(
  tbody,
  tournament,
  team
) {
  const tr =
    document.createElement("tr");
  
  tr.innerHTML = `
    <td>${team.pos}</td>

    <td>
      <div class="table-team-cell">

        <div class="team-logo-placeholder">
          ?
        </div>

        <strong class="team-name">
          ${team.name}
        </strong>

      </div>
    </td>

    <td>${team.played}</td>
    <td>${team.gd}</td>
    <td>${team.pts}</td>
  `;
  
  tbody.appendChild(
    tr
  );
  
  if (team.logo) {
    const placeholder =
      tr.querySelector(
        ".team-logo-placeholder"
      );
    
    if (placeholder) {
      const img =
        document.createElement("img");
      
      img.className =
        "fixture-team-logo";
      
      img.src =
        team.logo;
      
      img.alt =
        `${team.name} logo`;
      
      img.onerror = () => {
        img.remove();
      };
      
      placeholder.replaceWith(
        img
      );
    }
  }
}

function createCupTableGroupCard(
  groupName
) {
  const groupCard =
    document.createElement("div");
  
  groupCard.className =
    "groupCard";
  
  groupCard.innerHTML = `
    <div class="groupHeader">
      <h3>${groupName}</h3>
    </div>

    <div class="table-wrapper groupTableWrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>

        <tbody></tbody>
      </table>
    </div>
  `;
  
  return groupCard;
}

function renderCupTableRow(
  tbody,
  tournament,
  team
) {
  const tr =
    document.createElement("tr");
  
  tr.innerHTML = `
    <td>${team.pos}</td>

    <td>
      <div class="table-team-cell">
        <div class="team-logo-placeholder">
          ?
        </div>

        <strong class="team-name">
          ${team.name}
        </strong>
      </div>
    </td>

    <td>${team.played}</td>
    <td>${team.wins}</td>
    <td>${team.draws}</td>
    <td>${team.losses}</td>
    <td>${team.gd}</td>
    <td>${team.pts}</td>
  `;
  
  tbody.appendChild(tr);
  
  if (team.logo) {
    const placeholder =
      tr.querySelector(
        ".team-logo-placeholder"
      );
    
    if (placeholder) {
      const img =
        document.createElement("img");
      
      img.className =
        "fixture-team-logo";
      
      img.src =
        team.logo;
      
      img.alt =
        `${team.name} logo`;
      
      img.onerror = () => {
        img.remove();
      };
      
      placeholder.replaceWith(img);
    }
  }
}

function renderEmptyCupTable(
  tbody
) {
  tbody.innerHTML = `
    <tr>
      <td colspan="8">
        Registration in Progress.....
      </td>
    </tr>
  `;
}

function setCupRound(round) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const value = Number(round);
  
  tournament.cupRound = value;
  
  setCurrentTournament(tournament);
  
  localStorage.setItem(
    `cupRound_${tournament.id}`,
    String(value)
  );
}

function getCupRound() {
  const tournament = getCurrentTournament();
  
  if (!tournament) return 1;
  
  return Number(
    localStorage.getItem(
      `cupRound_${tournament.id}`
    ) || tournament.cupRound || 1
  );
}

function getMaxCupRound() {
  if (!Array.isArray(fixtures) || !fixtures.length) {
    return 1;
  }
  
  const rounds = fixtures
    .filter(
      match =>
      match.match_type === "group" &&
      match.round
    )
    .map(match => {
      const matchText =
        String(match.round);
      
      const result =
        matchText.match(
          /Round\s+(\d+)/i
        );
      
      return result ?
        Number(result[1]) :
        null;
    })
    .filter(
      round =>
      Number.isInteger(round)
    );
  
  return rounds.length ?
    Math.max(...rounds) :
    1;
}

async function nextCupRound() {
  const current = getCupRound();
  
  await loadTournamentFixtures(
    getCurrentTournament()?.id
  );
  
  const max = getMaxCupRound();
  
  if (current >= max) return;
  
  setCupRound(current + 1);
  
  await renderCupFixtures();
}

async function prevCupRound() {
  const current = getCupRound();
  
  if (current <= 1) return;
  
  setCupRound(current - 1);
  
  await renderCupFixtures();
}

function updateCupRoundLabel(round) {
  const roundLabel =
    document.getElementById(
      "cupRoundLabel"
    );
  
  if (roundLabel) {
    roundLabel.textContent =
      `Matchday ${round}`;
  }
}

function getBracketContainer() {
  return (
    document.getElementById("bracket-container") ||
    document.querySelector(".bracket-layout")
  );
}

function getBracketMatches(
  tournament
) {
  return (
    tournament?.knockoutMatches || []
  ).filter(
    match =>
    match.match_type ===
    "knockout" ||
    match.match_type ===
    "third_place"
  );
}

function getBracketRoundName(size) {
  if (size === 8) return "Quarter-Finals";
  if (size === 4) return "Semi-Finals";
  if (size === 2) return "Final";
  
  return `Round of ${size}`;
}

function getBracketRounds(
  tournament
) {
  const knockoutSize =
    tournament.settings?.knockoutSize;
  if (
    !knockoutSize ||
    knockoutSize < 2
  ) {
    return [];
  }
  const matches =
    getBracketMatches(
      tournament
    );
  const rounds = [];
  let currentSize =
    knockoutSize;
  let roundIndex =
    1;
  while (
    currentSize >= 2
  ) {
    const totalMatches =
      currentSize / 2;
    const round = {
      roundIndex,
      roundName: getBracketRoundName(
        currentSize
      ),
      currentSize,
      matches: []
    };
    for (
      let slot = 0; slot < totalMatches; slot++
    ) {
      const tieMatches =
        matches.filter(
          match =>
          Number(
            match.roundIndex
          ) ===
          Number(
            roundIndex
          ) &&
          Number(
            match.slot
          ) ===
          Number(
            slot
          )
        );
      round.matches.push({
        match: tieMatches[0] || null,
        slot,
        roundIndex
      });
    }
    rounds.push(
      round
    );
    currentSize /=
      2;
    roundIndex++;
  }
  return rounds;
}

function splitBracketRound(round) {
  const midpoint =
    Math.ceil(round.matches.length / 2);
  
  return {
    left: round.matches.slice(
      0,
      midpoint
    ),
    
    right: round.matches.slice(
      midpoint
    )
  };
}

function createBracketLayout() {
  const layout =
    document.createElement("div");
  
  layout.className =
    "full-bracket-layout";
  
  const left =
    document.createElement("div");
  
  left.className =
    "bracket-side bracket-left";
  
  const center =
    document.createElement("div");
  
  center.className =
    "bracket-center";
  
  const right =
    document.createElement("div");
  
  right.className =
    "bracket-side bracket-right";
  
  layout.appendChild(left);
  layout.appendChild(center);
  layout.appendChild(right);
  
  return {
    layout,
    left,
    center,
    right
  };
}

function createBracketSideContent() {
  const content =
    document.createElement("div");
  
  content.className =
    "bracket-side-content";
  
  return content;
}

function createBracketColumn(
  round,
  roundMatches,
  tournament,
  direction
) {
  const column =
    document.createElement("div");
  
  column.className =
    "bracket-column";
  
  column.dataset.roundIndex =
    round.roundIndex;
  
  column.dataset.direction =
    direction;
  
  const title =
    document.createElement("h4");
  
  title.className =
    "round-title";
  
  title.innerText =
    round.roundName;
  
  column.appendChild(title);
  
  const matchesContainer =
    document.createElement("div");
  
  matchesContainer.className =
    "bracket-round-matches";
  
  roundMatches.forEach(
    roundMatch => {
      const card =
        createBracketMatchCard(
          roundMatch,
          round.roundName,
          tournament
        );
      
      matchesContainer.appendChild(
        card
      );
    }
  );
  
  column.appendChild(
    matchesContainer
  );
  
  return column;
}

function createBracketMatchCard(
  roundMatch,
  roundName,
  tournament
) {
  const matches =
    getBracketMatches(
      tournament
    );
  const {
    leg1,
    leg2
  } =
  getKnockoutLegPair(
    matches,
    roundMatch.roundIndex,
    roundMatch.slot
  );
  if (
    roundName === "Final"
  ) {
    const finalMatch =
      leg1 ||
      leg2 ||
      roundMatch.match ||
      null;
    return createBracketSingleMatchCard(
      roundMatch,
      roundName,
      tournament,
      finalMatch
    );
  }
  const knockoutRoundMode =
    tournament?.settings
    ?.knockoutRoundMode ||
    "single";
  if (
    knockoutRoundMode ===
    "double"
  ) {
    return createBracketTwoLegMatchCard(
      roundMatch,
      roundName,
      tournament,
      leg1,
      leg2
    );
  }
  const singleMatch =
    leg1 ||
    leg2 ||
    roundMatch.match ||
    null;
  return createBracketSingleMatchCard(
    roundMatch,
    roundName,
    tournament,
    singleMatch
  );
}

function createBracketMatchHTML(
  leg1,
  leg2,
  roundName,
  tournament,
  homeName,
  awayName,
  homeLeg1,
  awayLeg1,
  homeLeg2,
  awayLeg2,
  homeAggregate,
  awayAggregate
) {
  const normalizeTeamName =
    value => {
      if (
        !value ||
        value === "BYE" ||
        value === "Unknown Team" ||
        value === "Awaiting Winner"
      ) {
        return "TBD";
      }
      if (
        typeof value === "string"
      ) {
        const name =
          value.trim();
        if (
          !name ||
          name === "Unknown Team" ||
          name === "Awaiting Winner" ||
          name === "BYE"
        ) {
          return "TBD";
        }
        return name;
      }
      if (
        typeof value === "object"
      ) {
        const name =
          value.name?.trim();
        if (
          !name ||
          name === "Unknown Team" ||
          name === "Awaiting Winner" ||
          name === "BYE"
        ) {
          return "TBD";
        }
        return name;
      }
      return "TBD";
    };
  const safeHomeName =
    normalizeTeamName(
      homeName
    );
  const safeAwayName =
    normalizeTeamName(
      awayName
    );
  return `
    <div class="bracket-match-inner">
      <div class="knockout-label">
        ${tournament.name || "Tournament"} - ${roundName}
      </div>
      <div class="knockout-score-header">
        <div class="score-team-header"></div>
        <div class="score-header-cell">L1</div>
        <div class="score-header-cell">L2</div>
        <div class="score-header-cell">AG</div>
      </div>
      <div class="knockout-team-row home-row">
        <div class="team-side">
          <div class="fixture-team-logo-placeholder">
            ?
          </div>
          <span class="team-name">
            ${safeHomeName}
          </span>
        </div>
        <button
          type="button"
          class="knockout-score-cell leg-1-score"
        >
          ${
            homeLeg1 !== null
              ? homeLeg1
              : ""
          }
        </button>
        <button
          type="button"
          class="knockout-score-cell leg-2-score"
        >
          ${
            homeLeg2 !== null
              ? homeLeg2
              : ""
          }
        </button>
        <span class="knockout-score-cell aggregate-score">
          ${
            homeLeg1 !== null ||
            homeLeg2 !== null
              ? homeAggregate
              : ""
          }
        </span>
      </div>
      <div class="knockout-team-row away-row">
        <div class="team-side">
          <div class="fixture-team-logo-placeholder">
            ?
          </div>
          <span class="team-name">
            ${safeAwayName}
          </span>
        </div>
        <button
          type="button"
          class="knockout-score-cell leg-1-score"
        >
          ${
            awayLeg1 !== null
              ? awayLeg1
              : ""
          }
        </button>
        <button
          type="button"
          class="knockout-score-cell leg-2-score"
        >
          ${
            awayLeg2 !== null
              ? awayLeg2
              : ""
          }
        </button>
        <span class="knockout-score-cell aggregate-score">
          ${
            awayLeg1 !== null ||
            awayLeg2 !== null
              ? awayAggregate
              : ""
          }
        </span>
      </div>
      <div class="bracket-contact-area"></div>
    </div>
  `;
}


function attachBracketTeamLogos(
  card,
  tournament,
  homeName,
  awayName
) {
  const homeLogoKey =
    tournament.teamLogos?.[homeName];
  
  const awayLogoKey =
    tournament.teamLogos?.[awayName];
  
  loadBracketTeamLogo(
    card,
    homeLogoKey,
    homeName,
    ".home-row .team-side"
  );
  
  loadBracketTeamLogo(
    card,
    awayLogoKey,
    awayName,
    ".away-row .team-side"
  );
}

function attachBracketMatchClick(
  card,
  match
) {
  if (!card || !match) {
    return;
  }
  
  card.addEventListener(
    "click",
    () => {
      openLeagueRecorder(
        match
      );
    }
  );
}

function renderBracketSide(
  side,
  rounds,
  tournament,
  direction
) {
  const content =
    createBracketSideContent();
  
  side.appendChild(content);
  
  const nonFinalRounds =
    rounds.filter(
      round =>
      round.roundName !== "Final"
    );
  
  nonFinalRounds.forEach(
    round => {
      const {
        left,
        right
      } =
      splitBracketRound(round);
      
      const roundMatches =
        direction === "left" ?
        left :
        right;
      
      if (!roundMatches.length) {
        return;
      }
      
      const column =
        createBracketColumn(
          round,
          roundMatches,
          tournament,
          direction
        );
      
      content.appendChild(
        column
      );
    }
  );
  
  renderBracketConnections(
    side,
    content,
    nonFinalRounds,
    direction
  );
}

function renderBracketFinal(
  center,
  rounds,
  tournament
) {
  const finalRound =
    rounds.find(
      round =>
      round.roundName === "Final"
    );
  
  if (!finalRound) {
    return;
  }
  
  const column =
    createBracketColumn(
      finalRound,
      finalRound.matches,
      tournament,
      "center"
    );
  
  column.classList.add(
    "final-round-column"
  );
  
  center.appendChild(
    column
  );
}

function getSideRoundCards(
  content,
  roundIndex
) {
  return Array.from(
    content.querySelectorAll(
      `.match-card[data-round-index="${roundIndex}"]`
    )
  );
}

function renderBracketConnections(
  side,
  content,
  rounds,
  direction
) {
  if (rounds.length < 2) {
    return;
  }
  
  const svg =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
  
  svg.classList.add(
    "bracket-connector-svg"
  );
  
  side.appendChild(svg);
  
  requestAnimationFrame(() => {
    drawBracketRoundConnections(
      svg,
      content,
      rounds,
      direction
    );
  });
}

function drawBracketRoundConnections(
  svg,
  content,
  rounds,
  direction
) {
  const contentRect =
    content.getBoundingClientRect();
  
  svg.setAttribute(
    "width",
    content.offsetWidth
  );
  
  svg.setAttribute(
    "height",
    content.offsetHeight
  );
  
  svg.innerHTML = "";
  
  for (
    let i = 0; i < rounds.length - 1; i++
  ) {
    const currentRound =
      rounds[i];
    
    const nextRound =
      rounds[i + 1];
    
    const currentCards =
      getSideRoundCards(
        content,
        currentRound.roundIndex
      );
    
    const nextCards =
      getSideRoundCards(
        content,
        nextRound.roundIndex
      );
    
    for (
      let matchIndex = 0; matchIndex < nextCards.length; matchIndex++
    ) {
      const firstCard =
        currentCards[
          matchIndex * 2
        ];
      
      const secondCard =
        currentCards[
          matchIndex * 2 + 1
        ];
      
      const nextCard =
        nextCards[matchIndex];
      
      if (
        !firstCard ||
        !secondCard ||
        !nextCard
      ) {
        continue;
      }
      
      drawBracketRoundConnection(
        svg,
        contentRect,
        firstCard,
        secondCard,
        nextCard,
        direction
      );
    }
  }
}

function drawBracketRoundConnection(
  svg,
  contentRect,
  firstCard,
  secondCard,
  nextCard,
  direction
) {
  const firstRect =
    firstCard.getBoundingClientRect();
  
  const secondRect =
    secondCard.getBoundingClientRect();
  
  const nextRect =
    nextCard.getBoundingClientRect();
  
  const firstY =
    firstRect.top +
    firstRect.height / 2 -
    contentRect.top;
  
  const secondY =
    secondRect.top +
    secondRect.height / 2 -
    contentRect.top;
  
  const nextY =
    nextRect.top +
    nextRect.height / 2 -
    contentRect.top;
  
  let firstX;
  let nextX;
  
  if (direction === "left") {
    firstX =
      firstRect.right -
      contentRect.left;
    
    nextX =
      nextRect.left -
      contentRect.left;
  } else {
    firstX =
      firstRect.left -
      contentRect.left;
    
    nextX =
      nextRect.right -
      contentRect.left;
  }
  
  const middleY =
    (firstY + secondY) / 2;
  
  const middleX =
    (firstX + nextX) / 2;
  
  const path =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
  
  const pathData = `
    M ${firstX} ${firstY}
    H ${middleX}

    M ${firstX} ${secondY}
    H ${middleX}

    M ${middleX} ${firstY}
    V ${secondY}

    M ${middleX} ${middleY}
    H ${nextX}

    M ${nextX} ${middleY}
    V ${nextY}
  `;
  
  path.setAttribute(
    "d",
    pathData
  );
  
  path.classList.add(
    "bracket-connector-path"
  );
  
  svg.appendChild(
    path
  );
}

function renderFinalConnections(
  layout,
  left,
  center,
  right,
  rounds
) {
  const finalRound =
    rounds.find(
      round =>
      round.roundName === "Final"
    );
  
  if (!finalRound) {
    return;
  }
  
  const finalCard =
    center.querySelector(
      ".final-round-column .match-card"
    );
  
  if (!finalCard) {
    return;
  }
  
  const nonFinalRounds =
    rounds.filter(
      round =>
      round.roundName !== "Final"
    );
  
  const semifinalRound =
    nonFinalRounds[
      nonFinalRounds.length - 1
    ];
  
  if (!semifinalRound) {
    return;
  }
  
  const leftContent =
    left.querySelector(
      ".bracket-side-content"
    );
  
  const rightContent =
    right.querySelector(
      ".bracket-side-content"
    );
  
  if (
    !leftContent ||
    !rightContent
  ) {
    return;
  }
  
  const leftCards =
    getSideRoundCards(
      leftContent,
      semifinalRound.roundIndex
    );
  
  const rightCards =
    getSideRoundCards(
      rightContent,
      semifinalRound.roundIndex
    );
  
  if (
    !leftCards.length ||
    !rightCards.length
  ) {
    return;
  }
  
  const svg =
    createFinalConnectorSvg(
      layout
    );
  
  const layoutRect =
    layout.getBoundingClientRect();
  
  drawFinalConnection(
    svg,
    layoutRect,
    leftCards[0],
    finalCard,
    "left"
  );
  
  drawFinalConnection(
    svg,
    layoutRect,
    rightCards[0],
    finalCard,
    "right"
  );
}

function createFinalConnectorSvg(
  layout
) {
  const svg =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
  
  svg.classList.add(
    "final-connector-svg"
  );
  
  svg.setAttribute(
    "width",
    layout.offsetWidth
  );
  
  svg.setAttribute(
    "height",
    layout.offsetHeight
  );
  
  layout.appendChild(svg);
  
  return svg;
}

function drawFinalConnection(
  svg,
  layoutRect,
  semifinalCard,
  finalCard,
  direction
) {
  const semifinalRect =
    semifinalCard.getBoundingClientRect();
  
  const finalRect =
    finalCard.getBoundingClientRect();
  
  const semifinalY =
    semifinalRect.top +
    semifinalRect.height / 2 -
    layoutRect.top;
  
  const finalY =
    finalRect.top +
    finalRect.height / 2 -
    layoutRect.top;
  
  let startX;
  let endX;
  
  if (direction === "left") {
    startX =
      semifinalRect.right -
      layoutRect.left;
    
    endX =
      finalRect.left -
      layoutRect.left;
  } else {
    startX =
      semifinalRect.left -
      layoutRect.left;
    
    endX =
      finalRect.right -
      layoutRect.left;
  }
  
  const middleX =
    (startX + endX) / 2;
  
  const path =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
  
  const pathData = `
    M ${startX} ${semifinalY}
    H ${middleX}

    M ${middleX} ${semifinalY}
    V ${finalY}

    M ${middleX} ${finalY}
    H ${endX}
  `;
  
  path.setAttribute(
    "d",
    pathData
  );
  
  path.classList.add(
    "bracket-connector-path"
  );
  
  svg.appendChild(
    path
  );
}

async function getBracketChampionIcon(
  tournament
) {
  if (!tournament?.tournamentImage) {
    return "🏆";
  }
  
  try {
    const image =
      await getLogoFromIndexedDB(
        tournament.tournamentImage
      );
    
    if (image) {
      return `
        <img
          src="${image}"
          class="champion-trophy-img"
          alt="Tournament Trophy"
        >
      `;
    }
  } catch (err) {
    console.error(
      "Error loading tournament image:",
      err
    );
  }
  
  return "🏆";
}

function getBracketChampion(tournament) {
  return (
    tournament?.champion_name ||
    "TBD"
  );
}
async function renderBracketChampion(
  container,
  tournament
) {
  const champion =
    getBracketChampion(
      tournament
    );
  
  const championIcon =
    await getBracketChampionIcon(
      tournament
    );
  
  const box =
    document.createElement("div");
  
  box.className =
    "champion-box-container";
  
  box.innerHTML = `
    <div class="champion-icon">
      ${championIcon}
    </div>

    <h4 class="champion-title">
      CHAMPION
    </h4>

    <div class="champion-display-box">
      ${champion}
    </div>
  `;
  
  container.appendChild(
    box
  );
}

function renderBracketEmptyState(
  container
) {
  container.innerHTML = `
    <p class="emptyText">
      Group Stage in Progress......<br>
      Knockout Stage Matches Will be generated once Group stage matches are completed
    </p>
  `;
}

function redrawBracketConnections() {
  const container =
    getBracketContainer();
  
  if (!container) return;
  
  const layout =
    container.querySelector(
      ".full-bracket-layout"
    );
  
  if (!layout) return;
  
  const left =
    layout.querySelector(
      ".bracket-left"
    );
  
  const center =
    layout.querySelector(
      ".bracket-center"
    );
  
  const right =
    layout.querySelector(
      ".bracket-right"
    );
  
  if (
    !left ||
    !center ||
    !right
  ) {
    return;
  }
  
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const rounds =
    getBracketRounds(
      tournament
    );
  
  const sides = [
  {
    side: left,
    direction: "left"
  },
  {
    side: right,
    direction: "right"
  }];
  
  sides.forEach(
    ({ side, direction }) => {
      const content =
        side.querySelector(
          ".bracket-side-content"
        );
      
      const svg =
        side.querySelector(
          ".bracket-connector-svg"
        );
      
      if (!content || !svg) {
        return;
      }
      
      const nonFinalRounds =
        rounds.filter(
          round =>
          round.roundName !==
          "Final"
        );
      
      drawBracketRoundConnections(
        svg,
        content,
        nonFinalRounds,
        direction
      );
    }
  );
  
  const oldFinalSvg =
    layout.querySelector(
      ".final-connector-svg"
    );
  
  if (oldFinalSvg) {
    oldFinalSvg.remove();
  }
  
  renderFinalConnections(
    layout,
    left,
    center,
    right,
    rounds
  );
}

window.addEventListener(
  "resize",
  () => {
    requestAnimationFrame(
      redrawBracketConnections
    );
  }
);


async function renderFullBracket() {
  const tournament =
    getCurrentTournament();
  if (!tournament) return;
  const container =
    getBracketContainer();
  if (!container) return;
  const teamListContainer =
    document.getElementById(
      "bracketTeamLists"
    );
  try {
    showLoader();
    await loadTournamentFixtures(
      tournament.id
    );
    const knockoutMatches =
      fixtures.filter(
        match =>
        match.match_type ===
        "knockout" ||
        match.match_type ===
        "third_place"
      );
    const groupMatches =
      fixtures.filter(
        match =>
        match.match_type ===
        "group"
      );
    tournament.knockoutMatches =
      knockoutMatches;
    if (!knockoutMatches.length) {
      if (
        !groupMatches.length
      ) {
        container.innerHTML = "";
        if (teamListContainer) {
          teamListContainer.style.display =
            "";
          await renderTeams(
            "bracketTeamLists"
          );
        }
        return;
      }
      if (teamListContainer) {
        teamListContainer.innerHTML =
          "";
        teamListContainer.style.display =
          "none";
      }
      renderBracketEmptyState(
        container
      );
      return;
    }
    if (teamListContainer) {
      teamListContainer.innerHTML =
        "";
      teamListContainer.style.display =
        "none";
    }
    const rounds =
      getBracketRounds(
        tournament
      );
    if (!rounds.length) {
      renderBracketEmptyState(
        container
      );
      return;
    }
    container.innerHTML = "";
    const {
      layout,
      left,
      center,
      right
    } =
    createBracketLayout();
    container.appendChild(
      layout
    );
    renderBracketSide(
      left,
      rounds,
      tournament,
      "left"
    );
    renderBracketFinal(
      center,
      rounds,
      tournament
    );
    renderBracketSide(
      right,
      rounds,
      tournament,
      "right"
    );
    requestAnimationFrame(() => {
      renderFinalConnections(
        layout,
        left,
        center,
        right,
        rounds
      );
    });
    await renderBracketChampion(
      container,
      tournament,
      rounds
    );
  } catch (err) {
    console.error(
      "[renderFullBracket]",
      err
    );
    renderBracketEmptyState(
      container
    );
    if (teamListContainer) {
      teamListContainer.innerHTML =
        "";
      teamListContainer.style.display =
        "none";
    }
    showAlert(
      err.message ||
      "Failed to load knockout bracket."
    );
  } finally {
    hideLoader();
  }
}




function createBracketContactButton(match) {
  const button =
    document.createElement("button");
  
  button.className =
    "fixture-contact-btn";
  
  button.type =
    "button";
  
  button.setAttribute(
    "aria-label",
    "Team contacts"
  );
  
  button.setAttribute(
    "title",
    "Team contacts"
  );
  
  button.innerText =
    "☎";
  
  button.onclick = event => {
    event.stopPropagation();
    
    if (!match) return;
    
    openMatchContacts(
      match
    );
  };
  
  return button;
}

function createBracketTwoLegMatchCard(
  roundMatch,
  roundName,
  tournament,
  leg1,
  leg2
) {
  const card =
    document.createElement("div");
  card.className =
    "match-card";
  card.dataset.roundIndex =
    roundMatch.roundIndex;
  card.dataset.slot =
    roundMatch.slot;
  const homeName =
    getBracketTeamName(
      leg1?.home ||
      leg2?.away
    );
  const awayName =
    getBracketTeamName(
      leg1?.away ||
      leg2?.home
    );
  const homeLeg1 =
    Number.isFinite(
      leg1?.homeGoals
    ) ?
    leg1.homeGoals :
    null;
  const awayLeg1 =
    Number.isFinite(
      leg1?.awayGoals
    ) ?
    leg1.awayGoals :
    null;
  const homeLeg2 =
    Number.isFinite(
      leg2?.awayGoals
    ) ?
    leg2.awayGoals :
    null;
  const awayLeg2 =
    Number.isFinite(
      leg2?.homeGoals
    ) ?
    leg2.homeGoals :
    null;
  const homeAggregate =
    (homeLeg1 ?? 0) +
    (homeLeg2 ?? 0);
  const awayAggregate =
    (awayLeg1 ?? 0) +
    (awayLeg2 ?? 0);
  const hasResult =
    homeLeg1 !== null ||
    awayLeg1 !== null ||
    homeLeg2 !== null ||
    awayLeg2 !== null;
  if (!hasResult) {
    card.classList.add(
      "pending-match"
    );
  }
  card.innerHTML =
    createBracketMatchHTML(
      leg1,
      leg2,
      roundName,
      tournament,
      homeName,
      awayName,
      homeLeg1,
      awayLeg1,
      homeLeg2,
      awayLeg2,
      homeAggregate,
      awayAggregate
    );
  const homeLogo =
    leg1?.homeLogo ||
    leg2?.awayLogo;
  const awayLogo =
    leg1?.awayLogo ||
    leg2?.homeLogo;
  if (homeLogo) {
    loadBracketTeamLogo(
      card,
      homeLogo,
      homeName,
      ".home-row .team-side"
    );
  }
  if (awayLogo) {
    loadBracketTeamLogo(
      card,
      awayLogo,
      awayName,
      ".away-row .team-side"
    );
  }
  const contactArea =
    card.querySelector(
      ".bracket-contact-area"
    );
  if (contactArea) {
    contactArea.appendChild(
      createBracketContactButton(
        leg1 || leg2
      )
    );
  }
  const leg1Buttons =
    card.querySelectorAll(
      ".leg-1-score"
    );
  leg1Buttons.forEach(
    button => {
      button.onclick =
        event => {
          event.stopPropagation();
          if (!leg1) return;
          openLeagueRecorder(
            leg1
          );
        };
    }
  );
  const leg2Buttons =
    card.querySelectorAll(
      ".leg-2-score"
    );
  leg2Buttons.forEach(
    button => {
      button.onclick =
        event => {
          event.stopPropagation();
          if (!leg2) return;
          openLeagueRecorder(
            leg2
          );
        };
    }
  );
  return card;
}

function getKnockoutLegPair(
  matches,
  roundIndex,
  slot
) {
  const roundMatches =
    matches.filter(
      match =>
      Number(
        match.roundIndex ??
        match.round_index
      ) ===
      Number(roundIndex) &&
      Number(
        match.slot
      ) ===
      Number(slot)
    );
  if (!roundMatches.length) {
    return {
      leg1: null,
      leg2: null
    };
  }
  const leg1 =
    roundMatches.find(
      match =>
      Number(match.leg) === 1
    ) || null;
  const leg2 =
    roundMatches.find(
      match =>
      Number(match.leg) === 2
    ) || null;
  return {
    leg1,
    leg2
  };
}

function createBracketSingleMatchCard(
  roundMatch,
  roundName,
  tournament,
  match
) {
  const card =
    document.createElement("div");
  card.className =
    "match-card single-leg-match-card";
  card.dataset.roundIndex =
    roundMatch.roundIndex;
  card.dataset.slot =
    roundMatch.slot;
  const rawHomeName =
    getBracketTeamName(
      match?.home
    );
  const rawAwayName =
    getBracketTeamName(
      match?.away
    );
  const homeName =
    rawHomeName &&
    rawHomeName !== "BYE" ?
    rawHomeName :
    "TBD";
  const awayName =
    rawAwayName &&
    rawAwayName !== "BYE" ?
    rawAwayName :
    "TBD";
  const homeGoals =
    match?.homeGoals !== null &&
    match?.homeGoals !== undefined &&
    match?.homeGoals !== "" ?
    Number(match.homeGoals) :
    null;
  const awayGoals =
    match?.awayGoals !== null &&
    match?.awayGoals !== undefined &&
    match?.awayGoals !== "" ?
    Number(match.awayGoals) :
    null;
  const validHomeGoals =
    Number.isFinite(homeGoals) ?
    homeGoals :
    null;
  const validAwayGoals =
    Number.isFinite(awayGoals) ?
    awayGoals :
    null;
  const hasResult =
    validHomeGoals !== null &&
    validAwayGoals !== null;
  if (!hasResult) {
    card.classList.add(
      "pending-match"
    );
  }
  card.innerHTML =
    createBracketSingleMatchHTML(
      match,
      roundName,
      tournament,
      homeName,
      awayName,
      validHomeGoals,
      validAwayGoals
    );
  if (
    match?.homeLogo &&
    homeName !== "TBD"
  ) {
    loadBracketTeamLogo(
      card,
      match.homeLogo,
      homeName,
      ".single-leg-home-row .single-leg-team-side",
      ".single-leg-team-logo-placeholder"
    );
  }
  if (
    match?.awayLogo &&
    awayName !== "TBD"
  ) {
    loadBracketTeamLogo(
      card,
      match.awayLogo,
      awayName,
      ".single-leg-away-row .single-leg-team-side",
      ".single-leg-team-logo-placeholder"
    );
  }
  const contactArea =
    card.querySelector(
      ".single-leg-contact-area"
    );
  if (contactArea) {
    contactArea.appendChild(
      createBracketContactButton(
        match
      )
    );
  }
  const scoreButtons =
    card.querySelectorAll(
      ".single-leg-score"
    );
  scoreButtons.forEach(
    button => {
      button.onclick =
        event => {
          event.stopPropagation();
          if (!match) {
            return;
          }
          openLeagueRecorder(
            match
          );
        };
    }
  );
  return card;
}


function createBracketSingleMatchHTML(
  match,
  roundName,
  tournament,
  homeName,
  awayName,
  homeGoals,
  awayGoals
) {
  return `
    <div class="single-leg-match-inner">
      <div class="single-leg-label">
        ${tournament.name || "Tournament"} - ${roundName}
      </div>
      <div class="single-leg-team-row single-leg-home-row">
        <div class="single-leg-team-side">
          <div class="single-leg-team-logo-placeholder">
            ?
          </div>
          <span class="single-leg-team-name">
            ${homeName || "TBD"}
          </span>
        </div>
        <button
          type="button"
          class="single-leg-score"
        >
          ${
            homeGoals !== null
              ? homeGoals
              : "TBD"
          }
        </button>
      </div>
      <div class="single-leg-team-row single-leg-away-row">
        <div class="single-leg-team-side">
          <div class="single-leg-team-logo-placeholder">
            ?
          </div>
          <span class="single-leg-team-name">
            ${awayName || "TBD"}
          </span>
        </div>
        <button
          type="button"
          class="single-leg-score"
        >
          ${
            awayGoals !== null
              ? awayGoals
              : "TBD"
          }
        </button>
      </div>
      <div class="single-leg-contact-area"></div>
    </div>
  `;
}

function getBracketTeamName(team) {
  if (
    !team ||
    team === "BYE"
  ) {
    return "TBD";
  }
  if (
    typeof team === "string"
  ) {
    const name =
      team.trim();
    if (
      !name ||
      name === "Unknown Team" ||
      name === "Awaiting Winner"
    ) {
      return "TBD";
    }
    return name;
  }
  const name =
    team.name?.trim();
  if (
    !name ||
    name === "Unknown Team" ||
    name === "Awaiting Winner"
  ) {
    return "TBD";
  }
  return name;
}

function loadBracketTeamLogo(
  card,
  logo,
  teamName,
  selector,
  placeholderSelector =
  ".fixture-team-logo-placeholder"
) {
  if (
    !logo ||
    teamName === "Awaiting Winner" ||
    teamName === "TBD"
  ) {
    return;
  }
  const teamSide =
    card.querySelector(
      selector
    );
  const placeholder =
    teamSide?.querySelector(
      placeholderSelector
    );
  if (
    !teamSide ||
    !placeholder
  ) {
    return;
  }
  const img =
    document.createElement("img");
  img.className =
    "fixture-team-logo";
  img.src =
    logo;
  img.alt =
    teamName;
  teamSide.replaceChild(
    img,
    placeholder
  );
}

function enableBracketZoom() {
  const viewport =
    document.getElementById(
      "bracketViewport"
    );
  
  const content =
    document.getElementById(
      "bracket-container"
    );
  
  if (!viewport || !content) {
    return;
  }
  
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  
  let startDistance = 0;
  let startScale = 1;
  
  let startX = 0;
  let startY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;
  
  function updateTransform() {
    content.style.transform =
      `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }
  
  viewport.addEventListener(
    "wheel",
    event => {
      event.preventDefault();
      
      const rect =
        viewport.getBoundingClientRect();
      
      const mouseX =
        event.clientX - rect.left;
      
      const mouseY =
        event.clientY - rect.top;
      
      const oldScale =
        scale;
      
      scale +=
        event.deltaY < 0 ?
        0.1 :
        -0.1;
      
      scale =
        Math.max(
          0.5,
          Math.min(
            3,
            scale
          )
        );
      
      const ratio =
        scale / oldScale;
      
      translateX =
        mouseX -
        (mouseX - translateX) *
        ratio;
      
      translateY =
        mouseY -
        (mouseY - translateY) *
        ratio;
      
      updateTransform();
    },
    {
      passive: false
    }
  );
  
  viewport.addEventListener(
    "touchstart",
    event => {
      if (
        event.touches.length === 2
      ) {
        const dx =
          event.touches[0].clientX -
          event.touches[1].clientX;
        
        const dy =
          event.touches[0].clientY -
          event.touches[1].clientY;
        
        startDistance =
          Math.hypot(
            dx,
            dy
          );
        
        startScale =
          scale;
      }
      
      if (
        event.touches.length === 1
      ) {
        startX =
          event.touches[0].clientX;
        
        startY =
          event.touches[0].clientY;
        
        startTranslateX =
          translateX;
        
        startTranslateY =
          translateY;
      }
    },
    {
      passive: false
    }
  );
  
  viewport.addEventListener(
    "touchmove",
    event => {
      event.preventDefault();
      
      if (
        event.touches.length === 2 &&
        startDistance
      ) {
        const dx =
          event.touches[0].clientX -
          event.touches[1].clientX;
        
        const dy =
          event.touches[0].clientY -
          event.touches[1].clientY;
        
        const distance =
          Math.hypot(
            dx,
            dy
          );
        
        scale =
          startScale *
          (distance /
            startDistance);
        
        scale =
          Math.max(
            0.5,
            Math.min(
              3,
              scale
            )
          );
        
        updateTransform();
      }
      
      if (
        event.touches.length === 1
      ) {
        const deltaX =
          event.touches[0].clientX -
          startX;
        
        const deltaY =
          event.touches[0].clientY -
          startY;
        
        translateX =
          startTranslateX +
          deltaX;
        
        translateY =
          startTranslateY +
          deltaY;
        
        updateTransform();
      }
    },
    {
      passive: false
    }
  );
  
  viewport.addEventListener(
    "touchend",
    event => {
      if (
        event.touches.length < 2
      ) {
        startDistance = 0;
      }
    }
  );
  
  updateTransform();
}


async function toggleBracketMode(mode) {
  document
    .querySelectorAll(".bracketTopActions .bracket-tab")
    .forEach(btn => btn.classList.remove("active"));
  
  const bracketView = document.getElementById("bracketViewport");
  const fixturesView = document.getElementById("bracketFixturesView");
  
  if (mode === "bracket") {
    bracketView.style.display = "block";
    fixturesView.style.display = "none";
    
    await renderFullBracket();
    enableBracketZoom();
    
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