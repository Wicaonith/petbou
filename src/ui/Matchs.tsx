import { useState } from 'react'
import { type Equipe, type Match, matchJoue, type Tournoi } from '../engine'

interface Props {
  tournoi: Tournoi
  onScore: (matchId: string, a: number, b: number) => void
  onAnnuler: (matchId: string) => void
}

export function Matchs({ tournoi, onScore, onAnnuler }: Props) {
  const parId = new Map(tournoi.equipes.map((e) => [e.id, e]))
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
            Saisissez les deux scores puis <kbd>Entrée</kbd>. Le terrain se libère aussitôt et
            passe au match suivant en attente.
          </p>
          <div className="matchs">
            {enAttente.map((m) => (
              <CarteMatch key={m.id} match={m} parId={parId} but={tournoi.config.butScore} onScore={onScore} />
            ))}
          </div>
        </div>
      )}

      {joues.length > 0 && (
        <div className="carte">
          <h2>Résultats ({joues.length})</h2>
          <div className="matchs">
            {joues.map((m) => (
              <CarteJouee key={m.id} match={m} parId={parId} onAnnuler={onAnnuler} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const nomDe = (parId: Map<string, Equipe>, id: string) => parId.get(id)?.nom ?? id

function Chapeau({ match }: { match: Match }) {
  return (
    <div className="chapeau">
      <span>
        {match.groupe ? `${match.groupe} · ` : ''}
        {match.libelle ?? `Tour ${match.tour}`}
      </span>
      {match.equipeB !== null &&
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
  onScore,
}: {
  match: Match
  parId: Map<string, Equipe>
  but: number
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
      <Chapeau match={match} />
      {([match.equipeA, match.equipeB] as const).map((id, k) =>
        id === null ? null : (
          <div className="camp" key={id}>
            <span className="nom">{nomDe(parId, id)}</span>
            <input
              inputMode="numeric"
              value={k === 0 ? a : b}
              aria-label={`Score de ${nomDe(parId, id)}`}
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
  onAnnuler,
}: {
  match: Match
  parId: Map<string, Equipe>
  onAnnuler: (id: string) => void
}) {
  const aGagne = match.equipeB === null || match.scoreA! > match.scoreB!
  return (
    <div className="match joue">
      <Chapeau match={match} />
      <div className={`camp${aGagne ? ' gagnant' : ''}`}>
        <span className="nom">{nomDe(parId, match.equipeA)}</span>
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
            <span className="nom">{nomDe(parId, match.equipeB)}</span>
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
