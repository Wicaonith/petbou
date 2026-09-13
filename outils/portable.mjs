/**
 * Assemble le dossier portable après `tauri build`.
 *
 * Le même script sert en local et dans la CI : ce que vous obtenez sur votre
 * machine est exactement ce que produit le pipeline, sans une recette dupliquée
 * en PowerShell qui dériverait de son côté.
 *
 *   node outils/portable.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const RELEASE = resolve('src-tauri/target/release')
const NOM = 'Concours de petanque'
const SORTIE = resolve('portable', NOM)

if (!existsSync(RELEASE)) {
  console.error(`Rien à empaqueter : ${RELEASE} n'existe pas.\nLancez d'abord « npm run app:build ».`)
  process.exit(1)
}

/**
 * L'exécutable de l'application parmi les binaires du dossier release.
 * On prend le plus gros : les éventuels utilitaires de build pèsent
 * quelques dizaines de Ko là où l'application en fait plusieurs Mo.
 */
function trouverExecutable() {
  const candidats = readdirSync(RELEASE)
    .filter((f) => f.endsWith('.exe') || !f.includes('.'))
    .map((f) => ({ f, chemin: join(RELEASE, f) }))
    .filter(({ chemin }) => statSync(chemin).isFile())
    .map((c) => ({ ...c, taille: statSync(c.chemin).size }))
    .sort((a, b) => b.taille - a.taille)

  if (candidats.length === 0) return null
  return candidats[0]
}

const exe = trouverExecutable()
if (!exe) {
  console.error(`Aucun exécutable trouvé dans ${RELEASE}.`)
  process.exit(1)
}

rmSync(resolve('portable'), { recursive: true, force: true })
mkdirSync(join(SORTIE, 'donnees'), { recursive: true })

const extension = exe.f.endsWith('.exe') ? '.exe' : ''
cpSync(exe.chemin, join(SORTIE, `${NOM}${extension}`))
cpSync(resolve('PORTABLE.txt'), join(SORTIE, 'LISEZ-MOI.txt'))

const mo = (exe.taille / 1024 / 1024).toFixed(1)
console.log(`Dossier portable prêt : ${SORTIE}`)
console.log(`  ${NOM}${extension}  (${mo} Mo)`)
console.log('  donnees/            (vide, à garder à côté de l’exécutable)')
console.log('  LISEZ-MOI.txt')
console.log('\nCopiez ce dossier sur une clé USB : il n’y a rien de plus à faire.')
