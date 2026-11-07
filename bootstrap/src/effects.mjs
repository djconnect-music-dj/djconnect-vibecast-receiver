export function chooseEffects({ supported, reduced, highContrast, frames = [] }) {
  if (!supported || reduced || highContrast || frames.length < 30) return 'solid';
  const sorted = frames.slice().sort((a,b) => a-b);
  const p95 = sorted[Math.floor(sorted.length * .95)];
  // Bounded local observation, not a device identity or hardware qualification.
  return p95 <= 22 ? 'glass' : p95 <= 35 ? 'soft' : 'solid';
}
async function sampleFrames(win = window) {
  const frames = []; let previous;
  for (let i=0; i<45; i++) {
    const time = await new Promise(resolve => win.requestAnimationFrame(resolve));
    if (previous !== undefined) frames.push(time - previous);
    previous = time;
  }
  return frames;
}

// Share one measurement across preference changes. Apply the result using the
// current preferences, including a reduced-effects choice made mid-sample.
export function createEffectsUpdater({ readPreferences, apply, sample = sampleFrames }) {
  let frames = null, sampling = false;
  function update() {
    const preferences = readPreferences();
    apply(chooseEffects({ ...preferences, frames: frames ?? [] }));
    if (sampling || frames !== null || !preferences.supported || preferences.reduced || preferences.highContrast) return;
    sampling = true;
    void Promise.resolve().then(() => sample()).then(result => {
      frames = result;
      sampling = false;
      update();
    }, () => {
      // Leave the solid fallback in place; a later preference event may retry.
      sampling = false;
    });
  }
  return update;
}
