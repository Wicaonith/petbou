import { type Equipe, type Match, matchJoue, gagnant } from './types'

export interface Ligne {
  equipeId: string
  nom: string
  joues: number
  victoires: number
  defaites: number
  pointsPour: number
  pointsContre: number
  /** Goal-average : pointsPour - pointsContre. */
  diff: number
  exempts: number
  /** Rang final, à partir de 1. Les ex æquo stricts partagent le rang. */
  rang: number
}

/**
 * Classement FFPJP : victoires, puis goal-average, puis points marqués,
 * puis confrontation directe. Les équipes non départagées gardent le même rang.
 */
export function classement(equipes: Equipe[], matchs: Match[]): Ligne[] {
  const lignes = new Map<string, Ligne>()
  for (const e of equipes) {
    lignes.set(e.id, {
      equipeId: e.id,
      nom: e.nom,
      joues: 0,
      victoires: 0,
      defaites: 0,
      pointsPour: 0,
      pointsContre: 0,
      diff: 0,
      exempts: 0,
      rang: 0,
    })
  }

  for (const m of matchs) {
    if (!matchJoue(m)) continue
    const a = lignes.get(m.equipeA)
    if (!a) continue

    if (m.equipeB === null) {
      a.exempts += 1
      a.victoires += 1
      a.pointsPour += m.scoreA!
      a.pointsContre += m.scoreB ?? 0
      continue
    }
    const b = lignes.get(m.equipeB)
    if (!b) continue

    a.joues += 1
    b.joues += 1
    a.pointsPour += m.scoreA!
    a.pointsContre += m.scoreB!
    b.pointsPour += m.scoreB!
    b.pointsContre += m.scoreA!
    if (m.scoreA! > m.scoreB!) {
      a.victoires += 1
      b.defaites += 1
    } else {
      b.victoires += 1
      a.defaites += 1
    }
  }

  for (const l of lignes.values()) l.diff = l.pointsPour - l.pointsContre

  const tri = [...lignes.values()].sort((x, y) => comparer(x, y, matchs))

  // Rangs : deux équipes que rien ne départage partagent le rang.
  let rang = 0
  tri.forEach((l, i) => {
    if (i === 0 || comparer(tri[i - 1], l, matchs) !== 0) rang = i + 1
    l.rang = rang
  })
  return tri
}

function comparer(x: Ligne, y: Ligne, matchs: Match[]): number {
  if (x.victoires !== y.victoires) return y.victoires - x.victoires
  if (x.diff !== y.diff) return y.diff - x.diff
  if (x.pointsPour !== y.pointsPour) return y.pointsPour - x.pointsPour
  return confrontationDirecte(x.equipeId, y.equipeId, matchs)
}

/** -1 si x a battu y, 1 si y a battu x, 0 s'ils ne se sont pas rencontrés. */
function confrontationDirecte(x: string, y: string, matchs: Match[]): number {
  for (const m of matchs) {
    if (!matchJoue(m) || m.equipeB === null) continue
    const concerne =
      (m.equipeA === x && m.equipeB === y) || (m.equipeA === y && m.equipeB === x)
    if (!concerne) continue
    const g = gagnant(m)
    if (g === x) return -1
    if (g === y) return 1
  }
  return 0
}

/** Paires d'équipes s'étant déjà rencontrées, pour éviter les revanches. */
export function dejaRencontrees(matchs: Match[]): Set<string> {
  const vus = new Set<string>()
  for (const m of matchs) {
    if (m.equipeB === null) continue
    vus.add(clePaire(m.equipeA, m.equipeB))
  }
  return vus
}

export const clePaire = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`
