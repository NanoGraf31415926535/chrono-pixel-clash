import { GAME_STATES } from './constants.js';
import { checkCollision } from './utils.js';
import { AssetLoader } from './classes/AssetLoader.js';
import { Player } from './classes/Player.js';
import { Projectile } from './classes/Projectile.js';
import { Enemy } from './classes/Enemy.js';
import { PowerUp } from './classes/PowerUp.js';
import { Explosion } from './classes/Explosion.js';
import { Shop } from './classes/Shop.js';
import { Achievement, AchievementManager } from './classes/Achievement.js';

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
            easy:   { enemySpeed: 0.8, enemyHealth: 0.6, spawnRate: 1.2, moneyRate: 1.5, scoreRate: 1.0, expRate: 1.0 },
            normal: { enemySpeed: 0.8, enemyHealth: 0.8, spawnRate: 1.2, moneyRate: 1.5, scoreRate: 1.0, expRate: 1.0 },
            hard:   { enemySpeed: 1.0, enemyHealth: 1.0, spawnRate: 1.0, moneyRate: 1.5, scoreRate: 1.0, expRate: 1.0 }
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
        this.enemiesDefeated = 0; // Achievement tracking
        this.projectilesFired = 0; // Achievement tracking
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
            { enemySpawnRate: 2.2, enemySpeedMultiplier: 1.0, enemyHealthMultiplier: 1.0, maxEnemiesOnScreen: 10, scoreToClear: 200, newEnemyTypes: ['monster1'], background: 'terrain1', plot: 'Sector Alpha is under attack! Clear out the initial wave of invaders and secure our perimeter.', bossConfig: { spriteName: 'boss1Sprite', healthMultiplier: 1.5, speedMultiplier: 0.1, fireRate: 2, projectileSpeed: 150, projectileDamage: 10, specialAttack: 'scatterShot' } },
            { enemySpawnRate: 2.1, enemySpeedMultiplier: 1.0, enemyHealthMultiplier: 1.1, maxEnemiesOnScreen: 12, scoreToClear: 600, newEnemyTypes: ['monster1', 'monster2'], background: 'terrain2', plot: 'The enemy is adapting. Push through the asteroid belt and eliminate their scout forces.', bossConfig: { spriteName: 'boss2Sprite', healthMultiplier: 2.5, speedMultiplier: 0.1, fireRate: 1.8, projectileSpeed: 160, projectileDamage: 12, specialAttack: 'summonMinions' } },
            { enemySpawnRate: 2.0, enemySpeedMultiplier: 1.1, enemyHealthMultiplier: 1.2, maxEnemiesOnScreen: 14, scoreToClear: 1000, newEnemyTypes: ['monster1', 'monster2', 'monster3'], background: 'terrain3', plot: 'Intel suggests a heavy enemy presence near the gas giant. Brace for a tougher fight!', bossConfig: { spriteName: 'boss3Sprite', healthMultiplier: 4, speedMultiplier: 0.1, fireRate: 1.6, projectileSpeed: 170, projectileDamage: 15, specialAttack: 'chargeBeam' } },
            { enemySpawnRate: 1.9, enemySpeedMultiplier: 1.1, enemyHealthMultiplier: 1.3, maxEnemiesOnScreen: 16, scoreToClear: 1400, newEnemyTypes: ['monster2', 'monster3', 'monster4'], background: 'terrain4', plot: 'They\'ve deployed new, faster units. Show them the might of the Alliance in the nebulae of Sector Gamma.', bossConfig: { spriteName: 'boss4Sprite', healthMultiplier: 5, speedMultiplier: 0.1, fireRate: 1.5, projectileSpeed: 180, projectileDamage: 18, specialAttack: 'laserBarrage' } },
            { enemySpawnRate: 1.8, enemySpeedMultiplier: 1.2, enemyHealthMultiplier: 1.4, maxEnemiesOnScreen: 18, scoreToClear: 1800, newEnemyTypes: ['monster3', 'monster4', 'monster5'], background: 'terrain1', plot: 'Deep space mining operations are threatened. Protect the resource extractors from the incoming swarm.', bossConfig: { spriteName: 'boss5Sprite', healthMultiplier: 7, speedMultiplier: 0.1, fireRate: 1.4, projectileSpeed: 190, projectileDamage: 20, specialAttack: 'summonMinions' } },
            { enemySpawnRate: 1.7, enemySpeedMultiplier: 1.2, enemyHealthMultiplier: 1.5, maxEnemiesOnScreen: 20, scoreToClear: 2200, newEnemyTypes: ['monster4', 'monster5', 'monster6'], background: 'terrain2', plot: 'An enemy mothership has been sighted! Clear its escort to prepare for a full assault.', bossConfig: { spriteName: 'boss6Sprite', healthMultiplier: 8.5, speedMultiplier: 0.1, fireRate: 1.3, projectileSpeed: 200, projectileDamage: 22, specialAttack: 'scatterShot' } },
            { enemySpawnRate: 1.6, enemySpeedMultiplier: 1.3, enemyHealthMultiplier: 1.6, maxEnemiesOnScreen: 22, scoreToClear: 3000, newEnemyTypes: ['monster5', 'monster6', 'monster7'], background: 'terrain3', plot: 'The enemy is retreating to their last stronghold. Pursue them through the treacherous debris field.', bossConfig: { spriteName: 'boss7Sprite', healthMultiplier: 10, speedMultiplier: 0.1, fireRate: 1.2, projectileSpeed: 210, projectileDamage: 25, specialAttack: 'laserBarrage' } },
            { enemySpawnRate: 1.5, enemySpeedMultiplier: 1.3, enemyHealthMultiplier: 1.8, maxEnemiesOnScreen: 24, scoreToClear: 3800, newEnemyTypes: ['monster1', 'monster3', 'monster5', 'monster7'], background: 'terrain4', plot: 'This is it, pilot! The final push. Eliminate the remaining resistance and secure Earth\'s future!', bossConfig: { spriteName: 'boss8Sprite', healthMultiplier: 12, speedMultiplier: 0.1, fireRate: 1.1, projectileSpeed: 220, projectileDamage: 30, specialAttack: 'chargeBeam' } },
            {}
        ];

        this.shipConfigs = {
            'ship1': {
                spriteName: 'ship1Sprite',
                cost: 0,
                baseDamage: 1.2, baseFireRate: 0.2, baseProjectileSpeed: 400, baseProjectileWidth: 5, baseProjectileHeight: 10, baseNumProjectiles: 1,
                baseSpeed: 200, baseHealth: 100,
                ability: { name: 'None', description: 'No special ability.', cooldown: 0 },
                upgrades: {
                    damage: { maxLevel: 5, costs: [25, 50, 100, 200, 400], bonuses: [0.6, 0.6, 0.7, 0.7, 0.8] },
                    fireRate: { maxLevel: 4, costs: [30, 60, 120, 250], bonuses: [0.02, 0.02, 0.03, 0.03] },
                    health: { maxLevel: 4, costs: [40, 80, 150, 300], bonuses: [20, 25, 30, 35] },
                    speed: { maxLevel: 3, costs: [35, 70, 140], bonuses: [25, 25, 30] }
                }
            },
            'ship2': {
                spriteName: 'ship2Sprite',
                cost: 150,
                baseDamage: 1.5, baseFireRate: 0.18, baseProjectileSpeed: 420, baseProjectileWidth: 6, baseProjectileHeight: 12, baseNumProjectiles: 1,
                baseSpeed: 220, baseHealth: 110,
                ability: { name: 'Dash', description: 'Become invincible and move faster for 1.5 seconds.', cooldown: 5 },
                upgrades: {
                    damage: { maxLevel: 5, costs: [30, 60, 120, 240, 480], bonuses: [0.7, 0.7, 0.8, 0.8, 1.0] },
                    fireRate: { maxLevel: 4, costs: [35, 70, 140, 280], bonuses: [0.02, 0.02, 0.03, 0.03] },
                    health: { maxLevel: 4, costs: [45, 90, 180, 360], bonuses: [25, 30, 35, 40] },
                    speed: { maxLevel: 3, costs: [40, 80, 160], bonuses: [30, 30, 35] }
                }
            },
            'ship3': {
                spriteName: 'ship3Sprite',
                cost: 300,
                baseDamage: 1.8, baseFireRate: 0.16, baseProjectileSpeed: 450, baseProjectileWidth: 7, baseProjectileHeight: 14, baseNumProjectiles: 2,
                baseSpeed: 240, baseHealth: 120,
                ability: { name: 'EMP Blast', description: 'Stun all on-screen enemies for 2 seconds.', cooldown: 10 },
                upgrades: {
                    damage: { maxLevel: 5, costs: [40, 80, 160, 320, 640], bonuses: [0.8, 0.8, 0.9, 1.0, 1.1] },
                    fireRate: { maxLevel: 4, costs: [45, 90, 180, 360], bonuses: [0.03, 0.03, 0.03, 0.04] },
                    health: { maxLevel: 4, costs: [50, 100, 200, 400], bonuses: [30, 35, 40, 50] },
                    speed: { maxLevel: 3, costs: [45, 90, 180], bonuses: [35, 35, 40] }
                }
            },
            'ship4': {
                spriteName: 'ship4Sprite',
                cost: 600,
                baseDamage: 2.2, baseFireRate: 0.14, baseProjectileSpeed: 480, baseProjectileWidth: 8, baseProjectileHeight: 16, baseNumProjectiles: 2,
                baseSpeed: 260, baseHealth: 130,
                ability: { name: 'Drone Companion', description: 'Spawn a temporary drone that fires alongside you for 5 seconds.', cooldown: 15 },
                upgrades: {
                    damage: { maxLevel: 5, costs: [50, 100, 200, 400, 800], bonuses: [1.0, 1.0, 1.1, 1.2, 1.5] },
                    fireRate: { maxLevel: 4, costs: [55, 110, 220, 440], bonuses: [0.02, 0.03, 0.03, 0.04] },
                    health: { maxLevel: 4, costs: [60, 120, 240, 480], bonuses: [35, 40, 50, 60] },
                    speed: { maxLevel: 3, costs: [55, 110, 220], bonuses: [20, 25, 25] }
                }
            },
            'ship5': {
                spriteName: 'ship5Sprite',
                cost: 1000,
                baseDamage: 2.5, baseFireRate: 0.12, baseProjectileSpeed: 500, baseProjectileWidth: 9, baseProjectileHeight: 18, baseNumProjectiles: 3,
                baseSpeed: 280, baseHealth: 140,
                ability: { name: 'Shield Recharge', description: "Instantly restore 30 of your ship's health.", cooldown: 20 },
                upgrades: {
                    damage: { maxLevel: 5, costs: [60, 120, 240, 480, 960], bonuses: [1.2, 1.2, 1.3, 1.5, 2.0] },
                    fireRate: { maxLevel: 4, costs: [65, 130, 260, 520], bonuses: [0.02, 0.02, 0.03, 0.03] },
                    health: { maxLevel: 4, costs: [70, 140, 280, 560], bonuses: [40, 45, 50, 60] },
                    speed: { maxLevel: 3, costs: [65, 130, 260], bonuses: [20, 20, 25] }
                }
            },
            'ship6': {
                spriteName: 'ship6Sprite',
                cost: 1500,
                baseDamage: 2.8, baseFireRate: 0.10, baseProjectileSpeed: 520, baseProjectileWidth: 10, baseProjectileHeight: 20, baseNumProjectiles: 3,
                baseSpeed: 300, baseHealth: 150,
                ability: { name: 'Time Warp', description: 'Slow down all enemies for 3 seconds.', cooldown: 18 },
                upgrades: {
                    damage: { maxLevel: 5, costs: [70, 140, 280, 560, 1120], bonuses: [1.5, 1.5, 1.6, 1.8, 2.2] },
                    fireRate: { maxLevel: 4, costs: [75, 150, 300, 600], bonuses: [0.03, 0.03, 0.03, 0.04] },
                    health: { maxLevel: 4, costs: [80, 160, 320, 640], bonuses: [45, 50, 60, 70] },
                    speed: { maxLevel: 3, costs: [75, 150, 300], bonuses: [20, 25, 30] }
                }
            },
            'ship7': {
                spriteName: 'ship7Sprite',
                cost: 2200,
                baseDamage: 3.2, baseFireRate: 0.08, baseProjectileSpeed: 550, baseProjectileWidth: 11, baseProjectileHeight: 22, baseNumProjectiles: 4,
                baseSpeed: 320, baseHealth: 160,
                ability: { name: 'Mega Bomb', description: 'Clear all on-screen enemies and deal massive damage.', cooldown: 25 },
                upgrades: {
                    damage: { maxLevel: 5, costs: [80, 160, 320, 640, 1280], bonuses: [2.0, 2.0, 2.2, 2.5, 3.0] },
                    fireRate: { maxLevel: 4, costs: [85, 170, 340, 680], bonuses: [0.04, 0.04, 0.04, 0.05] },
                    health: { maxLevel: 4, costs: [90, 180, 360, 720], bonuses: [50, 60, 70, 80] },
                    speed: { maxLevel: 3, costs: [85, 170, 340], bonuses: [20, 25, 30] }
                }
            }
        };

        this.currentShipType = 'ship1';
        this.ownedShips = ['ship1'];
        this.currentShipStats = {};
        this.shipAbilityCooldowns = {};
        this.activeShipAbilities = {};
        
        this.shipUpgrades = {
            'ship1': { damage: 0, fireRate: 0, health: 0, speed: 0 }
        };
        
        // NEW: Object to store the current health of each owned ship.
        this.shipHealths = {};

        this.boss = null;
        this.isBossPhase = false;
        
        this.shop = new Shop(this);

        // Achievement System
        this.achievementManager = new AchievementManager(this);
        this.achievementIndicatorsDiv = document.getElementById('achievementIndicators');

        this.mainMenuDiv = document.getElementById('mainMenu');
        this.loadingTextDiv = document.getElementById('loadingText');
        this.assetProgressSpan = document.getElementById('assetProgress');
        
        this.startGameBtn = document.getElementById('startGameBtn');
        this.continueGameBtn = document.getElementById('continueGameBtn');
        this.optionsBtn = document.getElementById('optionsBtn');
        this.creditsBtn = document.getElementById('creditsBtn');
        
        this.optionsMenuDiv = document.getElementById('optionsMenu');
        this.difficultySelect = document.getElementById('difficultySelect');
        this.toggleSoundBtn = document.getElementById('toggleSoundBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.toggleFullscreenBtn = document.getElementById('toggleFullscreenBtn');
        this.backToMainBtn = document.getElementById('backToMainBtn');

        this.pauseMenuDiv = document.getElementById('pauseMenu');
        this.resumeGameBtn = document.getElementById('resumeGameBtn');
        this.pauseToMainBtn = document.getElementById('pauseToMainBtn');

        this.creditsScreenDiv = document.getElementById('creditsScreen');
        this.backToMainFromCreditsBtn = document.getElementById('backToMainFromCreditsBtn');
        
        this.shopHangarDiv = document.getElementById('shopHangar');
        this.closeShipyardBtn = document.getElementById('closeShipyardBtn');
        this.closeUpgradeBtn = document.getElementById('closeUpgradeBtn');
        this.closeRepairBtn = document.getElementById('closeRepairBtn'); // NEW

        this.levelMapScreenDiv = document.getElementById('levelMapScreen');
        this.levelButtonsContainer = document.getElementById('levelButtonsContainer');
        this.levelPlotDisplay = document.getElementById('levelPlotDisplay');
        this.levelMapBackToMainBtn = document.getElementById('levelMapBackToMainBtn');
        this.backToLevelMapBtn = document.getElementById('backToLevelMapBtn');
        this.backToShopBtn = document.getElementById('backToShopBtn');


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
        this.isAudioUnlocked = false;

        this.sounds = {};
        this.soundPools = {};
        this.soundPoolSize = 10;

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
        
        this.powerUpIndicatorsDiv = document.getElementById('powerUpIndicators');
        
        if (this.commanderNextBtn) {
            this.commanderNextBtn.addEventListener('click', () => this.advanceTutorial());
        }

        this.holdingBombPowerUp = false;
        this.bombPlacement = { x: 0, y: 0, radius: 250 };

        this.init();

        this.achievementsMenuDiv = document.getElementById('achievementsMenu');
        this.achievementsListDiv = document.getElementById('achievementsList');
        this.achievementsBtn = document.getElementById('achievementsBtn');
        this.backToMainFromAchievementsBtn = document.getElementById('backToMainFromAchievementsBtn');

        if (this.achievementsBtn) this.achievementsBtn.addEventListener('click', () => this.showMenu('ACHIEVEMENTS'));
        if (this.backToMainFromAchievementsBtn) this.backToMainFromAchievementsBtn.addEventListener('click', () => this.showMenu(GAME_STATES.MAIN_MENU));

        this.playerStatsDiv = document.getElementById('playerStats');
        this.achievementsStatsToggle = document.getElementById('achievementsStatsToggle');
        this.showAchievementsBtn = document.getElementById('showAchievementsBtn');
        this.showStatsBtn = document.getElementById('showStatsBtn');

        if (this.showAchievementsBtn) this.showAchievementsBtn.addEventListener('click', () => this.switchAchievementsStats('achievements'));
        if (this.showStatsBtn) this.showStatsBtn.addEventListener('click', () => this.switchAchievementsStats('stats'));

        this.achievementFilter = 'all';
        this.achievementFilterBtns = {};
        this.achievementFilterBtns = {
            all: document.getElementById('filterAllAchievementsBtn'),
            unlocked: document.getElementById('filterUnlockedAchievementsBtn'),
            locked: document.getElementById('filterLockedAchievementsBtn')
        };
        Object.entries(this.achievementFilterBtns).forEach(([key, btn]) => {
            if (btn) btn.addEventListener('click', () => this.setAchievementFilter(key));
        });

        this.currentDifficultyLabel = document.getElementById('currentDifficultyLabel');

        this.updateDifficultyLabel = function() {
            if (this.currentDifficultyLabel) {
                let label = '';
                switch (this.currentDifficulty) {
                    case 'easy': label = 'Easy'; break;
                    case 'normal': label = 'Normal'; break;
                    case 'hard': label = 'Hard'; break;
                }
                this.currentDifficultyLabel.textContent = `Current: ${label}`;
            }
            if (this.difficultySelect) {
                this.difficultySelect.value = this.currentDifficulty;
            }
        }.bind(this);
    }

    playSound(soundName) {
        if (!this.soundEnabled || !this.isAudioUnlocked) return;

        if (this.soundPools[soundName]) {
            const pool = this.soundPools[soundName];
            const audio = pool.audios[pool.currentIndex];
            audio.currentTime = 0;
            audio.play().catch(e => console.error(`Error playing pooled sound ${soundName}:`, e));
            pool.currentIndex = (pool.currentIndex + 1) % pool.audios.length;
        } else if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(e => console.error(`Error playing sound ${soundName}:`, e));
        }
    }

    init() {
        const unlockAudio = () => {
            if (this.isAudioUnlocked) return;
            this.isAudioUnlocked = true;
            for (const soundName in this.sounds) {
                if (this.sounds[soundName]) {
                    this.sounds[soundName].play().then(() => this.sounds[soundName].pause()).catch(() => {});
                }
            }
            for (const soundName in this.soundPools) {
                this.soundPools[soundName].audios.forEach(audio => {
                    audio.play().then(() => audio.pause()).catch(() => {});
                });
            }
            if(this.bgMusic) {
                this.bgMusic.play().then(() => this.bgMusic.pause()).catch(() => {});
            }
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('keydown', unlockAudio, { once: true });

        if (this.canvas) {
            this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
            this.canvas.addEventListener('mousemove', (e) => {
                if (this.holdingBombPowerUp) {
                    const rect = this.canvas.getBoundingClientRect();
                    this.bombPlacement.x = e.clientX - rect.left;
                    this.bombPlacement.y = e.clientY - rect.top;
                }
            });
        }
        
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));

        document.querySelectorAll('.menu-button, .pixel-shooter-btn').forEach(button => {
            button.addEventListener('click', () => this.playSound('menuClick'));
            button.addEventListener('mouseenter', () => this.playSound('menuHover'));
        });

        if (this.startGameBtn) this.startGameBtn.addEventListener('click', () => { this.showMenu(GAME_STATES.LEVEL_MAP); this.playSound('menuConfirm'); });
        
        if (this.continueGameBtn) this.continueGameBtn.addEventListener('click', () => {
            this.continueGame();
            this.playSound('menuConfirm');
        });
        
        if (this.optionsBtn) this.optionsBtn.addEventListener('click', () => this.showMenu(GAME_STATES.OPTIONS));
        if (this.creditsBtn) this.creditsBtn.addEventListener('click', () => this.showMenu(GAME_STATES.CREDITS));
        
        if (this.difficultySelect) this.difficultySelect.addEventListener('change', (e) => this.setDifficulty(e.target.value));

        if (this.toggleSoundBtn) this.toggleSoundBtn.addEventListener('click', () => this.toggleSound());
        if (this.volumeSlider) this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        if (this.toggleFullscreenBtn) this.toggleFullscreenBtn.addEventListener('click', () => this.toggleFullScreen());
        if (this.backToMainBtn) this.backToMainBtn.addEventListener('click', () => this.returnToMainMenu());
        if (this.backToMainFromCreditsBtn) this.backToMainFromCreditsBtn.addEventListener('click', () => this.returnToMainMenu());
        
        if (this.resumeGameBtn) this.resumeGameBtn.addEventListener('click', () => this.togglePause());
        if (this.pauseToMainBtn) this.pauseToMainBtn.addEventListener('click', () => this.returnToMainMenu());

        if (this.closeShipyardBtn) this.closeShipyardBtn.addEventListener('click', () => this.shop.closeMenu());
        if (this.closeUpgradeBtn) this.closeUpgradeBtn.addEventListener('click', () => this.shop.closeMenu());
        if (this.closeRepairBtn) this.closeRepairBtn.addEventListener('click', () => this.shop.closeMenu()); // NEW

        // NEW: Event listeners for repair buttons
        const repairShipBtn = document.getElementById('repairShipBtn');
        if (repairShipBtn) repairShipBtn.addEventListener('click', () => this.handleShopAction('repairShip'));
        const repairBaseBtn = document.getElementById('repairBaseBtn');
        if (repairBaseBtn) repairBaseBtn.addEventListener('click', () => this.handleShopAction('repairBase'));
        
        if (this.gameOverBackToMainBtn) this.gameOverBackToMainBtn.addEventListener('click', () => this.returnToMainMenu(true));
        if (this.victoryBackToMainBtn) this.victoryBackToMainBtn.addEventListener('click', () => this.returnToMainMenu(true));

        if (this.levelMapBackToMainBtn) this.levelMapBackToMainBtn.addEventListener('click', () => this.returnToMainMenu());
        if (this.backToLevelMapBtn) this.backToLevelMapBtn.addEventListener('click', () => this.showMenu(GAME_STATES.LEVEL_MAP));
        if (this.backToShopBtn) this.backToShopBtn.addEventListener('click', () => this.showMenu(GAME_STATES.SHOP));

        window.addEventListener('keydown', (e) => {
            if (this.holdingBombPowerUp && (e.key === ' ' || e.key === 'Enter')) {
                this.placeBomb();
            }
        });

        this.initializeAchievements();
        this.loadAssets();
        this.updateShipStats();
        this.updateDifficultyLabel();
    }

    loadAssets() {
        this.assetLoader.loadImage('playerSprite', 'assets/images/sprites/player_sprite.png');
        this.assetLoader.loadImage('baseSprite', 'assets/images/Base.png');
        
        this.assetLoader.loadImage('captain_sprite', 'assets/images/sprites/captain_sprite.png');
        this.assetLoader.loadImage('shop_background', 'assets/images/backgrounds/shop_background.png');
        this.assetLoader.loadImage('shipyard_console', 'assets/images/sprites/shipyard_console.png');
        this.assetLoader.loadImage('upgrade_terminal', 'assets/images/sprites/upgrade_terminal.png');
        this.assetLoader.loadImage('starmap_table', 'assets/images/sprites/starmap_table.png');
        this.assetLoader.loadImage('repair_bay_console', 'assets/images/sprites/repair_bay_console.png'); // NEW

        // Achievement Icons
        this.assetLoader.loadImage('ach_first_kill', 'assets/images/achievements/ach_first_kill.png');
        this.assetLoader.loadImage('ach_money', 'assets/images/achievements/ach_money.png');
        this.assetLoader.loadImage('ach_collector', 'assets/images/achievements/ach_collector.png');
        this.assetLoader.loadImage('ach_level_up', 'assets/images/achievements/ach_level_up.png');
        this.assetLoader.loadImage('ach_boss_slayer', 'assets/images/achievements/ach_boss_slayer.png');
        this.assetLoader.loadImage('ach_trigger_happy', 'assets/images/achievements/ach_trigger_happy.png');
        this.assetLoader.loadImage('ach_power_up', 'assets/images/achievements/ach_power_up.png');
        this.assetLoader.loadImage('ach_shopaholic', 'assets/images/achievements/ach_shopaholic.png');
        this.assetLoader.loadImage('ach_survivor', 'assets/images/achievements/ach_survivor.png');
        this.assetLoader.loadImage('ach_destroyer', 'assets/images/achievements/ach_destroyer.png');

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
        this.assetLoader.loadImage('slowEnemiesPowerUpSprite', 'assets/images/powerups/powerup_slow.png');
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
        this.assetLoader.loadAudio('menuHover', 'assets/audio/Menu-Selection-Change-B.mp3');
        this.assetLoader.loadAudio('menuClick', 'assets/audio/Menu-Selection-Change-A.mp3');
        this.assetLoader.loadAudio('menuConfirm', 'assets/audio/Sci-Fi-Interface-Select.mp3');
        this.assetLoader.loadAudio('gameOverSound', 'assets/audio/Retro-Game-Over-2.mp3');
        this.assetLoader.loadAudio('victorySound', 'assets/audio/Video-Game-Win-Level-2.mp3');
        this.assetLoader.loadAudio('achievementSound', 'assets/audio/achievement.mp3');


        this.assetLoader.onComplete = () => {
            console.log('All assets loaded!');
            const randomIndex = Math.floor(Math.random() * this.terrainSpriteNames.length);
            this.currentBackgroundSpriteName = this.terrainSpriteNames[randomIndex];
            
            this.bgMusic = this.assetLoader.getAsset('bgMusic');
            if (this.bgMusic) {
                this.bgMusic.loop = true;
                this.bgMusic.volume = this.gameVolume;
            }

            const soundNames = ['shotSound', 'powerUpSound', 'baseHitSound', 'abilitySound', 'menuHover', 'menuClick', 'menuConfirm', 'gameOverSound', 'victorySound', 'achievementSound'];
            soundNames.forEach(name => {
                this.sounds[name] = this.assetLoader.getAsset(name);
                if (this.sounds[name]) this.sounds[name].volume = this.gameVolume;
            });

            this.soundPools['explosionSound'] = { audios: [], currentIndex: 0 };
            const explosionAsset = this.assetLoader.getAsset('explosionSound');
            if (explosionAsset) {
                for (let i = 0; i < this.soundPoolSize; i++) {
                    const audio = explosionAsset.cloneNode();
                    audio.volume = this.gameVolume;
                    this.soundPools['explosionSound'].audios.push(audio);
                }
            }
            
            if (this.toggleSoundBtn) this.toggleSoundBtn.textContent = `TOGGLE SOUND (${this.soundEnabled ? 'ON' : 'OFF'})`;
            if (this.volumeSlider) this.volumeSlider.value = this.gameVolume * 100;
            this.showMenu(GAME_STATES.MAIN_MENU);
            this.loadGame();
            this.updateMainMenuButtons();
            this.gameLoop(0);
        };

        const originalCheckCompletion = this.assetLoader.checkCompletion.bind(this.assetLoader);
        this.assetLoader.checkCompletion = () => {
            if (this.assetProgressSpan) this.assetProgressSpan.textContent = `${this.assetLoader.loadedAssets} / ${this.assetLoader.totalAssets}`;
            originalCheckCompletion();
        };
        if (this.assetProgressSpan) this.assetProgressSpan.textContent = `${this.assetLoader.loadedAssets} / ${this.assetLoader.totalAssets}`;
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
        this.playSound('menuClick');
        this.startGame(levelIndex);
    }

    startGame(levelIndex) {
        this.currentLevel = levelIndex;
        this.initializeLevel();
        this.initializeBase();
        this.initializePlayer();
        this.isBossPhase = false; 
        this.boss = null;
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
            this.showMenu(GAME_STATES.LEVEL_MAP);
        }
    }

    saveGame() {
        const gameState = {
            score: this.score,
            money: this.money,
            experience: this.experience,
            baseHealth: this.base.health,
            currentLevel: this.currentLevel,
            completedLevels: this.completedLevels,
            currentShipType: this.currentShipType,
            ownedShips: this.ownedShips,
            shipUpgrades: this.shipUpgrades,
            shipHealths: this.shipHealths, // SAVE individual ship health
            soundEnabled: this.soundEnabled,
            gameVolume: this.gameVolume,
            currentDifficulty: this.currentDifficulty,
            unlockedAchievementIds: Array.from(this.achievementManager.unlockedIds)
        };
        try {
            localStorage.setItem('spaceInvadersGameState', JSON.stringify(gameState));
            console.log("Game saved!");
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
                this.base.health = gameState.baseHealth || this.base.maxHealth;
                this.currentLevel = gameState.currentLevel || 1;
                this.completedLevels = gameState.completedLevels || [];
                this.currentDifficulty = gameState.currentDifficulty || 'normal';
                this.soundEnabled = gameState.soundEnabled !== undefined ? gameState.soundEnabled : true;
                this.gameVolume = gameState.gameVolume !== undefined ? gameState.gameVolume : 0.5;
                this.currentShipType = gameState.currentShipType || 'ship1';
                this.ownedShips = gameState.ownedShips || ['ship1'];
                this.shipUpgrades = gameState.shipUpgrades || { 'ship1': { damage: 0, fireRate: 0, health: 0, speed: 0 } };
                this.shipHealths = gameState.shipHealths || {}; // LOAD individual ship health

                // Ensure all owned ships have a health value.
                this.ownedShips.forEach(shipId => {
                    if (this.shipHealths[shipId] === undefined) {
                        this.shipHealths[shipId] = this.calculateMaxHealth(shipId);
                    }
                });
                
                if (gameState.unlockedAchievementIds) {
                    this.achievementManager.loadUnlocked(new Set(gameState.unlockedAchievementIds));
                }

                this.updateShipStats();
                // Set player health from the loaded persistent data
                this.playerHealth = this.shipHealths[this.currentShipType] || this.currentShipStats.health;

                this.updateDifficultyLabel();

                if (this.toggleSoundBtn) this.toggleSoundBtn.textContent = `TOGGLE SOUND (${this.soundEnabled ? 'ON' : 'OFF'})`;
                if (this.volumeSlider) this.volumeSlider.value = this.gameVolume * 100;
                this.setVolume(this.gameVolume, true);
                
                const maxCompletedLevel = this.completedLevels.length > 0 ? Math.max(...this.completedLevels) : 0;
                this.currentLevel = Math.min(maxCompletedLevel + 1, this.levels.length - 1);
                if (this.currentLevel === 0) this.currentLevel = 1;

                console.log("Game loaded!");
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
        if (this.continueGameBtn) {
            this.continueGameBtn.style.display = savedGameExists ? 'block' : 'none';
        }
    }

    calculateMaxHealth(shipType) {
        const config = this.shipConfigs[shipType];
        const upgrades = this.shipUpgrades[shipType] || { health: 0 };
        if (!config) return 100;

        let health = config.baseHealth;
        if (upgrades.health > 0) {
            health += config.upgrades.health.bonuses.slice(0, upgrades.health).reduce((sum, val) => sum + val, 0);
        }
        return health;
    }

    updateShipStats() {
        const config = this.shipConfigs[this.currentShipType];
        const upgrades = this.shipUpgrades[this.currentShipType];

        if (!config || !upgrades) {
            console.error(`Configuration or upgrades for ${this.currentShipType} not found.`);
            return;
        }

        let damage = config.baseDamage;
        let fireRate = config.baseFireRate;
        let projectileSpeed = config.baseProjectileSpeed;
        let speed = config.baseSpeed;
        let health = this.calculateMaxHealth(this.currentShipType);
        let numProjectiles = config.baseNumProjectiles;

        if (upgrades.damage > 0) {
            damage += config.upgrades.damage.bonuses.slice(0, upgrades.damage).reduce((sum, val) => sum + val, 0);
        }
        if (upgrades.fireRate > 0) {
            fireRate -= config.upgrades.fireRate.bonuses.slice(0, upgrades.fireRate).reduce((sum, val) => sum + val, 0);
        }
        if (upgrades.speed > 0) {
            speed += config.upgrades.speed.bonuses.slice(0, upgrades.speed).reduce((sum, val) => sum + val, 0);
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

        // Health is now persistent, so we don't reset it here.
        // It's loaded in loadGame or set when equipping a ship.
        if (this.player) {
            this.player.speed = this.currentShipStats.speed;
        }
    }
    
    updateShopPreview(shipType) {
        const shipToDisplay = shipType || this.currentShipType;
        const config = this.shipConfigs[shipToDisplay];
        if (!config) return;

        const previewImage = document.getElementById('shipPreviewImage');
        const previewName = document.getElementById('shipPreviewName');
        const previewStats = document.getElementById('shipPreviewStats');
        const previewAbility = document.getElementById('shipPreviewAbility');
        
        const shipSprite = this.assetLoader.getAsset(config.spriteName);
        if(previewImage && shipSprite) previewImage.src = shipSprite.src;
        if(previewName) previewName.textContent = shipToDisplay.replace('ship', 'Ship ');
        if(previewStats) {
            const maxHealth = this.calculateMaxHealth(shipToDisplay);
            previewStats.innerHTML = `
                <li>Damage: ${config.baseDamage.toFixed(1)}</li>
                <li>Fire Rate: ${(1/config.baseFireRate).toFixed(1)}/s</li>
                <li>Projectiles: ${config.baseNumProjectiles}</li>
                <li>Health: ${maxHealth}</li>
                <li>Speed: ${config.baseSpeed}</li>
            `;
        }
        if(previewAbility) previewAbility.innerHTML = `<strong>${config.ability.name}:</strong> ${config.ability.description}`;
    }

    renderShopMenus() {
        const currentMoneyDisplayShipyard = document.getElementById('currentMoneyDisplayShipyard');
        const currentExperienceDisplayShipyard = document.getElementById('currentExperienceDisplayShipyard');
        const currentMoneyDisplayUpgrade = document.getElementById('currentMoneyDisplayUpgrade');
        const upgradeShipName = document.getElementById('upgradeShipName');
        
        if (currentMoneyDisplayShipyard) currentMoneyDisplayShipyard.textContent = this.money;
        if (currentExperienceDisplayShipyard) currentExperienceDisplayShipyard.textContent = this.experience;
        if (currentMoneyDisplayUpgrade) currentMoneyDisplayUpgrade.textContent = this.money;
        if (upgradeShipName) upgradeShipName.textContent = this.currentShipType.replace('ship', 'Ship ');

        // Shipyard Menu
        const shipPurchaseColumn = document.getElementById('shipPurchaseColumn');
        if (shipPurchaseColumn) {
            shipPurchaseColumn.innerHTML = '';
            Object.keys(this.shipConfigs).forEach(shipType => {
                const shipConfig = this.shipConfigs[shipType];
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
                    button.textContent = `Buy ${shipType.replace('ship', 'Ship ')} - ${shipConfig.cost} EXP`;
                    button.disabled = this.experience < shipConfig.cost;
                    button.addEventListener('click', () => this.handleShopAction('buyShip', shipType));
                }
                button.addEventListener('mouseenter', () => this.updateShopPreview(shipType));
                button.addEventListener('mouseleave', () => this.updateShopPreview(this.currentShipType));
                shipPurchaseColumn.appendChild(button);
            });
        }

        // Upgrade Menu
        const shipUpgradeColumn = document.getElementById('shipUpgradeColumn');
        if (shipUpgradeColumn) {
            shipUpgradeColumn.innerHTML = '';
            const currentShipConfig = this.shipConfigs[this.currentShipType];
            const currentUpgrades = this.shipUpgrades[this.currentShipType];
            if (currentShipConfig && currentShipConfig.upgrades && currentUpgrades) {
                for (const upgradeType in currentShipConfig.upgrades) {
                    const upgradeInfo = currentShipConfig.upgrades[upgradeType];
                    const currentLevel = currentUpgrades[upgradeType];
                    const upgradeButton = document.createElement('button');
                    upgradeButton.classList.add('menu-button', 'upgrade-button');
                    
                    const statPreviewSpan = document.createElement('span');
                    statPreviewSpan.className = 'stat-preview';

                    let baseText = `Upgrade ${upgradeType} (${currentLevel}/${upgradeInfo.maxLevel})`;
                    if (currentLevel < upgradeInfo.maxLevel) {
                        const cost = upgradeInfo.costs[currentLevel];
                        upgradeButton.textContent = `${baseText} - ${cost} M`;
                        upgradeButton.disabled = this.money < cost;
                        upgradeButton.addEventListener('click', () => this.handleShopAction('upgradeShip', upgradeType));
                        
                        upgradeButton.addEventListener('mouseenter', () => {
                            const bonus = upgradeInfo.bonuses[currentLevel];
                            let previewText = '';
                            if(upgradeType === 'fireRate') {
                                const currentFR = (1 / this.currentShipStats.fireRate).toFixed(1);
                                const nextFR = (1 / (this.currentShipStats.fireRate - bonus)).toFixed(1);
                                previewText = `(${currentFR}/s -> ${nextFR}/s)`;
                            } else {
                                let currentStat = 0;
                                if (upgradeType === 'damage') currentStat = this.currentShipStats.damage;
                                if (upgradeType === 'health') currentStat = this.currentShipStats.health;
                                if (upgradeType === 'speed') currentStat = this.currentShipStats.speed;
                                previewText = `(${currentStat.toFixed(1)} -> ${(currentStat + bonus).toFixed(1)})`;
                            }
                            statPreviewSpan.textContent = previewText;
                        });
                        upgradeButton.addEventListener('mouseleave', () => {
                            statPreviewSpan.textContent = '';
                        });

                    } else {
                        upgradeButton.textContent = `${baseText} (MAX)`;
                        upgradeButton.disabled = true;
                    }
                    upgradeButton.appendChild(statPreviewSpan);
                    shipUpgradeColumn.appendChild(upgradeButton);
                }
            }
        }

        // NEW: Repair Menu
        const repairMenu = document.getElementById('repairMenu');
        if (repairMenu) {
            const moneyDisplay = document.getElementById('currentMoneyDisplayRepair');
            if (moneyDisplay) moneyDisplay.textContent = this.money;

            const repairShipBtn = document.getElementById('repairShipBtn');
            const repairShipInfo = document.getElementById('repairShipInfo');
            if (repairShipBtn && repairShipInfo) {
                const shipMaxHealth = this.calculateMaxHealth(this.currentShipType);
                const healthToRestore = Math.max(0, shipMaxHealth - this.playerHealth);
                const cost = Math.ceil(healthToRestore) * 2;
                
                repairShipInfo.innerHTML = `Ship: ${this.playerHealth.toFixed(0)} / ${shipMaxHealth} HP`;
                if (healthToRestore <= 0) {
                    repairShipBtn.textContent = 'Ship at Full Health';
                    repairShipBtn.disabled = true;
                } else {
                    repairShipBtn.textContent = `Repair Ship - ${cost} M`;
                    repairShipBtn.disabled = this.money < cost;
                }
            }

            const repairBaseBtn = document.getElementById('repairBaseBtn');
            const repairBaseInfo = document.getElementById('repairBaseInfo');
            if (repairBaseBtn && repairBaseInfo) {
                const baseHealthToRestore = this.base.maxHealth - this.base.health;
                const cost = Math.ceil(baseHealthToRestore) * 2;

                repairBaseInfo.innerHTML = `Base: ${this.base.health.toFixed(0)} / ${this.base.maxHealth} HP`;
                if (baseHealthToRestore <= 0) {
                    repairBaseBtn.textContent = 'Base at Full Health';
                    repairBaseBtn.disabled = true;
                } else {
                    repairBaseBtn.textContent = `Repair Base - ${cost} M`;
                    repairBaseBtn.disabled = this.money < cost;
                }
            }
        }
    }


    handleShopAction(actionType, type = null) {
        this.playSound('menuClick');
        let purchased = false, equipped = false, upgraded = false, repaired = false;

        switch (actionType) {
            case 'buyShip':
                const configToBuy = this.shipConfigs[type];
                if (configToBuy && !this.ownedShips.includes(type) && Number(this.experience) >= Number(configToBuy.cost)) {
                    this.experience -= configToBuy.cost;
                    this.ownedShips.push(type);
                    this.shipUpgrades[type] = { damage: 0, fireRate: 0, health: 0, speed: 0 };
                    
                    // NEW: Set new ship to full health
                    const newShipMaxHealth = this.calculateMaxHealth(type);
                    this.shipHealths[type] = newShipMaxHealth;
                    
                    this.currentShipType = type;
                    purchased = true;
                    equipped = true;
                    this.playSound('menuConfirm');
                }
                break;
            case 'equipShip':
                if (this.ownedShips.includes(type) && this.currentShipType !== type) {
                    this.currentShipType = type;
                    equipped = true;
                    this.playSound('menuConfirm');
                    
                    // NEW: Load the health of the equipped ship
                    this.updateShipStats(); // Update stats first
                    this.playerHealth = this.shipHealths[this.currentShipType];
                }
                break;
            case 'upgradeShip':
                const currentShipConfig = this.shipConfigs[this.currentShipType];
                const currentUpgrades = this.shipUpgrades[this.currentShipType];
                const upgradeType = type;
                const currentLevel = currentUpgrades[upgradeType];
                const upgradeInfo = currentShipConfig.upgrades[upgradeType];

                if (currentLevel < upgradeInfo.maxLevel) {
                    const cost = upgradeInfo.costs[currentLevel];
                    if (this.money >= cost) {
                        this.money -= cost;
                        currentUpgrades[upgradeType]++;
                        upgraded = true;
                        // If upgrading health, add the bonus health to current and max health
                        if (upgradeType === 'health') {
                            const bonus = upgradeInfo.bonuses[currentLevel];
                            const newMaxHealth = this.calculateMaxHealth(this.currentShipType);
                            this.playerHealth += bonus;
                            this.shipHealths[this.currentShipType] = this.playerHealth;
                        }
                        this.playSound('menuConfirm');
                    }
                }
                break;
            case 'repairShip':
                const shipMaxHealth = this.calculateMaxHealth(this.currentShipType);
                const shipHealthToRestore = shipMaxHealth - this.playerHealth;
                if (shipHealthToRestore > 0) {
                    const cost = Math.ceil(shipHealthToRestore) * 2;
                    if (this.money >= cost) {
                        this.money -= cost;
                        this.playerHealth = shipMaxHealth;
                        this.shipHealths[this.currentShipType] = this.playerHealth;
                        repaired = true;
                        this.playSound('menuConfirm');
                    }
                }
                break;
            case 'repairBase':
                const baseHealthToRestore = this.base.maxHealth - this.base.health;
                if (baseHealthToRestore > 0) {
                    const cost = Math.ceil(baseHealthToRestore) * 2;
                    if (this.money >= cost) {
                        this.money -= cost;
                        this.base.health = this.base.maxHealth;
                        repaired = true;
                        this.playSound('menuConfirm');
                    }
                }
                break;
        }

        if (purchased || equipped || upgraded || repaired) {
            this.updateShipStats();
            this.renderShopMenus();
            this.updateShopPreview(this.currentShipType);
            this.saveGame();
        }
    }

    showMenu(menuState) {
        if (this.mainMenuDiv) this.mainMenuDiv.style.display = 'none';
        if (this.optionsMenuDiv) this.optionsMenuDiv.style.display = 'none';
        if (this.creditsScreenDiv) this.creditsScreenDiv.style.display = 'none';
        if (this.shopHangarDiv) this.shopHangarDiv.style.display = 'none';
        if (this.gameOverScreenDiv) this.gameOverScreenDiv.style.display = 'none';
        if (this.victoryScreenDiv) this.victoryScreenDiv.style.display = 'none';
        if (this.loadingTextDiv) this.loadingTextDiv.style.display = 'none';
        if (this.difficultySelectionDiv) this.difficultySelectionDiv.style.display = 'none';
        if (this.startGameBtn) this.startGameBtn.style.display = 'block';
        if (this.levelMapScreenDiv) this.levelMapScreenDiv.style.display = 'none';
        if (this.achievementsMenuDiv) this.achievementsMenuDiv.style.display = 'none';
        if (this.pauseMenuDiv) this.pauseMenuDiv.style.display = 'none';

        this.currentState = menuState;
        this.selectedMenuButtonIndex = 0;

        switch (menuState) {
            case GAME_STATES.MAIN_MENU:
                if (this.mainMenuDiv) this.mainMenuDiv.style.display = 'block';
                this.updateMainMenuButtons();
                this.currentMenuButtons = [
                    this.startGameBtn,
                    this.continueGameBtn, this.achievementsBtn, this.optionsBtn, this.creditsBtn
                ].filter(btn => btn && btn.style.display !== 'none');
                break;
            case GAME_STATES.OPTIONS:
                if (this.optionsMenuDiv) this.optionsMenuDiv.style.display = 'block';
                this.currentMenuButtons = [this.difficultySelect, this.toggleSoundBtn, this.volumeSlider, this.toggleFullscreenBtn, this.backToMainBtn].filter(Boolean);
                this.updateDifficultyLabel();
                break;
            case GAME_STATES.CREDITS:
                if (this.creditsScreenDiv) this.creditsScreenDiv.style.display = 'block';
                this.currentMenuButtons = [this.backToMainFromCreditsBtn].filter(Boolean);
                break;
            case GAME_STATES.SHOP:
                if (this.shopHangarDiv) this.shopHangarDiv.style.display = 'block';
                this.currentMenuButtons = [];
                break;
            case GAME_STATES.LEVEL_MAP:
                if (this.levelMapScreenDiv) this.levelMapScreenDiv.style.display = 'block';
                this.populateLevelMap();
                this.currentMenuButtons = Array.from(this.levelButtonsContainer.querySelectorAll('.level-button:not(:disabled)'));
                if (this.currentLevel > 1 && this.backToShopBtn) {
                    this.currentMenuButtons.push(this.backToShopBtn);
                }
                if (this.levelMapBackToMainBtn) this.currentMenuButtons.push(this.levelMapBackToMainBtn);
                this.displayLevelPlot(this.currentLevel);
                break;
            case GAME_STATES.GAME_OVER:
                if (this.gameOverScreenDiv) this.gameOverScreenDiv.style.display = 'block';
                if (this.gameOverScoreSpan) this.gameOverScoreSpan.textContent = this.score;
                if (this.gameOverBaseHealthSpan) this.gameOverBaseHealthSpan.textContent = this.base.health;
                this.currentMenuButtons = [this.gameOverBackToMainBtn].filter(Boolean);
                this.playSound('gameOverSound');
                let losses = parseInt(localStorage.getItem('spaceInvadersLosses') || '0', 10);
                losses++;
                localStorage.setItem('spaceInvadersLosses', losses);
                break;
            case GAME_STATES.VICTORY:
                if (this.victoryScreenDiv) this.victoryScreenDiv.style.display = 'block';
                if (this.victoryScoreSpan) this.victoryScoreSpan.textContent = this.score;
                this.currentMenuButtons = [this.victoryBackToMainBtn].filter(Boolean);
                this.playSound('victorySound');
                break;
            case GAME_STATES.LOADING:
                if (this.loadingTextDiv) this.loadingTextDiv.style.display = 'block';
                this.currentMenuButtons = [];
                break;
            case 'ACHIEVEMENTS':
                if (this.achievementsMenuDiv) this.achievementsMenuDiv.style.display = 'block';
                this.switchAchievementsStats('achievements');
                this.currentMenuButtons = [this.backToMainFromAchievementsBtn].filter(Boolean);
                break;
            case GAME_STATES.PAUSED:
                if (this.pauseMenuDiv) this.pauseMenuDiv.style.display = 'block';
                this.currentMenuButtons = [this.resumeGameBtn, this.pauseToMainBtn].filter(Boolean);
                break;
            default:
                this.currentMenuButtons = [];
                break;
        }
        this.updateSelectedMenuButton();
    }
    
    updateSelectedMenuButton() {
        document.querySelectorAll('.menu-button, .level-button, .pixel-shooter-btn').forEach(btn => btn.classList.remove('selected'));
        if (this.volumeSlider) this.volumeSlider.classList.remove('selected');
        if (this.difficultySelect) this.difficultySelect.classList.remove('selected');

        if (this.currentMenuButtons.length > 0 && this.currentMenuButtons[this.selectedMenuButtonIndex]) {
            this.currentMenuButtons[this.selectedMenuButtonIndex].classList.add('selected');
            this.playSound('menuHover');
        }
    }
    
    update(deltaTime) {
        if (this.currentState === GAME_STATES.SHOP || this.currentState === GAME_STATES.PAUSED) return;

        const unlockedAchievements = this.achievementManager.checkAll();
        if (unlockedAchievements.length > 0) {
            unlockedAchievements.forEach(ach => this.displayAchievementNotification(ach));
            this.saveGame();
        }

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
            const enemyActions = enemy.update(deltaTime, this.canvas, this.player, this.projectiles, this);
            
            if (enemyActions.newProjectiles.length > 0) this.enemyProjectiles.push(...enemyActions.newProjectiles);
            if (enemyActions.newEnemies.length > 0) {
                enemyActions.newEnemies.forEach(newEnemy => {
                    if (this.enemies.length < this.maxEnemiesOnScreen) this.enemies.push(newEnemy);
                });
            }

            if (!enemy.active) {
                this.enemies.splice(i, 1);
                continue;
            }
            if (checkCollision(enemy, this.base)) {
                enemy.active = false;
                this.base.health -= 10;
                this.playSound('baseHitSound');
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
                        this.enemiesDefeated++;
                        const difficulty = this.difficultySettings[this.currentDifficulty];
                        this.score += Math.round(10 * difficulty.scoreRate);
                        this.money += Math.round(5 * difficulty.moneyRate);
                        this.experience += Math.round(10 * difficulty.expRate);
                        if (Math.random() < 0.3) this.spawnPowerUp(enemy);
                        this.explosions.push(new Explosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, this.assetLoader.getAsset('explosionSprite')));
                        this.playSound('explosionSound');
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
                    this.playSound('explosionSound');
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
                this.shipHealths[this.currentShipType] = this.playerHealth; // Sync health
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
                    if (projectile.isChargeBeam && projectile.chargePhase !== 'firing') continue; 
                    projectile.active = false;
                    this.playerHealth -= projectile.damage;
                    this.shipHealths[this.currentShipType] = this.playerHealth; // Sync health
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
                    this.shipHealths[this.currentShipType] = this.playerHealth; // Sync health
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
                    if (powerUp.type === 'bomb' && !this.holdingBombPowerUp) {
                        powerUp.active = false;
                        this.holdingBombPowerUp = true;
                        this.bombPlacement.x = this.player.x + this.player.width / 2;
                        this.bombPlacement.y = this.player.y + this.player.height / 2;
                        this.displayPowerUpNotification(powerUp.type, 0);
                        this.playSound('powerUpSound');
                    } else if (powerUp.type !== 'bomb') {
                        powerUp.active = false;
                        this.applyPowerUpEffect(powerUp.type, powerUp.duration);
                        this.playSound('powerUpSound');
                    }
                }
            }
        }
        if (this.holdingBombPowerUp && this.player) {
            this.bombPlacement.x = this.player.x + this.player.width / 2;
            this.bombPlacement.y = this.player.y + this.player.height / 2;
        }
    }

    draw() {
        if (this.currentState === GAME_STATES.SHOP) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawStaticBackground();

        if (this.currentState === GAME_STATES.PLAYING || this.currentState === GAME_STATES.BOSS_FIGHT || this.currentState === GAME_STATES.PAUSED) {
            this.drawPlayingScreen();
        }
        
        if (this.currentState === GAME_STATES.PAUSED) {
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
        this.ctx.fillText(`BASE: ${this.base.health.toFixed(0)}`, this.canvas.width / 2, healthBarY - 10);
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
        if (this.holdingBombPowerUp) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.arc(this.bombPlacement.x, this.bombPlacement.y, this.bombPlacement.radius, 0, 2 * Math.PI);
            this.ctx.fillStyle = 'yellow';
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = 'orange';
            this.ctx.stroke();
            this.ctx.restore();
            const bombSprite = this.assetLoader.getAsset('explosionSprite');
            if (bombSprite) {
                const size = 64;
                this.ctx.save();
                this.ctx.globalAlpha = 0.8;
                this.ctx.drawImage(bombSprite, this.bombPlacement.x - size/2, this.bombPlacement.y - size/2, size, size);
                this.ctx.restore();
            }
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
        this.ctx.fillText(`DMG: ${this.currentShipStats.damage.toFixed(1)}`, 10, 180);
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
        this.ctx.fillText(`HEALTH: ${this.playerHealth.toFixed(0)}`, this.canvas.width - 10, 30);

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
    }
    
    activateCurrentShipAbility() {
        const currentShipAbility = this.currentShipStats.ability;
        if (!currentShipAbility || currentShipAbility.name === 'None') return;
    
        const abilityName = currentShipAbility.name;
        const cooldown = currentShipAbility.cooldown;
    
        if (this.shipAbilityCooldowns[abilityName] && this.shipAbilityCooldowns[abilityName] > 0) return;
    
        this.playSound('abilitySound');
        this.shipAbilityCooldowns[abilityName] = cooldown;
    
        switch (abilityName) {
            case 'Dash':
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
                const empDuration = 2;
                this.enemies.forEach(enemy => {
                    if (!enemy.isBoss) enemy.isStunned = true;
                });
                this.activeShipAbilities[abilityName] = { timer: empDuration };
                break;
    
            case 'Drone Companion':
                const droneDuration = 5;
                if (!this.activeShipAbilities[abilityName]) {
                    this.activeShipAbilities[abilityName] = { originalNumProjectiles: this.currentShipStats.numProjectiles };
                }
                this.activeShipAbilities[abilityName].timer = droneDuration;
                this.currentShipStats.numProjectiles = this.activeShipAbilities[abilityName].originalNumProjectiles + 2;
                break;
    
            case 'Shield Recharge':
                this.playerHealth = Math.min(this.playerHealth + 30, this.currentShipStats.health);
                this.shipHealths[this.currentShipType] = this.playerHealth; // Sync health state
                break;
    
            case 'Time Warp':
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
                    this.playSound('explosionSound');
                });
                this.enemies = [];
    
                if (this.boss && this.boss.active) {
                    this.boss.health -= 200;
                    this.explosions.push(new Explosion(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2, this.assetLoader.getAsset('explosionSprite'), 10, 100, 0.5));
                    this.playSound('explosionSound');
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
                    this.enemies.forEach(enemy => enemy.isStunned = false);
                    if (this.boss && this.boss.active) this.boss.isStunned = false;
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
        }
    }

    handleKeyDown(e) {
        if (this.tutorialActive) {
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
                    this.projectilesFired += this.currentShipStats.numProjectiles;
                    this.playSound('shotSound');
                    this.lastShotTime = currentTime;
                    this.canFireOnKeyPress = false;
                }
            }
        }

        if (e.key === 'Escape' || e.key === 'p') {
            if (this.currentState === GAME_STATES.PLAYING || this.currentState === GAME_STATES.BOSS_FIGHT || this.currentState === GAME_STATES.PAUSED) {
                this.togglePause();
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
            if (this.gameContainer) this.gameContainer.requestFullscreen().catch(err => alert(`Error: ${err.message}`));
        } else {
            document.exitFullscreen();
        }
    }

    togglePause() {
        if (this.currentState === GAME_STATES.PLAYING || this.currentState === GAME_STATES.BOSS_FIGHT) {
            const previousState = this.currentState;
            this.showMenu(GAME_STATES.PAUSED);
            this.currentState.previous = previousState;
            if (this.bgMusic && this.soundEnabled) this.bgMusic.pause();
        } else if (this.currentState === GAME_STATES.PAUSED) {
            this.showMenu(this.currentState.previous || GAME_STATES.PLAYING);
            if (this.bgMusic && this.soundEnabled) this.bgMusic.play().catch(e => console.error(e));
        }
    }

    returnToMainMenu(forceReset = false) {
        if (this.currentState === GAME_STATES.PLAYING || this.currentState === GAME_STATES.BOSS_FIGHT || this.currentState === GAME_STATES.PAUSED) {
            this.saveGame();
        }

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
        this.enemiesDefeated = 0;
        this.projectilesFired = 0;

        if (!keepPlayerState) {
            this.money = 0;
            this.experience = 0;
            this.currentShipType = 'ship1';
            this.ownedShips = ['ship1'];
            this.shipUpgrades = {
                'ship1': { damage: 0, fireRate: 0, health: 0, speed: 0 }
            };
            this.completedLevels = [];
            this.achievementManager.reset();
            this.shipHealths = {}; // Reset ship healths
        }
        
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

        this.shipAbilityCooldowns = {};
        this.activeShipAbilities = {};
        this.updateShipStats();
        this.playerHealth = this.currentShipStats.health; // Set to max after reset
        if(this.shipHealths[this.currentShipType] === undefined) {
             this.shipHealths[this.currentShipType] = this.playerHealth;
        }
        this.currentLevel = 1;

        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic.currentTime = 0;
        }
        if (clearSave) {
            localStorage.removeItem('spaceInvadersGameState');
            this.achievementManager.reset();
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
        
        // Player health is NOT reset here anymore to make it persistent.

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

        this.base.width = this.base.visualWidth * 0.7;
        this.base.x = (this.canvas.width - this.base.width) / 2;
        this.base.y = this.canvas.height - this.base.height;
    }

    initializePlayer() {
        this.player = new Player(this);
        this.updateShipStats();
        this.playerHealth = this.shipHealths[this.currentShipType] || this.currentShipStats.health;
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
        const bossHealth = Math.round((100 + this.currentLevel * 50) * bossConfig.healthMultiplier * difficulty.enemyHealth);
        const bossSpeed = 10 * bossConfig.speedMultiplier * difficulty.enemySpeed * (1 + (this.currentLevel - 1) * 0.1);
        this.boss = new Enemy(bossX, bossY, bossWidth, bossHeight, bossSpeed, 'boss', bossConfig.spriteName, true, bossConfig.fireRate, bossConfig.projectileSpeed, bossConfig.projectileDamage, bossConfig.specialAttack);
        this.boss.health = bossHealth;
        this.boss.maxHealth = bossHealth;
        this.boss.damage = 20 + this.currentLevel * 2;
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
        const baseEnemySpeed = 80 + Math.random() * 40;
        const levelScale = 1 + (this.currentLevel - 1) * 0.12;
        const enemySpeed = baseEnemySpeed * effectiveEnemySpeedMultiplier * this.difficultySettings[this.currentDifficulty].enemySpeed * levelScale;
        const randomSpriteName = this.currentLevelEnemyTypes[Math.floor(Math.random() * this.currentLevelEnemyTypes.length)];
        
        let ability = null;
        switch (randomSpriteName) {
            case 'monster1': ability = 'gravityWell'; break;
            case 'monster2': ability = 'plasmaBurst'; break;
            case 'monster3': ability = 'warpShift'; break;
            case 'monster4': ability = 'laserWeb'; break;
            case 'monster5': ability = 'droneSwarm'; break;
            case 'monster6': ability = 'shieldArray'; break;
            case 'monster7': ability = 'quantumEcho'; break;
            default: if (Math.random()<0.1) ability = 'cosmicSpores'; break;
        }
        const newEnemy = new Enemy(enemyX, enemyY, enemyWidth, enemyHeight, enemySpeed, 'basic', randomSpriteName, false, 0, 0, 0, 'none', ability);
        
        newEnemy.health = Math.round(3 * this.currentEnemyHealthMultiplier * Math.pow(1.15, this.currentLevel));
        newEnemy.maxHealth = newEnemy.health;
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
            case 'slowEnemies': spriteName = 'slowEnemiesPowerUpSprite'; break;
        }
        this.powerUps.push(new PowerUp(enemy.x, enemy.y, 40, 40, type, spriteName));
    }
    
    applyPowerUpEffect(type, duration) {
        const effect = { timer: duration, duration: duration }; 
        let value = null;

        switch (type) {
            case 'shield':
                this.playerInvincible = true;
                this.invincibilityTimer = duration; 
                this.activePowerUpEffects.shield = effect;
                break;
            case 'fireRate':
                if (!this.activePowerUpEffects.fireRate) {
                    this.activePowerUpEffects.fireRate = { originalFireRate: this.currentShipStats.fireRate };
                    this.currentShipStats.fireRate *= 0.5;
                }
                this.activePowerUpEffects.fireRate = { ...this.activePowerUpEffects.fireRate, ...effect };
                break;
            case 'money':
                value = 50 + this.currentLevel * 10;
                this.money += value;
                break;
            case 'heal':
                value = 25 + this.currentLevel * 2;
                this.playerHealth = Math.min(this.playerHealth + value, this.currentShipStats.health);
                this.shipHealths[this.currentShipType] = this.playerHealth; // Sync health
                break;
            case 'bomb':
                break;
            case 'slowEnemies':
                if (!this.activePowerUpEffects.slowEnemies) {
                    this.activePowerUpEffects.slowEnemies = { slowFactor: 0.5 };
                    this.enemies.forEach(e => e.speed *= this.activePowerUpEffects.slowEnemies.slowFactor);
                    if (this.boss && this.boss.active) {
                        this.boss.speed *= this.activePowerUpEffects.slowEnemies.slowFactor;
                    }
                    this.currentEnemySpeedMultiplier *= this.activePowerUpEffects.slowEnemies.slowFactor;
                }
                this.activePowerUpEffects.slowEnemies = { ...this.activePowerUpEffects.slowEnemies, ...effect };
                break;
        }
        
        this.displayPowerUpNotification(type, duration, value);
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

    displayPowerUpNotification(type, duration, value = null) {
        if (!this.powerUpIndicatorsDiv) return;

        const powerUpNames = {
            shield: 'Shield Activated',
            fireRate: 'Rapid Fire',
            bomb: 'Bomb Acquired',
            heal: 'Health Restored',
            slowEnemies: 'Time Warp',
            money: 'Credits Acquired'
        };

        const notification = document.createElement('div');
        notification.className = `powerup-notification ${type}`;
        
        const isInstant = !duration || ['money', 'heal', 'bomb'].includes(type);
        if (isInstant) {
            notification.classList.add('instant');
            duration = 3;
        }

        const sprite = this.assetLoader.getAsset(`${type}PowerUpSprite`);
        const iconUrl = sprite ? sprite.src : '';

        let contentHtml = `
            <div class="powerup-icon" style="background-image: url('${iconUrl}')"></div>
            <div class="powerup-content">
                <p class="powerup-name">${powerUpNames[type] || 'Power-Up'}</p>`;
        
        if (isInstant) {
            let valueText = '';
            if (type === 'money') valueText = `+${value} Credits`;
            if (type === 'heal') valueText = `+${value} Health`;
            if (type === 'bomb') valueText = 'Press SPACE to deploy!';
            contentHtml += `<p class="powerup-timer">${valueText}</p>`;
        } else {
            contentHtml += `
                <p class="powerup-timer">${duration.toFixed(1)}s</p>
                <div class="powerup-progress">
                    <div class="powerup-progress-bar" style="width: 100%;"></div>
                </div>`;
        }
        
        contentHtml += `</div>`;
        notification.innerHTML = contentHtml;

        this.powerUpIndicatorsDiv.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        if (!isInstant) {
            const timerElement = notification.querySelector('.powerup-timer');
            const progressBarElement = notification.querySelector('.powerup-progress-bar');
            let remainingTime = duration;

            const intervalId = setInterval(() => {
                remainingTime -= 0.1;
                if (remainingTime <= 0) {
                    clearInterval(intervalId);
                } else {
                    if (timerElement) timerElement.textContent = `${remainingTime.toFixed(1)}s`;
                    if (progressBarElement) progressBarElement.style.width = `${(remainingTime / duration) * 100}%`;
                }
            }, 100);
            notification.dataset.intervalId = intervalId;
        }

        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hide');
            
            setTimeout(() => {
                const intervalId = notification.dataset.intervalId;
                if (intervalId) {
                    clearInterval(parseInt(intervalId));
                }
                notification.remove();
            }, 400);
        }, duration * 1000);
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        if (this.toggleSoundBtn) this.toggleSoundBtn.textContent = `TOGGLE SOUND (${this.soundEnabled ? 'ON' : 'OFF'})`;
        this.setVolume(this.gameVolume);
        this.saveGame();
    }

    setVolume(volume, fromLoad = false) {
        this.gameVolume = volume;
        const effectiveVolume = this.soundEnabled ? this.gameVolume : 0;

        if (this.bgMusic) this.bgMusic.volume = effectiveVolume;
        for (const soundName in this.sounds) {
            if (this.sounds[soundName]) this.sounds[soundName].volume = effectiveVolume;
        }
        for (const soundName in this.soundPools) {
            this.soundPools[soundName].audios.forEach(audio => audio.volume = effectiveVolume);
        }
        if (!fromLoad) this.saveGame();
    }

    populateLevelMap() {
        if (!this.levelButtonsContainer) return;
        this.levelButtonsContainer.innerHTML = '';
        const maxAvailableLevel = this.completedLevels.length > 0 ? Math.max(...this.completedLevels) + 1 : 1;
        let selectedLevelIndex = maxAvailableLevel;
        if (selectedLevelIndex >= this.levels.length) selectedLevelIndex = this.levels.length - 1;
        if (selectedLevelIndex < 1) selectedLevelIndex = 1;

        const row1 = document.createElement('div');
        const row2 = document.createElement('div');
        row1.style.display = 'flex';
        row1.style.justifyContent = 'center';
        row1.style.gap = '15px';
        row1.style.marginBottom = '15px';
        row2.style.display = 'flex';
        row2.style.justifyContent = 'center';
        row2.style.gap = '15px';

        const validLevels = [];
        for (let i = 1; i < this.levels.length; i++) {
            const levelConfig = this.levels[i];
            if (!levelConfig.enemySpawnRate) continue;
            validLevels.push(i);
        }

        validLevels.forEach((levelIndex, arrayIndex) => {
            const button = document.createElement('button');
            button.classList.add('level-button', 'menu-button');
            button.textContent = `Level ${levelIndex}`;
            button.dataset.levelIndex = levelIndex;

            const isCompleted = this.completedLevels.includes(levelIndex);
            const isLocked = levelIndex > maxAvailableLevel;

            if (isCompleted) button.classList.add('completed');
            if (isLocked) {
                button.disabled = true;
                button.textContent += ' (Locked)';
            } else {
                button.addEventListener('click', () => this.handleLevelSelection(levelIndex));
                if (levelIndex === selectedLevelIndex) button.classList.add('selected');
            }

            button.addEventListener('mouseenter', () => this.displayLevelPlot(levelIndex));
            button.addEventListener('focus', () => this.displayLevelPlot(levelIndex));
            button.addEventListener('mouseleave', () => this.displayLevelPlot(selectedLevelIndex));
            button.addEventListener('blur', () => this.displayLevelPlot(selectedLevelIndex));

            if (arrayIndex < Math.ceil(validLevels.length / 2)) {
                row1.appendChild(button);
            } else {
                row2.appendChild(button);
            }
        });

        this.levelButtonsContainer.appendChild(row1);
        this.levelButtonsContainer.appendChild(row2);
        
        this.displayLevelPlot(selectedLevelIndex);

        if (this.backToShopBtn) this.backToShopBtn.style.display = this.currentLevel > 1 ? 'block' : 'none';

        this.currentMenuButtons = Array.from(this.levelButtonsContainer.querySelectorAll('.level-button:not(:disabled)'));
        this.updateSelectedMenuButton();
    }

    displayLevelPlot(levelIndex) {
        if (!this.levelPlotDisplay) return;
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
        if (this.commanderPopup) this.commanderPopup.style.display = 'flex';
        this.showMenu(null);
        this.typeCommanderMessage(this.tutorialMessages[this.tutorialIndex]);
        if (this.commanderNextBtn) this.commanderNextBtn.disabled = true;
    }

    typeCommanderMessage(message) {
        clearInterval(this.typingInterval);
        this.currentTypedText = '';
        if (this.commanderText) this.commanderText.textContent = '';
        let i = 0;
        if (this.commanderCursor) this.commanderCursor.style.display = 'inline-block';
        if (this.commanderNextBtn) this.commanderNextBtn.disabled = true;
        this.typingInterval = setInterval(() => {
            if (i < message.length) {
                this.currentTypedText += message[i];
                if (this.commanderText) this.commanderText.textContent = this.currentTypedText;
                i++;
            } else {
                clearInterval(this.typingInterval);
                if (this.commanderCursor) this.commanderCursor.style.display = 'inline-block';
                if (this.commanderNextBtn) this.commanderNextBtn.disabled = false;
            }
        }, 24);
    }

    advanceTutorial() {
        if (!this.tutorialActive) return;
        this.tutorialIndex++;
        if (this.tutorialIndex < this.tutorialMessages.length) {
            this.typeCommanderMessage(this.tutorialMessages[this.tutorialIndex]);
            if (this.commanderNextBtn) this.commanderNextBtn.disabled = true;
        } else {
            this.endTutorial();
        }
    }

    endTutorial() {
        this.tutorialActive = false;
        if (this.commanderPopup) this.commanderPopup.style.display = 'none';
        localStorage.setItem('tutorialCompleted', '1');
        this.showMenu(GAME_STATES.PLAYING);
        if (this.soundEnabled && this.bgMusic && this.bgMusic.paused) {
            this.bgMusic.play().catch(e => console.error("Error playing music:", e));
        }
    }

    placeBomb() {
        if (!this.holdingBombPowerUp) return;
        const bombRadius = this.bombPlacement.radius;
        const x = this.bombPlacement.x;
        const y = this.bombPlacement.y;
        this.explosions.push(new Explosion(x, y, this.assetLoader.getAsset('explosionSprite'), 20, bombRadius, 0.5));
        this.playSound('explosionSound');
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const distance = Math.sqrt(Math.pow(x - enemyCenterX, 2) + Math.pow(y - enemyCenterY, 2));
            if (distance <= bombRadius) {
                enemy.active = false;
                this.enemiesDefeated++;
                const difficulty = this.difficultySettings[this.currentDifficulty];
                this.score += Math.round(10 * difficulty.scoreRate);
                this.money += Math.round(5 * difficulty.moneyRate);
                this.experience += Math.round(10 * difficulty.expRate);
            }
        });
        if (this.boss && this.boss.active) {
            const bossCenterX = this.boss.x + this.boss.width / 2;
            const bossCenterY = this.boss.y + this.boss.height / 2;
            const distance = Math.sqrt(Math.pow(x - bossCenterX, 2) + Math.pow(y - bossCenterY, 2));
            if (distance <= bombRadius) {
                this.boss.health -= 200;
                if (this.boss.health <= 0) {
                    this.boss.active = false;
                    this.bossDefeated();
                }
            }
        }
        this.holdingBombPowerUp = false;
    }

    // --- ACHIEVEMENT METHODS ---

    initializeAchievements() {
        this.achievementManager.addAchievement(new Achievement({
            id: 'first_kill', name: 'First Contact', description: 'Defeat your first enemy.', icon: 'ach_first_kill',
            conditionFn: (game) => game.enemiesDefeated >= 1,
            progressFn: (game) => ({ current: game.enemiesDefeated, max: 1 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'destroyer_100', name: 'Destroyer', description: 'Defeat 100 enemies.', icon: 'ach_destroyer', rare: true,
            conditionFn: (game) => game.enemiesDefeated >= 100,
            progressFn: (game) => ({ current: game.enemiesDefeated, max: 100 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'moneybags_1k', name: 'Moneybags', description: 'Accumulate 1000 credits in one run.', icon: 'ach_money',
            conditionFn: (game) => game.money >= 1000,
            progressFn: (game) => ({ current: game.money, max: 1000 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'collector_3', name: 'Collector', description: 'Own 3 different ships.', icon: 'ach_collector',
            conditionFn: (game) => game.ownedShips.length >= 3,
            progressFn: (game) => ({ current: game.ownedShips.length, max: 3 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'level_1_clear', name: 'Getting Started', description: 'Complete Level 1.', icon: 'ach_level_up',
            conditionFn: (game) => game.completedLevels.includes(1),
            progressFn: (game) => ({ current: game.completedLevels.includes(1) ? 1 : 0, max: 1 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'boss_slayer_1', name: 'Boss Slayer', description: 'Defeat the first boss.', icon: 'ach_boss_slayer', rare: true,
            conditionFn: (game) => game.completedLevels.includes(1) && game.boss === null,
            progressFn: (game) => ({ current: game.completedLevels.includes(1) ? 1 : 0, max: 1 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'trigger_happy_500', name: 'Trigger Happy', description: 'Fire 500 projectiles.', icon: 'ach_trigger_happy',
            conditionFn: (game) => game.projectilesFired >= 500,
            progressFn: (game) => ({ current: game.projectilesFired, max: 500 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'power_up_3', name: 'Power Overwhelming', description: 'Have 3 power-ups active at once.', icon: 'ach_power_up', rare: true,
            conditionFn: (game) => Object.keys(game.activePowerUpEffects).length >= 3,
            progressFn: (game) => ({ current: Object.keys(game.activePowerUpEffects).length, max: 3 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'shopaholic_500', name: 'Shopaholic', description: 'Spend 500 credits at the shop.', icon: 'ach_shopaholic',
            conditionFn: (game) => {
                let totalSpent = 0;
                for (const shipType in game.shipUpgrades) {
                    const upgrades = game.shipUpgrades[shipType];
                    const config = game.shipConfigs[shipType];
                    for (const upgradeType in upgrades) {
                        const level = upgrades[upgradeType];
                        if (level > 0) {
                            totalSpent += config.upgrades[upgradeType].costs.slice(0, level).reduce((a, b) => a + b, 0);
                        }
                    }
                }
                return totalSpent >= 500;
            },
            progressFn: (game) => {
                let totalSpent = 0;
                for (const shipType in game.shipUpgrades) {
                    const upgrades = game.shipUpgrades[shipType];
                    const config = game.shipConfigs[shipType];
                    for (const upgradeType in upgrades) {
                        const level = upgrades[upgradeType];
                        if (level > 0) {
                            totalSpent += config.upgrades[upgradeType].costs.slice(0, level).reduce((a, b) => a + b, 0);
                        }
                    }
                }
                return { current: totalSpent, max: 500 };
            }
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'survivor', name: 'Survivor', description: 'Complete the game without losing the base.', icon: 'ach_survivor', rare: true,
            conditionFn: (game) => game.currentLevel === game.levels.length - 1 && game.base.health > 0,
            progressFn: (game) => ({ current: game.currentLevel === game.levels.length - 1 && game.base.health > 0 ? 1 : 0, max: 1 })
        }));
        this.achievementManager.addAchievement(new Achievement({
            id: 'destroyer', name: 'Ultimate Destroyer', description: 'Defeat 1000 enemies.', icon: 'ach_destroyer', rare: true,
            conditionFn: (game) => game.enemiesDefeated >= 1000,
            progressFn: (game) => ({ current: game.enemiesDefeated, max: 1000 })
        }));
    }

    displayAchievementNotification(achievement) {
        if (!this.achievementIndicatorsDiv) return;

        this.playSound('achievementSound');

        const notification = document.createElement('div');
        notification.className = 'achievement-notification';

        const iconAsset = this.assetLoader.getAsset(achievement.icon);
        const iconUrl = iconAsset ? iconAsset.src : '';

        notification.innerHTML = `
            <div class="achievement-icon-container">
                <div class="achievement-icon" style="background-image: url('${iconUrl}')"></div>
            </div>
            <div class="achievement-content">
                <p class="achievement-unlock-text">Achievement Unlocked!</p>
                <p class="achievement-title">${achievement.name}</p>
                <p class="achievement-desc">${achievement.description}</p>
            </div>
            <div class="achievement-progress-bar"></div>
        `;

        this.achievementIndicatorsDiv.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        const displayDuration = 5000;

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, displayDuration);
    }

    renderAchievementsMenu() {
        if (!this.achievementsListDiv) return;
        this.achievementsListDiv.innerHTML = '';
        const achievements = this.achievementManager.achievements;
        const unlocked = this.achievementManager.unlockedIds;
        let filtered = achievements;
        if (this.achievementFilter === 'unlocked') filtered = achievements.filter(ach => unlocked.has(ach.id));
        if (this.achievementFilter === 'locked') filtered = achievements.filter(ach => !unlocked.has(ach.id));
        filtered.forEach(ach => {
            const div = document.createElement('div');
            let entryClass = 'achievement-entry';
            if (unlocked.has(ach.id)) entryClass += ' unlocked';
            else entryClass += ' locked';
            if (ach.rare) entryClass += ' rare';
            div.className = entryClass;
            const iconAsset = this.assetLoader.getAsset(ach.icon);
            const iconUrl = iconAsset ? iconAsset.src : '';
            let progressHtml = '';
            if (ach.progressFn) {
                const { current, max } = ach.progressFn(this);
                const percent = Math.min(100, Math.round((current / max) * 100));
                progressHtml = `
                    <div class="achievement-progress-bar-container">
                        <div class="achievement-progress-bar" style="width: ${percent}%;"></div>
                        <span class="achievement-progress-label">${current} / ${max}</span>
                    </div>
                `;
            }
            div.innerHTML = `
                <div class="achievement-icon" style="background-image: url('${iconUrl}')"></div>
                <div class="achievement-info">
                    <span class="achievement-title">${ach.name}${ach.rare ? ' <span class=\'rare-badge\'>★</span>' : ''}</span>
                    <span class="achievement-desc">${ach.description}</span>
                    <span class="achievement-status">${unlocked.has(ach.id) ? 'Unlocked' : 'Locked'}</span>
                    ${progressHtml}
                </div>
            `;
            this.achievementsListDiv.appendChild(div);
            if (unlocked.has(ach.id) && ach.justUnlocked) {
                div.classList.add('just-unlocked');
                setTimeout(() => div.classList.remove('just-unlocked'), 2000);
                ach.justUnlocked = false;
            }
        });
    }

    switchAchievementsStats(section) {
        if (!this.achievementsListDiv || !this.playerStatsDiv || !this.showAchievementsBtn || !this.showStatsBtn) return;
        if (section === 'achievements') {
            this.achievementsListDiv.style.display = '';
            this.playerStatsDiv.style.display = 'none';
            this.showAchievementsBtn.classList.add('selected');
            this.showStatsBtn.classList.remove('selected');
            this.renderAchievementsMenu();
        } else {
            this.achievementsListDiv.style.display = 'none';
            this.playerStatsDiv.style.display = '';
            this.showAchievementsBtn.classList.remove('selected');
            this.showStatsBtn.classList.add('selected');
            this.renderPlayerStats();
        }
    }

    renderPlayerStats() {
        if (!this.playerStatsDiv) return;
        const shots = this.projectilesFired;
        const ships = this.ownedShips.length;
        const money = this.money;
        const exp = this.experience;
        const levelsCompleted = this.completedLevels.length;
        const enemiesKilled = this.enemiesDefeated;
        const bossesKilled = this.completedLevels.length;
        const wins = this.completedLevels.length > 0 ? 1 : 0;
        const losses = parseInt(localStorage.getItem('spaceInvadersLosses') || '0', 10);

        this.playerStatsDiv.innerHTML = `
            <div class="player-stats-list">
                <div class="player-stat-row"><span class="stat-label">Shots Fired:</span><span class="stat-value">${shots}</span></div>
                <div class="player-stat-row"><span class="stat-label">Ships Owned:</span><span class="stat-value">${ships}</span></div>
                <div class="player-stat-row"><span class="stat-label">Money:</span><span class="stat-value">${money}</span></div>
                <div class="player-stat-row"><span class="stat-label">Experience:</span><span class="stat-value">${exp}</span></div>
                <div class="player-stat-row"><span class="stat-label">Levels Completed:</span><span class="stat-value">${levelsCompleted}</span></div>
                <div class="player-stat-row"><span class="stat-label">Enemies Killed:</span><span class="stat-value">${enemiesKilled}</span></div>
                <div class="player-stat-row"><span class="stat-label">Bosses Killed:</span><span class="stat-value">${bossesKilled}</span></div>
                <div class="player-stat-row"><span class="stat-label">Wins:</span><span class="stat-value">${wins}</span></div>
                <div class="player-stat-row"><span class="stat-label">Losses:</span><span class="stat-value">${losses}</span></div>
            </div>
        `;
    }

    setAchievementFilter(filter) {
        this.achievementFilter = filter;
        Object.entries(this.achievementFilterBtns).forEach(([key, btn]) => {
            if (btn) btn.classList.toggle('selected', key === filter);
        });
        this.renderAchievementsMenu();
    }

    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.updateDifficultyLabel();
        this.saveGame();
    }

    updateDifficultyLabel() {
        if (this.currentDifficultyLabel) {
            let label = '';
            switch (this.currentDifficulty) {
                case 'easy': label = 'Easy'; break;
                case 'normal': label = 'Normal'; break;
                case 'hard': label = 'Hard'; break;
            }
            this.currentDifficultyLabel.textContent = `Current: ${label}`;
        }
        if (this.difficultySelect) {
            this.difficultySelect.value = this.currentDifficulty;
        }
    }
}