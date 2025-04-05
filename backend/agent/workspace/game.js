const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverDiv = document.getElementById('game-over');

// Game constants
const GRAVITY = 0.4;
const FLAP_SPEED = -7;
const PIPE_SPEED = 2;
const PIPE_GAP = 150;

// Initialize particle system and trail
const particles = new ParticleSystem();
const trail = new Trail();

// Game state
let bird = {
    x: 50,
    y: canvas.height / 2,
    velocity: 0,
    width: 30,
    height: 30,
    rotation: 0,
    wingAngle: 0
};

let pipes = [];
let score = 0;
let gameRunning = false;
let frameCount = 0;
let highScore = localStorage.getItem('highScore') || 0;

// Neon colors for the bird
const birdColors = {
    primary: '#0ff',
    secondary: '#f0f',
    glow: '#fff'
};

function drawNeonBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation * Math.PI / 180);

    // Draw trail
    trail.draw(ctx);

    // Draw wing
    bird.wingAngle = Math.sin(frameCount * 0.3) * 30;
    
    // Bird body glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = birdColors.primary;
    
    // Main body
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.width/2, bird.height/2, 0, 0, Math.PI * 2);
    ctx.fillStyle = birdColors.primary;
    ctx.fill();

    // Wing
    ctx.save();
    ctx.rotate(bird.wingAngle * Math.PI / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.width/3, bird.height/4, 0, 0, Math.PI);
    ctx.fillStyle = birdColors.secondary;
    ctx.fill();
    ctx.restore();

    // Eye
    ctx.shadowBlur = 10;
    ctx.shadowColor = birdColors.glow;
    ctx.beginPath();
    ctx.arc(bird.width/4, -bird.height/6, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.restore();
}

function drawNeonPipe(pipe, isTop) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0ff';
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';

    if (isTop) {
        ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
        ctx.strokeRect(pipe.x, pipe.y, pipe.width, pipe.height);
    } else {
        ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
        ctx.strokeRect(pipe.x, pipe.y, pipe.width, pipe.height);
    }
    ctx.restore();
}

// Update the original drawPipes function
function drawPipes() {
    pipes.forEach((pipe, index) => {
        drawNeonPipe(pipe, index % 2 === 0);
    });
}

// Update the original handleClick function
function handleClick() {
    if (!gameRunning) {
        startGame();
    } else {
        bird.velocity = FLAP_SPEED;
        bird.rotation = -45;
        particles.emit(bird.x, bird.y, 5, birdColors.primary);
        Sounds.play('flap');
    }
}

// Update the original updateGame function
function updateGame() {
    if (!gameRunning) return;

    // Update bird
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
    
    // Update trail
    trail.addPoint(bird.x, bird.y);
    
    // Update bird rotation
    if (bird.velocity > 0) {
        bird.rotation += 4;
        bird.rotation = Math.min(90, bird.rotation);
    }

    // Generate particles while moving
    if (frameCount % 3 === 0) {
        particles.emit(bird.x - 10, bird.y, 1, birdColors.secondary);
    }

    // Rest of the updateGame function remains the same
    [... existing updateGame code ...]
}

// Update the original animate function
function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background with a gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(1, '#111');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid effect
    drawGrid();
    
    updateGame();
    drawPipes();
    particles.update(ctx);
    drawNeonBird();
    drawScore();
    
    frameCount++;
    requestAnimationFrame(animate);
}

// Add new grid effect
function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 30;
    const offset = frameCount % gridSize;
    
    for (let x = -offset; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = -offset; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Start the game
initGame();