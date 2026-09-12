/**
 * Générateur pseudo-aléatoire à graine (mulberry32). Un tirage tiré d'une
 * graine enregistrée peut être rejoué à l'identique : indispensable pour
 * pouvoir justifier un tirage contesté, et pour tester le moteur.
 */
export function rng(graine: number): () => number {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates, sans modifier le tableau d'entrée. */
export function melanger<T>(xs: readonly T[], hasard: () => number): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
