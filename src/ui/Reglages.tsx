import {
  driverDe,
  type FormatId,
  type Formation,
  SCORE_EXEMPT_DEFAUT,
  type Tournoi,
  toursRecommandes,
} from '../engine'
import { Deroulement } from './Deroulement'
import type { Onglet } from './onglets'

/**
 * Les formats présentés par ce que le club en obtient, pas par leur nom de
 * règlement : « système suisse » ne dit rien à quelqu'un qui organise son
 * premier concours, « tout le monde joue toute la journée » si.
 */
const FORMATS: { id: FormatId; titre: string; quand: string; conseille?: boolean }[] = [
  {
    id: 'poules',
    titre: 'Poules',
    quand: 'Des groupes de 4 équipes, puis les 2 meilleures de chaque groupe continuent : les premières dans le tableau A, les deuxièmes dans le tableau B. Chacun joue au moins 2 parties.',
  },
  {
    id: 'suisse',
    titre: 'Tout le monde joue tous les tours',
    quand: 'Personne n’est éliminé. Chaque équipe joue le même nombre de parties, contre des équipes qui ont gagné autant qu’elle. Tout le monde joue toute la journée, et il n’y a aucun tableau à suivre.',
    conseille: true,
  },
  {
    id: 'multichances',
    titre: 'Deuxième chance',
    quand: 'Battu dès la première partie, on repart dans un second tableau au lieu de rentrer chez soi. Chacun joue au moins 2 parties.',
  },
  {
    id: 'seeding',
    titre: 'Élimination directe',
    quand: 'On perd, on sort. La moitié des équipes rentre après une seule partie. Réservez-le aux concours courts.',
  },
]
/**
 * Le premier écran : ce qu'il faut décider avant de taper le moindre nom.
 *
 * Presque tout y est facultatif. Le nom et la date ne servent qu'aux papiers, les
 * terrains se laissent vides si le club ne les numérote pas, et le score de
 * l'exempt a une valeur d'usage. Seul le format engage vraiment la journée,
 * d'où la place qu'il occupe et le déroulement qui le suit.
 *
 * Les réglages propres à un format ne s'affichent que pour lui — le nombre de
 * tours pour le suisse, les tableaux finals pour les poules. Les trois autres
 * formats ne les lisent jamais, et n'ont donc pas à se demander ce que c'est.
 */
export function Reglages({
  tournoi,
  lance,
  regler,
  setTournoi,
  aller,
}: {
  tournoi: Tournoi
  lance: boolean
  regler: <K extends keyof Tournoi>(cle: K, valeur: Tournoi[K]) => void
  setTournoi: (maj: (t: Tournoi) => Tournoi) => void
  aller: (o: Onglet) => void
}) {
  const config = (
    champ: 'format' | 'butScore' | 'nbTours' | 'tableauFinal' | 'scoreExempt',
    valeur: unknown,
  ) =>
    setTournoi((t) => ({ ...t, config: { ...t.config, [champ]: valeur } }))

  const prevus = driverDe(tournoi).toursPrevus(tournoi.equipes.length, tournoi.config)

  return (
    <>
      <div className="carte">
        <h2>Le concours</h2>
        <div className="grille">
          <div>
            <label htmlFor="nom">Nom</label>
            <input id="nom" value={tournoi.nom} onChange={(e) => regler('nom', e.target.value)} />
          </div>
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={tournoi.date} onChange={(e) => regler('date', e.target.value)} />
          </div>
          <div>
            <label htmlFor="formation">Formation</label>
            <select
              id="formation"
              value={tournoi.formation}
              disabled={lance}
              onChange={(e) => regler('formation', e.target.value as Formation)}
            >
              <option value="tete-a-tete">Tête-à-tête (1 joueur)</option>
              <option value="doublette">Doublette (2 joueurs)</option>
              <option value="triplette">Triplette (3 joueurs)</option>
            </select>
          </div>
          <div>
            <label htmlFor="terrains">Nombre de terrains (facultatif)</label>
            <input
              id="terrains"
              type="number"
              min={1}
              max={60}
              placeholder="Non gérés"
              value={tournoi.nbTerrains ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim()
                regler('nbTerrains', v === '' ? null : Math.max(1, Number(v) || 1))
              }}
            />
          </div>
          <div>
            <label htmlFor="but">Partie en</label>
            <select id="but" value={tournoi.config.butScore} onChange={(e) => config('butScore', Number(e.target.value))}>
              <option value={13}>13 points</option>
              <option value={11}>11 points</option>
            </select>
          </div>
        </div>
        <p className="aide" style={{ margin: '16px 0 0' }}>
          Laissez les terrains vides si vous ne les numérotez pas : les parties seront
          simplement annoncées ensemble, sans attribution ni attente.
        </p>

        <ScoreExempt tournoi={tournoi} config={config} />
      </div>

      <div className="carte">
        <h2>Format</h2>
        <p className="aide">
          Vous n'indiquez que le nombre d'équipes : le logiciel en déduit les poules, les tours
          et le tableau. {tournoi.equipes.length > 0 && prevus > 0 && (
            <>
              Avec {tournoi.equipes.length} équipes, ce format se joue en <strong>{prevus} tours</strong>.
            </>
          )}
        </p>
        <div className="grille">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              className="secondaire"
              disabled={lance}
              onClick={() => config('format', f.id)}
              style={{
                textAlign: 'left',
                padding: 16,
                borderColor: tournoi.config.format === f.id ? 'var(--accent)' : undefined,
                borderWidth: tournoi.config.format === f.id ? 2 : 1,
                background: tournoi.config.format === f.id ? 'var(--accent-clair)' : undefined,
              }}
            >
              <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>
                {f.titre}
                {f.conseille && <span className="conseille">conseillé</span>}
              </strong>
              <span style={{ color: 'var(--discret)', fontSize: 13, fontWeight: 400 }}>{f.quand}</span>
            </button>
          ))}
        </div>

        {tournoi.config.format === 'poules' && (
          <div style={{ marginTop: 20 }}>
            <label className="case">
              <input
                type="checkbox"
                disabled={lance}
                checked={tournoi.config.tableauFinal !== false}
                onChange={(e) => config('tableauFinal', e.target.checked)}
              />
              Enchaîner sur les tableaux finals
            </label>
            <p className="aide" style={{ marginTop: 8 }}>
              Les premières de chaque groupe jouent le tableau A, les deuxièmes le tableau B,
              jusqu’à un vainqueur dans chacun. Décochez si le concours doit s’arrêter à la fin
              des poules.
            </p>
          </div>
        )}

        {tournoi.config.format === 'suisse' && (
          <div style={{ marginTop: 20, maxWidth: 240 }}>
            <label htmlFor="tours">Nombre de tours</label>
            <input
              id="tours"
              type="number"
              min={1}
              max={12}
              disabled={lance}
              value={tournoi.config.nbTours ?? toursRecommandes(tournoi.equipes.length)}
              onChange={(e) => config('nbTours', Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="aide" style={{ marginTop: 8 }}>
              Recommandé : {toursRecommandes(tournoi.equipes.length)} pour {tournoi.equipes.length} équipes.
            </p>
          </div>
        )}

        <Deroulement tournoi={tournoi} />

        {/* Le format choisi, la page est finie : le pas suivant se prend ici, sans
            remonter chercher un onglet. Dire « joueurs » et non « équipes », parce
            que ce qui se tape est une liste de noms. */}
        <button className="action" style={{ marginTop: 24 }} onClick={() => aller('equipes')}>
          {lance ? 'Voir les équipes engagées' : 'Saisir les joueurs'}
        </button>
      </div>
    </>
  )
}

