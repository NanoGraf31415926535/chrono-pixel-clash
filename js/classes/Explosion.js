export class Explosion {
    constructor(x, y, sprite, initialRadius = 5, maxRadius = 30, duration = 0.2) {
        this.x = x;
        this.y = y;
        this.sprite = sprite; // The sprite for the explosion
        this.initialRadius = initialRadius;
        this.maxRadius = maxRadius;
        this.duration = duration;
        this.timer = 0;
        this.active = true;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        if (this.timer >= this.duration) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        const progress = this.timer / this.duration;
        const currentRadius = this.initialRadius + (this.maxRadius - this.initialRadius) * progress;
        const opacity = 1 - progress;

        ctx.save();
        ctx.globalAlpha = opacity;

        if (this.sprite) {
            // Draw the sprite, centered on the explosion's location
            ctx.drawImage(
                this.sprite,
                this.x - currentRadius,
                this.y - currentRadius,
                currentRadius * 2,
                currentRadius * 2
            );
        } else {
            // Fallback to drawing a circle if no sprite is provided
            ctx.fillStyle = 'orange';
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}