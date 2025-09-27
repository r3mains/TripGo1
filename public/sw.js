// Enhanced Service Worker for PWA and background location tracking
const CACHE_NAME = "tripgo-v3.0";
const API_CACHE = "tripgo-api-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

// Background location tracking state
let backgroundLocationInterval = null;
let isTrackingInBackground = false;
let lastKnownPosition = null;

// Install event - improved caching
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log("Service Worker: Caching static files");
        return cache.addAll(
          urlsToCache.filter((url) => !url.startsWith("http"))
        );
      }),
      caches.open(API_CACHE).then(() => {
        console.log("Service Worker: API cache ready");
      }),
    ]).then(() => {
      console.log("Service Worker: Installed successfully");
      return self.skipWaiting();
    })
  );
});

// Activate event - improved cache management
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
              console.log("Service Worker: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker: Activated and claiming clients");
        return self.clients.claim();
      })
  );
});

// Fetch event with enhanced caching strategy
self.addEventListener("fetch", (event) => {
  // Handle API requests differently from static assets
  if (event.request.url.includes("/api/")) {
    // For API requests, always try network first, then cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();

          // Cache successful API responses (optional)
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets, try cache first, then network
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Background sync for location data
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered:", event.tag);

  if (event.tag === "background-location-sync") {
    event.waitUntil(doBackgroundLocationSync());
  } else if (event.tag === "trip-data-sync") {
    event.waitUntil(syncTripData());
  }
});

// Enhanced background location sync with continuous tracking
async function doBackgroundLocationSync() {
  try {
    console.log("Service Worker: Background location sync started");

    // Get tracking state from IndexedDB
    const trackingState = await getTrackingState();
    if (!trackingState || !trackingState.isActive) {
      console.log("Service Worker: No active trip, stopping background sync");
      return;
    }

    // Check for active clients
    const clients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: "window",
    });

    // If no clients are visible, start background location tracking
    if (
      clients.length === 0 ||
      !clients.some((client) => client.visibilityState === "visible")
    ) {
      console.log(
        "Service Worker: App backgrounded, starting location tracking"
      );
      await startBackgroundLocationTracking(trackingState);
    } else {
      // Send message to active clients for location updates
      clients.forEach((client) => {
        client.postMessage({
          type: "BACKGROUND_LOCATION_UPDATE",
          timestamp: Date.now(),
          activeTrip: trackingState,
        });
      });
    }
  } catch (error) {
    console.error("Service Worker: Background sync failed:", error);
  }
}

// Start continuous background location tracking
async function startBackgroundLocationTracking(trackingState) {
  if (isTrackingInBackground) {
    return; // Already tracking
  }

  isTrackingInBackground = true;
  console.log("Service Worker: Starting background location tracking");

  // Show persistent notification to keep service worker alive
  await self.registration.showNotification("TripGo - Tracking Trip", {
    body: `Tracking your trip: ${trackingState.purpose}`,
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    persistent: true,
    requireInteraction: false,
    silent: true,
    tag: "trip-tracking",
    data: { tripId: trackingState.tripId },
  });

  // Start location polling
  backgroundLocationInterval = setInterval(async () => {
    try {
      if ("geolocation" in navigator) {
        const position = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        });

        console.log(
          "Service Worker: Background location update",
          position.coords
        );
        lastKnownPosition = position;

        // Store location data
        await storeLocationData({
          tripId: trackingState.tripId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy,
          isBackground: true,
        });

        // Update tracking statistics
        await updateBackgroundTripStats(trackingState.tripId, position);
      }
    } catch (error) {
      console.error("Service Worker: Background location error:", error);
    }
  }, 30000); // Update every 30 seconds in background
}

// Stop background location tracking
async function stopBackgroundLocationTracking() {
  isTrackingInBackground = false;

  if (backgroundLocationInterval) {
    clearInterval(backgroundLocationInterval);
    backgroundLocationInterval = null;
  }

  // Close tracking notification
  const notifications = await self.registration.getNotifications({
    tag: "trip-tracking",
  });
  notifications.forEach((notification) => notification.close());

  console.log("Service Worker: Stopped background location tracking");
}

