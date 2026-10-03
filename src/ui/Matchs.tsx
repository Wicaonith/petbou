import { useState } from 'react'
import { type Equipe as EquipeT, gereTerrains, type Match, matchJoue, type Tournoi } from '../engine'
import { NomEquipe as Equipe } from './Equipe'

interface Props {
  tournoi: Tournoi
  onScore: (matchId: string, a: number, b: number) => void
  onAnnuler: (matchId: string) => void
}

/**
 * L'écran de la table de marque : saisir les scores, et rien d'autre.
 *
 * C'est le seul écran ouvert toute la journée, consulté debout, par quelqu'un
 * qu'une équipe vient d'interrompre. D'où une carte par partie plutôt qu'un
 * tableau — on vise la bonne du regard, pas la bonne ligne — et le score du
 * perdant seul à taper, celui du gagnant étant toujours le but.
 *
 * Les résultats restent affichés en dessous, et chacun reste corrigible : c'est
 * là qu'on revient quand un score est contesté une heure plus tard.
 */
export function Matchs({ tournoi, onScore, onAnnuler }: Props) {
  const parId = new Map(tournoi.equipes.map((e) => [e.id, e]))
  const gere = gereTerrains(tournoi)
  const enAttente = tournoi.matchs.filter((m) => !matchJoue(m))
  const joues = tournoi.matchs.filter(matchJoue).reverse()

  if (tournoi.matchs.length === 0) {
    return (
      <div className="carte">
        <p className="vide">
          Aucun match lancé. Vérifiez les équipes, puis lancez le premier tour.
        </p>
      </div>
    )
  }

  return (
    <>
      {enAttente.length > 0 && (
        <div className="carte">
          <h2>À jouer ({enAttente.length})</h2>
          <p className="aide">
            Saisissez le score du perdant, le {tournoi.config.butScore} du gagnant se met tout
            seul, puis <kbd>Entrée</kbd>.
            {gere && ' Le terrain se libère aussitôt et passe au match suivant en attente.'}
          </p>
          <div className="matchs">
            {enAttente.map((m) => (
              <CarteMatch
                key={m.id}
                match={m}
                parId={parId}
                but={tournoi.config.butScore}
                gere={gere}
                onScore={onScore}
              />
            ))}
          </div>
        </div>
      )}

      {joues.length > 0 && (
        <div className="carte">
          <h2>Résultats ({joues.length})</h2>
          <div className="matchs">
            {joues.map((m) => (
              <CarteJouee key={m.id} match={m} parId={parId} gere={gere} onAnnuler={onAnnuler} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const equipeDe = (parId: Map<string, EquipeT>, id: string): EquipeT =>
  parId.get(id) ?? { id, numero: 0, nom: id, joueurs: [] }

/** L'enveloppe propre à cet écran ; le dossard et les noms viennent du commun. */
function NomEquipe({ parId, id }: { parId: Map<string, EquipeT>; id: string }) {
  return (
    <span className="nom">
      <Equipe equipe={equipeDe(parId, id)} />
    </span>
  )
}

function Chapeau({ match, gere }: { match: Match; gere: boolean }) {
  return (
    <div className="chapeau">
      <span>
        {match.groupe ? `${match.groupe} · ` : ''}
        {match.libelle ?? `Tour ${match.tour}`}
      </span>
      {/* Sans gestion des terrains il n'y a rien à annoncer : ni numéro, ni attente.
          Une partie jouée non plus : saisir son score libère le terrain, et
          annoncer « en attente » sur un résultat ferait croire qu'elle reste à
          jouer — au milieu d'une liste de trente résultats, le jour du concours. */}
      {gere &&
        match.equipeB !== null &&
        !matchJoue(match) &&
        (match.terrain !== null ? (
          <span className="terrain">Terrain {match.terrain}</span>
        ) : (
          <span className="terrain attente">En attente d'un terrain</span>
        ))}
    </div>
  )
}

function CarteMatch({
  match,
  parId,
  but,
  gere,
  onScore,
}: {
  match: Match
  parId: Map<string, EquipeT>
  but: number
  gere: boolean
  onScore: (id: string, a: number, b: number) => void
}) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const na = Number(a)
  const nb = Number(b)
  const valide =
    a !== '' && b !== '' && Number.isInteger(na) && Number.isInteger(nb) && na >= 0 && nb >= 0 && na !== nb

  const valider = () => valide && onScore(match.id, na, nb)

  return (
    <div className="match">
      <Chapeau match={match} gere={gere} />
      {([match.equipeA, match.equipeB] as const).map((id, k) =>
        id === null ? null : (
          <div className="camp" key={id}>
            <NomEquipe parId={parId} id={id} />
            <input
              inputMode="numeric"
              value={k === 0 ? a : b}
              aria-label={`Score de l'équipe ${equipeDe(parId, id).numero}, ${equipeDe(parId, id).nom}`}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                // Saisir le score du perdant suffit : le gagnant est au but.
                if (k === 0) {
                  setA(v)
                  if (b === '' && v !== '' && Number(v) < but) setB(String(but))
                } else {
                  setB(v)
                  if (a === '' && v !== '' && Number(v) < but) setA(String(but))
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && valider()}
            />
          </div>
        ),
      )}
      <div className="pied">
        <button className="action" style={{ flex: 1 }} onClick={valider} disabled={!valide}>
          Valider
        </button>
      </div>
    </div>
  )
}

function CarteJouee({
  match,
  parId,
  gere,
  onAnnuler,
}: {
  match: Match
  parId: Map<string, EquipeT>
  gere: boolean
  onAnnuler: (id: string) => void
}) {
  const aGagne = match.equipeB === null || match.scoreA! > match.scoreB!
  return (
    <div className="match joue">
      <Chapeau match={match} gere={gere} />
      <div className={`camp${aGagne ? ' gagnant' : ''}`}>
        <NomEquipe parId={parId} id={match.equipeA} />
        <span className="score-fige">{match.scoreA}</span>
      </div>
      {match.equipeB === null ? (
        <div className="camp">
          <span className="nom">
            Exempt<small>Victoire acquise, ne compte pas comme match joué</small>
          </span>
          <span className="score-fige">{match.scoreB}</span>
        </div>
      ) : (
        <>
          <div className={`camp${aGagne ? '' : ' gagnant'}`}>
            <NomEquipe parId={parId} id={match.equipeB} />
            <span className="score-fige">{match.scoreB}</span>
          </div>
          <div className="pied">
            <button className="secondaire" onClick={() => onAnnuler(match.id)}>
              Corriger ce score
            </button>
          </div>
        </>
      )}
    </div>
  )
}
