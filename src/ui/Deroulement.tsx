import { apercu, type Tournoi } from '../engine'
import { accord } from './format'

/**
 * Comment le format choisi va se dérouler, et ce qu'il donne avec ces équipes-là.
 *
 * Le nom d'un format ne dit rien à qui organise son premier concours, et la
 * description d'une carte tient en deux lignes. Ici on déroule les étapes dans
 * l'ordre où elles arriveront, puis on les chiffre sur l'effectif réellement
 * saisi : « 6 poules de 4 » rassure là où « des groupes de 4 » laisse dans le
 * doute. Les chiffres viennent du moteur (`apercu`), jamais d'un calcul refait
 * ici — sinon l'écran annoncerait un concours et le logiciel en jouerait un autre.
 */
export function Deroulement({ tournoi }: { tournoi: Tournoi }) {
  const n = tournoi.equipes.length
  const a = apercu(tournoi.config.format, n, tournoi.config)

  return (
    <div className="deroulement">
      <h3>Comment ça va se passer</h3>
      <ol className="deroulement-etapes">
        {etapes(tournoi, a.exempts > 0).map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ol>

      {n >= 2 && (
        <div className="deroulement-exemple">
          <div className="deroulement-titre">
            Avec vos {n} équipes
            {tournoi.formation === 'triplette' ? ' (triplettes)' : ' (doublettes)'}
          </div>
          <ul>
            {chiffres(tournoi).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Les étapes du format, dans l'ordre où elles arriveront le jour du concours. */
function etapes(tournoi: Tournoi, avecExempt: boolean): string[] {
  switch (tournoi.config.format) {
    case 'poules': {
      const suite = tournoi.config.tableauFinal
        ? [
            'Les premières de chaque poule disputent ensuite le tableau A, les deuxièmes le tableau B : deux concours à élimination directe menés en parallèle, chacun jusqu’à son vainqueur.',
          ]
        : ['Le concours s’arrête à la fin des poules, et le classement départage tout le monde.']
      return [
        'Les équipes sont réparties au sort en poules de 4, complétées par des poules de 3 s’il en reste.',
        'Dans une poule de 4 : deux parties, puis le match des gagnantes et celui des perdantes.',
        'La gagnante des gagnantes est qualifiée. La perdante des perdantes est éliminée. Les deux autres se départagent au barrage.',
        'Deux équipes sortent donc de chaque poule, et deux rentrent chez elles.',
        ...suite,
      ]
    }

    case 'suisse':
      return [
        'Le premier tour est tiré entièrement au sort.',
        'À partir du deuxième, chaque équipe rencontre une équipe qui a gagné autant de parties qu’elle : les gagnantes entre elles, les battues entre elles.',
        'Deux équipes ne se rencontrent jamais deux fois. Si c’est impossible autrement, le logiciel le signale à l’écran plutôt que de bloquer.',
        ...(avecExempt
          ? [
              'L’effectif étant impair, une équipe passe son tour à chaque fois et gagne d’office : c’est la dernière au classement qui ne l’a pas encore fait.',
            ]
          : []),
        'Personne n’est éliminé : toutes les équipes jouent le même nombre de parties. À la fin, le classement départage.',
      ]

    case 'seeding':
      return [
        'Le tableau est tiré au sort d’un coup : toutes les rencontres jusqu’à la finale sont connues dès le départ.',
        ...(avecExempt
          ? [
              'L’effectif ne tombant pas juste, quelques équipes passent le premier tour sans jouer.',
            ]
          : []),
        'On perd, on sort. La moitié des équipes rentre après une seule partie.',
        'Les gagnantes se rencontrent au tour suivant, et ainsi de suite jusqu’à la finale.',
      ]

    case 'multichances':
      return [
        'Toutes les équipes entrent dans le tableau A.',
        'Celles qui perdent leur première partie ne rentrent pas chez elles : elles repartent dans le tableau B.',
        'Celles qui perdent leur première partie en B repartent dans le tableau C.',
        'Chaque tableau va jusqu’à son vainqueur. Il y a donc trois vainqueurs, un par tableau.',
        'Personne ne repart après une seule partie : c’est tout l’intérêt de cette formule.',
      ]
  }
}

/** Le même déroulement, chiffré sur l'effectif saisi. */
function chiffres(tournoi: Tournoi): string[] {
  const n = tournoi.equipes.length
  const a = apercu(tournoi.config.format, n, tournoi.config)
  const out: string[] = []

  if (a.poules) out.push(listePoules(a.poules))

  const parties = `${a.premieresParties} partie${accord(a.premieresParties)} au premier tour`
  const exempts =
    a.exempts > 0
      ? `, et ${a.exempts} équipe${accord(a.exempts)} exempte${accord(a.exempts)}`
      : ''
  out.push(parties + exempts)

  if (a.tours > 0) {
    out.push(
      `${a.tours} tour${accord(a.tours)} en tout` +
        (tournoi.config.format === 'suisse' ? ' pour chaque équipe' : ' au maximum'),
    )
  }

  if (a.tableaux && a.tableaux.length > 1) {
    out.push(a.tableaux.map((t) => `${t.nom} : ${t.equipes} équipes`).join(' · '))
  }

  return out
}

/** « 6 poules de 4 et 1 poule de 3 » plutôt qu'une liste de nombres. */
function listePoules(tailles: number[]): string {
  const compte = new Map<number, number>()
  for (const t of tailles) compte.set(t, (compte.get(t) ?? 0) + 1)
  const morceaux = [...compte.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([taille, combien]) => `${combien} poule${accord(combien)} de ${taille}`)
  return morceaux.join(' et ')
}
