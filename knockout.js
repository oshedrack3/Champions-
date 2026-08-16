async function generateTournament() {
  const enableGroups = document.getElementById("enableGroups")?.checked;
  const tournament = getCurrentTournament();
  
  if (!tournament) {
    return;
  }
  
  const teams = Object.values(tournament.teams || {});
  
  if (teams.length < 2) {
    showAlert("❌ Add at least 2 teams");
    return;
  }
  
  const teamsPerGroup = parseInt(document.getElementById("teamsPerGroup")?.value) || 4;
  const teamsQualify = parseInt(document.getElementById("teamsQualify")?.value) || 2;
  const knockoutSize = parseInt(document.getElementById("knockoutRound")?.value);
  
  tournament.settings = {
    enableGroups,
    teamsPerGroup,
    teamsQualify,
    knockoutSize
  };
  
  if (enableGroups) {
    const totalGroups = Math.ceil(teams.length / teamsPerGroup);
    const totalQualifiers = totalGroups * teamsQualify;
    
    if (totalQualifiers !== knockoutSize) {
      showAlert(
        `⚠️ Bracket Imbalance!\n\n` +
        `Your group setup yields ${totalQualifiers} qualifying teams, ` +
        `but your bracket size requires exactly ${knockoutSize}.\n\n` +
        `Adjust your group sizes or qualified slots.`
      );
      return;
    }
  } else {
    if (teams.length !== knockoutSize) {
      showAlert(
        `⚠️ Team Count Mismatch!\n\n` +
        `You selected a ${knockoutSize}-team bracket ` +
        `(${getRoundName(knockoutSize)}), but you currently have ` +
        `${teams.length} registered teams.\n\n` +
        `Ensure they match perfectly.`
      );
      return;
    }
  }
  
  tournament.knockoutMatches = [];
  tournament.qualifiedTeams = [];
  tournament.groupStageComplete = false;
  tournament.matches = [];
  tournament.groups = [];
  tournament.groupMatches = [];
  tournament.groupTables = {};
  tournament.knockout = null;
  tournament.cupRound = 1;
  tournament.champion = null;
  tournament.championName = null;
  
  if (enableGroups) {
    generateGroupStage(tournament);
  } else {
    generateDirectKnockOut(tournament);
  }
  
  try {
    const updatedTournament = await updateTournament(
      tournament.id,
      {
        updates: {
          settings: tournament.settings,
          matches: tournament.matches,
          groups: tournament.groups,
          groupMatches: tournament.groupMatches,
          groupTables: tournament.groupTables,
          qualifiedTeams: tournament.qualifiedTeams,
          groupStageComplete: tournament.groupStageComplete,
          cupRound: tournament.cupRound,
          knockoutMatches: tournament.knockoutMatches,
          champion: tournament.champion,
          championName: tournament.championName
        }
      }
    );
    
    Object.assign(tournament, updatedTournament);
    renderFixtures();
    toggleCupView("table");
    showActionModal("✅ Tournament Generated", "success");
    
  } catch (err) {
    showAlert(err.message || "❌ Failed to generate tournament.");
  }
}

function validateTournamentSetup(tournament, settings) {
  const teams = Object.values(
    tournament.teams || {}
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
        teams.length / settings.teamsPerGroup
      );
    
    const totalQualifiers =
      totalGroups * settings.teamsQualify;
    
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
  return {
    enableGroups: document.getElementById("enableGroups").checked,
    teamsPerGroup: parseInt(document.getElementById("teamsPerGroup").value) || 4,
    teamsQualify: parseInt(document.getElementById("teamsQualify").value) || 2,
    knockoutSize: parseInt(document.getElementById("knockoutRound").value)
  };
}

function validateTournamentSetup(tournament, settings) {
  const teams = Object.values(tournament.teams || {});
  
  if (teams.length < 2) {
    return {
      valid: false,
      message: "❌ Add at least 2 teams"
    };
  }
  
  if (settings.enableGroups) {
    const totalGroups = Math.ceil(teams.length / settings.teamsPerGroup);
    const totalQualifiers = totalGroups * settings.teamsQualify;
    
    if (totalQualifiers !== settings.knockoutSize) {
      return {
        valid: false,
        message: `⚠️ Bracket Imbalance!\n\nYour group setup yields ${totalQualifiers} qualifying teams, but your bracket size requires exactly ${settings.knockoutSize}.`
      };
    }
  } else {
    if (teams.length !== settings.knockoutSize) {
      return {
        valid: false,
        message: `⚠️ Team Count Mismatch!\n\nYou selected a ${settings.knockoutSize}-team bracket but currently have ${teams.length} teams.`
      };
    }
  }
  
  return { valid: true };
}

