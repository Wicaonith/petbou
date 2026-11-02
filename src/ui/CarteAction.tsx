import type { ReactNode } from 'react'

/**
 * Une carte qui ne contient qu'un bouton et la phrase qui l'explique.
 *
 * Quatre endroits du parcours se terminent ainsi — imprimer le mode d'emploi,
 * passer à la saisie, aller au tirage suivant, imprimer le bilan. Chaque fois
 * la même règle : jamais un bouton seul. Qui tient la table découvre l'écran
 * debout, entre deux équipes ; un libellé de trois mots ne suffit pas à dire ce
 * qui va se passer, et la phrase d'en dessous est justement ce qui évite de
 * cliquer pour voir.
 *
 * `principale` pour l'action qui fait avancer le concours, laissée discrète
 * pour ce qui ne fait qu'imprimer : deux boutons de même poids sur un écran, et
 * on ne sait plus lequel est le pas suivant.
 */
export function CarteAction({
  libelle,
  aide,
  onClick,
  principale,
  desactive,
}: {
  libelle: ReactNode
  aide?: ReactNode
  onClick: () => void
  principale?: boolean
  desactive?: boolean
}) {
  return (
    <div className="carte">
      <button className={principale ? 'action' : 'secondaire'} onClick={onClick} disabled={desactive}>
        {libelle}
      </button>
      {aide !== undefined && <p className="aide carte-aide">{aide}</p>}
    </div>
  )
}
