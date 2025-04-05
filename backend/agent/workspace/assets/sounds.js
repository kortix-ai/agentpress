// Sound effects manager
const Sounds = {
    flap: new Audio('assets/sounds/flap.mp3'),
    score: new Audio('assets/sounds/score.mp3'),
    hit: new Audio('assets/sounds/hit.mp3'),
    
    play: function(sound) {
        this[sound].currentTime = 0;
        this[sound].play().catch(err => console.log('Audio play failed:', err));
    }
};