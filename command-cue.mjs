// Announce once per charge, including a ready gauge restored from a save.
export class CommandCue {
  update(battle, ready) {
    const announce = ready && (this.battle !== battle || !this.ready);
    this.battle = battle;
    this.ready = ready;
    return announce;
  }
}
