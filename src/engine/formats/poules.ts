import { classement } from '../classement'
import { melanger, rng } from '../alea'
import {
  type Driver,
  type Equipe,
  type EtatPhase,
  type Match,
  type NouveauMatch,
  gagnant,
  matchJoue,
  perdant,
} from '../types'
import { taillesDePoules } from './commun'

export const nomPoule = (i: number): string => `Poule ${i + 1}`

/**
 * Répartition des équipes en poules. Déterministe à graine fixée, et les têtes
 * de série sont distribuées une par poule avant le tirage du reste, pour ne pas
 * concentrer les favorites au même endroit.
 */
export function repartir(equipes: readonly Equipe[], graine: number): Equipe[][] {
  const tailles = taillesDePoules(equipes.length)
  const poules: Equipe[][] = tailles.map(() => [])
  const hasard = rng(graine)

  const tetes = equipes.filter((e) => e.seed !== undefined).sort((a, b) => a.seed! - b.seed!)
  const reste = melanger(equipes.filter((e) => e.seed === undefined), hasard)

  // Les têtes de série en serpentin, puis le reste dans les places libres.
  let i = 0
  for (const e of tetes) {
    let tours = 0
    while (poules[i % poules.length].length >= tailles[i % poules.length]) {
      i++
      if (++tours > poules.length) break
    }
    poules[i % poules.length].push(e)
    i++
  }
  for (const e of reste) {
    const cible = poules.findIndex((p, k) => p.length < tailles[k])
    poules[cible].push(e)
  }
  return poules
}

export const poules: Driver = {
  nom: 'Poules',

  toursPrevus: (nbEquipes) => {
    const tailles = taillesDePoules(nbEquipes)
    return Math.max(...tailles.map((t) => (t === 4 ? 3 : t === 3 ? 3 : t)), 0)
  },

  terminee(etat) {
    const groupes = repartir(etat.equipes, etat.config.graine ?? 1)
    return groupes.every((eqs, i) => pouleTerminee(eqs, matchsDe(etat, nomPoule(i))))
  },

  prochainsMatchs(etat) {
    const groupes = repartir(etat.equipes, etat.config.graine ?? 1)
    const sortie: NouveauMatch[] = []
    // Chaque poule avance à son rythme : une poule rapide ne doit pas
    // attendre les autres pour lancer son tour suivant.
    groupes.forEach((eqs, i) => {
      sortie.push(...prochainsDeLaPoule(eqs, matchsDe(etat, nomPoule(i)), nomPoule(i)))
    })
    return sortie
  },
}

const matchsDe = (etat: EtatPhase, groupe: string): Match[] =>
  etat.matchs.filter((m) => m.groupe === groupe)

/** Les deux équipes qualifiées d'une poule, dans l'ordre. */
export function qualifiees(equipes: readonly Equipe[], matchs: readonly Match[]): string[] {
  if (equipes.length === 4) {
    const g = matchs.find((m) => m.libelle === 'Gagnants')
    const b = matchs.find((m) => m.libelle === 'Barrage')
    const premier = g ? gagnant(g) : null
    const second = b ? gagnant(b) : null
    return [premier, second].filter((x): x is string => x !== null)
  }
  return classement([...equipes], [...matchs])
    .slice(0, 2)
    .map((l) => l.equipeId)
}

function pouleTerminee(equipes: readonly Equipe[], matchs: readonly Match[]): boolean {
  return prochainsDeLaPoule(equipes, matchs, 'x').length === 0 && matchs.every(matchJoue)
}

function prochainsDeLaPoule(
  equipes: readonly Equipe[],
  matchs: readonly Match[],
  groupe: string,
): NouveauMatch[] {
  if (matchs.some((m) => !matchJoue(m))) return [] // on attend les scores en cours
  return equipes.length === 4
    ? pouleDeQuatre(equipes, matchs, groupe)
    : championnat(equipes, matchs, groupe)
}

/**
 * Poule de 4 façon FFPJP : deux matchs, puis le match des gagnants (qui
 * qualifie) et celui des perdants (qui élimine), puis le barrage entre le
 * perdant des gagnants et le gagnant des perdants pour la seconde place.
 */
function pouleDeQuatre(
  equipes: readonly Equipe[],
  matchs: readonly Match[],
  groupe: string,
): NouveauMatch[] {
  const [a, b, c, d] = equipes
  if (matchs.length === 0) {
    return [
      { tour: 1, equipeA: a.id, equipeB: b.id, groupe },
      { tour: 1, equipeA: c.id, equipeB: d.id, groupe },
    ]
  }

  const tour1 = matchs.filter((m) => m.tour === 1)
  if (tour1.length === 2 && !matchs.some((m) => m.tour === 2)) {
    const [m1, m2] = tour1
    return [
      {
        tour: 2,
        equipeA: gagnant(m1)!,
        equipeB: gagnant(m2)!,
        groupe,
        libelle: 'Gagnants',
      },
      {
        tour: 2,
        equipeA: perdant(m1)!,
        equipeB: perdant(m2)!,
        groupe,
        libelle: 'Perdants',
      },
    ]
  }

  const mg = matchs.find((m) => m.libelle === 'Gagnants')
  const mp = matchs.find((m) => m.libelle === 'Perdants')
  if (mg && mp && !matchs.some((m) => m.libelle === 'Barrage')) {
    return [
      {
        tour: 3,
        equipeA: perdant(mg)!,
        equipeB: gagnant(mp)!,
        groupe,
        libelle: 'Barrage',
      },
    ]
  }
  return []
}

/** Poule de 3 ou 5 : championnat, chacun rencontre chacun. */
function championnat(
  equipes: readonly Equipe[],
  matchs: readonly Match[],
  groupe: string,
): NouveauMatch[] {
  const joues = new Set(matchs.map((m) => `${m.equipeA}|${m.equipeB}`))
  const aJoue = (x: string, y: string) => joues.has(`${x}|${y}`) || joues.has(`${y}|${x}`)

  const occupees = new Set<string>()
  const sortie: NouveauMatch[] = []
  const tour = matchs.reduce((max, m) => Math.max(max, m.tour), 0) + 1

  for (let i = 0; i < equipes.length; i++) {
    for (let j = i + 1; j < equipes.length; j++) {
      const x = equipes[i].id
      const y = equipes[j].id
      if (aJoue(x, y) || occupees.has(x) || occupees.has(y)) continue
      occupees.add(x)
      occupees.add(y)
      sortie.push({ tour, equipeA: x, equipeB: y, groupe })
    }
  }
  return sortie
}
