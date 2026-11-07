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
  children,
}: {
  titre: string
  /** Libellé du bouton qui engage. */
  action: string
  /** Libellé du bouton qui renonce. */
  retour: string
  onValider: () => void
  onAnnuler: () => void
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
