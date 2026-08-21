const API = "https://tour-backend-vohh.onrender.com";
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

async function getMyTournaments() {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/my`,
    {
      headers: {
        Authorization: token
      }
    },
    getMyTournaments
  );
  
  if (!res) return [];
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to load tournaments.");
  }
  
  return result.tournaments;
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
  
  const res = await fetch(`${API}/tournaments/${id}`, {
    headers: {
      Authorization: token
    }
  });
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to load tournament.");
  }
  
  return result.tournament;
}

async function submitMatchResult(data) {
  
  const token = getToken();
  
  const res = await fetch(
    `${API}/tournaments/${data.tournamentId}/match-submission`,
    {
      method: "POST",
      
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      
      body: JSON.stringify({
        matchId: data.matchId,
        homeGoals: data.homeGoals,
        awayGoals: data.awayGoals,
        screenshot: data.screenshot
      })
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Failed to submit result."
    );
  }
  
  return result;
  
}

async function getMatchSubmissions(tournamentId) {
  
  const token = getToken();
  
  const res = await fetch(
    `${API}/tournaments/${tournamentId}/match-submissions`,
    {
      headers: {
        Authorization: token
      }
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Failed to load submissions."
    );
  }
  
  return result.submissions || [];
  
}
async function rebuildTournamentTable(tournamentId) {
  const token = getToken();
  
  const res = await fetch(
    `${API}/tournaments/${tournamentId}/rebuild-table`,
    {
      method: "POST",
      headers: {
        Authorization: token
      }
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message);
  }
  
  return result.tournament;
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
      method: "POST",
      
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      
      body: JSON.stringify({
        action,
        rejectionReason
      })
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(
      result.message || "Review failed."
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



function startTournamentEvents(tournamentId) {
  
  if (tournamentEvents) {
    tournamentEvents.close();
  }
  
  tournamentEvents = new EventSource(
    `${API}/tournaments/${tournamentId}/events?token=${encodeURIComponent(getToken())}`
  );
  
  tournamentEvents.onopen = () => {
    console.log("Tournament SSE connected");
  };
  
  tournamentEvents.addEventListener(
    "tournament-update",
    async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type !== "TOURNAMENT_UPDATED") {
          return;
        }
        
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
        console.error(err);
      }
    }
  );
  
  tournamentEvents.onerror = () => {
    console.log("Tournament SSE connection failed");
  };
}

async function loadNotifications() {
  
  const res = await fetch(
    `${API}/notifications`,
    {
      headers: {
        Authorization: getToken()
      }
    }
  );
  
  
  const data = await res.json();
  
  
  if (data.success) {
    
    notifications = data.notifications;
    
    renderNotifications();
    
  }
  
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
      
      const notification = JSON.parse(
        event.data
      );
      
      console.log(
        "New notification:",
        notification
      );
      
      handleNewNotification(notification);
      
    }
  );
  
  
  notificationEvents.onerror = (err) => {
    console.log(
      "Notification connection lost",
      err
    );
  };
  
}

function handleNewNotification(notification) {
  
  notifications.unshift(notification);
  
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
  
  const res = await fetch(
    `${API}/competitions/my`,
    {
      headers: {
        Authorization: token
      }
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to load competitions.");
  }
  
  return result.competitions;
}

async function getPublicCompetitions() {
  const token = getToken();
  
  const res = await fetch(
    `${API}/competitions/public`,
    {
      headers: {
        Authorization: token
      }
    }
  );
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to load public competitions.");
  }
  
  return result.competitions;
}
async function getHallOfFame() {
  const token = getToken();
  
  const res = await apiRequest(
    `${API}/tournaments/hall-of-fame`,
    {
      method: "GET",
      headers: {
        Authorization: token
      }
    },
    getHallOfFame
  );
  
  if (!res) return null;
  
  const result = await res.json();
  
  if (!res.ok || !result.hallOfFame) {
    throw new Error(
      result.message || "Failed to load Hall of Fame."
    );
  }
  
  return result.hallOfFame;
}
async function saveHallOfFame() {
  if (!hallOfFameAdminData) return;

  try {
    showLoader();

    const token = getToken();

    const res = await apiRequest(
      `${API}/tournaments/hall-of-fame`,
      {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          categories:
            hallOfFameAdminData.categories
        })
      },
      saveHallOfFame
    );

    if (!res) return;

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result.message ||
        "Failed to save Hall of Fame."
      );
    }

    hallOfFameAdminData =
      result.hallOfFame;

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
    showAlert("You must be logged in to join.");
    return;
  }
  
  showLoader();
  
  try {
    const res = await apiRequest(
      `${API}/tournaments/${tournamentId}/join`,
      {
        method: "POST",
        headers: {
          Authorization: token
        }
      },
      () => joinTournament(tournamentId)
    );
    
    if (!res) return;
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(result.message || "Failed to join tournament.");
    }
    
    showActionModal("Successfully joined tournament", "success");
    
    await loadPublicTournaments();
    
    
  } catch (err) {
    showAlert(err.message || "Join failed");
  } finally {
    hideLoader();
  }
}
async function getPublicTournaments() {
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
      getPublicTournaments
    );
    
    if (!res) return [];
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(result.message || "Failed to load public tournaments.");
    }
    
    return result.tournaments || [];
    
  } catch (err) {
    showAlert(err.message || "Error loading tournaments");
    return [];
    
  } finally {
    hideLoader();
  }
}

async function subscribeUser() {
  const reg = await navigator.serviceWorker.ready;
  
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: "BMH9R6X0Z8y6nZzJqZ9dJX0FzYq2kK5F2o0z7W9n2lC0ZxV5m8g1yJ7u3m2c5X9yQ8F3nP4L6vT2bH1wZ0kQ"
  });
  
  console.log("Subscription:", subscription);
  
  
  await fetch("/api/save-subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + getToken()
    },
    body: JSON.stringify(subscription)
  });
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


async function createNotice() {
  const title =
    document.getElementById("noticeTitle").value.trim();
  
  const category =
    document.getElementById("noticeCategory").value;
  
  const content =
    document.getElementById("noticeContent").value.trim();
  
  const files =
    Array.from(
      document.getElementById("noticeImages").files || []
    );
  
  const published =
    document.getElementById("noticePublished").checked;
  
  const noExpiry =
    document.getElementById("noticeNoExpiry").checked;
  
  const expiryValue =
    document.getElementById("noticeExpiresAt").value;
  
  if (!title) {
    showAlert("Enter a notice title.");
    return;
  }
  
  if (!content) {
    showAlert("Enter the notice content.");
    return;
  }
  
  let expiresAt = null;
  
  if (!noExpiry) {
    if (!expiryValue) {
      showAlert("Select an expiry date.");
      return;
    }
    
    expiresAt = new Date(expiryValue).getTime();
    
    if (
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      showAlert("Expiry date must be in the future.");
      return;
    }
  }
  
  if (files.length > 10) {
    showAlert("You can upload a maximum of 10 images.");
    return;
  }
  
  showLoader();
  
  try {
    const images = [];
    
    for (const file of files) {
      const base64 =
        await fileToBase64(file, 1200);
      
      images.push(base64);
    }
    
    const response = await apiRequest(
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
    
    if (!response) return;
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Failed to create notice."
      );
    }
    
    closeNoticeBoardModal();
    
    showActionModal(
      "Notice published successfully.",
      "success"
    );
    
  } catch (err) {
    console.error("[createNotice]", err);
    
    showAlert(
      err.message ||
      "Failed to create notice."
    );
    
  } finally {
    hideLoader();
  }
}


async function getNotices() {
  const token = getToken();
  
  if (!token) {
    throw new Error("Invalid session.");
  }
  
  const response = await apiRequest(
    `${API}/notices`,
    {
      method: "GET",
      headers: {
        Authorization: token
      }
    },
    getNotices
  );
  
  if (!response) return [];
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
      "Failed to load notices."
    );
  }
  
  return data.notices || [];
}