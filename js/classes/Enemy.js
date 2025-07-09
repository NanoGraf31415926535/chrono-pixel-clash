import { Projectile } from './Projectile.js';

export class Enemy {
    constructor(x, y, width, height, speed, type, spriteName, isBoss = false, fireRate = 0, projectileSpeed = 0, projectileDamage = 0, specialAttackType = 'none') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.type = type;
        this.spriteName = spriteName;
        this.active = true;
        this.health = 1;
        this.isStunned = false;

        this.isBoss = isBoss;
        this.fireRate = fireRate;
        this.projectileSpeed = projectileSpeed;
        this.projectileDamage = projectileDamage;
        this.lastShotTime = 0;
        this.maxHealth = this.health;

        if (this.isBoss) {
            this.isEntering = true;
            this.entrySpeed = 200;
            this.phase = 1;
            this.hasEnteredPhaseTwo = false;
            this.isEnraged = false;
            this.rageDuration = 5;
            this.rageCooldown = 15;
            this.lastRageTime = 0;
            this.rageTimer = 0;
            
            this.horizontalSpeed = 75;
            this.horizontalDirection = Math.random() < 0.5 ? 1 : -1;
            this.moveChangeTimer = 0;
            this.dodgeChance = 0.4;
            
            this.specialAttackType = specialAttackType;
            this.specialAttackCooldown = 10;
            this.lastSpecialAttackTime = 0;
            this.isChargingSpecial = false;
            this.chargeTimer = 0;

            // State for managing the special attack itself
            this.isUnleashingSpecial = false;
            this.specialAttackState = {
                barrageCount: 0,
                barrageTimer: 0,
            };
        }
    }

    update(deltaTime, canvas, player = null) {
        if (!this.active || (this.isStunned && !this.isBoss)) return { newProjectiles: [], newEnemies: [] };

        const projectiles = [];
        const enemies = [];
        const currentTime = performance.now() / 1000;

        if (this.isBoss) {
            // Phase transition
            if (this.health <= this.maxHealth / 2 && !this.hasEnteredPhaseTwo) {
                this.hasEnteredPhaseTwo = true;
                this.phase = 2;
                this.fireRate *= 0.75;
                this.speed *= 1.2;
            }

            // Rage ability
            if (this.phase === 2 && !this.isStunned) {
                if (!this.isEnraged && currentTime - this.lastRageTime > this.rageCooldown) {
                    this.isEnraged = true;
                    this.rageTimer = this.rageDuration;
                    this.lastRageTime = currentTime;
                    this.speed *= 1.5;
                    this.fireRate *= 0.5;
                }
                if (this.isEnraged) {
                    this.rageTimer -= deltaTime;
                    if (this.rageTimer <= 0) {
                        this.isEnraged = false;
                        this.speed /= 1.5;
                        this.fireRate /= 0.5;
                    }
                }
            }

            // Movement
            if (!this.isStunned) {
                if (this.isEntering) {
                    this.y += this.entrySpeed * deltaTime;
                    if (this.y >= 50) this.isEntering = false;
                } else {
                    this.y += this.speed * deltaTime;
                    this.x += this.horizontalSpeed * this.horizontalDirection * deltaTime;
                    this.moveChangeTimer -= deltaTime;
                    if (this.moveChangeTimer <= 0) {
                        this.horizontalDirection *= -1;
                        this.moveChangeTimer = Math.random() * 2 + 1;
                    }
                }
            }

            // Boundary checks
            if (this.x < 0) {
                this.x = 0;
                this.horizontalDirection = 1;
            }
            if (this.x + this.width > canvas.width) {
                this.x = canvas.width - this.width;
                this.horizontalDirection = -1;
            }

            // Regular attack
            if (player && currentTime - this.lastShotTime >= this.fireRate && !this.isChargingSpecial && !this.isUnleashingSpecial && !this.isStunned) {
                this.lastShotTime = currentTime;
                projectiles.push(...this.fireNormalShot(player));
            }
            
            // Special attack logic
            if (player && currentTime - this.lastSpecialAttackTime >= this.specialAttackCooldown && !this.isChargingSpecial && !this.isUnleashingSpecial && !this.isStunned) {
                this.isChargingSpecial = true;
                this.chargeTimer = 1.5;
                this.lastSpecialAttackTime = currentTime;
            }

            if (this.isChargingSpecial) {
                this.chargeTimer -= deltaTime;
                if (this.chargeTimer <= 0) {
                    this.isChargingSpecial = false;
                    this.isUnleashingSpecial = true;
                    this.specialAttackState.barrageCount = 0;
                    this.specialAttackState.barrageTimer = 0;
                }
            }

            if (this.isUnleashingSpecial) {
                const specialAttackResult = this.unleashSpecialAttack(deltaTime, player);
                projectiles.push(...specialAttackResult.newProjectiles);
                enemies.push(...specialAttackResult.newEnemies);
            }

        } else { // Regular enemy movement
            if (!this.isStunned) {
                this.y += this.speed * deltaTime;
            }
            if (this.y > canvas.height) this.active = false;
        }

        return { newProjectiles: projectiles, newEnemies: enemies };
    }
    
    fireNormalShot(player) {
        const projectiles = [];
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const dx = targetX - (this.x + this.width / 2);
        const dy = targetY - (this.y + this.height);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;

        const createProjectile = (velX, velY) => new Projectile(this.x + this.width / 2 - 5, this.y + this.height, 10, 20, this.projectileSpeed, 'down', 'red', this.projectileDamage, 'boss', { x: velX * this.projectileSpeed, y: velY * this.projectileSpeed });

        projectiles.push(createProjectile(normalizedDx, normalizedDy));

        if (this.phase === 2) {
            const angle = Math.atan2(normalizedDy, normalizedDx);
            const spreadAngle = Math.PI / 12;
            projectiles.push(createProjectile(Math.cos(angle - spreadAngle), Math.sin(angle - spreadAngle)));
            projectiles.push(createProjectile(Math.cos(angle + spreadAngle), Math.sin(angle + spreadAngle)));
        }
        return projectiles;
    }

    unleashSpecialAttack(deltaTime, player) {
        const newProjectiles = [];
        const newEnemies = [];

        switch (this.specialAttackType) {
            case 'laserBarrage':
                this.specialAttackState.barrageTimer -= deltaTime;
                if (this.specialAttackState.barrageTimer <= 0 && this.specialAttackState.barrageCount < 10) {
                    const velocity = { x: 0, y: this.projectileSpeed * 1.5 };
                    const projectile = new Projectile(
                        this.x + this.width / 2 - 5, 
                        this.y + this.height, 
                        8, 
                        25, 
                        this.projectileSpeed * 1.5, 
                        'down', 
                        'cyan', 
                        this.projectileDamage * 0.8, 
                        'boss',
                        velocity
                    );
                    newProjectiles.push(projectile);
                    this.specialAttackState.barrageCount++;
                    this.specialAttackState.barrageTimer = 0.1; // Fire every 0.1 seconds
                }
                if (this.specialAttackState.barrageCount >= 10) {
                    this.isUnleashingSpecial = false;
                }
                break;
            case 'summonMinions':
                for (let i = 0; i < 3; i++) {
                    const minionX = this.x + (i * (this.width / 3));
                    const minion = new Enemy(minionX, this.y + this.height, 40, 40, 100, 'basic', 'monster1', false);
                    minion.health = 3; // Minions have the same base health as normal enemies
                    minion.maxHealth = 3;
                    newEnemies.push(minion);
                }
                this.isUnleashingSpecial = false; // This is a one-time effect
                break;
            case 'chargeBeam':
                {
                    const velocity = { x: 0, y: this.projectileSpeed * 0.5 };
                    newProjectiles.push(new Projectile(
                        this.x + this.width / 2 - 25, 
                        this.y + this.height, 
                        50, 
                        30, 
                        this.projectileSpeed * 0.5, 
                        'down', 
                        'yellow', 
                        this.projectileDamage * 3, 
                        'boss',
                        velocity
                    ));
                }
                this.isUnleashingSpecial = false; // This is a one-time effect
                break;
        }
        return { newProjectiles, newEnemies };
    }

    attemptDodge() {
        if (Math.random() < this.dodgeChance) {
            this.horizontalDirection *= -1;
            this.moveChangeTimer = 0.5;
        }
    }

    draw(ctx, assetLoader) {
        const sprite = assetLoader.getAsset(this.spriteName);
        if (sprite) {
            ctx.save();
            if (this.isChargingSpecial) {
                ctx.filter = 'brightness(2.5) drop-shadow(0 0 10px yellow)';
            } else if (this.isEnraged) {
                ctx.filter = 'hue-rotate(-45deg) brightness(1.5)';
            } else if (this.phase === 2) {
                ctx.filter = 'saturate(2)';
            }
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
            ctx.restore();
        } else {
            ctx.fillStyle = this.isBoss ? 'purple' : 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        const healthBarWidth = this.width * 0.8;
        const healthBarHeight = 5;
        const healthBarX = this.x + (this.width - healthBarWidth) / 2;
        const healthBarY = this.y - healthBarHeight - 5;

        ctx.fillStyle = 'darkred';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        const currentHealthWidth = (this.health / this.maxHealth) * healthBarWidth;
        ctx.fillStyle = 'lime';
        ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
    }
}