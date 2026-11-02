import { classement, type Ligne } from './classement'
import { poules } from './formats/poules'
import { suisse } from './formats/suisse'
import { seeding } from './formats/seeding'
import { multichances } from './formats/multichances'
import {
  type Driver,
  type Equipe,
  type FormatId,
  type Formation,
  type Match,
  type NouveauMatch,
  type PhaseConfig,
  matchJoue,
} from './types'

/**
 * Les quatre formats, derrière une interface unique.
 *
 * C'est la seule table à toucher pour en ajouter un : l'orchestrateur ne
 * connaît que `Driver`, et rien d'autre dans le projet ne sait qu'il existe
 * plusieurs formats.
 */
export const DRIVERS: Record<FormatId, Driver> = {
  poules,
  suisse,
  seeding,
  multichances,
}

/**
 * Un concours entier, du nom jusqu'au dernier score.
 *
 * Immuable : aucune fonction de ce fichier ne le modifie, toutes en renvoient
 * un nouveau. C'est ce qui rend un concours copiable, enregistrable et
 * comparable à tout instant — et ce qui permet au tirage de se montrer sans
 * rien engager.
 */
export interface Tournoi {
  id: string
  nom: string
  date: string
  formation: Formation
  /**
   * Nombre de terrains numérotés, ou null quand le club n'en tient pas le
   * compte : beaucoup de boulodromes jouent « là où c'est libre ». Dans ce cas
   * aucun match ne porte de numéro et tout le tour part en même temps.
   */
  nbTerrains: number | null
  equipes: Equipe[]
  config: PhaseConfig
  matchs: Match[]
}

export const SCORE_EXEMPT_DEFAUT: [number, number] = [13, 7]

/**
 * Un concours vide, prêt à recevoir ses équipes.
 *
 * Tout ce qui peut avoir une valeur par défaut en a une : l'opératrice ne doit
 * pouvoir rien oublier. La graine est tirée ici une fois pour toutes, et non au
 * moment du tirage, pour qu'un même concours rejoué donne les mêmes poules.
 */
export function creerTournoi(init: {
  nom: string
  date?: string
  formation: Formation
  nbTerrains?: number | null
  format: FormatId
  butScore?: number
  nbTours?: number
  tableauFinal?: boolean
  graine?: number
}): Tournoi {
  return {
    id: `t-${Date.now()}`,
    nom: init.nom,
    date: init.date ?? new Date().toISOString().slice(0, 10),
    formation: init.formation,
    nbTerrains: init.nbTerrains ?? null,
    equipes: [],
    config: {
      format: init.format,
      butScore: init.butScore ?? 13,
      nbTours: init.nbTours,
      // Les poules s'enchaînent sur les tableaux finals sauf refus explicite :
      // c'est ce que fait la plupart des clubs, et ce que la description du
      // format annonce. Un concours enregistré avant leur existence n'a pas le
      // réglage, et reste donc en poules seules.
      tableauFinal: init.tableauFinal ?? true,
      scoreExempt: SCORE_EXEMPT_DEFAUT,
      graine: init.graine ?? Math.floor(Math.random() * 2 ** 31),
    },
    matchs: [],
  }
}

/**
 * Donne leur dossard aux équipes d'un concours enregistré avant qu'il existe.
 *
 * Un concours commencé le jour de la mise à jour doit continuer à s'ouvrir, et
 * une saison archivée à se relire. L'ordre d'inscription redonne exactement les
 * numéros qu'aurait attribués la saisie.
 */
export function numeroterEquipes(t: Tournoi): Tournoi {
  if (t.equipes.every((e) => typeof e.numero === 'number')) return t
  return { ...t, equipes: t.equipes.map((e, i) => ({ ...e, numero: e.numero ?? i + 1 })) }
}

export const driverDe = (t: Tournoi): Driver => DRIVERS[t.config.format]

/** Le club numérote-t-il ses terrains ? Détermine tout l'affichage des terrains. */
export const gereTerrains = (t: Tournoi): boolean => t.nbTerrains !== null

/**
 * Le concours est-il allé à son terme ?
 *
 * Un concours sans aucun match n'est pas terminé mais pas commencé : sans ce
 * garde-fou, l'écran d'accueil annoncerait un classement final.
 */
