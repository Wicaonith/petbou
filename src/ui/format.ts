/**
 * Mises en forme partagées par les écrans et les documents imprimés.
 */

/**
 * Une date lisible par qui tient la table.
 *
 * Elle part sur les feuilles de match et sur le bilan affiché au club : le
 * format ISO des données y passerait pour une référence informatique. Les deux
 * documents l'écrivaient chacun de leur côté, à l'identique.
 */
export function dateFr(iso: string): string {
  const [a, m, j] = iso.split('-')
  return j ? `${j}/${m}/${a}` : iso
}

/**
 * La marque du pluriel, à coller derrière un mot qui s'accorde.
 *
 * En français zéro reste au singulier — « 0 partie », et non « 0 parties »
 * comme l'anglais l'écrirait. La règle était retapée vingt-trois fois dans
 * l'interface, et il suffisait d'une faute de frappe sur la variable comptée
 * pour afficher « 1 parties » un jour de concours.
 */
export const accord = (n: number): string => (n > 1 ? 's' : '')

/** « 3 parties », « 1 équipe ». Pour le cas courant d'un nombre suivi d'un nom. */
export const pluriel = (n: number, mot: string): string => `${n} ${mot}${accord(n)}`

/**
 * Le goal-average, signé.
 *
 * Un +6 se lit comme un avantage, un 6 nu comme un total de points. Le signe
 * n'est donc pas une décoration : c'est lui qui dit qu'il s'agit d'une
 * différence. Le zéro reste nu, n'étant ni l'un ni l'autre.
 */
export const goalAverage = (diff: number): string => (diff > 0 ? `+${diff}` : String(diff))
