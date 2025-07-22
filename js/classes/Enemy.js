import { Projectile } from './Projectile.js';

export class Enemy {
    constructor(x, y, width, height, speed, type, spriteName, isBoss = false, fireRate = 0, projectileSpeed = 0, projectileDamage = 0, specialAttackType = 'none', monsterAbility = null) {
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
        this.baseFireRate = fireRate;
        this.projectileSpeed = projectileSpeed;
        this.projectileDamage = projectileDamage;
        this.lastShotTime = 0;
        this.maxHealth = this.health;

        if (this.isBoss) {
            this.isEntering = true;
            this.entrySpeed = 100;
            this.horizontalSpeed = 75;
            this.horizontalDirection = Math.random() < 0.5 ? 1 : -1;
            
            this.phase = 1;
            this.hasEnteredPhaseTwo = false;

            this.isEnraged = false;
            this.rageTimer = 0;
            this.rageDuration = 5;
            this.rageCooldown = 15;
            this.rageCooldownTimer = this.rageCooldown;

            this.specialAttackType = specialAttackType;
            this.specialAttackCooldown = 10;
            this.specialAttackTimer = this.specialAttackCooldown;
            this.isChargingSpecial = false;
            this.chargeTimer = 0;

            this.dodgeSpeed = 300;
            this.isDodging = false;
            this.dodgeDuration = 0.3;
            this.dodgeTimer = 0;
            this.dodgeCooldown = 2;
            this.dodgeCooldownTimer = 0;

            this.isBarraging = false;
            this.barrageCount = 0;
            this.barrageTimer = 0;
            this.barrageShotDelay = 0.1;
            this.barrageShots = 5;
        }

        this.monsterAbility = monsterAbility;
        // BALANCE: Randomized initial cooldown for abilities to prevent simultaneous activation
        this.abilityCooldown = 2 + Math.random() * 4;
        this.abilityActive = false;
        this.abilityTimer = 0;
        this.abilityState = {};
    }

    update(deltaTime, canvas, player, playerProjectiles, game) {
        if (this.isStunned) {
            return { newProjectiles: [], newEnemies: [] };
        }

        let newProjectiles = [];
        let newEnemies = [];
        const currentTime = performance.now() / 1000;

        if (this.isBoss) {
            if (!this.hasEnteredPhaseTwo && this.health <= this.maxHealth / 2) {
                this.hasEnteredPhaseTwo = true;
                this.phase = 2;
                this.horizontalSpeed *= 1.5;
                this.baseFireRate *= 0.75;
                this.fireRate = this.baseFireRate;
            }

            if (this.isEnraged) {
                this.rageTimer -= deltaTime;
                if (this.rageTimer <= 0) {
                    this.isEnraged = false;
                    this.fireRate = this.baseFireRate;
                }
            } else {
                this.rageCooldownTimer -= deltaTime;
                if (this.rageCooldownTimer <= 0) {
                    this.isEnraged = true;
                    this.rageTimer = this.rageDuration;
                    this.fireRate = this.baseFireRate * 0.33;
                    this.rageCooldownTimer = this.rageCooldown;
                }
            }

            if (this.isEntering) {
                this.y += this.entrySpeed * deltaTime;
                if (this.y >= 50) {
                    this.y = 50;
                    this.isEntering = false;
                }
            } else if (this.isDodging) {
                this.x += this.horizontalDirection * this.dodgeSpeed * deltaTime;
            } else if (!this.isChargingSpecial) {
                const playerCenterX = player.x + player.width / 2;
                const bossCenterX = this.x + this.width / 2;
                const dx = playerCenterX - bossCenterX;
                this.x += Math.sign(dx) * Math.min(Math.abs(dx), this.horizontalSpeed * deltaTime);
                this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
            }

            this.handleDodging(deltaTime, playerProjectiles);

            if (!this.isChargingSpecial && !this.isBarraging) {
                const playerDist = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));
                if (playerDist < 200 && this.specialAttackTimer < 2) {
                    this.beginSpecialAttack();
                } else if (this.specialAttackTimer <= 0) {
                    if (Math.random() < 0.5) {
                        this.beginSpecialAttack();
                    } else {
                        this.specialAttackTimer = 2 + Math.random() * 3;
                    }
                }
            }

