import type { Mission, Point } from './Campaign';
/** Pure simulation; no DOM, persistence or renderer dependencies. */
export class MissionDirector {
  index = 0;
  progress = 0;
  complete = false;
  constructor(public mission: Mission) {}
  get objective() {
    return this.mission.objectives[this.index];
  }
  reset() {
    this.index = 0;
    this.progress = 0;
    this.complete = false;
  }
  distance(position: Point) {
    return Math.hypot(
      position[0] - this.objective.position[0],
      position[1] - this.objective.position[1],
    );
  }
  update(dt: number, position: Point, alive: number, interact: boolean) {
    if (this.complete) return false;
    const objective = this.objective;
    const near =
      this.distance(position) < (objective.kind === 'defend' ? 6 : 2.5);
    let done = false;
    switch (objective.kind) {
      case 'reach':
        done = near;
        break;
      case 'clear':
        done = alive === 0;
        break;
      case 'interact':
        this.progress = near && interact ? this.progress + dt : 0;
        done = this.progress >= (objective.seconds ?? 3) && alive === 0;
        break;
      case 'defend':
        if (near)
          this.progress = Math.min(objective.seconds ?? 20, this.progress + dt);
        done = this.progress >= (objective.seconds ?? 20) && alive === 0;
        break;
    }
    if (!done) return false;
    if (this.index === this.mission.objectives.length - 1) this.complete = true;
    else {
      this.index++;
      this.progress = 0;
    }
    return true;
  }
}
