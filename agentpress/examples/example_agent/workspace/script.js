document.addEventListener('DOMContentLoaded', () => {
    const ctaButtons = document.querySelectorAll('.cta-button');
    const navLinks = document.querySelectorAll('nav ul li a');
    
    ctaButtons.forEach(ctaButton => {
        ctaButton.addEventListener('click', (e) => {
            e.preventDefault();
            ctaButton.classList.add('clicked');
            setTimeout(() => {
                ctaButton.classList.remove('clicked');
            }, 300);
            
            const modal = document.createElement('div');
            modal.classList.add('modal');
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Thank You!</h2>
                    <p>We'll get back to you soon.</p>
                    <button class="close-modal">Close</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('.close-modal').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId) || document.querySelector('main');
            targetSection.scrollIntoView({ behavior: 'smooth' });
        });
    });

    window.addEventListener('scroll', () => {
        const features = document.querySelectorAll('.feature');
        features.forEach(feature => {
            const rect = feature.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.8) {
                feature.classList.add('visible');
            }
        });
    });
});