/**
 * Écrit la page d'architecture, arborescence comprise.
 *
 * Les chiffres sont comptés dans le dépôt au moment de la publication, jamais
 * recopiés : ceux du CLAUDE.md avaient dérivé de 40 % en trois semaines sans
 * que personne s'en aperçoive, et une arborescence fausse est pire qu'absente
 * — on la croit.
 *
 * Le rôle de chaque fichier, lui, est écrit à la main : il ne se devine pas.
 * Un fichier sans rôle déclaré fait échouer le script plutôt que de disparaître
 * silencieusement de la page.
 *
 *   node outils/architecture.mjs
 */
import { readFileSync, readdirSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const RACINE = resolve('.')

/** Ce que chaque fichier fait, et sous quel titre il se range. */
const ROLES = {
  'src/engine': [
    'Le moteur',
    "TypeScript pur, sans React ni aucune dépendance. C'est la partie dont une erreur se verrait publiquement le jour du concours.",
    {
      'types.ts': "le modèle — Équipe, Match, Tournoi — et l'interface Driver",
      'tournoi.ts': 'orchestration : créer, tirer au sort, lancer un tour, saisir, attribuer les terrains',
      'classement.ts': 'départage FFPJP : victoires, goal-average, points marqués, confrontation directe',
      'tableaux.ts': 'découpe le classement par tableau quand le format en comporte plusieurs',
      'apercu.ts': "ce qu'un format donnera, chiffré sur l'effectif — alimente l'écran de réglages",
      'alea.ts': 'tirage reproductible à partir d’une graine, donc vérifiable',
      'index.ts': 'la seule porte d’entrée du moteur pour l’interface',
      'formats/commun.ts': 'appariement sans revanche, tailles de poules, ordre d’un tableau',
      'formats/poules.ts': 'poules de 4 avec barrage, puis les tableaux finals A et B',
      'formats/seeding.ts': 'élimination directe — et matchsTableau, que les autres formats réutilisent',
      'formats/suisse.ts': 'appariement par niveau, sans jamais rejouer une affiche',
      'formats/multichances.ts': 'cascade A → B → C : personne ne rentre après une seule partie',
      '__tests__/moteur.test.ts': 'les tests du moteur, de 4 à 48 équipes',
      '__tests__/simulation.ts': 'joue un concours entier en inventant des scores',
    },
  ],
  'src/ui': [
    'L’interface',
    'React. Aucune règle de tournoi ici : tout ce qui décide se trouve dans le moteur.',
    {
      'styles.css': 'une seule feuille pour l’écran, l’impression et la projection',
      'Tirage.tsx': 'le tirage comme moment : proposer, relancer, valider',
      'SaisieEquipes.tsx': 'la liste plate au clavier, le moment le plus pénible d’un concours',
      'Matchs.tsx': 'la table de marque, le seul écran ouvert toute la journée',
      'Affichage.tsx': 'l’écran public à projeter ou à brancher sur une télé',
      'Deroulement.tsx': '« comment ça va se passer », chiffré sur les équipes saisies',
      'Bilan.tsx': 'la page A4 de fin de concours : podium puis classement',
      'Classement.tsx': 'le classement, séparé par tableau quand il y en a plusieurs',
      'Tableau.tsx': 'un tableau à élimination directe dessiné en arbre',
      'Guide.tsx': 'le mode d’emploi d’une page, à laisser près du clavier',
      'fichier.ts': 'enregistrer et rouvrir un concours en .petanque',
      'Feuilles.tsx': 'les feuilles de match à confier aux équipes',
      'Confirmation.tsx': 'la fenêtre qui précède un geste qu’on ne peut pas défaire',
      'Equipe.tsx': 'le dossard et les noms — l’élément que tout l’affichage partage',
      'secondEcran.ts': 'ouvre la fenêtre d’affichage public',
      'format.ts': 'mises en forme partagées, dont la date en français',
    },
  ],
  src: [
    'Le point d’entrée',
    null,
    {
      'App.tsx': 'les cinq onglets, le bandeau d’étape, les réglages',
      'stockage.ts': 'localStorage — et le canal vers la fenêtre d’affichage public',
      'AffichageSeul.tsx': 'le point d’entrée de la seconde fenêtre',
      'main.tsx': 'montage de React',
    },
  ],
  outils: [
    'Les outils',
    'Des scripts, jamais embarqués dans l’application.',
    {
      'etats-captures.ts': 'fabrique des concours de démonstration, en passant par le moteur',
      'captures.mjs': 'pilote un navigateur et prend les captures d’écran',
      'architecture.mjs': 'écrit cette page',
      'badge-couverture.mjs': 'transforme le résumé de couverture en badge pour le README',
      'portable.mjs': 'assemble le dossier portable après la compilation',
      'pdf.mjs': 'rend une page de docs/ en PDF A4',
    },
  ],
}

const SOURCES = /\.(ts|tsx|mjs|css)$/

function fichiers(dir, prefixe = '') {
  const out = []
  for (const f of readdirSync(join(RACINE, dir)).sort()) {
    const complet = join(RACINE, dir, f)
    if (statSync(complet).isDirectory()) out.push(...fichiers(join(dir, f), `${prefixe}${f}/`))
    else if (SOURCES.test(f)) {
      out.push({ nom: prefixe + f, lignes: readFileSync(complet, 'utf8').split('\n').length })
    }
  }
  return out
}

const echappe = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const sections = []
const manquants = []

for (const [dossier, [titre, chapeau, roles]] of Object.entries(ROLES)) {
  // `src` ne prend que ses fichiers directs : ses sous-dossiers ont leur section.
  const tous = fichiers(dossier).filter((f) => (dossier === 'src' ? !f.nom.includes('/') : true))
  const lignes = []
  let total = 0
  for (const f of tous.sort((a, b) => b.lignes - a.lignes)) {
    if (!(f.nom in roles)) manquants.push(`${dossier}/${f.nom}`)
    total += f.lignes
    lignes.push({ nom: f.nom, lignes: f.lignes, role: roles[f.nom] ?? '' })
  }
  sections.push({ dossier, titre, chapeau, lignes, total })
}

if (manquants.length) {
  console.error(
    `Ces fichiers n'ont pas de rôle déclaré dans outils/architecture.mjs :\n  ${manquants.join('\n  ')}\n` +
      `Ajoutez-les : une arborescence incomplète se croit complète.`,
  )
  process.exit(1)
}

const largeur = Math.max(...sections.flatMap((s) => s.lignes.map((l) => l.nom.length)))
const arbre = sections
  .map(({ dossier, titre, chapeau, lignes, total }) => {
    const entete = `<h3>${echappe(titre)} <span class="compte">${total.toLocaleString('fr-FR')} lignes</span></h3>`
    const texte = chapeau ? `<p>${echappe(chapeau)}</p>` : ''
    const corps = lignes
      .map(
        (l) =>
          `<span class="f">${echappe(l.nom.padEnd(largeur))}</span>` +
          `<span class="n">${String(l.lignes).padStart(5)}</span>  ` +
          `<span class="r">${echappe(l.role)}</span>`,
      )
      .join('\n')
    return `${entete}\n${texte}\n<pre><code>${dossier}/\n${corps}</code></pre>`
  })
  .join('\n\n')

const total = sections.reduce((s, x) => s + x.total, 0)

const gabarit = readFileSync(resolve('docs/architecture.html'), 'utf8')
if (!gabarit.includes('<!-- ARBORESCENCE -->')) {
  throw new Error('docs/architecture.html ne contient pas le repère <!-- ARBORESCENCE -->')
}

mkdirSync(resolve('public'), { recursive: true })
writeFileSync(
  resolve('public/architecture.html'),
  gabarit
    .replace('<!-- ARBORESCENCE -->', arbre)
    .replace('<!-- TOTAL -->', total.toLocaleString('fr-FR')),
)

console.log(`public/architecture.html écrit — ${total} lignes réparties en ${sections.length} ensembles`)
