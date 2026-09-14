import { taillesDePoules, tailleTableau } from './formats/commun'
import { toursRecommandes } from './formats/suisse'
import type { FormatId, PhaseConfig } from './types'

/**
 * Ce qu'un format donnera concrètement, pour un effectif donné.
 *
 * L'écran explique le déroulement en toutes lettres, mais une explication
 * générale ne rassure personne : l'opératrice veut savoir ce que ça donne avec
 * SES équipes, avant de lancer quoi que ce soit. Ces chiffres viennent donc des
 * mêmes fonctions que celles qui mènent le concours — sinon l'écran annoncerait
 * un déroulement, et le logiciel en jouerait un autre.
 */
export interface Apercu {
  /** Nombre de tours annoncé, -1 si le format ne permet pas de le dire. */
  tours: number
  /** Nombre de parties du premier tour. */
  premieresParties: number
  /** Équipes exemptes au premier tour. */
  exempts: number
  /** Poules, quand le format en fait : leurs tailles. */
  poules?: number[]
  /** Tableaux ouverts par le format, du premier au dernier. */
  tableaux?: { nom: string; equipes: number }[]
}

/**
 * L'aperçu d'un format pour un effectif et des réglages donnés.
 *
 * Il dépend des réglages autant que du format : le même effectif en poules ne
 * donne pas le même concours selon que les tableaux finals sont cochés ou non,
 * et le système suisse suit le nombre de tours demandé plutôt que celui qu'il
 * recommande. D'où `config` en entrée, et non le seul `format`.
 *
 * Sous deux équipes il n'y a rien à annoncer : un concours à une équipe n'a ni
 * tour ni partie, et mieux vaut des zéros qu'une phrase inventée.
 */
export function apercu(format: FormatId, nbEquipes: number, config: PhaseConfig): Apercu {
  if (nbEquipes < 2) return { tours: 0, premieresParties: 0, exempts: 0 }

  switch (format) {
    case 'poules':
      return apercuPoules(nbEquipes, config)
    case 'suisse':
      return apercuSuisse(nbEquipes, config)
    case 'seeding':
      return { ...tableau(nbEquipes), tableaux: [{ nom: 'Tableau', equipes: nbEquipes }] }
    case 'multichances':
      return apercuMultichances(nbEquipes)
  }
}

/**
 * Un tableau à élimination directe accueille la puissance de 2 immédiatement
 * supérieure à l'effectif ; les places vides deviennent des exempts.
 */
function tableau(n: number): { tours: number; premieresParties: number; exempts: number } {
  const taille = tailleTableau(n)
  const exempts = taille - n
  return {
    tours: Math.log2(taille),
    // Les équipes non exemptes s'affrontent deux par deux.
    premieresParties: (n - exempts) / 2,
    exempts,
  }
}

/**
 * Poules, puis éventuellement les deux tableaux finals.
 *
 * Une poule de 4 se joue en trois tours — les deux parties d'ouverture, puis
 * gagnantes et perdantes, puis le barrage — et une poule de 3 aussi, chacune
 * rencontrant les deux autres. Le plus long décide donc du nombre de tours.
 *
 * Chaque poule envoie sa première en A et sa deuxième en B : le nombre de
 * poules donne donc directement l'effectif de chaque tableau.
 */
function apercuPoules(n: number, config: PhaseConfig): Apercu {
  const poules = taillesDePoules(n)
  const toursDePoule = Math.max(...poules.map((t) => (t === 4 ? 3 : t === 3 ? 3 : t)), 0)
  const qualifiees = poules.length

  if (!config.tableauFinal || poules.length < 2) {
    return {
      tours: toursDePoule,
      premieresParties: poules.reduce((s, t) => s + (t === 4 ? 2 : 1), 0),
      exempts: 0,
      poules,
    }
  }

  return {
    tours: toursDePoule + Math.log2(tailleTableau(qualifiees)),
    premieresParties: poules.reduce((s, t) => s + (t === 4 ? 2 : 1), 0),
    exempts: 0,
    poules,
    tableaux: [
      { nom: 'Tableau A', equipes: qualifiees },
      { nom: 'Tableau B', equipes: qualifiees },
    ],
  }
}

/**
 * Système suisse : le seul format dont le nombre de tours se décide, et le seul
 * où un exempt revient à chaque tour tant que l'effectif est impair — les autres
 * n'en distribuent qu'au premier tour, pour compléter un tableau.
 */
function apercuSuisse(n: number, config: PhaseConfig): Apercu {
  return {
    tours: config.nbTours ?? toursRecommandes(n),
    premieresParties: Math.floor(n / 2),
    exempts: n % 2,
  }
}

/**
 * Multi-chances : les battues du premier tour de A repartent en B, celles du
 * premier tour de B en C. La taille de chaque tableau se déduit donc du nombre
 * de parties réellement jouées au tour précédent — les exemptes, elles, n'ont
 * perdu contre personne.
 */
function apercuMultichances(n: number): Apercu {
  const a = tableau(n)
  const enB = a.premieresParties
  const b = enB >= 2 ? tableau(enB) : null
  const enC = b ? b.premieresParties : 0

  const tableaux = [{ nom: 'Tableau A', equipes: n }]
  if (enB >= 2) tableaux.push({ nom: 'Tableau B', equipes: enB })
  if (enC >= 2) tableaux.push({ nom: 'Tableau C', equipes: enC })

  return { ...a, tableaux }
}