export const termine = (t: Tournoi): boolean =>
  t.matchs.length > 0 && driverDe(t).terminee({ equipes: t.equipes, matchs: t.matchs, config: t.config })

/** Matchs en attente de score, terrain attribué ou non. */
export const enCours = (t: Tournoi): Match[] => t.matchs.filter((m) => !matchJoue(m))

export const classementDe = (t: Tournoi): Ligne[] => classement(t.equipes, t.matchs)

/**
 * Le tirage tel qu'il serait s'il était validé maintenant, sans rien engager.
 *
 * C'est une fonction pure de (équipes, résultats, graine) : l'écran de tirage
 * peut donc l'afficher, et le relancer, sans que rien ne parte sur les terrains.
 */
export const propositionDe = (t: Tournoi): NouveauMatch[] =>
  driverDe(t).prochainsMatchs({ equipes: t.equipes, matchs: t.matchs, config: t.config })

/**
 * Un tirage ne se relance que tant que rien n'a été joué.
 *
 * Passé la première partie, la graine détermine aussi la composition des poules
 * et le placement dans le tableau : en changer rétroactivement réécrirait un
 * concours déjà commencé.
 */
export const peutRetirer = (t: Tournoi): boolean => t.matchs.length === 0

/** Relance le tirage avec une nouvelle graine. Sans effet si une partie a été jouée. */
export function retirerAuSort(t: Tournoi, graine = Math.floor(Math.random() * 2 ** 31)): Tournoi {
  if (!peutRetirer(t)) return t
  return { ...t, config: { ...t.config, graine } }
}

/**
 * Produit les matchs suivants et les pose sur les terrains libres.
 * Sans effet si le tour en cours n'est pas complet ou si le tournoi est fini.
 */
export function lancerProchainsMatchs(t: Tournoi): Tournoi {
  const nouveaux = propositionDe(t)
  if (nouveaux.length === 0) return t

  const [exA, exB] = t.config.scoreExempt ?? SCORE_EXEMPT_DEFAUT
  let n = t.matchs.length
  const ajoutes: Match[] = nouveaux.map((m) => ({
    ...m,
    id: `m${++n}`,
    terrain: null,
    // Un exempt est acquis d'office : on inscrit le score pour que le
    // classement et la suite du tirage en tiennent compte immédiatement.
    scoreA: m.equipeB === null ? exA : null,
    scoreB: m.equipeB === null ? exB : null,
  }))

  return attribuerTerrains({ ...t, matchs: [...t.matchs, ...ajoutes] })
}

/** Saisie d'un score. Libère le terrain, qui est aussitôt réattribué à un match en attente. */
export function saisirScore(t: Tournoi, matchId: string, scoreA: number, scoreB: number): Tournoi {
  const matchs = t.matchs.map((m) =>
    m.id === matchId ? { ...m, scoreA, scoreB, terrain: null } : m,
  )
  return attribuerTerrains({ ...t, matchs })
}

/** Annule un score déjà saisi : la table de marque se trompe, il faut pouvoir revenir. */
export function annulerScore(t: Tournoi, matchId: string): Tournoi {
  const matchs = t.matchs.map((m) =>
    m.id === matchId && m.equipeB !== null ? { ...m, scoreA: null, scoreB: null } : m,
  )
  return attribuerTerrains({ ...t, matchs })
}

/**
 * Pose les matchs en attente sur les terrains libres, dans l'ordre de création.
 * Les matchs déjà sur un terrain n'en changent pas : une équipe déjà partie
 * jouer ne doit pas être déplacée.
 *
 * Sans gestion des terrains, aucun numéro n'est attribué et rien n'attend :
 * tout le tour est lancé d'un coup.
 */
export function attribuerTerrains(t: Tournoi): Tournoi {
  if (t.nbTerrains === null) return t
  const occupes = new Set(
    t.matchs.filter((m) => !matchJoue(m) && m.terrain !== null).map((m) => m.terrain!),
  )
  const libres: number[] = []
  for (let i = 1; i <= t.nbTerrains; i++) if (!occupes.has(i)) libres.push(i)

  const matchs = t.matchs.map((m) => {
    if (matchJoue(m) || m.terrain !== null) return m
    const terrain = libres.shift()
    return terrain === undefined ? m : { ...m, terrain }
  })
  return { ...t, matchs }
}
