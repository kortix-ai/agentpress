// Add audio effects to the page
document.addEventListener('DOMContentLoaded', () => {
    // Create audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    
    // Button click sound
    const button = document.querySelector('.glow-button');
    button.addEventListener('click', () => {
        playClickSound();
    });
    
    // Letter hover sound
    const letters = document.querySelectorAll('.letter');
    letters.forEach(letter => {
        letter.addEventListener('mouseenter', () => {
            playHoverSound(Math.random() * 200 + 600); // Random frequency for variety
        });
    });
    
    // Function to play click sound
    function playClickSound() {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
    
    // Function to play hover sound
    function playHoverSound(frequency) {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    }
});