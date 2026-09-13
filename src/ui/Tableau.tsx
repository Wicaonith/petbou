import { gagnant, libelleTour, matchJoue, type Equipe, type Match } from '../engine'
import { NumEquipe } from './NumEquipe'

/**
 * Un tableau à élimination directe dessiné en arbre.
 *
 * C'est la forme sous laquelle un joueur lit un tableau : il cherche sa ligne,
 * suit le trait, et voit qui l'attend au tour suivant. Une liste de parties ne
 * répond pas à cette question, alors que c'est la seule que les gens posent à
 * la table de marque.
 *
 * Les tours à venir sont dessinés vides plutôt qu'omis : c'est ce qui donne à
 * l'arbre sa forme dès le premier tour, et ce qui permet de voir combien de
 * parties restent avant la finale.
 */
export function Tableau({
  matchs,
  equipes,
}: {
  matchs: Match[]
  equipes: Map<string, Equipe>
}) {
  const parTour = new Map<number, Match[]>()
  for (const m of matchs) {
    const l = parTour.get(m.tour) ?? []
    l.push(m)
    parTour.set(m.tour, l)
  }

  const premier = parTour.get(1)?.length ?? 0
  if (premier === 0) return null
  const nbTours = Math.max(1, Math.ceil(Math.log2(premier * 2)))

  return (
    <div className="arbre">
      {Array.from({ length: nbTours }, (_, i) => {
        const attendus = Math.max(1, premier / 2 ** i)
        const ms = parTour.get(i + 1) ?? []
        // Les places non encore jouées restent vides : l'arbre garde sa forme.
        const cases = Array.from({ length: attendus }, (_, k) => ms[k] ?? null)
        return (
          <div className="arbre-tour" key={i}>
            <div className="arbre-tour-titre">{libelleTour(attendus * 2)}</div>
            <div className="arbre-colonne">
              {enPaires(cases).map((paire, k) => (
                <div className="arbre-paire" key={k}>
                  {paire.map((m, j) => (
                    <Partie key={j} match={m} equipes={equipes} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Deux par deux : c'est la paire qui porte le trait de jonction vers le tour suivant. */
function enPaires<T>(xs: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += 2) out.push(xs.slice(i, i + 2))
  return out
}

function Partie({ match, equipes }: { match: Match | null; equipes: Map<string, Equipe> }) {
  if (match === null) {
    return (
      <div className="arbre-partie vide">
        <div className="arbre-camp" />
        <div className="arbre-camp" />
      </div>
    )
  }

  const vainqueur = gagnant(match)
  return (
    <div className="arbre-partie">
      <Camp
        equipe={equipes.get(match.equipeA)}
        score={match.scoreA}
        gagne={matchJoue(match) && vainqueur === match.equipeA}
      />
      {match.equipeB === null ? (
        // L'équipe exempte passe le tour : la case d'en face reste barrée.
        <div className="arbre-camp exempt">Exempt</div>
      ) : (
        <Camp
          equipe={equipes.get(match.equipeB)}
          score={match.scoreB}
          gagne={matchJoue(match) && vainqueur === match.equipeB}
        />
      )}
    </div>
  )
}

function Camp({
  equipe,
  score,
  gagne,
}: {
  equipe: Equipe | undefined
  score: number | null
  gagne: boolean
}) {
  if (!equipe) return <div className="arbre-camp" />
  return (
    <div className={`arbre-camp${gagne ? ' gagnant' : ''}`}>
      <span className="arbre-nom">
        <NumEquipe n={equipe.numero} />
        {equipe.nom}
      </span>
      <span className="arbre-score">{score ?? ''}</span>
    </div>
  )
}
