import * as Phaser from 'phaser';

export type InputState = {
  readonly left: boolean;
  readonly right: boolean;
  readonly jumpDown: boolean;
  readonly jumpPressed: boolean;
  readonly jumpReleased: boolean;
  readonly interactDown: boolean;
  readonly interactPressed: boolean;
  readonly toggleDebugPressed: boolean;
};

export class KeyboardInput {
  private previousJumpDown = false;
  private previousInteractDown = false;
  private previousToggleDebugDown = false;

  constructor(private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {}

  read(): InputState {
    const left = this.keyboard.addKey('A').isDown || this.keyboard.addKey('LEFT').isDown;
    const right = this.keyboard.addKey('D').isDown || this.keyboard.addKey('RIGHT').isDown;
    const jumpDown =
      this.keyboard.addKey('SPACE').isDown ||
      this.keyboard.addKey('W').isDown ||
      this.keyboard.addKey('UP').isDown;
    const interactDown = this.keyboard.addKey('E').isDown;
    const toggleDebugDown = this.keyboard.addKey('BACKTICK').isDown;

    const state: InputState = {
      left,
      right,
      jumpDown,
      jumpPressed: jumpDown && !this.previousJumpDown,
      jumpReleased: !jumpDown && this.previousJumpDown,
      interactDown,
      interactPressed: interactDown && !this.previousInteractDown,
      toggleDebugPressed: toggleDebugDown && !this.previousToggleDebugDown,
    };

    this.previousJumpDown = jumpDown;
    this.previousInteractDown = interactDown;
    this.previousToggleDebugDown = toggleDebugDown;
    return state;
  }
}
