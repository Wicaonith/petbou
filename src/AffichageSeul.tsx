import { useEffect, useState } from 'react'
import './ui/styles.css'
import { Affichage } from './ui/Affichage'
import { type Etat, lire, surChangement } from './stockage'

/**
 * Racine de la fenêtre d'affichage public.
 *
 * Elle ne reçoit rien de la fenêtre principale : elle relit la sauvegarde
 * commune à chaque changement. Un score validé à la table de marque apparaît
 * donc ici tout seul, sans qu'aucune des deux fenêtres n'ait à connaître l'autre.
 */
export default function AffichageSeul() {
  const [etat, setEtat] = useState<Etat | null>(() => lire())

  useEffect(() => surChangement(setEtat), [])

  useEffect(() => {
    document.title = `${etat?.tournoi.nom || 'Concours'} — affichage public`
  }, [etat?.tournoi.nom])

  if (!etat || etat.tournoi.equipes.length === 0) {
    return (
      <div className="affichage">
        <div className="affichage-tete">
          <span className="titre">Affichage public</span>
        </div>
        <div className="affichage-corps" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <span className="affichage-section">
            En attente du concours — inscrivez les équipes sur l'autre fenêtre.
          </span>
        </div>
      </div>
    )
  }

  return <Affichage tournoi={etat.tournoi} />
}
