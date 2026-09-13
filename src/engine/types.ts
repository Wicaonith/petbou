/** Modèle de domaine partagé par tous les formats de tournoi. */

export type Formation = 'doublette' | 'triplette'

export type Role = 'tireur' | 'pointeur' | 'milieu'

export interface Joueur {
  id: string
  nom: string
  role?: Role
  enfant?: boolean
}

export interface Equipe {
  id: string
  /**
   * Numéro de dossard, donné à la saisie dans l'ordre d'inscription.
   *
   * Au boulodrome une équipe s'appelle par son numéro : c'est lui qu'on annonce,
   * qu'on écrit sur la feuille et qu'on cherche des yeux sur l'écran. Il est donc
   * affiché partout à côté des noms, jamais à leur place.
   */
  numero: number
  /** Nom affiché. Par défaut les noms des joueurs concaténés. */
  nom: string
  joueurs: Joueur[]
  /** Tête de série : 1 = meilleure. Absent = non classée. */
  seed?: number
}

/**
 * Un match. `equipeB` à null signale un exempt : l'équipe A passe le tour.
 * Un match sans score est en cours ; les deux scores sont saisis ensemble.
 */
export interface Match {
  id: string
  /** Numéro de tour, à partir de 1, au sein de la phase. */
  tour: number
  equipeA: string
  equipeB: string | null
  scoreA: number | null
  scoreB: number | null
  /** Numéro de terrain attribué, null tant que non attribué. */
  terrain: number | null
  /** Poule ou tableau d'appartenance : 'A', 'B', 'Poule 3'… */
  groupe?: string
  /** Étiquette lisible : 'Gagnants', 'Barrage', '1/4 de finale'… */
  libelle?: string
}

/** Un match tel que produit par un driver, avant attribution d'id et de terrain. */
export type NouveauMatch = Omit<Match, 'id' | 'terrain' | 'scoreA' | 'scoreB'>

export type FormatId = 'poules' | 'suisse' | 'seeding' | 'multichances'

export interface PhaseConfig {
  format: FormatId
  /** Score gagnant : 13 en général, 11 en mêlée rapide. */
  butScore: number
  /** Nombre de tours voulu. Utilisé par le système suisse uniquement. */
  nbTours?: number
  /** Score attribué à une équipe exempte (victoire administrative). */
  scoreExempt?: [number, number]
  /**
   * Graine du tirage au sort. Fixée une fois au lancement de la phase : le
   * tirage devient reproductible, donc vérifiable et rejouable à l'identique.
   */
  graine?: number
}

export interface EtatPhase {
  equipes: Equipe[]
  matchs: Match[]
  config: PhaseConfig
}

/**
 * Un format de tournoi. L'orchestrateur ne connaît que cette interface :
 * ajouter un format ne touche à rien d'autre.
 */
export interface Driver {
  /** Libellé affiché à l'opérateur. */
  readonly nom: string
  /**
   * Matchs à lancer maintenant, compte tenu des résultats déjà saisis.
   * Renvoie [] si la phase attend des scores ou si elle est terminée.
   */
  prochainsMatchs(etat: EtatPhase): NouveauMatch[]
  terminee(etat: EtatPhase): boolean
  /**
   * Nombre de tours annoncé à l'opérateur au moment de la configuration,
   * pour qu'il sache dans quoi il s'engage. -1 si indéterminable.
   */
  toursPrevus(nbEquipes: number, config: PhaseConfig): number
}

export const matchJoue = (m: Match): boolean => m.scoreA !== null && m.scoreB !== null

/** Gagnant d'un match joué. Un exempt est gagné par l'équipe A. */
export function gagnant(m: Match): string | null {
  if (m.equipeB === null) return m.equipeA
  if (!matchJoue(m)) return null
  return m.scoreA! > m.scoreB! ? m.equipeA : m.equipeB
}

export function perdant(m: Match): string | null {
  if (m.equipeB === null) return null
  if (!matchJoue(m)) return null
  return m.scoreA! > m.scoreB! ? m.equipeB : m.equipeA
}
