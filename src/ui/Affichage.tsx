import { useEffect, useState } from 'react'
import {
  classementDe,
  classementParTableau,
  dernierTour,
  enCours,
  type Equipe,
  gereTerrains,
  type Match,
  matchJoue,
  matchsDuGroupe,
  parEquipeId,
  type Tournoi,
} from '../engine'
import { NomEquipe } from './Equipe'
import { Tableau } from './Tableau'
import { accord, goalAverage, LIBELLE_FORMATION } from './format'

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
  const tour = dernierTour(tournoi.matchs)
  // Les parties en cours d'abord, puis les derniers résultats pour remplir :
  // une équipe qui vient de rentrer veut voir son score, et entre deux tours
  // l'écran ne doit jamais être vide devant les joueurs.
  const joues = tournoi.matchs.filter(matchJoue).reverse()
  const lignes = classementDe(tournoi)
  const gere = gereTerrains(tournoi)
  const parId = parEquipeId(tournoi.equipes)
  // Pendant les tableaux, l'arbre remplace le classement : il dit à la fois où
  // en est chacun et qui l'attend, ce que la liste des victoires ne dit pas.
  const tableaux = classementParTableau(tournoi).filter((s) => s.groupe !== undefined)
  const montre = useRotation(tableaux.length)

  // Avec un arbre, les derniers résultats sont déjà lisibles dedans : les
  // répéter à côté vole la place du tableau. Ne restent à gauche que les
  // parties en cours, qui portent le numéro de terrain — la seule chose que
  // l'arbre ne dit pas. Aucune en cours : le tableau prend tout l'écran.
  const affiches = tableaux.length > 0 ? attente.slice(0, 12) : [...attente, ...joues].slice(0, 12)

  return (
    <div className="affichage">
      <div className="affichage-tete">
        <span className="titre">{tournoi.nom || 'Concours'}</span>
        <span className="meta">
          {LIBELLE_FORMATION[tournoi.formation].singulier} · {tournoi.equipes.length} équipes
        </span>
        <span className="tour">{tour > 0 ? `Tour ${tour}` : 'Avant le tirage'}</span>
        {onFermer && (
          <button className="fermer" onClick={onFermer} aria-label="Quitter l'affichage public">
            Échap
          </button>
        )}
      </div>

      <div className="affichage-corps">
        {affiches.length > 0 && (
          <div className="affichage-parties">
            <div className="affichage-section">
              {attente.length > 0
                ? `${attente.length} partie${accord(attente.length)} en cours`
                : 'Derniers résultats'}
            </div>
            <div className="affichage-grille">
              {affiches.map((m) => (
                <Partie key={m.id} match={m} equipes={parId} gere={gere} />
              ))}
            </div>
          </div>
        )}

        <div
          className={`affichage-classement${tableaux.length > 0 ? ' large' : ''}${
            affiches.length === 0 ? ' seul' : ''
          }`}
        >
          {tableaux.length > 0 ? (
            <>
              <div className="affichage-section">
                {tableaux[montre].titre}
                {tableaux.length > 1 && ` — ${montre + 1} sur ${tableaux.length}`}
              </div>
              <Tableau
                matchs={matchsDuGroupe(tournoi.matchs, tableaux[montre].groupe!)}
                equipes={parId}
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
                  <NomEquipe equipe={l} />
                </span>
                <span className="v">{l.victoires}</span>
                <span className="diff">{goalAverage(l.diff)}</span>
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      </div>

      <div className="affichage-pied">
        {attente.length > 0
          ? `${attente.length} partie${accord(attente.length)} encore en jeu · le tour suivant démarrera dès le dernier score saisi`
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

function Partie({
  match,
  equipes,
  gere,
}: {
  match: Match
  equipes: Map<string, Equipe>
  gere: boolean
}) {
  const nom = (id: string) => <NomEquipe equipe={equipes.get(id)} />
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
