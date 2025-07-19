export class Achievement {
    /**
     * @param {Object} config - { id, name, description, icon, conditionFn, isSecret }
     */
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon || null; // URL or asset key
        this.conditionFn = config.conditionFn; // (game) => boolean
        this.isSecret = !!config.isSecret;
        this.unlocked = false;
        this.unlockTime = null;
    }

    check(game) {
        if (!this.unlocked && this.conditionFn(game)) {
            this.unlocked = true;
            this.unlockTime = Date.now();
            return true;
        }
        return false;
    }
}

export class AchievementManager {
    constructor(game, achievements = []) {
        this.game = game;
        this.achievements = achievements;
        this.unlockedIds = new Set();
    }

    addAchievement(achievement) {
        this.achievements.push(achievement);
    }

    checkAll() {
        let newlyUnlocked = [];
        for (const ach of this.achievements) {
            if (!ach.unlocked && ach.check(this.game)) {
                this.unlockedIds.add(ach.id);
                newlyUnlocked.push(ach);
            }
        }
        return newlyUnlocked;
    }

    getUnlocked() {
        return this.achievements.filter(a => a.unlocked);
    }

    getAll() {
        return this.achievements;
    }

    /**
     * Loads the unlocked state from a saved game.
     * @param {Set<string>} unlockedIds - A set of IDs of unlocked achievements.
     */
    loadUnlocked(unlockedIds) {
        this.unlockedIds = unlockedIds;
        for (const ach of this.achievements) {
            if (this.unlockedIds.has(ach.id)) {
                ach.unlocked = true;
            }
        }
    }

    /**
     * Resets all achievements to a locked state.
     */
    reset() {
        this.unlockedIds.clear();
        for (const ach of this.achievements) {
            ach.unlocked = false;
            ach.unlockTime = null;
        }
    }
}