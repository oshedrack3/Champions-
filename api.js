const API = "https://champions.oshedrack3.workers.dev";

async function apiRequest(url, options = {}, retryCallback = null) {
  
  const controller = new AbortController();
  
  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);
  
  
  try {
    
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    return res;
    
    
  } catch (err) {
    
    clearTimeout(timeout);
    
    
    if (err.name === "AbortError") {
      
      hideLoader();
      
      showConfirmModal(
        "Network is taking too long. Do you want to retry again?",
        "Retry Again",
        "Cancel"
      );
      
      
      confirmYes = () => {
        
        closeConfirmModal();
        
        if (retryCallback) {
          retryCallback();
        }
        
      };
      
      
      confirmNo = () => {
        closeConfirmModal();
      };
      
      
      return null;
    }
    
    
    throw err;
  }
}


function getSession() {
  try {
    return JSON.parse(localStorage.getItem("session")) || null;
  } catch {
    return null;
  }
}

function getToken() {
  return getSession()?.token || null;
}

function getCurrentUser() {
  return getSession()?.user || null;
}

function isLoggedIn() {
  return !!getToken();
}

function saveSession(token, user) {
  localStorage.setItem(
    "session",
    JSON.stringify({
      token,
      user
    })
  );
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  
  APP_MODE = "view";
  
  currentTournament = null;
  currentReviewMatch = null;
  currentReviewSubmission = null;
}


async function verifySession() {
  const token = getToken();
  
  if (!token) {
    APP_MODE = "view";
    return false;
  }
  
  try {
    const res = await fetch(`${API}/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      APP_MODE = "view";
      clearSession();
      return false;
    }
    
    saveSession(token, result.user);
    
    switchAppMode();
    
    if (result.user.role === "player") {
      if (typeof hideAdminTools === "function") {
        hideAdminTools();
      }
    }
    
    return true;
    
  } catch (err) {
    console.error("Session verification failed:", err);
    
    APP_MODE = "view";
    clearSession();
    
    return false;
  }
}
async function handleRegister() {
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const role = document.getElementById("registerRole").value;
  
  if (!username || !email || !password || !role) {
    showAlert("Please fill in all fields.");
    return;
  }
  
  showLoader();
  
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        email,
        password,
        role
      })
    });
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(result.message || "Registration failed.");
    }
    
    showAlert("Account created successfully.");
    
    document.getElementById("registerUsername").value = "";
    document.getElementById("registerEmail").value = "";
    document.getElementById("registerPassword").value = "";
    document.getElementById("registerRole").selectedIndex = 0;
    
    showLogin();
    
  } catch (err) {
    showAlert(err.message);
  } finally {
    hideLoader();
  }
}

async function createTournament(data) {
  const token = getToken();
  
  const res = await fetch(`${API}/tournaments/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(data)
  });
  
  return await res.json();
}

async function getMyTournaments(
  competitionId
) {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/my?competition_id=${encodeURIComponent(competitionId)}`,
    {
      headers: {
        Authorization: token
      }
    },
    () =>
    getMyTournaments(
      competitionId
    )
  );
  
  if (!res) return [];
  
  const result =
    await res.json();
  
  if (
    !res.ok ||
    !result.success
  ) {
    throw new Error(
      result.message ||
      "Failed to load tournaments."
    );
  }
  
  return result.tournaments || [];
}


async function updateTournament(id, changes) {
  const token = getToken();
  
  const res = await fetch(`${API}/tournaments/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(changes)
  });
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to update tournament.");
  }
  
  return result.tournament;
}

async function updateTournamentDetails(id, data) {
  const token = getToken();
  
  const res = await fetch(
    `${API}/tournaments/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify(data)
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to update tournament details."
    );
  }
  
  return result.tournament;
}

async function uploadTeamLogo(tournamentId, teamId, teamName, logo) {
  const token = getToken();
  
  const res = await fetch(`${API}/tournaments/${tournamentId}/team-logo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({
      teamId,
      teamName,
      logo
    })
  });
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to upload logo.");
  }
  
  return result.image;
}
async function deleteTournamentFromFirebase(id) {
  const token = getToken();
  
  const res = await fetch(`${API}/tournaments/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: token
    }
  });
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to delete tournament.");
  }
  
  return result;
}

async function deleteTournamentFixtures(id) {
  
  const token = getToken();
  
  const res = await fetch(
    `${API}/tournaments/${id}/fixtures`,
    {
      method: "DELETE",
      headers: {
        Authorization: token
      }
    }
  );
  
  
  const result = await res.json();
  
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Failed to delete fixtures."
    );
  }
  
  
  return result;
  
}

async function getTournamentRules(tournamentId) {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/${tournamentId}/rules`,
    {
      headers: {
        Authorization: token
      }
    },
    () =>
    getTournamentRules(
      tournamentId
    )
  );
  
  if (!res) return null;
  
  const result =
    await res.json();
  
  if (
    !res.ok ||
    !result.success
  ) {
    throw new Error(
      result.message ||
      "Failed to load tournament rules."
    );
  }
  
  return result;
}

async function acceptTournamentRules(
  tournamentId
) {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/${tournamentId}/rules/accept`,
    {
      method: "POST",
      headers: {
        Authorization: token
      }
    },
    () =>
    acceptTournamentRules(
      tournamentId
    )
  );
  
  if (!res) return null;
  
  const result =
    await res.json();
  
  if (
    !res.ok ||
    !result.success
  ) {
    throw new Error(
      result.message ||
      "Failed to accept tournament rules."
    );
  }
  
  return result;
}
async function respondToInvitation(tournamentId, action) {
  showLoader();
  
  try {
    const token = getToken();
    
    const res = await fetch(
      `${API}/tournaments/${tournamentId}/respond`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          action
        })
      }
    );
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(result.message);
    }
    
    myTournaments = await getMyTournaments();
    
    renderTournamentList();
    
    showActionModal(
      action === "accept" ?
      "Invitation accepted" :
      "Invitation declined",
      "success"
    );
    
  } catch (err) {
    showAlert(err.message || "Failed to respond to invitation");
  } finally {
    hideLoader();
  }
}
async function getTournament(id) {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/${id}`,
    {
      headers: {
        Authorization: token
      }
    },
    () => getTournament(id)
  );
  
  if (!res) return null;
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load tournament."
    );
  }
  
  return result.tournament;
}

async function getTeams(tournamentId) {
  if (!tournamentId) {
    throw new Error("Tournament ID is required.");
  }
  const token = getToken();
  if (!token) {
    throw new Error("You are not logged in.");
  }
  const res = await apiRequest(
    `${API}/tournaments/${encodeURIComponent(tournamentId)}/teams`,
    {
      method: "GET",
      headers: {
        Authorization: token
      }
    },
    () => getTeams(tournamentId)
  );
  if (!res) {
    throw new Error("No response from server.");
  }
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load teams."
    );
  }
  return result.teams || [];
}

async function getMatchSubmission(
  tournamentId,
  matchId,
  forceRefresh = false
) {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/${tournamentId}/matches/${matchId}/submission`,
    {
      headers: {
        Authorization: token
      }
    },
    () =>
    getMatchSubmission(
      tournamentId,
      matchId,
      forceRefresh
    )
  );
  
  if (!res) return null;
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load submission."
    );
  }
  
  return result.submission || null;
}
async function getMatchSubmissions(
  tournamentId,
  matchId,
  forceRefresh = false
) {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/${tournamentId}/matches/${matchId}/submissions`,
    {
      headers: {
        Authorization: token
      }
    },
    () =>
    getMatchSubmissions(
      tournamentId,
      matchId,
      forceRefresh
    )
  );
  
  if (!res) return [];
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load submissions."
    );
  }
  
  return result.submissions || [];
}

async function rebuildTournamentTable(tournamentId) {
  const token = getToken();
  const res = await fetch(
    `${API}/tournaments/${tournamentId}/table`,
    {
      method: "GET",
      headers: {
        Authorization: token
      }
    }
  );
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to rebuild table.");
  }
  return result.table;
}

async function reviewMatchSubmission(
  tournamentId,
  submissionId,
  action,
  rejectionReason = ""
) {
  const token = getToken();
  
  const res = await fetch(
    `${API}/tournaments/${tournamentId}/match-submission/${submissionId}/review`,
    {
      method: "PATCH",
      
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      
      body: JSON.stringify({
        status: action === "approved" ?
          "approved" : "rejected",
        rejection_reason: rejectionReason
      })
    }
  );
  
  const result =
    await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Review failed."
    );
  }
  
  return result;
}


async function invitePlayer(username) {
  const tournament = getCurrentTournament();
  
  if (!tournament) {
    showAlert("No tournament selected");
    return;
  }
  
  if (!username || !username.trim()) {
    showAlert("Enter a username");
    return;
  }
  
  showLoader();
  
  try {
    const token = getToken();
    
    const res = await fetch(
      `${API}/tournaments/${tournament.id}/invite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          username: username.trim()
        })
      }
    );
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(result.message);
    }
    
    showActionModal("Invitation sent successfully", "success");
    
  } catch (err) {
    showAlert(err.message || "Failed to send invitation");
  } finally {
    hideLoader();
  }
}





async function refreshTournamentFromSSE() {
  
  if (tournamentRefreshRunning) {
    tournamentRefreshQueued = true;
    return;
  }
  
  tournamentRefreshRunning = true;
  
  try {
    await refreshCurrentTournament();
    
    renderFixtures();
    renderRecords();
    renderFormView();
    
    if (currentTournament.format === "league") {
      renderTable(currentTournament.table);
    } else {
      renderFullBracket();
    }
    
  } catch (err) {
    console.error(
      "Tournament UI refresh error:",
      err
    );
    
  } finally {
    tournamentRefreshRunning = false;
    
    if (tournamentRefreshQueued) {
      tournamentRefreshQueued = false;
      refreshTournamentFromSSE();
    }
  }
}

function startTournamentEvents(tournamentId) {
  
  if (tournamentEvents) {
    tournamentEvents.close();
    tournamentEvents = null;
  }
  
  tournamentEvents = new EventSource(
    `${API}/tournaments/${tournamentId}/events?token=${encodeURIComponent(getToken())}`
  );
  
  tournamentEvents.onopen = () => {
    console.log("Tournament SSE connected");
  };
  
  tournamentEvents.addEventListener(
    "tournament-update",
    async event => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type !== "TOURNAMENT_UPDATED") {
          return;
        }
        
        await refreshTournamentFromSSE();
        
      } catch (err) {
        console.error(
          "Tournament SSE update error:",
          err
        );
      }
    }
  );
  
  tournamentEvents.onerror = () => {
    console.log("Tournament SSE connection failed");
  };
}



async function handleNewNotification(
  notification
) {
  notifications.unshift(
    notification
  );
  
  await saveCachedData(
    "notifications",
    "",
    notifications
  );
  
  renderNotifications();
}
async function openNotification(id) {
  
  await fetch(
    `${API}/notifications/${id}/read`,
    {
      method: "PATCH",
      headers: {
        Authorization: getToken()
      }
    }
  );
  
  
  const item = notifications.find(
    n => n.id === id
  );
  
  
  if (item) {
    item.read = true;
  }
  
  
  renderNotifications();
  
}
async function createCompetition(data) {
  const token = getToken();
  
  const res = await fetch(`${API}/competitions/create`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message);
  }
  
  return result;
}

async function getMyCompetitions() {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/competitions/my`,
    {
      headers: {
        Authorization: token
      }
    },
    () => getMyCompetitions()
  );
  
  if (!res) return [];
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load competitions."
    );
  }
  
  return result.competitions || [];
}

async function getPublicCompetitions(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCachedData(
      "public-competitions"
    );
    
    if (cached) {
      return cached;
    }
  }
  
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/competitions/public`,
    {
      headers: {
        Authorization: token
      }
    },
    () => getPublicCompetitions(forceRefresh)
  );
  
  if (!res) return [];
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load public competitions."
    );
  }
  
  const competitions =
    result.competitions || [];
  
  await saveCachedData(
    "public-competitions",
    "",
    competitions
  );
  
  return competitions;
}

async function getHallOfFame() {
  let hallOfFame =
    await getCachedData(
      "hall-of-fame"
    );
  
  if (
    !hallOfFame ||
    typeof hallOfFame !== "object"
  ) {
    hallOfFame = {
      categories: []
    };
  }
  
  const cachedSync =
    await getCachedData(
      "hallOfFameSync"
    );
  
  const lastChangeId =
    cachedSync &&
    Number.isInteger(
      Number(
        cachedSync.lastChangeId
      )
    ) ?
    Number(
      cachedSync.lastChangeId
    ) :
    0;
  
  const token =
    getToken();
  
  if (!token) {
    return hallOfFame;
  }
  
  const res =
    await apiRequest(
      `${API}/hall-of-fame/sync?since=${lastChangeId}`,
      {
        method: "GET",
        headers: {
          Authorization: token
        }
      },
      getHallOfFame
    );
  
  if (!res) {
    return hallOfFame;
  }
  
  const result =
    await res.json();
  
  if (
    !res.ok ||
    !result.success
  ) {
    throw new Error(
      result.message ||
      "Failed to synchronize Hall of Fame."
    );
  }
  
  if (
    result.changed &&
    result.hallOfFame
  ) {
    hallOfFame =
      result.hallOfFame;
    
    await saveCachedData(
      "hall-of-fame",
      "",
      hallOfFame
    );
  }
  
  await saveCachedData(
    "hallOfFameSync",
    "",
    {
      lastChangeId: Number(
        result.lastChangeId ||
        lastChangeId
      )
    }
  );
  
  return hallOfFame;
}
async function saveHallOfFame() {
  if (!hallOfFameAdminData) {
    return;
  }
  
  try {
    showLoader();
    
    const token =
      getToken();
    
    const res =
      await apiRequest(
        `${API}/hall-of-fame`,
        {
          method: "PATCH",
          headers: {
            Authorization: token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            categories: hallOfFameAdminData.categories
          })
        },
        saveHallOfFame
      );
    
    if (!res) {
      return;
    }
    
    const result =
      await res.json();
    
    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Failed to save Hall of Fame."
      );
    }
    
    hallOfFameAdminData =
      result.hallOfFame;
    
    await saveCachedData(
      "hall-of-fame",
      "",
      hallOfFameAdminData
    );
    
    if (
      result.changeId !== null &&
      result.changeId !== undefined
    ) {
      await saveCachedData(
        "hallOfFameSync",
        "",
        {
          lastChangeId: Number(
            result.changeId
          )
        }
      );
    }
    
    renderHallOfFame(
      hallOfFameAdminData
    );
    
    renderHallOfFameAdminEditor();
    
    alert(
      "Hall of Fame updated successfully."
    );
    
  } catch (error) {
    console.error(
      "Failed to save Hall of Fame:",
      error
    );
    
    alert(
      error.message ||
      "Failed to save Hall of Fame."
    );
    
  } finally {
    hideLoader();
  }
}

async function updateTeam(tournamentId, teamId, data) {
  const token = getToken();
  
  const res = await fetch(
    `${API}/tournaments/${tournamentId}/team/${teamId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify(data)
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Failed to update team"
    );
  }
  
  return result;
}
async function deleteMyAccount(password) {
  const token = getToken();
  
  const res = await fetch(`${API}/users/delete-my-account`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({
      password
    })
  });
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Failed to delete account."
    );
  }
  
  return result;
}

async function managerDeleteUser(uid, accessCode) {
  const res = await fetch(
    `${API}/users/manager-delete-user/${uid}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        accessCode
      })
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Failed to delete user."
    );
  }
  
  return result;
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
async function updateCompetition(id, data) {
  const token = getToken();
  
  const res = await fetch(
    `${API}/competitions/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Failed to update competition."
    );
  }
  
  return result.competition;
}
async function joinTournament(
  tournamentId
) {
  const token = getToken();
  if (!token) {
    showAlert(
      "You must be logged in to join."
    );
    return;
  }
  showLoader();
  try {
    const teamsRes =
      await apiRequest(
        `${API}/teams`,
        {
          method: "GET",
          headers: {
            Authorization: token
          }
        },
        () =>
        joinTournament(
          tournamentId
        )
      );
    if (!teamsRes) {
      throw new Error(
        "Failed to load your teams."
      );
    }
    const teamsResult =
      await teamsRes.json();
    if (
      !teamsRes.ok ||
      !teamsResult.success
    ) {
      throw new Error(
        teamsResult.message ||
        "Failed to load your teams."
      );
    }
    const teams =
      teamsResult.teams || [];
    if (!teams.length) {
      throw new Error(
        "You do not have any teams. Create a team first."
      );
    }
    hideLoader();
    const selectedTeamIds =
      await showTeamSelectionModal(
        teams
      );
    if (
      !Array.isArray(
        selectedTeamIds
      ) ||
      !selectedTeamIds.length
    ) {
      return;
    }
    showLoader();
    const res =
      await apiRequest(
        `${API}/tournaments/${encodeURIComponent(
          tournamentId
        )}/join`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            team_ids: selectedTeamIds
          })
        },
        () =>
        joinTournament(
          tournamentId
        )
      );
    if (!res) {
      throw new Error(
        "No response from server."
      );
    }
    const result =
      await res.json();
    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        "Failed to join tournament."
      );
    }
    const updatedPlayers =
      Array.isArray(result.players) ?
      result.players : [];
    const tournament =
      getCurrentTournament();
    if (
      tournament &&
      String(tournament.id) ===
      String(tournamentId)
    ) {
      if (
        !Array.isArray(
          tournament.tournament_players
        )
      ) {
        tournament.tournament_players = [];
      }
      const existingPlayers =
        new Map(
          tournament.tournament_players.map(
            player => [
              String(
                player.team_id
              ),
              player
            ]
          )
        );
      updatedPlayers.forEach(
        player => {
          existingPlayers.set(
            String(
              player.team_id
            ),
            player
          );
        }
      );
      tournament.tournament_players =
        Array.from(
          existingPlayers.values()
        );
      tableCache = null;
      cachedTournamentId = null;
      if (
        tournament.format ===
        "league"
      ) {
        await rebuildTableFromMatches();
      } else {
        await renderFullBracket();
      }
    }
    showActionModal(
      "Successfully joined tournament",
      "success"
    );
  } catch (err) {
    console.error(
      "[joinTournament]",
      err
    );
    showAlert(
      err.message ||
      "Join failed"
    );
  } finally {
    hideLoader();
  }
}


async function handleJoinTournament() {
  const tournament =
    getCurrentTournament();
  
  if (!tournament?.id) {
    showAlert(
      "No tournament selected."
    );
    return;
  }
  
  await joinTournament(
    tournament.id
  );
}
async function getPublicTournaments(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCachedData(
      "public-tournaments"
    );
    
    if (cached) {
      return cached;
    }
  }
  
  showLoader();
  
  try {
    const token = getToken();
    
    const res = await apiRequest(
      `${API}/tournaments/public`,
      {
        method: "GET",
        headers: {
          Authorization: token
        }
      },
      () => getPublicTournaments(forceRefresh)
    );
    
    if (!res) return [];
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(
        result.message ||
        "Failed to load public tournaments."
      );
    }
    
    const tournaments =
      result.tournaments || [];
    
    await saveCachedData(
      "public-tournaments",
      "",
      tournaments
    );
    
    return tournaments;
    
  } catch (err) {
    showAlert(
      err.message ||
      "Error loading tournaments"
    );
    
    return [];
    
  } finally {
    hideLoader();
  }
}


