import * as Phaser from 'phaser';

export type InputState = {
  readonly left: boolean;
  readonly right: boolean;
  readonly jumpDown: boolean;
  readonly jumpPressed: boolean;
  readonly jumpReleased: boolean;
};

export class KeyboardInput {
  private previousJumpDown = false;

  constructor(private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {}

  read(): InputState {
    const left = this.keyboard.addKey('A').isDown || this.keyboard.addKey('LEFT').isDown;
    const right = this.keyboard.addKey('D').isDown || this.keyboard.addKey('RIGHT').isDown;
    const jumpDown =
      this.keyboard.addKey('SPACE').isDown ||
      this.keyboard.addKey('W').isDown ||
      this.keyboard.addKey('UP').isDown;

    const state: InputState = {
      left,
      right,
      jumpDown,
      jumpPressed: jumpDown && !this.previousJumpDown,
      jumpReleased: !jumpDown && this.previousJumpDown,
    };

    this.previousJumpDown = jumpDown;
    return state;
  }
}
