import Phaser from "phaser";
import { SPRITE_CONFIG } from "../constants";

export default class ColourStation extends Phaser.GameObjects.Container {
    constructor(scene, x, y, minDist, keyCode, changeColourFunction) {
        super(scene);
        this.x = x;
        this.y = y;
        this.minDist = minDist;
        this.changeColourFunction = changeColourFunction;
        this.playerInRange = false;

        this.colourStationKey = this.scene.input.keyboard.addKey(keyCode);
    }

    preload() {
        this.scene.load.spritesheet('colourStation', 'amidstOurselvesAssets/player.png', SPRITE_CONFIG);
    }

    create(player) {
        this.colourStationSprite = this.scene.add.sprite(this.x, this.y, 'colourStation', 0).setOrigin(0.5, 1);
        this.player = player;

        this.colourStationKey.on('down', () => {
            if (this.playerInRange) {
                this.changeColourFunction();
            }
        });
    }

    update() {
        this.playerInRange = this.inRange(this.player.x, this.player.y);
        
        if (this.playerInRange) {
            this.colourStationSprite.setFrame(11);
        } else {
            this.colourStationSprite.setFrame(0);
        }
    }

    inRange(playerX, playerY) {
        return this.manhattanDist(playerX, playerY, this.x, this.y, this.minDist) < this.minDist
    }

    manhattanDist(x1, y1, x2, y2) {
        return Math.abs(x1-x2) + Math.abs(y1-y2);
    }
}