function urlBase64ToUint8Array(
  base64String
) {
  const padding =
    "=".repeat(
      (4 - (base64String.length % 4)) % 4
    );
  
  const base64 =
    (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  
  const rawData =
    atob(base64);
  
  return Uint8Array.from(
    [...rawData].map(
      char => char.charCodeAt(0)
    )
  );
}

async function updateSubmissionDeadline(
  tournamentId,
  fromRound,
  toRound,
  deadline,
  enabled
) {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/${tournamentId}/submission-deadline`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        fromRound,
        toRound,
        deadline,
        enabled
      })
    },
    () => updateSubmissionDeadline(
      tournamentId,
      fromRound,
      toRound,
      deadline,
      enabled
    )
  );
  
  if (!res) return null;
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to update submission deadline."
    );
  }
  
  return result.submissionDeadline;
}



async function getNotices(force = false) {
  const token =
    getToken();
  
  if (!token) {
    throw new Error(
      "Invalid session."
    );
  }
  
  if (
    !force &&
    Array.isArray(
      noticesMemoryCache
    )
  ) {
    return noticesMemoryCache;
  }
  
  let notices =
    Array.isArray(
      noticesMemoryCache
    ) ?
    noticesMemoryCache :
    await getCachedData(
      "notices"
    );
  
  if (!Array.isArray(notices)) {
    notices = [];
  }
  
  if (
    !force &&
    noticesSyncChecked
  ) {
    noticesMemoryCache =
      notices;
    
    return notices;
  }
  
  const cachedSync =
    await getCachedData(
      "noticesSync"
    );
  
  const lastChangeId =
    cachedSync &&
    Number.isInteger(
      Number(
        cachedSync.lastChangeId
      )
    ) ?
    Number(
      cachedSync.lastChangeId
    ) :
    0;
  
  const response =
    await apiRequest(
      `${API}/notices/sync?since=${lastChangeId}`,
      {
        method: "GET",
        headers: {
          Authorization: token
        }
      },
      getNotices
    );
  
  if (!response) {
    noticesMemoryCache =
      notices;
    
    return notices;
  }
  
  const data =
    await response.json();
  
  if (
    !response.ok ||
    !data.success
  ) {
    throw new Error(
      data.message ||
      "Failed to synchronize notices."
    );
  }
  
  const newNotices =
    Array.isArray(
      data.notices
    ) ?
    data.notices : [];
  
  const deleted =
    Array.isArray(
      data.deleted
    ) ?
    data.deleted : [];
  
  const noticeMap =
    new Map(
      notices.map(
        notice => [
          notice.id,
          notice
        ]
      )
    );
  
  for (
    const notice of newNotices
  ) {
    if (!notice?.id) continue;
    
    noticeMap.set(
      notice.id,
      notice
    );
  }
  
  for (
    const noticeId of deleted
  ) {
    noticeMap.delete(
      noticeId
    );
  }
  
  notices =
    Array.from(
      noticeMap.values()
    );
  
  notices =
    notices.filter(
      notice =>
      !notice.expires_at ||
      Number(
        notice.expires_at
      ) > Date.now()
    );
  
  notices.sort(
    (a, b) =>
    Number(
      b.created_at || 0
    ) -
    Number(
      a.created_at || 0
    )
  );
  
  await saveCachedData(
    "notices",
    "",
    notices
  );
  
  await saveCachedData(
    "noticesSync",
    "",
    {
      lastChangeId: Number(
        data.lastChangeId ??
        lastChangeId
      )
    }
  );
  
  noticesMemoryCache =
    notices;
  
  noticesSyncChecked =
    true;
  
  return notices;
}
async function createNotice() {
  const title =
    document
    .getElementById(
      "noticeTitle"
    )
    .value
    .trim();
  const category =
    document
    .getElementById(
      "noticeCategory"
    )
    .value;
  const content =
    document
    .getElementById(
      "noticeContent"
    )
    .value
    .trim();
  const files =
    Array.from(
      document
      .getElementById(
        "noticeImages"
      )
      .files || []
    );
  const published =
    document
    .getElementById(
      "noticePublished"
    )
    .checked;
  const noExpiry =
    document
    .getElementById(
      "noticeNoExpiry"
    )
    .checked;
  const expiryValue =
    document
    .getElementById(
      "noticeExpiresAt"
    )
    .value;
  if (!title) {
    showAlert(
      "Enter a notice title."
    );
    return;
  }
  if (!content) {
    showAlert(
      "Enter the notice content."
    );
    return;
  }
  let expiresAt = null;
  if (!noExpiry) {
    if (!expiryValue) {
      showAlert(
        "Select an expiry date."
      );
      return;
    }
    expiresAt =
      new Date(
        expiryValue
      ).getTime();
    if (
      !Number.isFinite(
        expiresAt
      ) ||
      expiresAt <= Date.now()
    ) {
      showAlert(
        "Expiry date must be in the future."
      );
      return;
    }
  }
  if (files.length > 10) {
    showAlert(
      "You can upload a maximum of 10 images."
    );
    return;
  }
  showLoader();
  try {
    const images = [];
    for (
      const file of files
    ) {
      const base64 =
        await fileToBase64(
          file,
          1200
        );
      images.push(
        base64
      );
    }
    const response =
      await apiRequest(
        `${API}/notices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: getToken()
          },
          body: JSON.stringify({
            title,
            content,
            category,
            images,
            published,
            expiresAt
          })
        },
        createNotice
      );
    if (!response) {
      return;
    }
    const data =
      await response.json();
    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Failed to create notice."
      );
    }
    let notices =
      Array.isArray(
        noticesMemoryCache
      ) ?
      noticesMemoryCache :
      await getCachedData(
        "notices"
      );
    if (!Array.isArray(notices)) {
      notices = [];
    }
    if (
      data.notice &&
      data.notice.published &&
      (
        !data.notice.expires_at ||
        Number(
          data.notice.expires_at
        ) > Date.now()
      )
    ) {
      const noticeMap =
        new Map(
          notices.map(
            notice => [
              String(notice.id),
              notice
            ]
          )
        );
      noticeMap.set(
        String(data.notice.id),
        data.notice
      );
      notices =
        Array.from(
          noticeMap.values()
        );
      notices =
        notices.filter(
          notice =>
          !notice.expires_at ||
          Number(
            notice.expires_at
          ) > Date.now()
        );
      notices.sort(
        (a, b) =>
        Number(
          b.created_at || 0
        ) -
        Number(
          a.created_at || 0
        )
      );
    }
    noticesMemoryCache =
      notices;
    await saveCachedData(
      "notices",
      "",
      notices
    );
    if (
      data.changeId !== null &&
      data.changeId !== undefined
    ) {
      await saveCachedData(
        "noticesSync",
        "",
        {
          lastChangeId: Number(
            data.changeId
          )
        }
      );
    }
    renderNotices(
      notices
    );
    closeNoticeBoardModal();
    showActionModal(
      "Notice published successfully.",
      "success"
    );
  } catch (err) {
    console.error(
      "[createNotice]",
      err
    );
    showAlert(
      err.message ||
      "Failed to create notice."
    );
  } finally {
    hideLoader();
  }
}
async function deleteNotice(noticeId) {
  if (!noticeId) {
    showAlert(
      "Invalid notice."
    );
    return;
  }
  const confirmed =
    await showConfirmModal(
      "Are you sure you want to delete this notice?",
      "Delete",
      "Cancel"
    );
  if (!confirmed) {
    return;
  }
  showLoader();
  try {
    const response =
      await apiRequest(
        `${API}/notices/${noticeId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: getToken()
          }
        },
        deleteNotice
      );
    if (!response) {
      return;
    }
    const data =
      await response.json();
    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
        "Failed to delete notice."
      );
    }
    let notices =
      Array.isArray(
        noticesMemoryCache
      ) ?
      noticesMemoryCache :
      await getCachedData(
        "notices"
      );
    if (!Array.isArray(notices)) {
      notices = [];
    }
    notices =
      notices.filter(
        notice =>
        String(notice.id) !==
        String(noticeId)
      );
    noticesMemoryCache =
      notices;
    await saveCachedData(
      "notices",
      "",
      notices
    );
    if (
      data.changeId !== null &&
      data.changeId !== undefined
    ) {
      await saveCachedData(
        "noticesSync",
        "",
        {
          lastChangeId: Number(
            data.changeId
          )
        }
      );
    }
    renderNotices(notices);
    showActionModal(
      "Notice deleted successfully.",
      "success"
    );
    return true;
  } catch (err) {
    console.error(
      "[deleteNotice]",
      err
    );
    showAlert(
      err.message ||
      "Failed to delete notice."
    );
    return false;
  } finally {
    hideLoader();
  }
}

async function handleRegister() {
  const username =
    document
    .getElementById("registerUsername")
    .value
    .trim();
  
  const email =
    document
    .getElementById("registerEmail")
    .value
    .trim();
  
  const phone =
    document
    .getElementById("registerPhone")
    .value
    .trim();
  
  const password =
    document
    .getElementById("registerPassword")
    .value;
  
  const role =
    document
    .getElementById("registerRole")
    .value;
  
  if (
    !username ||
    !email ||
    !phone ||
    !password ||
    !role
  ) {
    showAlert(
      "Please fill in all fields."
    );
    return;
  }
  
  showLoader();
  
  try {
    const res =
      await fetch(
        `${API}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username,
            email,
            phone,
            password,
            role
          })
        }
      );
    
    console.log(
      "REGISTER HTTP STATUS:",
      res.status
    );
    
    console.log(
      "REGISTER HTTP OK:",
      res.ok
    );
    
    const responseText =
      await res.text();
    
    console.log(
      "REGISTER RAW RESPONSE:",
      responseText
    );
    
    let result;
    
    try {
      result =
        JSON.parse(
          responseText
        );
    } catch (parseError) {
      console.error(
        "REGISTER JSON PARSE ERROR:",
        parseError
      );
      
      throw new Error(
        `Server returned an invalid response (${res.status}).`
      );
    }
    
    console.log(
      "REGISTER JSON:",
      result
    );
    
    if (
      !res.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
        `Registration failed (${res.status}).`
      );
    }
    
    showAlert(
      "Account created successfully."
    );
    
    document.getElementById(
      "registerUsername"
    ).value = "";
    
    document.getElementById(
      "registerEmail"
    ).value = "";
    
    document.getElementById(
      "registerPhone"
    ).value = "";
    
    document.getElementById(
      "registerPassword"
    ).value = "";
    
    document.getElementById(
      "registerRole"
    ).selectedIndex = 0;
    
    showLogin();
    
  } catch (err) {
    console.error(
      "Registration request failed:",
      err
    );
    
    showAlert(
      err.message ||
      "Failed to create account."
    );
    
  } finally {
    hideLoader();
  }
}


async function getTournamentMatches(tournamentId) {
  const token = getToken();
  
  const res = await fetch(
    `${API}/tournaments/${tournamentId}/matches`,
    {
      method: "GET",
      headers: {
        Authorization: token
      }
    }
  );
  
  const result = await res.json();
  
  console.log("[getTournamentMatches]", result);
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load tournament matches."
    );
  }
  
  return result.matches || [];
}

async function updateMatch(matchId, updates) {
  const token = getToken();
  
  if (!token) {
    throw new Error("Not authenticated");
  }
  
  const response = await fetch(
    `/matches/${encodeURIComponent(matchId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    }
  );
  
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      "Failed to update match"
    );
  }
  
  return data;
}

async function getUserProfile() {
  const cachedProfile = await getCachedData("profile");

  let profile =
    cachedProfile && typeof cachedProfile === "object"
      ? cachedProfile
      : {
          username: "",
          phone: "",
          payout_account_name: "",
          payout_account_number: "",
          payout_bank_name: "",
          teams: []
        };

  const token = getToken();

  if (!token) {
    return profile;
  }

  const res = await apiRequest(
    `${API}/profile`,
    {
      method: "GET",
      headers: {
        Authorization: token
      }
    },
    getUserProfile
  );

  if (!res) {
    return profile;
  }

  const result = await res.json();

  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Failed to load profile."
    );
  }

  profile = {
    ...profile,
    ...(result.profile || {})
  };

  await saveCachedData("profile", "", profile);

  return profile;
}
async function openProfileModal() {
  goBackHome()
  bindNotificationToggle();
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
      loadPasskeyStatus();
    renderUserProfile(profile);
    renderProfilePageSquad();
    
  } catch (error) {
    console.error(
      "Failed to load profile:",
      error
    );
  }
}


async function openUpdateProfile() {
  const modal = document.getElementById("updateProfileModal");

  if (!modal) {
    return;
  }

  const usernameInput = document.getElementById("updateProfileUsername");
  const phoneInput = document.getElementById("updateProfilePhone");
  const bankNameInput = document.getElementById("updateProfileBankName");
  const accountNameInput = document.getElementById("updateProfileAccountName");
  const accountNumberInput = document.getElementById("updateProfileAccountNumber");
  const message = document.getElementById("updateProfileMessage");

  const cachedProfile = await getCachedData("profile");

  let profile =
    cachedProfile && typeof cachedProfile === "object"
      ? cachedProfile
      : {};

  if (usernameInput) {
    usernameInput.value = profile.username || "";
  }

  if (phoneInput) {
    phoneInput.value = profile.phone || "";
  }

  if (bankNameInput) {
    bankNameInput.value = profile.payout_bank_name || "";
  }

  if (accountNameInput) {
    accountNameInput.value = profile.payout_account_name || "";
  }

  if (accountNumberInput) {
    accountNumberInput.value = profile.payout_account_number || "";
  }

  if (message) {
    message.style.display = "none";
    message.textContent = "";
    message.className = "update-profile-status";
  }

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");

  loadProfileSquad();

  setTimeout(() => {
    usernameInput?.focus();
  }, 50);

  if (!getToken()) {
    return;
  }

  try {
    const latestProfile = await getUserProfile();

    profile = latestProfile || profile;
    
    if (usernameInput) {
      usernameInput.value = profile.username || "";
    }
    if (phoneInput) {
      phoneInput.value = profile.phone || "";
    }
    if (bankNameInput) {
      bankNameInput.value = profile.payout_bank_name || "";
    }
    if (accountNameInput) {
      accountNameInput.value = profile.payout_account_name || "";
    }
    if (accountNumberInput) {
      accountNumberInput.value = profile.payout_account_number || "";
    }
  } catch (error) {
    console.error("Failed to refresh profile:", error);
  }
}

function closeUpdateProfile() {
  const modal =
    document.getElementById(
      "updateProfileModal"
    );
  if (!modal) {
    return;
  }
  modal.style.display =
    "none";
  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}

async function saveUpdatedProfile() {
  const usernameInput = document.getElementById("updateProfileUsername");
  const phoneInput = document.getElementById("updateProfilePhone");
  const bankNameInput = document.getElementById("updateProfileBankName");
  const accountNameInput = document.getElementById("updateProfileAccountName");
  const accountNumberInput = document.getElementById("updateProfileAccountNumber");
  const saveButton = document.getElementById("saveProfileBtn");
  const message = document.getElementById("updateProfileMessage");

  if (
    !usernameInput ||
    !phoneInput ||
    !bankNameInput ||
    !accountNameInput ||
    !accountNumberInput ||
    !saveButton
  ) {
    return;
  }

  const username = usernameInput.value.trim();
  const phone = phoneInput.value.trim();
  const payoutBankName = bankNameInput.value.trim();
  const payoutAccountName = accountNameInput.value.trim();
  const payoutAccountNumber = accountNumberInput.value.trim();

  const cachedProfile = await getCachedData("profile");
  const currentProfile =
    cachedProfile && typeof cachedProfile === "object" ? cachedProfile : {};

  const currentUsername = String(currentProfile.username || "").trim();
  const currentPhone = String(currentProfile.phone || "").trim();
  const currentBankName = String(currentProfile.payout_bank_name || "").trim();
  const currentAccountName = String(currentProfile.payout_account_name || "").trim();
  const currentAccountNumber = String(currentProfile.payout_account_number || "").trim();

  function showProfileMessage(text, type = "error") {
    if (!message) {
      return;
    }

    message.textContent = text;
    message.className =
      type === "success"
        ? "update-profile-status update-profile-status-success"
        : "update-profile-status update-profile-status-error";
    message.style.display = "block";
  }

  if (!username) {
    showProfileMessage("Username is required.");
    usernameInput.focus();
    return;
  }

  if (payoutAccountNumber && !/^\d{10}$/.test(payoutAccountNumber)) {
    showProfileMessage("Bank account number must contain exactly 10 digits.");
    accountNumberInput.focus();
    return;
  }

  if (
    payoutBankName.length > 100 ||
    payoutAccountName.length > 100 ||
    payoutAccountNumber.length > 100
  ) {
    showProfileMessage("Bank details cannot exceed 100 characters.");
    return;
  }

  const updates = {};

  if (username !== currentUsername) {
    updates.username = username;
  }

  if (phone !== currentPhone) {
    updates.phone = phone;
  }

  if (payoutBankName !== currentBankName) {
    updates.payout_bank_name = payoutBankName;
  }

  if (payoutAccountName !== currentAccountName) {
    updates.payout_account_name = payoutAccountName;
  }

  if (payoutAccountNumber !== currentAccountNumber) {
    updates.payout_account_number = payoutAccountNumber;
  }

  if (!Object.keys(updates).length) {
    closeUpdateProfile();
    return;
  }

  const token = getToken();

  if (!token) {
    showProfileMessage("Please log in again.");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  if (message) {
    message.style.display = "none";
    message.textContent = "";
    message.className = "update-profile-status";
  }

  try {
    const res = await apiRequest(
      `${API}/profile`,
      {
        method: "PUT",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      },
      saveUpdatedProfile
    );

    if (!res) {
      return;
    }
    
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || "Failed to update profile.");
    }
    
    const profile = {
      ...currentProfile,
      ...updates,
      ...(result.profile || {})
    };
    
    await saveCachedData("profile", "", profile);
    renderUserProfile(profile);
    showProfileMessage("Profile updated successfully.", "success");
    
    setTimeout(() => {
      closeUpdateProfile();
    }, 700);

  } catch (error) {
    console.error("Failed to update profile:", error);
    showProfileMessage(error.message || "Failed to update profile.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save Changes";
  }
}

function renderUserProfile(profile) {
  const usernameElement = document.getElementById("profileUsername");
  const phoneElement = document.getElementById("profilePhone");
  const bankNameElement = document.getElementById("profileBankName");
  const accountNameElement = document.getElementById("profileBankAccountName");
  const accountNumberElement = document.getElementById("profileBankAccountNumber");
  const bankStatusElement = document.getElementById("profileBankStatus");
  const bankMessageElement = document.getElementById("profileBankMessage");
  const teamsElement = document.getElementById("profileTeams");
  const emptyElement = document.getElementById("profileTeamsEmpty");
  if (!usernameElement || !phoneElement || !teamsElement || !emptyElement) {
    return;
  }
  usernameElement.textContent = profile?.username || "Username";
  phoneElement.textContent = profile?.phone ?
    ` ${profile.phone}` :
    "WhatsApp number not added";
  const bankName = String(profile?.payout_bank_name || "").trim();
  const accountName = String(profile?.payout_account_name || "").trim();
  const accountNumber = String(profile?.payout_account_number || "").trim();
  if (bankNameElement) {
    bankNameElement.textContent = bankName || "Not added";
  }
  if (accountNameElement) {
    accountNameElement.textContent = accountName || "Not added";
  }
  if (accountNumberElement) {
    accountNumberElement.textContent = accountNumber ?
      `******${accountNumber.slice(-4)}` :
      "Not added";
  }
  const bankDetailsComplete = Boolean(
    bankName && accountName && /^\d{10}$/.test(accountNumber)
  );
  if (bankStatusElement) {
    bankStatusElement.textContent = bankDetailsComplete ?
      "Complete" :
      "Incomplete";
    bankStatusElement.classList.toggle(
      "complete",
      bankDetailsComplete
    );
    bankStatusElement.classList.toggle(
      "incomplete",
      !bankDetailsComplete
    );
  }
  if (bankMessageElement) {
    bankMessageElement.textContent = bankDetailsComplete ?
      "Your prize payout details are saved." :
      "Add your bank name, account name, and 10-digit account number to receive tournament prize payments.";
  }
  teamsElement.replaceChildren();
  const teams = Array.isArray(profile?.teams) ? profile.teams : [];
  if (!teams.length) {
    emptyElement.hidden = false;
    return;
  }
  emptyElement.hidden = true;
  teams.forEach(team => {
    const teamElement = document.createElement("div");
    teamElement.className = "profile-page-team-card";
    const logoContainer = document.createElement("div");
    logoContainer.className = "profile-page-team-logo";
    if (team.logo) {
      const image = document.createElement("img");
      image.src = team.logo;
      image.alt = "";
      image.loading = "lazy";
      logoContainer.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "profile-page-team-logo-placeholder";
      logoContainer.appendChild(placeholder);
    }
    const nameElement = document.createElement("div");
    nameElement.className = "profile-page-team-name";
    nameElement.textContent = team.name || "Unnamed Team";
    teamElement.append(logoContainer, nameElement);
    teamsElement.appendChild(teamElement);
  });
}

async function renderProfilePageSquad() {
  const container = document.getElementById(
    "profilePageSquadContent"
  );
  if (!container) return;
  container.className = "profile-page-squad-loading";
  container.textContent = "Loading squad information...";
  try {
    const result = await getMySquad();
    container.replaceChildren();
    container.className = "";
    if (!result?.success || !result.squad) {
      const empty = document.createElement("div");
      empty.className = "profile-page-squad-empty";
      empty.textContent = result?.message ||
        "You have not registered a squad yet.";
      container.appendChild(empty);
      return;
    }
    const squad = result.squad;
    const card = document.createElement("div");
    card.className = "profile-page-squad-card";
    const imageUrl =
      squad.image_url ||
      squad.logo_url ||
      squad.image ||
      squad.logo ||
      "";
    if (imageUrl) {
      const image = document.createElement("img");
      image.className = "profile-page-squad-image";
      image.src = imageUrl;
      image.alt = `${squad.name || "Registered"} squad`;
      image.loading = "lazy";
      image.onerror = () => image.remove();
      card.appendChild(image);
    }
    const info = document.createElement("div");
    info.className = "profile-page-squad-info";
    const name = document.createElement("h4");
    name.className = "profile-page-squad-name";
    name.textContent =
      squad.name ||
      squad.squad_name ||
      "Registered Squad";
    const status = document.createElement("span");
    status.className = "profile-page-squad-status";
    status.textContent =
      squad.status ||
      "Registered";
    const message = document.createElement("p");
    message.className = "profile-page-squad-message";
    message.textContent =
      "This is your currently registered squad.";
    info.append(name, status, message);
    card.appendChild(info);
    container.appendChild(card);
  } catch (error) {
    container.replaceChildren();
    container.className = "";
    const message = document.createElement("div");
    message.className = "profile-page-squad-empty";
    message.textContent =
      "Unable to load your squad. Please try again later.";
    container.appendChild(message);
    console.error(
      "Failed to render profile squad:",
      error
    );
  }
}

async function loadProfileSquad() {
  const status =
    document.getElementById(
      "profileSquadStatus"
    );
  const image =
    document.getElementById(
      "profileSquadImage"
    );
  const eligibility =
    document.getElementById(
      "profileSquadEligibility"
    );
  const uploadSection =
    document.getElementById(
      "profileSquadUploadSection"
    );
  const submitButton =
    document.getElementById(
      "profileSquadSubmitBtn"
    );
  if (
    !status ||
    !image ||
    !eligibility ||
    !uploadSection
  ) {
    return;
  }
  status.textContent =
    "Loading squad information...";
  image.style.display = "none";
  eligibility.textContent = "";
  uploadSection.style.display = "none";
  try {
    const result = await getMySquad();
    if (!result) {
      status.textContent =
        "Unable to load squad information. Please try again.";
      return;
    }
    const squad = result.squad;
    const pendingRequest =
      result.pendingRequest;
    const changeEligibility =
      result.eligibility;
    if (!squad) {
      status.textContent =
        "You have not registered a squad yet.";
      uploadSection.style.display =
        "block";
      if (submitButton) {
        submitButton.textContent =
          "Register Squad";
        submitButton.disabled = false;
      }
      return;
    }
    status.textContent =
      "Your squad is registered.";
    image.src = squad.image_url;
    image.style.display = "block";
    if (pendingRequest) {
      eligibility.textContent =
        "Your squad change request is awaiting admin review.";
      uploadSection.style.display =
        "none";
      return;
    }
    if (
      changeEligibility?.eligible
    ) {
      eligibility.textContent =
        "You are eligible to request a squad change.";
      uploadSection.style.display =
        "block";
      if (submitButton) {
        submitButton.textContent =
          "Request Squad Change";
        submitButton.disabled = false;
      }
      return;
    }
    if (
      changeEligibility?.reason ===
      "cooldown"
    ) {
      const nextDate =
        new Date(
          changeEligibility.nextEligibleAt
        ).toLocaleDateString();
      eligibility.textContent =
        `You can request a squad change from ${nextDate}.`;
      uploadSection.style.display =
        "none";
      return;
    }
    eligibility.textContent =
      "Squad change is currently unavailable.";
  } catch (error) {
    console.error(
      "Failed to load profile squad:",
      error
    );
    status.textContent =
      error.message ||
      "Failed to load squad information.";
  }
}

async function submitProfileSquad() {
  const input =
    document.getElementById(
      "profileSquadImageInput"
    );
  const button =
    document.getElementById(
      "profileSquadSubmitBtn"
    );
  if (!input || !button) {
    return;
  }
  const file =
    input.files?.[0];
  if (!file) {
    showAlert(
      "Please select a squad screenshot."
    );
    return;
  }
  if (!file.type.startsWith("image/")) {
    showAlert(
      "Please select a valid image."
    );
    return;
  }
  const maxSize =
    5 * 1024 * 1024;
  if (file.size > maxSize) {
    showAlert(
      "The image must not exceed 5 MB."
    );
    return;
  }
  button.disabled = true;
  button.textContent = "Uploading...";
  showLoader();
  try {
    const result =
      await getMySquad();
    if (!result) {
      throw new Error(
        "Unable to verify your registered squad."
      );
    }
    const image =
      await fileToBase64(file);
    let response;
    if (result.squad) {
      if (result.pendingRequest) {
        throw new Error(
          "You already have a pending squad change request."
        );
      }
      if (!result.eligibility?.eligible) {
        throw new Error(
          result.eligibility?.reason === "cooldown" ?
          "You are not yet eligible to change your squad." :
          "You cannot request a squad change right now."
        );
      }
      response =
        await requestSquadChange(image);
    } else {
      response =
        await registerSquad(image);
    }
    if (!response) {
      return;
    }
    input.value = "";
    showAlert(
      result.squad ?
      "Squad change request submitted for admin review." :
      "Your squad has been registered successfully."
    );
    await loadProfileSquad();
  } catch (error) {
    console.error(
      "Squad submission failed:",
      error
    );
    showAlert(
      error.message ||
      "Failed to submit your squad."
    );
  } finally {
    hideLoader();
    button.disabled = false;
    if (button.isConnected) {
      const squad =
        await getMySquad().catch(
          () => null
        );
      button.textContent =
        squad?.squad ?
        "Request Squad Change" :
        "Register Squad";
    }
  }
}
async function submitMatchResult(data) {
  const token = getToken();
  const res = await fetch(
    `${API}/tournaments/${data.tournamentId}/matches/${data.matchId}/submission`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        home_goals: data.homeGoals,
        away_goals: data.awayGoals,
        screenshot: data.screenshot,
        stats: data.stats
      })
    }
  );
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to submit result."
    );
  }
  return result;
}

async function sendMatchSubmission() {
  closeResultRecord();
  const tournament = getCurrentTournament();
  if (!tournament || !currentMatch) {
    return;
  }
  const homeGoals =
    Number(
      document.getElementById("homeGoals").value
    );
  const awayGoals =
    Number(
      document.getElementById("awayGoals").value
    );
  if (
    isNaN(homeGoals) ||
    isNaN(awayGoals)
  ) {
    openLeagueRecorder(currentMatch);
    return showAlert(
      "Enter both scores."
    );
  }
  const file =
    document
    .getElementById("matchScreenshot")
    .files[0];
  if (!file) {
    openLeagueRecorder(currentMatch);
    return showAlert(
      "Please upload a match screenshot."
    );
    
  }
  showLoader();
  try {
    const screenshot =
      await fileToBase64(file);
    let stats = null;
    try {
      stats =
        await extractMatchStats(file);
    } catch (err) {
      console.error(
        "Statistics detection failed:",
        err
      );
    }
    const hasStats =
      stats &&
      stats.possession &&
      stats.shots &&
      stats.shotsOnTarget;
    hideLoader();
    if (hasStats) {
      const confirmationMessage =
        "Detected Match Statistics:\n\n" +
        "Possession: " +
        stats.possession +
        "\n" +
        "Shots: " +
        stats.shots +
        "\n" +
        "Shots on Target: " +
        stats.shotsOnTarget +
        "\n\n" +
        "Are these statistics correct?";
      const confirmed =
        await showConfirmModal(
          confirmationMessage,
          "Yes, Submit",
          "Cancel"
        );
      if (!confirmed) {
        openLeagueRecorder(currentMatch);
        return;
      }
    } else {
      const submitWithoutStats =
        await showConfirmModal(
          "Match statistics could not be detected.\n\nDo you want to submit the result without statistics?",
          "Yes, Submit",
          "Cancel"
        );
      if (!submitWithoutStats) {
        openLeagueRecorder(currentMatch);
        return;
      }
      stats = null;
    }
    showLoader();
    const submissionData = {
      tournamentId: tournament.id,
      matchId: currentMatch.id,
      homeGoals,
      awayGoals,
      screenshot,
      stats
    };
    await submitMatchResult(
      submissionData
    );
    const matchIndex =
      fixtures.findIndex(
        match =>
        String(match.id) ===
        String(currentMatch.id)
      );
    if (matchIndex !== -1) {
      fixtures[matchIndex] = {
        ...fixtures[matchIndex],
        submission_status: "pending"
      };
    }
    currentMatch = {
      ...currentMatch,
      submission_status: "pending"
    };
    closeResultRecord();
    
    if (
      tournament.type === "cup" ||
      tournament.format === "cup"
    ) {
      await renderCupFixtures();
      await renderCupTables();
      
      if (
        typeof renderFullBracket ===
        "function"
      ) {
        await renderFullBracket();
      }
    } else {
      await renderFixtures();
    }
    
    showActionModal(
      "Result submitted for admin approval.",
      "success"
    );
  } catch (err) {
    console.error(
      "Match submission error:",
      err
    );
    showAlert(
      err.message
    );
  } finally {
    hideLoader();
  }
}

function waitForOpenCV() {
  return new Promise(resolve => {
    if (
      typeof cv !== "undefined" &&
      cv.Mat
    ) {
      resolve();
      return;
    }
    
    const check =
      setInterval(() => {
        if (
          typeof cv !== "undefined" &&
          cv.Mat
        ) {
          clearInterval(check);
          resolve();
        }
      }, 100);
  });
}

async function extractMatchStats(file) {
  const image = new Image();
  image.src = URL.createObjectURL(file);
  
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  
  const minDimension = 1600;
  const scale = Math.max(1, minDimension / Math.min(image.width, image.height));
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(image.src);
  
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Gentle contrast stretch: dark text gets darker, yellow background stays bright
    const contrastVal = luminance < 140 ? Math.max(0, luminance - 40) : Math.min(255, luminance + 30);
    data[i] = contrastVal;
    data[i + 1] = contrastVal;
    data[i + 2] = contrastVal;
  }
  ctx.putImageData(imgData, 0, 0);
  
  
  const result = await Tesseract.recognize(canvas, "eng", {
    logger: () => {},
    tessedit_pageseg_mode: 6
  });
  
  const lines = result.data.lines || [];
  const stats = { possession: null, shots: null, shotsOnTarget: null };
  
  const targets = [
    { key: "possession", regex: /poss(?:ession)?/i },
    { key: "shotsOnTarget", regex: /shots?\s*(?:on|0n|in)?\s*target|shotson|target/i },
    { key: "shots", regex: /(?:^|\s)shots?(?:\s|$)|total\s*shots?/i }
  ];
  
  for (const line of lines) {
    const lineText = (line.text || "").trim();
    if (!lineText) continue;
    
    for (const target of targets) {
      if (stats[target.key] !== null) continue;
      
      if (target.regex.test(lineText)) {
        // Collect all words on this specific line that contain numbers
        const numericWords = [];
        
        for (const word of line.words || []) {
          const digitsOnly = String(word.text || "").replace(/[^0-9]/g, "");
          if (digitsOnly && word.bbox) {
            numericWords.push({
              value: Number(digitsOnly),
              x: (word.bbox.x0 + word.bbox.x1) / 2
            });
          }
        }
        
         numericWords.sort((a, b) => a.x - b.x);
        
        if (numericWords.length >= 2) {
          const home = numericWords[0].value;
          const away = numericWords[numericWords.length - 1].value;
          stats[target.key] = [home, away];
        }
      }
    }
  }
  
  
  if (stats.possession) {
    let [home, away] = stats.possession;
    if (home >= 0 && away >= 0 && home <= 100 && away <= 100) {
      if (home + away !== 100) {
        away = 100 - home;
        stats.possession = [home, away];
      }
    } else {
      stats.possession = null;
    }
  }
  
  if (stats.shots && stats.shotsOnTarget) {
    if (stats.shotsOnTarget[0] > stats.shots[0]) stats.shotsOnTarget[0] = stats.shots[0];
    if (stats.shotsOnTarget[1] > stats.shots[1]) stats.shotsOnTarget[1] = stats.shots[1];
  }
  
  return stats;
}


async function loadGlobalRankings() {
  if (globalRankings !== null) {
    return globalRankings;
  }
  
  const token = getToken();
  
  if (!token) {
    throw new Error("Authentication required.");
  }
  
  showLoader();
  
  try {
    const res = await apiRequest(
      `${API}/rankings/global`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      () => loadGlobalRankings()
    );
    
    if (!res) {
      return [];
    }
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(
        result.message ||
        "Failed to load global rankings."
      );
    }
    
    globalRankings = result.rankings || [];
    
    return globalRankings;
  } finally {
    hideLoader();
  }
}

async function showGlobalRankings() {
  goBackHome();
  document
    .querySelectorAll(
      "#mySection, #noticeSection, #publicSection, #hallOfFameSection"
    )
    .forEach(section => {
      section.style.display = "none";
    });
  
  const rankingsSection =
    document.getElementById(
      "globalRankingsSection"
    );
  
  if (!rankingsSection) {
    return;
  }
  
  rankingsSection.style.display = "block";
  
  const list =
    document.getElementById(
      "globalRankingsList"
    );
  
  if (list) {
    list.innerHTML =
      "<p>Loading rankings...</p>";
  }
  
  try {
    const rankings =
      await loadGlobalRankings();
    
    renderGlobalRankings(rankings);
    
  } catch (error) {
    console.error(
      "Failed to load global rankings:",
      error
    );
    
    if (list) {
      list.innerHTML =
        "<p>Failed to load rankings.</p>";
    }
  }
}

function closeGlobalRankings() {
  const rankingsSection =
    document.getElementById(
      "globalRankingsSection"
    );
  
  if (rankingsSection) {
    rankingsSection.style.display = "none";
  }
  
  const mySection =
    document.getElementById("mySection");
  const noticeSection =
    document.getElementById("noticeSection");
  
  if (mySection) {
    mySection.style.display = "block";
  }
  
  if (noticeSection) {
    noticeSection.style.display = "block";
  }
  
}


function renderGlobalRankings(rankings) {
  const list =
    document.getElementById(
      "globalRankingsList"
    );
  if (!list) return;
  if (!rankings.length) {
    list.innerHTML =
      "<p>No rankings available yet.</p>";
    return;
  }
  const currentUser =
    getCurrentUser();
  const currentUserId =
    String(
      currentUser?.id ||
      currentUser?.user_id ||
      ""
    );
  list.innerHTML =
    rankings
    .map((player, index) => {
      const position = index + 1;
      const isCurrentUser =
        currentUserId !== "" &&
        String(player.id) === currentUserId;
      let positionDisplay;
      if (position === 1) {
        positionDisplay = "🥇";
      } else if (position === 2) {
        positionDisplay = "🥈";
      } else if (position === 3) {
        positionDisplay = "🥉";
      } else {
        positionDisplay = position;
      }
      const played =
        Number(player.played) || 0;
      const wins =
        Number(player.wins) || 0;
      const draws =
        Number(player.draws) || 0;
      const losses =
        Number(player.losses) || 0;
      const goalsFor =
        Number(player.goals_for) || 0;
      const goalsAgainst =
        Number(player.goals_against) || 0;
      const goalDifference =
        Number(player.goal_difference) || 0;
      const winPercentage =
        Number(player.win_percentage) || 0;
      const trophiesWon =
        Number(player.trophies_won) || 0;
      const currentRating =
        Number(player.rating ?? 1500);
      const highestRating =
        Number(player.highest_rating) || 0;
      const highestRank =
        Number(player.highest_rank) || 0;
      return `
        <div class="global-ranking-row ${
          isCurrentUser
            ? "current-ranking-user"
            : ""
        }">
          <div class="ranking-position">
            ${positionDisplay}
          </div>
          <div class="ranking-player">
            <div class="ranking-player-name">
              ${escapeHtml(
                player.username ||
                "Unknown Player"
              )}
              ${
                isCurrentUser
                  ? '<span class="you-badge">YOU</span>'
                  : ""
              }
            </div>
            <div class="ranking-stats ${
              isCurrentUser
                ? "current-ranking-stats"
                : ""
            }">
              <span>Played: ${played}</span>
              <span>W: ${wins}</span>
              <span>D: ${draws}</span>
              <span>L: ${losses}</span>
              <span>GF: ${goalsFor}</span>
              <span>GA: ${goalsAgainst}</span>
              <span>GD: ${
                goalDifference > 0
                  ? "+" + goalDifference
                  : goalDifference
              }</span>
              <span>Win: ${winPercentage}%</span>
              <span>Best Rating: ${
                highestRating || "N/A"
              }</span>
              <span>Best Rank: ${
                highestRank > 0
                  ? "#" + highestRank
                  : "N/A"
              }</span>
            </div>
          </div>
          <div class="ranking-rating">
            ${currentRating}
          </div>
          ${
            trophiesWon > 0
              ? `
                <div class="ranking-trophies" title="Championship trophies won">
                  🏆 ${trophiesWon} ${
                    trophiesWon === 1
                      ? "Trophy Won"
                      : "Trophies Won"
                  }
                </div>
              `
              : ""
          }
        </div>
      `;
    })
    .join("");
}
async function getMySquad() {
  const token = getToken();
  const res = await apiRequest(
    `${API}/squad`,
    {
      headers: {
        Authorization: token
      }
    },
    () => getMySquad()
  );
  if (!res) return null;
  const result = await res.json();
  if (res.status === 404) {
    return {
      success: true,
      squad: null,
      message: "You have not registered a squad yet."
    };
  }
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load your registered squad."
    );
  }
  return result;
}
async function registerSquad(image) {
  const token = getToken();
  const res = await apiRequest(
    `${API}/squad`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        image
      })
    },
    () => registerSquad(image)
  );
  if (!res) return null;
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to register your squad."
    );
  }
  return result.squad;
}
async function requestSquadChange(image) {
  const token = getToken();
  const res = await apiRequest(
    `${API}/squad/change-requests`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        image
      })
    },
    () => requestSquadChange(image)
  );
  if (!res) return null;
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to submit squad change request."
    );
  }
  return result.request;
}
async function getAdminSquadChangeRequests() {
  const token = getToken();
  const res = await apiRequest(
    `${API}/admin/squad-change-requests`,
    {
      headers: {
        Authorization: token
      }
    },
    () => getAdminSquadChangeRequests()
  );
  if (!res) return null;
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load squad change requests."
    );
  }
  return result.requests || [];
}
async function reviewSquadChangeRequest(
  requestId,
  decision,
  rejectionReason = null
) {
  const token = getToken();
  const res = await apiRequest(
    `${API}/admin/squad-change-requests/${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        decision,
        rejection_reason: rejectionReason
      })
    },
    () => reviewSquadChangeRequest(
      requestId,
      decision,
      rejectionReason
    )
  );
  if (!res) return null;
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to review squad change request."
    );
  }
  return result;
}
async function getUserSquad(userId) {
  const token = getToken();
  const res = await apiRequest(
    `${API}/users/${encodeURIComponent(userId)}/squad`,
    {
      headers: {
        Authorization: token
      }
    },
    () => getUserSquad(userId)
  );
  if (!res) return null;
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to load player's squad."
    );
  }
  return result.squad;
}

