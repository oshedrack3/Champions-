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
  if (!("serviceWorker" in navigator)) {
    console.error("Service workers are not supported on this device.");
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker registered:", reg);
    return reg;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}
async function askPermission() {
  if (!("Notification" in window)) {
    await showAlert("Notifications are not supported on this device.");
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    console.log("Notification permission:", permission);
    if (permission === "granted") {
      return true;
    }
    if (permission === "denied") {
      await showAlert(
        "Notifications are blocked. You can enable them in your device settings."
      );
      return false;
    }
    return false;
  } catch (error) {
    console.error("Notification permission error:", error);
    await showAlert("Unable to request notification permission.");
    return false;
  }
}
async function askPermission() {
  if (!("Notification" in window)) {
    await showAlert("Notifications are not supported on this device.");
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    
    console.log("Notification permission:", permission);
    
    if (permission === "granted") {
      return true;
    }
    
    if (permission === "denied") {
      await showAlert(
        "Notifications are blocked. You can enable them in your device settings."
      );
      return false;
    }
    
    return false;
  } catch (error) {
    console.error("Notification permission error:", error);
    await showAlert("Unable to request notification permission.");
    return false;
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
    if (!("Notification" in window)) {
      throw new Error("Notifications are not supported.");
    }
    if (Notification.permission !== "granted") {
      return null;
    }
    const reg = await navigator.serviceWorker.ready;
    const publicKey =
      "BOJKZZBKMDY282dAfh2rgiLIeNuzUJmuu2qyZRO09rSyhX_SuXzT8f6dOJijBSuTLyOKuIOMh8mniyuXbqnVChM";
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }
    const res = await fetch(`${API}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(subscription)
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(
        result.message || "Failed to save push subscription."
      );
    }
    return subscription;
  } catch (error) {
    console.error("Push subscription failed:", error);
    await showAlert(
      error.message || "Unable to subscribe to notifications."
    );
    return null;
  }
}

async function checkNotificationSubscription() {
  const session = getSession();
  const userId = session?.user?.id;
  const toggle = document.getElementById("enablePushButton");
  const status = document.getElementById("profileNotificationStatus");
  
  if (!userId || !toggle) return;
  
  toggle.checked = false;
  
  if (
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return;
  }
  
  try {
    if (Notification.permission !== "granted") {
      return;
    }
    
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      await registration.pushManager.getSubscription();
    
    if (!subscription) {
      if (status) {
        status.textContent =
          "Permission granted. Turn on the toggle to activate notifications.";
      }
      
      return;
    }
    
    toggle.checked = true;
    
    if (status) {
      status.textContent = "Notifications are enabled.";
    }
    
  } catch (error) {
    console.error("Notification status check failed:", error);
  }
}

function bindNotificationToggle() {
  const toggle = document.getElementById("enablePushButton");
  const status = document.getElementById("profileNotificationStatus");
  
  if (!toggle || toggle.dataset.bound === "true") return;
  
  toggle.dataset.bound = "true";
  
  toggle.addEventListener("change", async () => {
    if (!toggle.checked) {
      if (status) {
        status.textContent =
          "Turning off notifications requires unsubscribing from push notifications.";
      }
      
      return;
    }
    
    toggle.disabled = true;
    
    try {
      if (!("Notification" in window)) {
        throw new Error("Notifications are not supported on this device.");
      }
      
      if (Notification.permission !== "granted") {
        const permissionGranted = await askPermission();
        
        if (!permissionGranted) {
          toggle.checked = false;
          return;
        }
      }
      
      const registration = await registerSW();
      
      if (!registration) {
        throw new Error("Unable to prepare notifications. Please try again later.");
      }
      
      const subscription = await subscribeUser();
      
      if (!subscription) {
        toggle.checked = false;
        return;
      }
      
      if (status) {
        status.textContent = "Notifications are enabled.";
      }
      
      localStorage.removeItem(
        `notificationPromptDismissed:${getSession()?.user?.id}`
      );
      
    } catch (error) {
      console.error("Notification toggle error:", error);
      toggle.checked = false;
      
      if (status) {
        status.textContent =
          "Unable to enable notifications. Please try again.";
      }
      
      await showAlert(
        error.message || "Unable to enable notifications."
      );
    } finally {
      toggle.disabled = false;
    }
  });
}

async function testPushNotification() {
  try {
    const res = await fetch(`${API}/test`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    
    const result = await res.json();
    
    console.log("Push test result:", result);
    
    await showAlert(
      result.message || "Notification test completed."
    );
  } catch (error) {
    console.error("Push test failed:", error);
    await showAlert(error.message);
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




function showLogin() {
  document.getElementById("loginSection").style.display = "block";
  document.getElementById("registerSection").style.display = "none";
  document.getElementById("forgotPasswordSection").style.display = "none";
}
function showRegister() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("registerSection").style.display = "block";
  document.getElementById("forgotPasswordSection").style.display = "none";
}
function showForgotPassword() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("registerSection").style.display = "none";
  document.getElementById("forgotPasswordSection").style.display = "block";
}



function base64UrlToBuffer(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
function prepareAuthenticationOptions(options) {
  return {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map(
      credential => ({
        ...credential,
        id: base64UrlToBuffer(credential.id)
      })
    )
  };
}
function serializeAuthenticationCredential(credential) {
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      clientDataJSON: bufferToBase64Url(
        credential.response.clientDataJSON
      ),
      authenticatorData: bufferToBase64Url(
        credential.response.authenticatorData
      ),
      signature: bufferToBase64Url(
        credential.response.signature
      ),
      userHandle: credential.response.userHandle
        ? bufferToBase64Url(credential.response.userHandle)
        : null
    },
    clientExtensionResults:
      credential.getClientExtensionResults()
  };
}
async function handlePasskeyLogin() {
  if (!window.isSecureContext || !navigator.credentials) {
    await showAlert(
      "Biometric login requires a supported browser and a secure connection."
    );
    return;
  }
  
  if (!window.PublicKeyCredential) {
    await showAlert(
      "Your browser does not support passkey authentication."
    );
    return;
  }
  
  showLoader();
  
  try {
    const optionsResponse = await fetch(
      `${API}/auth/passkey/login-options`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      }
    );
    
    const optionsResult = await optionsResponse.json();
    
    if (!optionsResponse.ok || !optionsResult.success) {
      throw new Error(
        optionsResult.message ||
        "Unable to start biometric login."
      );
    }
    
    const credential = await navigator.credentials.get({
      publicKey: prepareAuthenticationOptions(
        optionsResult.options
      )
    });
    
    if (!credential) {
      throw new Error(
        "Biometric authentication was not completed."
      );
    }
    
    const verificationResponse = await fetch(
      `${API}/auth/passkey/login-verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          challengeId: optionsResult.challengeId,
          response: serializeAuthenticationCredential(
            credential
          )
        })
      }
    );
    
    const verificationResult =
      await verificationResponse.json();
    
    if (
      !verificationResponse.ok ||
      !verificationResult.success
    ) {
      throw new Error(
        verificationResult.message ||
        "Biometric login failed."
      );
    }
    
    saveSession(
      verificationResult.token,
      verificationResult.user
    );
    
    switchAppMode();
    
    myTournaments = await getMyTournaments();
    
    hideAllPages();
    
    const list = document.getElementById(
      "tournamentList"
    );
    
    if (list) {
      list.innerHTML = "";
    }
    
    window.location.reload();
    
  } catch (error) {
    console.error("Biometric login error:", error);
    
    let message =
      error.message ||
      "Biometric login failed. Please try again.";
    
    if (error.name === "NotAllowedError") {
      message =
        "Biometric login was cancelled, timed out, or no eligible passkey was available. Please try again or use your password.";
    }
    
    await showAlert(message);
    
  } finally {
    hideLoader();
  }
}


