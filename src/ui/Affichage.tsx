import { useEffect } from 'react'
import {
  classementDe,
  enCours,
  gereTerrains,
  type Match,
  matchJoue,
  type Tournoi,
} from '../engine'

/**
 * Écran public, à projeter ou à brancher sur une télé du club.
 *
 * Il est volontairement mort : aucune saisie, aucun bouton. C'est ce qui permet
 * de le laisser sans surveillance devant les joueurs, et ça répond à la seule
 * question qu'ils viennent poser à la table de marque — « je joue où, contre qui,
 * et où j'en suis ».
 */
export function Affichage({ tournoi, onFermer }: { tournoi: Tournoi; onFermer: () => void }) {
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {
      // Refusé (navigateur, réglage système) : l'écran reste utilisable en fenêtre.
    })
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', touche)
    return () => {
      window.removeEventListener('keydown', touche)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [onFermer])

  const attente = enCours(tournoi)
  const dernierTour = tournoi.matchs.reduce((max, m) => Math.max(max, m.tour), 0)
  // Les parties en cours d'abord, puis les derniers résultats pour remplir :
  // une équipe qui vient de rentrer veut voir son score, et entre deux tours
  // l'écran ne doit jamais être vide devant les joueurs.
  const joues = tournoi.matchs.filter(matchJoue).reverse()
  const affiches = [...attente, ...joues].slice(0, 12)
  const lignes = classementDe(tournoi)
  const gere = gereTerrains(tournoi)

  return (
    <div className="affichage">
      <div className="affichage-tete">
        <span className="titre">{tournoi.nom || 'Concours'}</span>
        <span className="meta">
          {tournoi.formation} · {tournoi.equipes.length} équipes
        </span>
        <span className="tour">{dernierTour > 0 ? `Tour ${dernierTour}` : 'Avant le tirage'}</span>
        <button className="fermer" onClick={onFermer} aria-label="Quitter l'affichage public">
          Échap
        </button>
      </div>

      <div className="affichage-corps">
        <div className="affichage-parties">
          <div className="affichage-section">
            {attente.length > 0
              ? `${attente.length} partie${attente.length > 1 ? 's' : ''} en cours`
              : 'Derniers résultats'}
          </div>
          <div className="affichage-grille">
            {affiches.map((m) => (
              <Partie key={m.id} match={m} tournoi={tournoi} gere={gere} />
            ))}
          </div>
        </div>

        <div className="affichage-classement">
          <div className="affichage-section">Classement</div>
          <div className="affichage-table">
            {lignes.slice(0, 10).map((l) => (
              <div className={`affichage-rang${l.rang <= 2 ? ' tete' : ''}`} key={l.equipeId}>
                <span className="rang">{l.rang}</span>
                <span className="nom">{l.nom}</span>
                <span className="v">{l.victoires}</span>
                <span className="diff">{l.diff > 0 ? `+${l.diff}` : l.diff}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="affichage-pied">
        {attente.length > 0
          ? `${attente.length} partie${attente.length > 1 ? 's' : ''} encore en jeu · le tour suivant démarrera dès le dernier score saisi`
          : 'Tirage du tour suivant en préparation à la table de marque'}
      </div>
    </div>
  )
}

function Partie({ match, tournoi, gere }: { match: Match; tournoi: Tournoi; gere: boolean }) {
  const nom = (id: string) => tournoi.equipes.find((e) => e.id === id)?.nom ?? id
  const joue = matchJoue(match)
  const aGagne = joue && match.scoreB !== null && match.scoreA! > match.scoreB
  const score = (v: number | null, gagnant: boolean) => (
    <span className={`score${joue && gagnant ? ' gagnant' : ''}`}>{joue ? v : '–'}</span>
  )

  return (
    <div className={`affichage-partie${joue ? ' jouee' : ''}`}>
      <div className="chapeau">
        <span>
          {match.groupe ? `${match.groupe} · ` : ''}
          {match.libelle ?? `Tour ${match.tour}`}
        </span>
        {gere && match.terrain !== null && <span className="terrain">T{match.terrain}</span>}
      </div>
      <div className="camp">
        <span className="nom">{nom(match.equipeA)}</span>
        {score(match.scoreA, aGagne)}
      </div>
      <div className="camp">
        <span className="nom">{match.equipeB === null ? 'Exempt' : nom(match.equipeB)}</span>
        {score(match.scoreB, joue && !aGagne)}
      </div>
    </div>
  )
}
