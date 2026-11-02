import { classement, dejaRencontrees } from '../classement'
import { melanger, rng } from '../alea'
import { type Driver, type EtatPhase, type NouveauMatch, dernierTour, matchJoue } from '../types'
import { apparierAuMieux, choisirExempt } from './commun'

/** Nombre de tours par défaut : de quoi départager sans étirer la journée. */
export const toursRecommandes = (n: number): number =>
  n <= 1 ? 0 : Math.max(3, Math.ceil(Math.log2(n)))

/**
 * Tous les scores du tour sont-ils rentrés ?
 *
 * Un tour sans aucun match n'est pas complet mais vide : la distinction évite
 * d'enchaîner sur le tour suivant avant que le premier ait été lancé.
 */
export const tourComplet = (etat: EtatPhase, tour: number): boolean => {
  const ms = etat.matchs.filter((m) => m.tour === tour)
  return ms.length > 0 && ms.every(matchJoue)
}

/**
 * Système suisse : personne n'est éliminé, et chacun affronte son niveau.
 *
 * Le premier tour est tiré au sort. Les suivants apparient les équipes dans
 * l'ordre du classement, ce qui met face à face celles qui ont gagné autant —
 * c'est une conséquence de l'ordre, pas une règle imposée.
 *
 * La non-revanche, elle, prime : plutôt que de rejouer une affiche, le moteur
 * descend chercher l'adversaire suivant, quitte à croiser deux équipes qui n'ont
 * pas le même nombre de victoires. Un tirage qui surprend l'opérateur vient
 * presque toujours de là, et l'écran de tirage affiche les victoires pour qu'il
 * puisse le défendre devant les joueurs.
 *
 * C'est aussi le seul format dont le nombre de tours se décide à l'avance au
 * lieu de découler de l'effectif.
 */
export const suisse: Driver = {
  nom: 'Système suisse',

  toursPrevus: (nbEquipes, config) => config.nbTours ?? toursRecommandes(nbEquipes),

  terminee(etat) {
    const tour = dernierTour(etat.matchs)
    const voulus = this.toursPrevus(etat.equipes.length, etat.config)
    return tour >= voulus && tourComplet(etat, tour)
  },

  prochainsMatchs(etat) {
    const tour = dernierTour(etat.matchs)
    // Un tour en cours bloque le suivant : on ne tire qu'avec tous les résultats.
    if (tour > 0 && !tourComplet(etat, tour)) return []
    if (this.terminee(etat)) return []

    const suivant = tour + 1
    const ordre = ordreDAppariement(etat, suivant)
    const matchs: NouveauMatch[] = []

    let aApparier = ordre
    if (ordre.length % 2 === 1) {
      const exempts = new Map<string, number>()
      for (const m of etat.matchs) {
        if (m.equipeB === null) exempts.set(m.equipeA, (exempts.get(m.equipeA) ?? 0) + 1)
      }
      const exempt = choisirExempt(ordre, exempts)
      aApparier = ordre.filter((id) => id !== exempt)
      matchs.push({
        tour: suivant,
        equipeA: exempt,
        equipeB: null,
        libelle: 'Exempt',
      })
    }

    const { paires, revanches } = apparierAuMieux(aApparier, dejaRencontrees(etat.matchs))
    for (const [a, b] of paires) {
      matchs.push({
        tour: suivant,
        equipeA: a,
        equipeB: b,
        libelle: revanches ? 'Revanche inévitable' : undefined,
      })
    }
    return matchs
  },
}

/**
 * Tour 1 : tirage au sort intégral, comme au boulodrome.
 * Tours suivants : ordre du classement, pour que chaque équipe affronte
 * une équipe au même nombre de victoires.
 */
function ordreDAppariement(etat: EtatPhase, tour: number): string[] {
  if (tour === 1) {
    const hasard = rng(etat.config.graine ?? 1)
    return melanger(etat.equipes.map((e) => e.id), hasard)
  }
  return classement(etat.equipes, etat.matchs).map((l) => l.equipeId)
}
