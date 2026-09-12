import { clePaire } from '../classement'

/**
 * Apparie une liste ordonnée d'équipes en évitant les revanches.
 *
 * L'ordre d'entrée porte la préférence : on tente d'abord l'adversaire le plus
 * proche au classement, et on revient en arrière si l'appariement mène à une
 * impasse. Sur les effectifs d'un concours de club le backtracking est immédiat ;
 * `budget` borne malgré tout le pire cas.
 */
export function apparier(
  ordre: readonly string[],
  interdites: ReadonlySet<string>,
  budget = 200_000,
): [string, string][] | null {
  let restant = budget

  const rec = (reste: readonly string[]): [string, string][] | null => {
    if (reste.length === 0) return []
    if (restant-- <= 0) return null
    const [a, ...suite] = reste
    for (let i = 0; i < suite.length; i++) {
      const b = suite[i]
      if (interdites.has(clePaire(a, b))) continue
      const sousReste = [...suite.slice(0, i), ...suite.slice(i + 1)]
      const suiteAppariee = rec(sousReste)
      if (suiteAppariee !== null) return [[a, b], ...suiteAppariee]
    }
    return null
  }

  return rec(ordre)
}

/**
 * Apparie en évitant les revanches si possible, sinon en les autorisant.
 *
 * Passé un certain nombre de tours, un appariement sans revanche peut ne pas
 * exister : mieux vaut rejouer une affiche que bloquer le concours. Le second
 * membre du retour signale le cas, pour que l'opérateur soit prévenu.
 */
export function apparierAuMieux(
  ordre: readonly string[],
  interdites: ReadonlySet<string>,
): { paires: [string, string][]; revanches: boolean } {
  const strict = apparier(ordre, interdites)
  if (strict) return { paires: strict, revanches: false }
  return { paires: apparier(ordre, new Set())!, revanches: true }
}

/**
 * Équipe mise au repos quand l'effectif est impair : la moins bien classée
 * parmi celles qui ont été exemptées le moins souvent, pour que le bénéfice
 * d'un exempt ne tombe jamais deux fois sur la même équipe avant les autres.
 */
export function choisirExempt(
  ordreClassement: readonly string[],
  exemptsParEquipe: ReadonlyMap<string, number>,
): string {
  let choix = ordreClassement[ordreClassement.length - 1]
  let min = Infinity
  for (let i = ordreClassement.length - 1; i >= 0; i--) {
    const id = ordreClassement[i]
    const n = exemptsParEquipe.get(id) ?? 0
    if (n < min) {
      min = n
      choix = id
    }
  }
  return choix
}

/** Répartit `n` équipes en poules de 4 en priorité, complétées par des poules de 3. */
export function taillesDePoules(n: number): number[] {
  if (n < 3) return n > 0 ? [n] : []
  if (n === 5) return [5]
  // 4a + 3b = n, en maximisant le nombre de poules de 4.
  for (let a = Math.floor(n / 4); a >= 0; a--) {
    const reste = n - 4 * a
    if (reste % 3 === 0) {
      return [...Array(a).fill(4), ...Array(reste / 3).fill(3)]
    }
  }
  return [n]
}

/**
 * Ordre des têtes de série dans un tableau à élimination directe, de sorte que
 * les deux meilleures ne puissent se croiser qu'en finale.
 * Pour 8 : [1, 8, 5, 4, 3, 6, 7, 2] (positions en seeds, 1 = meilleure).
 */
export function ordreTableau(taille: number): number[] {
  let ordre = [1, 2]
  while (ordre.length < taille) {
    const n = ordre.length * 2
    const suivant: number[] = []
    for (const s of ordre) {
      suivant.push(s, n + 1 - s)
    }
    ordre = suivant
  }
  return ordre
}

/** Plus petite puissance de 2 supérieure ou égale à n (minimum 2). */
export const tailleTableau = (n: number): number =>
  n <= 2 ? 2 : 2 ** Math.ceil(Math.log2(n))
