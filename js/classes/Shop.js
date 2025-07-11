export class Shop {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;

        // Captain character for the shop
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100, // Keep player at the bottom
            width: 70,
            height: 70,
            speed: 250
        };

        // Interactive stations in the shop
        // Adjust x, y, width, height based on your shop_background.jpg
        this.stations = [
            // Shipyard: Placed on the left console area
            { 
                name: 'Shipyard', 
                x: this.canvas.width * 0.25 - 64, // Adjust percentage and subtract half width to center
                y: this.canvas.height * 0.35 - 64, // Adjust percentage and subtract half height to center
                width: 128, 
                height: 128, 
                spriteName: 'shipyard_console' 
            },
            // Upgrades: Placed on the right console area
            { 
                name: 'Upgrades', 
                x: this.canvas.width * 0.75 - 64, // Adjust percentage and subtract half width to center
                y: this.canvas.height * 0.35 - 64, // Adjust percentage and subtract half height to center
                width: 128, 
                height: 128, 
                spriteName: 'upgrade_terminal' 
            },
            // Missions: Placed on the central table area
            { 
                name: 'Missions', 
                x: this.canvas.width * 0.5 - 64, // Center horizontally
                y: this.canvas.height * 0.7 - 64, // Adjust percentage and subtract half height to center
                width: 128, 
                height: 128, 
                spriteName: 'starmap_table' 
            }
        ];

        this.activeStation = null;
        this.currentMenu = null; // Can be 'shipyard', 'upgrades', or null
        this.selectedButtonIndex = 0;
    }

    update(deltaTime, keys) {
        if (this.currentMenu) {
            // If a menu is open, don't move the player
            return;
        }

        // Player movement
        if (keys['ArrowLeft'] || keys['a']) this.player.x -= this.player.speed * deltaTime;
        if (keys['ArrowRight'] || keys['d']) this.player.x += this.player.speed * deltaTime;
        if (keys['ArrowUp'] || keys['w']) this.player.y -= this.player.speed * deltaTime;
        if (keys['ArrowDown'] || keys['s']) this.player.y += this.player.speed * deltaTime;

        // Boundary checks
        // Ensure player stays within the visible shop area, not just canvas edges
        // You might need to adjust these bounds based on the walkable area of your map
        const playerMinX = 0; // Leftmost walkable area
        const playerMaxX = this.canvas.width - this.player.width; // Rightmost walkable area
        const playerMinY = this.canvas.height * 0.2; // Topmost walkable area
        const playerMaxY = this.canvas.height - this.player.height; // Bottommost walkable area

        this.player.x = Math.max(playerMinX, Math.min(this.player.x, playerMaxX));
        this.player.y = Math.max(playerMinY, Math.min(this.player.y, playerMaxY));


        // Check for interaction
        this.activeStation = null;
        for (const station of this.stations) {
            // Calculate distance from player center to station center
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const stationCenterX = station.x + station.width / 2;
            const stationCenterY = station.y + station.height / 2;

            const dx = playerCenterX - stationCenterX;
            const dy = playerCenterY - stationCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // You might need to adjust this interaction radius
            if (distance < 100) { // Interaction radius
                this.activeStation = station;
                break;
            }
        }
    }

    interact() {
        if (this.currentMenu) {
            // If a menu is open, interaction key might do something else (like confirm)
            const buttons = document.querySelectorAll(`#${this.currentMenu}Menu .menu-button:not(:disabled)`);
            if (buttons[this.selectedButtonIndex]) {
                buttons[this.selectedButtonIndex].click();
            }
        } else if (this.activeStation) {
            // Open the menu for the active station
            this.selectedButtonIndex = 0;
            if (this.activeStation.name === 'Shipyard') {
                this.currentMenu = 'shipyard';
                this.game.updateShipShopUI(); // Tell the game to populate the menu
            } else if (this.activeStation.name === 'Upgrades') {
                this.currentMenu = 'upgrades';
                this.game.updateShipShopUI();
            } else if (this.activeStation.name === 'Missions') {
                this.game.showMenu('LEVEL_MAP');
            }
        }
    }
    
    closeMenu() {
        this.currentMenu = null;
        this.selectedButtonIndex = 0;
    }
    
    handleMenuInput(key) {
        if (!this.currentMenu) return;

        const menuId = `#${this.currentMenu}Menu`;
        const buttons = Array.from(document.querySelectorAll(`${menuId} .menu-button:not(:disabled)`));
        if (buttons.length === 0) return;

        if (key === 'ArrowUp') {
            this.selectedButtonIndex = (this.selectedButtonIndex - 1 + buttons.length) % buttons.length;
        } else if (key === 'ArrowDown') {
            this.selectedButtonIndex = (this.selectedButtonIndex + 1) % buttons.length;
        }
        
        buttons.forEach(btn => btn.classList.remove('selected'));
        buttons[this.selectedButtonIndex].classList.add('selected');
    }


    draw() {
        const assetLoader = this.game.assetLoader;
        // Draw background
        const bg = assetLoader.getAsset('shop_background');
        if (bg) {
            this.ctx.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = '#1a1a2a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw stations
        this.stations.forEach(station => {
            const sprite = assetLoader.getAsset(station.spriteName);
            if (sprite) {
                this.ctx.drawImage(sprite, station.x, station.y, station.width, station.height);
            } else {
                this.ctx.fillStyle = 'grey';
                this.ctx.fillRect(station.x, station.y, station.width, station.height);
            }
        });

        // Draw player
        const playerSprite = assetLoader.getAsset('captain_sprite');
        if (playerSprite) {
            this.ctx.drawImage(playerSprite, this.player.x, this.player.y, this.player.width, this.player.height);
        } else {
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }
        
        // Show/hide UI elements
        const interactionPrompt = document.getElementById('interactionPrompt');
        const shipyardMenu = document.getElementById('shipyardMenu');
        const upgradeMenu = document.getElementById('upgradeMenu');

        if (this.currentMenu === 'shipyard') {
            shipyardMenu.style.display = 'block';
            upgradeMenu.style.display = 'none';
            interactionPrompt.style.display = 'none';
        } else if (this.currentMenu === 'upgrades') {
            shipyardMenu.style.display = 'none';
            upgradeMenu.style.display = 'block';
            interactionPrompt.style.display = 'none';
        } else {
            shipyardMenu.style.display = 'none';
            upgradeMenu.style.display = 'none';
            if (this.activeStation) {
                interactionPrompt.style.display = 'block';
                interactionPrompt.textContent = `Press 'E' to use ${this.activeStation.name}`;
            } else {
                interactionPrompt.style.display = 'none';
            }
        }
    }
}