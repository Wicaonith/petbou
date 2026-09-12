import { type Match, matchJoue, type Tournoi } from '../engine'

/**
 * Feuilles de match à imprimer et à confier aux équipes.
 *
 * Sur un terrain, le score se note au crayon avant d'être rapporté à la table :
 * la feuille papier n'est pas un vestige, c'est ce qui permet de retrouver un
 * score contesté une heure plus tard.
 */
export function Feuilles({ tournoi }: { tournoi: Tournoi }) {
  const parId = new Map(tournoi.equipes.map((e) => [e.id, e]))
  const aJouer = tournoi.matchs.filter((m) => !matchJoue(m) && m.equipeB !== null)

  return (
    <div className="feuilles">
      {aJouer.map((m) => (
        <Feuille key={m.id} match={m} tournoi={tournoi} nom={(id: string) => parId.get(id)?.nom ?? id} />
      ))}
    </div>
  )
}

/** Une feuille qui part sur le terrain se lit en français, pas en ISO. */
function dateFr(iso: string): string {
  const [a, m, j] = iso.split('-')
  return j ? `${j}/${m}/${a}` : iso
}

function Feuille({
  match,
  tournoi,
  nom,
}: {
  match: Match
  tournoi: Tournoi
  nom: (id: string) => string
}) {
  return (
    <div className="feuille">
      <div className="feuille-tete">
        <span>
          {tournoi.nom || 'Concours'} · {dateFr(tournoi.date)}
        </span>
        <strong>Terrain {match.terrain ?? '—'}</strong>
      </div>
      <div className="feuille-titre">
        {match.groupe ? `${match.groupe} · ` : ''}
        {match.libelle ?? `Tour ${match.tour}`} · partie en {tournoi.config.butScore} points
      </div>
      <table className="feuille-camps">
        <tbody>
          <tr>
            <td>{nom(match.equipeA)}</td>
            <td className="case" />
          </tr>
          <tr>
            <td>{nom(match.equipeB!)}</td>
            <td className="case" />
          </tr>
        </tbody>
      </table>
      <div className="feuille-pied">Signature du gagnant</div>
    </div>
  )
}
