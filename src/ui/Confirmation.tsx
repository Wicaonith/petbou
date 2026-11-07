import { useEffect, useRef, type ReactNode } from 'react'

/**
 * La dernière porte avant un geste qu'on ne peut pas défaire.
 *
 * Elle dit ce qui va se passer et ce qui ne sera plus possible, jamais
 * « êtes-vous sûr » : on ne sait pas répondre à une question qui ne dit pas ce
 * qu'elle engage. Pour la même raison les deux boutons redisent l'acte —
 * « Oui, tout effacer », pas « OK » — parce qu'on lit le bouton, pas le texte.
 *
 * L'élément <dialog> est natif : Échap ferme, le clavier reste prisonnier de la
 * fenêtre et le fond s'assombrit, sans une ligne de code pour chacun.
 */
export function Confirmation({
  titre,
  action,
  retour,
  onValider,
  onAnnuler,
  secours,
  children,
}: {
  titre: string
  /** Libellé du bouton qui engage. */
  action: string
  /** Libellé du bouton qui renonce. */
  retour: string
  onValider: () => void
  onAnnuler: () => void
  /**
   * Un troisième bouton, qui met à l'abri avant de détruire.
   *
   * Annuler laisse le problème entier : on voulait bien repartir de zéro, on
   * ne voulait pas perdre ce qu'on avait tapé. Quand les deux sont vrais, la
   * porte de sortie se présente ici plutôt que d'exiger qu'on referme, qu'on
   * trouve le bon bouton ailleurs, puis qu'on revienne.
   */
  secours?: { libelle: string; onClick: () => void }
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => ref.current?.showModal(), [])

  return (
    <dialog
      className="modale"
      ref={ref}
      onCancel={onAnnuler}
      onClick={(e) => e.target === ref.current && onAnnuler()}
    >
      <h2>{titre}</h2>
      {children}
      <div className="modale-pied">
        {secours && (
          <button className="secondaire" onClick={secours.onClick}>
            {secours.libelle}
          </button>
        )}
        <button className="action" onClick={onValider} autoFocus>
          {action}
        </button>
        <button className="secondaire" onClick={onAnnuler}>
          {retour}
        </button>
      </div>
    </dialog>
  )
}