/**
 * Ce que marque une équipe exempte.
 *
 * L'exempt est toujours une victoire — la question est de savoir s'il compte
 * aussi au goal-average. Le 13-7 est l'usage le plus répandu, mais il offre +6
 * de départage à une équipe qui n'a pas lancé une boule, ce que tous les clubs
 * n'acceptent pas. Le réglage existe donc, avec l'usage courant par défaut.
 */
function ScoreExempt({
  tournoi,
  config,
}: {
  tournoi: Tournoi
  config: (champ: 'scoreExempt', valeur: unknown) => void
}) {
  const [pour, contre] = tournoi.config.scoreExempt ?? SCORE_EXEMPT_DEFAUT
  const aucun = pour === 0 && contre === 0
  const courant = pour === 13 && contre === 7
  const choix = aucun ? 'aucun' : courant ? 'courant' : 'autre'

  return (
    <div style={{ marginTop: 20, maxWidth: 420 }}>
      <label htmlFor="exempt">Une équipe exempte (qui passe le tour) marque</label>
      <select
        id="exempt"
        value={choix}
        onChange={(e) =>
          config(
            'scoreExempt',
            e.target.value === 'aucun' ? [0, 0] : e.target.value === 'courant' ? [13, 7] : [13, 0],
          )
        }
      >
        <option value="courant">13 à 7 — l’usage le plus répandu</option>
        <option value="aucun">Aucun point</option>
        <option value="autre">Un autre score</option>
      </select>

      {choix === 'autre' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
          <input
            type="number"
            min={0}
            max={99}
            aria-label="Points marqués par l’équipe exempte"
            value={pour}
            onChange={(e) => config('scoreExempt', [Number(e.target.value) || 0, contre])}
            style={{ width: 80 }}
          />
          <span>à</span>
          <input
            type="number"
            min={0}
            max={99}
            aria-label="Points encaissés par l’équipe exempte"
            value={contre}
            onChange={(e) => config('scoreExempt', [pour, Number(e.target.value) || 0])}
            style={{ width: 80 }}
          />
        </div>
      )}

      <p className="aide" style={{ marginTop: 8 }}>
        {aucun
          ? 'L’exempt reste une victoire, mais ne compte pas au goal-average : personne ne gagne de départage sans avoir joué.'
          : 'L’exempt compte comme une victoire acquise, et ces points entrent dans le goal-average.'}
      </p>
    </div>
  )
}