// Sync trip data when online
async function syncTripData() {
  try {
    console.log("Service Worker: Syncing trip data");

    // Get stored offline trip data
    const storedData = await getStoredTripData();

    if (storedData && storedData.length > 0) {
      // Send stored data to server
      for (const tripData of storedData) {
        try {
          const response = await fetch("/api/trip/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tripData),
          });

          if (response.ok) {
            await removeStoredTripData(tripData.id);
          }
        } catch (error) {
          console.error("Service Worker: Failed to sync trip data:", error);
        }
      }
    }
  } catch (error) {
    console.error("Service Worker: Trip data sync failed:", error);
  }
}

// Helper function to get current position in service worker
function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
      ...options,
    });
  });
}

// Store location data in IndexedDB
async function storeLocationData(locationData) {
  try {
    const db = await openDB();
    const transaction = db.transaction(["locations"], "readwrite");
    const store = transaction.objectStore("locations");

    await store.add({
      ...locationData,
      id: Date.now(),
    });

    console.log("Service Worker: Location data stored");
  } catch (error) {
    console.error("Service Worker: Failed to store location data:", error);
  }
}

// Get stored trip data
async function getStoredTripData() {
  try {
    const db = await openDB();
    const transaction = db.transaction(["tripData"], "readonly");
    const store = transaction.objectStore("tripData");

    return await store.getAll();
  } catch (error) {
    console.error("Service Worker: Failed to get stored trip data:", error);
    return [];
  }
}

// Remove stored trip data after successful sync
async function removeStoredTripData(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction(["tripData"], "readwrite");
    const store = transaction.objectStore("tripData");

    await store.delete(id);
    console.log("Service Worker: Removed synced trip data:", id);
  } catch (error) {
    console.error("Service Worker: Failed to remove trip data:", error);
  }
}

// Enhanced IndexedDB management
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TripGoStore", 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores with indices
      if (!db.objectStoreNames.contains("locations")) {
        const locationStore = db.createObjectStore("locations", {
          keyPath: "id",
        });
        locationStore.createIndex("tripId", "tripId");
        locationStore.createIndex("timestamp", "timestamp");
      }

      if (!db.objectStoreNames.contains("tripData")) {
        const tripStore = db.createObjectStore("tripData", { keyPath: "id" });
        tripStore.createIndex("timestamp", "timestamp");
      }

      if (!db.objectStoreNames.contains("trackingState")) {
        db.createObjectStore("trackingState", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("offlineRequests")) {
        const offlineStore = db.createObjectStore("offlineRequests", {
          keyPath: "id",
        });
        offlineStore.createIndex("timestamp", "timestamp");
      }
    };
  });
}

// Store and retrieve tracking state
async function storeTrackingState(state) {
  try {
    const db = await openDB();
    const transaction = db.transaction(["trackingState"], "readwrite");
    const store = transaction.objectStore("trackingState");

    await store.put({ key: "current", ...state, timestamp: Date.now() });
    console.log("Service Worker: Tracking state stored", state);
  } catch (error) {
    console.error("Service Worker: Failed to store tracking state:", error);
  }
}

async function getTrackingState() {
  try {
    const db = await openDB();
    const transaction = db.transaction(["trackingState"], "readonly");
    const store = transaction.objectStore("trackingState");

    return await store.get("current");
  } catch (error) {
    console.error("Service Worker: Failed to get tracking state:", error);
    return null;
  }
}

// Update trip statistics in background
async function updateBackgroundTripStats(tripId, position) {
  try {
    // Calculate distance from last known position
    if (lastKnownPosition) {
      const distance = calculateDistance(
        lastKnownPosition.coords.latitude,
        lastKnownPosition.coords.longitude,
        position.coords.latitude,
        position.coords.longitude
      );

      // Store distance update
      const db = await openDB();
      const transaction = db.transaction(["tripData"], "readwrite");
      const store = transaction.objectStore("tripData");

      await store.put({
        id: `distance-${Date.now()}`,
        tripId: tripId,
        type: "distance_update",
        distance: distance,
        timestamp: Date.now(),
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
      });
    }
  } catch (error) {
    console.error("Service Worker: Failed to update trip stats:", error);
  }
}

