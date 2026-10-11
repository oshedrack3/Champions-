self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    try {
      console.log("[Push] Event received.");
      let data = {};
      if (event.data) {
        const text = event.data.text();
        console.log("[Push] Raw payload:", text);
        try {
          data = JSON.parse(text);
        } catch (error) {
          console.error(
            "[Push] JSON parsing failed:",
            error.message
          );
          data = {
            title: "New Notification",
            body: text
          };
        }
      } else {
        console.warn("[Push] Event has no payload.");
      }
      console.log("[Push] Parsed data:", data);
      const options = {
        body: data.body || "",
        icon: data.icon || "/icon.png",
        badge: data.badge || "/badge.png",
        data: {
          url: data.url || "/"
        }
      };
      console.log("[Push] Displaying notification.");
      await self.registration.showNotification(
        data.title || "Notification",
        options
      );
      console.log("[Push] Notification displayed successfully.");
    } catch (error) {
      console.error("[Push] FAILED:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    try {
      const url = new URL(
        event.notification.data?.url || "/",
        self.location.origin
      );
      if (url.origin !== self.location.origin) {
        throw new Error(
          "Notification URL must belong to this website."
        );
      }
      console.log("[Push] Notification clicked:", url.href);
      await clients.openWindow(url.href);
    } catch (error) {
      console.error("[Push] Click failed:", {
        name: error.name,
        message: error.message
      });
      throw error;
    }
  })());
});