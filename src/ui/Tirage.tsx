import {
  type Equipe,
  enCours,
  gereTerrains,
  type NouveauMatch,
  nomPoule,
  peutRetirer,
  propositionDe,
  repartir,
  termine,
  type Tournoi,
} from '../engine'

interface Props {
  tournoi: Tournoi
  onRetirer: () => void
  onValider: () => void
}

/**
 * Le tirage au sort, en tant que moment.
 *
 * Au boulodrome, le tirage est une annonce : les gens se rassemblent, on lit
 * les poules à voix haute. Le faire en silence au clic d'un bouton « lancer »
 * prive l'opérateur du seul instant où il peut encore corriger quelque chose.
 * Ici rien ne part sur les terrains tant que le tirage n'est pas validé.
 */
export function Tirage({ tournoi, onRetirer, onValider }: Props) {
  const proposition = propositionDe(tournoi)
  const premier = tournoi.matchs.length === 0

  if (tournoi.equipes.length < 2) {
    return (
      <div className="carte">
        <p className="vide">Inscrivez au moins deux équipes complètes pour pouvoir tirer.</p>
      </div>
    )
  }

  if (proposition.length === 0) {
    const attente = enCours(tournoi).length
    return (
      <div className="carte">
        <p className="vide">
          {termine(tournoi)
            ? 'Concours terminé : il n’y a plus rien à tirer.'
            : `Le tour en cours n’est pas fini. Il reste ${attente} score${
                attente > 1 ? 's' : ''
              } à saisir avant le prochain tirage.`}
        </p>
      </div>
    )
  }

  const tour = Math.max(...proposition.map((m) => m.tour))

  return (
    <>
      <div className="bandeau">
        Tirage {premier ? 'du premier tour' : `du tour ${tour}`} — <strong>pas encore validé</strong>
        . Rien n’est parti sur les terrains
        {peutRetirer(tournoi) ? ' : vous pouvez le relancer autant de fois que nécessaire.' : '.'}
      </div>

      {premier && tournoi.config.format === 'poules' ? (
        <CompositionDesPoules tournoi={tournoi} />
      ) : (
        <Affiches tournoi={tournoi} proposition={proposition} />
      )}

      <div className="carte">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="action" onClick={onValider}>
            {gereTerrains(tournoi) ? 'Valider et envoyer sur les terrains' : 'Valider le tirage'}
          </button>
          {peutRetirer(tournoi) && (
            <button className="secondaire" onClick={onRetirer}>
              Relancer le tirage
            </button>
          )}
          <span style={{ marginLeft: 'auto', textAlign: 'right' }} className="aide">
            Tirage n° {tournoi.config.graine}
            <br />
            Ce numéro permet de refaire exactement le même tirage en cas de contestation.
          </span>
        </div>
        {!peutRetirer(tournoi) && (
          <p className="aide" style={{ margin: '14px 0 0' }}>
            Le concours a commencé : ce tirage découle des résultats déjà saisis et ne peut plus
            être relancé.
          </p>
        )}
      </div>
    </>
  )
}

function CompositionDesPoules({ tournoi }: { tournoi: Tournoi }) {
  const poules = repartir(tournoi.equipes, tournoi.config.graine ?? 1)
  return (
    <div className="carte">
      <h2>Composition des poules</h2>
      <p className="aide">
        Premier tour : 1 contre 2 et 3 contre 4 dans chaque poule. Puis match des gagnants, match
        des perdants, et barrage pour la seconde qualification.
      </p>
      <div className="poules">
        {poules.map((equipes, i) => (
          <div className="poule" key={i}>
            <div className="poule-tete">{nomPoule(i)}</div>
            {equipes.map((e, k) => (
              <div className="poule-ligne" key={e.id}>
                <span className="poule-rang">{k + 1}</span>
                <span>{e.nom}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Affiches({ tournoi, proposition }: { tournoi: Tournoi; proposition: NouveauMatch[] }) {
  const parId = new Map<string, Equipe>(tournoi.equipes.map((e) => [e.id, e]))
  const nom = (id: string) => parId.get(id)?.nom ?? id

  // Les tableaux A/B/C et les poules se lisent groupe par groupe, pas en vrac.
  const groupes = [...new Set(proposition.map((m) => m.groupe ?? ''))]

  return (
    <div className="carte">
      <h2>
        {proposition.length} partie{proposition.length > 1 ? 's' : ''} à lancer
      </h2>
      {groupes.map((g) => (
        <div key={g} style={{ marginBottom: 16 }}>
          {g && <h3 style={{ fontSize: 14, color: 'var(--discret)', margin: '0 0 10px' }}>{g}</h3>}
          <div className="matchs">
            {proposition
              .filter((m) => (m.groupe ?? '') === g)
              .map((m, i) => (
                <div className="match" key={`${g}-${i}`}>
                  <div className="chapeau">
                    <span>{m.libelle ?? `Tour ${m.tour}`}</span>
                  </div>
                  <div className="camp">
                    <span className="nom">{nom(m.equipeA)}</span>
                  </div>
                  <div className="camp">
                    <span className="nom">
                      {m.equipeB === null ? (
                        <>
                          Exempt
                          <small>Passe le tour, victoire acquise</small>
                        </>
                      ) : (
                        nom(m.equipeB)
                      )}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
