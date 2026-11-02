/**
 * Transforme le résumé de couverture en badge, pour le README.
 *
 * Le chiffre est recalculé à chaque poussée et servi depuis le site publié :
 * un pourcentage écrit en dur dans le README dériverait, comme les décomptes
 * de lignes du CLAUDE.md l'ont fait de 40 % en trois semaines. Un badge faux
 * est pire qu'une absence de badge — on le croit.
 *
 * Le format attendu est celui des « endpoints » de shields.io, qui lit ce
 * fichier JSON et dessine l'image. Aucun service tiers à inscrire, aucun
 * jeton : le fichier part avec les pages du projet.
 *
 *   npx vitest run --coverage && node outils/badge-couverture.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RESUME = resolve('coverage/coverage-summary.json')

let resume
try {
  resume = JSON.parse(readFileSync(RESUME, 'utf8'))
} catch {
  console.error(
    `${RESUME} est absent.\nLancez d'abord « npx vitest run --coverage » : c'est lui qui l'écrit.`,
  )
  process.exit(1)
}

const pct = resume.total.lines.pct

/** Vert franc au-dessus de 90 %, puis des teintes qui se dégradent avec. */
const couleur =
  pct >= 90 ? 'brightgreen' : pct >= 75 ? 'green' : pct >= 60 ? 'yellow' : 'orange'

mkdirSync(resolve('public'), { recursive: true })
writeFileSync(
  resolve('public/couverture.json'),
  JSON.stringify({
    schemaVersion: 1,
    label: 'couverture',
    message: `${pct.toFixed(1)} %`,
    color: couleur,
  }),
)

console.log(`public/couverture.json écrit — ${pct.toFixed(1)} % des lignes du moteur`)
