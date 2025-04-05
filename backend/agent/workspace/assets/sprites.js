// Sprite loading and management
const Sprites = {
    bird: new Image(),
    pipeTop: new Image(),
    pipeBottom: new Image(),
    background: new Image(),
    
    load: function() {
        return new Promise((resolve) => {
            let loadedImages = 0;
            const totalImages = 4;
            
            const checkLoaded = () => {
                loadedImages++;
                if (loadedImages === totalImages) resolve();
            };
            
            this.bird.onload = checkLoaded;
            this.pipeTop.onload = checkLoaded;
            this.pipeBottom.onload = checkLoaded;
            this.background.onload = checkLoaded;
            
            this.bird.src = 'assets/images/bird.png';
            this.pipeTop.src = 'assets/images/pipe-top.png';
            this.pipeBottom.src = 'assets/images/pipe-bottom.png';
            this.background.src = 'assets/images/background.png';
        });
    }
};