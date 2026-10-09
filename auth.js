async function handleLogin() {
  const loginValue =
    document.getElementById("loginInput").value.trim();
  
  const password =
    document.getElementById("loginPassword").value;
  
  if (!loginValue || !password) {
    showAlert("Please fill in all fields.");
    return;
  }
  
  try {
    const user =
      await login(
        loginValue,
        password
      );
    
    if (!user) {
      return;
    }
    
    window.location.reload();
    
  } catch (error) {
    console.error(
      "Login error:",
      error
    );
    
    showAlert(
      error.message ||
      "Login failed. Please try again."
    );
  }
}
async function handlePasswordReset(email, phone, password) {
  showLoader();
  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        phone,
        password
      })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(
        result.message || "Password reset failed."
      );
    }
    await showAlert(
      result.message || "Password reset successfully."
    );
    return true;
  } catch (error) {
    await showAlert(
      error.message || "Unable to reset password."
    );
    return false;
  } finally {
    hideLoader();
  }
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
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker registered ✅", reg);
  } catch (err) {
    console.error("SW failed ❌", err);
  }
}
async function askPermission() {
  if (!("Notification" in window)) return;
  
  const permission = await Notification.requestPermission();
  
  console.log("Permission:", permission);
}
async function subscribeUser() {
  try {
    if (!("serviceWorker" in navigator)) {
      throw new Error(
        "Service Worker is not supported."
      );
    }
    
    if (!("PushManager" in window)) {
      throw new Error(
        "Push notifications are not supported."
      );
    }
    
    if (!("Notification" in window)) {
      throw new Error(
        "Notifications are not supported."
      );
    }
    
    const permission =
      await Notification.requestPermission();
    
    if (permission !== "granted") {
      throw new Error(
        "Notification permission was not granted."
      );
    }
    
    const reg =
      await navigator.serviceWorker.ready;
    
    const publicKey =
      "BOJKZZBKMDY282dAfh2rgiLIeNuzUJmuu2qyZRO09rSyhX_SuXzT8f6dOJijBSuTLyOKuIOMh8mniyuXbqnVChM";
    
    let subscription =
      await reg.pushManager.getSubscription();
    
    if (!subscription) {
      subscription =
        await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(
              publicKey
            )
        });
    }
    
    console.log(
      "Push subscription:",
      subscription
    );
    
    const res = await fetch(
      `${API}/subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${getToken()}`
        },
        body:
          JSON.stringify(subscription)
      }
    );
    
    const result =
      await res.json();
    
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



function showForgotPassword() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("forgotPasswordSection").style.display = "block";
}
function showLogin() {
  document.getElementById("forgotPasswordSection").style.display = "none";
  document.getElementById("loginSection").style.display = "block";
}
async function submitPasswordReset() {
  const email = document.getElementById("resetEmail").value.trim();
  const phone = document.getElementById("resetPhone").value.trim();
  const password = document.getElementById("resetPassword").value;
  const confirmPassword = document.getElementById("confirmResetPassword").value;
  if (!email || !phone || !password || !confirmPassword) {
    showAlert("Please fill in all fields.");
    return;
  }
  if (password.length < 6) {
    showAlert("Password must be at least 6 characters.");
    return;
  }
  if (password !== confirmPassword) {
    showAlert("Passwords do not match.");
    return;
  }
  const success = await handlePasswordReset(email, phone, password);
  if (success) {
    document.getElementById("resetEmail").value = "";
    document.getElementById("resetPhone").value = "";
    document.getElementById("resetPassword").value = "";
    document.getElementById("confirmResetPassword").value = "";
    showLogin();
  }
}

