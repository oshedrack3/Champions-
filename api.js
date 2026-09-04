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
  
  const res = await fetch(`${API}/tournaments/${id}/details`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(data)
  });
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to update tournament details.");
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
        screenshot: data.screenshot
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
    return showAlert(
      "Enter both scores."
    );
  }
  
  const file =
    document
      .getElementById("matchScreenshot")
      .files[0];
  
  if (!file) {
    return showAlert(
      "Please upload a match screenshot."
    );
  }
  
  showLoader();
  
  try {
    const screenshot =
      await fileToBase64(file);
    
    await submitMatchResult({
      tournamentId:
        tournament.id,
      matchId:
        currentMatch.id,
      homeGoals,
      awayGoals,
      screenshot
    });
    
    const matchIndex =
      fixtures.findIndex(
        match =>
          String(match.id) ===
          String(currentMatch.id)
      );
    
    if (matchIndex !== -1) {
      fixtures[matchIndex] = {
        ...fixtures[matchIndex],
        submission_status:
          "pending"
      };
    }
    
    currentMatch = {
      ...currentMatch,
      submission_status:
        "pending"
    };
    
    closeResultRecord();
    
    showActionModal(
      "Result submitted for admin approval.",
      "success"
    );
    
    await renderFixtures();
    
  } catch (err) {
    
    console.error(err);
    
    showAlert(
      err.message
    );
    
  } finally {
    
    hideLoader();
    
  }
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

async function loadNotifications(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCachedData(
      "notifications"
    );
    
    if (cached) {
      notifications = cached;
      renderNotifications();
      return cached;
    }
  }
  
  const res = await apiRequest(
    `${API}/notifications`,
    {
      headers: {
        Authorization: getToken()
      }
    },
    () => loadNotifications(forceRefresh)
  );
  
  if (!res) return [];
  
  const data = await res.json();
  
  if (!res.ok || !data.success) {
    throw new Error(
      data.message ||
      "Failed to load notifications."
    );
  }
  
  notifications =
    data.notifications || [];
  
  await saveCachedData(
    "notifications",
    "",
    notifications
  );
  
  renderNotifications();
  
  return notifications;
}

