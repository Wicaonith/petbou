import { useEffect, useRef, useState } from 'react'
import { DRIVERS, type Tournoi } from '../engine'
import type { ConcoursRange } from '../stockage'
import { accord, dateFr, LIBELLE_FORMATION, pluriel } from './format'

/**
 * La liste des concours, pour en reprendre un.
 *
 * Elle existe pour remplacer la boîte de dialogue de Windows, et non pour s'y
 * ajouter : choisir un concours préparé il y a trois semaines se faisait
 * jusqu'ici dans l'Explorateur, au milieu des fichiers du PC, sur un nom de
 * fichier. Ici on lit le nom du concours, sa date et le nombre d'équipes —
 * c'est-à-dire ce qui permet de reconnaître le bon.
 *
 * Le concours ouvert figure en tête, marqué comme tel. Sans lui, quitter la
 * liste après avoir cliqué « Nouveau concours » laisserait croire que le
 * précédent a disparu.
 */
export function Concours({
  ouvert,
  ranges,
  onReprendre,
  onOublier,
  onOuvrirFichier,
  onFermer,
}: {
  ouvert: Tournoi
  ranges: readonly ConcoursRange[]
  onReprendre: (id: string) => void
  onOublier: (id: string) => void
  onOuvrirFichier: () => void
  onFermer: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => ref.current?.showModal(), [])

  // La suppression se confirme dans sa propre ligne, et non dans une seconde
  // fenêtre par-dessus celle-ci : on garde sous les yeux le concours dont il
  // s'agit, qui est précisément ce qu'une fenêtre de confirmation cacherait.
  const [aSupprimer, setASupprimer] = useState<string | null>(null)

  return (
    <dialog
      className="modale large"
      ref={ref}
      onCancel={onFermer}
      onClick={(e) => e.target === ref.current && onFermer()}
    >
      <h2>Mes concours</h2>

      <ul className="liste-concours">
        <li className="concours ouvert">
          <div>
            <div className="concours-nom">
              {ouvert.nom || 'Concours sans nom'} <span className="etiquette">ouvert</span>
            </div>
            <div className="concours-meta">{resume(ouvert)}</div>
          </div>
        </li>

        {ranges.map(({ tournoi }) => (
          <li className="concours" key={tournoi.id}>
            <div>
              <div className="concours-nom">{tournoi.nom || 'Concours sans nom'}</div>
              <div className="concours-meta">{resume(tournoi)}</div>
            </div>
            {aSupprimer === tournoi.id ? (
              <div className="concours-boutons">
                <span className="concours-alerte">Supprimer définitivement ?</span>
                <button className="danger" onClick={() => onOublier(tournoi.id)}>
                  Oui, supprimer
                </button>
                <button className="secondaire" onClick={() => setASupprimer(null)}>
                  Non
                </button>
              </div>
            ) : (
              <div className="concours-boutons">
                <button className="action" onClick={() => onReprendre(tournoi.id)}>
                  Reprendre
                </button>
                <button className="secondaire" onClick={() => setASupprimer(tournoi.id)}>
                  Supprimer
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {ranges.length === 0 && (
        <p className="concours-vide">
          Vous n’avez qu’un concours pour l’instant. Chaque fois que vous cliquerez sur
          <strong> Nouveau concours</strong>, celui que vous quittez viendra se ranger ici : rien
          ne s’efface, et vous pouvez en préparer autant que vous voulez.
        </p>
      )}

      <div className="modale-pied">
        <button className="secondaire" onClick={onOuvrirFichier}>
          Ouvrir un fichier…
        </button>
        <button className="secondaire" onClick={onFermer}>
          Fermer
        </button>
      </div>
    </dialog>
  )
}

/**
 * De quoi reconnaître un concours sans l'ouvrir.
 *
 * La date est celle du concours et non celle de la préparation : c'est par
 * elle qu'on distingue le concours de printemps de celui d'automne.
 */
function resume(t: Tournoi): string {
  const etat =
    t.matchs.length > 0
      ? `${pluriel(t.matchs.length, 'partie')} lancée${accord(t.matchs.length)}`
      : 'pas encore lancé'
  return [
    dateFr(t.date),
    `${pluriel(t.equipes.length, 'équipe')} en ${LIBELLE_FORMATION[t.formation].pluriel}`,
    DRIVERS[t.config.format].nom,
    etat,
  ].join(' · ')
}
