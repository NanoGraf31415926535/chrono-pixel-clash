export class PowerUp {
    constructor(x, y, width, height, type, spriteName = null, duration = 5) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.spriteName = spriteName;
        this.active = true;
        this.speed = 100;
        this.duration = duration;
    }

    update(deltaTime, canvas) {
        this.y += this.speed * deltaTime;

        if (this.y > canvas.height) {
            this.active = false;
        }
    }

    draw(ctx, assetLoader) {
        const sprite = assetLoader.getAsset(this.spriteName);
        if (sprite) {
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.getDebugColor();
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.type, this.x + this.width / 2, this.y + this.height / 2 + 4);
        }
    }

    getDebugColor() {
        switch (this.type) {
            case 'shield': return 'lightblue';
            case 'fireRate': return 'orange';
            case 'bomb': return 'darkred';
            case 'heal': return 'pink';
            case 'slowEnemies': return 'darkblue';
            case 'money': return 'gold';
            default: return 'grey';
        }
    }
}