export class Projectile {
    constructor(x, y, width, height, speed, direction, color = 'yellow', damage = 1, type = 'player', velocity = {x: 0, y: 0}, duration = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.direction = direction; // 'up' or 'down' for player, unused for boss
        this.color = color;
        this.damage = damage;
        this.active = true;
        this.type = type; // 'player' or 'boss'
        this.duration = duration; // How long the projectile lasts in seconds
        this.lifeTimer = 0;
        
        // If a velocity object is provided, use it. Otherwise, calculate based on direction.
        if (velocity.x !== 0 || velocity.y !== 0) {
            this.velocity = velocity;
        } else {
            this.velocity = {
                x: 0,
                y: direction === 'up' ? -this.speed : this.speed
            };
        }
        // Charge beam animation state
        this.isChargeBeam = (color === 'rgba(255, 0, 255, 0.7)' && width > 100 && height > 1000);
        this.chargePhase = this.isChargeBeam ? 'charging' : null; // 'charging', 'firing', 'fading'
        this.chargeTimer = 0;
    }

    update(deltaTime, canvas) {
        // Universal movement based on velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        // Deactivate projectile if it goes off-screen
        if (this.y + this.height < 0 || this.y > canvas.height || this.x + this.width < 0 || this.x > canvas.width) {
            this.active = false;
        }

        // Charge beam animation logic
        if (this.isChargeBeam) {
            this.chargeTimer += deltaTime;
            // Charging phase: 0.5s
            if (this.chargePhase === 'charging' && this.chargeTimer >= 0.5) {
                this.chargePhase = 'firing';
                this.chargeTimer = 0;
            } else if (this.chargePhase === 'firing' && this.chargeTimer >= (this.duration ? this.duration - 0.7 : 0.5)) {
                this.chargePhase = 'fading';
                this.chargeTimer = 0;
            } else if (this.chargePhase === 'fading' && this.chargeTimer >= 0.2) {
                this.active = false;
            }
        }

        // Deactivate projectile if its duration has expired (for non-chargeBeam)
        if (!this.isChargeBeam && this.duration !== null) {
            this.lifeTimer += deltaTime;
            if (this.lifeTimer >= this.duration) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        if (this.isChargeBeam) {
            // Animate charge beam
            let alpha = 0.7;
            let glow = 30;
            let beamWidth = this.width;
            if (this.chargePhase === 'charging') {
                // Grow/fade in
                const t = Math.min(1, this.chargeTimer / 0.5);
                alpha = 0.2 + 0.5 * t;
                glow = 10 + 40 * t;
                beamWidth = this.width * (0.5 + 0.5 * t);
            } else if (this.chargePhase === 'fading') {
                // Fade out
                const t = 1 - Math.min(1, this.chargeTimer / 0.2);
                alpha = 0.7 * t;
                glow = 30 * t;
                beamWidth = this.width * (0.8 + 0.2 * t);
            }
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = glow;
            ctx.fillStyle = 'rgba(255,0,255,1)';
            ctx.fillRect(this.x + (this.width - beamWidth) / 2, this.y, beamWidth, this.height);
            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}