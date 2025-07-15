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
    }

    update(deltaTime, canvas) {
        // Universal movement based on velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        // Deactivate projectile if it goes off-screen
        if (this.y + this.height < 0 || this.y > canvas.height || this.x + this.width < 0 || this.x > canvas.width) {
            this.active = false;
        }

        // Deactivate projectile if its duration has expired
        if (this.duration !== null) {
            this.lifeTimer += deltaTime;
            if (this.lifeTimer >= this.duration) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}