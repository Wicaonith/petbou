import { classementDe, matchJoue, type Tournoi } from '../engine'
import { NumEquipe } from './NumEquipe'

/**
 * Bilan de fin de concours, une page A4 à imprimer ou à punaiser au club.
 *
 * Le podium d'abord, parce que c'est ce que les gens viennent regarder, puis le
 * classement complet : dans une association tout le monde veut voir sa ligne,
 * pas seulement les trois premiers.
 */
export function Bilan({ tournoi }: { tournoi: Tournoi }) {
  const lignes = classementDe(tournoi)
  const podium = lignes.slice(0, 3)
  const joues = tournoi.matchs.filter((m) => matchJoue(m) && m.equipeB !== null).length
  const tours = tournoi.matchs.reduce((max, m) => Math.max(max, m.tour), 0)
  const parId = new Map(tournoi.equipes.map((e) => [e.id, e]))

  const joueursDe = (id: string) => parId.get(id)?.joueurs.map((j) => j.nom) ?? []

  return (
    <div className="bilan">
      <div className="bilan-tete">
        <div className="bilan-titre">{tournoi.nom || 'Concours'}</div>
        <div className="bilan-sous">
          {tournoi.formation} · {tournoi.equipes.length} équipes
          {tournoi.nbTerrains !== null && ` · ${tournoi.nbTerrains} terrains`} · parties en{' '}
          {tournoi.config.butScore} points · {dateFr(tournoi.date)}
        </div>
      </div>

      {podium.length === 3 && (
        <div className="bilan-podium">
          {[podium[1], podium[0], podium[2]].map((l, i) => {
            const place = i === 1 ? 1 : i === 0 ? 2 : 3
            return (
              <div className={`marche${place === 1 ? ' premier' : ''}`} key={l.equipeId}>
                {/* Écrit en toutes lettres : « 2e » passé en majuscules donnerait « 2E ». */}
                <div className="place">
                  {place === 1 ? 'Vainqueurs' : place === 2 ? 'Deuxième' : 'Troisième'}
                </div>
                <div className="qui">
                  {joueursDe(l.equipeId).map((n) => (
                    <div key={n}>{n}</div>
                  ))}
                </div>
                <div className="bilan-detail">
                  {l.victoires} victoire{l.victoires > 1 ? 's' : ''} ·{' '}
                  {l.diff > 0 ? `+${l.diff}` : l.diff}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bilan-section">Classement complet</div>
      <table className="bilan-table">
        <thead>
          <tr>
            <th>Rang</th>
            <th style={{ textAlign: 'left' }}>Équipe</th>
            <th>J</th>
            <th>V</th>
            <th>Pour</th>
            <th>Contre</th>
            <th>Diff.</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.equipeId}>
              <td className={l.rang <= 3 ? 'rang podium' : 'rang'}>{l.rang}</td>
              <td style={{ textAlign: 'left' }}>
                <NumEquipe n={l.numero} />
                {l.nom}
              </td>
              <td>{l.joues}</td>
              <td>
                <strong>{l.victoires}</strong>
              </td>
              <td>{l.pointsPour}</td>
              <td>{l.pointsContre}</td>
              <td>{l.diff > 0 ? `+${l.diff}` : l.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bilan-pied">
        <span>
          Départage : victoires, puis goal-average (différence de points),
          <br />
          puis points marqués, puis confrontation directe.
        </span>
        <span style={{ textAlign: 'right' }}>
          {joues} partie{joues > 1 ? 's' : ''} jouée{joues > 1 ? 's' : ''} · {tours} tour
          {tours > 1 ? 's' : ''}
          <br />
          Édité le {dateFr(new Date().toISOString().slice(0, 10))}
        </span>
      </div>
    </div>
  )
}

const dateFr = (iso: string): string => {
  const [a, m, j] = iso.split('-')
  return j ? `${j}/${m}/${a}` : iso
}
