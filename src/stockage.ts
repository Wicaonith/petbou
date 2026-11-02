import { numeroterEquipes, type Tournoi } from './engine'

/**
 * Sauvegarde locale, partagée par les deux fenêtres.
 *
 * La fenêtre d'affichage public ne parle pas à la fenêtre principale : elle lit
 * la même sauvegarde. Pas d'IPC à maintenir, et l'écran public survit tout seul
 * si la fenêtre principale est fermée puis rouverte.
 */
export const CLE = 'petanque.tournoi.v1'

export interface Etat {
  tournoi: Tournoi
  noms: string[]
}

/**
 * Relit la sauvegarde, ou rien si elle est absente ou abîmée.
 *
 * Ne lève jamais : cette lecture a lieu au démarrage, et une entrée corrompue
 * ne doit pas empêcher d'ouvrir l'application le matin du concours — mieux
 * vaut un concours vide qu'un écran blanc. La présence de `config` sert de
 * signature : elle écarte une entrée écrite par autre chose que nous.
 */
export function lire(): Etat | null {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return null
    const etat = JSON.parse(brut) as Etat
    return etat?.tournoi?.config
      ? { tournoi: numeroterEquipes(etat.tournoi), noms: etat.noms ?? [] }
      : null
  } catch {
    return null
  }
}

export const ecrire = (etat: Etat): void => {
  localStorage.setItem(CLE, JSON.stringify(etat))
}

/**
 * Prévient à chaque changement de la sauvegarde.
 *
 * L'évènement `storage` ne se déclenche que dans les AUTRES documents de la même
 * origine — exactement notre cas — mais son support varie d'un moteur de rendu
 * à l'autre : la relecture périodique garantit que l'écran public ne reste
 * jamais figé devant les joueurs.
 */
export function surChangement(rappel: (etat: Etat | null) => void): () => void {
  let dernier = localStorage.getItem(CLE)

  const verifier = () => {
    const actuel = localStorage.getItem(CLE)
    if (actuel === dernier) return
    dernier = actuel
    rappel(lire())
  }

  const parEvenement = (e: StorageEvent) => {
    if (e.key === null || e.key === CLE) verifier()
  }

  window.addEventListener('storage', parEvenement)
  const minuteur = setInterval(verifier, 1000)
  return () => {
    window.removeEventListener('storage', parEvenement)
    clearInterval(minuteur)
  }
}