async function getTournamentTeamSquad(
  tournamentId,
  teamId
) {
  const token = getToken();
  
  if (!token) {
    throw new Error("You are not logged in.");
  }
  
  const res = await apiRequest(
    `${API}/tournaments/${encodeURIComponent(tournamentId)}/teams/${encodeURIComponent(teamId)}/squad`,
    {
      method: "GET",
      headers: {
        Authorization: token
      }
    },
    () => getTournamentTeamSquad(
      tournamentId,
      teamId
    )
  );
  
  if (!res) {
    throw new Error("No response from server.");
  }
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    if (res.status === 404) {
      return null;
    }
    
    throw new Error(
      result.message ||
      "Failed to load the registered squad."
    );
  }
  
  return result.squad;
}

async function deductTournamentPlayerPoints(
  tournamentId,
  userId,
  teamId,
  points,
  reason
) {
  const token = getToken();
  if (!token) {
    throw new Error("Invalid session.");
  }
  if (!tournamentId) {
    throw new Error("Invalid tournament.");
  }
  if (!userId || !teamId) {
    throw new Error("Select a valid tournament player.");
  }
  if (
    !Number.isSafeInteger(Number(points)) ||
    Number(points) <= 0
  ) {
    throw new Error(
      "Points deduction must be a positive whole number."
    );
  }
  if (
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    throw new Error(
      "A reason for the deduction is required."
    );
  }
  const response = await apiRequest(
    `${API}/tournaments/${encodeURIComponent(tournamentId)}/disciplinary-actions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        user_id: userId,
        team_id: teamId,
        points: Number(points),
        reason: reason.trim()
      })
    },
    deductTournamentPlayerPoints
  );
  if (!response) {
    return null;
  }
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
      "Failed to deduct tournament points."
    );
  }
  return data;
}
async function reverseTournamentPlayerDeduction(
  tournamentId,
  actionId,
  reversalReason
) {
  const token = getToken();
  if (!token) {
    throw new Error("Invalid session.");
  }
  if (!tournamentId || !actionId) {
    throw new Error(
      "Invalid tournament or disciplinary action."
    );
  }
  if (
    typeof reversalReason !== "string" ||
    !reversalReason.trim()
  ) {
    throw new Error(
      "A reason for reversing the deduction is required."
    );
  }
  const response = await apiRequest(
    `${API}/tournaments/${encodeURIComponent(tournamentId)}/disciplinary-actions/${encodeURIComponent(actionId)}/reverse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        reversal_reason: reversalReason.trim()
      })
    },
    reverseTournamentPlayerDeduction
  );
  if (!response) {
    return null;
  }
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
      "Failed to reverse disciplinary action."
    );
  }
  return data;
}

function openDisciplinaryModal() {
  const modal = document.getElementById(
    "disciplinaryModal"
  );
  const tournament = getCurrentTournament();
  if (!modal) {
    showAlert("Disciplinary modal was not found.");
    return;
  }
  if (!tournament || !tournament.id) {
    showAlert("Select a tournament first.");
    return;
  }
  const players = Array.isArray(
      tournament.tournament_players
    ) ?
    tournament.tournament_players : [];
  document.getElementById(
    "disciplinaryTournamentName"
  ).textContent = tournament.name || "Tournament";
  document.getElementById(
      "disciplinaryPlayerCount"
    ).textContent =
    `${players.length} registered player${players.length === 1 ? "" : "s"}`;
  const select = document.getElementById(
    "disciplinaryPlayer"
  );
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = players.length ?
    "Choose a tournament player" :
    "No registered players found";
  select.appendChild(placeholder);
  players.forEach(player => {
    const option = document.createElement("option");
    option.value = JSON.stringify({
      user_id: player.user_id,
      team_id: player.team_id
    });
    option.textContent =
      `${player.team_name || "Unnamed team"} — ${Number(player.points) || 0} points`;
    option.disabled = !player.user_id || !player.team_id;
    select.appendChild(option);
  });
  document.getElementById(
    "disciplinaryForm"
  ).reset();
  document.getElementById(
    "disciplinarySelectedPlayer"
  ).style.display = "none";
  document.getElementById(
    "disciplinarySummary"
  ).style.display = "none";
  document.getElementById(
    "disciplinaryPointsPreview"
  ).textContent = "Select a player to preview the deduction.";
  hideDisciplinaryError();
  disciplinarySubmitting = false;
  const submitButton = document.getElementById(
    "disciplinarySubmitBtn"
  );
  submitButton.disabled = players.length === 0;
  submitButton.textContent = "Apply Deduction";
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDisciplinaryModal() {
  if (disciplinarySubmitting) {
    return;
  }
  const modal = document.getElementById(
    "disciplinaryModal"
  );
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }
  document.body.style.overflow = "";
}

function getDisciplinarySelectedPlayer() {
  const select = document.getElementById(
    "disciplinaryPlayer"
  );
  if (!select.value) {
    return null;
  }
  try {
    return JSON.parse(select.value);
  } catch {
    return null;
  }
}

function showDisciplinaryError(message) {
  const error = document.getElementById(
    "disciplinaryError"
  );
  error.textContent = message;
  error.style.display = "block";
}

function hideDisciplinaryError() {
  const error = document.getElementById(
    "disciplinaryError"
  );
  error.textContent = "";
  error.style.display = "none";
}

function updateDisciplinaryPlayerPreview() {
  const tournament = getCurrentTournament();
  const selected = getDisciplinarySelectedPlayer();
  const playerCard = document.getElementById(
    "disciplinarySelectedPlayer"
  );
  const summary = document.getElementById(
    "disciplinarySummary"
  );
  const preview = document.getElementById(
    "disciplinaryPointsPreview"
  );
  if (!selected || !tournament) {
    playerCard.style.display = "none";
    summary.style.display = "none";
    preview.textContent =
      "Select a player to preview the deduction.";
    return;
  }
  const players = Array.isArray(
      tournament.tournament_players
    ) ?
    tournament.tournament_players : [];
  const player = players.find(item =>
    String(item.user_id) === String(selected.user_id) &&
    String(item.team_id) === String(selected.team_id)
  );
  if (!player) {
    playerCard.style.display = "none";
    summary.style.display = "none";
    preview.textContent = "Player not found in this tournament.";
    return;
  }
  const currentPoints = Number(player.points) || 0;
  document.getElementById(
    "disciplinarySelectedPlayerName"
  ).textContent = player.team_name || "Unnamed team";
  document.getElementById(
      "disciplinarySelectedPlayerTeam"
    ).textContent =
    player.has_point_deduction ?
    "Has an active point deduction" :
    "No active point deductions";
  document.getElementById(
      "disciplinaryPlayerAvatar"
    ).textContent =
    (player.team_name || "P").trim().charAt(0).toUpperCase();
  document.getElementById(
    "disciplinaryCurrentPoints"
  ).textContent = currentPoints;
  playerCard.style.display = "flex";
  const pointsInput = document.getElementById(
    "disciplinaryPoints"
  );
  const points = Number(pointsInput.value);
  if (
    pointsInput.value &&
    Number.isSafeInteger(points) &&
    points > 0
  ) {
    const pointsAfter = currentPoints - points;
    document.getElementById(
      "disciplinaryPointsAfter"
    ).textContent = pointsAfter;
    summary.style.display = "flex";
    preview.textContent =
      pointsAfter < 0 ?
      "Warning: this deduction will make the player's points negative." :
      `The player will lose ${points} point${points === 1 ? "" : "s"}.`;
  } else {
    summary.style.display = "none";
    preview.textContent =
      `Current points: ${currentPoints}. Enter a positive whole number.`;
  }
}

