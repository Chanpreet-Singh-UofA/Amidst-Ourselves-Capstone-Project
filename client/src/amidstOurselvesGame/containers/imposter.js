import Phaser from "phaser";
import {
    PLAYER_STATE,
  } from "../constants";

export default class Imposter extends Phaser.GameObjects.Container {

    constructor(scene, socket) {
        super(scene);

        this.killCooldown = 10000; // in sec
        this.socket = socket;

        this.lastActionTime = 0;
        this.countdown = undefined;
        this.cooldownTimer = undefined;
        this.killReady = true;
        this.update(this.scene.players[this.socket.id]);
    }

    update(player) {
        this.player = player;
    }

    kill(players, deadBodies) {
        for (let player in players) {
            if((Math.abs(players[player].x - this.player.x) + Math.abs(players[player].y - this.player.y)) < 20 && player !== this.socket.id) {
                console.log("I'm killing: "+players[player].id);
                players[player].playerState = PLAYER_STATE.ghost;
                this.socket.emit('kill', {
                    id: player,
                    x: players[player].x,
                    y: players[player].y
                });

                deadBodies[player].x = players[player].x;
                deadBodies[player].y = players[player].y;
                deadBodies[player].visible = true;

                this.startCooldown();
                return true;
            } 
        }
        return false;
    }

    killWrapper(time, lastActionTime, players, id, deadBodies) {
        if (time - lastActionTime >= this.killCooldown) {
            this.update(players[id]);
            let kill_flag = this.kill(players, deadBodies);
            if (kill_flag) {
                lastActionTime = time;
            }
        }
        return lastActionTime;
    }

    attemptKill(players, deadBodies) {
        this.lastActionTime = this.killWrapper(this.scene.time.now, this.lastActionTime, players, this.socket.id, deadBodies);
    }

    createKillCooldown() {
        this.countdown = this.scene.add.text(500, 100, 'Kill Ready', { fontSize: '32px', fill: '#ffffff' })
        .setScrollFactor(0)
        .setOrigin(0.5)
        .setPadding(10)
        .setStyle({ backgroundColor: '#000000'});
      
    }

    startCooldown() {
        // start cooldown timer only if "Kill Ready"
        if (this.killReady) {
          this.countdown.setText('10');
          this.cooldownTimer =  this.scene.time.addEvent({
            delay: 1000,
            repeat: 9,
            callback: () => {
              this.countdown.setText(this.cooldownTimer.repeatCount);
            }
          });
          this.killReady = false;
        }
    }
  
    updateCooldown() {
        // check if countdown is complete and reset to "Kill Ready"
        if (this.cooldownTimer && this.cooldownTimer.getProgress() === 1) {
          this.countdown.setText('Kill Ready');
          this.cooldownTimer.remove();
          this.cooldownTimer = undefined;
          this.killReady = true;
        }
        this.update(this.scene.players[this.socket.id]);
        this.countdown.setStyle({ fill: '#ffffff' });
        for (let player in this.scene.players) {

            if((Math.abs(this.scene.players[player].x - this.player.x) + Math.abs(this.scene.players[player].y - this.player.y)) < 20 && player !== this.socket.id) {
                this.countdown.setStyle({ fill: '#ff0000' });
            }
        }


    }
}