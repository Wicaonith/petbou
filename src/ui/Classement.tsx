import { classementParTableau, type Section, type Tournoi } from '../engine'
import { NumEquipe } from './NumEquipe'

/**
 * Le classement, découpé par tableau quand le format en comporte plusieurs.
 *
 * Une seule liste mélangerait des victoires qui n'ont pas la même valeur :
 * gagner trois parties dans le tableau C n'est pas comparable à perdre la
 * finale du A. Le moteur décide du découpage, l'écran ne fait que le montrer.
 */
export function Classement({ tournoi }: { tournoi: Tournoi }) {
  const sections = classementParTableau(tournoi)
  const vide = sections.every((s) => s.lignes.length === 0)

  if (vide) {
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
      {sections.map((s) => (
        <SectionClassement key={s.titre} section={s} plusieurs={sections.length > 1} />
      ))}
    </div>
  )
}

function SectionClassement({ section, plusieurs }: { section: Section; plusieurs: boolean }) {
  if (section.lignes.length === 0) return null
  const gagnante = section.lignes.find((l) => l.equipeId === section.vainqueur)

  return (
    <div className="section-tableau">
      {plusieurs && (
        <div className="section-tete">
          <h3>{section.titre}</h3>
          {/* Le vainqueur du tableau est le résultat ; le tri des autres lignes
              n'est qu'un ordre d'arrivée. On le dit plutôt que de le laisser
              deviner par la première ligne. */}
          {gagnante && (
            <span className="section-vainqueur">
              Vainqueur : <NumEquipe n={gagnante.numero} />
              {gagnante.nom}
            </span>
          )}
        </div>
      )}
      <table className="classement">
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
          {section.lignes.map((l) => (
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
