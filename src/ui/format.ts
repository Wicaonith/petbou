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