function getTournamentSettings() {
  
  return {
    
    enableGroups: document.getElementById(
      "enableGroups"
    ).checked,
    
    teamsPerGroup: parseInt(
      document.getElementById(
        "teamsPerGroup"
      ).value
    ) || 4,
    
    teamsQualify: parseInt(
      document.getElementById(
        "teamsQualify"
      ).value
    ) || 2,
    
    knockoutSize: parseInt(
      document.getElementById(
        "knockoutRound"
      ).value
    )
  };
}

function getBracketContainer() {
  return (
    document.getElementById("bracket-container") ||
    document.querySelector(".bracket-layout")
  );
}

function getBracketMatches(tournament) {
  return tournament.knockoutMatches || [];
}

function getBracketTeamName(team) {
  if (!team || team === "BYE") return "TBD";
  if (typeof team === "string") return team;
  return team.name || "TBD";
}

function getBracketRoundName(size) {
  if (size === 8) return "Quarter-Finals";
  if (size === 4) return "Semi-Finals";
  if (size === 2) return "Final";
  
  return `Round of ${size}`;
}

function getBracketRounds(tournament) {
  const knockoutSize =
    tournament.settings?.knockoutSize;
  
  if (!knockoutSize || knockoutSize < 2) {
    return [];
  }
  
  const matches =
    getBracketMatches(tournament);
  
  const rounds = [];
  
  let currentSize = knockoutSize;
  let roundIndex = 1;
  
  while (currentSize >= 2) {
    const totalMatches =
      currentSize / 2;
    
    const round = {
      roundIndex,
      roundName: getBracketRoundName(currentSize),
      currentSize,
      matches: []
    };
    
    for (
      let slot = 0; slot < totalMatches; slot++
    ) {
      const match = matches.find(
        m =>
        m.roundIndex === roundIndex &&
        m.slot === slot
      );
      
      round.matches.push({
        match,
        slot,
        roundIndex
      });
    }
    
    rounds.push(round);
    
    currentSize /= 2;
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
  const match =
    roundMatch.match;
  
  const homeName =
    getBracketTeamName(
      match?.home
    );
  
  const awayName =
    getBracketTeamName(
      match?.away
    );
  
  const homeScore =
    match?.homeGoals;
  
  const awayScore =
    match?.awayGoals;
  
  const isPending = !match ||
    !match.played ||
    homeName === "TBD" ||
    awayName === "TBD";
  
  const card =
    document.createElement("div");
  
  card.className =
    "match-card";
  
  if (isPending) {
    card.classList.add(
      "pending-match"
    );
  }
  
  card.dataset.roundIndex =
    roundMatch.roundIndex;
  
  card.dataset.slot =
    roundMatch.slot;
  
  card.innerHTML =
    createBracketMatchHTML(
      match,
      roundName,
      tournament,
      homeName,
      awayName,
      homeScore,
      awayScore
    );
  
  attachBracketTeamLogos(
    card,
    tournament,
    homeName,
    awayName
  );
  
  attachBracketMatchClick(
    card,
    match
  );
  
  return card;
}

function createBracketMatchHTML(
  match,
  roundName,
  tournament,
  homeName,
  awayName,
  homeScore,
  awayScore
) {
  const showVs = !Number.isFinite(homeScore) &&
    !Number.isFinite(awayScore);
  
  const showFullTime =
    Number.isFinite(homeScore) &&
    Number.isFinite(awayScore);
  
  const matchTime =
    match ?
    `
        <div class="kmatch-time">
          ${
            match.played &&
            match.playedAt
              ? formatRecordedTime(
                  match.playedAt
                )
              : match.scheduledAt
                ? formatMatchDay(
                    match.scheduledAt
                  )
                : ""
          }
        </div>
      ` :
    "";
  
  return `
    <div class="knockout-label">
      ${tournament.name || "Tournament"} - ${roundName}
    </div>

    <div class="team-row home-row">
      <div class="team-side">
        <div class="fixture-team-logo-placeholder">
          ?
        </div>

        <span class="team-name">
          ${homeName}
        </span>
      </div>

      <span class="score-value">
        ${
          typeof homeScore === "number"
            ? homeScore
            : ""
        }
      </span>
    </div>

    ${
      showVs
        ? `
          <div class="vs-container">
            <span class="Kvs-text">
              Vs
            </span>
          </div>
        `
        : ""
    }

    ${
      showFullTime
        ? `
          <div class="kft-badge">
            <span>
              Full Time
            </span>
          </div>
        `
        : ""
    }

    <div class="team-row away-row">
      <div class="team-side">
        <div class="fixture-team-logo-placeholder">
          ?
        </div>

        <span class="team-name">
          ${awayName}
        </span>
      </div>

      <span class="score-value">
        ${
          typeof awayScore === "number"
            ? awayScore
            : ""
        }
      </span>
    </div>

    ${matchTime}
  `;
}

function attachBracketTeamLogos(
  card,
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
  
  loadBracketTeamLogo(
    card,
    homeLogo,
    homeName,
    ".home-row .team-side"
  );
  
  loadBracketTeamLogo(
    card,
    awayLogo,
    awayName,
    ".away-row .team-side"
  );
}

function loadBracketTeamLogo(
  card,
  logoUrl,
  teamName,
  selector
) {
  if (
    !logoUrl ||
    teamName === "Awaiting Winner" ||
    teamName === "TBD"
  ) {
    return;
  }
  
  const teamSide =
    card.querySelector(selector);
  
  const placeholder =
    teamSide?.querySelector(
      ".fixture-team-logo-placeholder"
    );
  
  if (!teamSide || !placeholder) {
    return;
  }
  
  const img =
    document.createElement("img");
  
  img.className =
    "fixture-team-logo";
  
  img.src = logoUrl;
  
  img.alt =
    `${teamName} logo`;
  
  teamSide.replaceChild(
    img,
    placeholder
  );
}

function attachBracketMatchClick(card, match) {
  if (!card || !match) return;
  
  card.addEventListener("click", () => {
    if (APP_MODE === "view") return;
    
    const tournament =
      getCurrentTournament();
    
    if (!tournament) return;
    
    const submission =
      Object.values(
        tournament.matchSubmissions || {}
      ).find(
        s =>
        String(s.matchId) ===
        String(match.id) &&
        s.status === "pending"
      );
    
    if (submission) {
      return openSubmissionReview(
        match,
        submission
      );
    }
    
    return openLeagueRecorder(match);
  });
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
      } = splitBracketRound(round);
      
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
  
  if (!finalRound) return;
  
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
  
  center.appendChild(column);
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
  
  svg.appendChild(path);
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
  
  if (!finalRound) return;
  
  const finalCard =
    center.querySelector(
      ".final-round-column .match-card"
    );
  
  if (!finalCard) return;
  
  const nonFinalRounds =
    rounds.filter(
      round =>
      round.roundName !== "Final"
    );
  
  const semifinalRound =
    nonFinalRounds[
      nonFinalRounds.length - 1
    ];
  
  if (!semifinalRound) return;
  
  const leftContent =
    left.querySelector(
      ".bracket-side-content"
    );
  
  const rightContent =
    right.querySelector(
      ".bracket-side-content"
    );
  
  if (!leftContent || !rightContent) {
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
  
  svg.appendChild(path);
}

function getBracketChampion(rounds) {
  const finalRound =
    rounds.find(
      round =>
      round.roundName === "Final"
    );
  
  if (!finalRound) {
    return "TBD";
  }
  
  const finalMatch =
    finalRound.matches[0]?.match;
  
  if (!finalMatch?.played) {
    return "TBD";
  }
  
  const home =
    getBracketTeamName(
      finalMatch.home
    );
  
  const away =
    getBracketTeamName(
      finalMatch.away
    );
  
  if (
    !Number.isFinite(
      finalMatch.homeGoals
    ) ||
    !Number.isFinite(
      finalMatch.awayGoals
    )
  ) {
    return "TBD";
  }
  
  return finalMatch.homeGoals >
    finalMatch.awayGoals ?
    home :
    away;
}

function getBracketChampionIcon(tournament) {
  if (!tournament?.tournamentImage) {
    return "🏆";
  }
  
  const image =
    typeof tournament.tournamentImage === "string" ?
    tournament.tournamentImage :
    tournament.tournamentImage?.url;
  
  if (!image) {
    return "🏆";
  }
  
  return `
    <img
      src="${image}"
      class="champion-trophy-img"
      alt="Tournament Trophy"
    >
  `;
}

async function renderBracketChampion(
  container,
  tournament,
  rounds
) {
  const champion =
    getBracketChampion(rounds);
  
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
  
  container.appendChild(box);
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

async function renderFullBracket() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const container =
    getBracketContainer();
  
  if (!container) return;
  
  const matches =
    getBracketMatches(tournament);
  
  if (!matches.length) {
    renderBracketEmptyState(
      container
    );
    
    return;
  }
  
  const rounds =
    getBracketRounds(tournament);
  
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
  } = createBracketLayout();
  
  container.appendChild(layout);
  
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
  
  if (!left || !center || !right) {
    return;
  }
  
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const rounds =
    getBracketRounds(tournament);
  
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
          round.roundName !== "Final"
        );
      
      const contentRect =
        content.getBoundingClientRect();
      
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

