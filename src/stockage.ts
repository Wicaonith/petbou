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

/* ------------------------------------------------------------------ *
 * Les concours rangés
 * ------------------------------------------------------------------ */

/**
 * Tous les concours qui ne sont pas ouverts en ce moment.
 *
 * Un club prépare ses concours des semaines à l'avance, et devait jusqu'ici
 * les retrouver dans l'Explorateur Windows — l'écran où se perd exactement la
 * personne pour qui cette application est faite. La liste vit donc ici, dans
 * la même sauvegarde que le concours ouvert : elle suit la clé USB sans un
 * octet de configuration, et le même code sert au navigateur et à
 * l'application. Les fichiers `.petanque` restent là pour l'archive et pour
 * passer d'un PC à l'autre, ce qu'un stockage local ne sait pas faire.
 *
 * Un concours n'est jamais ici ET dans `CLE` : il passe de l'un à l'autre.
 * Deux copies auraient divergé au premier score saisi, et la table de marque
 * aurait affiché l'une pendant que l'écran public montrait l'autre.
 */
const CLE_RANGES = 'petanque.concours.v1'

export interface ConcoursRange extends Etat {
  /** Dernier enregistrement, en ISO : sert à présenter les plus récents d'abord. */
  modifie: string
}

/** Du plus récemment touché au plus ancien : on reprend presque toujours le dernier. */
export const concoursRanges = (): ConcoursRange[] =>
  lireRanges().sort((a, b) => b.modifie.localeCompare(a.modifie))

/**
 * Met le concours ouvert de côté, sans rien perdre.
 *
 * Appelé avant de passer à un autre concours : c'est ce qui fait de « Nouveau
 * concours » un geste réversible, là où il effaçait.
 */
export const ranger = (etat: Etat): void => {
  const autres = lireRanges().filter((r) => r.tournoi.id !== etat.tournoi.id)
  ecrireRanges([...autres, ...aRanger(etat)])
}

/**
 * Échange le concours ouvert contre un concours rangé.
 *
 * Renvoie l'état repris, ou null si l'identifiant ne désigne rien — auquel cas
 * rien n'a été touché.
 */
export function basculer(ouvert: Etat, id: string): Etat | null {
  const ranges = lireRanges()
  const vise = ranges.find((r) => r.tournoi.id === id)
  if (!vise) return null

  const repris: Etat = { tournoi: numeroterEquipes(vise.tournoi), noms: vise.noms ?? [] }
  // Une seule écriture pour les deux mouvements : le concours ouvert entre dans
  // la liste à l'instant où l'autre en sort. Si l'écriture de `CLE` manquait
  // ensuite, un concours serait en double — jamais perdu, et c'est le seul des
  // deux défauts dont on se relève.
  const restants = ranges.filter((r) => r.tournoi.id !== id && r.tournoi.id !== ouvert.tournoi.id)
  ecrireRanges([...restants, ...aRanger(ouvert)])
  ecrire(repris)
  return repris
}

/**
 * Range le concours ouvert et met à sa place celui qui arrive d'ailleurs —
 * d'un fichier `.petanque`, aujourd'hui le seul ailleurs qui existe.
 *
 * L'entrant quitte la liste s'il s'y trouvait : rouvrir le fichier d'un
 * concours déjà rangé le mettrait des deux côtés à la fois, et c'est pourtant
 * le même concours.
 */
export function remplacer(ouvert: Etat, entrant: Etat): void {
  const autres = lireRanges().filter(
    (r) => r.tournoi.id !== ouvert.tournoi.id && r.tournoi.id !== entrant.tournoi.id,
  )
  ecrireRanges([...autres, ...aRanger(ouvert)])
  ecrire(entrant)
}

/** Suppression définitive : le seul geste de la liste qui détruise. */
export const oublier = (id: string): void =>
  ecrireRanges(lireRanges().filter((r) => r.tournoi.id !== id))

/**
 * Un concours auquel personne n'a encore touché.
 *
 * Ni nom ni équipe : rien ne permettrait de le reconnaître dans la liste, et
 * « Nouveau concours » cliqué deux fois de suite y déposerait une entrée
 * indistincte de plus à chaque fois. L'interface a besoin de la même question
 * pour savoir s'il y a eu quelque chose à ranger : d'où une seule règle, ici.
 */
export const vierge = (tournoi: Tournoi): boolean =>
  !tournoi.nom.trim() && tournoi.equipes.length === 0

const aRanger = (etat: Etat): ConcoursRange[] =>
  vierge(etat.tournoi) ? [] : [{ ...etat, modifie: new Date().toISOString() }]

/**
 * Relit la liste, ou rien si elle est absente ou abîmée.
 *
 * Même règle que `lire()`, et pour la même raison : une entrée corrompue est
 * écartée, et non laissée faire tomber la liste entière le matin du concours.
 */
function lireRanges(): ConcoursRange[] {
  try {
    const brut = localStorage.getItem(CLE_RANGES)
    if (!brut) return []
    const liste = JSON.parse(brut) as ConcoursRange[]
    return Array.isArray(liste) ? liste.filter((r) => r?.tournoi?.config) : []
  } catch {
    return []
  }
}

const ecrireRanges = (liste: readonly ConcoursRange[]): void =>
  localStorage.setItem(CLE_RANGES, JSON.stringify(liste))
