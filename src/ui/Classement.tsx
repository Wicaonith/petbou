import { classementDe, type Tournoi } from '../engine'
import { NumEquipe } from './NumEquipe'

export function Classement({ tournoi }: { tournoi: Tournoi }) {
  const lignes = classementDe(tournoi)

  if (lignes.length === 0) {
    return (
      <div className="carte">
        <p className="vide">Le classement apparaîtra dès la première équipe inscrite.</p>
      </div>
    )
  }

  return (
    <div className="carte">
      <h2>Classement</h2>
      <p className="aide">
        Départage : victoires, puis goal-average (différence de points), puis points marqués,
        puis confrontation directe.
      </p>
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: 'right' }}>Rang</th>
            <th>Équipe</th>
            <th>J</th>
            <th>V</th>
            <th>D</th>
            <th>Pour</th>
            <th>Contre</th>
            <th>Diff.</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.equipeId}>
              <td className="rang">{l.rang}</td>
              <td>
                <div className="equipe-nom">
                  <NumEquipe n={l.numero} />
                  {l.nom}
                </div>
                {l.exempts > 0 && (
                  <div className="equipe-joueurs">
                    {l.exempts} exempt{l.exempts > 1 ? 's' : ''}
                  </div>
                )}
              </td>
              <td>{l.joues}</td>
              <td>
                <strong>{l.victoires}</strong>
              </td>
              <td>{l.defaites}</td>
              <td>{l.pointsPour}</td>
              <td>{l.pointsContre}</td>
              <td>{l.diff > 0 ? `+${l.diff}` : l.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
