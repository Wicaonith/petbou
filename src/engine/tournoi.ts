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
  type PhaseConfig,
  matchJoue,
} from './types'

export const DRIVERS: Record<FormatId, Driver> = {
  poules,
  suisse,
  seeding,
  multichances,
}

export interface Tournoi {
  id: string
  nom: string
  date: string
  formation: Formation
  nbTerrains: number
  equipes: Equipe[]
  config: PhaseConfig
  matchs: Match[]
}

export const SCORE_EXEMPT_DEFAUT: [number, number] = [13, 7]

export function creerTournoi(init: {
  nom: string
  date?: string
  formation: Formation
  nbTerrains: number
  format: FormatId
  butScore?: number
  nbTours?: number
  graine?: number
}): Tournoi {
  return {
    id: `t-${Date.now()}`,
    nom: init.nom,
    date: init.date ?? new Date().toISOString().slice(0, 10),
    formation: init.formation,
    nbTerrains: init.nbTerrains,
    equipes: [],
    config: {
      format: init.format,
      butScore: init.butScore ?? 13,
      nbTours: init.nbTours,
      scoreExempt: SCORE_EXEMPT_DEFAUT,
      graine: init.graine ?? Math.floor(Math.random() * 2 ** 31),
    },
    matchs: [],
  }
}

export const driverDe = (t: Tournoi): Driver => DRIVERS[t.config.format]

export const termine = (t: Tournoi): boolean =>
  t.matchs.length > 0 && driverDe(t).terminee({ equipes: t.equipes, matchs: t.matchs, config: t.config })

/** Matchs en attente de score, terrain attribué ou non. */
export const enCours = (t: Tournoi): Match[] => t.matchs.filter((m) => !matchJoue(m))

export const classementDe = (t: Tournoi): Ligne[] => classement(t.equipes, t.matchs)

/**
 * Produit les matchs suivants et les pose sur les terrains libres.
 * Sans effet si le tour en cours n'est pas complet ou si le tournoi est fini.
 */
export function lancerProchainsMatchs(t: Tournoi): Tournoi {
  const nouveaux = driverDe(t).prochainsMatchs({
    equipes: t.equipes,
    matchs: t.matchs,
    config: t.config,
  })
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
 */
export function attribuerTerrains(t: Tournoi): Tournoi {
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
