import { classement, type Ligne } from './classement'
import { TABLEAUX } from './formats/multichances'
import { TABLEAUX_FINALS } from './formats/poules'
import { vainqueur } from './formats/seeding'
import type { Tournoi } from './tournoi'
import { matchsDuGroupe, parEquipeId, type Equipe } from './types'

/** Un classement et le titre sous lequel il se lit. */
export interface Section {
  titre: string
  lignes: Ligne[]
  /** Vainqueur du tableau, quand il y en a un. Absent pour un classement global. */
  vainqueur?: string
  /** Groupe des matchs de ce tableau, pour en dessiner l'arbre. Absent si global. */
  groupe?: string
}

/**
 * Découpe le classement en tableaux quand le format en comporte plusieurs.
 *
 * Un classement unique additionne des victoires qui n'ont pas la même valeur :
 * gagner trois parties dans le tableau C n'est pas comparable à perdre la
 * finale du A. Le résultat d'un concours à plusieurs tableaux, c'est un
 * vainqueur par tableau — pas une liste de vingt-cinq lignes.
 *
 * Les formats à tableau unique (système suisse, poules seules, élimination
 * directe) gardent un classement global, où il a tout son sens.
 */
export function classementParTableau(t: Tournoi): Section[] {
  const groupes = groupesDeTableau(t)
  const presents = groupes.filter((g) => t.matchs.some((m) => m.groupe === g))

  if (presents.length === 0) {
    return [{ titre: 'Classement', lignes: classement(t.equipes, t.matchs) }]
  }

  // Un seul tableau — l'élimination directe, ou un multi-chances dont le B n'est
  // pas encore ouvert : rien à découper, mais il y a bien un arbre à dessiner.
  if (presents.length === 1) {
    return [
      {
        titre: 'Tableau',
        lignes: classement(t.equipes, t.matchs),
        vainqueur: vainqueur(matchsDuGroupe(t.matchs, presents[0])) ?? undefined,
        groupe: presents[0],
      },
    ]
  }

  const parId = parEquipeId(t.equipes)
  // Une équipe qui a basculé de A en B appartient au dernier tableau qu'elle a
  // joué : c'est là qu'elle a fini, et c'est ainsi qu'un club en parle.
  const dernier = new Map<string, string>()
  for (const m of t.matchs) {
    if (!presents.includes(m.groupe ?? '')) continue
    for (const id of [m.equipeA, m.equipeB]) {
      if (id !== null) dernier.set(id, m.groupe!)
    }
  }

  const sections: Section[] = presents.map((g) => {
    const matchs = matchsDuGroupe(t.matchs, g)
    const equipes = equipesDe(parId, [...dernier].filter(([, x]) => x === g).map(([id]) => id))
    return {
      titre: titreDe(g),
      lignes: classement(equipes, matchs),
      vainqueur: vainqueur(matchs) ?? undefined,
      groupe: g,
    }
  })

  // Les équipes sorties avant tout tableau — éliminées en poules — ne doivent
  // pas disparaître du classement : elles ont joué, et elles veulent leur ligne.
  const sansTableau = t.equipes.filter((e) => !dernier.has(e.id))
  if (sansTableau.length > 0) {
    sections.push({
      titre: 'Éliminées avant les tableaux',
      lignes: classement(sansTableau, t.matchs),
      vainqueur: undefined,
      groupe: undefined,
    })
  }
  return sections
}

/** Les noms de groupe qui désignent un tableau, selon le format. */
function groupesDeTableau(t: Tournoi): string[] {
  if (t.config.format === 'seeding') return ['A']
  if (t.config.format === 'multichances') return [...TABLEAUX]
  if (t.config.format === 'poules' && t.config.tableauFinal) return [...TABLEAUX_FINALS]
  return []
}

/** 'A' vient du multi-chances, 'Tableau A' des poules : un seul libellé à l'écran. */
const titreDe = (groupe: string): string =>
  groupe.startsWith('Tableau') ? groupe : `Tableau ${groupe}`

const equipesDe = (parId: Map<string, Equipe>, ids: string[]): Equipe[] =>
  ids.map((id) => parId.get(id)).filter((e): e is Equipe => e !== undefined)