async function submitDisciplinaryDeduction(event) {
  event.preventDefault();
  if (disciplinarySubmitting) {
    return;
  }
  hideDisciplinaryError();
  const tournament = getCurrentTournament();
  const selected = getDisciplinarySelectedPlayer();
  const pointsInput = document.getElementById(
    "disciplinaryPoints"
  );
  const reasonInput = document.getElementById(
    "disciplinaryReason"
  );
  const points = Number(pointsInput.value);
  const reason = reasonInput.value.trim();
  if (!tournament || !tournament.id) {
    showDisciplinaryError("Select a valid tournament.");
    return;
  }
  if (
    !selected ||
    !selected.user_id ||
    !selected.team_id
  ) {
    showDisciplinaryError(
      "Select a valid tournament player."
    );
    return;
  }
  if (
    !Number.isSafeInteger(points) ||
    points <= 0
  ) {
    showDisciplinaryError(
      "Enter a positive whole number of points to deduct."
    );
    pointsInput.focus();
    return;
  }
  if (!reason) {
    showDisciplinaryError(
      "Enter a reason for the deduction."
    );
    reasonInput.focus();
    return;
  }
  disciplinarySubmitting = true;
  const submitButton = document.getElementById(
    "disciplinarySubmitBtn"
  );
  submitButton.disabled = true;
  submitButton.textContent = "Confirming...";
  const disciplinaryModal = document.getElementById(
    "disciplinaryModal"
  );
  disciplinaryModal.style.display = "none";
  disciplinaryModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  try {
    const confirmed = await showConfirmModal(
      `Are you sure you want to deduct ${points} point${points === 1 ? "" : "s"} from ${document.getElementById("disciplinarySelectedPlayerName").textContent}? This deduction will affect the tournament standings.`,
      "Apply Deduction",
      "Cancel"
    );
    if (!confirmed) {
      disciplinaryModal.style.display = "flex";
      disciplinaryModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      return;
    }
    submitButton.textContent = "Applying...";
    const result = await deductTournamentPlayerPoints(
      tournament.id,
      selected.user_id,
      selected.team_id,
      points,
      reason
    );
    if (!result) {
      disciplinaryModal.style.display = "flex";
      disciplinaryModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      return;
    }
    disciplinaryModal.style.display = "none";
    disciplinaryModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    showActionModal(
      result.message || "Points deducted successfully.",
      "success"
    );
    window.dispatchEvent(
      new CustomEvent("tournamentDisciplinaryAction", {
        detail: {
          tournamentId: tournament.id,
          userId: selected.user_id,
          teamId: selected.team_id,
          action: result.action
        }
      })
    );
  } catch (error) {
    disciplinaryModal.style.display = "flex";
    disciplinaryModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    showDisciplinaryError(
      error.message || "Failed to apply the deduction."
    );
  } finally {
    disciplinarySubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "Apply Deduction";
  }
}
document.getElementById(
  "disciplinaryPlayer"
).addEventListener(
  "change",
  updateDisciplinaryPlayerPreview
);
document.getElementById(
  "disciplinaryPoints"
).addEventListener(
  "input",
  updateDisciplinaryPlayerPreview
);
document.getElementById(
  "disciplinaryForm"
).addEventListener(
  "submit",
  submitDisciplinaryDeduction
);

async function getTournamentDisciplinaryActions(
  tournamentId
) {
  const token = getToken();
  
  if (!token) {
    throw new Error("Invalid session.");
  }
  
  if (!tournamentId) {
    throw new Error("Invalid tournament.");
  }
  
  const response = await apiRequest(
    `${API}/tournaments/${encodeURIComponent(tournamentId)}/disciplinary-actions`,
    {
      method: "GET",
      headers: {
        Authorization: token
      }
    },
    getTournamentDisciplinaryActions
  );
  
  if (!response) {
    return null;
  }
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
      "Failed to load disciplinary actions."
    );
  }
  
  return data.actions || [];
}

async function showDisciplinaryReversalSection() {
  const section = document.getElementById(
    "disciplinaryActionsSection"
  );
  
  if (!section) return;
  
  section.style.display = "flex";
  
  await loadDisciplinaryActions();
}
async function loadDisciplinaryActions() {
  const container = document.getElementById(
    "disciplinaryActionsList"
  );
  
  if (!container) return;
  
  container.innerHTML = `
    <div class="disciplinary-empty-state">
      Loading disciplinary records...
    </div>
  `;
  
  try {
    const tournament = getCurrentTournament();
    
    if (!tournament?.id) {
      throw new Error("No tournament selected.");
    }
    
    const actions =
      await getTournamentDisciplinaryActions(
        tournament.id
      );
    
    if (actions === null) return;
    
    renderDisciplinaryActions(actions);
  } catch (error) {
    container.innerHTML = `
      <div class="disciplinary-empty-state">
        ${escapeHtml(
          error.message ||
          "Failed to load disciplinary records."
        )}
      </div>
    `;
  }
}
function formatDisciplinaryDate(timestamp) {
  if (
    timestamp === null ||
    timestamp === undefined ||
    timestamp === ""
  ) {
    return "—";
  }
  
  const value = Number(timestamp);
  
  if (!Number.isFinite(value)) {
    return "—";
  }
  
  const date = new Date(value);
  
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function renderDisciplinaryActions(actions) {
  const container = document.getElementById(
    "disciplinaryActionsList"
  );
  if (!container) return;
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  if (!actions || actions.length === 0) {
    container.innerHTML = `
      <div class="disciplinary-empty-state">
        No disciplinary history available.
      </div>
    `;
    return;
  }
  const formatDate = timestamp => {
    if (
      timestamp === null ||
      timestamp === undefined ||
      timestamp === ""
    ) {
      return "Not available";
    }
    const value = Number(timestamp);
    if (!Number.isFinite(value)) {
      return "Not available";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  };
  container.innerHTML = actions.map(action => {
    const playerName = escapeHtml(
      action.username || "Unknown Player"
    );
    const teamName = escapeHtml(
      action.team_name || "Unknown Team"
    );
    const reason = escapeHtml(
      action.reason || "No reason provided"
    );
    const points = Number(action.points_deducted) || 0;
    const currentPoints =
      action.current_points != null ?
      Number(action.current_points) :
      null;
    const status = action.status || "unknown";
    const isReversed = status === "reversed";
    const isActive = status === "active";
    const statusLabel = isReversed ?
      "Reversed" :
      isActive ?
      "Active" :
      status.charAt(0).toUpperCase() + status.slice(1);
    const statusClass = isReversed ?
      "reversed" :
      isActive ?
      "active" :
      "unknown";
    const issuedDate = formatDate(action.issued_at);
    const reversedDate = formatDate(action.reversed_at);
    const issuedBy = escapeHtml(
      action.issued_by_username || "Unknown administrator"
    );
    const reversedBy = escapeHtml(
      action.reversed_by_username || "Not applicable"
    );
    const reversalReason = escapeHtml(
      action.reversal_reason || "No reversal reason provided"
    );
    const actionId = escapeHtml(action.id || "");
    const hasCurrentPoints =
      currentPoints !== null &&
      Number.isFinite(currentPoints);
    return `
      <div class="disciplinary-action-card ${statusClass}">
        <div class="disciplinary-action-top">
          <div class="disciplinary-player-info">
            <h3 class="disciplinary-player-name">
              ${playerName}
            </h3>
            <div class="disciplinary-team-name">
              ${teamName}
            </div>
          </div>
          <div class="disciplinary-action-badges">
            <span class="disciplinary-points-badge">
              -${points} ${points === 1 ? "Point" : "Points"}
            </span>
            <span class="disciplinary-status-badge ${statusClass}">
              ${escapeHtml(statusLabel)}
            </span>
          </div>
        </div>
        <div class="disciplinary-action-details">
          <div class="disciplinary-detail-row">
            <span class="disciplinary-detail-label">
              Reason
            </span>
            <span class="disciplinary-detail-value">
              ${reason}
            </span>
          </div>
          <div class="disciplinary-detail-row">
            <span class="disciplinary-detail-label">
              Issued by
            </span>
            <span class="disciplinary-detail-value">
              ${issuedBy}
            </span>
          </div>
          <div class="disciplinary-detail-row">
            <span class="disciplinary-detail-label">
              Date issued
            </span>
            <span class="disciplinary-detail-value">
              ${escapeHtml(issuedDate)}
            </span>
          </div>
          <div class="disciplinary-detail-row">
            <span class="disciplinary-detail-label">
              Current points
            </span>
            <span class="disciplinary-detail-value">
              ${
                hasCurrentPoints
                  ? escapeHtml(String(currentPoints))
                  : "Unavailable"
              }
            </span>
          </div>
          ${
            isReversed
              ? `
                <div class="disciplinary-reversal-details">
                  <div class="disciplinary-detail-row">
                    <span class="disciplinary-detail-label">
                      Reversed by
                    </span>
                    <span class="disciplinary-detail-value">
                      ${reversedBy}
                    </span>
                  </div>
                  <div class="disciplinary-detail-row">
                    <span class="disciplinary-detail-label">
                      Date reversed
                    </span>
                    <span class="disciplinary-detail-value">
                      ${escapeHtml(reversedDate)}
                    </span>
                  </div>
                  <div class="disciplinary-detail-row">
                    <span class="disciplinary-detail-label">
                      Reversal reason
                    </span>
                    <span class="disciplinary-detail-value">
                      ${reversalReason}
                    </span>
                  </div>
                </div>
              `
              : ""
          }
        </div>
        ${
          isAdmin && isActive
            ? `
              <button
                type="button"
                class="disciplinary-reverse-btn"
                data-action-id="${actionId}"
              >
                Reverse Deduction
              </button>
            `
            : ""
        }
      </div>
    `;
  }).join("");
  container
    .querySelectorAll(".disciplinary-reverse-btn")
    .forEach(button => {
      button.addEventListener("click", async () => {
        await reverseDisciplinaryAction(
          button.dataset.actionId
        );
      });
    });
}


async function reverseDisciplinaryAction(actionId) {
  if (disciplinaryReversalSubmitting) {
    return;
  }
  const currentUser = getCurrentUser();
  if (currentUser?.role !== "admin") {
    showActionModal(
      "Only an administrator can reverse a deduction.",
      "error"
    );
    return;
  }
  if (!actionId) {
    showActionModal(
      "The disciplinary action ID is missing.",
      "error"
    );
    return;
  }
  const form = document.getElementById(
    "disciplinaryReversalForm"
  );
  const actionInput = document.getElementById(
    "disciplinaryReversalActionId"
  );
  const reasonInput = document.getElementById(
    "disciplinaryReversalReason"
  );
  const section = document.getElementById(
    "disciplinaryActionsSection"
  );
  if (!form || !actionInput || !reasonInput || !section) {
    showActionModal(
      "The disciplinary reversal form could not be found.",
      "error"
    );
    return;
  }
  actionInput.value = actionId;
  reasonInput.value = "";
  form.style.display = "block";
  form.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
  reasonInput.focus();
}

document.getElementById(
  "disciplinaryReversalReasonForm"
)?.addEventListener("submit", async function(event) {
  event.preventDefault();
  if (disciplinaryReversalSubmitting) {
    return;
  }
  const reasonInput = document.getElementById(
    "disciplinaryReversalReason"
  );
  const actionInput = document.getElementById(
    "disciplinaryReversalActionId"
  );
  const submitButton = document.getElementById(
    "submitDisciplinaryReversal"
  );
  const form = document.getElementById(
    "disciplinaryReversalForm"
  );
  const reversalReason = reasonInput.value.trim();
  const actionId = actionInput.value;
  if (!actionId) {
    showActionModal(
      "Select a disciplinary action to reverse.",
      "error"
    );
    return;
  }
  if (!reversalReason) {
    reasonInput.focus();
    showActionModal(
      "Enter a reason for reversing this deduction.",
      "error"
    );
    return;
  }
  const tournament = getCurrentTournament();
  if (!tournament?.id) {
    showActionModal(
      "No tournament is currently selected.",
      "error"
    );
    return;
  }
  disciplinaryReversalSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "Reversing...";
  try {
    const result = await reverseTournamentPlayerDeduction(
      tournament.id,
      actionId,
      reversalReason
    );
    if (!result) {
      throw new Error(
        "No response was received. Please check your connection and try again."
      );
    }
    form.style.display = "none";
    window.dispatchEvent(
      new CustomEvent("tournamentDisciplinaryAction", {
        detail: {
          tournamentId: tournament.id,
          action: "reversed",
          actionId
        }
      })
    );
    showActionModal(
      "The deduction has been reversed successfully.",
      "success"
    );
    await loadDisciplinaryActions();
  } catch (error) {
    showActionModal(
      error.message ||
      "Failed to reverse the disciplinary deduction.",
      "error"
    );
  } finally {
    disciplinaryReversalSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "Confirm Reversal";
  }
});
document.getElementById(
  "cancelDisciplinaryReversal"
)?.addEventListener("click", function() {
  const form = document.getElementById(
    "disciplinaryReversalForm"
  );
  const reasonInput = document.getElementById(
    "disciplinaryReversalReason"
  );
  const actionInput = document.getElementById(
    "disciplinaryReversalActionId"
  );
  if (form) {
    form.style.display = "none";
  }
  if (reasonInput) {
    reasonInput.value = "";
  }
  if (actionInput) {
    actionInput.value = "";
  }
});
document.getElementById(
  "closeDisciplinaryActions"
)?.addEventListener("click", function() {
  const section = document.getElementById(
    "disciplinaryActionsSection"
  );
  
  const form = document.getElementById(
    "disciplinaryReversalForm"
  );
  
  if (section) {
    section.style.display = "none";
  }
  
  if (form) {
    form.style.display = "none";
  }
});


async function getHeadToHeadComparison(
  player1Id,
  player2Id
) {
  if (!player1Id || !player2Id) {
    throw new Error(
      "Select two players to compare."
    );
  }
  
  if (player1Id === player2Id) {
    throw new Error(
      "Select two different players."
    );
  }
  
  const params = new URLSearchParams({
    player1_id: player1Id,
    player2_id: player2Id
  });
  
  const res = await apiRequest(
    `${API}/players/head-to-head?${params.toString()}`,
    {
      headers: {
        Authorization: getToken()
      }
    },
    () => getHeadToHeadComparison(
      player1Id,
      player2Id
    )
  );
  
  if (!res) return null;
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message ||
      "Failed to compare players."
    );
  }
  
  return result;
}


function openPlayerComparison() {
  const rankingsSection = document.getElementById(
    "globalRankingsSection"
  );
  
  const comparisonSection = document.getElementById(
    "playerComparisonSection"
  );
  
  if (!comparisonSection) {
    return;
  }
  
  if (rankingsSection) {
    rankingsSection.style.display = "none";
  }
  
  document
    .querySelectorAll(
      "#mySection, #noticeSection, #publicSection, #hallOfFameSection"
    )
    .forEach(section => {
      section.style.display = "none";
    });
  
  comparisonSection.style.display = "block";
  
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function backToGlobalRankings() {
  const comparisonSection = document.getElementById(
    "playerComparisonSection"
  );
  
  const rankingsSection = document.getElementById(
    "globalRankingsSection"
  );
  
  if (comparisonSection) {
    comparisonSection.style.display = "none";
  }
  
  if (rankingsSection) {
    rankingsSection.style.display = "block";
  }
  
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const openButton = document.getElementById(
    "openPlayerComparisonButton"
  );
  
  const backButton = document.getElementById(
    "backToRankingsButton"
  );
  
  if (openButton) {
    openButton.addEventListener(
      "click",
      openPlayerComparison
    );
  }
  
  if (backButton) {
    backButton.addEventListener(
      "click",
      backToGlobalRankings
    );
  }
});


let comparisonSelectedPlayer1 = null;
let comparisonSelectedPlayer2 = null;
const comparisonSearchTimers = {};
const comparisonSearchRequests = {};
const comparisonSearchResults = {};
async function searchComparisonPlayers(query) {
  const searchQuery = String(query || "").trim();
  if (searchQuery.length < 2) {
    return [];
  }
  const params = new URLSearchParams({
    q: searchQuery
  });
  const response = await apiRequest(
    `${API}/players/search?${params.toString()}`,
    {
      headers: {
        Authorization: getToken()
      }
    },
    () => searchComparisonPlayers(searchQuery)
  );
  if (!response) {
    return [];
  }
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Failed to search players."
    );
  }
  return Array.isArray(result.players)
    ? result.players
    : [];
}

function renderComparisonPlayerSuggestions(
  players,
  playerNumber
) {
  const suggestions = document.getElementById(
    `comparisonPlayer${playerNumber}Suggestions`
  );
  if (!suggestions) return;
  comparisonSearchResults[playerNumber] = players;
  if (!players.length) {
    suggestions.innerHTML = `
      <div class="player-search-empty">
        No players found.
      </div>
    `;
    suggestions.style.display = "block";
    return;
  }
  suggestions.innerHTML = players.map(player => `
    <button
      type="button"
      class="player-search-suggestion"
      data-player-id="${comparisonSearchEscapeHtml(player.id)}"
    >
      <span class="player-search-suggestion-name">
        ${comparisonSearchEscapeHtml(player.username)}
      </span>
      <span class="player-search-suggestion-rating">
        Rating: ${Number(player.rating ?? 0).toLocaleString()}
      </span>
    </button>
  `).join("");
  suggestions.style.display = "block";
  suggestions.querySelectorAll(
    ".player-search-suggestion"
  ).forEach(button => {
    button.addEventListener("click", () => {
      const player = players.find(
        item => String(item.id) === button.dataset.playerId
      );
      if (player) {
        selectComparisonPlayer(player, playerNumber);
      }
    });
  });
}
function selectComparisonPlayer(player, playerNumber) {
  const otherPlayer = playerNumber === 1
    ? comparisonSelectedPlayer2
    : comparisonSelectedPlayer1;
  if (
    otherPlayer &&
    String(otherPlayer.id) === String(player.id)
  ) {
    showComparisonSearchMessage(
      "Please select two different players."
    );
    return;
  }
  if (playerNumber === 1) {
    comparisonSelectedPlayer1 = player;
  } else {
    comparisonSelectedPlayer2 = player;
  }
  const input = document.getElementById(
    `comparisonPlayer${playerNumber}Search`
  );
  const suggestions = document.getElementById(
    `comparisonPlayer${playerNumber}Suggestions`
  );
  const selected = document.getElementById(
    `comparisonPlayer${playerNumber}Selected`
  );
  if (input) {
    input.value = player.username;
  }
  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  }
  if (selected) {
    selected.innerHTML = `
      <div class="comparison-selected-player has-player">
        <span>
          ${comparisonSearchEscapeHtml(player.username)}
        </span>
        <span>
          Rating: ${Number(player.rating ?? 0).toLocaleString()}
        </span>
        <button
          type="button"
          class="comparison-remove-player"
          aria-label="Remove selected player"
        >
          ×
        </button>
      </div>
    `;
    selected.querySelector(
      ".comparison-remove-player"
    )?.addEventListener("click", () => {
      clearComparisonSearchSelection(playerNumber);
    });
  }
  updateComparisonSearchButton();
  clearComparisonSearchMessage();
}
function clearComparisonSearchSelection(playerNumber) {
  if (playerNumber === 1) {
    comparisonSelectedPlayer1 = null;
  } else {
    comparisonSelectedPlayer2 = null;
  }
  const input = document.getElementById(
    `comparisonPlayer${playerNumber}Search`
  );
  const selected = document.getElementById(
    `comparisonPlayer${playerNumber}Selected`
  );
  const suggestions = document.getElementById(
    `comparisonPlayer${playerNumber}Suggestions`
  );
  if (input) {
    input.value = "";
    input.focus();
  }
  if (selected) {
    selected.textContent = "No player selected";
  }
  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  }
  updateComparisonSearchButton();
}
function updateComparisonSearchButton() {
  const button = document.getElementById(
    "comparePlayersButton"
  );
  if (!button) return;
  button.disabled = !(
    comparisonSelectedPlayer1 &&
    comparisonSelectedPlayer2 &&
    String(comparisonSelectedPlayer1.id) !==
      String(comparisonSelectedPlayer2.id)
  );
}
function showComparisonSearchMessage(message) {
  const element = document.getElementById(
    "playerComparisonMessage"
  );
  if (!element) return;
  element.textContent = message;
  element.style.display = "block";
}
function clearComparisonSearchMessage() {
  const element = document.getElementById(
    "playerComparisonMessage"
  );
  if (!element) return;
  element.textContent = "";
  element.style.display = "none";
}
function setupComparisonPlayerSearch(playerNumber) {
  const input = document.getElementById(
    `comparisonPlayer${playerNumber}Search`
  );
  const suggestions = document.getElementById(
    `comparisonPlayer${playerNumber}Suggestions`
  );
  if (!input || input.dataset.searchInitialized === "true") {
    return;
  }
  input.dataset.searchInitialized = "true";
  input.addEventListener("input", () => {
    const query = input.value.trim();
    clearTimeout(comparisonSearchTimers[playerNumber]);
    comparisonSearchRequests[playerNumber] =
      (comparisonSearchRequests[playerNumber] || 0) + 1;
    const requestNumber =
      comparisonSearchRequests[playerNumber];
    if (playerNumber === 1) {
      comparisonSelectedPlayer1 = null;
    } else {
      comparisonSelectedPlayer2 = null;
    }
    const selected = document.getElementById(
      `comparisonPlayer${playerNumber}Selected`
    );
    if (selected) {
      selected.textContent = "No player selected";
    }
    updateComparisonSearchButton();
    clearComparisonSearchMessage();
    if (!suggestions) return;
    if (query.length < 2) {
      suggestions.innerHTML = "";
      suggestions.style.display = "none";
      return;
    }
    suggestions.innerHTML = `
      <div class="player-search-empty">
        Searching players...
      </div>
    `;
    suggestions.style.display = "block";
    comparisonSearchTimers[playerNumber] = setTimeout(
      async () => {
        try {
          const players = await searchComparisonPlayers(query);
          if (
            requestNumber !==
              comparisonSearchRequests[playerNumber] ||
            input.value.trim() !== query
          ) {
            return;
          }
          renderComparisonPlayerSuggestions(
            players,
            playerNumber
          );
        } catch (error) {
          if (
            requestNumber !==
              comparisonSearchRequests[playerNumber]
          ) {
            return;
          }
          suggestions.innerHTML = `
            <div class="player-search-empty">
              ${comparisonSearchEscapeHtml(
                error.message || "Unable to search players."
              )}
            </div>
          `;
          suggestions.style.display = "block";
        }
      },
      300
    );
  });
  input.addEventListener("focus", () => {
    const query = input.value.trim();
    if (
      query.length >= 2 &&
      comparisonSearchResults[playerNumber]
    ) {
      renderComparisonPlayerSuggestions(
        comparisonSearchResults[playerNumber],
        playerNumber
      );
    }
  });
  document.addEventListener("click", event => {
    if (
      !input.contains(event.target) &&
      !suggestions?.contains(event.target)
    ) {
      if (suggestions) {
        suggestions.style.display = "none";
      }
    }
  });
}
function initializeComparisonPlayerSearch() {
  setupComparisonPlayerSearch(1);
  setupComparisonPlayerSearch(2);
  updateComparisonSearchButton();
}
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeComparisonPlayerSearch
  );
} else {
  initializeComparisonPlayerSearch();
}


