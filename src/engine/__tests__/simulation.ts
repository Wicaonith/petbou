import { rng } from '../alea'
import {
  type Equipe,
  type FormatId,
  type Formation,
  creerTournoi,
  enCours,
  lancerProchainsMatchs,
  saisirScore,
  termine,
  type Tournoi,
} from '../index'

export function equipes(n: number, formation: Formation = 'doublette'): Equipe[] {
  const taille = formation === 'doublette' ? 2 : 3
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i + 1}`,
    numero: i + 1,
    nom: `Équipe ${i + 1}`,
    joueurs: Array.from({ length: taille }, (_, j) => ({
      id: `e${i + 1}j${j + 1}`,
      nom: `Joueur ${i + 1}-${j + 1}`,
    })),
  }))
}

export function tournoi(
  n: number,
  format: FormatId,
  opts: Partial<{
    nbTerrains: number | null
    graine: number
    nbTours: number
    tableauFinal: boolean
  }> = {},
): Tournoi {
  const t = creerTournoi({
    nom: 'Test',
    formation: 'doublette',
    // `?? 8` avalerait le null, qui est justement le cas à tester.
    nbTerrains: opts.nbTerrains === undefined ? 8 : opts.nbTerrains,
    format,
    graine: opts.graine ?? 42,
    nbTours: opts.nbTours,
    tableauFinal: opts.tableauFinal,
  })
  return { ...t, equipes: equipes(n) }
}

/**
 * Joue un tournoi jusqu'au bout en inventant des scores.
 * Renvoie l'état final et le nombre d'itérations, pour détecter un blocage.
 */
export function jouer(depart: Tournoi, graine = 7): { final: Tournoi; tours: number } {
  const hasard = rng(graine)
  let t = depart
  let tours = 0
  const MAX = 500

  while (!termine(t) && tours < MAX) {
    tours++
    const avant = t.matchs.length
    t = lancerProchainsMatchs(t)
    const aJouer = enCours(t)
    if (aJouer.length === 0 && t.matchs.length === avant) break
    for (const m of aJouer) {
      const perdu = Math.floor(hasard() * 13)
      t = hasard() < 0.5 ? saisirScore(t, m.id, 13, perdu) : saisirScore(t, m.id, perdu, 13)
    }
  }
  return { final: t, tours }
}

/** Nombre de matchs réellement joués par chaque équipe (exempts exclus). */
export function matchsParEquipe(t: Tournoi): Map<string, number> {
  const compte = new Map(t.equipes.map((e) => [e.id, 0]))
  for (const m of t.matchs) {
    if (m.equipeB === null) continue
    compte.set(m.equipeA, (compte.get(m.equipeA) ?? 0) + 1)
    compte.set(m.equipeB, (compte.get(m.equipeB) ?? 0) + 1)
  }
  return compte
}
