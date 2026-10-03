import { melanger, rng } from '../alea'
import {
  type Driver,
  type Equipe,
  type Match,
  type NouveauMatch,
  gagnant,
  matchJoue,
} from '../types'
import { ordreTableau, tailleTableau } from './commun'

/** 'Finale', 'Demi-finales'… d'après le nombre d'équipes encore en lice. */
export function libelleTour(equipesEnLice: number): string {
  switch (equipesEnLice) {
    case 2:
      return 'Finale'
    case 4:
      return 'Demi-finales'
    case 8:
      return 'Quarts de finale'
    case 16:
      return '8es de finale'
    case 32:
      return '16es de finale'
    default:
      return `Tour à ${equipesEnLice}`
  }
}

/**
 * Place les équipes dans le tableau. Les têtes de série occupent les positions
 * qui les tiennent à distance (la 1 et la 2 ne peuvent se croiser qu'en finale) ;
 * les équipes en trop par rapport à la puissance de 2 deviennent des exempts,
 * attribués aux mieux classées.
 */
export function placer(equipes: readonly Equipe[], graine: number): (Equipe | null)[] {
  const taille = tailleTableau(equipes.length)
  const hasard = rng(graine)
  const tetes = equipes.filter((e) => e.seed !== undefined).sort((a, b) => a.seed! - b.seed!)
  const reste = melanger(equipes.filter((e) => e.seed === undefined), hasard)
  const ordonnees = [...tetes, ...reste]
  return ordreTableau(taille).map((rang) => ordonnees[rang - 1] ?? null)
}

/**
 * Matchs à lancer dans un tableau à élimination directe.
 * Extrait du driver pour être réutilisé par le format multi-chances.
 */
export function matchsTableau(
  equipes: readonly Equipe[],
  matchs: readonly Match[],
  groupe: string,
  graine: number,
): NouveauMatch[] {
  if (equipes.length < 2) return []
  if (matchs.some((m) => !matchJoue(m))) return []

  const tour = matchs.reduce((max, m) => Math.max(max, m.tour), 0)

  if (tour === 0) {
    const places = placer(equipes, graine)
    const sortie: NouveauMatch[] = []
    for (let i = 0; i < places.length; i += 2) {
      const a = places[i]
      const b = places[i + 1]
      if (!a && !b) continue
      if (!b) sortie.push({ tour: 1, equipeA: a!.id, equipeB: null, groupe, libelle: 'Exempt' })
      else if (!a) sortie.push({ tour: 1, equipeA: b.id, equipeB: null, groupe, libelle: 'Exempt' })
      else
        sortie.push({
          tour: 1,
          equipeA: a.id,
          equipeB: b.id,
          groupe,
          libelle: libelleTour(places.filter(Boolean).length),
        })
    }
    return sortie
  }

  const survivants = gagnantsDuTour(matchs, tour)
  if (survivants.length < 2) return []

  const sortie: NouveauMatch[] = []
  for (let i = 0; i < survivants.length; i += 2) {
    const a = survivants[i]
    const b = survivants[i + 1]
    if (b === undefined) {
      sortie.push({ tour: tour + 1, equipeA: a, equipeB: null, groupe, libelle: 'Exempt' })
    } else {
      sortie.push({
        tour: tour + 1,
        equipeA: a,
        equipeB: b,
        groupe,
        libelle: libelleTour(survivants.length),
      })
    }
  }
  return sortie
}

/** Gagnants d'un tour, dans l'ordre du tableau : c'est cet ordre qui fait les affiches suivantes. */
export function gagnantsDuTour(matchs: readonly Match[], tour: number): string[] {
  return matchs
    .filter((m) => m.tour === tour)
    .map(gagnant)
    .filter((x): x is string => x !== null)
}

/** Le vainqueur du tableau, s'il est connu. */
export function vainqueur(matchs: readonly Match[]): string | null {
  const tour = matchs.reduce((max, m) => Math.max(max, m.tour), 0)
  if (tour === 0) return null
  const survivants = gagnantsDuTour(matchs, tour)
  return survivants.length === 1 ? survivants[0] : null
}

/**
 * Tableau à élimination directe : on perd, on sort.
 *
 * Tout est décidé au placement initial — les rencontres jusqu'à la finale en
 * découlent, seuls les résultats font avancer. Le tableau est dimensionné à la
 * puissance de 2 au-dessus de l'effectif, et les places vides deviennent des
 * exempts au premier tour (voir `placer`).
 *
 * `matchsTableau` est extrait du driver plutôt qu'enfermé dedans : les poules
 * et le multi-chances ouvrent leurs propres tableaux avec, et un second
 * algorithme de tableau aurait fini par diverger de celui-ci.
 */
export const seeding: Driver = {
  nom: 'Tableau à élimination directe',

  toursPrevus: (nbEquipes) => (nbEquipes < 2 ? 0 : Math.log2(tailleTableau(nbEquipes))),

  terminee(etat) {
    return etat.matchs.length > 0 && vainqueur(etat.matchs) !== null
  },

  prochainsMatchs(etat) {
    return matchsTableau(etat.equipes, etat.matchs, 'A', etat.config.graine ?? 1)
  },
}
