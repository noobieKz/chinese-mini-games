/** Prevent a gesture from activating controls introduced by a stage transition. */
export class StageInputGuard {
  private stage = '';
  private readyAt = 0;
  private pressedStage: string | null = null;

  sync(stage: string, now: number) {
    if (stage === this.stage) return;
    this.stage = stage;
    this.readyAt = now + 450;
  }

  press() {
    this.pressedStage = this.stage;
  }

  accept(now: number, detail: number) {
    const stalePress = this.pressedStage !== null && this.pressedStage !== this.stage;
    this.pressedStage = null;
    if (stalePress || detail > 1 || now < this.readyAt) return false;
    this.readyAt = now + 450;
    return true;
  }
}