function startNotificationEvents() {
  if (notificationEvents) {
    notificationEvents.close();
  }
  
  const token = getToken();
  
  notificationEvents = new EventSource(
    `${API}/notifications/events?token=${token}`
  );
  
  notificationEvents.addEventListener(
    "connected",
    (event) => {
      console.log(
        "Notification connected",
        event.data
      );
    }
  );
  
  notificationEvents.addEventListener(
    "notification",
    (event) => {
      const notification =
        JSON.parse(event.data);
      
      console.log(
        "New notification:",
        notification
      );
      
      handleNewNotification(
        notification
      );
    }
  );
  
  notificationEvents.onerror = (err) => {
    console.log(
      "Notification connection lost",
      err
    );
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

async function joinTournament(tournamentId) {
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
      result.players :
      [];
    
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
              String(player.team_id),
              player
            ]
          )
        );
      
      updatedPlayers.forEach(
        player => {
          existingPlayers.set(
            String(player.team_id),
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
      
      await rebuildTableFromMatches();
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

async function subscribeUser() {
  try {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service Worker is not supported.");
    }
    
    if (!("PushManager" in window)) {
      throw new Error("Push notifications are not supported.");
    }
    
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted.");
    }
    
    const reg = await navigator.serviceWorker.ready;
    
    const publicKey =
      "BB0Mj76Yp4Of8Z3PdEzapp7mUSe05UwIPmjGNMFvdfZ5g4Wzub4YzBs4I_mUXT7vlpD286h2vi4mCvnKBTa1IrU";
    
    const subscription =
      await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    
    console.log(
      "Push subscription:",
      subscription
    );
    
    const res = await fetch(
      `${API}/api/push/subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(subscription)
      }
    );
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(
        result.message ||
        "Failed to save push subscription."
      );
    }
    
    console.log(
      "Push subscription saved successfully."
    );
    
    return subscription;
    
  } catch (err) {
    console.error(
      "Push subscription failed:",
      err
    );
    
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding =
    "=".repeat(
      (4 - (base64String.length % 4)) % 4
    );
  
  const base64 =
    (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  
  const rawData = atob(base64);
  
  return Uint8Array.from(
    [...rawData].map(
      char => char.charCodeAt(0)
    )
  );
}

window.addEventListener("load", async () => {
  showLoader();
  
  const loggedIn = await verifySession();
  
  if (loggedIn) {
    hideAllPages();
    await goToCompetitionPage();
    loadMyCompetitions();
    await renderCompetitionList();
    startNotificationEvents();
    await loadNotifications();
    await registerSW();
    await askPermission();
    await subscribeUser();
    
  } else {
    goToLoginPage();
  }
  
  hideLoader();
});

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


async function getNotices() {
  const token =
    getToken();
  
  if (!token) {
    throw new Error(
      "Invalid session."
    );
  }
  
  let notices =
    await getCachedData(
      "notices"
    );
  
  if (!Array.isArray(notices)) {
    notices = [];
  }
  
  const cachedSync =
    await getCachedData(
      "noticesSync"
    );
  
  const lastChangeId =
    cachedSync &&
    Number.isInteger(
      Number(cachedSync.lastChangeId)
    ) ?
    Number(cachedSync.lastChangeId) :
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
    Array.isArray(data.notices) ?
    data.notices : [];
  
  const deleted =
    Array.isArray(data.deleted) ?
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
      Number(notice.expires_at) >
      Date.now()
    );
  
  notices.sort(
    (a, b) =>
    Number(b.created_at || 0) -
    Number(a.created_at || 0)
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
        data.lastChangeId ||
        lastChangeId
      )
    }
  );
  
  return notices;
}
async function createNotice() {
  const title =
    document
    .getElementById("noticeTitle")
    .value
    .trim();
  
  const category =
    document
    .getElementById("noticeCategory")
    .value;
  
  const content =
    document
    .getElementById("noticeContent")
    .value
    .trim();
  
  const files =
    Array.from(
      document
      .getElementById("noticeImages")
      .files || []
    );
  
  const published =
    document
    .getElementById("noticePublished")
    .checked;
  
  const noExpiry =
    document
    .getElementById("noticeNoExpiry")
    .checked;
  
  const expiryValue =
    document
    .getElementById("noticeExpiresAt")
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
    
    for (const file of files) {
      const base64 =
        await fileToBase64(
          file,
          1200
        );
      
      images.push(base64);
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
      let notices =
        await getCachedData(
          "notices"
        );
      
      if (!Array.isArray(notices)) {
        notices = [];
      }
      
      const noticeMap =
        new Map(
          notices.map(
            notice => [
              notice.id,
              notice
            ]
          )
        );
      
      noticeMap.set(
        data.notice.id,
        data.notice
      );
      
      notices =
        Array.from(
          noticeMap.values()
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
    }
    
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
async function handleRegister() {
  const username =
    document.getElementById("registerUsername").value.trim();
  const email =
    document.getElementById("registerEmail").value.trim();
  const password =
    document.getElementById("registerPassword").value;
  const role =
    document.getElementById("registerRole").value;
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
    console.log("REGISTER HTTP STATUS:", res.status);
    console.log("REGISTER HTTP OK:", res.ok);
    const responseText = await res.text();
    console.log(
      "REGISTER RAW RESPONSE:",
      responseText
    );
    let result;
    try {
      result = JSON.parse(responseText);
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
    if (!res.ok || !result.success) {
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
    )?.textContent || "";
  const phoneText =
    document.getElementById(
      "profilePhone"
    )?.textContent || "";
  if (usernameInput) {
    usernameInput.value =
      username === "Username" ?
      "" :
      username.trim();
  }
  if (phoneInput) {
    phoneInput.value =
      phoneText
      .replace(/^WhatsApp:\s*/i, "")
      .trim();
    if (
      phoneInput.value ===
      "WhatsApp number not added"
    ) {
      phoneInput.value = "";
    }
  }
  if (message) {
    message.style.display = "none";
    message.textContent = "";
    message.className =
      "update-profile-message";
  }
  modal.style.display = "flex";
  modal.setAttribute(
    "aria-hidden",
    "false"
  );
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
  modal.style.display = "none";
  modal.setAttribute(
    "aria-hidden",
    "true"
  );
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