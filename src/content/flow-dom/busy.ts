// Mutual-exclusion flag shared by panel-driven actions and direct
// prompt-box actions, since both act on the same live prompt box.
let busy = false;

export function isBusy(): boolean {
  return busy;
}

export function setBusy(value: boolean): void {
  busy = value;
}
