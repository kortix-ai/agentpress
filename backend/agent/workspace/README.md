# Modern Web Application

A responsive, feature-rich web application with dark mode, preloader, and back-to-top functionality.

## Features

- **Responsive Design**: Looks great on all devices, from mobile phones to desktop computers
- **Dark Mode**: Toggle between light and dark themes for comfortable viewing
- **Preloader**: Smooth loading experience with a custom preloader animation
- **Back to Top**: Easily navigate back to the top of the page with a single click
- **Modern UI**: Clean, modern interface with smooth animations
- **Form Validation**: Client-side validation for contact and newsletter forms
- **Testimonial Slider**: Showcase client testimonials with an auto-sliding carousel
- **Counter Animation**: Animated statistics counters that activate on scroll
- **Mobile Menu**: Collapsible navigation menu for mobile devices

## Technologies Used

- HTML5
- CSS3 (with CSS Variables for theming)
- JavaScript (Vanilla JS, no frameworks)
- Font Awesome for icons
- Google Fonts (Poppins)

## Project Structure

```
├── index.html          # Main HTML file
├── styles.css          # Main stylesheet
├── script.js           # Main JavaScript file
├── preloader.js        # Preloader functionality
├── back-to-top.js      # Back to top button functionality
├── dark-mode.js        # Dark mode toggle functionality
└── README.md           # Project documentation
```

## How to Use

1. Clone or download the repository
2. Open `index.html` in your browser
3. Explore the different sections and features

## Customization

### Changing Colors

The color scheme can be easily modified by changing the CSS variables in the `:root` selector in `styles.css`:

```css
:root {
    --primary-color: #4a6cf7;
    --primary-dark: #3a56d4;
    /* other variables */
}
```

### Adding New Sections

To add a new section, follow the structure of existing sections in `index.html`. Each section follows this pattern:

```html
<section id="section-id" class="section-name section-padding">
    <div class="container">
        <div class="section-header">
            <span class="section-subtitle">Subtitle</span>
            <h2>Section Title</h2>
            <p>Section description</p>
        </div>
        <!-- Section content -->
    </div>
</section>
```

## Browser Support

This application is compatible with:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Opera (latest)

## License

This project is available for personal and commercial use.