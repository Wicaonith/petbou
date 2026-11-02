import { type Equipe, type Match, matchJoue, parEquipeId, type Tournoi } from '../engine'
import { NomEquipe } from './Equipe'
import { dateFr } from './format'

/**
 * Feuilles de match à imprimer et à confier aux équipes.
 *
 * Sur un terrain, le score se note au crayon avant d'être rapporté à la table :
 * la feuille papier n'est pas un vestige, c'est ce qui permet de retrouver un
 * score contesté une heure plus tard.
 */
export function Feuilles({ tournoi }: { tournoi: Tournoi }) {
  const parId = parEquipeId(tournoi.equipes)
  const aJouer = tournoi.matchs.filter((m) => !matchJoue(m) && m.equipeB !== null)

  return (
    <div className="feuilles">
      {aJouer.map((m) => (
        <Feuille key={m.id} match={m} tournoi={tournoi} equipe={(id: string) => parId.get(id)} />
      ))}
    </div>
  )
}

function Feuille({
  match,
  tournoi,
  equipe,
}: {
  match: Match
  tournoi: Tournoi
  equipe: (id: string) => Equipe | undefined
}) {
  /** Sur le papier aussi : c'est par le numéro que la table retrouve la partie. */
  const camp = (id: string) => <NomEquipe equipe={equipe(id)} />
  return (
    <div className="feuille">
      <div className="feuille-tete">
        <span>
          {tournoi.nom || 'Concours'} · {dateFr(tournoi.date)}
        </span>
        {match.terrain !== null && <strong>Terrain {match.terrain}</strong>}
      </div>
      <div className="feuille-titre">
        {match.groupe ? `${match.groupe} · ` : ''}
        {match.libelle ?? `Tour ${match.tour}`} · partie en {tournoi.config.butScore} points
      </div>
      <table className="feuille-camps">
        <tbody>
          <tr>
            <td>{camp(match.equipeA)}</td>
            <td className="case" />
          </tr>
          <tr>
            <td>{camp(match.equipeB!)}</td>
            <td className="case" />
          </tr>
        </tbody>
      </table>
      <div className="feuille-pied">Signature du gagnant</div>
    </div>
  )
}
