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
        this.baseFireRate = fireRate; // Store base fire rate for rage mode
        this.projectileSpeed = projectileSpeed;
        this.projectileDamage = projectileDamage;
        this.lastShotTime = 0;
        this.maxHealth = this.health;

        if (this.isBoss) {
            // General Boss Properties
            this.isEntering = true;
            this.entrySpeed = 100;
            this.horizontalSpeed = 75;
            this.horizontalDirection = Math.random() < 0.5 ? 1 : -1;
            
            // *** FEATURE: Boss Phases ***
            this.phase = 1;
            this.hasEnteredPhaseTwo = false;

            // *** FEATURE: Rage Mode ***
            this.isEnraged = false;
            this.rageTimer = 0;
            this.rageDuration = 5; // 5 seconds of rage
            this.rageCooldown = 15; // 15 seconds cooldown between rages
            this.rageCooldownTimer = this.rageCooldown;

            // Special Attack Properties
            this.specialAttackType = specialAttackType;
            this.specialAttackCooldown = 10;
            this.specialAttackTimer = this.specialAttackCooldown;
            this.isChargingSpecial = false;
            this.chargeTimer = 0;

            // Dodge Properties
            this.dodgeSpeed = 300;
            this.isDodging = false;
            this.dodgeDuration = 0.3;
            this.dodgeTimer = 0;
            this.dodgeCooldown = 2;
            this.dodgeCooldownTimer = 0;

            // Laser Barrage Properties
            this.isBarraging = false;
            this.barrageCount = 0;
            this.barrageTimer = 0;
            this.barrageShotDelay = 0.1; // 100ms between shots
            this.barrageShots = 5;
        }
    }

    update(deltaTime, canvas, player, playerProjectiles, game) {
        if (this.isStunned) {
            return { newProjectiles: [], newEnemies: [] };
        }

        if (this.isBoss) {
            // *** FEATURE: Phase Transition Logic ***
            if (!this.hasEnteredPhaseTwo && this.health <= this.maxHealth / 2) {
                this.hasEnteredPhaseTwo = true;
                this.phase = 2;
                this.horizontalSpeed *= 1.5; // Increase speed in phase 2
                this.baseFireRate *= 0.75; // Increase base fire rate in phase 2
                this.fireRate = this.baseFireRate;
            }

            // *** FEATURE: Rage Mode Logic ***
            if (this.isEnraged) {
                this.rageTimer -= deltaTime;
                if (this.rageTimer <= 0) {
                    this.isEnraged = false;
                    this.fireRate = this.baseFireRate; // Revert to base fire rate
                }
            } else {
                this.rageCooldownTimer -= deltaTime;
                if (this.rageCooldownTimer <= 0) {
                    this.isEnraged = true;
                    this.rageTimer = this.rageDuration;
                    this.fireRate = this.baseFireRate * 0.33; // Significantly increase fire rate
                    this.rageCooldownTimer = this.rageCooldown;
                }
            }

            this.handleDodging(deltaTime, playerProjectiles);

            if (this.isEntering) {
                this.y += this.entrySpeed * deltaTime;
                if (this.y >= 50) {
                    this.y = 50;
                    this.isEntering = false;
                }
            } else if (this.isDodging) {
                this.x += this.horizontalDirection * this.dodgeSpeed * deltaTime;
            } else if (!this.isChargingSpecial) {
                this.x += this.horizontalDirection * this.horizontalSpeed * deltaTime;
                if (this.x <= 0 || this.x + this.width >= canvas.width) {
                    this.horizontalDirection *= -1;
                }
            }
            
            this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));

            const currentTime = performance.now() / 1000;
            let newProjectiles = [];
            let newEnemies = [];

            if (this.isChargingSpecial) {
                this.chargeTimer -= deltaTime;
                if (this.chargeTimer <= 0) {
                    const attackResult = this.useSpecialAttack(player, game.enemyProjectiles);
                    newEnemies = attackResult.newEnemies;
                    this.isChargingSpecial = false;
                }
            } else if (this.isBarraging) {
                this.barrageTimer += deltaTime;
                if (this.barrageTimer >= this.barrageShotDelay && this.barrageCount < this.barrageShots) {
                    const angle = Math.atan2(player.y - (this.y + this.height), player.x - (this.x + this.width / 2));
                    const velocity = {
                        x: Math.cos(angle) * this.projectileSpeed * 1.5,
                        y: Math.sin(angle) * this.projectileSpeed * 1.5
                    };
                    newProjectiles.push(new Projectile(
                        this.x + this.width / 2, this.y + this.height,
                        8, 16, 0, 'down', 'cyan', this.projectileDamage, 'boss', velocity
                    ));
                    this.barrageCount++;
                    this.barrageTimer = 0;
                }
                if (this.barrageCount >= this.barrageShots) {
                    this.isBarraging = false;
                }
            } else {
                if (currentTime - this.lastShotTime >= this.fireRate) {
                    newProjectiles.push(...this.fire(player));
                    this.lastShotTime = currentTime;
                }

                this.specialAttackTimer -= deltaTime;
                if (this.specialAttackTimer <= 0) {
                    this.beginSpecialAttack();
                }
            }
            return { newProjectiles, newEnemies };

        } else {
            this.y += this.speed * deltaTime;
            if (this.y > canvas.height) {
                this.active = false;
            }
        }
        return { newProjectiles: [], newEnemies: [] };
    }
    
    handleDodging(deltaTime, playerProjectiles) {
        this.dodgeCooldownTimer -= deltaTime;
        if (this.isDodging) {
            this.dodgeTimer -= deltaTime;
            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
            }
            return;
        }

        if (this.dodgeCooldownTimer > 0) {
            return;
        }

        const dangerZone = {
            x: this.x - this.width,
            y: this.y,
            width: this.width * 3,
            height: this.height + 200
        };

        for (const p of playerProjectiles) {
            if (p.y > this.y + this.height) continue;

            const projectileHitbox = { x: p.x, y: p.y, width: p.width, height: p.height };
            
            if (projectileHitbox.x < dangerZone.x + dangerZone.width &&
                projectileHitbox.x + projectileHitbox.width > dangerZone.x &&
                projectileHitbox.y < dangerZone.y + dangerZone.height &&
                projectileHitbox.y + projectileHitbox.height > dangerZone.y)
            {
                this.isDodging = true;
                this.dodgeTimer = this.dodgeDuration;
                this.dodgeCooldownTimer = this.dodgeCooldown;
                this.horizontalDirection = (this.x > p.x) ? 1 : -1;
                break; 
            }
        }
    }

    fire(player) {
        const projectiles = [];
        const projectileX = this.x + this.width / 2;
        const projectileY = this.y + this.height;

        projectiles.push(new Projectile(
            projectileX, projectileY,
            10, 20,
            this.projectileSpeed,
            'down', 'pink', this.projectileDamage, 'boss'
        ));
        return projectiles;
    }

    beginSpecialAttack() {
        this.isChargingSpecial = true;
        this.specialAttackTimer = this.specialAttackCooldown;

        switch (this.specialAttackType) {
            case 'chargeBeam': this.chargeTimer = 1.5; break;
            case 'laserBarrage': this.chargeTimer = 1; break;
            case 'summonMinions': this.chargeTimer = 0.5; break;
            case 'scatterShot': this.chargeTimer = 1.2; break;
        }
    }

    useSpecialAttack(player, enemyProjectiles) {
        let newEnemies = [];

        switch (this.specialAttackType) {
            case 'chargeBeam': {
                const beam = new Projectile(
                    this.x, this.y + this.height,
                    this.width, 2000, // width and height
                    0, 'down', // speed and direction
                    'rgba(255, 0, 255, 0.7)', // color
                    this.projectileDamage * 5, // damage
                    'boss', // type
                    { x: 0, y: 0 }, // velocity
                    1.0 // duration
                );
                enemyProjectiles.push(beam);
                break;
            }
            case 'laserBarrage': {
                this.isBarraging = true;
                this.barrageCount = 0;
                this.barrageTimer = 0;
                break;
            }
            case 'summonMinions': {
                for (let i = 0; i < 3; i++) {
                    const enemyX = this.x + (this.width / 4) * (i + 1) - 40;
                    const newEnemy = new Enemy(enemyX, this.y + this.height, 60, 60, 120, 'basic', 'monster1');
                    newEnemy.health = 2;
                    newEnemies.push(newEnemy);
                }
                break;
            }
            case 'scatterShot': {
                const numProjectiles = 8;
                const angleSpread = Math.PI / 2;
                const startAngle = Math.PI / 2 - angleSpread / 2;

                for (let i = 0; i < numProjectiles; i++) {
                    const angle = startAngle + (angleSpread / (numProjectiles - 1)) * i;
                    const velocity = {
                        x: Math.cos(angle) * this.projectileSpeed,
                        y: Math.sin(angle) * this.projectileSpeed
                    };
                    enemyProjectiles.push(new Projectile(
                        this.x + this.width / 2, this.y + this.height,
                        12, 12, 0, 'down', 'lime', this.projectileDamage * 0.8, 'boss', velocity
                    ));
                }
                break;
            }
        }
        return { newProjectiles: [], newEnemies };
    }

    draw(ctx, assetLoader) {
        const sprite = assetLoader.getAsset(this.spriteName);
        ctx.save();
        if (this.isChargingSpecial) {
            const glow = Math.abs(Math.sin(performance.now() / 150));
            ctx.filter = `brightness(1.5) drop-shadow(0 0 ${15 * glow}px yellow)`;
        } else if (this.isEnraged) {
            // *** FEATURE: Visual indicator for rage mode ***
            const glow = Math.abs(Math.sin(performance.now() / 100));
            ctx.filter = `hue-rotate(330deg) brightness(1.2) drop-shadow(0 0 ${10 * glow}px red)`;
        } else if (this.isDodging) {
            ctx.filter = 'brightness(0.8) saturate(0)';
        } else if (this.phase === 2) {
            // *** FEATURE: Visual indicator for phase 2 ***
            ctx.filter = 'saturate(2) brightness(1.1)';
        }
        
        if (sprite) {
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.isBoss ? 'purple' : 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        ctx.restore();

        if (this.health < this.maxHealth) {
            const healthBarWidth = this.width * 0.8;
            const healthBarHeight = 8;
            const healthBarX = this.x + (this.width - healthBarWidth) / 2;
            const healthBarY = this.y - healthBarHeight - 5;

            ctx.fillStyle = 'darkred';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

            const currentHealthWidth = (this.health / this.maxHealth) * healthBarWidth;
            ctx.fillStyle = 'red';
            ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
        }
    }
}