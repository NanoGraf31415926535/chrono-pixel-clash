export class Projectile {
    constructor(x, y, width, height, speed, direction, color = 'yellow', damage = 1, type = 'player', velocity = {x: 0, y: 0}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.direction = direction;
        this.color = color;
        this.damage = damage;
        this.active = true;
        this.type = type;
        this.velocity = velocity;
    }

    update(deltaTime, canvas) {
        if (this.type === 'player') {
            if (this.direction === 'up') {
                this.y -= this.speed * deltaTime;
            } else if (this.direction === 'down') {
                this.y += this.speed * deltaTime;
            }
        } else if (this.type === 'boss') {
            this.x += this.velocity.x * deltaTime;
            this.y += this.velocity.y * deltaTime;
        }


        if (this.y + this.height < 0 || this.y > canvas.height || this.x + this.width < 0 || this.x > canvas.width) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}