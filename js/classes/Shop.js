export class Shop {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;

        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 70,
            height: 70,
            speed: 250
        };

        this.stations = [
            { 
                name: 'Shipyard', 
                x: this.canvas.width * 0.25 - 64,
                y: this.canvas.height * 0.35 - 64,
                width: 128, 
                height: 128, 
                spriteName: 'shipyard_console' 
            },
            { 
                name: 'Upgrades', 
                x: this.canvas.width * 0.75 - 64,
                y: this.canvas.height * 0.35 - 64,
                width: 128, 
                height: 128, 
                spriteName: 'upgrade_terminal' 
            },
            { 
                name: 'Missions', 
                x: this.canvas.width * 0.5 - 64,
                y: this.canvas.height * 0.7 - 64,
                width: 128, 
                height: 128, 
                spriteName: 'starmap_table' 
            },
            // NEW: Repair Bay Station
            {
                name: 'Repair Bay',
                x: this.canvas.width * 0.5 - 64,
                y: this.canvas.height * 0.35 - 64,
                width: 128,
                height: 128,
                spriteName: 'repair_bay_console'
            }
        ];

        this.activeStation = null;
        this.currentMenu = null;
        this.selectedButtonIndex = 0;
    }

    update(deltaTime, keys) {
        if (this.currentMenu) {
            return;
        }

        if (keys['ArrowLeft'] || keys['a']) this.player.x -= this.player.speed * deltaTime;
        if (keys['ArrowRight'] || keys['d']) this.player.x += this.player.speed * deltaTime;
        if (keys['ArrowUp'] || keys['w']) this.player.y -= this.player.speed * deltaTime;
        if (keys['ArrowDown'] || keys['s']) this.player.y += this.player.speed * deltaTime;

        const playerMinX = 0;
        const playerMaxX = this.canvas.width - this.player.width;
        const playerMinY = this.canvas.height * 0.1;
        const playerMaxY = this.canvas.height - this.player.height;

        this.player.x = Math.max(playerMinX, Math.min(this.player.x, playerMaxX));
        this.player.y = Math.max(playerMinY, Math.min(this.player.y, playerMaxY));


        this.activeStation = null;
        for (const station of this.stations) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const stationCenterX = station.x + station.width / 2;
            const stationCenterY = station.y + station.height / 2;

            const dx = playerCenterX - stationCenterX;
            const dy = playerCenterY - stationCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                this.activeStation = station;
                break;
            }
        }
    }

    interact() {
        if (this.currentMenu) {
            let buttons;
            if (this.currentMenu === 'shipyard') {
                 buttons = document.querySelectorAll(`#shipyardMenu .ship-button:not(:disabled)`);
            } else if (this.currentMenu === 'upgrades') {
                 buttons = document.querySelectorAll(`#upgradeMenu .upgrade-button:not(:disabled)`);
            } else if (this.currentMenu === 'repair') {
                 buttons = document.querySelectorAll(`#repairMenu .repair-button:not(:disabled)`);
            }
            if (buttons && buttons[this.selectedButtonIndex]) {
                buttons[this.selectedButtonIndex].click();
            }
        } else if (this.activeStation) {
            this.selectedButtonIndex = 0;
            if (this.activeStation.name === 'Shipyard') {
                this.currentMenu = 'shipyard';
                this.game.renderShopMenus();
                this.game.updateShopPreview(this.game.currentShipType);
            } else if (this.activeStation.name === 'Upgrades') {
                this.currentMenu = 'upgrades';
                this.game.renderShopMenus();
                this.game.updateShopPreview(this.game.currentShipType);
            } else if (this.activeStation.name === 'Repair Bay') {
                this.currentMenu = 'repair';
                this.game.renderShopMenus();
            } else if (this.activeStation.name === 'Missions') {
                this.game.showMenu('LEVEL_MAP');
            }
        }
    }
    
    closeMenu() {
        this.currentMenu = null;
        this.selectedButtonIndex = 0;
        this.game.updateShopPreview(this.game.currentShipType);
    }
    
    handleMenuInput(key) {
        if (!this.currentMenu) return;

        const menuId = `#${this.currentMenu}Menu`;
        let buttons;
        if (this.currentMenu === 'shipyard') {
            buttons = Array.from(document.querySelectorAll(`${menuId} .ship-button:not(:disabled)`));
        } else if (this.currentMenu === 'upgrades') {
            buttons = Array.from(document.querySelectorAll(`${menuId} .upgrade-button:not(:disabled)`));
        } else if (this.currentMenu === 'repair') {
            buttons = Array.from(document.querySelectorAll(`${menuId} .repair-button:not(:disabled)`));
        }
        
        if (!buttons || buttons.length === 0) return;

        if (key === 'ArrowUp') {
            this.selectedButtonIndex = (this.selectedButtonIndex - 1 + buttons.length) % buttons.length;
        } else if (key === 'ArrowDown') {
            this.selectedButtonIndex = (this.selectedButtonIndex + 1) % buttons.length;
        }
        
        document.querySelectorAll(`.menu-button`).forEach(btn => btn.classList.remove('selected'));
        const selectedButton = buttons[this.selectedButtonIndex];
        if (selectedButton) {
            selectedButton.classList.add('selected');
            if (this.currentMenu === 'shipyard') {
                selectedButton.dispatchEvent(new MouseEvent('mouseenter'));
            }
        }
    }


    draw() {
        const assetLoader = this.game.assetLoader;
        const bg = assetLoader.getAsset('shop_background');
        if (bg) {
            this.ctx.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = '#1a1a2a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.stations.forEach(station => {
            const sprite = assetLoader.getAsset(station.spriteName);
            if (sprite) {
                this.ctx.drawImage(sprite, station.x, station.y, station.width, station.height);
            } else {
                this.ctx.fillStyle = 'grey';
                this.ctx.fillRect(station.x, station.y, station.width, station.height);
            }
        });

        const playerSprite = assetLoader.getAsset('captain_sprite');
        if (playerSprite) {
            this.ctx.drawImage(playerSprite, this.player.x, this.player.y, this.player.width, this.player.height);
        } else {
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }
        
        const interactionPrompt = document.getElementById('interactionPrompt');
        const shipyardMenu = document.getElementById('shipyardMenu');
        const upgradeMenu = document.getElementById('upgradeMenu');
        const repairMenu = document.getElementById('repairMenu');

        if (this.currentMenu === 'shipyard') {
            if(shipyardMenu) shipyardMenu.style.display = 'grid';
            if(upgradeMenu) upgradeMenu.style.display = 'none';
            if(repairMenu) repairMenu.style.display = 'none';
            if(interactionPrompt) interactionPrompt.style.display = 'none';
        } else if (this.currentMenu === 'upgrades') {
            if(shipyardMenu) shipyardMenu.style.display = 'none';
            if(upgradeMenu) upgradeMenu.style.display = 'block';
            if(repairMenu) repairMenu.style.display = 'none';
            if(interactionPrompt) interactionPrompt.style.display = 'none';
        } else if (this.currentMenu === 'repair') {
            if(shipyardMenu) shipyardMenu.style.display = 'none';
            if(upgradeMenu) upgradeMenu.style.display = 'none';
            if(repairMenu) repairMenu.style.display = 'block';
            if(interactionPrompt) interactionPrompt.style.display = 'none';
        } else {
            if(shipyardMenu) shipyardMenu.style.display = 'none';
            if(upgradeMenu) upgradeMenu.style.display = 'none';
            if(repairMenu) repairMenu.style.display = 'none';
            if (this.activeStation) {
                if(interactionPrompt) {
                    interactionPrompt.style.display = 'block';
                    interactionPrompt.textContent = `Press 'E' to use ${this.activeStation.name}`;
                }
            } else {
                if(interactionPrompt) interactionPrompt.style.display = 'none';
            }
        }
    }
}