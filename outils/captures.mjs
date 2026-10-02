/**
 * Prend les captures d'écran de l'application, pour une présentation ou une
 * notice.
 *
 * Le navigateur est piloté plutôt que l'écran photographié : les images sont
 * ainsi toujours à la même taille, sans fenêtre ni curseur autour, et se
 * refont à l'identique après une modification de l'interface.
 *
 * Les états viennent de `captures/etats/*.json`, fabriqués par le moteur
 * lui-même : un concours inventé à la main finirait par montrer des écrans
 * impossibles.
 *
 *   npm run dev            # dans un autre terminal
 *   node outils/captures.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const URL = process.env.URL ?? 'http://localhost:5173'
const SORTIE = resolve('captures')
const CLE = 'petanque.tournoi.v1'

/** Les écrans à prendre, groupés par état du concours. */
const PARCOURS = [
  {
    etat: 'avant',
    ecrans: [
      { onglet: '1. Réglages', fichier: '1-reglages', quoi: 'Choix du format, et déroulement annoncé' },
      { onglet: '2. Équipes', fichier: '2-equipes', quoi: 'Saisie des joueurs au clavier' },
    ],
  },
  {
    etat: 'entre-deux-tours',
    ecrans: [
      { onglet: '3. Tirage', fichier: '3-tirage', quoi: 'Tirage proposé, pas encore validé' },
      { onglet: '5. Classement', fichier: '5-classement', quoi: 'Classement et départage' },
    ],
  },
  {
    etat: 'en-cours',
    // Pleine page, cet écran ferait huit mille pixels de haut : trente résultats
    // qu'on fait défiler, pas qu'on lit d'un coup. La fenêtre seule montre ce que
    // l'opératrice a sous les yeux.
    ecrans: [{ onglet: '4. Matchs', fichier: '4-matchs', quoi: 'Saisie des scores', fenetre: true }],
  },
]

const etat = (nom) => readFileSync(resolve('captures/etats', `${nom}.json`), 'utf8')

mkdirSync(SORTIE, { recursive: true })
const nav = await chromium.launch()

/**
 * Une fenêtre dont la sauvegarde est déjà posée.
 *
 * Elle doit l'être AVANT que le code de la page s'exécute : l'application écrit
 * un concours vide dès son premier rendu, et écraserait un état injecté après
 * coup — c'est ce qui donnait des captures « 0 équipe ».
 */
async function fenetre(nomEtat) {
  const contexte = await nav.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 2 })
  await contexte.addInitScript(([cle, donnees]) => localStorage.setItem(cle, donnees), [CLE, etat(nomEtat)])
  return contexte
}

for (const { etat: nomEtat, ecrans } of PARCOURS) {
  const contexte = await fenetre(nomEtat)
  const page = await contexte.newPage()
  await page.goto(URL)

  for (const { onglet, fichier, quoi, fenetre: cadree } of ecrans) {
    await page.getByRole('tab', { name: new RegExp(`^${onglet}`) }).click()
    await page.waitForTimeout(250)
    await page.screenshot({ path: resolve(SORTIE, `${fichier}.png`), fullPage: !cadree })
    console.log(`${fichier}.png — ${quoi}`)
  }
  await contexte.close()
}

// L'écran public occupe toute la fenêtre : il se capture sans défilement.
const contexte = await fenetre('en-cours')
const page = await contexte.newPage()
await page.goto(`${URL}/?affichage`)
await page.waitForTimeout(500)
await page.screenshot({ path: resolve(SORTIE, '6-affichage-public.png') })
console.log('6-affichage-public.png — Écran public, à projeter')

await contexte.close()
await nav.close()