async function compareSelectedPlayers() {
  const button = document.getElementById(
    "comparePlayersButton"
  );
  const results = document.getElementById(
    "playerComparisonResults"
  );
  if (
    !comparisonSelectedPlayer1 ||
    !comparisonSelectedPlayer2
  ) {
    showComparisonSearchMessage(
      "Search for and select two players first."
    );
    return;
  }
  if (
    String(comparisonSelectedPlayer1.id) ===
    String(comparisonSelectedPlayer2.id)
  ) {
    showComparisonSearchMessage(
      "Please select two different players."
    );
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = "Comparing...";
  }
  clearComparisonSearchMessage();
  if (results) {
    results.innerHTML = "";
    results.style.display = "none";
  }
  try {
    const params = new URLSearchParams({
      player1_id: comparisonSelectedPlayer1.id,
      player2_id: comparisonSelectedPlayer2.id
    });
    const response = await apiRequest(
      `${API}/players/head-to-head?${params.toString()}`,
      {
        headers: {
          Authorization: getToken()
        }
      },
      () => compareSelectedPlayers()
    );
    if (!response) {
      throw new Error(
        "Unable to connect to the server."
      );
    }
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Failed to compare players."
      );
    }
    renderPlayerComparisonResults(data);
  } catch (error) {
    showComparisonSearchMessage(
      error.message || "Failed to compare players."
    );
  } finally {
    if (button) {
      button.textContent = "Compare Players";
      updateComparisonSearchButton();
    }
  }
}
function comparisonResultsNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? number.toLocaleString()
    : "0";
}
function comparisonResultsPercentage(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? `${number.toFixed(1)}%`
    : "0.0%";
}
function renderComparisonCareerStats(stats = {}) {
  const items = [
    ["Matches Played", stats.played],
    ["Wins", stats.wins],
    ["Draws", stats.draws],
    ["Losses", stats.losses],
    ["Goals Scored", stats.goals_scored],
    ["Goals Conceded", stats.goals_conceded],
    ["Goal Difference", stats.goal_difference],
    ["Win Rate", comparisonResultsPercentage(stats.win_percentage)]
  ];
  return `
    <div class="comparison-stat-grid">
      ${items.map(([label, value]) => `
        <div class="comparison-stat-item">
          <span class="comparison-stat-label">
            ${comparisonResultsEscape(label)}
          </span>
          <span class="comparison-stat-value">
            ${comparisonResultsEscape(
              value ?? 0
            )}
          </span>
        </div>
      `).join("")}
    </div>
  `;
}
function renderComparisonPlayerResultCard(player, label) {
  const stats = player.career_stats || {};
  return `
    <div class="comparison-player-card">
      <div class="comparison-results-heading">
        ${comparisonResultsEscape(label)}
      </div>
      <h3>
        ${comparisonResultsEscape(player.username)}
      </h3>
      <div class="comparison-player-rating">
        ${comparisonResultsNumber(player.rating)}
        <span>Current Rating</span>
      </div>
      <div class="comparison-stat-grid">
        <div class="comparison-stat-item">
          <span class="comparison-stat-label">
            Highest Rating
          </span>
          <span class="comparison-stat-value">
            ${comparisonResultsNumber(player.highest_rating)}
          </span>
        </div>
        <div class="comparison-stat-item">
          <span class="comparison-stat-label">
            Highest Rank
          </span>
          <span class="comparison-stat-value">
            ${
              player.highest_rank == null ||
              Number(player.highest_rank) === 0
                ? "N/A"
                : `#${comparisonResultsNumber(player.highest_rank)}`
            }
          </span>
        </div>
        <div class="comparison-stat-item">
          <span class="comparison-stat-label">
            Trophies Won
          </span>
          <span class="comparison-stat-value">
            ${comparisonResultsNumber(player.trophies_won)}
          </span>
        </div>
      </div>
      <h4>Career Statistics</h4>
      ${renderComparisonCareerStats(stats)}
    </div>
  `;
}
function comparisonResultsDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
function renderComparisonRecentMatches(
  matches,
  player1,
  player2
) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return `
      <div class="comparison-no-matches">
        No head-to-head matches found between these players.
      </div>
    `;
  }
  return `
    <div class="comparison-matches-list">
      ${matches.map(match => {
        const homeId = String(
          match.home_player_id ?? ""
        );
        const awayId = String(
          match.away_player_id ?? ""
        );
        let resultLabel = "Draw";
        let resultClass = "draw";
        if (
          Number(match.home_score) >
          Number(match.away_score)
        ) {
          resultLabel =
            homeId === String(player1.id)
              ? `${player1.username} won`
              : `${player2.username} won`;
          resultClass =
            homeId === String(player1.id)
              ? "win"
              : "loss";
        } else if (
          Number(match.away_score) >
          Number(match.home_score)
        ) {
          resultLabel =
            awayId === String(player1.id)
              ? `${player1.username} won`
              : `${player2.username} won`;
          resultClass =
            awayId === String(player1.id)
              ? "win"
              : "loss";
        }
        return `
          <div class="comparison-match-card">
            <div class="comparison-match-tournament">
              ${comparisonResultsEscape(
                match.tournament_name || "Tournament"
              )}
            </div>
            <div class="comparison-match-score">
              <span class="comparison-match-player">
                ${comparisonResultsEscape(
                  match.home_player_name || "Player 1"
                )}
              </span>
              <strong>
                ${comparisonResultsNumber(match.home_score)}
                -
                ${comparisonResultsNumber(match.away_score)}
              </strong>
              <span class="comparison-match-player">
                ${comparisonResultsEscape(
                  match.away_player_name || "Player 2"
                )}
              </span>
            </div>
            <div class="comparison-match-result ${resultClass}">
              ${comparisonResultsEscape(resultLabel)}
            </div>
            <div class="comparison-match-date">
              ${comparisonResultsEscape(
                comparisonResultsDate(match.played_at)
              )}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
function renderPlayerComparisonResults(data) {
  const results = document.getElementById(
    "playerComparisonResults"
  );
  if (!results) {
    throw new Error(
      "Player comparison results container was not found."
    );
  }
  const player1 = data.players?.player1;
  const player2 = data.players?.player2;
  const headToHead = data.head_to_head || {};
  if (!player1 || !player2) {
    throw new Error(
      "The server did not return both players."
    );
  }
  results.innerHTML = `
    <div class="comparison-results-heading">
      Player Comparison
    </div>
    <div class="comparison-player-cards">
      ${renderComparisonPlayerResultCard(
        player1,
        "Player 1"
      )}
      ${renderComparisonPlayerResultCard(
        player2,
        "Player 2"
      )}
    </div>
    <h3 class="comparison-results-heading">
      Head-to-Head Record
    </h3>
    <div class="comparison-h2h-summary">
      <div class="comparison-h2h-item">
        <span>
          ${comparisonResultsEscape(player1.username)} Wins
        </span>
        <strong>
          ${comparisonResultsNumber(headToHead.player1_wins)}
        </strong>
      </div>
      <div class="comparison-h2h-item">
        <span>Draws</span>
        <strong>
          ${comparisonResultsNumber(headToHead.draws)}
        </strong>
      </div>
      <div class="comparison-h2h-item">
        <span>
          ${comparisonResultsEscape(player2.username)} Wins
        </span>
        <strong>
          ${comparisonResultsNumber(headToHead.player2_wins)}
        </strong>
      </div>
      <div class="comparison-h2h-item">
        <span>Total Matches</span>
        <strong>
          ${comparisonResultsNumber(headToHead.total_matches)}
        </strong>
      </div>
    </div>
    <div class="comparison-results-heading">
      Recent Head-to-Head Matches
    </div>
    ${renderComparisonRecentMatches(
      data.recent_matches,
      player1,
      player2
    )}
  `;
  results.style.display = "block";
  results.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
function initializeComparePlayersButton() {
  const button = document.getElementById(
    "comparePlayersButton"
  );
  if (
    !button ||
    button.dataset.compareInitialized === "true"
  ) {
    return;
  }
  button.addEventListener(
    "click",
    compareSelectedPlayers
  );
  button.dataset.compareInitialized = "true";
  updateComparisonSearchButton();
}
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeComparePlayersButton
  );
} else {
  initializeComparePlayersButton();
}



function showSeasonKeyInputModal() {
  if (getCurrentUser()?.role !== "admin") {
    showAlert("Only administrators can end a season.");
    return;
  }
  const modal = document.getElementById("seasonKeyModal");
  const input = document.getElementById("seasonKeyInput");
  if (!modal || !input) {
    showAlert("Season input modal could not be found.");
    return;
  }
  input.value = "";
  modal.style.display = "flex";
  setTimeout(() => input.focus(), 100);
}
function closeSeasonKeyInputModal() {
  const modal = document.getElementById("seasonKeyModal");
  if (modal) {
    modal.style.display = "none";
  }
}
function submitSeasonKey() {
  const input = document.getElementById("seasonKeyInput");
  const button = document.getElementById("submitSeasonKeyBtn");
  if (!input) {
    showAlert("Season input field could not be found.");
    return;
  }
  const seasonKey = input.value.trim();
  if (!seasonKey) {
    showAlert("Please enter a season key.");
    input.focus();
    return;
  }
  if (seasonKey.length > 100) {
    showAlert("The season key cannot exceed 100 characters.");
    input.focus();
    return;
  }
  if (button?.disabled) {
    return;
  }
  closeSeasonKeyInputModal();
  showConfirmModal(
    `End season "${seasonKey}"?\n\n` +
    "This action will:\n" +
    "• Save players' highest ratings.\n" +
    "• Update their highest career ranks where appropriate.\n" +
    "• Reset all users' current ratings to 1500.\n\n" +
    "Only proceed when the season is ready to end.",
    "End Season",
    "Cancel"
  );
  confirmYes = () => {
    closeConfirmModal();
    sendEndSeasonRequest(seasonKey);
  };
  confirmNo = () => {
    closeConfirmModal();
  };
}
async function sendEndSeasonRequest(seasonKey) {
  if (getCurrentUser()?.role !== "admin") {
    showAlert("Only administrators can end a season.");
    return;
  }
  const button = document.getElementById("endSeasonRatingsBtn");
  if (button?.disabled) {
    return;
  }
  const token = getToken();
  if (!token) {
    showAlert("Please log in again to continue.");
    return;
  }
  const originalText = button?.textContent;
  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Ending Season...";
    }
    const res = await apiRequest(
      `${API}/admin/ratings/end-season`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          seasonKey: seasonKey
        })
      },
      () => sendEndSeasonRequest(seasonKey)
    );
    if (!res) {
      return;
    }
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(
        result.message || "Failed to end the season."
      );
    }
    showAlert(
      `${result.message}\n\n` +
      `Season: ${result.seasonKey}\n` +
      `Initial rating: ${result.initialRating}\n` +
      `Users updated: ${result.usersUpdated ?? "N/A"}\n` +
      `Ratings reset: ${result.ratingsReset ? "Yes" : "No"}`
    );
  } catch (error) {
    console.error("End season ratings error:", error);
    showAlert(
      error.message || "Failed to process season ending."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText || "End Season";
    }
  }
}



function updateChampionsLeagueSetupOptions(teamCount) {
  const directSelect =
    document.getElementById("directQualifiers");

  const opponentsSelect =
    document.getElementById("opponentsPerTeam");

  const playoffEndSelect =
    document.getElementById("playoffEndPosition");

  const startInput =
    document.getElementById("playoffStartPosition");

  if (
    !directSelect ||
    !opponentsSelect ||
    !playoffEndSelect ||
    !startInput
  ) {
    return;
  }

  const count = Math.max(
    0,
    Math.min(30, Math.floor(Number(teamCount) || 0))
  );

  const previousDirect = directSelect.value;
  const previousOpponents = opponentsSelect.value;
  const previousEnd = playoffEndSelect.value;

  directSelect.innerHTML =
    "Select direct qualifiers";

  for (let i = 1; i <= 20; i++) {
    const option = new Option(
      `${i} team${i === 1 ? "" : "s"}`,
      String(i)
    );

    option.disabled = i >= count;
    directSelect.add(option);
  }

  directSelect.value =
    previousDirect &&
    Number(previousDirect) < count
      ? previousDirect
      : "";

  opponentsSelect.innerHTML = "";

  if (count >= 2) {
    for (let i = 1; i < count; i++) {
      opponentsSelect.add(
        new Option(
          `${i} round${i === 1 ? "" : "s"}`,
          String(i)
        )
      );
    }
  } else {
    opponentsSelect.add(
      new Option("No teams available", "")
    );
  }

  opponentsSelect.value =
    previousOpponents &&
    Number(previousOpponents) < count
      ? previousOpponents
      : count >= 2
      ? String(Math.min(3, count - 1))
      : "";

  playoffEndSelect.innerHTML =
    "Select playoff ending position";

  for (let i = 2; i <= count; i++) {
    playoffEndSelect.add(
      new Option(`Position ${i}`, String(i))
    );
  }

  playoffEndSelect.value = previousEnd;

  updateChampionsLeaguePlayoffPositions();
}

function updateChampionsLeaguePlayoffPositions() {
  const directSelect =
    document.getElementById("directQualifiers");

  const startInput =
    document.getElementById("playoffStartPosition");

  const endSelect =
    document.getElementById("playoffEndPosition");

  if (!directSelect || !startInput || !endSelect) {
    return;
  }

  const directQualifiers =
    Number(directSelect.value);

  const teamCount =
    endSelect.options.length - 1;

  startInput.value =
    directQualifiers > 0
      ? directQualifiers + 1
      : "";

  for (const option of endSelect.options) {
    if (!option.value) continue;

    const position = Number(option.value);
    const playoffTeamCount =
      position - directQualifiers;
    const knockoutSize =
      directQualifiers +
      playoffTeamCount / 2;
    const validKnockoutSize =
      [2, 4, 8, 16, 32].includes(knockoutSize);
    
    option.disabled =
      !directQualifiers ||
      position > teamCount ||
      playoffTeamCount < 2 ||
      playoffTeamCount % 2 !== 0 ||
      !validKnockoutSize;
  }

  if (
    endSelect.selectedOptions[0]?.disabled
  ) {
    endSelect.value = "";
  }
}





async function registerForSeason(tournamentId) {
  if (!tournamentId || loading) return;
  const season = seasons.find(
    item => String(item.tournament_id) === String(tournamentId)
  );
  if (!season) {
    showMessage("This season is no longer available.", "error");
    return;
  }
  showConfirmModal(
    `Register for ${season.competition_name || "this competition"}?\n\n` +
    `Registration fee: ${formatMoney(season.registration_fee)}\n` +
    `Admin fee: ${formatMoney(season.admin_fee)}\n` +
    `Total: ${formatMoney(season.total_amount)}\n\n` +
    "You will be redirected to Flutterwave to complete payment.",
    "Continue to Payment",
    "Cancel"
  );
  confirmYes = async () => {
    closeConfirmModal();
    if (loading) return;
    loading = true;
    clearMessage();
    renderSeasonRegistration();
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Please log in to register for a season.");
      }
      const res = await apiRequest(
        `${API}/season-registrations/pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token
          },
          body: JSON.stringify({
            tournament_id: tournamentId
          })
        },
        () => registerForSeason(tournamentId)
      );
      if (!res) return;
      const response = await res.json();
      if (!res.ok || !response.success || !response.checkout_url) {
        throw new Error(
          response.message || "Unable to initialize payment."
        );
      }
      window.location.href = response.checkout_url;
    } catch (error) {
      console.error("Season registration payment error:", error);
      showMessage(
        error.message || "Unable to start payment. Please try again.",
        "error"
      );
    } finally {
      loading = false;
      renderSeasonRegistration();
    }
  };
  confirmNo = () => {
    closeConfirmModal();
  };
}

