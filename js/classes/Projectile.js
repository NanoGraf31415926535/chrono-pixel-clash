export class Projectile {
    constructor(x, y, width, height, speed, direction, color = 'yellow', damage = 1, type = 'player', velocity = {x: 0, y: 0}, duration = null, owner = null, canvas = null) {
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
        this.duration = duration;
        this.lifeTimer = 0;
        this.owner = owner;

        if (velocity.x !== 0 || velocity.y !== 0) {
            this.velocity = velocity;
        } else {
            this.velocity = {
                x: 0,
                y: direction === 'up' ? -this.speed : this.speed
            };
        }
        
        this.isChargeBeam = (this.type === 'boss' && this.owner !== null && this.color.includes('rgba(255, 0, 255'));
        this.chargePhase = this.isChargeBeam ? 'charging' : null;
        this.chargeTimer = 0;
        
        // FEATURE: Added properties for special projectile types for visual effects
        this.isWarpTrail = this.type === 'warpTrail';
        this.isPlasmaBurst = this.type === 'plasmaBurst';
        this.isLightning = this.type === 'lightningEffect';
        this.isScatterShot = this.type === 'scatter_shot';
        this.isBossDefault = this.type === 'boss_default';
        if (this.isLightning) {
            this.branches = this.generateLightningBranches(canvas);
        }
    }

    update(deltaTime, canvas) {
        if (this.isChargeBeam && this.owner) {
            if (!this.owner.active) {
                this.active = false;
                return;
            }
            this.x = this.owner.x;
            this.y = this.owner.y + this.owner.height;
            this.width = this.owner.width;
            this.height = canvas.height - this.y;
        } else {
            this.x += this.velocity.x * deltaTime;
            this.y += this.velocity.y * deltaTime;
        }

        if (!this.owner && (this.y + this.height < 0 || this.y > canvas.height || this.x + this.width < 0 || this.x > canvas.width)) {
            this.active = false;
        }

        if (this.isChargeBeam) {
            this.chargeTimer += deltaTime;
            if (this.chargePhase === 'charging' && this.chargeTimer >= 0.5) {
                this.chargePhase = 'firing';
                this.chargeTimer = 0;
            } else if (this.chargePhase === 'firing' && this.chargeTimer >= 0.7) {
                this.chargePhase = 'fading';
                this.chargeTimer = 0;
            } else if (this.chargePhase === 'fading' && this.chargeTimer >= 0.2) {
                this.active = false;
            }
        }

        if (this.duration !== null) {
            this.lifeTimer += deltaTime;
            if (this.lifeTimer >= this.duration) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // FEATURE: Custom draw logic for special projectile types
        if (this.isChargeBeam) {
            let alpha = 0.85;
            let glow = 40;
            let beamWidth = this.width;
            if (this.chargePhase === 'charging') {
                const t = Math.min(1, this.chargeTimer / 0.5);
                alpha = 0.2 + 0.65 * t;
                glow = 10 + 50 * t;
                beamWidth = this.width * (0.5 + 0.5 * t);
            } else if (this.chargePhase === 'fading') {
                const t = 1 - Math.min(1, this.chargeTimer / 0.2);
                alpha = 0.85 * t;
                glow = 40 * t;
                beamWidth = this.width * (0.8 + 0.2 * t);
            }
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = glow;
            ctx.fillStyle = 'rgba(255,0,255,1)';
            ctx.fillRect(this.x + (this.width - beamWidth) / 2, this.y, beamWidth, this.height);
            ctx.restore();
        } else if (this.isPlasmaBurst) {
            ctx.save();
            const time = performance.now();
            const pulse = 0.9 + 0.1 * Math.sin(time / 100);
            const grad = ctx.createRadialGradient(this.x + this.width/2, this.y + this.height/2, 0, this.x + this.width/2, this.y + this.height/2, this.width/2 * pulse);
            grad.addColorStop(0, 'rgba(255, 255, 100, 1)');
            grad.addColorStop(0.5, 'rgba(255, 165, 0, 0.8)');
            grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = grad;
            ctx.shadowColor = 'orange';
            ctx.shadowBlur = 20;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        } else if (this.isWarpTrail) {
            ctx.save();
            const fade = 1 - (this.lifeTimer / this.duration);
            ctx.globalAlpha = fade * 0.7;
            ctx.fillStyle = this.color;
            ctx.filter = `blur(${ (1 - fade) * 10 }px)`;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        } else if (this.isLightning) {
            ctx.save();
            const fade = 1 - (this.lifeTimer / this.duration);
            ctx.globalAlpha = fade * (0.6 + Math.random() * 0.4);
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 2 + Math.random() * 2;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10 + Math.random() * 10;
            
            this.branches.forEach(branch => {
                ctx.beginPath();
                ctx.moveTo(branch.start.x, branch.start.y);
                ctx.lineTo(branch.end.x, branch.end.y);
                ctx.stroke();
            });
            ctx.restore();
        } else if (this.isScatterShot) {
            ctx.save();
            const time = performance.now();
            const angle = time / 100 + this.x + this.y;
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(angle);
            ctx.fillStyle = 'lime';
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 15;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        } else if (this.isBossDefault) {
            ctx.save();
            ctx.fillStyle = 'magenta';
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
            const coreWidth = this.width * 0.5;
            const coreHeight = this.height * 0.8;
            ctx.fillRect(this.x + (this.width - coreWidth)/2, this.y, coreWidth, coreHeight);
            
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'pink';
            ctx.fillRect(this.x, this.y + this.height * 0.1, this.width, this.height * 0.6);

            ctx.restore();
        } else {
            // Laser effect for player projectiles
            if (this.type === 'player') {
                ctx.save();
                // Animate laser width for pulse effect
                const time = performance.now();
                const pulse = 0.85 + 0.15 * Math.sin(time / 80 + this.x * 0.1);
                const laserWidth = this.width * pulse;
                // Create a vertical gradient for the laser
                const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
                grad.addColorStop(0, 'rgba(0,255,255,0.95)');
                grad.addColorStop(0.2, 'rgba(0,255,255,0.7)');
                grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
                grad.addColorStop(0.8, 'rgba(0,255,255,0.7)');
                grad.addColorStop(1, 'rgba(0,255,255,0.95)');
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 18;
                ctx.globalAlpha = 0.92;
                ctx.fillStyle = grad;
                // Center the laser horizontally
                ctx.fillRect(this.x + (this.width - laserWidth) / 2, this.y, laserWidth, this.height);
                // Add a subtle outer glow
                ctx.globalAlpha = 0.35;
                ctx.shadowBlur = 32;
                ctx.fillStyle = 'rgba(0,255,255,0.5)';
                ctx.fillRect(this.x + (this.width - laserWidth) / 2 - 2, this.y - 2, laserWidth + 4, this.height + 4);
                ctx.restore();
            } else {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }
    }

    generateLightningBranches(canvas) {
        const branches = [];
        const startPoint = { x: this.x + this.width / 2, y: this.y };
        
        const initialLength = canvas ? (canvas.height / 10) : 50; // Use canvas height for scale

        let generation = [{ point: startPoint, angle: Math.PI / 2, length: initialLength + Math.random() * 20 }];

        for (let i = 0; i < 6; i++) { // More generations to cover distance
            const newGeneration = [];
            for (const parent of generation) {
                const endPoint = {
                    x: parent.point.x + Math.cos(parent.angle) * parent.length,
                    y: parent.point.y + Math.sin(parent.angle) * parent.length
                };
                branches.push({ start: parent.point, end: endPoint });

                // Stop branching if it goes off screen
                if (canvas && endPoint.y > canvas.height) continue;

                // Create 1-2 new branches from the endpoint
                const numBranches = 1 + Math.floor(Math.random() * 2);
                for (let j = 0; j < numBranches; j++) {
                    const angle = parent.angle + (Math.random() - 0.5) * (Math.PI / 1.5); // Wider angle
                    const length = parent.length * (0.75 + Math.random() * 0.2); // Keep branches relatively long
                    if (length > 10) {
                        // Constrain horizontal spread to roughly 20% of screen width from center
                         if (canvas) {
                            const nextX = endPoint.x + Math.cos(angle) * length;
                            if (Math.abs(nextX - startPoint.x) > canvas.width * 0.12) {
                                continue;
                            }
                        }
                        newGeneration.push({ point: endPoint, angle, length });
                    }
                }
            }
            generation = newGeneration;
            if (generation.length === 0) break;
        }
        return branches;
    }
}