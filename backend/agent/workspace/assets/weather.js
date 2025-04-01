// Simple weather integration for RideShare
class WeatherService {
  constructor() {
    this.weatherIcons = {
      'clear': 'fa-sun',
      'clouds': 'fa-cloud',
      'rain': 'fa-cloud-rain',
      'snow': 'fa-snowflake',
      'thunderstorm': 'fa-bolt',
      'drizzle': 'fa-cloud-rain',
      'mist': 'fa-smog',
      'fog': 'fa-smog'
    };
  }
  
  // Simulate getting weather for a location
  async getWeather(lat, lng) {
    // In a real app, this would call a weather API
    console.log(`Getting weather for ${lat}, ${lng}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate random weather for demo
    const weatherTypes = ['clear', 'clouds', 'rain', 'clear', 'clear', 'clouds'];
    const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    
    // Generate random temperature between 50-85°F
    const temperature = Math.floor(Math.random() * 35) + 50;
    
    return {
      type: randomWeather,
      icon: this.weatherIcons[randomWeather] || 'fa-cloud',
      temperature: temperature,
      description: this.getWeatherDescription(randomWeather, temperature)
    };
  }
  
  getWeatherDescription(type, temp) {
    switch(type) {
      case 'clear':
        return temp > 80 ? 'Sunny and hot' : 'Sunny and pleasant';
      case 'clouds':
        return 'Partly cloudy';
      case 'rain':
        return 'Light rain';
      case 'snow':
        return 'Snow flurries';
      case 'thunderstorm':
        return 'Thunderstorms';
      case 'drizzle':
        return 'Light drizzle';
      case 'mist':
      case 'fog':
        return 'Foggy conditions';
      default:
        return 'Weather unavailable';
    }
  }
  
  // Create a weather widget element
  createWeatherWidget(weatherData) {
    const widget = document.createElement('div');
    widget.className = 'weather-widget';
    widget.innerHTML = `
      <i class="fas ${weatherData.icon}"></i>
      <span>${weatherData.temperature}°F</span>
    `;
    widget.title = weatherData.description;
    
    // Style the widget
    widget.style.position = 'absolute';
    widget.style.top = '70px';
    widget.style.right = '10px';
    widget.style.backgroundColor = 'white';
    widget.style.padding = '8px 12px';
    widget.style.borderRadius = '20px';
    widget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
    widget.style.display = 'flex';
    widget.style.alignItems = 'center';
    widget.style.gap = '8px';
    widget.style.zIndex = '100';
    widget.style.fontSize = '14px';
    
    return widget;
  }
}

// Export to window
window.WeatherService = WeatherService;