async function verifyPayment(reference, showResultAlert = false) {
  if (!reference) {
    if (showResultAlert) {
      showAlert("Payment reference is missing.");
    } else {
      showAlert("Payment reference is missing.", "error");
    }
    return;
  }
  if (loading) return;
  loading = true;
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Please log in to verify your payment.");
    }
    const res = await apiRequest(
      `${API}/season-registrations/verify?reference=${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: token
        }
      },
      () => verifyPayment(reference, showResultAlert)
    );
    if (!res) return;
    const response = await res.json();
    if (!res.ok || !response.success) {
      throw new Error(
        response.message || "Payment verification failed."
      );
    }
    
    loading = false;
await loadSeasonRegistrationData();
loading = true;

if (showResultAlert) {
      showAlert(
        "Payment verified successfully. Your season registration is confirmed."
      );
    } else {
      showMessage(
        "Payment verified successfully. Your season registration is confirmed.",
        "success"
      );
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    const message =
      error.message ||
      "We couldn't confirm your payment yet. Check your registrations again.";
    if (showResultAlert) {
      showAlert(message);
    } else {
      showMessage(message, "error");
    }
  } finally {
    loading = false;
    renderSeasonRegistration();
  }
}
function handlePaymentReturn() {
  const url = new URL(window.location.href);
  const status = url.searchParams.get("status");
  const reference =
    url.searchParams.get("tx_ref") ||
    url.searchParams.get("reference");
  if (!url.searchParams.has("status") &&
    !url.searchParams.has("tx_ref") &&
    !url.searchParams.has("reference") &&
    !url.searchParams.has("transaction_id")) {
    return false;
  }
  url.searchParams.delete("status");
  url.searchParams.delete("tx_ref");
  url.searchParams.delete("reference");
  url.searchParams.delete("transaction_id");
  window.history.replaceState({}, "", url);
  if (status === "cancelled") {
    showAlert("Payment was cancelled. You can try registering again.");
    return true;
  }
  if (status === "failed") {
    showAlert("Payment failed. Please try again.");
    return true;
  }
  if (!reference) {
    showAlert(
      "You have returned from payment, but the payment reference is missing. Check your registrations to confirm your payment."
    );
    return true;
  }
  verifyPayment(reference, true);
  return true;
}
function formatMoney(amount) {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function bindSeasonRegistrationEvents() {
  const page = document.getElementById("seasonRegistrationApp");
  if (!page) return;
  
  const backButton = document.getElementById("srBack");
  const refreshButton = document.getElementById("srRefresh");
  const list = document.getElementById("srList");
  
  if (backButton) {
    backButton.onclick = closeSeasonRegistration;
  }
  
  if (refreshButton) {
    refreshButton.onclick = loadSeasonRegistrationData;
  }
  
  page.querySelectorAll("[data-view]").forEach(button => {
    button.onclick = () => {
      currentView = button.dataset.view;
      renderSeasonRegistration();
      bindSeasonRegistrationEvents();
    };
  });
  
  if (list) {
    list.onclick = event => {
      const button = event.target.closest("[data-register-season]");
      
      if (!button || button.disabled) return;
      
      const tournamentId = button.dataset.registerSeason;
      
      console.log("Register button clicked:", tournamentId);
      
      registerForSeason(tournamentId);
    };
  }
}

let currentView = "available";
let seasons = [];
let registrations = [];
let loading = false;
let seasonRegistrationError = "";

async function loadSeasonRegistrationData() {
  if (loading) return;
  loading = true;
  seasonRegistrationError = "";
  renderSeasonRegistration();
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Please log in to view season registrations.");
    }
    const [seasonsResponse, registrationsResponse] = await Promise.all([
      apiRequest(
        `${API}/season-registrations/available`,
        {
          method: "GET",
          headers: {
            Authorization: token
          }
        },
        () => loadSeasonRegistrationData()
      ),
      apiRequest(
        `${API}/season-registrations/my`,
        {
          method: "GET",
          headers: {
            Authorization: token
          }
        },
        () => loadSeasonRegistrationData()
      )
    ]);
    if (!seasonsResponse || !registrationsResponse) return;
    const [seasonsResult, registrationsResult] = await Promise.all([
      seasonsResponse.json(),
      registrationsResponse.json()
    ]);
    if (!seasonsResponse.ok || !seasonsResult.success) {
      throw new Error(
        seasonsResult.message || "Unable to load available seasons."
      );
    }
    if (!registrationsResponse.ok || !registrationsResult.success) {
      throw new Error(
        registrationsResult.message || "Unable to load your registrations."
      );
    }
    seasons = Array.isArray(seasonsResult.seasons) ?
      seasonsResult.seasons :
      [];
    registrations = Array.isArray(registrationsResult.registrations) ?
      registrationsResult.registrations :
      [];
  } catch (error) {
    console.error("Season registration error:", error);
    seasonRegistrationError =
      error.message || "Unable to load season registration data.";
  } finally {
    loading = false;
    renderSeasonRegistration();
  }
}
function renderSeasonRegistration() {
  const root = document.getElementById("seasonRegistrationApp");
  
  if (!root) return;
  
  const availableCount = document.getElementById("srAvailableCount");
  const registrationCount = document.getElementById("srRegistrationCount");
  const sectionTitle = document.getElementById("srSectionTitle");
  const sectionDescription = document.getElementById("srSectionDescription");
  const message = document.getElementById("srMessage");
  const list = document.getElementById("srList");
  
  if (availableCount) {
    availableCount.textContent = seasons.length;
  }
  
  if (registrationCount) {
    registrationCount.textContent = registrations.length;
  }
  
  root.querySelectorAll("[data-view]").forEach(button => {
    const active = button.dataset.view === currentView;
    
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  
  if (sectionTitle) {
    sectionTitle.textContent =
      currentView === "available" ?
      "Open for registration" :
      "My Registrations";
  }
  
  if (sectionDescription) {
    sectionDescription.textContent =
      currentView === "available" ?
      "Choose a competition to get started." :
      "Track your season registrations and payments.";
  }
  
  if (message) {
    message.textContent = seasonRegistrationError;
    message.hidden = !seasonRegistrationError;
    message.className = seasonRegistrationError ?
      "sr-message error" :
      "sr-message";
  }
  
  if (!list) return;
  
  if (loading) {
    list.innerHTML = `
      <div class="sr-empty">
        <p>Loading season registrations...</p>
      </div>
    `;
    return;
  }
  
  if (seasonRegistrationError) {
    list.innerHTML = `
      <div class="sr-empty">
        <h3>Unable to load registrations</h3>
        <p>${escapeHtml(seasonRegistrationError)}</p>
        <button type="button" id="srRetry">Try Again</button>
      </div>
    `;
    
    document.getElementById("srRetry").onclick =
      loadSeasonRegistrationData;
    
    return;
  }
  
  if (currentView === "available") {
    renderAvailableSeasons(list);
  } else {
    renderMySeasonRegistrations(list);
  }
}
function renderAvailableSeasons(list) {
  if (!seasons.length) {
    list.innerHTML = `
      <div class="sr-empty">
        <h3>No seasons available</h3>
        <p>There are currently no seasons open for registration.</p>
      </div>
    `;
    return;
  }
  list.innerHTML = seasons.map(season => {
    const registered = registrations.some(registration =>
      String(registration.tournament_id) === String(season.tournament_id) &&
      registration.payment_status === "paid"
    );
    const deadline = season.registration_deadline
      ? new Date(Number(season.registration_deadline)).toLocaleDateString(
          "en-NG",
          { day: "numeric", month: "short", year: "numeric" }
        )
      : "No deadline";
    return `
      <article class="sr-season-card">
        <div class="sr-season-info">
          <p class="sr-competition-name">${escapeHtml(season.competition_name || "")}</p>
          <p>Season: ${escapeHtml(season.season ?? "N/A")}</p>
          <p>${escapeHtml(String(season.available_spaces ?? 0))} spaces remaining</p>
          <p>Registration deadline: ${escapeHtml(deadline)}</p>
        </div>
        <div class="sr-fees">
          <div>
            <span>Registration fee</span>
            <strong>${formatMoney(season.registration_fee)}</strong>
          </div>
          <div>
            <span>Admin fee</span>
            <strong>${formatMoney(season.admin_fee)}</strong>
          </div>
          <div class="sr-total">
            <span>Total</span>
            <strong>${formatMoney(season.total_amount)}</strong>
          </div>
        </div>
        ${registered ? `
          <div class="sr-registered-badge">
            <span>✓</span>
            Already Registered · Payment Confirmed
          </div>
        ` : `
          <button
            type="button"
            class="sr-register-btn"
            data-register-season="${escapeHtml(season.tournament_id)}"
            ${loading ? "disabled" : ""}
          >
            Register & Pay
          </button>
        `}
      </article>
    `;
  }).join("");
}

function renderMySeasonRegistrations(list) {
  if (!registrations.length) {
    list.innerHTML = `
      <div class="sr-empty">
        <h3>No registrations yet</h3>
        <p>Your season registrations will appear here.</p>
        <button type="button" data-view="available">Explore Seasons</button>
      </div>
    `;
    bindSeasonRegistrationEvents();
    return;
  }
  list.innerHTML = registrations.map(registration => {
    const status = String(registration.payment_status || "pending")
      .toLowerCase();
    const statusLabels = {
      paid: "Paid",
      pending: "Payment Pending",
      submitted: "Submitted",
      rejected: "Rejected"
    };
    return `
      <article class="sr-season-card">
        <div class="sr-season-info">
          <p class="sr-competition-name">${escapeHtml(registration.competition_name || "")}</p>
              <p>Season: ${escapeHtml(registration.season ?? "N/A")}</p>
          <p>Reference: ${escapeHtml(registration.payment_reference || "Not available")}</p>
        </div>
        <div class="sr-fees">
          <div>
            <span>Registration fee</span>
            <strong>${formatMoney(registration.league_entry_fee)}</strong>
          </div>
          <div>
            <span>Admin fee</span>
            <strong>${formatMoney(registration.admin_fee)}</strong>
          </div>
          <div class="sr-total">
            <span>Total</span>
            <strong>${formatMoney(registration.total_amount)}</strong>
          </div>
        </div>
        <span class="sr-status sr-status-${escapeHtml(status)}">
          ${escapeHtml(statusLabels[status] || status)}
        </span>
        ${
          status !== "paid"
            ? `<button
                type="button"
                class="sr-register-btn"
                data-register-season="${escapeHtml(registration.tournament_id)}"
              >Try Registration Again</button>`
            : ""
        }
      </article>
    `;
  }).join("");
  bindSeasonRegistrationEvents();
}

function openSeasonRegistration() {
  const page = document.getElementById("seasonRegistrationApp");
  
  if (!page) {
    console.error("Season Registration page not found.");
    return;
  }
  
  page.hidden = false;
  currentView = "available";
  
  bindSeasonRegistrationEvents();
  renderSeasonRegistration();
  
  loadSeasonRegistrationData();
}
function closeSeasonRegistration() {
  const page = document.getElementById("seasonRegistrationApp");
  
  if (page) {
    page.hidden = true;
  }
  
  if (typeof window.showHomepage === "function") {
    window.showHomepage();
  } else {
    history.back();
  }
}

function clearMessage() {
  const message = document.getElementById("srMessage");
  if (!message) return;
  message.textContent = "";
  message.hidden = true;
  message.className = "sr-message";
}





function formatPaymentMoney(amount) {
  return "₦" + (Number(amount) || 0).toLocaleString("en-NG");
}
function formatPaymentDate(timestamp) {
  if (!timestamp) return "Date unavailable";
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }
  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
function getPaymentStatusClass(status) {
  const allowed = [
    "paid",
    "pending",
    "submitted",
    "rejected",
    "refunded"
  ];
  return allowed.includes(String(status).toLowerCase())
    ? String(status).toLowerCase()
    : "unknown";
}
function renderPaymentStat(label, value) {
  return `
    <div class="payment-history-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}
function renderPaymentHistoryItem(registration) {
  const status = String(
    registration.payment_status || "unknown"
  ).toLowerCase();
  const username = registration.username || "Player";
  const amount = formatPaymentMoney(registration.total_amount);
  const date = formatPaymentDate(registration.created_at);
  return `
    <div class="payment-history-item">
      <div>
        <div class="payment-history-player">
          ${escapeHtml(username)}
        </div>
        <div class="payment-history-date">
          ${escapeHtml(date)}
        </div>
        <span class="payment-history-status ${getPaymentStatusClass(status)}">
          ${escapeHtml(status)}
        </span>
      </div>
      <div class="payment-history-amount">
        ${escapeHtml(amount)}
      </div>
    </div>
  `;
}
function renderTournamentPaymentHistory(tournament) {
  const registrations = tournament.registrations || [];
  const summary = tournament.summary || {};
  return `
    <div class="payment-history-group">
      <div class="payment-history-group-header">
        <h3>${escapeHtml(tournament.tournament_name || "Tournament")}</h3>
        <p>Season: ${escapeHtml(String(tournament.season ?? "N/A"))}</p>
      </div>
      <div class="payment-history-group-summary">
        <div>
          Registrations
          <strong>${Number(summary.total_registrations) || 0}</strong>
        </div>
        <div>
          Payments received
          <strong>${formatPaymentMoney(summary.total_amount_paid)}</strong>
        </div>
        <div>
          Pending amount
          <strong>${formatPaymentMoney(summary.pending_amount)}</strong>
        </div>
      </div>
      <div class="payment-history-list">
        ${
          registrations.length
            ? registrations.map(renderPaymentHistoryItem).join("")
            : `<div class="payment-history-empty">No registrations found.</div>`
        }
      </div>
    </div>
  `;
}
function renderSingleTournamentPaymentHistory(data) {
  const tournament = data.tournament || {};
  const registrations = data.registrations || [];
  const summary = data.summary || {};
  document.getElementById("paymentHistorySummary").innerHTML = `
    ${renderPaymentStat(
      "Registrations",
      Number(summary.total_registrations) || 0
    )}
    ${renderPaymentStat(
      "Payments received",
      formatPaymentMoney(summary.total_amount_paid)
    )}
    ${renderPaymentStat(
      "Pending amount",
      formatPaymentMoney(summary.pending_amount)
    )}
    ${renderPaymentStat(
      "Refunded amount",
      formatPaymentMoney(summary.total_amount_refunded)
    )}
  `;
  document.getElementById("paymentHistoryContent").innerHTML = `
    <div class="payment-history-group">
      <div class="payment-history-group-header">
        <h3>${escapeHtml(tournament.name || "Tournament")}</h3>
        <p>Season: ${escapeHtml(String(tournament.season ?? "N/A"))}</p>
      </div>
      <div class="payment-history-list">
        ${
          registrations.length
            ? registrations.map(renderPaymentHistoryItem).join("")
            : `<div class="payment-history-empty">No payment registrations found for this tournament.</div>`
        }
      </div>
    </div>
  `;
}
function renderAdminPaymentHistory(tournaments) {
  const totals = tournaments.reduce((acc, tournament) => {
    const summary = tournament.summary || {};
    acc.registrations += Number(summary.total_registrations) || 0;
    acc.paid += Number(summary.total_amount_paid) || 0;
    acc.pending += Number(summary.pending_amount) || 0;
    acc.refunded += Number(summary.total_amount_refunded) || 0;
    return acc;
  }, {
    registrations: 0,
    paid: 0,
    pending: 0,
    refunded: 0
  });
  document.getElementById("paymentHistorySummary").innerHTML = `
    ${renderPaymentStat("Tournaments", tournaments.length)}
    ${renderPaymentStat("Registrations", totals.registrations)}
    ${renderPaymentStat("Payments received", formatPaymentMoney(totals.paid))}
    ${renderPaymentStat("Pending amount", formatPaymentMoney(totals.pending))}
  `;
  document.getElementById("paymentHistoryContent").innerHTML =
    tournaments.length
      ? tournaments.map(renderTournamentPaymentHistory).join("")
      : `<div class="payment-history-empty">No payment history found for your tournaments.</div>`;
}

async function loadPaymentHistory(tournamentId = null) {
  const summary = document.getElementById("paymentHistorySummary");
  const content = document.getElementById("paymentHistoryContent");
  
  if (!summary || !content) return;
  
  const user = getCurrentUser();
  
  if (!user) {
    summary.innerHTML = "";
    content.innerHTML = `
      <div class="payment-history-empty">
        Please log in to view payment history.
      </div>
    `;
    return;
  }
  
  if (user.role === "player" && !tournamentId) {
    summary.innerHTML = "";
    content.innerHTML = `
      <div class="payment-history-empty">
        Please open a tournament first to view payment history.
      </div>
    `;
    return;
  }
  
  if (user.role !== "admin" && user.role !== "player") {
    summary.innerHTML = "";
    content.innerHTML = `
      <div class="payment-history-empty">
        You do not have permission to view payment history.
      </div>
    `;
    return;
  }
  
  const query = tournamentId ?
    `?tournament_id=${encodeURIComponent(tournamentId)}` :
    "";
  
  summary.innerHTML = "";
  content.innerHTML = `
    <div class="payment-history-empty">
      Loading payment history...
    </div>
  `;
  
  showLoader();
  
  try {
    const response = await apiRequest(
      `${API}/season-registrations/history${query}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      },
      () => loadPaymentHistory(tournamentId)
    );
    
    if (!response) return;
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to load payment history."
      );
    }
    
    if (tournamentId) {
      renderSingleTournamentPaymentHistory(result.data || {});
    } else {
      renderAdminPaymentHistory(
        Array.isArray(result.data) ? result.data : []
      );
    }
  } catch (error) {
    summary.innerHTML = "";
    content.innerHTML = `
      <div class="payment-history-empty">
        ${escapeHtml(
          error.message || "Unable to load payment history."
        )}
        <br><br>
        <button type="button" id="retryPaymentBtn" class="retry-btn">
          Try Again
        </button>
      </div>
    `;
    
    const retryBtn = document.getElementById("retryPaymentBtn");
    
    if (retryBtn) {
      retryBtn.addEventListener("click", () => loadPaymentHistory(tournamentId));
    }
  } finally {
    hideLoader();
  }
}


async function openPaymentHistoryPage() {
  const user = getCurrentUser();
  
  if (!user) {
    showAlert("Please log in to view payment history.");
    return;
  }
  
  const section = document.getElementById("paymentHistorySection");
  
  if (!section) {
    showAlert("Payment history page was not found.");
    return;
  }
  
  section.hidden = false;
  
  if (user.role === "admin") {
    await loadPaymentHistory();
    return;
  }
  
  if (user.role === "player") {
    if (!currentTournament?.id) {
      showAlert("Please open a tournament first.");
      return;
    }
    document.getElementById("nav").style.display="none";

    await loadPaymentHistory(currentTournament.id);
    return;
  }
  
  showAlert("You do not have permission to view payment history.");
}
function closePaymentHistoryPage() {
  document.getElementById("nav").style.display="flex";
  const section = document.getElementById("paymentHistorySection");
  if (section) {
    section.hidden = true;
  }
}


function switchFinancialTab(tab) {
  const user = getCurrentUser();
  
  if (!user) {
    showAlert("Please log in to continue.");
    return;
  }
  
  const allowedTabs = [
    "history",
    "prizes",
    "expenses",
    "summary",
    "contributions"
  ];
  
  if (!allowedTabs.includes(tab)) {
    return;
  }
  
  if (user.role !== "admin" && tab !== "history") {
    showAlert("You do not have permission to access this section.");
    return;
  }
  
  document.querySelectorAll(".financial-tab-content").forEach(section => {
    section.hidden = true;
  });
  
  document.querySelectorAll(".financial-nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.financialTab === tab
    );
  });
  
  const sections = {
    history: "financialHistoryTab",
    prizes: "financialPrizesTab",
    expenses: "financialExpensesTab",
    summary: "financialSummaryTab",
    contributions: "financialContributionsTab"
  };
  
  const section = document.getElementById(sections[tab]);
  
  if (!section) {
    showAlert("Financial section was not found.");
    return;
  }
  
  section.hidden = false;
  
  if (tab === "history") {
    const tournamentId = currentTournament?.id || null;
    loadPaymentHistory(tournamentId);
    return;
  }
  
  if (tab === "prizes") {
    loadFinancialPrizes();
    return;
  }
  
  if (tab === "expenses") {
    loadFinancialExpenses();
    return;
  }
  
  if (tab === "summary") {
    loadFinancialSummary();
    return;
  }
  
  if (tab === "contributions") {
    loadFinancialContributions();
  }
}


async function refreshFinancialPage() {
  const activeButton = document.querySelector(
    ".financial-nav-btn.active"
  );
  const tab = activeButton?.dataset.financialTab || "history";
  switchFinancialTab(tab);
}
async function openPaymentHistoryPage() {
  const user = getCurrentUser();
  if (!user) {
    showAlert("Please log in to view financial management.");
    return;
  }
  const section = document.getElementById("paymentHistorySection");
  if (!section) {
    showAlert("Financial management page was not found.");
    return;
  }
  section.hidden = false;
  updateFinancialActionButtons();
  const adminTabs = document.querySelectorAll(
  '[data-financial-tab="prizes"], [data-financial-tab="expenses"], [data-financial-tab="summary"], [data-financial-tab="contributions"]'
);
adminTabs.forEach(button => {
    button.hidden = user.role !== "admin";
  });
  if (user.role === "admin") {
    switchFinancialTab("summary");
    return;
  }
  if (user.role === "player") {
    document.getElementById("nav").style.display = "none";
    switchFinancialTab("history");
    return;
  }
  showAlert("You do not have permission to access this page.");
}
function closePaymentHistoryPage() {
  const section = document.getElementById("paymentHistorySection");
  if (section) {
    section.hidden = true;
  }
  const nav = document.getElementById("nav");
  if (nav) {
    nav.style.display = "flex";
  }
}
function renderFinancialSummary(data) {
  const container = document.getElementById("financialOverviewContent");
  if (!container) return;
  const summary = data.summary || {};
  const registrations = summary.registrations || {};
  const contributions = summary.contributions || {};
  const prizes = summary.prizes || {};
  const expenses = summary.expenses || {};
  const amountReceived = Number(registrations.amount_received) || 0;
  const amountRefunded = Number(registrations.amount_refunded) || 0;
  const sponsorshipAmount = Number(contributions.sponsorship_amount) || 0;
  const adminContributionAmount = Number(contributions.admin_contribution_amount) || 0;
  const additionalIncome = Number(contributions.total_amount) ||
    sponsorshipAmount + adminContributionAmount;
  const prizesPaid = Number(prizes.amount_paid) || 0;
  const expensesPaid = Number(expenses.amount_paid) || 0;
  const netBalance = Number(summary.net_balance) || 0;
  const totalFundsReceived = Number(summary.total_funds_received) ||
    amountReceived + additionalIncome;
  container.innerHTML = `
    <div class="financial-overview-grid">
      <div class="financial-overview-card">
        <span>Registration Revenue</span>
        <strong>${escapeHtml(formatPaymentMoney(amountReceived))}</strong>
        <small>${Number(registrations.paid) || 0} paid registrations</small>
      </div>
      <div class="financial-overview-card">
        <span>Sponsorship Income</span>
        <strong>${escapeHtml(formatPaymentMoney(sponsorshipAmount))}</strong>
        <small>${Number(contributions.sponsorship_count) || 0} sponsorship records</small>
      </div>
      <div class="financial-overview-card">
        <span>Admin Contributions</span>
        <strong>${escapeHtml(formatPaymentMoney(adminContributionAmount))}</strong>
        <small>${Number(contributions.admin_contribution_count) || 0} contribution records</small>
      </div>
      <div class="financial-overview-card">
        <span>Total Funds Received</span>
        <strong>${escapeHtml(formatPaymentMoney(totalFundsReceived))}</strong>
        <small>Registration revenue and additional income</small>
      </div>
      <div class="financial-overview-card">
        <span>Prize Money Paid</span>
        <strong>${escapeHtml(formatPaymentMoney(prizesPaid))}</strong>
        <small>${Number(prizes.paid) || 0} paid prizes</small>
      </div>
      <div class="financial-overview-card">
        <span>Expenses Paid</span>
        <strong>${escapeHtml(formatPaymentMoney(expensesPaid))}</strong>
        <small>${Number(expenses.paid) || 0} paid expenses</small>
      </div>
      <div class="financial-overview-card">
        <span>Net Balance</span>
        <strong class="${netBalance < 0 ? "negative" : "positive"}">
          ${escapeHtml(formatPaymentMoney(netBalance))}
        </strong>
        <small>After recorded payouts and expenses</small>
      </div>
    </div>
    <div class="financial-breakdown">
      <h3>Registration Payments</h3>
      <div class="financial-breakdown-row">
        <span>Total registrations</span>
        <strong>${Number(registrations.total) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Pending registrations</span>
        <strong>${Number(registrations.pending) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Pending amount</span>
        <strong>${escapeHtml(formatPaymentMoney(registrations.pending_amount))}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Refunded registrations</span>
        <strong>${Number(registrations.refunded) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Amount refunded</span>
        <strong>${escapeHtml(formatPaymentMoney(amountRefunded))}</strong>
      </div>
    </div>
    <div class="financial-breakdown">
      <h3>Sponsorships & Admin Contributions</h3>
      <div class="financial-breakdown-row">
        <span>Total contribution records</span>
        <strong>${Number(contributions.total) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Sponsorship records</span>
        <strong>${Number(contributions.sponsorship_count) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Sponsorship income</span>
        <strong>${escapeHtml(formatPaymentMoney(sponsorshipAmount))}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Admin contribution records</span>
        <strong>${Number(contributions.admin_contribution_count) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Admin contributions</span>
        <strong>${escapeHtml(formatPaymentMoney(adminContributionAmount))}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Total additional income</span>
        <strong>${escapeHtml(formatPaymentMoney(additionalIncome))}</strong>
      </div>
    </div>
    <div class="financial-breakdown">
      <h3>Prize Payouts</h3>
      <div class="financial-breakdown-row">
        <span>Total prize records</span>
        <strong>${Number(prizes.total) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Pending approval</span>
        <strong>${Number(prizes.pending) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Approved, awaiting payment</span>
        <strong>${Number(prizes.approved) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Approved amount</span>
        <strong>${escapeHtml(formatPaymentMoney(prizes.approved_amount))}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Pending prize amount</span>
        <strong>${escapeHtml(formatPaymentMoney(prizes.pending_amount))}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Cancelled prizes</span>
        <strong>${Number(prizes.cancelled) || 0}</strong>
      </div>
    </div>
    <div class="financial-breakdown">
      <h3>Expenses</h3>
      <div class="financial-breakdown-row">
        <span>Total expense records</span>
        <strong>${Number(expenses.total) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Pending approval</span>
        <strong>${Number(expenses.pending) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Approved, awaiting payment</span>
        <strong>${Number(expenses.approved) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Approved amount</span>
        <strong>${escapeHtml(formatPaymentMoney(expenses.approved_amount))}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Pending expense amount</span>
        <strong>${escapeHtml(formatPaymentMoney(expenses.pending_amount))}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Rejected expenses</span>
        <strong>${Number(expenses.rejected) || 0}</strong>
      </div>
      <div class="financial-breakdown-row">
        <span>Cancelled expenses</span>
        <strong>${Number(expenses.cancelled) || 0}</strong>
      </div>
    </div>
  `;
}
async function loadFinancialSummary() {
  const container = document.getElementById("financialOverviewContent");
  if (!container) return;
  
  const tournamentId = currentTournament?.id || null;
  
  const query = tournamentId ?
    `?tournament_id=${encodeURIComponent(tournamentId)}` :
    "";
  
  container.innerHTML = `
    <div class="payment-history-empty">
      Loading financial summary...
    </div>
  `;
  
  showLoader();
  
  try {
    const res = await apiRequest(
      `${API}/financial/summary${query}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      },
      () => loadFinancialSummary()
    );
    
    if (!res) return;
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(
        result.message || "Failed to load financial summary."
      );
    }
    
    renderFinancialSummary(result);
  } catch (error) {
    container.innerHTML = `
      <div class="payment-history-empty">
        ${escapeHtml(error.message || "Unable to load financial summary.")}
      </div>
    `;
  } finally {
    hideLoader();
  }
}
function renderFinancialPrizes(data) {
  const summary = document.getElementById("financialPrizeSummary");
  const content = document.getElementById("financialPrizeContent");
  if (!summary || !content) return;
  const prizes = Array.isArray(data) ? data : [];
  const totals = prizes.reduce((result, prize) => {
    const amount = Number(prize.amount) || 0;
    const status = String(prize.status || "").toLowerCase();
    result.total += amount;
    result.count++;
    if (status === "pending") {
      result.pending += amount;
      result.pendingCount++;
    } else if (status === "approved") {
      result.approved += amount;
      result.approvedCount++;
    } else if (status === "paid") {
      result.paid += amount;
      result.paidCount++;
    }
    return result;
  }, {
    total: 0,
    count: 0,
    pending: 0,
    pendingCount: 0,
    approved: 0,
    approvedCount: 0,
    paid: 0,
    paidCount: 0
  });
  summary.innerHTML = `
    <div class="payment-history-stat">
      <div class="payment-history-stat-label">Total Prize Records</div>
      <div class="payment-history-stat-value">${totals.count}</div>
    </div>
    <div class="payment-history-stat">
      <div class="payment-history-stat-label">Pending Payouts</div>
      <div class="payment-history-stat-value">${formatPaymentMoney(totals.pending)}</div>
      <div class="payment-history-stat-description">${totals.pendingCount} records</div>
    </div>
    <div class="payment-history-stat">
      <div class="payment-history-stat-label">Awaiting Payment</div>
      <div class="payment-history-stat-value">${formatPaymentMoney(totals.approved)}</div>
      <div class="payment-history-stat-description">${totals.approvedCount} records approved</div>
    </div>
    <div class="payment-history-stat">
      <div class="payment-history-stat-label">Total Paid</div>
      <div class="payment-history-stat-value">${formatPaymentMoney(totals.paid)}</div>
      <div class="payment-history-stat-description">${totals.paidCount} completed payouts</div>
    </div>
  `;
  if (!prizes.length) {
    content.innerHTML = `
      <div class="payment-history-empty">
        No prize payout records found.
      </div>
    `;
    return;
  }
  content.innerHTML = `
    <div class="payment-history-list">
      ${prizes.map(prize => {
        const status = String(prize.status || "unknown").toLowerCase();
        const allowedStatuses = ["pending", "approved", "paid", "cancelled"];
        const statusClass = allowedStatuses.includes(status) ? status : "unknown";
        const username = escapeHtml(prize.username || "Unknown player");
        const tournament = escapeHtml(prize.tournament_name || "Tournament");
        const prizeName = escapeHtml(prize.prize_name || "Prize");
        const position = escapeHtml(prize.position || "");
        const amount = formatPaymentMoney(prize.amount);
        const dateValue = prize.awarded_at || prize.created_at;
        const date = dateValue
          ? formatFinancialDate(dateValue)
          : "Date unavailable";
        const bankName = String(prize.payout_bank_name || "").trim();
        const accountName = String(prize.payout_account_name || "").trim();
        const accountNumber = String(prize.payout_account_number || "").trim();
        const hasBankDetails = Boolean(
          bankName || accountName || accountNumber
        );
        const bankDetails = hasBankDetails ? `
          <div class="financial-prize-bank-details">
            <div class="financial-prize-bank-heading">Player Payout Details</div>
            ${bankName ? `
              <div class="financial-prize-bank-row">
                <span>Bank</span>
                <strong>${escapeHtml(bankName)}</strong>
              </div>
            ` : ""}
            ${accountName ? `
              <div class="financial-prize-bank-row">
                <span>Account Name</span>
                <strong>${escapeHtml(accountName)}</strong>
              </div>
            ` : ""}
            ${accountNumber ? `
              <div class="financial-prize-bank-row">
                <span>Account Number</span>
                <div class="financial-prize-account-copy">
                  <button
                    type="button"
                    class="financial-prize-copy-btn"
                    data-account-number="${escapeHtml(accountNumber)}"
                    aria-label="Copy account number"
                    title="Copy account number"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="8" y="8" width="12" height="12" rx="2"></rect>
                      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path>
                    </svg>
                  </button>
                  <strong>${escapeHtml(accountNumber)}</strong>
                </div>
              </div>
            ` : ""}
          </div>
        ` : "";
        let actions = "";
        if (status === "pending") {
          actions = `
            <button type="button" class="financial-approve-btn" onclick="approveFinancialPrize('${escapeHtml(prize.id)}')">
              Approve
            </button>
          `;
        } else if (status === "approved") {
          actions = `
            <button type="button" class="financial-pay-btn" onclick="payFinancialPrize('${escapeHtml(prize.id)}')">
              Mark as Paid
            </button>
          `;
        }
        return `
          <article class="payment-history-item">
            <div class="payment-history-item-main">
              <h4 class="payment-history-item-title">${prizeName}</h4>
              <div class="payment-history-item-details">
                <span>Player: ${username}</span>
                <span>Tournament: ${tournament}</span>
                ${position ? `<span>Position: ${position}</span>` : ""}
                <span>Date: ${escapeHtml(date)}</span>
              </div>
              ${bankDetails}
              ${actions ? `<div class="financial-action-buttons">${actions}</div>` : ""}
            </div>
            <div class="payment-history-item-side">
              <div class="payment-history-item-amount">${amount}</div>
              <span class="payment-history-status ${statusClass}">${escapeHtml(status)}</span>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}
document.addEventListener("click", async event => {
  const button = event.target.closest(".financial-prize-copy-btn");
  if (!button) return;
  const accountNumber = button.dataset.accountNumber;
  if (!accountNumber) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(accountNumber);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = accountNumber;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) throw new Error("Copy failed");
    }
    button.classList.add("copied");
    button.title = "Copied!";
    button.setAttribute("aria-label", "Account number copied");
    setTimeout(() => {
      button.classList.remove("copied");
      button.title = "Copy account number";
      button.setAttribute("aria-label", "Copy account number");
    }, 1500);
  } catch (error) {
    console.error("Failed to copy account number:", error);
    showAlert("Unable to copy account number. Please copy it manually.");
  }
});
async function loadFinancialPrizes() {
  const content = document.getElementById("financialPrizeContent");
  if (!content) return;
  
  const user = getCurrentUser();
  
  if (!user) {
    content.innerHTML = `
      <div class="payment-history-empty">
        Please log in to view prize payouts.
      </div>
    `;
    return;
  }
  
  let url = `${API}/financial/prizes`;
  const tournamentId = currentTournament?.id;
  
  if (user.role === "player") {
    if (!tournamentId) {
      content.innerHTML = `
        <div class="payment-history-empty">
          Please open a tournament first to view prize payouts.
        </div>
      `;
      return;
    }
    
    url += `?tournament_id=${encodeURIComponent(tournamentId)}`;
  } else if (user.role === "admin") {
    if (tournamentId) {
      url += `?tournament_id=${encodeURIComponent(tournamentId)}`;
    }
  } else {
    content.innerHTML = `
      <div class="payment-history-empty">
        You do not have permission to view prize payouts.
      </div>
    `;
    return;
  }
  
  content.innerHTML = `
    <div class="payment-history-empty">
      Loading prize payouts...
    </div>
  `;
  
  showLoader();
  
  try {
    const response = await apiRequest(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    
    if (!response) return;
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to load prize payouts."
      );
    }
    
    renderFinancialPrizes(result.data);
    
  } catch (error) {
    content.innerHTML = `
      <div class="payment-history-empty">
        ${escapeHtml(error.message || "Unable to load prize payouts.")}
        <br><br>
        <button type="button" onclick="loadFinancialPrizes()">
          Try Again
        </button>
      </div>
    `;
  } finally {
    hideLoader();
  }
}

function formatFinancialDate(timestamp) {
  if (!timestamp) return "Date unavailable";

  let dateValue = Number(timestamp);

  if (!Number.isFinite(dateValue)) {
    dateValue = Date.parse(timestamp);
  } else if (dateValue < 1e12) {
    dateValue *= 1000;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

async function approveFinancialPrize(id) {
  if (!id) return;
  const confirmed = await showConfirmModal(
    "Are you sure you want to approve this prize payout?",
    "Approve Prize",
    "Cancel"
  );
  if (!confirmed) return;
  showLoader();
  try {
    const response = await apiRequest(
      `${API}/financial/prizes/${encodeURIComponent(id)}/approve`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    );
    if (!response) {
      throw new Error("No response received. Please try again.");
    }
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to approve prize payout."
      );
    }
    showAlert("Prize payout approved successfully.");
    await loadFinancialPrizes();
  } catch (error) {
    showAlert(
      error.message || "Unable to approve prize payout."
    );
  } finally {
    hideLoader();
  }
}

async function payFinancialPrize(id) {
  if (!id) return;
  document.getElementById("prizePaymentModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "prizePaymentModal";
  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:100000;
    background:rgba(0,0,0,0.65);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
    box-sizing:border-box;
    overflow-y:auto;
  `;
  modal.innerHTML = `
    <div class="prize-preview-container">
      <h2 style="margin:0 0 6px;">Record Prize Payment</h2>
      <p style="margin:0 0 20px;color:#666;font-size:14px;">
        Enter the payment details. Only record a payment that has actually been made.
      </p>
      <form id="prizePaymentForm">
        <label for="prizePaymentReference">Payment Reference *</label>
        <input
          id="prizePaymentReference"
          name="payout_reference"
          type="text"
          maxlength="200"
          required
          placeholder="Enter transaction reference"
        >
        <label for="prizePaymentMethod">Payment Method *</label>
        <select id="prizePaymentMethod" name="payment_method" required>
          <option value="">Select payment method</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="USSD">USSD</option>
          <option value="Mobile Banking">Mobile Banking</option>
          <option value="Cash">Cash</option>
          <option value="Other">Other</option>
        </select>
        <div
          id="prizePaymentReview"
          style="display:none;background:#eff6ff;border:1px solid #bfdbfe;padding:14px;border-radius:8px;margin:18px 0;overflow-wrap:anywhere;"
        >
          <h3 style="margin:0 0 10px;">Review Payment</h3>
          <div id="prizePaymentReviewContent"></div>
        </div>
        <div
          id="prizePaymentError"
          role="alert"
          style="display:none;color:#b91c1c;margin-bottom:12px;overflow-wrap:anywhere;"
        ></div>
        <div class="prize-preview-actions">
          <button
            type="button"
            id="prizePaymentCancel"
            class="prize-preview-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            id="prizePaymentReviewButton"
            class="prize-preview-review"
          >
            Review Details
          </button>
          <button
            type="submit"
            id="prizePaymentSubmit"
            class="prize-preview-submit"
          >
            Confirm Payment
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector("#prizePaymentForm");
  const cancelBtn = modal.querySelector("#prizePaymentCancel");
  const reviewBtn = modal.querySelector("#prizePaymentReviewButton");
  const submitBtn = modal.querySelector("#prizePaymentSubmit");
  const errorBox = modal.querySelector("#prizePaymentError");
  const reviewPanel = modal.querySelector("#prizePaymentReview");
  const reviewContent = modal.querySelector("#prizePaymentReviewContent");
  function getPaymentData() {
    return {
      payout_reference: form.elements.payout_reference.value.trim(),
      payment_method: form.elements.payment_method.value
    };
  }
  function showReview() {
    if (!form.reportValidity()) return false;
    const data = getPaymentData();
    if (!data.payout_reference || !data.payment_method) {
      errorBox.textContent = "Complete all payment details.";
      errorBox.style.display = "block";
      return false;
    }
    reviewContent.innerHTML = `
      <div><strong>Payment Reference:</strong> ${escapeHtml(data.payout_reference)}</div>
      <div><strong>Payment Method:</strong> ${escapeHtml(data.payment_method)}</div>
    `;
    reviewPanel.style.display = "block";
    errorBox.style.display = "none";
    reviewBtn.textContent = "Update Review";
    return true;
  }
  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });
  modal.addEventListener("click", event => {
    if (event.target === modal) {
      modal.remove();
    }
  });
  reviewBtn.addEventListener("click", showReview);
  form.addEventListener("input", () => {
    reviewPanel.style.display = "none";
    reviewBtn.textContent = "Review Details";
    errorBox.style.display = "none";
  });
  form.addEventListener("change", () => {
    reviewPanel.style.display = "none";
    reviewBtn.textContent = "Review Details";
    errorBox.style.display = "none";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitBtn.disabled || !showReview()) return;
    const data = getPaymentData();
    const confirmed = await showConfirmModal(
      "Confirm that this prize payout has actually been paid. This will mark the payout as paid.",
      "Confirm Payment",
      "Cancel"
    );
    if (!confirmed) return;
    submitBtn.disabled = true;
    reviewBtn.disabled = true;
    cancelBtn.disabled = true;
    submitBtn.textContent = "Recording Payment...";
    errorBox.style.display = "none";
    showLoader();
    try {
      const response = await apiRequest(
        `${API}/financial/prizes/${encodeURIComponent(id)}/pay`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        }
      );
      if (!response) {
        throw new Error(
          "No response received. Check your connection and try again."
        );
      }
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = {
          success: false,
          message: responseText || "Server returned an empty response."
        };
      }
      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          `Failed to record payment. HTTP ${response.status}.`
        );
      }
      modal.remove();
      showAlert(
        result.message || "Prize payout marked as paid successfully."
      );
      await loadFinancialPrizes();
    } catch (error) {
      errorBox.textContent =
        error?.message || "Unable to record prize payment.";
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      reviewBtn.disabled = false;
      cancelBtn.disabled = false;
      submitBtn.textContent = "Confirm Payment";
    } finally {
      hideLoader();
    }
  });
}
async function loadFinancialExpenses() {
  const content = document.getElementById("financialExpenseContent");
  if (!content) return;
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    content.innerHTML = `
      <div class="payment-history-empty">
        Only administrators can view expense records.
      </div>
    `;
    return;
  }
  const tournamentId = currentTournament?.id;
  let url = `${API}/financial/expenses`;
  if (tournamentId) {
    url += `?tournament_id=${encodeURIComponent(tournamentId)}`;
  } else {
    url += "?scope=general";
  }
  content.innerHTML = `
    <div class="payment-history-empty">
      Loading expenses...
    </div>
  `;
  showLoader();
  try {
    const response = await apiRequest(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    if (!response) return;
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to load expenses."
      );
    }
    renderFinancialExpenses(result.data || []);
  } catch (error) {
    content.innerHTML = `
      <div class="payment-history-empty">
        ${escapeHtml(error.message || "Unable to load expenses.")}
        <br><br>
        <button type="button" onclick="loadFinancialExpenses()">
          Try Again
        </button>
      </div>
    `;
  } finally {
    hideLoader();
  }
}

