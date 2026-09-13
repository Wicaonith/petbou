import { isTauri } from '@tauri-apps/api/core'
import { numeroterEquipes, type Tournoi } from '../engine'

const EXT = 'petanque'

export interface Sauvegarde {
  version: 1
  tournoi: Tournoi
  noms: string[]
}

/**
 * Enregistrement dans un fichier choisi par l'utilisateur.
 *
 * La sauvegarde automatique interne suffit au déroulement d'un concours, mais
 * un club veut pouvoir archiver une saison et remettre un concours sur un autre
 * PC : un fichier que l'on copie sur une clé reste le format le plus sûr.
 */
export async function enregistrer(donnees: Sauvegarde, nomPropose: string): Promise<boolean> {
  const contenu = JSON.stringify(donnees, null, 2)
  const fichier = `${assainir(nomPropose)}.${EXT}`

  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const chemin = await save({
      defaultPath: fichier,
      filters: [{ name: 'Concours de pétanque', extensions: [EXT] }],
    })
    if (!chemin) return false
    await writeTextFile(chemin, contenu)
    return true
  }

  // Hors application installée (développement, navigateur) : téléchargement.
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }))
  const lien = document.createElement('a')
  lien.href = url
  lien.download = fichier
  lien.click()
  URL.revokeObjectURL(url)
  return true
}

/** Renvoie null si l'utilisateur annule. Lève si le fichier est illisible. */
export async function ouvrir(): Promise<Sauvegarde | null> {
  let brut: string | null = null

  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const chemin = await open({
      multiple: false,
      filters: [{ name: 'Concours de pétanque', extensions: [EXT] }],
    })
    if (typeof chemin !== 'string') return null
    brut = await readTextFile(chemin)
  } else {
    brut = await lireDepuisNavigateur()
    if (brut === null) return null
  }

  const donnees = JSON.parse(brut) as Sauvegarde
  if (donnees?.version !== 1 || !donnees.tournoi?.config) {
    throw new Error("Ce fichier n'est pas un concours enregistré par cette application.")
  }
  return { ...donnees, tournoi: numeroterEquipes(donnees.tournoi) }
}

function lireDepuisNavigateur(): Promise<string | null> {
  return new Promise((resoudre) => {
    const entree = document.createElement('input')
    entree.type = 'file'
    entree.accept = `.${EXT},application/json`
    entree.onchange = async () => {
      const f = entree.files?.[0]
      resoudre(f ? await f.text() : null)
    }
    entree.oncancel = () => resoudre(null)
    entree.click()
  })
}

/** Un nom de concours sert de nom de fichier : on en retire ce que Windows refuse. */
const assainir = (nom: string): string =>
  (nom.trim() || 'concours').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)
