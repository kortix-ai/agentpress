// Enhanced UI elements for RideShare app

// Add floating action button for quick actions
function addFloatingActionButton() {
  const fab = document.createElement('div');
  fab.className = 'floating-action-button';
  fab.innerHTML = '<i class="fas fa-plus"></i>';
  fab.style.position = 'absolute';
  fab.style.bottom = '100px';
  fab.style.right = '20px';
  fab.style.width = '56px';
  fab.style.height = '56px';
  fab.style.borderRadius = '50%';
  fab.style.backgroundColor = '#276EF1';
  fab.style.color = 'white';
  fab.style.display = 'flex';
  fab.style.alignItems = 'center';
  fab.style.justifyContent = 'center';
  fab.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  fab.style.cursor = 'pointer';
  fab.style.zIndex = '100';
  fab.style.transition = 'transform 0.2s, background-color 0.2s';
  
  // Add hover effect
  fab.addEventListener('mouseenter', () => {
    fab.style.transform = 'scale(1.1)';
  });
  
  fab.addEventListener('mouseleave', () => {
    fab.style.transform = 'scale(1)';
  });
  
  // Add click functionality to show quick actions menu
  let isMenuOpen = false;
  fab.addEventListener('click', () => {
    if (!isMenuOpen) {
      showQuickActionsMenu(fab);
      fab.innerHTML = '<i class="fas fa-times"></i>';
      isMenuOpen = true;
    } else {
      hideQuickActionsMenu();
      fab.innerHTML = '<i class="fas fa-plus"></i>';
      isMenuOpen = false;
    }
  });
  
  document.querySelector('.map-container').appendChild(fab);
  return fab;
}

// Show quick actions menu
function showQuickActionsMenu(fab) {
  const actions = [
    { icon: 'fa-home', label: 'Home', action: () => selectSavedPlace('Home') },
    { icon: 'fa-briefcase', label: 'Work', action: () => selectSavedPlace('Work') },
    { icon: 'fa-clock', label: 'Schedule', action: () => document.getElementById('scheduleRideBtn').click() },
    { icon: 'fa-history', label: 'History', action: () => document.getElementById('tripHistoryBtn').click() }
  ];
  
  const menu = document.createElement('div');
  menu.className = 'quick-actions-menu';
  menu.style.position = 'absolute';
  menu.style.bottom = '170px';
  menu.style.right = '20px';
  menu.style.display = 'flex';
  menu.style.flexDirection = 'column';
  menu.style.alignItems = 'flex-end';
  menu.style.gap = '10px';
  menu.style.zIndex = '99';
  
  actions.forEach((action, index) => {
    const item = document.createElement('div');
    item.className = 'quick-action-item';
    item.innerHTML = `
      <div class="action-label">${action.label}</div>
      <div class="action-button">
        <i class="fas ${action.icon}"></i>
      </div>
    `;
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '10px';
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = 'opacity 0.2s, transform 0.2s';
    item.style.transitionDelay = `${index * 0.05}s`;
    
    const actionButton = item.querySelector('.action-button');
    actionButton.style.width = '48px';
    actionButton.style.height = '48px';
    actionButton.style.borderRadius = '50%';
    actionButton.style.backgroundColor = 'white';
    actionButton.style.color = '#276EF1';
    actionButton.style.display = 'flex';
    actionButton.style.alignItems = 'center';
    actionButton.style.justifyContent = 'center';
    actionButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    actionButton.style.cursor = 'pointer';
    
    const actionLabel = item.querySelector('.action-label');
    actionLabel.style.backgroundColor = 'rgba(0,0,0,0.7)';
    actionLabel.style.color = 'white';
    actionLabel.style.padding = '5px 10px';
    actionLabel.style.borderRadius = '4px';
    actionLabel.style.fontSize = '14px';
    
    item.addEventListener('click', () => {
      action.action();
      hideQuickActionsMenu();
      fab.innerHTML = '<i class="fas fa-plus"></i>';
    });
    
    menu.appendChild(item);
    
    // Trigger animation after a small delay
    setTimeout(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, 10);
  });
  
  menu.id = 'quickActionsMenu';
  document.querySelector('.map-container').appendChild(menu);
}

// Hide quick actions menu
function hideQuickActionsMenu() {
  const menu = document.getElementById('quickActionsMenu');
  if (menu) {
    const items = menu.querySelectorAll('.quick-action-item');
    items.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transitionDelay = `${(items.length - index - 1) * 0.05}s`;
    });
    
    setTimeout(() => {
      menu.remove();
    }, items.length * 50 + 200);
  }
}

// Helper function to select a saved place
function selectSavedPlace(place) {
  const savedPlaces = document.querySelectorAll('.saved-place');
  savedPlaces.forEach(savedPlace => {
    if (savedPlace.querySelector('span').textContent === place) {
      savedPlace.click();
    }
  });
}

