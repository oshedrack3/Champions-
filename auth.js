async function handleLogin() {
  const loginValue = document.getElementById("loginInput").value.trim();
  const password = document.getElementById("loginPassword").value;
  
  if (!loginValue || !password) {
    showAlert("Please fill in all fields.");
    return;
  }
  
   const user = await login(loginValue, password);
  
  
  
  if (!user) return;
  await goToCompetitionPage();
  loadMyCompetitions();
  startNotificationEvents();
  loadNotifications();
  await renderCompetitionList();

  

}

async function handleLogout() {
  closeMenu();
  const confirmed = await showConfirmModal("Are you sure you want to log out?", "Logout", "Cancel");
  
  if (!confirmed) return;
  
  showLoader();
  
  try {
    await logout();
  } finally {
    goToLoginPage();
    hideLoader();
    
  }
}
async function login(login, password) {
  showLoader();
  
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        login,
        password
      })
    });
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(
        result.message || "Login failed."
      );
    }
    
    saveSession(
      result.token,
      result.user
    );
  
   switchAppMode();
    
    myTournaments = await getMyTournaments();
    
    hideAllPages();
    
    const list = document.getElementById("tournamentList");
    
    if (list) {
      list.innerHTML = "";
    }
    
    return result.user;
    
  } catch (err) {
  showAlert(
    err.title || "Error",
    err.message || "Something went wrong."
  );
  return null;
}    
    
   finally {
    
    hideLoader();
    
  }
}

async function logout() {
  const token = getToken();
  
  try {
    if (token) {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
    }
  } catch (err) {
    console.warn("Logout request failed:", err);
  }
  
  clearSession();
  
  document.getElementById("tournamentList").innerHTML = "";
  hideAllPages();
  
  goToLoginPage();
}

function getCurrentUser() {
  return getSession()?.user || null;
}

function switchAppMode() {
  const user = getCurrentUser();
  
  
  if (!user) {
    setAppMode("view");
    return;
  }
  
  if (user.role === "admin") {
    setAppMode("admin");
  }
  else if (user.role === "player") {
    setAppMode("player");
  }
  else {
    setAppMode("view");
  }
}