// Calculate distance between coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Handle visibility changes for background tracking
self.addEventListener("visibilitychange", async () => {
  const trackingState = await getTrackingState();

  if (trackingState && trackingState.isActive) {
    if (document.hidden) {
      console.log(
        "Service Worker: App backgrounded, starting background tracking"
      );
      await startBackgroundLocationTracking(trackingState);
    } else {
      console.log(
        "Service Worker: App foregrounded, stopping background tracking"
      );
      await stopBackgroundLocationTracking();
    }
  }
});

// Store offline requests for later sync
async function storeOfflineRequest(requestData) {
  try {
    const db = await openDB();
    const transaction = db.transaction(["offlineRequests"], "readwrite");
    const store = transaction.objectStore("offlineRequests");

    await store.add({
      id: Date.now(),
      ...requestData,
      timestamp: Date.now(),
    });

    console.log("Service Worker: Offline request stored");
  } catch (error) {
    console.error("Service Worker: Failed to store offline request:", error);
  }
}

// Get all offline requests
async function getOfflineRequests() {
  try {
    const db = await openDB();
    const transaction = db.transaction(["offlineRequests"], "readonly");
    const store = transaction.objectStore("offlineRequests");

    return await store.getAll();
  } catch (error) {
    console.error("Service Worker: Failed to get offline requests:", error);
    return [];
  }
}

// Clear synced offline requests
async function clearOfflineRequest(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction(["offlineRequests"], "readwrite");
    const store = transaction.objectStore("offlineRequests");

    await store.delete(id);
  } catch (error) {
    console.error("Service Worker: Failed to clear offline request:", error);
  }
}

// Handle messages from main thread - enhanced for PWA
self.addEventListener("message", (event) => {
  console.log("Service Worker: Received message:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "START_BACKGROUND_TRACKING") {
    console.log(
      "Service Worker: Starting background tracking for trip:",
      event.data.tripData
    );

    // Store trip tracking state
    storeTrackingState({
      isActive: true,
      tripId: event.data.tripData.id,
      purpose: event.data.tripData.purpose,
      startTime: Date.now(),
      lastSync: Date.now(),
    });

    // Register background sync
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      self.registration.sync.register("background-location-sync");
    }

    // Start immediate tracking if app goes background
    doBackgroundLocationSync();
  } else if (event.data && event.data.type === "STOP_BACKGROUND_TRACKING") {
    console.log("Service Worker: Stopping background tracking");

    // Clear tracking state
    storeTrackingState({ isActive: false });

    // Stop background tracking
    stopBackgroundLocationTracking();
  } else if (event.data && event.data.type === "UPDATE_LOCATION") {
    // Handle location updates from main app
    if (event.data.location) {
      storeLocationData({
        ...event.data.location,
        timestamp: Date.now(),
        isBackground: false,
      });
    }
  } else if (event.data && event.data.type === "SYNC_OFFLINE_DATA") {
    // Sync any offline data
    syncTripData();
  }
});

// Enhanced push notifications for trip updates
self.addEventListener("push", (event) => {
  let options = {
    body: "TripGo is tracking your trip in the background",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "open",
        title: "Open App",
        icon: "/icon-72x72.png",
      },
      {
        action: "close",
        title: "Dismiss",
        icon: "/icon-72x72.png",
      },
    ],
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      options = { ...options, ...pushData };
    } catch (error) {
      console.error("Service Worker: Error parsing push data:", error);
    }
  }

  event.waitUntil(self.registration.showNotification("TripGo", options));
});

// Handle notification clicks with enhanced functionality
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open") {
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === "/" && "focus" in client) {
            return client.focus();
          }
        }

        // Otherwise, open new window
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
    );
  } else if (event.action === "close") {
    // Just close the notification (already handled above)
    return;
  } else {
    // Default action - open app
    event.waitUntil(clients.openWindow("/"));
  }
});
