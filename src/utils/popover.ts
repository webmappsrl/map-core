export function getFlowPopoverText(altitude = 0, orangeTreshold = 800, redTreshold = 1500): string {
  const green = `<span class="green">Livello 1: tratti non interessati dall'alta quota (quota minore di ${orangeTreshold} metri)</span>`;
  const orange = `<span class="orange">Livello 2: tratti parzialmente in alta quota (quota compresa tra ${orangeTreshold} metri e ${redTreshold} metri)</span>`;
  const red = `<span class="red">Livello 3: in alta quota (quota superiore ${redTreshold} metri)</span>`;
  return altitude < orangeTreshold
    ? green
    : altitude > orangeTreshold && altitude < redTreshold
    ? orange
    : red;
}
