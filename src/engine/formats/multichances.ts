import {
  type Driver,
  type Equipe,
  type EtatPhase,
  type Match,
  type NouveauMatch,
  matchJoue,
  matchsDuGroupe,
  perdant,
} from '../types'
import { matchsTableau, vainqueur } from './seeding'

export const TABLEAUX = ['A', 'B', 'C'] as const
export type Tableau = (typeof TABLEAUX)[number]

/**
 * Multi-chances A / B / C.
 *
 * Tout le monde part en A. Les éliminés du premier tour de A repartent en B,
 * ceux du premier tour de B en C : personne ne rentre chez soi après un seul
 * match, ce qui est tout l'intérêt du format pour un concours de club.
 */
export const multichances: Driver = {
  nom: 'Multi-chances (A / B / C)',

  toursPrevus: (nbEquipes) => (nbEquipes < 2 ? 0 : Math.ceil(Math.log2(nbEquipes)) + 2),

  terminee(etat) {
    return tableauxActifs(etat).every(({ equipes, matchs }) =>
      equipes.length < 2 ? true : vainqueur(matchs) !== null,
    )
  },

  prochainsMatchs(etat) {
    const sortie: NouveauMatch[] = []
    for (const { nom, equipes, matchs, graine } of tableauxActifs(etat)) {
      sortie.push(...matchsTableau(equipes, matchs, nom, graine))
    }
    return sortie
  },
}

interface EtatTableau {
  nom: Tableau
  equipes: Equipe[]
  matchs: Match[]
  graine: number
}

/**
 * Les tableaux ouverts à cet instant. B n'existe qu'une fois le premier tour
 * de A entièrement joué, et C une fois celui de B joué.
 */
function tableauxActifs(etat: EtatPhase): EtatTableau[] {
  const graine = etat.config.graine ?? 1
  const parId = new Map(etat.equipes.map((e) => [e.id, e]))
  const matchsDe = (t: Tableau) => matchsDuGroupe(etat.matchs, t)

  const actifs: EtatTableau[] = [
    { nom: 'A', equipes: [...etat.equipes], matchs: matchsDe('A'), graine },
  ]

  for (let i = 1; i < TABLEAUX.length; i++) {
    const precedent = actifs[i - 1]
    if (!premierTourJoue(precedent.matchs)) break
    const repeches = perdantsDuPremierTour(precedent.matchs)
      .map((id) => parId.get(id))
      .filter((e): e is Equipe => e !== undefined)
    if (repeches.length < 2) break
    actifs.push({
      nom: TABLEAUX[i],
      equipes: repeches,
      matchs: matchsDe(TABLEAUX[i]),
      graine: graine + i,
    })
  }
  return actifs
}

const premierTourJoue = (matchs: readonly Match[]): boolean => {
  const t1 = matchs.filter((m) => m.tour === 1)
  return t1.length > 0 && t1.every(matchJoue)
}

const perdantsDuPremierTour = (matchs: readonly Match[]): string[] =>
  matchs
    .filter((m) => m.tour === 1)
    .map(perdant)
    .filter((x): x is string => x !== null)
