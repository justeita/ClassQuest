import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../config";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#14201a");
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "ClassQuest", {
        color: "#F7F4EC",
        fontFamily: "monospace",
        fontSize: "16px",
      })
      .setOrigin(0.5);
  }
}
