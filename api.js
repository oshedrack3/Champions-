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



async function uploadTeamLogo(tournamentId, teamName, logo) {
  const token = getToken();
  
  const res = await fetch(`${API}/tournaments/${tournamentId}/team-logo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({
      teamName,
      logo
    })
  });
  
  const result = await res.json();
  
  if (!res.ok || !result.success) {
    throw new Error(result.message || "Failed to upload logo.");
  }
  
  return result.imageUrl;
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
  
  tournamentEvents.addEventListener(
    "tournament-update",
    async (event) => {
      
      try {
        
        const data = JSON.parse(event.data);
        
        if (data.type !== "TOURNAMENT_UPDATED") {
          return;
        }
        
        currentTournament = await getTournament(tournamentId);
        
        renderFixtures();
        
        if (currentTournament.format === "league") {
          renderTable(currentTournament.table);
        }
        
      } catch (err) {
        console.error(err);
      }
      
    }
  );
  
  tournamentEvents.onerror = () => {
    console.log("Tournament event disconnected");
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
window.addEventListener("load", async () => {
  showLoader();
  
  const loggedIn = await verifySession();
  
  if (loggedIn) {
    hideAllPages();
    await renderTournamentList();
    goToListOfTournamentPage();
    startNotificationEvents();
    loadNotifications();
    
  } else {
    goToLoginPage();
  }
  
  hideLoader();
});
