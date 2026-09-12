/**
 * Rend une page HTML de `docs/` en PDF A4.
 *
 * Les documents destinés au club (installation, mode d'emploi) vivent en HTML
 * dans le dépôt pour rester modifiables et relus en revue ; le PDF n'est qu'une
 * sortie que l'on régénère.
 *
 *   node outils/pdf.mjs docs/installation.html installation.pdf
 */
import { chromium } from 'playwright'
import { resolve } from 'node:path'

const [source, sortie] = process.argv.slice(2)
if (!source || !sortie) {
  console.error('usage : node outils/pdf.mjs <source.html> <sortie.pdf>')
  process.exit(1)
}

const chemin = process.env.CHROMIUM_PATH
const nav = await chromium.launch(chemin ? { executablePath: chemin } : {})
const page = await nav.newPage()
await page.goto(`file://${resolve(source)}`)
await page.emulateMedia({ media: 'print' })
await page.pdf({ path: sortie, format: 'A4', printBackground: true })
await nav.close()
console.log(`${sortie} écrit`)
