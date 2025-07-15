import { GAME_STATES } from './constants.js';
import { checkCollision } from './utils.js';
import { AssetLoader } from './classes/AssetLoader.js';
import { Player } from './classes/Player.js';
import { Projectile } from './classes/Projectile.js';
import { Enemy } from './classes/Enemy.js';
import { PowerUp } from './classes/PowerUp.js';
import { Explosion } from './classes/Explosion.js';
import { Shop } from './classes/Shop.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameContainer = document.getElementById('gameContainer');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.currentState = GAME_STATES.LOADING;
        this.lastTime = 0;
        this.deltaTime = 0;

        this.difficultySettings = {
            easy:   { enemySpeed: 0.7, enemyHealth: 0.8, spawnRate: 1.25, moneyRate: 1.5, scoreRate: 1.2, expRate: 0.8 },
            normal: { enemySpeed: 0.9, enemyHealth: 1.0, spawnRate: 1.0,  moneyRate: 1.0, scoreRate: 1.0, expRate: 0.6 },
            hard:   { enemySpeed: 1.1, enemyHealth: 1.2, spawnRate: 0.8,  moneyRate: 0.8, scoreRate: 0.8, expRate: 0.4 }
        };
        this.currentDifficulty = 'normal';

        this.assetLoader = new AssetLoader();
        this.player = null;
        this.keys = {};
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.explosions = [];
        this.powerUps = [];
        this.activePowerUpEffects = {};
        this.lastShotTime = 0;
        this.canFireOnKeyPress = true;

        this.enemies = [];
        this.lastEnemySpawnTime = 0;
        this.enemySpawnRate = 1.5;
        this.currentEnemySpeedMultiplier = 1;
        this.currentEnemyHealthMultiplier = 1;
        this.maxEnemiesOnScreen = Infinity;
        this.levelScoreToClear = 0;
        this.currentLevelEnemyTypes = [];

        this.monsterSpriteNames = [
            'monster1', 'monster2', 'monster3', 'monster4', 'monster5', 'monster6', 'monster7'
        ];

        this.score = 0;
        this.money = 0;
        this.experience = 0;
        this.playerHealth = 100;
        this.playerInvincible = false;
        this.invincibilityDuration = 1.5;
        this.invincibilityTimer = 0;

        this.base = {
            x: 0, y: 0, width: 0, visualWidth: 0, height: 0,
            health: 100, maxHealth: 100
        };

        this.terrainSpriteNames = [
            'terrain1', 'terrain2', 'terrain3', 'terrain4'
        ];
        this.currentBackgroundSpriteName = null;

        this.currentLevel = 1;
        this.completedLevels = [];

        this.pendingLevelSelection = null;

        this.levels = [
            {},
            { enemySpawnRate: 2.2, enemySpeedMultiplier: 1.0, enemyHealthMultiplier: 0.5, maxEnemiesOnScreen: 10, scoreToClear: 100, newEnemyTypes: ['monster1'], background: 'terrain1', plot: 'Sector Alpha is under attack! Clear out the initial wave of invaders and secure our perimeter.', bossConfig: { spriteName: 'boss1Sprite', healthMultiplier: 1, speedMultiplier: 0.1, fireRate: 2, projectileSpeed: 150, projectileDamage: 10, specialAttack: 'scatterShot' } },
            { enemySpawnRate: 2.1, enemySpeedMultiplier: 1.0, enemyHealthMultiplier: 1.1, maxEnemiesOnScreen: 12, scoreToClear: 200, newEnemyTypes: ['monster1', 'monster2'], background: 'terrain2', plot: 'The enemy is adapting. Push through the asteroid belt and eliminate their scout forces.', bossConfig: { spriteName: 'boss2Sprite', healthMultiplier: 2, speedMultiplier: 0.1, fireRate: 1.8, projectileSpeed: 160, projectileDamage: 12, specialAttack: 'summonMinions' } },
            { enemySpawnRate: 2.0, enemySpeedMultiplier: 1.1, enemyHealthMultiplier: 1.1, maxEnemiesOnScreen: 14, scoreToClear: 300, newEnemyTypes: ['monster1', 'monster2', 'monster3'], background: 'terrain3', plot: 'Intel suggests a heavy enemy presence near the gas giant. Brace for a tougher fight!', bossConfig: { spriteName: 'boss3Sprite', healthMultiplier: 5, speedMultiplier: 0.1, fireRate: 1.6, projectileSpeed: 170, projectileDamage: 15, specialAttack: 'chargeBeam' } },
            { enemySpawnRate: 1.9, enemySpeedMultiplier: 1.1, enemyHealthMultiplier: 1.2, maxEnemiesOnScreen: 16, scoreToClear: 450, newEnemyTypes: ['monster2', 'monster3', 'monster4'], background: 'terrain4', plot: 'They\'ve deployed new, faster units. Show them the might of the Alliance in the nebulae of Sector Gamma.', bossConfig: { spriteName: 'boss4Sprite', healthMultiplier: 6, speedMultiplier: 0.1, fireRate: 1.5, projectileSpeed: 180, projectileDamage: 18, specialAttack: 'laserBarrage' } },
            { enemySpawnRate: 1.8, enemySpeedMultiplier: 1.2, enemyHealthMultiplier: 1.2, maxEnemiesOnScreen: 18, scoreToClear: 600, newEnemyTypes: ['monster3', 'monster4', 'monster5'], background: 'terrain1', plot: 'Deep space mining operations are threatened. Protect the resource extractors from the incoming swarm.', bossConfig: { spriteName: 'boss5Sprite', healthMultiplier: 10, speedMultiplier: 0.1, fireRate: 1.4, projectileSpeed: 190, projectileDamage: 20, specialAttack: 'summonMinions' } },
            { enemySpawnRate: 1.7, enemySpeedMultiplier: 1.2, enemyHealthMultiplier: 1.3, maxEnemiesOnScreen: 20, scoreToClear: 750, newEnemyTypes: ['monster4', 'monster5', 'monster6'], background: 'terrain2', plot: 'An enemy mothership has been sighted! Clear its escort to prepare for a full assault.', bossConfig: { spriteName: 'boss6Sprite', healthMultiplier: 11, speedMultiplier: 0.1, fireRate: 1.3, projectileSpeed: 200, projectileDamage: 22, specialAttack: 'scatterShot' } },
            { enemySpawnRate: 1.6, enemySpeedMultiplier: 1.3, enemyHealthMultiplier: 1.3, maxEnemiesOnScreen: 22, scoreToClear: 900, newEnemyTypes: ['monster5', 'monster6', 'monster7'], background: 'terrain3', plot: 'The enemy is retreating to their last stronghold. Pursue them through the treacherous debris field.', bossConfig: { spriteName: 'boss7Sprite', healthMultiplier: 13, speedMultiplier: 0.1, fireRate: 1.2, projectileSpeed: 210, projectileDamage: 25, specialAttack: 'laserBarrage' } },
            { enemySpawnRate: 1.5, enemySpeedMultiplier: 1.3, enemyHealthMultiplier: 1.4, maxEnemiesOnScreen: 24, scoreToClear: 1100, newEnemyTypes: ['monster1', 'monster3', 'monster5', 'monster7'], background: 'terrain4', plot: 'This is it, pilot! The final push. Eliminate the remaining resistance and secure Earth\'s future!', bossConfig: { spriteName: 'boss8Sprite', healthMultiplier: 12, speedMultiplier: 0.1, fireRate: 1.1, projectileSpeed: 220, projectileDamage: 30, specialAttack: 'chargeBeam' } },
            {}
        ];

        this.shipConfigs = {
            'ship1': {
                spriteName: 'ship1Sprite',
                cost: 0,
                baseDamage: 1, baseFireRate: 0.2, baseProjectileSpeed: 400, baseProjectileWidth: 5, baseProjectileHeight: 10, baseNumProjectiles: 1,
                baseSpeed: 200, baseHealth: 100,
                ability: { name: 'None', description: 'No special ability.', cooldown: 0 },
                upgrades: {
                    damage: { maxLevel: 3, costs: [25, 50, 100], bonuses: [0.5, 0.5, 0.5] },
                    fireRate: { maxLevel: 3, costs: [30, 60, 120], bonuses: [0.02, 0.02, 0.02] },
                    health: { maxLevel: 3, costs: [40, 80, 150], bonuses: [20, 20, 20] },
                    speed: { maxLevel: 3, costs: [35, 70, 140], bonuses: [25, 25, 25] }
                }
            },
            'ship2': {
                spriteName: 'ship2Sprite',
                cost: 100,
                baseDamage: 1.2, baseFireRate: 0.18, baseProjectileSpeed: 420, baseProjectileWidth: 6, baseProjectileHeight: 12, baseNumProjectiles: 1,
                baseSpeed: 220, baseHealth: 110,
                ability: { name: 'Dash', description: 'Become invincible and move faster for 1.5 seconds.', cooldown: 5 },
                upgrades: {
                    damage: { maxLevel: 3, costs: [30, 60, 120], bonuses: [0.6, 0.6, 0.6] },
                    fireRate: { maxLevel: 3, costs: [35, 70, 140], bonuses: [0.02, 0.02, 0.02] },
                    health: { maxLevel: 3, costs: [45, 90, 180], bonuses: [25, 25, 25] },
                    speed: { maxLevel: 3, costs: [40, 80, 160], bonuses: [30, 30, 30] }
                }
            },
            'ship3': {
                spriteName: 'ship3Sprite',
                cost: 250,
                baseDamage: 1.5, baseFireRate: 0.16, baseProjectileSpeed: 450, baseProjectileWidth: 7, baseProjectileHeight: 14, baseNumProjectiles: 2,
                baseSpeed: 240, baseHealth: 120,
                ability: { name: 'EMP Blast', description: 'Stun all on-screen enemies for 2 seconds.', cooldown: 10 },
                upgrades: {
                    damage: { maxLevel: 3, costs: [40, 80, 160], bonuses: [0.7, 0.7, 0.7] },
                    fireRate: { maxLevel: 3, costs: [45, 90, 180], bonuses: [0.03, 0.03, 0.03] },
                    health: { maxLevel: 3, costs: [50, 100, 200], bonuses: [30, 30, 30] },
                    speed: { maxLevel: 3, costs: [45, 90, 180], bonuses: [35, 35, 35] }
                }
            },
            'ship4': {
                spriteName: 'ship4Sprite',
                cost: 500,
                baseDamage: 1.8, baseFireRate: 0.14, baseProjectileSpeed: 480, baseProjectileWidth: 8, baseProjectileHeight: 16, baseNumProjectiles: 2,
                baseSpeed: 260, baseHealth: 130,
                ability: { name: 'Drone Companion', description: 'Spawn a temporary drone that fires alongside you for 5 seconds.', cooldown: 15 },
                upgrades: {
                    damage: { maxLevel: 3, costs: [50, 100, 200], bonuses: [0.8, 0.8, 0.8] },
                    fireRate: { maxLevel: 3, costs: [55, 110, 220], bonuses: [0.02, 0.02, 0.02] },
                    health: { maxLevel: 3, costs: [60, 120, 240], bonuses: [35, 35, 35] },
                    speed: { maxLevel: 3, costs: [55, 110, 220], bonuses: [20, 20, 20] }
                }
            },
            'ship5': {
                spriteName: 'ship5Sprite',
                cost: 800,
                baseDamage: 2.0, baseFireRate: 0.12, baseProjectileSpeed: 500, baseProjectileWidth: 9, baseProjectileHeight: 18, baseNumProjectiles: 3,
                baseSpeed: 280, baseHealth: 140,
                ability: { name: 'Shield Recharge', description: 'Instantly restore 30 base health.', cooldown: 20 },
                upgrades: {
                    damage: { maxLevel: 3, costs: [60, 120, 240], bonuses: [0.9, 0.9, 0.9] },
                    fireRate: { maxLevel: 3, costs: [65, 130, 260], bonuses: [0.02, 0.02, 0.02] },
                    health: { maxLevel: 3, costs: [70, 140, 280], bonuses: [40, 40, 40] },
                    speed: { maxLevel: 3, costs: [65, 130, 260], bonuses: [20, 20, 20] }
                }
            },
            'ship6': {
                spriteName: 'ship6Sprite',
                cost: 1200,
                baseDamage: 2.2, baseFireRate: 0.10, baseProjectileSpeed: 520, baseProjectileWidth: 10, baseProjectileHeight: 20, baseNumProjectiles: 3,
                baseSpeed: 300, baseHealth: 150,
                ability: { name: 'Time Warp', description: 'Slow down all enemies for 3 seconds.', cooldown: 18 },
                upgrades: {
                    damage: { maxLevel: 3, costs: [70, 140, 280], bonuses: [1.0, 1.0, 1.0] },
                    fireRate: { maxLevel: 3, costs: [75, 150, 300], bonuses: [0.03, 0.03, 0.03] },
                    health: { maxLevel: 3, costs: [80, 160, 320], bonuses: [45, 45, 45] },
                    speed: { maxLevel: 3, costs: [75, 150, 300], bonuses: [20, 20, 20] }
                }
            },
            'ship7': {
                spriteName: 'ship7Sprite',
                cost: 1800,
                baseDamage: 2.5, baseFireRate: 0.08, baseProjectileSpeed: 550, baseProjectileWidth: 11, baseProjectileHeight: 22, baseNumProjectiles: 4,
                baseSpeed: 320, baseHealth: 160,
                ability: { name: 'Mega Bomb', description: 'Clear all on-screen enemies and deal massive damage.', cooldown: 25 },
                upgrades: {
                    damage: { maxLevel: 3, costs: [80, 160, 320], bonuses: [1.2, 1.2, 1.2] },
                    fireRate: { maxLevel: 3, costs: [85, 170, 340], bonuses: [0.04, 0.04, 0.04] },
                    health: { maxLevel: 3, costs: [90, 180, 360], bonuses: [50, 50, 50] },
                    speed: { maxLevel: 3, costs: [85, 170, 340], bonuses: [20, 20, 20] }
                }
            }
        };

        this.currentShipType = 'ship1';
        this.ownedShips = ['ship1'];
        this.currentShipStats = {};
        this.shipAbilityCooldowns = {};
        this.activeShipAbilities = {};
        this.currentShipUpgrades = {
            damage: 0,
            fireRate: 0,
            health: 0,
            speed: 0
        };

        this.boss = null;
        this.isBossPhase = false;
        
        this.shop = new Shop(this);

        this.mainMenuDiv = document.getElementById('mainMenu');
        this.loadingTextDiv = document.getElementById('loadingText');
        this.assetProgressSpan = document.getElementById('assetProgress');
        
        this.startGameBtn = document.getElementById('startGameBtn');
        this.difficultySelectionDiv = document.getElementById('difficultySelection');

        this.easyBtn = document.getElementById('easyBtn');
        this.normalBtn = document.getElementById('normalBtn');
        this.hardBtn = document.getElementById('hardBtn');
        this.continueGameBtn = document.getElementById('continueGameBtn');
        this.optionsBtn = document.getElementById('optionsBtn');
        this.creditsBtn = document.getElementById('creditsBtn');
        
        this.optionsMenuDiv = document.getElementById('optionsMenu');
        this.toggleSoundBtn = document.getElementById('toggleSoundBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.toggleFullscreenBtn = document.getElementById('toggleFullscreenBtn');
        this.backToMainBtn = document.getElementById('backToMainBtn');

        this.creditsScreenDiv = document.getElementById('creditsScreen');
        this.backToMainFromCreditsBtn = document.getElementById('backToMainFromCreditsBtn');
        
        this.shopHangarDiv = document.getElementById('shopHangar');
        this.closeShipyardBtn = document.getElementById('closeShipyardBtn');
        this.closeUpgradeBtn = document.getElementById('closeUpgradeBtn');

        this.levelMapScreenDiv = document.getElementById('levelMapScreen');
        this.levelButtonsContainer = document.getElementById('levelButtonsContainer');
        this.levelPlotDisplay = document.getElementById('levelPlotDisplay');
        this.levelMapBackToMainBtn = document.getElementById('levelMapBackToMainBtn');
        this.backToLevelMapBtn = document.getElementById('backToLevelMapBtn');


        this.gameOverScreenDiv = document.getElementById('gameOverScreen');
        this.gameOverScoreSpan = document.getElementById('gameOverScore');
        this.gameOverBaseHealthSpan = document.getElementById('gameOverBaseHealth');
        this.gameOverBackToMainBtn = document.getElementById('gameOverBackToMainBtn');

        this.victoryScreenDiv = document.getElementById('victoryScreen');
        this.victoryScoreSpan = document.getElementById('victoryScore');
        this.victoryBackToMainBtn = document.getElementById('victoryBackToMainBtn');

        this.soundEnabled = true;
        this.bgMusic = null;
        this.gameVolume = 0.5;

        this.shotSound = null;
        this.explosionSound = null;
        this.powerUpSound = null;
        this.baseHitSound = null;
        this.abilitySound = null;

        this.currentMenuButtons = [];
        this.selectedMenuButtonIndex = 0;

        this.commanderPopup = document.getElementById('commanderPopup');
        this.commanderText = document.getElementById('commanderText');
        this.commanderCursor = document.querySelector('.commander-cursor');
        this.commanderNextBtn = document.getElementById('commanderNextBtn');
        this.tutorialActive = false;
        this.tutorialMessages = [
            "Welcome, pilot! I'm Commander Nova. Let's get you ready for battle!",
            "Use the arrow keys or WASD to move your ship.",
            "Press SPACE to fire your weapon.",
            "Press Q to activate your ship's special ability (if available).",
            "Defend the base at the bottom of the screen. If its health drops to zero, it's game over!",
            "Collect power-ups for temporary boosts.",
            "Earn money and experience to upgrade and buy new ships in the shop after each level.",
            "Good luck, pilot! Earth is counting on you!"
        ];
        this.tutorialIndex = 0;
        this.typingInterval = null;
        this.currentTypedText = '';
        this.commanderNextBtn.addEventListener('click', () => this.advanceTutorial());

        this.init();
    }

    init() {
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));

        this.startGameBtn.addEventListener('click', () => this.showMenu(GAME_STATES.LEVEL_MAP));
        
        this.easyBtn.addEventListener('click', () => this.startSelectedLevelWithDifficulty('easy'));
        this.normalBtn.addEventListener('click', () => this.startSelectedLevelWithDifficulty('normal'));
        this.hardBtn.addEventListener('click', () => this.startSelectedLevelWithDifficulty('hard'));
        
        this.continueGameBtn.addEventListener('click', () => {
            this.loadGame();
            this.showMenu(GAME_STATES.LEVEL_MAP);
        });
        
        this.optionsBtn.addEventListener('click', () => this.showMenu(GAME_STATES.OPTIONS));
        this.creditsBtn.addEventListener('click', () => this.showMenu(GAME_STATES.CREDITS));
        
        this.toggleSoundBtn.addEventListener('click', () => this.toggleSound());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        this.toggleFullscreenBtn.addEventListener('click', () => this.toggleFullScreen());
        this.backToMainBtn.addEventListener('click', () => this.returnToMainMenu());
        this.backToMainFromCreditsBtn.addEventListener('click', () => this.returnToMainMenu());
        
        this.closeShipyardBtn.addEventListener('click', () => this.shop.closeMenu());
        this.closeUpgradeBtn.addEventListener('click', () => this.shop.closeMenu());
        
        this.gameOverBackToMainBtn.addEventListener('click', () => this.returnToMainMenu(true));
        this.victoryBackToMainBtn.addEventListener('click', () => this.returnToMainMenu(true));

        this.levelMapBackToMainBtn.addEventListener('click', () => this.returnToMainMenu());
        this.backToLevelMapBtn.addEventListener('click', () => this.showMenu(GAME_STATES.LEVEL_MAP));


        this.loadAssets();
        this.updateShipStats();
    }

    loadAssets() {
        this.assetLoader.loadImage('playerSprite', 'assets/images/sprites/player_sprite.png');
        this.assetLoader.loadImage('baseSprite', 'assets/images/Base.png');
        
        this.assetLoader.loadImage('captain_sprite', 'assets/images/sprites/captain_sprite.png');
        this.assetLoader.loadImage('shop_background', 'assets/images/backgrounds/shop_background.png');
        this.assetLoader.loadImage('shipyard_console', 'assets/images/sprites/shipyard_console.png');
        this.assetLoader.loadImage('upgrade_terminal', 'assets/images/sprites/upgrade_terminal.png');
        this.assetLoader.loadImage('starmap_table', 'assets/images/sprites/starmap_table.png');


        for (let i = 1; i <= 8; i++) {
            this.assetLoader.loadImage(`boss${i}Sprite`, `assets/images/sprites/Boss_${i}.png`);
        }

        this.monsterSpriteNames.forEach((name, i) => this.assetLoader.loadImage(name, `assets/images/sprites/Monster_${i + 1}.png`));
        this.terrainSpriteNames.forEach((name, i) => this.assetLoader.loadImage(name, `assets/images/backgrounds/Terrain_${i + 1}.png`));
        this.assetLoader.loadImage('fireRatePowerUpSprite', 'assets/images/powerups/powerup_firerate.png');
        this.assetLoader.loadImage('shieldPowerUpSprite', 'assets/images/powerups/powerup_shield.png');
        this.assetLoader.loadImage('moneyPowerUpSprite', 'assets/images/powerups/powerup_money.png');
        this.assetLoader.loadImage('healPowerUpSprite', 'assets/images/powerups/powerup_heal.png');
        this.assetLoader.loadImage('bombPowerUpSprite', 'assets/images/powerups/powerup_bomb.png');
        this.assetLoader.loadImage('slowPowerUpSprite', 'assets/images/powerups/powerup_slow.png');
        this.assetLoader.loadImage('explosionSprite', 'assets/images/effects/explosion_1.png');

        for (let i = 1; i <= 7; i++) {
            this.assetLoader.loadImage(`ship${i}Sprite`, `assets/images/Starships/Ship_${i}.png`);
        }

        this.assetLoader.loadAudio('bgMusic', 'assets/audio/bg_music.mp3');
        this.assetLoader.loadAudio('shotSound', 'assets/audio/shot.mp3');
        this.assetLoader.loadAudio('explosionSound', 'assets/audio/explosion.mp3');
        this.assetLoader.loadAudio('powerUpSound', 'assets/audio/powerup.mp3');
        this.assetLoader.loadAudio('baseHitSound', 'assets/audio/base_hit.mp3');
        this.assetLoader.loadAudio('abilitySound', 'assets/audio/ability.mp3');

        this.assetLoader.onComplete = () => {
            console.log('All assets loaded!');
            const randomIndex = Math.floor(Math.random() * this.terrainSpriteNames.length);
            this.currentBackgroundSpriteName = this.terrainSpriteNames[randomIndex];
            this.bgMusic = this.assetLoader.getAsset('bgMusic');
            if (this.bgMusic) {
                this.bgMusic.loop = true;
                this.bgMusic.volume = this.gameVolume;
            }
            this.shotSound = this.assetLoader.getAsset('shotSound');
            this.explosionSound = this.assetLoader.getAsset('explosionSound');
            this.powerUpSound = this.assetLoader.getAsset('powerUpSound');
            this.baseHitSound = this.assetLoader.getAsset('baseHitSound');
            this.abilitySound = this.assetLoader.getAsset('abilitySound');

            if (this.shotSound) this.shotSound.volume = this.gameVolume;
            if (this.explosionSound) this.explosionSound.volume = this.gameVolume;
            if (this.powerUpSound) this.powerUpSound.volume = this.gameVolume;
            if (this.baseHitSound) this.baseHitSound.volume = this.gameVolume;
            if (this.abilitySound) this.abilitySound.volume = this.gameVolume;
            
            this.toggleSoundBtn.textContent = `TOGGLE SOUND (${this.soundEnabled ? 'ON' : 'OFF'})`;
            this.volumeSlider.value = this.gameVolume * 100;
            this.showMenu(GAME_STATES.MAIN_MENU);
            this.loadGame();
            this.updateMainMenuButtons();
            this.gameLoop(0);
        };

        const originalCheckCompletion = this.assetLoader.checkCompletion.bind(this.assetLoader);
        this.assetLoader.checkCompletion = () => {
            this.assetProgressSpan.textContent = `${this.assetLoader.loadedAssets} / ${this.assetLoader.totalAssets}`;
            originalCheckCompletion();
        };
        this.assetProgressSpan.textContent = `${this.assetLoader.loadedAssets} / ${this.assetLoader.totalAssets}`;
    }

    gameLoop(currentTime) {
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        if (this.currentState === GAME_STATES.SHOP) {
            this.shop.update(this.deltaTime, this.keys);
            this.shop.draw();
        } else {
            this.update(this.deltaTime);
            this.draw();
        }
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    handleLevelSelection(levelIndex) {
        this.pendingLevelSelection = levelIndex;
        this.showMenu(GAME_STATES.DIFFICULTY_SELECTION);
    }

    startSelectedLevelWithDifficulty(difficulty) {
        if (this.pendingLevelSelection === null) {
            console.error("No level selected to start game with difficulty.");
            this.showMenu(GAME_STATES.MAIN_MENU); 
            return;
        }

        this.currentDifficulty = difficulty;
        this.resetGame(false, true);
        this.startGame(this.pendingLevelSelection);
        this.pendingLevelSelection = null;
    }

    startGame(levelIndex) {
        this.currentLevel = levelIndex;
        this.initializeLevel();
        this.initializeBase();
        this.initializePlayer();
        this.isBossPhase = false; 
        this.boss = null;
        // Show tutorial only for first level and only if not completed before
        if (this.currentLevel === 1 && !localStorage.getItem('tutorialCompleted')) {
            this.showTutorial();
        } else {
            this.showMenu(GAME_STATES.PLAYING);
            if (this.soundEnabled && this.bgMusic && this.bgMusic.paused) {
                this.bgMusic.play().catch(e => console.error("Error playing music:", e));
            }
        }
    }

    continueGame() {
        if (this.loadGame()) {
            this.showMenu(GAME_STATES.LEVEL_MAP);
        } else {
            console.log("No saved game found to continue.");
        }
    }

    saveGame() {
        const gameState = {
            score: this.score,
            money: this.money,
            experience: this.experience,
            playerHealth: this.playerHealth,
            baseHealth: this.base.health,
            currentLevel: this.currentLevel,
            completedLevels: this.completedLevels,
            currentShipType: this.currentShipType,
            ownedShips: this.ownedShips,
            currentShipUpgrades: this.currentShipUpgrades,
            soundEnabled: this.soundEnabled,
            gameVolume: this.gameVolume,
            currentDifficulty: this.currentDifficulty,
            isBossPhase: this.isBossPhase,
            bossHealth: this.boss ? this.boss.health : null
        };
        try {
            localStorage.setItem('spaceInvadersGameState', JSON.stringify(gameState));
        } catch (e) {
            console.error('Error saving game:', e);
        }
        this.updateMainMenuButtons();
    }

    loadGame() {
        try {
            const savedState = localStorage.getItem('spaceInvadersGameState');
            if (savedState) {
                const gameState = JSON.parse(savedState);
                this.score = gameState.score || 0;
                this.money = gameState.money || 0;
                this.experience = gameState.experience || 0;
                this.playerHealth = gameState.playerHealth || 100;
                // *** FIX: Correctly load baseHealth. It was trying to read gameState.base.health which doesn't exist.
                this.base.health = gameState.baseHealth || this.base.maxHealth;
                this.currentLevel = gameState.currentLevel || 1;
                this.completedLevels = gameState.completedLevels || [];
                this.currentDifficulty = gameState.currentDifficulty || 'normal';
                this.currentShipType = gameState.currentShipType || 'ship1';
                this.ownedShips = gameState.ownedShips || ['ship1'];
                this.currentShipUpgrades = gameState.currentShipUpgrades || { damage: 0, fireRate: 0, health: 0, speed: 0 };
                this.updateShipStats();
                this.toggleSoundBtn.textContent = `TOGGLE SOUND (${this.soundEnabled ? 'ON' : 'OFF'})`;
                this.volumeSlider.value = this.gameVolume * 100;
                if (this.bgMusic) {
                    this.bgMusic.volume = this.soundEnabled ? this.gameVolume : 0;
                }
                if (this.shotSound) this.shotSound.volume = this.soundEnabled ? this.gameVolume : 0;
                if (this.explosionSound) this.explosionSound.volume = this.soundEnabled ? this.gameVolume : 0;
                if (this.powerUpSound) this.powerUpSound.volume = this.soundEnabled ? this.gameVolume : 0;
                if (this.baseHitSound) this.baseHitSound.volume = this.soundEnabled ? this.gameVolume : 0;
                if (this.abilitySound) this.abilitySound.volume = this.soundEnabled ? this.gameVolume : 0;
                
                const maxCompletedLevel = this.completedLevels.length > 0 ? Math.max(...this.completedLevels) : 0;
                this.currentLevel = Math.min(maxCompletedLevel + 1, this.levels.length - 1);
                if (this.currentLevel === 0) this.currentLevel = 1;

                this.isBossPhase = gameState.isBossPhase || false;
                if (this.isBossPhase && gameState.bossHealth !== null) {
                    // Logic to respawn boss with saved health can be added here if needed
                }

                return true;
            }
        } catch (e) {
            console.error('Error loading game:', e);
            localStorage.removeItem('spaceInvadersGameState');
        }
        return false;
    }

    updateMainMenuButtons() {
        const savedGameExists = localStorage.getItem('spaceInvadersGameState') !== null;
        this.continueGameBtn.style.display = savedGameExists ? 'block' : 'none';
        this.continueGameBtn.disabled = !savedGameExists;
    }

    updateShipStats() {
        const config = this.shipConfigs[this.currentShipType];
        if (!config) {
            console.error(`Ship configuration for ${this.currentShipType} not found.`);
            return;
        }

        let damage = config.baseDamage;
        let fireRate = config.baseFireRate;
        let projectileSpeed = config.baseProjectileSpeed;
        let speed = config.baseSpeed;
        let health = config.baseHealth;
        let numProjectiles = config.baseNumProjectiles;

        if (this.currentShipUpgrades.damage > 0) {
            damage += config.upgrades.damage.bonuses.slice(0, this.currentShipUpgrades.damage).reduce((sum, val) => sum + val, 0);
        }
        if (this.currentShipUpgrades.fireRate > 0) {
            fireRate -= config.upgrades.fireRate.bonuses.slice(0, this.currentShipUpgrades.fireRate).reduce((sum, val) => sum + val, 0);
        }
        if (this.currentShipUpgrades.health > 0) {
            health += config.upgrades.health.bonuses.slice(0, this.currentShipUpgrades.health).reduce((sum, val) => sum + val, 0);
        }
        if (this.currentShipUpgrades.speed > 0) {
            speed += config.upgrades.speed.bonuses.slice(0, this.currentShipUpgrades.speed).reduce((sum, val) => sum + val, 0);
        }

        this.currentShipStats = {
            damage: damage,
            fireRate: fireRate,
            projectileSpeed: projectileSpeed,
            projectileWidth: config.baseProjectileWidth,
            projectileHeight: config.baseProjectileHeight,
            numProjectiles: numProjectiles,
            speed: speed,
            health: health,
            ability: config.ability
        };
        if (this.playerHealth > this.currentShipStats.health) {
            this.playerHealth = this.currentShipStats.health;
        }
        if (this.player) {
            this.player.speed = this.currentShipStats.speed;
        }
    }
    
    updateShipShopUI() {
        document.getElementById('currentMoneyDisplayShipyard').textContent = this.money;
        document.getElementById('currentExperienceDisplayShipyard').textContent = this.experience;
        document.getElementById('currentMoneyDisplayUpgrade').textContent = this.money;
        document.getElementById('upgradeShipName').textContent = this.currentShipType.replace('ship', 'Ship ');

        const shipPurchaseColumn = document.getElementById('shipPurchaseColumn');
        const shipUpgradeColumn = document.getElementById('shipUpgradeColumn');
        shipPurchaseColumn.innerHTML = '';
        shipUpgradeColumn.innerHTML = '';

        Object.keys(this.shipConfigs).forEach(shipType => {
            const config = this.shipConfigs[shipType];
            const button = document.createElement('button');
            button.classList.add('menu-button', 'ship-button');
            
            const isOwned = this.ownedShips.includes(shipType);
            const isEquipped = this.currentShipType === shipType;

            if (isEquipped) {
                button.textContent = `${shipType.replace('ship', 'Ship ')} (Equipped)`;
                button.disabled = true;
            } else if (isOwned) {
                button.textContent = `Equip ${shipType.replace('ship', 'Ship ')}`;
                button.addEventListener('click', () => this.handleShopAction('equipShip', shipType));
            } else {
                button.textContent = `Buy ${shipType.replace('ship', 'Ship ')} - ${config.cost} EXP`;
                button.disabled = this.experience < config.cost;
                button.addEventListener('click', () => this.handleShopAction('buyShip', shipType));
            }
            shipPurchaseColumn.appendChild(button);
        });

        const currentShipConfig = this.shipConfigs[this.currentShipType];
        if (currentShipConfig && currentShipConfig.upgrades) {
            for (const upgradeType in currentShipConfig.upgrades) {
                const upgradeInfo = currentShipConfig.upgrades[upgradeType];
                const currentLevel = this.currentShipUpgrades[upgradeType];
                const upgradeButton = document.createElement('button');
                upgradeButton.classList.add('menu-button', 'upgrade-button');

                if (currentLevel < upgradeInfo.maxLevel) {
                    const cost = upgradeInfo.costs[currentLevel];
                    upgradeButton.textContent = `Upgrade ${upgradeType} (${currentLevel}/${upgradeInfo.maxLevel}) - ${cost} M`;
                    upgradeButton.disabled = this.money < cost;
                    upgradeButton.addEventListener('click', () => this.handleShopAction('upgradeShip', upgradeType));
                } else {
                    upgradeButton.textContent = `Upgrade ${upgradeType} (MAX)`;
                    upgradeButton.disabled = true;
                }
                shipUpgradeColumn.appendChild(upgradeButton);
            }
        }
        this.displayShipAbilityInfo(this.currentShipType);
    }

    displayShipAbilityInfo(shipType) {
        const config = this.shipConfigs[shipType];
        if (config) {
            document.getElementById('currentShipTypeDisplay').textContent = shipType.replace('ship', 'Ship ');
            document.getElementById('currentShipAbilityName').textContent = config.ability.name;
            document.getElementById('currentShipAbilityDescription').textContent = config.ability.description;
        }
    }

    handleShopAction(actionType, type = null) {
        let purchased = false, equipped = false, upgraded = false;

        switch (actionType) {
            case 'buyShip':
                const configToBuy = this.shipConfigs[type];
                if (configToBuy && !this.ownedShips.includes(type) && this.experience >= configToBuy.cost) {
                    this.experience -= configToBuy.cost;
                    this.ownedShips.push(type);
                    this.currentShipType = type;
                    this.currentShipUpgrades = { damage: 0, fireRate: 0, health: 0, speed: 0 };
                    purchased = true;
                    equipped = true;
                }
                break;
            case 'equipShip':
                if (this.ownedShips.includes(type) && this.currentShipType !== type) {
                    this.currentShipType = type;
                    this.currentShipUpgrades = this.loadShipUpgrades(type);
                    equipped = true;
                }
                break;
            case 'upgradeShip':
                const currentShipConfig = this.shipConfigs[this.currentShipType];
                const upgradeType = type;
                const currentLevel = this.currentShipUpgrades[upgradeType];
                const upgradeInfo = currentShipConfig.upgrades[upgradeType];

                if (currentLevel < upgradeInfo.maxLevel) {
                    const cost = upgradeInfo.costs[currentLevel];
                    if (this.money >= cost) {
                        this.money -= cost;
                        this.currentShipUpgrades[upgradeType]++;
                        upgraded = true;
                    }
                }
                break;
        }

        if (purchased || equipped || upgraded) {
            this.updateShipStats();
            this.updateShipShopUI();
            this.saveGame();
        }
    }

    loadShipUpgrades(shipType) {
        // NOTE: This currently resets upgrades when switching ships.
        // For persistent upgrades per ship, this would need to be saved in the game state.
        return { damage: 0, fireRate: 0, health: 0, speed: 0 };
    }

    showMenu(menuState) {
        this.mainMenuDiv.style.display = 'none';
        this.optionsMenuDiv.style.display = 'none';
        this.creditsScreenDiv.style.display = 'none';
        this.shopHangarDiv.style.display = 'none';
        this.gameOverScreenDiv.style.display = 'none';
        this.victoryScreenDiv.style.display = 'none';
        this.loadingTextDiv.style.display = 'none';
        this.difficultySelectionDiv.style.display = 'none';
        this.startGameBtn.style.display = 'none';
        this.levelMapScreenDiv.style.display = 'none';

        this.currentState = menuState;
        this.selectedMenuButtonIndex = 0;

        switch (menuState) {
            case GAME_STATES.MAIN_MENU:
                this.mainMenuDiv.style.display = 'block';
                this.startGameBtn.style.display = 'block';
                this.updateMainMenuButtons();
                this.currentMenuButtons = [
                    this.startGameBtn,
                    this.continueGameBtn, this.optionsBtn, this.creditsBtn
                ].filter(btn => btn.style.display !== 'none');
                break;
            case GAME_STATES.OPTIONS:
                this.optionsMenuDiv.style.display = 'block';
                this.currentMenuButtons = [this.toggleSoundBtn, this.volumeSlider, this.toggleFullscreenBtn, this.backToMainBtn];
                break;
            case GAME_STATES.CREDITS:
                this.creditsScreenDiv.style.display = 'block';
                this.currentMenuButtons = [this.backToMainFromCreditsBtn];
                break;
            case GAME_STATES.SHOP:
                this.shopHangarDiv.style.display = 'block';
                this.currentMenuButtons = [];
                break;
            case GAME_STATES.LEVEL_MAP:
                this.levelMapScreenDiv.style.display = 'flex';
                this.populateLevelMap();
                this.currentMenuButtons = Array.from(this.levelButtonsContainer.querySelectorAll('.level-button:not(:disabled)'));
                this.currentMenuButtons.push(this.levelMapBackToMainBtn);
                this.displayLevelPlot(this.currentLevel);
                break;
            case GAME_STATES.DIFFICULTY_SELECTION:
                this.difficultySelectionDiv.style.display = 'block';
                this.currentMenuButtons = [this.easyBtn, this.normalBtn, this.hardBtn, this.backToLevelMapBtn];
                break;
            case GAME_STATES.GAME_OVER:
                this.gameOverScreenDiv.style.display = 'block';
                this.currentMenuButtons = [this.gameOverBackToMainBtn];
                this.gameOverScoreSpan.textContent = this.score;
                this.gameOverBaseHealthSpan.textContent = this.base.health;
                break;
            case GAME_STATES.VICTORY:
                this.victoryScreenDiv.style.display = 'block';
                this.currentMenuButtons = [this.victoryBackToMainBtn];
                this.victoryScoreSpan.textContent = this.score;
                break;
            case GAME_STATES.LOADING:
                this.loadingTextDiv.style.display = 'block';
                this.currentMenuButtons = [];
                break;
            default:
                this.currentMenuButtons = [];
                break;
        }
        this.updateSelectedMenuButton();
    }
    
    updateSelectedMenuButton() {
        document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.level-button').forEach(btn => btn.classList.remove('selected'));
        this.volumeSlider.classList.remove('selected');


        if (this.currentMenuButtons.length > 0 && this.currentMenuButtons[this.selectedMenuButtonIndex]) {
            this.currentMenuButtons[this.selectedMenuButtonIndex].classList.add('selected');
        } else if (this.currentMenuButtons[this.selectedMenuButtonIndex] === this.volumeSlider) {
             this.volumeSlider.classList.add('selected');
        }
    }
    
    update(deltaTime) {
        if (this.currentState === GAME_STATES.SHOP) return;

        for (const abilityName in this.shipAbilityCooldowns) {
            this.shipAbilityCooldowns[abilityName] -= deltaTime;
            if (this.shipAbilityCooldowns[abilityName] <= 0) delete this.shipAbilityCooldowns[abilityName];
        }
        for (const abilityName in this.activeShipAbilities) {
            this.activeShipAbilities[abilityName].timer -= deltaTime;
            if (this.activeShipAbilities[abilityName].timer <= 0) this.deactivateShipAbility(abilityName);
        }
        for (const type in this.activePowerUpEffects) {
            this.activePowerUpEffects[type].timer -= deltaTime;
            if (this.activePowerUpEffects[type].timer <= 0) this.deactivatePowerUpEffect(type);
        }
        
        if (this.player) {
            this.player.update(deltaTime, this.keys);
            if (this.keys['q'] || this.keys['Q']) {
                this.activateCurrentShipAbility();
                this.keys['q'] = false;
                this.keys['Q'] = false;
            }
        }

        this.projectiles.forEach((p, i) => { p.update(deltaTime, this.canvas); if (!p.active) this.projectiles.splice(i, 1); });
        this.enemyProjectiles.forEach((p, i) => { p.update(deltaTime, this.canvas); if (!p.active) this.enemyProjectiles.splice(i, 1); });
        this.explosions.forEach((e, i) => { e.update(deltaTime); if (!e.active) this.explosions.splice(i, 1); });
        this.powerUps.forEach((p, i) => { p.update(deltaTime, this.canvas); if (!p.active) this.powerUps.splice(i, 1); });

        if (this.currentState === GAME_STATES.PLAYING) {
            const currentTime = performance.now() / 1000;
            if (currentTime - this.lastEnemySpawnTime >= this.enemySpawnRate) {
                this.spawnEnemy();
                this.lastEnemySpawnTime = currentTime;
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, this.canvas);
            if (!enemy.active) {
                this.enemies.splice(i, 1);
                continue;
            }
            if (checkCollision(enemy, this.base)) {
                enemy.active = false;
                this.base.health -= 10;
                if (this.soundEnabled && this.baseHitSound) this.baseHitSound.play().catch(e => console.error(e));
                if (this.base.health <= 0) {
                    this.base.health = 0;
                    this.showMenu(GAME_STATES.GAME_OVER);
                    if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
                    this.saveGame();
                    return;
                }
            }
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const projectile = this.projectiles[j];
                if (!projectile.active) continue;
                if (checkCollision(projectile, enemy)) {
                    projectile.active = false;
                    enemy.health -= projectile.damage;
                    if (enemy.health <= 0) {
                        enemy.active = false;
                        const difficulty = this.difficultySettings[this.currentDifficulty];
                        this.score += Math.round(10 * difficulty.scoreRate);
                        this.money += Math.round(5 * difficulty.moneyRate);
                        this.experience += Math.round(10 * difficulty.expRate);
                        if (Math.random() < 0.3) this.spawnPowerUp(enemy);
                        this.explosions.push(new Explosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, this.assetLoader.getAsset('explosionSprite')));
                        if (this.soundEnabled && this.explosionSound) this.explosionSound.play().catch(e => console.error(e));
                    }
                    break;
                }
            }
        }

        if (this.currentState === GAME_STATES.BOSS_FIGHT && this.boss && this.boss.active) {
            const bossActions = this.boss.update(deltaTime, this.canvas, this.player, this.projectiles, this);
            
            if (bossActions.newProjectiles.length > 0) this.enemyProjectiles.push(...bossActions.newProjectiles);
            if (bossActions.newEnemies.length > 0) {
                bossActions.newEnemies.forEach(newEnemy => {
                    if (this.enemies.length < this.maxEnemiesOnScreen) this.enemies.push(newEnemy);
                });
            }
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                if (!projectile.active) continue;
                if (checkCollision(projectile, this.boss)) {
                    projectile.active = false;
                    this.boss.health -= projectile.damage;
                    this.explosions.push(new Explosion(projectile.x, projectile.y, this.assetLoader.getAsset('explosionSprite')));
                    if (this.soundEnabled && this.explosionSound) this.explosionSound.play().catch(e => console.error(e));
                    if (this.boss.health <= 0) {
                        this.boss.active = false;
                        this.bossDefeated();
                        return;
                    }
                    break;
                }
            }
            if (this.player && !this.playerInvincible && checkCollision(this.player, this.boss)) {
                this.playerHealth -= this.boss.damage;
                this.playerInvincible = true;
                this.invincibilityTimer = this.invincibilityDuration;
                if (this.playerHealth <= 0) {
                    this.showMenu(GAME_STATES.GAME_OVER);
                    if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
                    this.saveGame();
                    return;
                }
            }
            if (checkCollision(this.boss, this.base)) {
                this.base.health = 0;
                this.showMenu(GAME_STATES.GAME_OVER);
                if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
                this.saveGame();
                return;
            }
        }

        if (this.currentState === GAME_STATES.PLAYING && this.score >= this.levelScoreToClear && this.enemies.length === 0 && !this.isBossPhase) {
            this.startBossPhase();
            return;
        }

        if (this.playerInvincible) {
            this.invincibilityTimer -= deltaTime;
            if (this.invincibilityTimer <= 0) this.playerInvincible = false;
        } else if (this.player) {
            for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
                const projectile = this.enemyProjectiles[i];
                if (!projectile.active) continue;
                if (checkCollision(this.player, projectile)) {
                    projectile.active = false;
                    this.playerHealth -= projectile.damage;
                    this.playerInvincible = true;
                    this.invincibilityTimer = this.invincibilityDuration;
                    if (this.playerHealth <= 0) {
                        this.showMenu(GAME_STATES.GAME_OVER);
                        if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
                        this.saveGame();
                        return;
                    }
                }
            }
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                if (!enemy.active) continue;
                if (checkCollision(this.player, enemy)) {
                    this.playerHealth -= 20;
                    enemy.active = false;
                    this.playerInvincible = true;
                    this.invincibilityTimer = this.invincibilityDuration;
                    if (this.playerHealth <= 0) {
                        this.showMenu(GAME_STATES.GAME_OVER);
                        if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
                        this.saveGame();
                        return;
                    }
                }
            }
        }

        if (this.player) {
            for (let i = this.powerUps.length - 1; i >= 0; i--) {
                const powerUp = this.powerUps[i];
                if (!powerUp.active) continue;
                if (checkCollision(this.player, powerUp)) {
                    powerUp.active = false;
                    this.applyPowerUpEffect(powerUp.type, powerUp.duration);
                    if (this.soundEnabled && this.powerUpSound) this.powerUpSound.play().catch(e => console.error(e));
                }
            }
        }
    }

    draw() {
        if (this.currentState === GAME_STATES.SHOP) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawStaticBackground();

        if (this.currentState === GAME_STATES.PLAYING || this.currentState === GAME_STATES.BOSS_FIGHT) {
            this.drawPlayingScreen();
        } else if (this.currentState === GAME_STATES.PAUSED) {
            this.drawPlayingScreen();
            this.drawPauseScreen();
        }
    }

    drawStaticBackground() {
        const backgroundImage = this.assetLoader.getAsset(this.currentBackgroundSpriteName);
        if (backgroundImage) {
            this.ctx.save();
            this.ctx.filter = 'brightness(50%)';
            this.ctx.drawImage(backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = '#0a0a2a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawBase() {
        const baseSprite = this.assetLoader.getAsset('baseSprite');
        const visualX = (this.canvas.width - this.base.visualWidth) / 2;

        if (baseSprite) {
            this.ctx.drawImage(baseSprite, visualX, this.base.y, this.base.visualWidth, this.base.height);
        } else {
            this.ctx.fillStyle = '#444444';
            this.ctx.fillRect(visualX, this.base.y, this.base.visualWidth, this.base.height);
        }

        const healthBarWidth = this.base.width * 0.8;
        const healthBarHeight = 10;
        const healthBarX = this.base.x + (this.base.width - healthBarWidth) / 2;
        const healthBarY = this.base.y + this.base.height - healthBarHeight - 5;

        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        const currentHealthWidth = (this.base.health / this.base.maxHealth) * healthBarWidth;
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '14px "Press Start 2P", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`BASE: ${this.base.health}`, this.canvas.width / 2, healthBarY - 10);
    }

    drawPlayingScreen() {
        if (this.player) {
            this.player.draw(this.ctx, this.assetLoader, this.playerInvincible, this.invincibilityTimer);
        }
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.enemyProjectiles.forEach(p => p.draw(this.ctx));
        this.explosions.forEach(e => e.draw(this.ctx));
        this.powerUps.forEach(p => p.draw(this.ctx, this.assetLoader));
        
        this.enemies.forEach(e => e.draw(this.ctx, this.assetLoader));
        
        if (this.boss && this.boss.active) {
            this.boss.draw(this.ctx, this.assetLoader);
        }

        this.drawBase();
        this.drawHUD();
    }
    
    drawHUD() {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px "Press Start 2P", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 30);
        this.ctx.fillText(`MONEY: ${this.money}`, 10, 60);
        this.ctx.fillText(`EXP: ${this.experience}`, 10, 90);
        this.ctx.fillText(`LEVEL: ${this.currentLevel}`, 10, 120);
        this.ctx.fillText(`SHIP: ${this.currentShipType.toUpperCase().replace('SHIP', 'SHIP ')}`, 10, 150);
        this.ctx.fillText(`DMG: ${this.currentShipStats.damage.toFixed(0)}`, 10, 180);
        this.ctx.fillText(`FR: ${(1 / this.currentShipStats.fireRate).toFixed(1)}/s`, 10, 210);
        this.ctx.fillText(`SHOTS: ${this.currentShipStats.numProjectiles}`, 10, 240);
        
        const currentShipAbility = this.shipConfigs[this.currentShipType].ability;
        if (currentShipAbility && currentShipAbility.cooldown > 0) {
            const remainingCooldown = this.shipAbilityCooldowns[currentShipAbility.name];
            if (remainingCooldown !== undefined && remainingCooldown > 0) {
                this.ctx.fillText(`ABILITY CD: ${remainingCooldown.toFixed(1)}s`, 10, 270);
            } else {
                this.ctx.fillText(`ABILITY: READY`, 10, 270);
            }
        } else {
            this.ctx.fillText(`ABILITY: N/A`, 10, 270);
        }


        this.ctx.textAlign = 'right';
        this.ctx.fillText(`HEALTH: ${this.playerHealth}`, this.canvas.width - 10, 30);

        if (this.isBossPhase && this.boss && this.boss.active) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = '24px "Press Start 2P", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`BOSS HEALTH: ${this.boss.health.toFixed(0)}`, this.canvas.width / 2, 60);

            const bossHealthBarWidth = this.canvas.width * 0.6;
            const bossHealthBarHeight = 20;
            const bossHealthBarX = (this.canvas.width - bossHealthBarWidth) / 2;
            const bossHealthBarY = 80;

            this.ctx.fillStyle = 'darkred';
            this.ctx.fillRect(bossHealthBarX, bossHealthBarY, bossHealthBarWidth, bossHealthBarHeight);

            const currentBossHealthWidth = (this.boss.health / this.boss.maxHealth) * bossHealthBarWidth;
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(bossHealthBarX, bossHealthBarY, currentBossHealthWidth, bossHealthBarHeight);
        }
    }

    drawPauseScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '40px "Press Start 2P", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.font = '20px "Press Start 2P", monospace';
        this.ctx.fillText('Press ESC or P to Resume', this.canvas.width / 2, this.canvas.height / 2 + 30);
        this.ctx.fillText('Press M for Main Menu', this.canvas.width / 2, this.canvas.height / 2 + 70);
    }
    
    activateCurrentShipAbility() {
        const currentShipAbility = this.currentShipStats.ability;
        if (!currentShipAbility || currentShipAbility.name === 'None') {
            return;
        }
    
        const abilityName = currentShipAbility.name;
        const cooldown = currentShipAbility.cooldown;
    
        if (this.shipAbilityCooldowns[abilityName] && this.shipAbilityCooldowns[abilityName] > 0) {
            return;
        }
    
        if (this.soundEnabled && this.abilitySound) {
            this.abilitySound.currentTime = 0;
            this.abilitySound.play().catch(e => console.error("Error playing ability sound:", e));
        }
    
        this.shipAbilityCooldowns[abilityName] = cooldown;
    
        switch (abilityName) {
            case 'Dash':
                // *** FIX: Corrected ability timer to match description (1.5s)
                const dashDuration = 1.5;
                if (this.activeShipAbilities[abilityName]) {
                    this.activeShipAbilities[abilityName].timer = dashDuration;
                } else {
                    this.activeShipAbilities[abilityName] = { 
                        timer: dashDuration, 
                        originalSpeed: this.player.speed 
                    };
                }
                this.playerInvincible = true;
                this.invincibilityTimer = dashDuration;
                this.player.speed = this.activeShipAbilities[abilityName].originalSpeed * 2;
                break;
    
            case 'EMP Blast':
                 // *** FIX: Corrected ability timer to match description (2s)
                const empDuration = 2;
                this.enemies.forEach(enemy => {
                    if (!enemy.isBoss) {
                        enemy.isStunned = true;
                    }
                });
                this.activeShipAbilities[abilityName] = { timer: empDuration };
                break;
    
            case 'Drone Companion':
                // *** FIX: Corrected ability timer to match description (5s)
                const droneDuration = 5;
                if (!this.activeShipAbilities[abilityName]) {
                    this.activeShipAbilities[abilityName] = { originalNumProjectiles: this.currentShipStats.numProjectiles };
                }
                this.activeShipAbilities[abilityName].timer = droneDuration;
                this.currentShipStats.numProjectiles = this.activeShipAbilities[abilityName].originalNumProjectiles + 2;
                break;
    
            case 'Shield Recharge':
                this.base.health = Math.min(this.base.health + 30, this.base.maxHealth);
                break;
    
            case 'Time Warp':
                // *** FIX: Corrected ability timer to match description (3s)
                const timeWarpDuration = 3;
                if (!this.activeShipAbilities[abilityName]) {
                    this.activeShipAbilities[abilityName] = { originalEnemySpeedMultiplier: this.currentEnemySpeedMultiplier };
                }
                this.activeShipAbilities[abilityName].timer = timeWarpDuration;
                this.currentEnemySpeedMultiplier = this.activeShipAbilities[abilityName].originalEnemySpeedMultiplier * 0.3;
                break;
    
            case 'Mega Bomb':
                this.enemies.forEach(enemy => {
                    enemy.active = false;
                    const difficulty = this.difficultySettings[this.currentDifficulty];
                    this.score += Math.round(10 * difficulty.scoreRate);
                    this.money += Math.round(5 * difficulty.moneyRate);
                    this.experience += Math.round(10 * difficulty.expRate);
                    this.explosions.push(new Explosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, this.assetLoader.getAsset('explosionSprite'), 10, 50, 0.5));
                    if (this.soundEnabled && this.explosionSound) {
                        this.explosionSound.currentTime = 0;
                        this.explosionSound.play().catch(e => console.error("Error playing explosion sound:", e));
                    }
                });
                this.enemies = [];
    
                if (this.boss && this.boss.active) {
                    this.boss.health -= 200;
                    this.explosions.push(new Explosion(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2, this.assetLoader.getAsset('explosionSprite'), 10, 100, 0.5));
                    if (this.soundEnabled && this.explosionSound) {
                        this.explosionSound.currentTime = 0;
                        this.explosionSound.play().catch(e => console.error("Error playing explosion sound:", e));
                    }
                    if (this.boss.health <= 0) {
                        this.boss.active = false;
                        this.bossDefeated();
                    }
                }
                break;
        }
    }
    
    deactivateShipAbility(abilityName) {
        switch (abilityName) {
            case 'Dash':
                if (this.activeShipAbilities[abilityName]) {
                    this.player.speed = this.activeShipAbilities[abilityName].originalSpeed;
                    this.playerInvincible = false;
                    delete this.activeShipAbilities[abilityName];
                }
                break;
    
            case 'EMP Blast':
                if (this.activeShipAbilities[abilityName]) {
                    this.enemies.forEach(enemy => {
                        enemy.isStunned = false;
                    });
                    // *** FIX: Ensure the boss is also unstunned
                    if (this.boss && this.boss.active) {
                        this.boss.isStunned = false;
                    }
                    delete this.activeShipAbilities[abilityName];
                }
                break;
    
            case 'Drone Companion':
                if (this.activeShipAbilities[abilityName]) {
                    this.currentShipStats.numProjectiles = this.activeShipAbilities[abilityName].originalNumProjectiles;
                    delete this.activeShipAbilities[abilityName];
                }
                break;
    
            case 'Time Warp':
                if (this.activeShipAbilities[abilityName]) {
                    this.currentEnemySpeedMultiplier = this.activeShipAbilities[abilityName].originalEnemySpeedMultiplier;
                    delete this.activeShipAbilities[abilityName];
                }
                break;
            
            // *** FIX: Removed dead code for 'Orbital Laser' which was not a defined ability
        }
    }

    handleKeyDown(e) {
        if (this.tutorialActive) {
            // Block all gameplay/menu input except tutorial advance
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.advanceTutorial();
            }
            return;
        }

        this.keys[e.key] = true;

        if (this.currentState === GAME_STATES.SHOP) {
            if (e.key === 'e' || e.key === 'E') {
                this.shop.interact();
            } else if (this.shop.currentMenu) {
                this.shop.handleMenuInput(e.key);
            }
            return;
        }

        if (this.currentMenuButtons.length > 0) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedMenuButtonIndex = (this.selectedMenuButtonIndex - 1 + this.currentMenuButtons.length) % this.currentMenuButtons.length;
                this.updateSelectedMenuButton();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedMenuButtonIndex = (this.selectedMenuButtonIndex + 1) % this.currentMenuButtons.length;
                this.updateSelectedMenuButton();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.currentMenuButtons[this.selectedMenuButtonIndex]) {
                    this.currentMenuButtons[this.selectedMenuButtonIndex].click();
                }
            }
        }

        if ((e.key === ' ' || e.key === 'Space') && (this.currentState === GAME_STATES.PLAYING || this.currentState === GAME_STATES.BOSS_FIGHT)) {
            if (this.canFireOnKeyPress) {
                const currentTime = performance.now() / 1000;
                if (currentTime - this.lastShotTime >= this.currentShipStats.fireRate) {
                    this.player.fire();
                    if (this.soundEnabled && this.shotSound) {
                        this.shotSound.currentTime = 0;
                        this.shotSound.play().catch(e => console.error("Error playing shot sound:", e));
                    }
                    this.lastShotTime = currentTime;
                    this.canFireOnKeyPress = false;
                }
            }
        }

        if (e.key === 'Escape' || e.key === 'p') {
            if (this.currentState === GAME_STATES.PLAYING || this.currentState === GAME_STATES.BOSS_FIGHT) {
                this.currentState = GAME_STATES.PAUSED;
                if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
            } else if (this.currentState === GAME_STATES.PAUSED) {
                this.currentState = this.isBossPhase ? GAME_STATES.BOSS_FIGHT : GAME_STATES.PLAYING;
                if (this.bgMusic && this.soundEnabled) this.bgMusic.play().catch(e => console.error(e));
            }
        }
        
        if (e.key === 'm' || e.key === 'M') {
            if (this.currentState !== GAME_STATES.MAIN_MENU && this.currentState !== GAME_STATES.LOADING) {
                 this.returnToMainMenu();
            }
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
        if (e.key === ' ' || e.key === 'Space') {
            this.canFireOnKeyPress = true;
        }
    }

    handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initializeBase();
        if (this.player) {
            const playerMaxY = this.canvas.height - this.base.height - this.player.height;
            this.player.x = Math.min(Math.max(0, this.player.x), this.canvas.width - this.player.width);
            this.player.y = Math.min(Math.max(0, this.player.y), playerMaxY);
        }
        if (this.boss && this.boss.active) {
            this.boss.x = (this.canvas.width - this.boss.width) / 2;
            this.boss.y = Math.max(0, this.boss.y); 
        }
    }

    toggleFullScreen() {
        if (!document.fullscreenElement) {
            this.gameContainer.requestFullscreen().catch(err => alert(`Error: ${err.message}`));
        } else {
            document.exitFullscreen();
        }
    }

    returnToMainMenu(forceReset = false) {
        if (forceReset) {
            this.resetGame(true);
        }
        this.showMenu(GAME_STATES.MAIN_MENU);
        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic.currentTime = 0;
        }
        this.updateMainMenuButtons();
    }

    resetGame(clearSave = false, keepPlayerState = false) {
        this.score = 0;
        this.money = 0;
        this.experience = 0;
        this.playerHealth = 100;
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.powerUps = [];
        this.enemies = [];
        this.explosions = [];
        this.activePowerUpEffects = {};
        this.playerInvincible = false;
        this.invincibilityTimer = 0;
        this.base.health = this.base.maxHealth;
        this.lastEnemySpawnTime = 0;
        this.lastShotTime = 0;
        this.canFireOnKeyPress = true;

        this.boss = null;
        this.isBossPhase = false;

        if (!keepPlayerState) {
            this.currentShipType = 'ship1';
            this.ownedShips = ['ship1'];
            this.currentShipUpgrades = { damage: 0, fireRate: 0, health: 0, speed: 0 };
            this.completedLevels = [];
        }
        this.shipAbilityCooldowns = {};
        this.activeShipAbilities = {};
        this.updateShipStats();
        this.currentLevel = 1;

        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic.currentTime = 0;
        }
        if (clearSave) {
            localStorage.removeItem('spaceInvadersGameState');
        }
        this.updateMainMenuButtons();
    }

    initializeLevel() {
        const levelConfig = this.levels[this.currentLevel];
        if (!levelConfig || !levelConfig.enemySpawnRate) {
            this.showMenu(GAME_STATES.VICTORY);
            if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
            return;
        }

        const difficulty = this.difficultySettings[this.currentDifficulty];
        this.enemySpawnRate = levelConfig.enemySpawnRate * (1 / difficulty.spawnRate);
        this.currentEnemySpeedMultiplier = levelConfig.enemySpeedMultiplier * difficulty.enemySpeed;
        this.currentEnemyHealthMultiplier = levelConfig.enemyHealthMultiplier * difficulty.enemyHealth;
        this.maxEnemiesOnScreen = levelConfig.maxEnemiesOnScreen || Infinity;
        this.levelScoreToClear = levelConfig.scoreToClear;
        this.currentLevelEnemyTypes = levelConfig.newEnemyTypes || this.monsterSpriteNames;
        this.currentBackgroundSpriteName = levelConfig.background || this.terrainSpriteNames[0];

        this.projectiles = [];
        this.enemyProjectiles = [];
        this.powerUps = [];
        this.enemies = [];
        this.explosions = [];
        this.activePowerUpEffects = {};
        this.playerHealth = this.currentShipStats.health;

        this.isBossPhase = false;
        this.boss = null;
    }

    initializeBase() {
        const baseSprite = this.assetLoader.getAsset('baseSprite');
        const desiredBaseHeight = this.canvas.height * 0.25;
        let calculatedWidth = this.canvas.width;

        if (baseSprite && baseSprite.naturalWidth > 0 && baseSprite.naturalHeight > 0) {
            const aspectRatio = baseSprite.naturalWidth / baseSprite.naturalHeight;
            calculatedWidth = desiredBaseHeight * aspectRatio;
        }

        this.base.visualWidth = Math.max(calculatedWidth, 100);
        this.base.height = Math.max(desiredBaseHeight, 50);

        // Make the collision width smaller than the visual width
        this.base.width = this.base.visualWidth * 0.7;
        this.base.x = (this.canvas.width - this.base.width) / 2;
        this.base.y = this.canvas.height - this.base.height;
    }

    initializePlayer() {
        this.player = new Player(this);
        this.playerHealth = this.currentShipStats.health;
        this.player.speed = this.currentShipStats.speed;
    }

    startBossPhase() {
        const levelConfig = this.levels[this.currentLevel];
        if (!levelConfig || !levelConfig.bossConfig) {
            this.bossDefeated();
            return;
        }

        this.isBossPhase = true;
        this.currentState = GAME_STATES.BOSS_FIGHT;
        this.enemies = [];
        this.projectiles = [];
        this.powerUps = [];
        this.spawnBoss(levelConfig.bossConfig);
    }

    spawnBoss(bossConfig) {
        const bossWidth = 250;
        const bossHeight = 250;
        const bossX = (this.canvas.width - bossWidth) / 2;
        const bossY = -bossHeight;

        const difficulty = this.difficultySettings[this.currentDifficulty];
        const bossHealth = (100 + this.currentLevel * 20) * bossConfig.healthMultiplier * difficulty.enemyHealth * (1 + this.currentShipStats.damage / 10);
        const bossSpeed = 10 * bossConfig.speedMultiplier * difficulty.enemySpeed;

        this.boss = new Enemy(bossX, bossY, bossWidth, bossHeight, bossSpeed, 'boss', bossConfig.spriteName, true, bossConfig.fireRate, bossConfig.projectileSpeed, bossConfig.projectileDamage, bossConfig.specialAttack);
        this.boss.health = bossHealth;
        this.boss.maxHealth = bossHealth;
        this.boss.damage = 20;
    }

    bossDefeated() {
        this.isBossPhase = false;
        this.boss = null;

        if (!this.completedLevels.includes(this.currentLevel)) {
            this.completedLevels.push(this.currentLevel);
            this.completedLevels.sort((a, b) => a - b);
        }

        if (this.currentLevel + 1 < this.levels.length && this.levels[this.currentLevel + 1].enemySpawnRate) {
            this.currentLevel++;
            this.showMenu(GAME_STATES.SHOP);
        } else {
            this.showMenu(GAME_STATES.VICTORY);
        }
        if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
        this.saveGame();
    }

    spawnEnemy() {
        if (this.score >= this.levelScoreToClear || this.enemies.length >= this.maxEnemiesOnScreen || this.isBossPhase) return;
        
        const enemyWidth = 80;
        const enemyHeight = 80;
        const enemyX = Math.random() * (this.canvas.width - enemyWidth);
        const enemyY = -enemyHeight;
        let effectiveEnemySpeedMultiplier = this.currentEnemySpeedMultiplier;
        if (this.activeShipAbilities.timeWarp) {
            effectiveEnemySpeedMultiplier = this.activeShipAbilities.timeWarp.originalEnemySpeedMultiplier * this.activeShipAbilities.timeWarp.slowFactor;
        }
        const baseEnemySpeed = (80 + Math.random() * 40);
        const enemySpeed = baseEnemySpeed * effectiveEnemySpeedMultiplier * this.difficultySettings[this.currentDifficulty].enemySpeed;
        
        const randomSpriteName = this.currentLevelEnemyTypes[Math.floor(Math.random() * this.currentLevelEnemyTypes.length)];
        const newEnemy = new Enemy(enemyX, enemyY, enemyWidth, enemyHeight, enemySpeed, 'basic', randomSpriteName);
        newEnemy.health = 3 * this.currentEnemyHealthMultiplier;
        newEnemy.maxHealth = 3 * this.currentEnemyHealthMultiplier;
        this.enemies.push(newEnemy);
    }

    spawnPowerUp(enemy) {
        const powerUpTypes = ['fireRate', 'shield', 'money', 'heal', 'bomb', 'slowEnemies'];
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        let spriteName;
        switch (type) {
            case 'shield': spriteName = 'shieldPowerUpSprite'; break;
            case 'fireRate': spriteName = 'fireRatePowerUpSprite'; break;
            case 'money': spriteName = 'moneyPowerUpSprite'; break;
            case 'heal': spriteName = 'healPowerUpSprite'; break;
            case 'bomb': spriteName = 'bombPowerUpSprite'; break;
            case 'slowEnemies': spriteName = 'slowPowerUpSprite'; break;
        }
        this.powerUps.push(new PowerUp(enemy.x, enemy.y, 40, 40, type, spriteName));
    }
    
    applyPowerUpEffect(type, duration) {
        switch (type) {
            case 'shield':
                this.playerInvincible = true;
                this.invincibilityTimer = duration;
                this.activePowerUpEffects.shield = { timer: duration };
                break;
            case 'fireRate':
                if (!this.activePowerUpEffects.fireRate) {
                    this.activePowerUpEffects.fireRate = { originalFireRate: this.currentShipStats.fireRate };
                    this.currentShipStats.fireRate *= 0.5;
                }
                this.activePowerUpEffects.fireRate.timer = duration;
                break;
            case 'money':
                this.money += 50;
                break;
            case 'heal':
                this.playerHealth = Math.min(this.playerHealth + 25, this.currentShipStats.health);
                break;
            case 'bomb': {
                const bombRadius = 250;
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;

                this.explosions.push(new Explosion(playerCenterX, playerCenterY, this.assetLoader.getAsset('explosionSprite'), 20, bombRadius, 0.5));
                if (this.soundEnabled && this.explosionSound) {
                    this.explosionSound.currentTime = 0;
                    this.explosionSound.play().catch(e => console.error("Error playing explosion sound:", e));
                }
                
                this.enemies.forEach(enemy => {
                    if (!enemy.active) return;
                    const enemyCenterX = enemy.x + enemy.width / 2;
                    const enemyCenterY = enemy.y + enemy.height / 2;
                    const distance = Math.sqrt(Math.pow(playerCenterX - enemyCenterX, 2) + Math.pow(playerCenterY - enemyCenterY, 2));

                    if (distance <= bombRadius) {
                        enemy.active = false;
                        const difficulty = this.difficultySettings[this.currentDifficulty];
                        this.score += Math.round(10 * difficulty.scoreRate);
                        this.money += Math.round(5 * difficulty.moneyRate);
                        this.experience += Math.round(10 * difficulty.expRate);
                    }
                });

                if (this.boss && this.boss.active) {
                    const bossCenterX = this.boss.x + this.boss.width / 2;
                    const bossCenterY = this.boss.y + this.boss.height / 2;
                    const distance = Math.sqrt(Math.pow(playerCenterX - bossCenterX, 2) + Math.pow(playerCenterY - bossCenterY, 2));
                    
                    if (distance <= bombRadius) {
                        this.boss.health -= 200;
                        if (this.boss.health <= 0) {
                            this.boss.active = false;
                            this.bossDefeated();
                        }
                    }
                }
                break;
            }
            case 'slowEnemies':
                if (!this.activePowerUpEffects.slowEnemies) {
                    this.activePowerUpEffects.slowEnemies = { slowFactor: 0.5 };
                    this.enemies.forEach(e => e.speed *= this.activePowerUpEffects.slowEnemies.slowFactor);
                    if (this.boss && this.boss.active) {
                        this.boss.speed *= this.activePowerUpEffects.slowEnemies.slowFactor;
                    }
                    this.currentEnemySpeedMultiplier *= this.activePowerUpEffects.slowEnemies.slowFactor;
                }
                this.activePowerUpEffects.slowEnemies.timer = duration;
                break;
        }
    }

    deactivatePowerUpEffect(type) {
        switch (type) {
            case 'shield':
                delete this.activePowerUpEffects.shield;
                break;
            case 'fireRate':
                if (this.activePowerUpEffects.fireRate) {
                    this.currentShipStats.fireRate = this.activePowerUpEffects.fireRate.originalFireRate;
                    delete this.activePowerUpEffects.fireRate;
                }
                break;
            case 'slowEnemies':
                if (this.activePowerUpEffects.slowEnemies) {
                    const speedUpFactor = 1 / this.activePowerUpEffects.slowEnemies.slowFactor;
                    this.enemies.forEach(e => e.speed *= speedUpFactor);
                    if (this.boss && this.boss.active) {
                        this.boss.speed *= speedUpFactor;
                    }
                    this.currentEnemySpeedMultiplier *= speedUpFactor;
                    delete this.activePowerUpEffects.slowEnemies;
                }
                break;
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.toggleSoundBtn.textContent = `TOGGLE SOUND (${this.soundEnabled ? 'ON' : 'OFF'})`;
        if (this.bgMusic) {
            this.bgMusic.volume = this.soundEnabled ? this.gameVolume : 0;
        }
        if (this.shotSound) this.shotSound.volume = this.soundEnabled ? this.gameVolume : 0;
        if (this.explosionSound) this.explosionSound.volume = this.soundEnabled ? this.gameVolume : 0;
        if (this.powerUpSound) this.powerUpSound.volume = this.soundEnabled ? this.gameVolume : 0;
        if (this.baseHitSound) this.baseHitSound.volume = this.soundEnabled ? this.gameVolume : 0;
        if (this.abilitySound) this.abilitySound.volume = this.soundEnabled ? this.gameVolume : 0;

        this.saveGame();
    }

    setVolume(volume) {
        this.gameVolume = volume;
        if (this.bgMusic) {
            this.bgMusic.volume = this.soundEnabled ? this.gameVolume : 0;
        }
        if (this.shotSound) this.shotSound.volume = this.soundEnabled ? this.gameVolume : 0;
        if (this.explosionSound) this.explosionSound.volume = this.soundEnabled ? this.gameVolume : 0;
        if (this.powerUpSound) this.powerUpSound.volume = this.soundEnabled ? this.gameVolume : 0;
        if (this.baseHitSound) this.baseHitSound.volume = this.soundEnabled ? this.gameVolume : 0;
        if (this.abilitySound) this.abilitySound.volume = this.soundEnabled ? this.gameVolume : 0;

        this.saveGame();
    }

    showDifficultySelection() {
        this.startGameBtn.style.display = 'none';
        this.difficultySelectionDiv.style.display = 'block';
        this.currentMenuButtons = [this.easyBtn, this.normalBtn, this.hardBtn, this.backToLevelMapBtn];
        this.updateSelectedMenuButton();
    }

    hideDifficultySelection() {
        this.difficultySelectionDiv.style.display = 'none';
    }

    populateLevelMap() {
        this.levelButtonsContainer.innerHTML = '';
        const maxAvailableLevel = this.completedLevels.length > 0 ? Math.max(...this.completedLevels) + 1 : 1;

        for (let i = 1; i < this.levels.length; i++) {
            const levelConfig = this.levels[i];
            if (!levelConfig.enemySpawnRate) continue;

            const button = document.createElement('button');
            button.classList.add('level-button', 'menu-button');
            button.textContent = `Level ${i}`;
            button.dataset.levelIndex = i;

            const isCompleted = this.completedLevels.includes(i);
            const isLocked = i > maxAvailableLevel;

            if (isCompleted) {
                button.classList.add('completed');
            }
            if (isLocked) {
                button.disabled = true;
                button.textContent += ' (Locked)';
            } else {
                button.addEventListener('click', () => this.handleLevelSelection(i));
                if (i === this.currentLevel) {
                    button.classList.add('selected');
                }
            }

            button.addEventListener('mouseenter', () => this.displayLevelPlot(i));
            button.addEventListener('focus', () => this.displayLevelPlot(i));
            button.addEventListener('mouseleave', () => this.displayLevelPlot(this.currentLevel));
            button.addEventListener('blur', () => this.displayLevelPlot(this.currentLevel));

            this.levelButtonsContainer.appendChild(button);
        }
        this.displayLevelPlot(this.currentLevel);

        this.currentMenuButtons = Array.from(this.levelButtonsContainer.querySelectorAll('.level-button:not(:disabled)'));
        this.currentMenuButtons.push(this.levelMapBackToMainBtn);
        this.updateSelectedMenuButton();
    }

    displayLevelPlot(levelIndex) {
        const levelConfig = this.levels[levelIndex];
        if (levelConfig && levelConfig.plot) {
            this.levelPlotDisplay.textContent = levelConfig.plot;
        } else {
            this.levelPlotDisplay.textContent = 'No plot available for this level.';
        }
    }

    showTutorial() {
        this.tutorialActive = true;
        this.tutorialIndex = 0;
        this.commanderPopup.style.display = 'flex';
        this.showMenu(null); // Hide all menus
        this.typeCommanderMessage(this.tutorialMessages[this.tutorialIndex]);
        this.commanderNextBtn.disabled = true;
    }

    typeCommanderMessage(message) {
        clearInterval(this.typingInterval);
        this.currentTypedText = '';
        this.commanderText.textContent = '';
        let i = 0;
        this.commanderCursor.style.display = 'inline-block';
        this.commanderNextBtn.disabled = true;
        this.typingInterval = setInterval(() => {
            if (i < message.length) {
                this.currentTypedText += message[i];
                this.commanderText.textContent = this.currentTypedText;
                i++;
            } else {
                clearInterval(this.typingInterval);
                this.commanderCursor.style.display = 'inline-block';
                this.commanderNextBtn.disabled = false;
            }
        }, 24);
    }

    advanceTutorial() {
        if (!this.tutorialActive) return;
        this.tutorialIndex++;
        if (this.tutorialIndex < this.tutorialMessages.length) {
            this.typeCommanderMessage(this.tutorialMessages[this.tutorialIndex]);
            this.commanderNextBtn.disabled = true;
        } else {
            this.endTutorial();
        }
    }

    endTutorial() {
        this.tutorialActive = false;
        this.commanderPopup.style.display = 'none';
        localStorage.setItem('tutorialCompleted', '1');
        this.showMenu(GAME_STATES.PLAYING);
        if (this.soundEnabled && this.bgMusic && this.bgMusic.paused) {
            this.bgMusic.play().catch(e => console.error("Error playing music:", e));
        }
    }
}