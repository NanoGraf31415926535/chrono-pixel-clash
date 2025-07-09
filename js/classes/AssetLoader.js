export class AssetLoader {
    constructor() {
        this.assets = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.onComplete = null;
    }

    loadImage(name, url) {
        this.totalAssets++;
        const img = new Image();
        img.onload = () => {
            this.loadedAssets++;
            this.checkCompletion();
        };
        img.onerror = () => {
            console.error(`Failed to load image: ${url}`);
            this.loadedAssets++;
            this.checkCompletion();
        };
        img.src = url;
        this.assets[name] = img;
    }

    loadAudio(name, url) {
        this.totalAssets++;
        const audio = new Audio();
        audio.oncanplaythrough = () => {
            this.loadedAssets++;
            this.checkCompletion();
        };
        audio.onerror = () => {
            console.error(`Failed to load audio: ${url}`);
            this.loadedAssets++;
            this.checkCompletion();
        };
        audio.src = url;
        this.assets[name] = audio;
    }

    checkCompletion() {
        if (this.loadedAssets === this.totalAssets && this.onComplete) {
            this.onComplete();
        }
    }

    getAsset(name) {
        return this.assets[name];
    }
}