            if (this.isChargingSpecial) {
                this.chargeTimer -= deltaTime;
                if (this.chargeTimer <= 0) {
                    const attackResult = this.useSpecialAttack(player, game);
                    newEnemies = attackResult.newEnemies;
                    this.isChargingSpecial = false;
                }
            } else if (this.isBarraging) {
                this.barrageTimer += deltaTime;
                if (this.barrageTimer >= this.barrageShotDelay && this.barrageCount < this.barrageShots) {
                    const predictedX = player.x + player.width / 2 + player.speed * 0.2 * (Math.random() - 0.5);
                    const angle = Math.atan2(player.y - (this.y + this.height), predictedX - (this.x + this.width / 2));
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
                    const predictedX = player.x + player.width / 2 + player.speed * 0.3 * (Math.random() - 0.5);
                    const angle = Math.atan2(player.y - (this.y + this.height), predictedX - (this.x + this.width / 2));
                    const velocity = {
                        x: Math.cos(angle) * this.projectileSpeed,
                        y: Math.sin(angle) * this.projectileSpeed
                    };
                    newProjectiles.push(new Projectile(
                        this.x + this.width / 2, this.y + this.height,
                        10, 20,
                        0, 'down', 'pink', this.projectileDamage, 'boss_default', velocity
                    ));
                    this.lastShotTime = currentTime;
                }
                this.specialAttackTimer -= deltaTime;
            }
        } else {
            this.y += this.speed * deltaTime;
            if (this.y > canvas.height) {
                this.active = false;
            }
        }

        if (!this.isBoss && this.monsterAbility) {
            this.abilityCooldown -= deltaTime;
            if (!this.abilityActive && this.abilityCooldown <= 0) {
                this.abilityActive = true;
                this.abilityTimer = 3; 
                switch (this.monsterAbility) {
                    case 'gravityWell':
                        this.abilityTimer = 2.5;
                        this.abilityState = { radius: 180, particles: [] };
                        break;
                    case 'plasmaBurst':
                        this.abilityTimer = 1.2;
                        this.abilityState = { charged: false };
                        break;
                    case 'warpShift':
                        this.abilityTimer = 0.5;
                        break;
                    case 'laserWeb':
                        this.abilityTimer = 4.0;
                        this.abilityState = { lines: this.generateLaserWeb(canvas) };
                        break;
                    case 'droneSwarm':
                        this.abilityTimer = 0.5;
                        break;
                    case 'shieldArray':
                        this.abilityTimer = 3.0;
                        break;
                    case 'quantumEcho':
                        this.abilityTimer = 2.5;
                        if (!this.abilityState.echo) {
                            const echo = this.spawnEcho();
                            if(echo) newEnemies.push(echo);
                            this.abilityState.echo = echo;
                        }
                        break;
                    case 'cosmicSpores':
                        this.abilityTimer = 3.0;
                        break;
                }
            }
            if (this.abilityActive) {
                this.abilityTimer -= deltaTime;
                switch (this.monsterAbility) {
                    case 'gravityWell':
                        this.applyGravityWell(player, game.projectiles);
                        break;
                    case 'plasmaBurst':
                        if (!this.abilityState.charged && this.abilityTimer < 0.7) {
                            newProjectiles.push(this.firePlasmaBurst());
                            this.abilityState.charged = true;
                        }
                        break;
                    case 'warpShift':
                        if (this.health < this.maxHealth * 0.4 && !this.abilityState.shifted) {
                            newProjectiles.push(this.warpShift(canvas));
                            this.abilityState.shifted = true;
                        }
                        break;
                    case 'laserWeb':
                        this.applyLaserWeb(game, canvas);
                        break;
                    case 'droneSwarm':
                        if (!this.abilityState.spawned) {
                            newEnemies.push(...this.spawnDroneSwarm());
                            this.abilityState.spawned = true;
                        }
                        break;
                    case 'shieldArray':
                        this.abilityState.shielded = true;
                        break;
                    case 'quantumEcho':
                        break;
                    case 'cosmicSpores':
                        if (!this.abilityState.spawned) {
                            newProjectiles.push(...this.spawnCosmicSpores());
                            this.abilityState.spawned = true;
                        }
                        break;
                }
                if (this.abilityTimer <= 0) {
                    this.abilityActive = false;
                    this.abilityCooldown = 8 + Math.random() * 5; // BALANCE: Increased cooldown
                    if (this.monsterAbility === 'shieldArray') this.abilityState.shielded = false;
                }
            }
        }

        return { newProjectiles, newEnemies };
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
            case 'laserBarrage': this.chargeTimer = 0.2; break;
            case 'summonMinions': this.chargeTimer = 0.5; break;
            case 'scatterShot': this.chargeTimer = 1.2; break;
        }
    }

    useSpecialAttack(player, game) {
        let newEnemies = [];
        const enemyProjectiles = game.enemyProjectiles;
        const canvas = game.canvas;

        switch (this.specialAttackType) {
            case 'chargeBeam': {
                const beam = new Projectile(
                    this.x, this.y + this.height,
                    this.width, canvas.height - (this.y + this.height),
                    0, 'down',
                    'rgba(255, 0, 255, 0.7)',
                    this.projectileDamage * 5,
                    'boss',
                    { x: 0, y: 0 },
                    1.4,
                    this
                );
                enemyProjectiles.push(beam);
                break;
            }
            case 'laserBarrage': {
                const lightning = new Projectile(
                    this.x, this.y + this.height, this.width, 0, 0, 'none', 'cyan', this.projectileDamage * 0.5,
                    'lightningEffect', { x: 0, y: 0 }, 1.0, this, canvas
                );
                enemyProjectiles.push(lightning);
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
                        12, 12, 0, 'down', 'lime', this.projectileDamage * 0.8, 'scatter_shot', velocity
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
        if (this.isChargingSpecial && this.specialAttackType !== 'chargeBeam') {
            const glow = 20 + 20 * Math.abs(Math.sin(performance.now() / 120));
            let color = 'yellow';
            if (this.specialAttackType === 'laserBarrage') color = 'cyan';
            if (this.specialAttackType === 'scatterShot') color = 'lime';
            if (this.specialAttackType === 'summonMinions') color = 'orange';
            ctx.filter = `brightness(1.5) drop-shadow(0 0 ${glow}px ${color})`;
            ctx.globalAlpha = 0.85;
        } else if (this.isEnraged) {
            const glow = Math.abs(Math.sin(performance.now() / 100));
            ctx.filter = `hue-rotate(330deg) brightness(1.2) drop-shadow(0 0 ${10 * glow}px red)`;
        } else if (this.isDodging) {
            ctx.filter = 'brightness(0.8) saturate(0)';
        } else if (this.phase === 2) {
            ctx.filter = 'saturate(2) brightness(1.1)';
        }
        if (sprite) {
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.isBoss ? 'purple' : 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        ctx.restore();

        if (this.isChargingSpecial && this.specialAttackType !== 'chargeBeam') {
            ctx.save();
            let color = 'yellow';
            if (this.specialAttackType === 'laserBarrage') color = 'cyan';
            if (this.specialAttackType === 'scatterShot') color = 'lime';
            if (this.specialAttackType === 'summonMinions') color = 'orange';
            ctx.globalAlpha = 0.25 + 0.25 * Math.abs(Math.sin(performance.now() / 120));
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width * 0.7, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();
        }

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

        // FEATURE: Enhanced monster ability visuals
        if (!this.isBoss && this.monsterAbility && this.abilityActive) {
            const time = performance.now();
            switch (this.monsterAbility) {
                case 'gravityWell': {
                    ctx.save();
                    const cx = this.x + this.width / 2;
                    const cy = this.y + this.height / 2;
                    const r = this.abilityState.radius || 100;
                    const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
                    grad.addColorStop(0, 'rgba(200, 150, 255, 0.5)');
                    grad.addColorStop(0.8, 'rgba(100, 50, 150, 0.2)');
                    grad.addColorStop(1, 'rgba(80, 0, 120, 0)');
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
                    ctx.fillStyle = grad;
                    ctx.fill();
                    // Swirling particles
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    for(let i=0; i<15; i++) {
                        const angle = (time / 500 + i * 2.1) % (2 * Math.PI);
                        const dist = r * (1 - (this.abilityTimer / 2.5));
                        ctx.beginPath();
                        ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 2, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                    ctx.restore();
                    break;
                }
                case 'plasmaBurst': {
                    ctx.save();
                    const chargeProgress = 1 - (this.abilityTimer / 1.2);
                    const radius = 10 + 40 * chargeProgress;
                    const alpha = 0.3 + 0.6 * chargeProgress;
                    ctx.beginPath();
                    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
                    ctx.shadowColor = 'yellow';
                    ctx.shadowBlur = 30 * chargeProgress;
                    ctx.fill();
                    ctx.restore();
                    break;
                }
                case 'warpShift': {
                    ctx.save();
                    const flicker = Math.abs(Math.sin(time / 60));
                    ctx.globalAlpha = 0.5 + 0.5 * flicker;
                    ctx.strokeStyle = 'cyan';
                    ctx.lineWidth = 4;
                    ctx.filter = `blur(${flicker * 3}px)`;
                    ctx.strokeRect(this.x - 4, this.y - 4, this.width + 8, this.height + 8);
                    ctx.restore();
                    break;
                }
                case 'laserWeb': {
                    ctx.save();
                    const webProgress = 1 - (this.abilityTimer / 4.0);
                    ctx.globalAlpha = 0.7 * webProgress;
                    ctx.strokeStyle = 'lime';
                    ctx.shadowColor = 'lime';
                    ctx.shadowBlur = 15;
                    ctx.lineWidth = 3;
                    if (this.abilityState.lines) {
                        for (const line of this.abilityState.lines) {
                            ctx.beginPath();
                            ctx.moveTo(line.x1, line.y1);
                            ctx.lineTo(line.x2, line.y2);
                            ctx.stroke();
                        }
                    }
                    ctx.restore();
                    break;
                }
                case 'shieldArray': {
                    ctx.save();
                    const pulse = 0.8 + 0.2 * Math.sin(time / 200);
                    ctx.globalAlpha = (0.35 + 0.2 * Math.abs(Math.sin(time / 150))) * pulse;
                    ctx.beginPath();
                    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.7 * pulse, 0, 2 * Math.PI);
                    ctx.strokeStyle = '#00BFFF';
                    ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
                    ctx.lineWidth = 6;
                    ctx.shadowColor = '#00BFFF';
                    ctx.shadowBlur = 20;
                    ctx.stroke();
                    ctx.fill();
                    ctx.restore();
                    break;
                }
            }
        }
    }

    applyGravityWell(player, projectiles) {
        const dx = this.x + this.width/2 - (player.x + player.width/2);
        const dy = this.y + this.height/2 - (player.y + player.height/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < this.abilityState.radius) {
            const pull = 120 / (dist + 40);
            player.x += dx/dist * pull;
            player.y += dy/dist * pull;
        }
        for (const p of projectiles) {
            const pdx = this.x + this.width/2 - (p.x + p.width/2);
            const pdy = this.y + this.height/2 - (p.y + p.height/2);
            const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
            if (pdist < this.abilityState.radius) {
                const pull = 80 / (pdist + 30);
                p.x += pdx/pdist * pull;
                p.y += pdy/pdist * pull;
            }
        }
    }
    firePlasmaBurst() {
        return new Projectile(
            this.x + this.width/2 - 24, this.y + this.height/2 - 24,
            48, 48, 60, 'down', 'orange', 30, 'plasmaBurst', {x:0, y:120}
        );
    }
    warpShift(canvas) {
        const oldX = this.x, oldY = this.y;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = Math.random() * (canvas.height * 0.5);
        return new Projectile(
            Math.min(oldX, this.x), Math.min(oldY, this.y),
            Math.abs(this.x-oldX)+this.width, Math.abs(this.y-oldY)+this.height,
            0, 'none', 'cyan', 15, 'warpTrail', {x:0, y:0}, 0.5
        );
    }
    generateLaserWeb(canvas) {
        const lines = [];
        for (let i=0; i<3; i++) {
            const y = 80 + Math.random() * (canvas.height-200);
            lines.push({x1:0, y1:y, x2:canvas.width, y2:y, dir:Math.random()<0.5?1:-1});
        }
        return lines;
    }
    applyLaserWeb(game, canvas) {
        for (const line of this.abilityState.lines) {
            line.y1 += line.dir * 30;
            line.y2 += line.dir * 30;
            if (line.y1 < 60 || line.y1 > canvas.height-60) line.dir *= -1;
            if (Math.abs(game.player.y + game.player.height/2 - line.y1) < 10) {
                game.playerHealth -= 0.5;
            }
        }
    }
    spawnDroneSwarm() {
        const drones = [];
        for (let i=0; i<3; i++) {
            const ex = this.x + Math.random()*this.width;
            const ey = this.y + this.height + Math.random()*20;
            const drone = new Enemy(ex, ey, 32, 32, 120, 'drone', 'monster1', false, 0, 0, 0, null);
            drone.health = 2;
            drones.push(drone);
        }
        return drones;
    }
    spawnEcho() {
        const echo = new Enemy(this.x+40, this.y+40, this.width, this.height, this.speed, 'echo', this.spriteName, false, 0, 0, 0, null);
        echo.health = 1;
        return echo;
    }
    spawnCosmicSpores() {
        const spores = [];
        for (let i=0; i<4; i++) {
            const px = this.x + Math.random()*this.width;
            const py = this.y + Math.random()*this.height;
            spores.push(new Projectile(px, py, 20, 20, 40, 'down', 'green', 0, 'spore', {x:0, y:60}));
        }
        return spores;
    }
}