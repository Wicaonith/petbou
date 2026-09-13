import { useEffect, useState } from 'react'
import {
  classementDe,
  classementParTableau,
  enCours,
  gereTerrains,
  type Match,
  matchJoue,
  type Tournoi,
} from '../engine'
import { NumEquipe } from './NumEquipe'
import { Tableau } from './Tableau'

/**
 * Écran public, à projeter ou à brancher sur une télé du club.
 *
 * Il est volontairement mort : aucune saisie, aucun bouton. C'est ce qui permet
 * de le laisser sans surveillance devant les joueurs, et ça répond à la seule
 * question qu'ils viennent poser à la table de marque — « je joue où, contre qui,
 * et où j'en suis ».
 */
export function Affichage({ tournoi, onFermer }: { tournoi: Tournoi; onFermer?: () => void }) {
  // Sans `onFermer`, l'écran occupe sa propre fenêtre : ni plein écran forcé,
  // ni touche Échap — c'est la fenêtre elle-même que l'on ferme.
  useEffect(() => {
    if (!onFermer) return
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
  // Pendant les tableaux, l'arbre remplace le classement : il dit à la fois où
  // en est chacun et qui l'attend, ce que la liste des victoires ne dit pas.
  const tableaux = classementParTableau(tournoi).filter((s) => s.groupe !== undefined)
  const montre = useRotation(tableaux.length)

  return (
    <div className="affichage">
      <div className="affichage-tete">
        <span className="titre">{tournoi.nom || 'Concours'}</span>
        <span className="meta">
          {tournoi.formation} · {tournoi.equipes.length} équipes
        </span>
        <span className="tour">{dernierTour > 0 ? `Tour ${dernierTour}` : 'Avant le tirage'}</span>
        {onFermer && (
          <button className="fermer" onClick={onFermer} aria-label="Quitter l'affichage public">
            Échap
          </button>
        )}
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

        <div className={`affichage-classement${tableaux.length > 0 ? ' large' : ''}`}>
          {tableaux.length > 0 ? (
            <>
              <div className="affichage-section">
                {tableaux[montre].titre}
                {tableaux.length > 1 && ` — ${montre + 1} sur ${tableaux.length}`}
              </div>
              <Tableau
                matchs={tournoi.matchs.filter((m) => m.groupe === tableaux[montre].groupe)}
                equipes={new Map(tournoi.equipes.map((e) => [e.id, e]))}
              />
            </>
          ) : (
            <>
          <div className="affichage-section">Classement</div>
          <div className="affichage-table">
            {lignes.slice(0, 10).map((l) => (
              <div className={`affichage-rang${l.rang <= 2 ? ' tete' : ''}`} key={l.equipeId}>
                <span className="rang">{l.rang}</span>
                <span className="nom">
                  <NumEquipe n={l.numero} />
                  {l.nom}
                </span>
                <span className="v">{l.victoires}</span>
                <span className="diff">{l.diff > 0 ? `+${l.diff}` : l.diff}</span>
              </div>
            ))}
          </div>
            </>
          )}
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

/**
 * Fait défiler les tableaux, un à la fois.
 *
 * Trois arbres côte à côte sur un vidéoprojecteur seraient illisibles, et
 * n'en montrer qu'un priverait les joueurs des autres. Le titre reste affiché
 * en permanence pour que personne ne se demande lequel il regarde.
 */
function useRotation(combien: number): number {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (combien < 2) return
    const t = setInterval(() => setI((x) => (x + 1) % combien), 12000)
    return () => clearInterval(t)
  }, [combien])
  return combien === 0 ? 0 : i % combien
}

function Partie({ match, tournoi, gere }: { match: Match; tournoi: Tournoi; gere: boolean }) {
  const equipe = (id: string) => tournoi.equipes.find((e) => e.id === id)
  /** Le dossard reste lisible de loin même quand les noms sont longs. */
  const nom = (id: string) => {
    const e = equipe(id)
    if (!e) return id
    return (
      <>
        <NumEquipe n={e.numero} />
        {e.nom}
      </>
    )
  }
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
