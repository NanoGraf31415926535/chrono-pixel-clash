import { Projectile } from './Projectile.js';

export class Player {
    constructor(gameInstance) {
        this.game = gameInstance; // Reference to the main game object
        this.canvas = this.game.canvas;
        
        // NEW: Player dimensions and speed are now derived from the current ship's stats
        this.width = 60; // Set a default/base width for all ships
        this.height = 60; // Set a default/base height for all ships
        this.x = this.canvas.width / 2 - (this.width / 2); // Center player horizontally
        this.y = this.canvas.height - this.game.base.height - this.height - 20; // Position above the base
        
        this.speed = this.game.currentShipStats.speed; // Get speed from current ship stats
        this.color = 'red'; // Keep a fallback color, though sprites will be used
    }

    update(deltaTime, keys) {
        // Player movement based on keys
        if (keys['ArrowLeft'] || keys['a']) {
            this.x -= this.speed * deltaTime;
        }
        if (keys['ArrowRight'] || keys['d']) {
            this.x += this.speed * deltaTime;
        }
        if (keys['ArrowUp'] || keys['w']) {
            this.y -= this.speed * deltaTime;
        }
        if (keys['ArrowDown'] || keys['s']) {
            this.y += this.speed * deltaTime;
        }

        // Boundary checks to keep player within canvas and above the base
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.canvas.width) this.x = this.canvas.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > this.canvas.height - this.game.base.height) {
            this.y = this.canvas.height - this.game.base.height - this.height;
        }
    }
    
    draw(ctx, assetLoader, isInvincible, invincibilityTimer) {
        // Get the sprite name from the currently equipped ship in Game.js
        const shipSpriteName = this.game.shipConfigs[this.game.currentShipType].spriteName;
        const playerSprite = assetLoader.getAsset(shipSpriteName);
        
        // Handle invincibility blink effect
        if (isInvincible && Math.floor(invincibilityTimer * 10) % 2 === 0) {
            return; // Don't draw to create a "blink" effect
        }

        if (playerSprite) {
            // Draw the player's current ship sprite
            ctx.drawImage(playerSprite, this.x, this.y, this.width, this.height);
        } else {
            // Fallback: draw a colored rectangle if sprite is not loaded
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Draw Health Bar
        const healthBarWidth = this.width * 0.8;
        const healthBarHeight = 8;
        const healthBarX = this.x + (this.width - healthBarWidth) / 2;
        const healthBarY = this.y - healthBarHeight - 5;
        const currentHealth = Math.max(0, this.game.playerHealth);
        const maxHealth = this.game.currentShipStats.health;

        ctx.fillStyle = 'red';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        const currentHealthWidth = (currentHealth / maxHealth) * healthBarWidth;
        ctx.fillStyle = 'green';
        ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
    }

    fire() {
        // Get projectile stats from the currently equipped ship
        const shipStats = this.game.currentShipStats;
        const projectileArray = this.game.projectiles;

        const baseProjectileX = this.x + (this.width / 2);
        // Calculate total width needed for multiple projectiles to be centered
        const totalProjectileWidth = shipStats.numProjectiles * shipStats.projectileWidth + (shipStats.numProjectiles - 1) * 5; // 5px spacing
        const startX = baseProjectileX - (totalProjectileWidth / 2);

        // Create and add projectiles based on the current ship's multi-shot and other stats
        for (let i = 0; i < shipStats.numProjectiles; i++) {
            const projectileX = startX + (i * (shipStats.projectileWidth + 5));
            const projectileY = this.y;

            const newProjectile = new Projectile(
                projectileX,
                projectileY,
                shipStats.projectileWidth,
                shipStats.projectileHeight,
                shipStats.projectileSpeed,
                'up', // Projectiles always go up from the player
                'orange', // Projectile color
                shipStats.damage // Projectile damage
            );
            projectileArray.push(newProjectile);
        }
    }
}