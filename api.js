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
  const cachedProfile =
    await getCachedData("profile");
  
  let profile =
    cachedProfile &&
    typeof cachedProfile === "object" ?
    cachedProfile :
    {
      username: "",
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
      result.message ||
      "Failed to load profile."
    );
  }
  
  profile =
    result.profile || {
      username: "",
      teams: []
    };
  
  await saveCachedData(
    "profile",
    "",
    profile
  );
  
  return profile;
}


function openUpdateProfile() {
  const modal =
    document.getElementById(
      "updateProfileModal"
    );
  const usernameInput =
    document.getElementById(
      "updateProfileUsername"
    );
  const phoneInput =
    document.getElementById(
      "updateProfilePhone"
    );
  const message =
    document.getElementById(
      "updateProfileMessage"
    );
  if (!modal) {
    return;
  }
  const username =
    document.getElementById(
      "profileUsername"
    )?.textContent
    ?.trim() || "";
  const phoneText =
    document.getElementById(
      "profilePhone"
    )?.textContent
    ?.trim() || "";
  let phone =
    phoneText.replace(
      /^WhatsApp:\s*/i,
      ""
    ).trim();
  if (
    phone ===
    "WhatsApp number not added"
  ) {
    phone = "";
  }
  if (usernameInput) {
    usernameInput.value =
      username === "Username" ?
      "" :
      username;
  }
  if (phoneInput) {
    phoneInput.value =
      phone;
  }
  if (message) {
    message.style.display =
      "none";
    message.textContent =
      "";
    message.className =
      "update-profile-status";
  }
  modal.style.display =
    "flex";
  modal.setAttribute(
    "aria-hidden",
    "false"
  );
  loadProfileSquad();
  setTimeout(() => {
    usernameInput?.focus();
  }, 50);
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
  const usernameInput =
    document.getElementById(
      "updateProfileUsername"
    );
  const phoneInput =
    document.getElementById(
      "updateProfilePhone"
    );
  const saveButton =
    document.getElementById(
      "saveProfileBtn"
    );
  const message =
    document.getElementById(
      "updateProfileMessage"
    );
  if (
    !usernameInput ||
    !phoneInput ||
    !saveButton
  ) {
    return;
  }
  const username =
    usernameInput.value.trim();
  const phone =
    phoneInput.value.trim();
  const cachedProfile =
    await getCachedData(
      "profile"
    );
  const currentProfile =
    cachedProfile &&
    typeof cachedProfile === "object" ?
    cachedProfile : {};
  const currentUsername =
    String(
      currentProfile.username ||
      ""
    ).trim();
  const currentPhone =
    String(
      currentProfile.phone ||
      ""
    ).trim();
  if (!username) {
    if (message) {
      message.textContent =
        "Username is required.";
      message.className =
        "update-profile-status update-profile-status-error";
      message.style.display =
        "block";
    }
    usernameInput.focus();
    return;
  }
  const updates = {};
  if (
    username !== currentUsername
  ) {
    updates.username =
      username;
  }
  if (
    phone !== currentPhone
  ) {
    updates.phone =
      phone;
  }
  if (
    Object.keys(updates).length === 0
  ) {
    closeUpdateProfile();
    return;
  }
  const token =
    getToken();
  if (!token) {
    if (message) {
      message.textContent =
        "Please log in again.";
      message.className =
        "update-profile-status update-profile-status-error";
      message.style.display =
        "block";
    }
    return;
  }
  saveButton.disabled =
    true;
  saveButton.textContent =
    "Saving...";
  if (message) {
    message.style.display =
      "none";
    message.textContent =
      "";
    message.className =
      "update-profile-status";
  }
  try {
    const res =
      await apiRequest(
        `${API}/profile`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            updates
          )
        },
        saveUpdatedProfile
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
        "Failed to update profile."
      );
    }
    const profile =
      result.profile || {
        ...currentProfile,
        ...updates
      };
    await saveCachedData(
      "profile",
      "",
      profile
    );
    renderUserProfile(
      profile
    );
    if (message) {
      message.textContent =
        "Profile updated successfully.";
      message.className =
        "update-profile-status update-profile-status-success";
      message.style.display =
        "block";
    }
    setTimeout(() => {
      closeUpdateProfile();
    }, 700);
  } catch (error) {
    console.error(
      "Failed to update profile:",
      error
    );
    if (message) {
      message.textContent =
        error.message ||
        "Failed to update profile.";
      message.className =
        "update-profile-status update-profile-status-error";
      message.style.display =
        "block";
    }
  } finally {
    saveButton.disabled =
      false;
    saveButton.textContent =
      "Save Changes";
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
        
        // 3. Sort numbers from LEFT to RIGHT visually across the screen
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

async function verifyPayment(reference) {
  if (!reference) {
    showMessage("Payment reference is missing.", "error");
    return;
  }
  if (loading) return;
  loading = true;
  currentView = "mine";
  showMessage("Verifying your payment...", "info");
  renderSeasonRegistration();
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
      () => verifyPayment(reference)
    );
    if (!res) return;
    const response = await res.json();
    if (!res.ok || !response.success) {
      throw new Error(
        response.message || "Payment verification failed."
      );
    }
    await loadSeasonRegistrationData();
    showMessage(
      "Payment verified successfully. Your season registration is confirmed.",
      "success"
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    showMessage(
      error.message ||
      "We couldn't confirm your payment yet. Refresh your registrations to check again.",
      "error"
    );
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
  
  if (status === "cancelled") {
    url.searchParams.delete("status");
    url.searchParams.delete("tx_ref");
    url.searchParams.delete("reference");
    
    window.history.replaceState({}, "", url);
    
    currentView = "available";
    
    showMessage(
      "Payment was cancelled. You can try registering again.",
      "error"
    );
    
    renderSeasonRegistration();
    return true;
  }
  
  if (!reference) return false;
  
  url.searchParams.delete("status");
  url.searchParams.delete("tx_ref");
  url.searchParams.delete("reference");
  url.searchParams.delete("transaction_id");
  
  window.history.replaceState({}, "", url);
  
  currentView = "mine";
  
  verifyPayment(reference);
  
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
      await subscribeUser();
      bindSeasonRegistrationEvents();
      const url = new URL(window.location.href);
      const hasPaymentReturn =
        url.searchParams.has("status") ||
        url.searchParams.has("tx_ref") ||
        url.searchParams.has("reference") ||
        url.searchParams.has("transaction_id");
      if (hasPaymentReturn) {
        await loadSeasonRegistrationData();
        currentView = url.searchParams.get("status") === "cancelled" ?
          "available" :
          "mine";
        renderSeasonRegistration();
        handlePaymentReturn();
      } else {
        await goToCompetitionPage();
        loadMyCompetitions();
        await renderCompetitionList();
      }
    } else {
      goToLoginPage();
    }
  } catch (error) {
    console.error("Application initialization error:", error);
  } finally {
    hideLoader();
  }
});