function renderFinancialExpenses(data) {
  const summary = document.getElementById("financialExpenseSummary");
  const content = document.getElementById("financialExpenseContent");

  if (!summary || !content) return;

  const expenses = Array.isArray(data) ? data : [];

  const totals = {
    total: 0,
    pending: 0,
    approved: 0,
    paid: 0,
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0
  };

  expenses.forEach(expense => {
    const amount = Number(expense.amount) || 0;
    const status = String(expense.status || "").toLowerCase();

    totals.total += amount;
    if (status === "pending") {
      totals.pending += amount;
      totals.pendingCount++;
    } else if (status === "approved") {
      totals.approved += amount;
      totals.approvedCount++;
    } else if (status === "paid") {
      totals.paid += amount;
      totals.paidCount++;
    }
  });

  summary.innerHTML = `
    <div class="payment-history-stat"> 
      <div class="payment-history-stat-label">Total Expenses</div> 
      <div class="payment-history-stat-value">${expenses.length}</div> 
      <div class="payment-history-stat-description">${escapeHtml(formatPaymentMoney(totals.total))}</div> 
    </div> 
    <div class="payment-history-stat"> 
      <div class="payment-history-stat-label">Pending</div> 
      <div class="payment-history-stat-value">${escapeHtml(formatPaymentMoney(totals.pending))}</div> 
      <div class="payment-history-stat-description">${totals.pendingCount} records</div> 
    </div> 
    <div class="payment-history-stat"> 
      <div class="payment-history-stat-label">Awaiting Payment</div> 
      <div class="payment-history-stat-value">${escapeHtml(formatPaymentMoney(totals.approved))}</div> 
      <div class="payment-history-stat-description">${totals.approvedCount} approved</div> 
    </div> 
    <div class="payment-history-stat"> 
      <div class="payment-history-stat-label">Total Paid</div> 
      <div class="payment-history-stat-value">${escapeHtml(formatPaymentMoney(totals.paid))}</div> 
      <div class="payment-history-stat-description">${totals.paidCount} completed</div> 
    </div>
  `;

  if (!expenses.length) {
    content.innerHTML = `<div class="payment-history-empty">No expenses found.</div>`;
    return;
  }

  content.innerHTML = `
    <div class="payment-history-list">
      ${expenses.map(expense => {
        const status = String(expense.status || "unknown").toLowerCase();
        const allowed = ["pending", "approved", "paid", "rejected", "cancelled"];
        const statusClass = allowed.includes(status) ? status : "unknown";
        const name = escapeHtml(expense.expense_name || expense.description || "Expense");
        const recipient = escapeHtml(expense.recipient || "Not specified");
        const tournament = escapeHtml(expense.tournament_name || "General expense");
        const amount = escapeHtml(formatPaymentMoney(expense.amount));
        const dateValue = expense.expense_date || expense.created_at;
        const date = dateValue ? formatFinancialDate(dateValue) : "Date unavailable";

        let actions = "";
        if (status === "pending") {
          actions = `<button type="button" class="financial-approve-btn" onclick="approveFinancialExpense('${escapeHtml(expense.id)}')">Approve</button>`;
        } else if (status === "approved") {
          actions = `<button type="button" class="financial-pay-btn" onclick="payFinancialExpense('${escapeHtml(expense.id)}')">Mark as Paid</button>`;
        }
        return `
          <article class="payment-history-item">
            <div class="payment-history-item-main">
              <h4 class="payment-history-item-title">${name}</h4>
              <div class="payment-history-item-details">
                <span>Recipient: ${recipient}</span>
                <span>Tournament: ${tournament}</span>
                <span>Date: ${escapeHtml(date)}</span>
              </div>
              ${actions ? `<div class="financial-action-buttons">${actions}</div>` : ""}
            </div>
            <div class="payment-history-item-side">
              <div class="payment-history-item-amount">${amount}</div>
              <span class="payment-history-status ${statusClass}">${escapeHtml(status)}</span>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}


function updateFinancialActionButtons() {
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  const hasTournament = Boolean(currentTournament?.id);
  
  const prizeBtn = document.getElementById("createPrizeBtn");
  const tournamentExpenseBtn = document.getElementById("createTournamentExpenseBtn");
  const generalExpenseBtn = document.getElementById("createGeneralExpenseBtn");
  const contributionBtn = document.getElementById("createFinancialContributionBtn");
  
  if (prizeBtn) {
    prizeBtn.hidden = !(isAdmin && hasTournament);
  }
  
  if (tournamentExpenseBtn) {
    tournamentExpenseBtn.hidden = !(isAdmin && hasTournament);
  }
  
  if (generalExpenseBtn) {
    generalExpenseBtn.hidden = !isAdmin;
  }
  
  if (contributionBtn) {
    contributionBtn.hidden = !isAdmin;
  }
}

async function openCreatePrizeForm() {
  const user = getCurrentUser();
  const tournamentId = currentTournament?.id;
  if (user?.role !== "admin") {
    showAlert("Only admins can create prize payouts.");
    return;
  }
  if (!tournamentId) {
    showAlert("Open a tournament before creating a prize payout.");
    return;
  }
  const players = (currentTournament?.tournament_players || [])
    .filter(player => player.status === "accepted" && player.user_id)
    .sort((a, b) =>
      String(a.team_name || "").localeCompare(String(b.team_name || ""))
    );
  if (!players.length) {
    showAlert("There are no accepted players in this tournament.");
    return;
  }
  document.getElementById("prizePreviewModal")?.remove();
  const tournamentName =
    currentTournament?.name ||
    currentTournament?.title ||
    "Current tournament";
  const modal = document.createElement("div");
  modal.id = "prizePreviewModal";
  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:100000;
    background:rgba(0,0,0,0.65);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
    box-sizing:border-box;
    overflow-x:hidden;
    overflow-y:auto;
  `;
  modal.innerHTML = `
    <div class="prize-preview-container">
      <h2 style="margin:0 0 6px;">Create Prize Payout</h2>
      <p style="margin:0 0 20px;color:#666;font-size:14px;">
        Enter the prize details and review before submitting.
      </p>
      <form id="prizePreviewForm">
        <label for="prizePreviewUserId">Prize Recipient *</label>
        <select id="prizePreviewUserId" name="user_id" required>
          <option value="">Select a tournament player</option>
          ${players.map(player => `
            <option value="${escapeHtml(player.user_id)}">
              ${escapeHtml(player.team_name || "Unknown Team")}
            </option>
          `).join("")}
        </select>
        <label for="prizePreviewName">Prize Name *</label>
        <input
          id="prizePreviewName"
          name="prize_name"
          type="text"
          maxlength="200"
          required
          placeholder="e.g. League Champion"
        >
        <label for="prizePreviewPosition">Finishing Position *</label>
        <input
          id="prizePreviewPosition"
          name="position"
          type="number"
          min="1"
          step="1"
          required
          placeholder="e.g. 1"
        >
        <label for="prizePreviewAmount">Prize Amount (₦) *</label>
        <input
          id="prizePreviewAmount"
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          placeholder="Enter prize amount"
        >
        <div class="prize-preview-type">
          <strong>Tournament:</strong>
          <div>${escapeHtml(tournamentName)}</div>
        </div>
        <div
          id="prizePreviewReview"
          style="display:none;background:#eff6ff;border:1px solid #bfdbfe;padding:14px;border-radius:8px;margin-bottom:18px;overflow-wrap:anywhere;"
        >
          <h3>Review Prize Payout</h3>
          <div id="prizePreviewReviewContent"></div>
        </div>
        <div
          id="prizePreviewError"
          role="alert"
          style="display:none;color:#b91c1c;margin-bottom:12px;overflow-wrap:anywhere;"
        ></div>
        <div class="prize-preview-actions">
          <button type="button" id="prizePreviewCancel" class="prize-preview-cancel">
            Cancel
          </button>
          <button type="button" id="prizePreviewReviewButton" class="prize-preview-review">
            Review Details
          </button>
          <button type="submit" id="prizePreviewSubmit" class="prize-preview-submit">
            Confirm & Submit
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector("#prizePreviewForm");
  const cancelBtn = modal.querySelector("#prizePreviewCancel");
  const reviewBtn = modal.querySelector("#prizePreviewReviewButton");
  const submitBtn = modal.querySelector("#prizePreviewSubmit");
  const errorBox = modal.querySelector("#prizePreviewError");
  const reviewPanel = modal.querySelector("#prizePreviewReview");
  const reviewContent = modal.querySelector("#prizePreviewReviewContent");
  function getFormData() {
    const rawPosition = form.elements.position.value;
    const rawAmount = form.elements.amount.value;
    return {
      user_id: form.elements.user_id.value,
      prize_name: form.elements.prize_name.value.trim(),
      position: rawPosition === "" ? null : Number(rawPosition),
      amount: rawAmount === "" ? NaN : Number(rawAmount)
    };
  }
  function validateForm(data) {
    if (!data.user_id || !data.prize_name) {
      return "Select a recipient and enter a prize name.";
    }
    if (!players.some(player => player.user_id === data.user_id)) {
      return "Selected player was not found in the tournament player list.";
    }
    if (!Number.isSafeInteger(data.position) || data.position < 1) {
      return "Enter a valid positive whole finishing position.";
    }
    if (!Number.isSafeInteger(data.amount) || data.amount <= 0) {
      return "Enter a valid positive whole prize amount in naira.";
    }
    return null;
  }
  function showReview() {
    if (!form.reportValidity()) {
      return false;
    }
    const data = getFormData();
    const validationError = validateForm(data);
    if (validationError) {
      errorBox.textContent = validationError;
      errorBox.style.display = "block";
      return false;
    }
    const selectedPlayer = players.find(
      player => player.user_id === data.user_id
    );
    reviewContent.innerHTML = `
      <div><strong>Recipient:</strong> ${escapeHtml(selectedPlayer?.team_name || "Unknown Team")}</div>
      <div><strong>User ID:</strong> ${escapeHtml(data.user_id)}</div>
      <div><strong>Prize Name:</strong> ${escapeHtml(data.prize_name)}</div>
      <div><strong>Position:</strong> ${data.position}</div>
      <div><strong>Amount:</strong> ₦${data.amount.toLocaleString("en-NG")}</div>
      <div><strong>Tournament:</strong> ${escapeHtml(tournamentName)}</div>
    `;
    reviewPanel.style.display = "block";
    errorBox.style.display = "none";
    reviewBtn.textContent = "Update Review";
    return true;
  }
  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });
  modal.addEventListener("click", event => {
    if (event.target === modal) {
      modal.remove();
    }
  });
  reviewBtn.addEventListener("click", showReview);
  form.addEventListener("input", () => {
    reviewPanel.style.display = "none";
    reviewBtn.textContent = "Review Details";
    errorBox.style.display = "none";
  });
  form.addEventListener("change", () => {
    reviewPanel.style.display = "none";
    reviewBtn.textContent = "Review Details";
    errorBox.style.display = "none";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitBtn.disabled || !showReview()) {
      return;
    }
    if (currentTournament?.id !== tournamentId) {
      errorBox.textContent =
        "The current tournament has changed. Close this form and try again.";
      errorBox.style.display = "block";
      return;
    }
    const data = getFormData();
    const selectedPlayer = players.find(
      player => player.user_id === data.user_id
    );
    const confirmed = await showConfirmModal(
      `Create a prize payout of ₦${data.amount.toLocaleString("en-NG")} for ${selectedPlayer?.team_name || "the selected player"}?`,
      "Create Prize",
      "Cancel"
    );
    if (!confirmed) {
      return;
    }
    if (currentTournament?.id !== tournamentId) {
      errorBox.textContent =
        "The current tournament has changed. Close this form and try again.";
      errorBox.style.display = "block";
      return;
    }
    const payload = {
      tournament_id: tournamentId,
      user_id: data.user_id,
      prize_name: data.prize_name,
      position: data.position,
      amount: data.amount
    };
    submitBtn.disabled = true;
    reviewBtn.disabled = true;
    cancelBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    errorBox.style.display = "none";
    showLoader();
    try {
      const response = await apiRequest(`${API}/financial/prizes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response) {
        throw new Error(
          "No response received. Check your network connection and try again."
        );
      }
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = {
          success: false,
          message: responseText || "Server returned an empty response."
        };
      }
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Request failed with HTTP ${response.status}.`
        );
      }
      modal.remove();
      showAlert(result.message || "Prize payout created successfully.");
      await loadFinancialPrizes();
    } catch (error) {
      errorBox.textContent =
        error?.message || "An unknown error occurred.";
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      reviewBtn.disabled = false;
      cancelBtn.disabled = false;
      submitBtn.textContent = "Confirm & Submit";
    } finally {
      hideLoader();
    }
  });
}

