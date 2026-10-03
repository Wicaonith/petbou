import type { ReactNode } from 'react'

/** Ce qu'il faut pour nommer une équipe. `Equipe` comme `Ligne` le satisfont. */
export interface Nommable {
  numero: number
  nom: string
}

/**
 * Le dossard d'une équipe.
 *
 * Une doublette se cherche des yeux par son numéro, pas par deux patronymes lus
 * de loin sur un écran ou dans une liste de vingt-cinq lignes.
 */
export const NumEquipe = ({ n }: { n: number }) => <span className="numero">{n}</span>

/**
 * Une équipe telle qu'elle se lit partout : son dossard, puis ses noms.
 *
 * Cet assemblage était refait dans huit fichiers, dont quatre aides locales
 * presque identiques. Or c'est précisément l'élément qui doit se reconnaître
 * sans y penser, de la saisie à l'écran public en passant par les feuilles
 * imprimées : huit copies, c'est huit façons de finir par diverger.
 *
 * `dessous` ajoute une ligne discrète sous les noms — le nombre de victoires à
 * l'écran de tirage, par exemple. L'appelant fournit l'enveloppe, parce que la
 * balise qui l'entoure change d'un écran à l'autre.
 */
export function NomEquipe({ equipe, dessous }: { equipe?: Nommable; dessous?: ReactNode }) {
  if (!equipe) return null
  return (
    <>
      <NumEquipe n={equipe.numero} />
      {equipe.nom}
      {dessous !== undefined && <small>{dessous}</small>}
    </>
  )
}
