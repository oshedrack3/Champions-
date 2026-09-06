self.addEventListener("push", (event) => {
  let data = {};
  
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: "New Notification",
      body: event.data ? event.data.text() : ""
    };
  }
  
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon.png",
    badge: data.badge || "/badge.png",
    data: {
      url: data.url || "/"
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || "Notification",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || "/";
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