function prepareRegistrationOptions(options) {
  return {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64UrlToBuffer(options.user.id)
    },
    excludeCredentials: options.excludeCredentials?.map(
      credential => ({
        ...credential,
        id: base64UrlToBuffer(credential.id)
      })
    )
  };
}

function serializeRegistrationCredential(credential) {
  const response = credential.response;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      clientDataJSON: bufferToBase64Url(
        response.clientDataJSON
      ),
      attestationObject: bufferToBase64Url(
        response.attestationObject
      ),
      transports: response.getTransports
        ? response.getTransports()
        : []
    },
    clientExtensionResults:
      credential.getClientExtensionResults()
  };
}
async function handlePasskeyRegistration() {
  const token = getToken();
  
  if (!token) {
    await showAlert(
      "Please log in with your password before enabling biometric login."
    );
    return;
  }
  
  if (
    !window.isSecureContext ||
    !navigator.credentials ||
    !window.PublicKeyCredential
  ) {
    await showAlert(
      "Passkey registration is not supported in this browser or requires a secure connection."
    );
    return;
  }
  
  const button = document.getElementById(
    "enableBiometricButton"
  );
  
  if (button?.disabled) return;
  
  if (button) {
    button.disabled = true;
    button.textContent = "Setting up...";
  }
  
  showLoader();
  
  try {
    const optionsResponse = await fetch(
      `${API}/auth/passkey/register-options`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      }
    );
    
    const optionsResult = await optionsResponse.json();
    
    if (!optionsResponse.ok || !optionsResult.success) {
      throw new Error(
        optionsResult.message ||
        "Unable to start passkey registration."
      );
    }
    
    const credential = await navigator.credentials.create({
      publicKey: prepareRegistrationOptions(
        optionsResult.options
      )
    });
    
    if (!credential) {
      throw new Error(
        "Passkey registration was not completed."
      );
    }
    
    const verificationResponse = await fetch(
      `${API}/auth/passkey/register-verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          token,
          challengeId: optionsResult.challengeId,
          deviceName: /iPhone|iPad|iPod/.test(
              navigator.userAgent
            ) ?
            "Apple Device" :
            "Personal Device",
          response: serializeRegistrationCredential(
            credential
          )
        })
      }
    );
    
    const verificationResult =
      await verificationResponse.json();
    
    if (
      !verificationResponse.ok ||
      !verificationResult.success
    ) {
      throw new Error(
        verificationResult.message ||
        "Unable to save your passkey."
      );
    }
    
    const status = document.getElementById(
      "profileBiometricStatus"
    );
    
    if (status) {
      status.textContent = "Passkey registered";
    }
    
    if (button) {
      button.textContent = "Biometric Login Enabled";
    }
    
    await showAlert(
      "Biometric login has been enabled for your Galatico account."
    );
    
  } catch (error) {
    console.error(
      "Passkey registration error:",
      error
    );
    
    let message =
      error.message ||
      "Unable to enable biometric login. Please try again.";
    
    if (error.name === "NotAllowedError") {
      message =
        "Passkey setup was cancelled or timed out. Please try again.";
    } else if (error.name === "InvalidStateError") {
      message =
        "This device may already have a passkey registered for this account.";
    }
    
    await showAlert(message);
    
  } finally {
    hideLoader();
    
    if (button) {
      button.disabled = false;
      
      if (button.textContent === "Setting up...") {
        button.textContent = "Enable Biometric Login";
      }
    }
  }
}
async function loadPasskeyStatus() {
  const token = getToken();
  const button = document.getElementById(
    "enableBiometricButton"
  );
  if (!token || !button) return;
  try {
    const response = await fetch(
      `${API}/auth/passkey/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    const result = await response.json();
    if (!response.ok || !result.success) return;
    button.textContent = result.enabled ?
      "Biometric Login Enabled" :
      "Enable Biometric Login";
    button.disabled = result.enabled;
  } catch (error) {
    console.error("Unable to load passkey status:", error);
  }
}

async function offerBiometricLogin() {
  const token = getToken();
  const session = getSession();
  const userId = session?.user?.id;
  if (!token || !userId) return;
  const dismissedKey = `biometricPromptDismissed:${userId}`;
  if (localStorage.getItem(dismissedKey) === "true") {
    return;
  }
  try {
    const response = await fetch(
      `${API}/auth/passkey/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    const result = await response.json();
    if (!response.ok || !result.success || result.enabled) {
      return;
    }
    const agreed = await showConfirmModal(
      "Enable Biometric Login?\n\nSign in to Galatico eSport more easily using a passkey with your fingerprint, face recognition, or device screen lock.",
      "Set Up Now",
      "Maybe Later"
    );
    if (agreed) {
      openProfileModal();
      return;
    }
    const dismissPermanently = await showConfirmModal(
      "Would you like to stop seeing reminders to enable biometric login?",
      "Don't Show Again",
      "Keep Reminding Me"
    );
    if (dismissPermanently) {
      localStorage.setItem(dismissedKey, "true");
    }
  } catch (error) {
    console.error("Biometric login invitation error:", error);
  }
}