async function openCreateExpenseForm(isTournamentExpense = false) {
  const user = getCurrentUser();
  const tournamentId = currentTournament?.id;
  if (user?.role !== "admin") {
    showAlert("Only admins can create expenses.");
    return;
  }
  if (isTournamentExpense && !tournamentId) {
    showAlert("Open a tournament before creating a tournament expense.");
    updateFinancialActionButtons();
    return;
  }
  const existingModal = document.getElementById("expensePreviewModal");
  if (existingModal) existingModal.remove();
  const expenseType = isTournamentExpense
    ? "Tournament Expense"
    : "General Expense";
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const modal = document.createElement("div");
  modal.id = "expensePreviewModal";
  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:100000;
    background:rgba(0,0,0,0.65);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
    box-sizing:border-box;
    overflow-x:hidden;
    overflow-y:auto;
  `;
  modal.innerHTML = `
    <div class="expense-preview-container">
      <h2 style="margin:0 0 6px;">Add ${expenseType}</h2>
      <p style="margin:0 0 20px;color:#666;font-size:14px;overflow-wrap:anywhere;">
        Enter the expense details below. Review everything before submitting.
      </p>
      <form id="expensePreviewForm">
        <label for="expensePreviewDescription">Description *</label>
        <input
          id="expensePreviewDescription"
          name="description"
          type="text"
          maxlength="200"
          required
          placeholder="e.g. Internet subscription"
        >
        <label for="expensePreviewCategory">Category *</label>
        <input
          id="expensePreviewCategory"
          name="category"
          type="text"
          maxlength="100"
          list="expenseCategoryOptions"
          required
          placeholder="e.g. Internet, prizes, venue"
        >
        <datalist id="expenseCategoryOptions">
          <option value="Prizes">
          <option value="Venue">
          <option value="Internet">
          <option value="Marketing">
          <option value="Equipment">
          <option value="Operations">
          <option value="Transportation">
          <option value="Other">
        </datalist>
        <label for="expensePreviewAmount">Amount (₦) *</label>
        <input
          id="expensePreviewAmount"
          name="amount"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          required
          placeholder="Enter amount in naira"
        >
        <label for="expensePreviewRecipient">Recipient / Payee</label>
        <input
          id="expensePreviewRecipient"
          name="recipient"
          type="text"
          maxlength="200"
          placeholder="Optional"
        >
        <label for="expensePreviewDate">Expense Date *</label>
        <input
          id="expensePreviewDate"
          name="expense_date"
          type="date"
          required
          value="${todayDate}"
        >
        <label for="expensePreviewNotes">Additional Notes</label>
        <textarea
          id="expensePreviewNotes"
          name="notes"
          rows="3"
          maxlength="2000"
          placeholder="Optional details"
        ></textarea>
        <div class="expense-preview-type">
          <strong>Expense Type:</strong> ${expenseType}
          ${
            isTournamentExpense
              ? `<br><strong>Tournament:</strong> ${escapeHtml(
                  currentTournament?.name ||
                  currentTournament?.title ||
                  "Current tournament"
                )}`
              : "<br><strong>Tournament:</strong> None — general expense"
          }
        </div>
        <div
          id="expensePreviewReview"
          style="display:none;background:#eff6ff;border:1px solid #bfdbfe;padding:14px;border-radius:8px;margin-bottom:18px;min-width:0;overflow-wrap:anywhere;"
        >
          <h3 style="margin:0 0 12px;">Review Your Expense</h3>
          <div
            id="expensePreviewReviewContent"
            style="font-size:14px;line-height:1.8;overflow-wrap:anywhere;word-break:break-word;"
          ></div>
          <p style="margin:12px 0 0;color:#1d4ed8;font-size:13px;">
            Check these details before submitting. You can still edit the fields above.
          </p>
        </div>
        <div
          id="expensePreviewError"
          role="alert"
          style="display:none;color:#b91c1c;margin-bottom:12px;overflow-wrap:anywhere;"
        ></div>
        <div class="expense-preview-actions">
          <button
            type="button"
            id="expensePreviewCancel"
            class="expense-preview-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            id="expensePreviewReviewButton"
            class="expense-preview-review"
          >
            Review Details
          </button>
          <button
            type="submit"
            id="expensePreviewSubmit"
            class="expense-preview-submit"
          >
            Confirm & Submit
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector("#expensePreviewForm");
  const cancelBtn = modal.querySelector("#expensePreviewCancel");
  const reviewBtn = modal.querySelector("#expensePreviewReviewButton");
  const submitBtn = modal.querySelector("#expensePreviewSubmit");
  const errorBox = modal.querySelector("#expensePreviewError");
  const reviewPanel = modal.querySelector("#expensePreviewReview");
  const reviewContent = modal.querySelector("#expensePreviewReviewContent");
  function isValidDate(value) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const [, year, month, day] = match;
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day))
    );
    return (
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day)
    );
  }
  function getFormData() {
    return {
      description: form.elements.description.value.trim(),
      category: form.elements.category.value.trim(),
      amount: Number(form.elements.amount.value),
      recipient: form.elements.recipient.value.trim(),
      expense_date: form.elements.expense_date.value,
      notes: form.elements.notes.value.trim()
    };
  }
  function validateForm(data) {
    if (!data.description || !data.category) {
      return "Description and category are required.";
    }
    if (!Number.isSafeInteger(data.amount) || data.amount <= 0) {
      return "Enter a positive whole amount in naira.";
    }
    if (!isValidDate(data.expense_date)) {
      return "Enter a valid expense date.";
    }
    return null;
  }
  function showReview() {
    if (!form.reportValidity()) return false;
    const data = getFormData();
    const validationError = validateForm(data);
    if (validationError) {
      errorBox.textContent = validationError;
      errorBox.style.display = "block";
      return false;
    }
    reviewContent.innerHTML = `
      <div><strong>Description:</strong> ${escapeHtml(data.description)}</div>
      <div><strong>Category:</strong> ${escapeHtml(data.category)}</div>
      <div><strong>Amount:</strong> ₦${data.amount.toLocaleString("en-NG")}</div>
      <div><strong>Recipient:</strong> ${escapeHtml(data.recipient || "Not specified")}</div>
      <div><strong>Date:</strong> ${escapeHtml(data.expense_date)}</div>
      <div><strong>Notes:</strong> ${escapeHtml(data.notes || "None")}</div>
      <div><strong>Type:</strong> ${expenseType}</div>
      ${
        isTournamentExpense
          ? `<div><strong>Tournament:</strong> ${escapeHtml(
              currentTournament?.name ||
              currentTournament?.title ||
              "Current tournament"
            )}</div>`
          : "<div><strong>Tournament:</strong> None</div>"
      }
    `;
    reviewPanel.style.display = "block";
    errorBox.style.display = "none";
    reviewBtn.textContent = "Update Review";
    return true;
  }
  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });
  modal.addEventListener("click", event => {
    if (event.target === modal) modal.remove();
  });
  reviewBtn.addEventListener("click", showReview);
  form.addEventListener("input", () => {
    reviewPanel.style.display = "none";
    reviewBtn.textContent = "Review Details";
    errorBox.style.display = "none";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitBtn.disabled) return;
    if (!showReview()) return;
    if (isTournamentExpense && currentTournament?.id !== tournamentId) {
      errorBox.textContent =
        "The current tournament has changed. Close this form and try again.";
      errorBox.style.display = "block";
      return;
    }
    const data = getFormData();
    const confirmed = confirm(
      `Submit this ${expenseType.toLowerCase()} for ₦${data.amount.toLocaleString("en-NG")}?`
    );
    if (!confirmed) return;
    const payload = {
      description: data.description,
      category: data.category,
      amount: data.amount,
      recipient: data.recipient || null,
      expense_date: data.expense_date,
      notes: data.notes || null
    };
    if (isTournamentExpense) {
      payload.tournament_id = tournamentId;
    }
    submitBtn.disabled = true;
    reviewBtn.disabled = true;
    cancelBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    errorBox.style.display = "none";
    showLoader();
    try {
      const response = await apiRequest(`${API}/financial/expenses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response) {
        submitBtn.disabled = false;
        reviewBtn.disabled = false;
        cancelBtn.disabled = false;
        submitBtn.textContent = "Confirm & Submit";
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to create expense.");
      }
      modal.remove();
      showAlert("Expense created successfully.");
      await loadFinancialExpenses();
    } catch (error) {
      errorBox.textContent =
        error.message || "Unable to create expense.";
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      reviewBtn.disabled = false;
      cancelBtn.disabled = false;
      submitBtn.textContent = "Confirm & Submit";
    } finally {
      hideLoader();
    }
  });
}

async function approveFinancialExpense(id) {
  if (!id) return;
  const confirmed = await showConfirmModal(
    "Are you sure you want to approve this expense?",
    "Approve Expense",
    "Cancel"
  );
  if (!confirmed) return;
  showLoader();
  try {
    const response = await apiRequest(
      `${API}/financial/expenses/${encodeURIComponent(id)}/approve`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    );
    if (!response) {
      throw new Error("No response received. Please try again.");
    }
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to approve expense."
      );
    }
    showAlert(
      result.message || "Expense approved successfully."
    );
    await loadFinancialExpenses();
  } catch (error) {
    showAlert(
      error.message || "Unable to approve expense."
    );
  } finally {
    hideLoader();
  }
}

async function payFinancialExpense(id) {
  if (!id) {
    showAlert("Expense ID is missing.");
    return;
  }
  document.getElementById("expensePaymentModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "expensePaymentModal";
  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:100000;
    background:rgba(0,0,0,0.65);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
    box-sizing:border-box;
    overflow-y:auto;
  `;
  modal.innerHTML = `
    <div style="
      width:100%;
      max-width:460px;
      max-height:90vh;
      overflow-y:auto;
      box-sizing:border-box;
      padding:22px;
      border-radius:14px;
      background:#fff;
      color:#111827;
      box-shadow:0 15px 45px rgba(0,0,0,0.2);
      font-family:inherit;
    ">
      <h2 style="margin:0 0 8px;font-size:22px;">
        Record Expense Payment
      </h2>
      <p style="margin:0 0 20px;color:#666;font-size:14px;">
        Enter the details of the payment already made.
      </p>
      <form id="expensePaymentForm">
        <label for="expensePaymentReference" style="
          display:block;
          margin-bottom:7px;
          font-size:14px;
          font-weight:600;
        ">Payment Reference *</label>
        <input
          id="expensePaymentReference"
          name="payment_reference"
          type="text"
          maxlength="200"
          required
          placeholder="Enter transaction reference"
          style="
            display:block;
            width:100%;
            box-sizing:border-box;
            padding:12px;
            margin-bottom:18px;
            border:1px solid #d1d5db;
            border-radius:8px;
            background:#fff;
            color:#111827;
            font:inherit;
          "
        >
        <label for="expensePaymentMethod" style="
          display:block;
          margin-bottom:7px;
          font-size:14px;
          font-weight:600;
        ">Payment Method *</label>
        <select
          id="expensePaymentMethod"
          name="payment_method"
          required
          style="
            display:block;
            width:100%;
            box-sizing:border-box;
            padding:12px;
            margin-bottom:18px;
            border:1px solid #d1d5db;
            border-radius:8px;
            background:#fff;
            color:#111827;
            font:inherit;
          "
        >
          <option value="">Select payment method</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="USSD">USSD</option>
          <option value="Mobile Banking">Mobile Banking</option>
          <option value="Cash">Cash</option>
          <option value="Other">Other</option>
        </select>
        <div id="expensePaymentReview" style="
          display:none;
          padding:14px;
          margin-bottom:18px;
          border:1px solid #bfdbfe;
          border-radius:9px;
          background:#eff6ff;
          color:#1e3a8a;
          font-size:14px;
          line-height:1.8;
          overflow-wrap:anywhere;
        "></div>
        <div id="expensePaymentError" style="
          display:none;
          margin-bottom:12px;
          color:#b91c1c;
          font-size:14px;
          overflow-wrap:anywhere;
        " role="alert"></div>
        <div style="
          display:flex;
          flex-wrap:nowrap;
          gap:7px;
          margin-top:20px;
        ">
          <button
            type="button"
            id="expensePaymentCancel"
            style="
              flex:1;
              min-width:0;
              padding:10px 4px;
              border:1px solid #e5e7eb;
              border-radius:8px;
              background:#f3f4f6;
              color:#374151;
              font-size:12px;
              font-weight:600;
            "
          >Cancel</button>
          <button
            type="button"
            id="expensePaymentReviewButton"
            style="
              flex:1;
              min-width:0;
              padding:10px 4px;
              border:1px solid #bfdbfe;
              border-radius:8px;
              background:#eff6ff;
              color:#1d4ed8;
              font-size:12px;
              font-weight:600;
            "
          >Review</button>
          <button
            type="submit"
            id="expensePaymentSubmit"
            style="
              flex:1;
              min-width:0;
              padding:10px 4px;
              border:0;
              border-radius:8px;
              background:#2563eb;
              color:#fff;
              font-size:12px;
              font-weight:600;
            "
          >Confirm Payment</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector("#expensePaymentForm");
  const cancelBtn = modal.querySelector("#expensePaymentCancel");
  const reviewBtn = modal.querySelector("#expensePaymentReviewButton");
  const submitBtn = modal.querySelector("#expensePaymentSubmit");
  const reviewPanel = modal.querySelector("#expensePaymentReview");
  const errorBox = modal.querySelector("#expensePaymentError");
  let reviewedReference = null;
  let reviewedMethod = null;
  let submitting = false;
  function getPaymentData() {
    return {
      payment_reference: form.elements.payment_reference.value.trim(),
      payment_method: form.elements.payment_method.value
    };
  }
  function resetReview() {
    reviewedReference = null;
    reviewedMethod = null;
    reviewPanel.style.display = "none";
    reviewPanel.replaceChildren();
    errorBox.style.display = "none";
  }
  cancelBtn.addEventListener("click", () => {
    if (!submitting) modal.remove();
  });
  modal.addEventListener("click", event => {
    if (event.target === modal && !submitting) {
      modal.remove();
    }
  });
  form.addEventListener("input", resetReview);
  form.addEventListener("change", resetReview);
  reviewBtn.addEventListener("click", () => {
    if (!form.reportValidity()) return;
    const data = getPaymentData();
    if (!data.payment_reference || !data.payment_method) {
      errorBox.textContent = "Complete all payment details.";
      errorBox.style.display = "block";
      return;
    }
    const reference = document.createElement("div");
    reference.textContent = `Payment Reference: ${data.payment_reference}`;
    const method = document.createElement("div");
    method.textContent = `Payment Method: ${data.payment_method}`;
    const warning = document.createElement("p");
    warning.textContent = "Confirm that this expense has actually been paid before proceeding.";
    reviewPanel.replaceChildren(reference, method, warning);
    reviewPanel.style.display = "block";
    reviewedReference = data.payment_reference;
    reviewedMethod = data.payment_method;
    errorBox.style.display = "none";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const data = getPaymentData();
    if (
      !data.payment_reference ||
      !data.payment_method ||
      data.payment_reference !== reviewedReference ||
      data.payment_method !== reviewedMethod
    ) {
      errorBox.textContent = "Review your payment details before continuing.";
      errorBox.style.display = "block";
      return;
    }
    const confirmed = await showConfirmModal(
      "Confirm that this expense has actually been paid. This will mark it as paid in your financial records.",
      "Confirm Payment",
      "Cancel"
    );
    if (!confirmed) return;
    submitting = true;
    submitBtn.disabled = true;
    reviewBtn.disabled = true;
    cancelBtn.disabled = true;
    submitBtn.textContent = "Recording...";
    showLoader();
    try {
      const response = await apiRequest(
        `${API}/financial/expenses/${encodeURIComponent(id)}/pay`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        }
      );
      if (!response) {
        throw new Error("No response received. Please try again.");
      }
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText || `Invalid server response (${response.status}).`
        );
      }
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Failed to record payment (${response.status}).`
        );
      }
      modal.remove();
      showAlert(
        result.message || "Expense payment recorded successfully."
      );
      await loadFinancialExpenses();
    } catch (error) {
      submitting = false;
      submitBtn.disabled = false;
      reviewBtn.disabled = false;
      cancelBtn.disabled = false;
      submitBtn.textContent = "Confirm Payment";
      errorBox.textContent =
        error.message || "Unable to record expense payment.";
      errorBox.style.display = "block";
    } finally {
      hideLoader();
    }
  });
}


async function loadFinancialContributions() {
  const container = document.getElementById("financialContributionContent");
  const summary = document.getElementById("financialContributionSummary");
  if (!container || !summary) {
    console.error("Financial contribution containers were not found.");
    return;
  }
  container.innerHTML = `
    <div class="payment-history-empty">
      Loading contributions...
    </div>
  `;
  try {
    const tournamentId = currentTournament?.id;
    const query = tournamentId ?
      `?tournament_id=${encodeURIComponent(tournamentId)}` :
      "";
    const response = await apiRequest(
      `${API}/financial/contributions${query}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    );
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        responseText || `Invalid server response (${response.status}).`
      );
    }
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || `Failed to load contributions (${response.status}).`
      );
    }
    const contributions = Array.isArray(result.contributions) ?
      result.contributions :
      [];
    const sponsorships = contributions.filter(
      item => item.contribution_type === "sponsorship"
    );
    const adminContributions = contributions.filter(
      item => item.contribution_type === "admin_contribution"
    );
    const sponsorshipTotal = sponsorships.reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );
    const adminTotal = adminContributions.reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );
    summary.innerHTML = `
      <div class="payment-history-summary-card">
        <span>Total Sponsorships</span>
        <strong>${escapeHtml(formatPaymentMoney(sponsorshipTotal))}</strong>
        <small>${sponsorships.length} record(s)</small>
      </div>
      <div class="payment-history-summary-card">
        <span>Admin Contributions</span>
        <strong>${escapeHtml(formatPaymentMoney(adminTotal))}</strong>
        <small>${adminContributions.length} record(s)</small>
      </div>
      <div class="payment-history-summary-card">
        <span>Total Contributions</span>
        <strong>${escapeHtml(formatPaymentMoney(sponsorshipTotal + adminTotal))}</strong>
        <small>${contributions.length} record(s)</small>
      </div>
    `;
    if (!contributions.length) {
      container.innerHTML = `
        <div class="payment-history-empty">
          No sponsorships or contributions have been recorded yet.
        </div>
      `;
      return;
    }
    container.innerHTML = contributions.map(item => {
      const isSponsorship =
        item.contribution_type === "sponsorship";
      const type = isSponsorship ?
        "Sponsorship" :
        "Admin Contribution";
      return `
        <div class="financial-record-card">
          <div class="financial-record-main">
            <div>
              <h4>${escapeHtml(item.contributor_name || "Unknown contributor")}</h4>
              <span class="financial-record-type">
                ${type}
              </span>
            </div>
            <strong>
              ${escapeHtml(formatPaymentMoney(Number(item.amount || 0)))}
            </strong>
          </div>
          <div class="financial-record-details">
            <span>
              Date: ${escapeHtml(
                item.received_at
                  ? formatFinancialDate(item.received_at)
                  : "Not specified"
              )}
            </span>
            ${item.payment_method ? `
              <span>
                Method: ${escapeHtml(item.payment_method)}
              </span>
            ` : ""}
            ${item.payment_reference ? `
              <span>
                Reference: ${escapeHtml(item.payment_reference)}
              </span>
            ` : ""}
            ${item.notes ? `
              <p>${escapeHtml(item.notes)}</p>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Load financial contributions error:", error);
    summary.innerHTML = "";
    container.innerHTML = `
      <div class="payment-history-empty">
        ${escapeHtml(error.message || "Unable to load contributions.")}
        <button type="button" onclick="loadFinancialContributions()">
          Try Again
        </button>
      </div>
    `;
  }
}

function openCreateFinancialContributionForm() {
  const user = getCurrentUser();

  if (!user || user.role !== "admin") {
    showAlert("Only administrators can record contributions.");
    return;
  }

  const modal = document.getElementById("financialContributionModal");
  const form = document.getElementById("financialContributionForm");
  const dateInput = document.getElementById("contributionReceivedAt");

  if (!modal || !form) {
    showAlert("Contribution form was not found.");
    return;
  }

  form.reset();

  if (dateInput) {
    dateInput.value = new Date().toLocaleDateString("en-CA");
  }

  modal.hidden = false;
}

function closeFinancialContributionForm() {
  const modal = document.getElementById("financialContributionModal");

  if (modal) {
    modal.hidden = true;
  }
}




document.getElementById("financialContributionForm")?.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const user = getCurrentUser();

    if (!user || user.role !== "admin") {
      showAlert("Only administrators can record contributions.");
      return;
    }

    const submitButton = document.getElementById(
      "submitFinancialContributionBtn"
    );

    const amount = Number(
      document.getElementById("contributionAmount").value
    );

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      showAlert("Enter a valid positive amount in naira.");
      return;
    }

    const payload = {
      contribution_type: document.getElementById("contributionType").value,
      contributor_name: document.getElementById("contributorName").value.trim(),
      amount,
      payment_method:
        document.getElementById("contributionPaymentMethod").value || null,
      payment_reference:
        document.getElementById("contributionPaymentReference").value.trim() || null,
      received_at:
        document.getElementById("contributionReceivedAt").value || null,
      notes:
        document.getElementById("contributionNotes").value.trim() || null,
      tournament_id: currentTournament?.id || null
    };

    if (!payload.contributor_name) {
      showAlert("Enter the sponsor or contributor name.");
      return;
    }

    if (!["sponsorship", "admin_contribution"].includes(payload.contribution_type)) {
      showAlert("Select a valid contribution type.");
      return;
    }

    submitButton.disabled = true;

    try {
      const response = await apiRequest(
        `${API}/financial/contributions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response || response.success === false) {
        throw new Error(response?.message || "Failed to save contribution.");
      }

      closeFinancialContributionForm();
      showAlert("Contribution recorded successfully.");

      await loadFinancialContributions();
      await loadFinancialSummary();
    } catch (error) {
      showAlert(error.message || "Unable to save contribution.");
    } finally {
      submitButton.disabled = false;
    }
  }
);



function comparisonSearchEscapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}

function comparisonResultsEscape(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}



window.addEventListener("load", async () => {
  showLoader();
  try {
    const loggedIn = await verifySession();
    if (loggedIn) {
      hideAllPages();
      
await registerSW();
await checkNotificationSubscription();      
      bindSeasonRegistrationEvents();
      const returnedFromPayment = 
      await goToCompetitionPage();
      loadMyCompetitions();
      await renderCompetitionList();
      handlePaymentReturn();
      offerBiometricLogin();
      
    } else {
      goToLoginPage();
    }
  } catch (error) {
    console.error("Application initialization error:", error);
  } finally {
    hideLoader();
  }
});



