/** Modèle de domaine partagé par tous les formats de tournoi. */

export type Formation = 'doublette' | 'triplette'

export interface Joueur {
  id: string
  nom: string
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
  /**
   * Poules uniquement : enchaîner sur deux tableaux à élimination directe.
   *
   * Les premières de poule y jouent le tableau A, les secondes le tableau B.
   * C'est ce que fait la plupart des clubs, et ce que la description du format
   * promet depuis toujours : « les 2 meilleures de chaque groupe continuent ».
   */
  tableauFinal?: boolean
  /**
   * Score attribué à une équipe exempte (victoire administrative).
   *
   * Un exempt est toujours une victoire ; la question est de savoir s'il pèse
   * aussi sur le goal-average. Le 13-7 est l'usage le plus répandu, mais il
   * offre +6 à une équipe qui n'a pas lancé une boule : à chaque club de
   * trancher. « Aucun point » s'écrit [0, 0] et non null — des scores nuls
   * feraient passer l'exempt pour une partie non jouée, qui bloquerait le tour.
   */
  scoreExempt?: [number, number]
  /**
   * Graine du tirage au sort. Fixée une fois au lancement de la phase : le
   * tirage devient reproductible, donc vérifiable et rejouable à l'identique.
   */
  graine?: number
}

/**
 * Tout ce qu'un format a le droit de voir pour décider du tour suivant.
 *
 * Délibérément plus étroit qu'un `Tournoi` : pas de nom, pas de date, pas de
 * terrains. Un format répond à une seule question — qui joue contre qui — et ne
 * peut donc pas se mettre à dépendre de ce qui ne la concerne pas.
 */
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

/**
 * Le match a-t-il son résultat ?
 *
 * Les deux scores se saisissent ensemble : il n'existe pas de match à moitié
 * rentré. Un exempt est joué dès sa création, puisque sa victoire est acquise
 * d'office — sans quoi il bloquerait le tour en attendant un score.
 */
export const matchJoue = (m: Match): boolean => m.scoreA !== null && m.scoreB !== null

/**
 * Les équipes indexées par identifiant.
 *
 * Les matchs ne portent que des identifiants : les relier à des noms est le
 * geste le plus fréquent du moteur comme de l'affichage, et il était refait
 * dans huit fichiers — parfois en balayant la liste pour chaque équipe de
 * chaque match.
 */
export const parEquipeId = (equipes: readonly Equipe[]): Map<string, Equipe> =>
  new Map(equipes.map((e) => [e.id, e]))

/**
 * Numéro du dernier tour créé, 0 si rien n'a encore été lancé.
 *
 * Les matchs ne sont pas rangés par tour : seul leur numéro le dit. Cette
 * lecture était refaite à l'identique dans trois formats et deux écrans, et
 * chaque copie était une occasion de diverger.
 */
export const dernierTour = (matchs: readonly Match[]): number =>
  matchs.reduce((max, m) => Math.max(max, m.tour), 0)

/**
 * Les matchs d'une poule ou d'un tableau.
 *
 * C'est le groupe qui sépare les phases d'un concours — poules puis tableaux
 * finals, ou les tableaux A/B/C du multi-chances — et non un état à part. Les
 * lire passe donc toujours par ici.
 */
export const matchsDuGroupe = <M extends { groupe?: string }>(
  matchs: readonly M[],
  groupe: string,
): M[] => matchs.filter((m) => m.groupe === groupe)

/** Gagnant d'un match joué. Un exempt est gagné par l'équipe A. */
export function gagnant(m: Match): string | null {
  if (m.equipeB === null) return m.equipeA
  if (!matchJoue(m)) return null
  return m.scoreA! > m.scoreB! ? m.equipeA : m.equipeB
}

/** Perdant d'un match joué. Un exempt n'en a pas : personne n'a joué contre. */
export function perdant(m: Match): string | null {
  if (m.equipeB === null) return null
  if (!matchJoue(m)) return null
  return m.scoreA! > m.scoreB! ? m.equipeB : m.equipeA
}