// Add a map style switcher
function addMapStyleSwitcher() {
  const styleSwitch = document.createElement('div');
  styleSwitch.className = 'map-style-switcher';
  styleSwitch.innerHTML = `
    <div class="style-option selected" data-style="streets">
      <i class="fas fa-road"></i>
      <span>Streets</span>
    </div>
    <div class="style-option" data-style="satellite">
      <i class="fas fa-satellite"></i>
      <span>Satellite</span>
    </div>
    <div class="style-option" data-style="dark">
      <i class="fas fa-moon"></i>
      <span>Dark</span>
    </div>
  `;
  
  styleSwitch.style.position = 'absolute';
  styleSwitch.style.top = '120px';
  styleSwitch.style.right = '10px';
  styleSwitch.style.backgroundColor = 'white';
  styleSwitch.style.borderRadius = '8px';
  styleSwitch.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
  styleSwitch.style.overflow = 'hidden';
  styleSwitch.style.zIndex = '100';
  
  const styleOptions = styleSwitch.querySelectorAll('.style-option');
  styleOptions.forEach(option => {
    option.style.padding = '8px 12px';
    option.style.display = 'flex';
    option.style.alignItems = 'center';
    option.style.gap = '8px';
    option.style.cursor = 'pointer';
    option.style.transition = 'background-color 0.2s';
    
    option.addEventListener('mouseenter', () => {
      if (!option.classList.contains('selected')) {
        option.style.backgroundColor = '#f5f5f5';
      }
    });
    
    option.addEventListener('mouseleave', () => {
      if (!option.classList.contains('selected')) {
        option.style.backgroundColor = 'white';
      }
    });
    
    option.addEventListener('click', () => {
      styleOptions.forEach(opt => {
        opt.classList.remove('selected');
        opt.style.backgroundColor = 'white';
        opt.style.fontWeight = 'normal';
      });
      
      option.classList.add('selected');
      option.style.backgroundColor = '#f5f5f5';
      option.style.fontWeight = 'bold';
      
      // Change map style
      const style = option.getAttribute('data-style');
      switch(style) {
        case 'streets':
          window.map.setStyle('mapbox://styles/mapbox/streets-v11');
          break;
        case 'satellite':
          window.map.setStyle('mapbox://styles/mapbox/satellite-streets-v11');
          break;
        case 'dark':
          window.map.setStyle('mapbox://styles/mapbox/dark-v10');
          break;
      }
    });
  });
  
  document.querySelector('.map-container').appendChild(styleSwitch);
}

// Add a traffic toggle button
function addTrafficToggle() {
  const trafficToggle = document.createElement('div');
  trafficToggle.className = 'traffic-toggle';
  trafficToggle.innerHTML = `
    <i class="fas fa-traffic-light"></i>
    <span>Traffic</span>
  `;
  
  trafficToggle.style.position = 'absolute';
  trafficToggle.style.top = '70px';
  trafficToggle.style.left = '10px';
  trafficToggle.style.backgroundColor = 'white';
  trafficToggle.style.padding = '8px 12px';
  trafficToggle.style.borderRadius = '20px';
  trafficToggle.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
  trafficToggle.style.display = 'flex';
  trafficToggle.style.alignItems = 'center';
  trafficToggle.style.gap = '8px';
  trafficToggle.style.cursor = 'pointer';
  trafficToggle.style.zIndex = '100';
  trafficToggle.style.fontSize = '14px';
  
  let trafficEnabled = false;
  
  trafficToggle.addEventListener('click', () => {
    trafficEnabled = !trafficEnabled;
    
    if (trafficEnabled) {
      trafficToggle.style.backgroundColor = '#276EF1';
      trafficToggle.style.color = 'white';
      
      // In a real app, this would add a traffic layer to the map
      showToast('Traffic layer enabled');
      
      // Simulate traffic data
      if (window.map.getSource('route')) {
        window.map.setPaintProperty('route', 'line-color', [
          'step',
          ['random'],
          '#4CAF50', // Green for low traffic
          0.3, '#FFC107', // Yellow for medium traffic
          0.6, '#FF5722'  // Red for heavy traffic
        ]);
      }
      
    } else {
      trafficToggle.style.backgroundColor = 'white';
      trafficToggle.style.color = 'black';
      
      // In a real app, this would remove the traffic layer
      showToast('Traffic layer disabled');
      
      // Reset route color
      if (window.map.getSource('route')) {
        window.map.setPaintProperty('route', 'line-color', '#276EF1');
      }
    }
  });
  
  document.querySelector('.map-container').appendChild(trafficToggle);
}

// Initialize enhanced UI
function initEnhancedUI() {
  // Add with a slight delay to ensure the map is loaded
  setTimeout(() => {
    addFloatingActionButton();
    addMapStyleSwitcher();
    addTrafficToggle();
  }, 1500);
}

// Export to window
window.initEnhancedUI = initEnhancedUI;