function renderCupTables() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container = document.getElementById("cupTables");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (!tournament.groups?.length) {
    container.innerHTML = `
      <p class="emptyText">
        No table for direct Knockout Cups
        <br>
        Check the bracket section for knockout Matches
      </p>
    `;
    return;
  }
  
  generateGroupTables(tournament);
  
  tournament.groups.forEach(group => {
    renderCupTableGroup(
      container,
      tournament,
      group
    );
  });
}

function renderCupTableGroup(
  container,
  tournament,
  group
) {
  const table =
    tournament.groupTables?.[group.name] || [];
  
  const groupCard =
    createCupTableGroupCard(
      group.name
    );
  
  const tbody =
    groupCard.querySelector("tbody");
  
  if (!table.length) {
    renderEmptyCupTable(tbody);
  } else {
    table.forEach(team => {
      renderCupTableRow(
        tbody,
        tournament,
        team
      );
    });
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

function detectChampion(tournament) {
  if (!tournament?.knockoutMatches) {
    return null;
  }
  
  const finalRound =
    Math.max(
      ...tournament.knockoutMatches.map(
        match =>
        match.roundIndex || 0
      )
    );
  
  const finalMatch =
    tournament.knockoutMatches.find(
      match =>
      match.roundIndex === finalRound
    );
  
  if (
    !finalMatch ||
    !finalMatch.played
  ) {
    return null;
  }
  
  const winner =
    getKnockoutWinner(finalMatch);
  
  if (!winner) return null;
  
  const championName =
    getCupTeamName(winner);
  
  const logoUrl =
    getTeamLogo(
      tournament,
      championName
    );
  
  tournament.champion = winner;
  tournament.championName =
    championName;
  
  showChampionAnimation(
    championName,
    logoUrl
  );
  
  return winner;
}
function renderEmptyCupTable(tbody) {
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
  const tr = document.createElement("tr");
  
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
  
  tbody.appendChild(tr);
  
  loadCupTableLogo(
    tr,
    tournament,
    team.name
  );
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

function toggleGroupSettings() {
  const checked =
    document.getElementById(
      "enableGroups"
    ).checked;
  
  document.getElementById(
      "groupOptions"
    ).style.display =
    checked ?
    "block" :
    "none";
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

      const sortedTeams =
        [...table].sort(
          (a, b) =>
            Number(a.pos || 0) -
            Number(b.pos || 0)
        );

      for (
        let i = 0;
        i < teamsQualify;
        i++
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
          id:
            teamData?.id ||
            null,

          name:
            teamName,

          group:
            group.name,

          pos:
            Number(
              standingRow.pos
            ),

          isBye:
            false
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
    let i = 0;
    i < numMatches;
    i++
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

  const teams = useGroups
    ? getQualifiedTeams(tournament)
    : Object.values(
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
    let i = 0;
    i < pairedTeams.length;
    i += 2
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
    let round = 2;
    round <= totalRounds;
    round++
  ) {
    const matchesInRound =
      Math.pow(
        2,
        totalRounds - round
      );

    for (
      let slot = 0;
      slot < matchesInRound;
      slot++
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
    typeof getCurrentTournament === "function"
      ? getCurrentTournament()
      : null;

  if (!tournament || !tournament.groups?.length) {
    return;
  }

  let totalExpectedMatches = 0;

  tournament.groups.forEach(group => {
    let teamCount =
      Array.isArray(group.teams)
        ? group.teams.length
        : 0;

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
          qualifiedTeams:
            tournament.qualifiedTeams,
          knockoutMatches:
            tournament.knockoutMatches
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

const viewport = document.getElementById("bracketViewport");
if (viewport) {
  viewport.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }, { passive: false });
  
  viewport.addEventListener("touchmove", e => {
    if (e.touches.length !== 2 || !initialDistance) return;
    
    e.preventDefault();
    
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const scaleChange = distance / initialDistance;
    bracketZoom = Math.min(Math.max(bracketZoom * scaleChange, 0.5), 2);
    
    applyBracketZoom();
    initialDistance = distance;
  }, { passive: false });
  
  viewport.addEventListener("touchend", () => {
    initialDistance = 0;
  });
}













