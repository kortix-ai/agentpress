// Live trip tracking simulation for RideShare
class LiveTracking {
  constructor(map, tripData) {
    this.map = map;
    this.tripData = tripData;
    this.isActive = false;
    this.trackingInterval = null;
    this.trackingContainer = null;
    this.progress = 0;
    this.totalDistance = 0;
    this.estimatedTime = 0;
    this.startTime = null;
  }
  
  createTrackingUI() {
    // Create tracking container
    this.trackingContainer = document.createElement('div');
    this.trackingContainer.className = 'live-tracking-container';
    this.trackingContainer.style.position = 'absolute';
    this.trackingContainer.style.bottom = '80px';
    this.trackingContainer.style.left = '50%';
    this.trackingContainer.style.transform = 'translateX(-50%)';
    this.trackingContainer.style.backgroundColor = 'white';
    this.trackingContainer.style.borderRadius = '12px';
    this.trackingContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    this.trackingContainer.style.padding = '15px';
    this.trackingContainer.style.width = '90%';
    this.trackingContainer.style.maxWidth = '400px';
    this.trackingContainer.style.zIndex = '200';
    this.trackingContainer.style.display = 'none';
    
    // Add content
    this.trackingContainer.innerHTML = `
      <div class="tracking-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 16px;">Trip in Progress</h3>
        <span class="trip-status">On the way</span>
      </div>
      <div class="progress-bar-container" style="height: 6px; background-color: #f0f0f0; border-radius: 3px; margin-bottom: 15px;">
        <div class="progress-bar" style="height: 100%; width: 0%; background-color: #276EF1; border-radius: 3px; transition: width 0.5s ease;"></div>
      </div>
      <div class="trip-details" style="display: flex; justify-content: space-between;">
        <div class="trip-eta">
          <div style="font-size: 14px; color: #757575;">Estimated arrival</div>
          <div class="eta-time" style="font-weight: 500;">Calculating...</div>
        </div>
        <div class="trip-distance">
          <div style="font-size: 14px; color: #757575;">Distance</div>
          <div class="distance-value" style="font-weight: 500;">Calculating...</div>
        </div>
      </div>
    `;
    
    document.querySelector('.map-container').appendChild(this.trackingContainer);
    return this.trackingContainer;
  }
  
  start(route) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.progress = 0;
    this.startTime = new Date();
    
    // Calculate total distance and estimated time
    if (route && route.routes && route.routes[0]) {
      this.totalDistance = route.routes[0].distance;
      this.estimatedTime = route.routes[0].duration;
    } else {
      // Default values if route data is not available
      this.totalDistance = 5000; // 5 km
      this.estimatedTime = 900; // 15 minutes
    }
    
    // Create or show tracking UI
    if (!this.trackingContainer) {
      this.createTrackingUI();
    }
    this.trackingContainer.style.display = 'block';
    
    // Update UI with initial values
    this.updateTrackingUI(0);
    
    // Start tracking interval
    this.trackingInterval = setInterval(() => {
      this.progress += 1;
      
      // Calculate percentage of trip completed
      const percentage = Math.min(this.progress / (this.estimatedTime / 60) * 100, 100);
      
      this.updateTrackingUI(percentage);
      
      // End tracking when complete
      if (percentage >= 100) {
        this.stop();
      }
    }, 1000); // Update every second
  }
  
  updateTrackingUI(percentage) {
    if (!this.trackingContainer) return;
    
    // Update progress bar
    const progressBar = this.trackingContainer.querySelector('.progress-bar');
    progressBar.style.width = `${percentage}%`;
    
    // Update status text
    const statusEl = this.trackingContainer.querySelector('.trip-status');
    if (percentage < 30) {
      statusEl.textContent = 'On the way';
    } else if (percentage < 70) {
      statusEl.textContent = 'In progress';
    } else if (percentage < 95) {
      statusEl.textContent = 'Almost there';
    } else {
      statusEl.textContent = 'Arriving now';
    }
    
    // Calculate ETA
    const elapsedSeconds = (new Date() - this.startTime) / 1000;
    const remainingSeconds = this.estimatedTime * (1 - percentage / 100);
    const etaDate = new Date(Date.now() + remainingSeconds * 1000);
    const etaTime = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Update ETA and distance
    this.trackingContainer.querySelector('.eta-time').textContent = etaTime;
    
    const distanceTraveled = (this.totalDistance * percentage / 100 / 1000).toFixed(1);
    const distanceRemaining = (this.totalDistance * (1 - percentage / 100) / 1000).toFixed(1);
    this.trackingContainer.querySelector('.distance-value').textContent = 
      `${distanceTraveled} km traveled, ${distanceRemaining} km left`;
  }
  
  stop() {
    if (!this.isActive) return;
    
    clearInterval(this.trackingInterval);
    this.isActive = false;
    
    // Hide tracking UI with animation
    if (this.trackingContainer) {
      this.trackingContainer.style.opacity = '0';
      this.trackingContainer.style.transition = 'opacity 0.5s ease';
      
      setTimeout(() => {
        this.trackingContainer.style.display = 'none';
        this.trackingContainer.style.opacity = '1';
      }, 500);
    }
  }
}

// Export to window
window.LiveTracking = LiveTracking;