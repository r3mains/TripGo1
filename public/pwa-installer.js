// PWA Installation Helper - Enhanced for better detection
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.engagementScore = 0;
    this.minEngagementForPrompt = 3; // Minimum interactions before showing prompt

    this.init();
  }

  init() {
    // Debug information
    console.log('🔍 PWA Installer Debug Info:');
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Is HTTPS:', location.protocol === 'https:');
    console.log('- Service Worker Support:', 'serviceWorker' in navigator);
    
    // Check if already running as PWA
    this.isInstalled = this.isPWA();

    if (this.isInstalled) {
      console.log("✅ Already running as PWA");
      return;
    }

    // Listen for install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("💾 PWA install prompt intercepted");
      e.preventDefault();
      this.deferredPrompt = e;

      // Show install button immediately when prompt is available
      this.showInstallButton();
    });

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      console.log("✅ PWA installed successfully");
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallButton();
      this.showSuccessMessage();
    });

    // Track user engagement (reduced requirement)
    this.trackEngagement();

    // Show install options more aggressively
    setTimeout(() => {
      console.log(`🔍 After 3 seconds - deferredPrompt: ${!!this.deferredPrompt}, isInstalled: ${this.isInstalled}`);
      
      if (!this.isInstalled) {
        if (this.deferredPrompt) {
          console.log("🚀 Showing install button (deferred prompt available)");
          this.showInstallButton();
        } else {
          console.log("🔧 Showing manual install instructions (no deferred prompt)");
          this.showInstallButton(true);
        }
      }
    }, 3000);

    // Also show install notification after short delay
    setTimeout(() => {
      if (!this.isInstalled) {
        this.showInstallNotification();
      }
    }, 2000);
  }

  isPWA() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://")
    );
  }

  trackEngagement() {
    // Reduced engagement requirements - show install options faster
    const interactions = ["click", "touchstart", "scroll", "keydown"];

    interactions.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.engagementScore++;
          console.log(`📈 Engagement score: ${this.engagementScore}`);

          if (this.engagementScore >= 1 && this.deferredPrompt) {
            this.checkEngagementAndShow();
          }
        },
        { once: true, passive: true }
      );
    });

    // Much shorter time requirement
    setTimeout(() => {
      this.engagementScore += 5; // Boost score significantly
      console.log(`⏰ Time-based engagement boost: ${this.engagementScore}`);
      this.checkEngagementAndShow();
    }, 5000); // 5 seconds instead of 30
  }

  checkEngagementAndShow() {
    if (
      this.engagementScore >= this.minEngagementForPrompt &&
      this.deferredPrompt &&
      !this.isInstalled
    ) {
      console.log(
        `📈 Engagement score: ${this.engagementScore}, showing install prompt`
      );
      this.showInstallButton();
    }
  }

  showInstallButton(isManual = false) {
    const installBtn = document.getElementById("installPwaBtn");
    if (installBtn && !this.isInstalled) {
      installBtn.style.display = "inline-block";
      installBtn.onclick = () => this.install(isManual);
      console.log("📱 Install button shown");

      // Also show a subtle notification
      this.showInstallNotification();
    }
  }

  hideInstallButton() {
    const installBtn = document.getElementById("installPwaBtn");
    if (installBtn) {
      installBtn.style.display = "none";
    }
  }

  showInstallNotification() {
    // Create a subtle floating notification
    const notification = document.createElement("div");
    notification.id = "pwa-install-notification";
    notification.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
                z-index: 10000;
                font-size: 14px;
                text-align: center;
                animation: slideUp 0.3s ease-out;
                max-width: 90%;
            ">
                🚀 Install TripGo for better background tracking!
                <button onclick="pwaInstaller.install()" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 6px 12px;
                    margin-left: 10px;
                    border-radius: 15px;
                    cursor: pointer;
                    font-size: 12px;
                ">Install</button>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    padding: 6px 8px;
                    margin-left: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">×</button>
            </div>
        `;

    // Add animation
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  async install(isManual = false) {
    if (this.deferredPrompt) {
      console.log("🚀 Triggering PWA installation...");

      try {
        // Show the installation prompt
        this.deferredPrompt.prompt();

        // Wait for user response
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`PWA install outcome: ${outcome}`);

        if (outcome === "accepted") {
          console.log("✅ User accepted PWA installation");
        } else {
          console.log("❌ User declined PWA installation");
          this.showManualInstructions();
        }

        this.deferredPrompt = null;
        this.hideInstallButton();
      } catch (error) {
        console.error("PWA install error:", error);
        this.showManualInstructions();
      }
    } else {
      // Fallback for browsers without auto-prompt or manual trigger
      this.showManualInstructions();
    }

    // Remove install notification if present
    const notification = document.getElementById("pwa-install-notification");
    if (notification) {
      notification.remove();
    }
  }

  showManualInstructions() {
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
    const isEdge = /Edg/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);

    let instructions = "";

    if (isAndroid && isChrome) {
      instructions =
        '📱 Chrome: Menu (⋮) → "Install app" or "Add to Home Screen"';
    } else if (isAndroid && isEdge) {
      instructions = '📱 Edge: Menu (⋯) → "Add to phone" or "Install app"';
    } else if (isAndroid && isFirefox) {
      instructions = '📱 Firefox: Menu (⋮) → "Install" or "Add to Home Screen"';
    } else if (isIOS && isSafari) {
      instructions = '📱 Safari: Share button (□↑) → "Add to Home Screen"';
    } else {
      instructions = '📱 Browser Menu → "Add to Home Screen" or "Install app"';
    }

    // Show custom modal instead of alert
    this.showInstallModal(instructions);
  }

  showInstallModal(instructions) {
    const modal = document.createElement("div");
    modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            ">
                <div style="
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin: 0 0 15px 0; color: #333;">📱 Install TripGo</h3>
                    <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
                        Install TripGo as an app for better performance and reliable background location tracking:
                    </p>
                    <p style="margin: 0 0 25px 0; font-weight: bold; color: #28a745; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        ${instructions}
                    </p>
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: bold;
                    ">Got it!</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Remove modal when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  showSuccessMessage() {
    if (window.tripApp && typeof window.tripApp.showMessage === "function") {
      window.tripApp.showMessage(
        "🎉 TripGo installed successfully! Background tracking is now enabled.",
        "success"
      );
    }
  }
}

// Debug function for testing
window.debugPWA = function() {
  console.log('🔍 PWA Debug Status:');
  console.log('- Is HTTPS:', location.protocol === 'https:');
  console.log('- Service Worker registered:', navigator.serviceWorker?.controller ? 'Yes' : 'No');
  console.log('- Manifest linked:', document.querySelector('link[rel="manifest"]') ? 'Yes' : 'No');
  console.log('- Install prompt available:', window.pwaInstaller?.deferredPrompt ? 'Yes' : 'No');
  console.log('- Already installed as PWA:', window.pwaInstaller?.isPWA() ? 'Yes' : 'No');
  console.log('- Install button exists:', document.getElementById('installPwaBtn') ? 'Yes' : 'No');
  
  // Force show install options
  if (window.pwaInstaller) {
    console.log('🚀 Forcing install options to show...');
    window.pwaInstaller.showInstallButton(true);
    window.pwaInstaller.showInstallNotification();
  }
};

// Initialize PWA installer when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.pwaInstaller = new PWAInstaller();
  
  // Add debug button to page
  setTimeout(() => {
    const debugBtn = document.createElement('button');
    debugBtn.innerHTML = '🔍 Debug PWA';
    debugBtn.onclick = window.debugPWA;
    debugBtn.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: #ff6b35;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 5px;
      font-size: 12px;
      cursor: pointer;
    `;
    document.body.appendChild(debugBtn);
  }, 1000);
});
