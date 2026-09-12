import { isTauri } from '@tauri-apps/api/core'

/** Fenêtre d'affichage public, à poser sur la télé ou le vidéoprojecteur. */
export const ETIQUETTE = 'affichage'

/**
 * Ouvre l'écran public dans une seconde fenêtre, que l'on glisse sur l'autre
 * écran. La fenêtre principale reste disponible : c'est toute la différence
 * avec le plein écran, qui monopolise l'unique fenêtre.
 */
export async function ouvrirSecondEcran(titre: string): Promise<void> {
  if (!isTauri()) {
    // Hors application installée : un onglet suffit pour voir le rendu.
    window.open('?affichage', ETIQUETTE, 'width=1280,height=800')
    return
  }

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const existante = await WebviewWindow.getByLabel(ETIQUETTE)
  if (existante) {
    // Déjà ouverte : on la ramène devant plutôt que d'en empiler une seconde.
    await existante.setFocus()
    return
  }

  const fenetre = new WebviewWindow(ETIQUETTE, {
    url: 'index.html?affichage',
    title: `${titre || 'Concours'} — affichage public`,
    width: 1280,
    height: 800,
  })
  await new Promise<void>((resoudre, rejeter) => {
    fenetre.once('tauri://created', () => resoudre())
    fenetre.once('tauri://error', (e) => rejeter(new Error(String(e.payload))))
  })
}
