// Theme switcher for RideShare app
class ThemeSwitcher {
  constructor() {
    this.themes = {
      light: {
        '--primary-color': '#000000',
        '--secondary-color': '#276EF1',
        '--light-gray': '#f5f5f5',
        '--medium-gray': '#e0e0e0',
        '--dark-gray': '#757575',
        '--white': '#ffffff',
        '--text-color': '#000000',
        '--background-color': '#ffffff',
        '--panel-background': '#ffffff',
        '--shadow': '0 2px 10px rgba(0, 0, 0, 0.1)'
      },
      dark: {
        '--primary-color': '#ffffff',
        '--secondary-color': '#4d94ff',
        '--light-gray': '#2a2a2a',
        '--medium-gray': '#3a3a3a',
        '--dark-gray': '#aaaaaa',
        '--white': '#1a1a1a',
        '--text-color': '#ffffff',
        '--background-color': '#121212',
        '--panel-background': '#1e1e1e',
        '--shadow': '0 2px 10px rgba(0, 0, 0, 0.3)'
      },
      blue: {
        '--primary-color': '#1a237e',
        '--secondary-color': '#42a5f5',
        '--light-gray': '#e3f2fd',
        '--medium-gray': '#bbdefb',
        '--dark-gray': '#64b5f6',
        '--white': '#ffffff',
        '--text-color': '#1a237e',
        '--background-color': '#ffffff',
        '--panel-background': '#ffffff',
        '--shadow': '0 2px 10px rgba(26, 35, 126, 0.1)'
      }
    };
    
    this.currentTheme = 'light';
  }
  
  createThemeSwitcher() {
    const switcher = document.createElement('div');
    switcher.className = 'theme-switcher';
    switcher.innerHTML = `
      <div class="theme-toggle">
        <i class="fas fa-palette"></i>
      </div>
      <div class="theme-options hidden">
        <div class="theme-option" data-theme="light">
          <div class="theme-preview light"></div>
          <span>Light</span>
        </div>
        <div class="theme-option" data-theme="dark">
          <div class="theme-preview dark"></div>
          <span>Dark</span>
        </div>
        <div class="theme-option" data-theme="blue">
          <div class="theme-preview blue"></div>
          <span>Blue</span>
        </div>
      </div>
    `;
    
    // Style the switcher
    switcher.style.position = 'absolute';
    switcher.style.top = '10px';
    switcher.style.right = '10px';
    switcher.style.zIndex = '101';
    
    const toggle = switcher.querySelector('.theme-toggle');
    toggle.style.width = '40px';
    toggle.style.height = '40px';
    toggle.style.borderRadius = '50%';
    toggle.style.backgroundColor = 'white';
    toggle.style.display = 'flex';
    toggle.style.alignItems = 'center';
    toggle.style.justifyContent = 'center';
    toggle.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
    toggle.style.cursor = 'pointer';
    
    const options = switcher.querySelector('.theme-options');
    options.style.position = 'absolute';
    options.style.top = '50px';
    options.style.right = '0';
    options.style.backgroundColor = 'white';
    options.style.borderRadius = '8px';
    options.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    options.style.padding = '10px';
    options.style.transition = 'opacity 0.3s, transform 0.3s';
    options.style.opacity = '0';
    options.style.transform = 'translateY(-10px)';
    options.style.pointerEvents = 'none';
    
    // Style theme options
    const themeOptions = switcher.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.style.display = 'flex';
      option.style.alignItems = 'center';
      option.style.padding = '8px';
      option.style.cursor = 'pointer';
      option.style.borderRadius = '4px';
      option.style.transition = 'background-color 0.2s';
      
      const preview = option.querySelector('.theme-preview');
      preview.style.width = '20px';
      preview.style.height = '20px';
      preview.style.borderRadius = '50%';
      preview.style.marginRight = '10px';
      preview.style.border = '1px solid #ddd';
      
      // Set preview colors
      if (preview.classList.contains('light')) {
        preview.style.backgroundColor = 'white';
        preview.style.border = '1px solid #ddd';
      } else if (preview.classList.contains('dark')) {
        preview.style.backgroundColor = '#1a1a1a';
      } else if (preview.classList.contains('blue')) {
        preview.style.backgroundColor = '#e3f2fd';
        preview.style.border = '1px solid #bbdefb';
      }
      
      option.addEventListener('mouseenter', () => {
        option.style.backgroundColor = '#f5f5f5';
      });
      
      option.addEventListener('mouseleave', () => {
        option.style.backgroundColor = 'transparent';
      });
      
      option.addEventListener('click', () => {
        const theme = option.getAttribute('data-theme');
        this.setTheme(theme);
        this.toggleOptions();
      });
    });
    
    // Toggle theme options
    toggle.addEventListener('click', () => {
      this.toggleOptions();
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!switcher.contains(e.target) && !options.classList.contains('hidden')) {
        this.toggleOptions();
      }
    });
    
    return switcher;
  }
  
  toggleOptions() {
    const options = document.querySelector('.theme-options');
    if (options.classList.contains('hidden')) {
      options.classList.remove('hidden');
      options.style.opacity = '1';
      options.style.transform = 'translateY(0)';
      options.style.pointerEvents = 'auto';
    } else {
      options.classList.add('hidden');
      options.style.opacity = '0';
      options.style.transform = 'translateY(-10px)';
      options.style.pointerEvents = 'none';
    }
  }
  
  setTheme(theme) {
    if (!this.themes[theme]) return;
    
    this.currentTheme = theme;
    const root = document.documentElement;
    
    // Apply theme variables
    Object.entries(this.themes[theme]).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Update text color for all elements
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    
    // Show toast notification
    window.showToast(`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme applied`);
  }
  
  init() {
    const switcher = this.createThemeSwitcher();
    document.body.appendChild(switcher);
  }
}

// Initialize theme switcher
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const themeSwitcher = new ThemeSwitcher();
    themeSwitcher.init();
  }, 1000);
});