export class Explosion {
    constructor(x, y, sprite, frameCount = 4, frameDuration = 0.1, radius = 30) {
        this.x = x;
        this.y = y;
        this.sprite = sprite;
        this.radius = radius;
        this.duration = frameCount * frameDuration;
        this.timer = 0;
        this.active = true;
        this.frameCount = frameCount;
        this.frameDuration = frameDuration;
        this.currentFrame = 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        if (this.timer >= this.duration) {
            this.active = false;
            return;
        }
        this.currentFrame = Math.floor(this.timer / this.frameDuration);
    }

    draw(ctx) {
        if (!this.active || !this.sprite) return;

        const frameWidth = this.sprite.width / this.frameCount;
        const frameHeight = this.sprite.height;

        ctx.drawImage(
            this.sprite,
            this.currentFrame * frameWidth,
            0,
            frameWidth,
            frameHeight,
            this.x - this.radius,
            this.y - this.radius,
            this.radius * 2,
            this.radius * 2
        );
    }
}