import { beforeEach, describe, expect, it, vi } from 'vitest'
import { creerTournoi, type Tournoi } from '../engine'
import {
  CLE,
  basculer,
  concoursRanges,
  ecrire,
  lire,
  oublier,
  ranger,
  remplacer,
  vierge,
  type Etat,
} from '../stockage'

/**
 * Le rangement des concours, qui est l'endroit où une préparation peut
 * disparaître.
 *
 * Le moteur a ses propres tests parce qu'une erreur de classement se verrait
 * le jour du concours. Celle-ci se verrait trois semaines plus tôt et coûterait
 * autant : un club prépare ses concours à l'avance, et ce fichier est tout ce
 * qui garantit qu'il les retrouve. D'où des tests sur du stockage, ce qui
 * n'aurait aucun intérêt s'il ne s'agissait que d'écrire une chaîne.
 */

/** `localStorage` n'existe pas sous Node : le strict nécessaire, en mémoire. */
const memoire = (): Storage => {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (c) => m.get(c) ?? null,
    setItem: (c, v) => void m.set(c, String(v)),
    removeItem: (c) => void m.delete(c),
    key: (i) => [...m.keys()][i] ?? null,
  }
}

const etat = (nom: string, equipes = 0): Etat => ({
  tournoi: {
    ...creerTournoi({ nom, formation: 'doublette', format: 'poules' }),
    id: `t-${nom}`,
    equipes: Array.from({ length: equipes }, (_, i) => ({
      id: `e${i}`,
      numero: i + 1,
      joueurs: [{ nom: `J${i}a` }, { nom: `J${i}b` }],
    })),
  } as Tournoi,
  noms: [],
})

beforeEach(() => {
  vi.stubGlobal('localStorage', memoire())
})

describe('ranger un concours', () => {
  it('le rend à la liste', () => {
    ranger(etat('Printemps', 8))
    expect(concoursRanges().map((r) => r.tournoi.nom)).toEqual(['Printemps'])
  })

  it('ne range pas un concours vierge, qui ne serait reconnaissable à rien', () => {
    ranger(etat(''))
    expect(concoursRanges()).toEqual([])
    expect(vierge(etat('').tournoi)).toBe(true)
    expect(vierge(etat('', 2).tournoi)).toBe(false)
  })

  it('remplace la version précédente du même concours au lieu de la doubler', () => {
    ranger(etat('Printemps', 8))
    ranger(etat('Printemps', 12))
    const liste = concoursRanges()
    expect(liste).toHaveLength(1)
    expect(liste[0].tournoi.equipes).toHaveLength(12)
  })

  it('présente les plus récemment touchés en premier', () => {
    vi.setSystemTime(new Date('2026-03-01T10:00:00Z'))
    ranger(etat('Printemps', 4))
    vi.setSystemTime(new Date('2026-09-01T10:00:00Z'))
    ranger(etat('Automne', 4))
    expect(concoursRanges().map((r) => r.tournoi.nom)).toEqual(['Automne', 'Printemps'])
    vi.useRealTimers()
  })
})

describe('basculer d’un concours à l’autre', () => {
  it('échange : l’ouvert entre dans la liste, le visé en sort', () => {
    const automne = etat('Automne', 6)
    ranger(automne)

    const ouvert = etat('Printemps', 10)
    ecrire(ouvert)
    const repris = basculer(ouvert, automne.tournoi.id)

    expect(repris?.tournoi.nom).toBe('Automne')
    expect(lire()?.tournoi.nom).toBe('Automne')
    expect(concoursRanges().map((r) => r.tournoi.nom)).toEqual(['Printemps'])
  })

  it('ne laisse jamais un concours à la fois ouvert et rangé', () => {
    const automne = etat('Automne', 6)
    ranger(automne)
    const ouvert = etat('Printemps', 10)
    ecrire(ouvert)
    basculer(ouvert, automne.tournoi.id)

    // La divergence que ce doublon provoquerait est le défaut dont on ne se
    // relève pas : la table de marque saisirait dans une copie, l'écran public
    // afficherait l'autre.
    const ids = concoursRanges().map((r) => r.tournoi.id)
    expect(ids).not.toContain(automne.tournoi.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ne touche à rien quand l’identifiant ne désigne aucun concours', () => {
    const ouvert = etat('Printemps', 10)
    ecrire(ouvert)
    ranger(etat('Automne', 6))

    expect(basculer(ouvert, 't-inconnu')).toBeNull()
    expect(lire()?.tournoi.nom).toBe('Printemps')
    expect(concoursRanges().map((r) => r.tournoi.nom)).toEqual(['Automne'])
  })
})

describe('résistance de la liste', () => {
  it('oublie un concours sans emporter les autres', () => {
    ranger(etat('Printemps', 4))
    ranger(etat('Automne', 4))
    oublier('t-Printemps')
    expect(concoursRanges().map((r) => r.tournoi.nom)).toEqual(['Automne'])
  })

  it('écarte une entrée abîmée plutôt que de perdre la liste entière', () => {
    ranger(etat('Printemps', 4))
    const liste = JSON.parse(localStorage.getItem('petanque.concours.v1')!) as unknown[]
    localStorage.setItem('petanque.concours.v1', JSON.stringify([{ tournoi: null }, ...liste]))
    expect(concoursRanges().map((r) => r.tournoi.nom)).toEqual(['Printemps'])
  })

  it('rend une liste vide quand la sauvegarde est illisible', () => {
    localStorage.setItem('petanque.concours.v1', 'ceci n’est pas du JSON')
    expect(concoursRanges()).toEqual([])
  })

  it('laisse le concours ouvert dans sa propre clé, lue par l’écran public', () => {
    ecrire(etat('Printemps', 4))
    expect(localStorage.getItem(CLE)).not.toBeNull()
    expect(JSON.parse(localStorage.getItem(CLE)!).tournoi.nom).toBe('Printemps')
  })
})

describe('ouvrir un fichier', () => {
  it('range l’ouvert et sort l’entrant de la liste s’il s’y trouvait déjà', () => {
    const printemps = etat('Printemps', 16)
    ranger(printemps)

    const ouvert = etat('Automne', 6)
    ecrire(ouvert)
    // Le fichier qu'on rouvre est celui d'un concours déjà rangé.
    remplacer(ouvert, printemps)

    expect(lire()?.tournoi.nom).toBe('Printemps')
    expect(concoursRanges().map((r) => r.tournoi.nom)).toEqual(['Automne'])
  })
})
