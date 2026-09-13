import { describe, expect, it } from 'vitest'
import {
  DRIVERS,
  classement,
  classementParTableau,
  clePaire,
  dejaRencontrees,
  lancerProchainsMatchs,
  matchJoue,
  nomPoule,
  ordreTableau,
  peutRetirer,
  placer,
  propositionDe,
  retirerAuSort,
  qualifiees,
  repartir,
  saisirScore,
  taillesDePoules,
  termine,
  vainqueur,
  type Match,
  type Tournoi,
} from '../index'
import { equipes, jouer, matchsParEquipe, tournoi } from './simulation'

const enCoursSansTerrain = (t: Tournoi): number =>
  t.matchs.filter((m) => !matchJoue(m) && m.terrain === null).length

/** Effectifs réalistes pour un concours de club, plus quelques cas tordus. */
const EFFECTIFS = [4, 6, 8, 9, 12, 13, 15, 16, 17, 20, 24, 31, 32, 48]

describe('répartition en poules', () => {
  it('ne fait que des poules de 3 ou 4 et privilégie les 4', () => {
    for (let n = 3; n <= 100; n++) {
      if (n === 5) continue
      const tailles = taillesDePoules(n)
      expect(tailles.reduce((a, b) => a + b, 0), `n=${n}`).toBe(n)
      expect(tailles.every((t) => t === 3 || t === 4), `n=${n} -> ${tailles}`).toBe(true)
      expect(tailles.filter((t) => t === 3).length, `n=${n}`).toBeLessThanOrEqual(3)
    }
  })

  it('place chaque équipe dans exactement une poule', () => {
    for (const n of EFFECTIFS) {
      const poules = repartir(equipes(n), 42)
      const ids = poules.flat().map((e) => e.id)
      expect(new Set(ids).size, `n=${n}`).toBe(n)
    }
  })

  it('sépare les têtes de série', () => {
    const eqs = equipes(16).map((e, i) => (i < 4 ? { ...e, seed: i + 1 } : e))
    const poules = repartir(eqs, 42)
    for (const p of poules) {
      expect(p.filter((e) => e.seed !== undefined).length).toBeLessThanOrEqual(1)
    }
  })
})

describe('poule de 4', () => {
  it('se joue en 5 matchs et qualifie 2 équipes', () => {
    const { final } = jouer(tournoi(16, 'poules'))
    expect(termine(final)).toBe(true)
    for (let i = 0; i < 4; i++) {
      const groupe = nomPoule(i)
      const ms = final.matchs.filter((m) => m.groupe === groupe)
      expect(ms.length, groupe).toBe(5)
      expect(ms.map((m) => m.libelle)).toContain('Barrage')
      const eqs = repartir(final.equipes, final.config.graine!)[i]
      expect(qualifiees(eqs, ms).length, groupe).toBe(2)
    }
  })

  it('envoie le perdant des gagnants en barrage, jamais le gagnant', () => {
    let t: Tournoi = tournoi(4, 'poules')
    t = lancerProchainsMatchs(t)
    t = saisirScore(t, t.matchs[0].id, 13, 5) // e? bat e?
    t = saisirScore(t, t.matchs[1].id, 13, 8)
    t = lancerProchainsMatchs(t)

    const g = t.matchs.find((m) => m.libelle === 'Gagnants')!
    const p = t.matchs.find((m) => m.libelle === 'Perdants')!
    t = saisirScore(t, g.id, 13, 11)
    t = saisirScore(t, p.id, 13, 2)
    t = lancerProchainsMatchs(t)

    const barrage = t.matchs.find((m) => m.libelle === 'Barrage')!
    expect([barrage.equipeA, barrage.equipeB]).toContain(g.equipeB) // perdant des gagnants
    expect([barrage.equipeA, barrage.equipeB]).toContain(p.equipeA) // gagnant des perdants
    expect([barrage.equipeA, barrage.equipeB]).not.toContain(g.equipeA)
  })
})

describe('tableaux finals après les poules', () => {
  /** Les deux qualifiées de chaque poule, dans l'ordre : 1re puis 2e. */
  const qualifieesParPoule = (t: Tournoi): string[][] =>
    repartir(t.equipes, t.config.graine ?? 1).map((eqs, i) =>
      qualifiees(
        eqs,
        t.matchs.filter((m) => m.groupe === nomPoule(i)),
      ),
    )

  const equipesDuGroupe = (t: Tournoi, groupe: string): Set<string> => {
    const ids = new Set<string>()
    for (const m of t.matchs.filter((x) => x.groupe === groupe)) {
      ids.add(m.equipeA)
      if (m.equipeB !== null) ids.add(m.equipeB)
    }
    return ids
  }

  it('envoie les 1res de poule en tableau A et les 2es en tableau B', () => {
    for (const n of [16, 20, 24, 32]) {
      const { final } = jouer(tournoi(n, 'poules'))
      const qualifiees = qualifieesParPoule(final)
      const premieres = new Set(qualifiees.map((q) => q[0]))
      const secondes = new Set(qualifiees.map((q) => q[1]))

      for (const id of equipesDuGroupe(final, 'Tableau A')) expect(premieres.has(id)).toBe(true)
      for (const id of equipesDuGroupe(final, 'Tableau B')) expect(secondes.has(id)).toBe(true)
    }
  })

  it('désigne un vainqueur dans chacun des deux tableaux', () => {
    for (const n of [16, 24, 32]) {
      const { final } = jouer(tournoi(n, 'poules'))
      expect(termine(final)).toBe(true)
      for (const groupe of ['Tableau A', 'Tableau B']) {
        expect(vainqueur(final.matchs.filter((m) => m.groupe === groupe))).not.toBeNull()
      }
    }
  })

  it('n’ouvre aucun tableau tant qu’une poule n’est pas allée au bout', () => {
    // 16 équipes, 4 poules : on joue tout sauf le barrage de la dernière poule.
    let t = tournoi(16, 'poules')
    for (let i = 0; i < 20 && propositionDe(t).length > 0; i++) {
      t = lancerProchainsMatchs(t)
      const aJouer = t.matchs.filter((m) => !matchJoue(m))
      // On laisse toujours le dernier match en suspens.
      for (const m of aJouer.slice(0, -1)) t = saisirScore(t, m.id, 13, 7)
    }
    const enSuspens = t.matchs.filter((m) => !matchJoue(m))
    expect(enSuspens.length).toBeGreaterThan(0)
    expect(t.matchs.some((m) => m.groupe === 'Tableau A')).toBe(false)
  })

  it('s’arrête aux poules quand le tableau final n’est pas demandé', () => {
    const { final } = jouer(tournoi(16, 'poules', { tableauFinal: false }))
    expect(termine(final)).toBe(true)
    expect(final.matchs.every((m) => m.groupe?.startsWith('Poule'))).toBe(true)
  })

  it('annonce des tours qui couvrent les poules et le tableau', () => {
    const t = tournoi(16, 'poules')
    const sans = tournoi(16, 'poules', { tableauFinal: false })
    const prevusAvec = DRIVERS.poules.toursPrevus(16, t.config)
    const prevusSans = DRIVERS.poules.toursPrevus(16, sans.config)
    // 4 poules : 2 tours de tableau en plus (demi-finales puis finale).
    expect(prevusAvec).toBe(prevusSans + 2)
  })
})

describe('classement par tableau', () => {
  it('donne un classement par tableau en multi-chances, avec son vainqueur', () => {
    const { final } = jouer(tournoi(16, 'multichances'))
    const sections = classementParTableau(final)

    expect(sections.map((s) => s.titre)).toEqual(['Tableau A', 'Tableau B', 'Tableau C'])
    for (const s of sections) {
      expect(s.vainqueur).toBeTruthy()
      // Personne n'apparaît deux fois : une équipe est classée là où elle a fini.
      expect(new Set(s.lignes.map((l) => l.equipeId)).size).toBe(s.lignes.length)
    }
    const tous = sections.flatMap((s) => s.lignes.map((l) => l.equipeId))
    expect(new Set(tous).size).toBe(tous.length)
    expect(tous.length).toBe(final.equipes.length)
  })

  it('sépare les tableaux finals des poules et garde les éliminées', () => {
    const { final } = jouer(tournoi(16, 'poules'))
    const sections = classementParTableau(final)

    expect(sections.map((s) => s.titre)).toEqual([
      'Tableau A',
      'Tableau B',
      'Éliminées avant les tableaux',
    ])
    // 4 poules : 4 qualifiées par tableau, et les 8 autres éliminées en poules.
    expect(sections[0].lignes.length).toBe(4)
    expect(sections[1].lignes.length).toBe(4)
    expect(sections[2].lignes.length).toBe(8)
    expect(sections[2].vainqueur).toBeUndefined()
  })

  it('garde un classement unique quand le format n’a qu’un tableau', () => {
    for (const t of [tournoi(12, 'suisse'), tournoi(12, 'seeding'), tournoi(12, 'poules', { tableauFinal: false })]) {
      const sections = classementParTableau(jouer(t).final)
      expect(sections.length).toBe(1)
      expect(sections[0].titre).toBe('Classement')
      expect(sections[0].lignes.length).toBe(12)
    }
  })
})

describe('système suisse', () => {
  it("n'impose aucune revanche sur un nombre de tours raisonnable", () => {
    for (const n of EFFECTIFS) {
      const { final } = jouer(tournoi(n, 'suisse'))
      const vus = new Set<string>()
      for (const m of final.matchs) {
        if (m.equipeB === null) continue
        const cle = clePaire(m.equipeA, m.equipeB)
        expect(vus.has(cle), `n=${n} : ${m.equipeA} vs ${m.equipeB} rejoué`).toBe(false)
        vus.add(cle)
      }
    }
  })

  it('fait jouer le même nombre de tours à toutes les équipes', () => {
    for (const n of EFFECTIFS) {
      const t = tournoi(n, 'suisse', { nbTours: 4 })
      const { final } = jouer(t)
      expect(termine(final), `n=${n}`).toBe(true)
      const parEquipe = new Map(final.equipes.map((e) => [e.id, 0]))
      for (const m of final.matchs) {
        parEquipe.set(m.equipeA, parEquipe.get(m.equipeA)! + 1)
        if (m.equipeB) parEquipe.set(m.equipeB, parEquipe.get(m.equipeB)! + 1)
      }
      expect([...new Set(parEquipe.values())], `n=${n}`).toEqual([4])
    }
  })

  it('ne donne pas deux exempts à une équipe avant que les autres en aient un', () => {
    const { final } = jouer(tournoi(9, 'suisse', { nbTours: 5 }))
    const exempts = new Map<string, number>()
    for (const m of final.matchs) {
      if (m.equipeB === null) exempts.set(m.equipeA, (exempts.get(m.equipeA) ?? 0) + 1)
    }
    expect(Math.max(...exempts.values())).toBe(1)
    expect(exempts.size).toBe(5) // 5 tours, 9 équipes : 5 exempts distincts
  })

  /**
   * Cas remonté du terrain : à 9 équipes, le tour 2 sort une équipe à
   * 1 victoire contre une équipe à 0, ce qui ressemble à une erreur.
   *
   * Ce n'en est pas une, et ce test fige le pourquoi. L'exempt part à la
   * dernière au classement, donc il ampute le groupe des battus : 4 battus
   * moins l'exempt, il en reste 3, un nombre impair, et l'un d'eux doit
   * forcément monter d'un cran. Ensuite la non-revanche décide lequel : le
   * voisin naturel de e4 est e9, mais ils se sont déjà rencontrés au tour 1.
   */
  it('croise les groupes de victoires plutôt que d’imposer une revanche', () => {
    const base = tournoi(9, 'suisse', { nbTours: 4 })
    const m = (id: string, a: string, b: string | null, sa: number, sb: number): Match => ({
      id, tour: 1, equipeA: a, equipeB: b, scoreA: sa, scoreB: sb, terrain: null,
    })
    const apresTour1: Tournoi = {
      ...base,
      matchs: [
        m('m1', 'e3', 'e5', 13, 4),
        m('m2', 'e4', 'e9', 13, 9),
        m('m3', 'e1', 'e2', 13, 5),
        m('m4', 'e7', 'e8', 13, 5),
        m('m5', 'e6', null, 13, 7),
      ],
    }

    const tour2 = propositionDe(apresTour1)
    const affiche = (id: string) => tour2.find((x) => x.equipeA === id || x.equipeB === id)!

    // L'exempt va à la dernière du classement qui n'en a pas encore eu :
    // e6 a déjà été exempte, e5 est dernière.
    expect(tour2.find((x) => x.equipeB === null)!.equipeA).toBe('e5')

    // e4 (1 victoire) rencontre e2 (0 victoire) parce que son voisin de
    // classement e9 serait une revanche du tour 1.
    expect(affiche('e4')).toMatchObject({ equipeA: 'e4', equipeB: 'e2' })
    const rencontrees = dejaRencontrees(apresTour1.matchs)
    expect(rencontrees.has(clePaire('e4', 'e9'))).toBe(true)

    // Et aucune des cinq affiches n'est une revanche.
    for (const x of tour2) {
      if (x.equipeB !== null) expect(rencontrees.has(clePaire(x.equipeA, x.equipeB))).toBe(false)
    }
  })
})

describe('tableau à élimination directe', () => {
  it('désigne un vainqueur unique quel que soit l’effectif', () => {
    for (const n of EFFECTIFS) {
      const { final } = jouer(tournoi(n, 'seeding'))
      expect(termine(final), `n=${n}`).toBe(true)
      expect(vainqueur(final.matchs), `n=${n}`).not.toBeNull()
    }
  })

  it('place les têtes de série 1 et 2 dans des moitiés opposées', () => {
    for (const taille of [8, 16, 32]) {
      const ordre = ordreTableau(taille)
      expect(ordre.indexOf(1)).toBeLessThan(taille / 2)
      expect(ordre.indexOf(2)).toBeGreaterThanOrEqual(taille / 2)
    }
  })

  it('donne les exempts du premier tour aux mieux classées', () => {
    const eqs = equipes(12).map((e, i) => ({ ...e, seed: i + 1 }))
    const places = placer(eqs, 42)
    // 12 équipes dans un tableau de 16 : 4 exempts, pour les seeds 1 à 4.
    for (let i = 0; i < places.length; i += 2) {
      if (places[i] === null) expect(places[i + 1]!.seed).toBeLessThanOrEqual(4)
      if (places[i + 1] === null) expect(places[i]!.seed).toBeLessThanOrEqual(4)
    }
  })
})

describe('multi-chances A/B/C', () => {
  it('ne renvoie personne chez soi après un seul match', () => {
    // Le repêchage porte sur le 1er tour : battu d'entrée en A, on repart en B,
    // battu d'entrée en B, on repart en C. Une équipe sortie au 2e tour d'un
    // tableau n'est pas repêchée — c'est la règle du format, pas un oubli.
    for (const n of [8, 16, 32]) {
      const { final } = jouer(tournoi(n, 'multichances'))
      expect(termine(final), `n=${n}`).toBe(true)
      for (const [id, joues] of matchsParEquipe(final)) {
        expect(joues, `n=${n}, ${id} n'a joué que ${joues} match(s)`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('fait jouer 3 matchs à qui perd son entrée en A puis en B', () => {
    const { final } = jouer(tournoi(16, 'multichances'))
    const perdantEntree = (groupe: string) =>
      final.matchs
        .filter((m) => m.groupe === groupe && m.tour === 1)
        .map((m) => (m.scoreA! > m.scoreB! ? m.equipeB! : m.equipeA))
    const sortisEnC = new Set(perdantEntree('B'))
    const joues = matchsParEquipe(final)
    for (const id of sortisEnC) {
      expect(joues.get(id), `${id}`).toBeGreaterThanOrEqual(3)
    }
    expect(sortisEnC.size).toBeGreaterThan(0)
  })

  it('ouvre le tableau B avec les perdants du premier tour de A', () => {
    const { final } = jouer(tournoi(16, 'multichances'))
    const perdantsA = final.matchs
      .filter((m) => m.groupe === 'A' && m.tour === 1)
      .map((m) => (m.scoreA! > m.scoreB! ? m.equipeB : m.equipeA))
    const joueursB = new Set(
      final.matchs
        .filter((m) => m.groupe === 'B' && m.tour === 1)
        .flatMap((m) => [m.equipeA, m.equipeB]),
    )
    for (const p of perdantsA) expect(joueursB.has(p!), `${p} absent du tableau B`).toBe(true)
  })
})

describe('tirage', () => {
  it("propose sans rien engager", () => {
    const t = tournoi(12, 'poules')
    expect(propositionDe(t).length).toBeGreaterThan(0)
    expect(propositionDe(t).length).toBe(propositionDe(t).length)
    expect(t.matchs.length, 'proposer ne doit créer aucun match').toBe(0)
  })

  it('donne un tirage différent à chaque relance, tant que rien n’est joué', () => {
    const t = tournoi(12, 'poules', { graine: 1 })
    const avant = repartir(t.equipes, t.config.graine!).map((p) => p.map((e) => e.id).join())
    const relance = retirerAuSort(t, 12345)
    const apres = repartir(relance.equipes, relance.config.graine!).map((p) => p.map((e) => e.id).join())
    expect(relance.config.graine).toBe(12345)
    expect(apres).not.toEqual(avant)
  })

  it('refuse de relancer une fois la première partie jouée', () => {
    // Changer la graine en cours de route réécrirait la composition des poules.
    let t = lancerProchainsMatchs(tournoi(12, 'poules', { graine: 1 }))
    const poulesAvant = repartir(t.equipes, t.config.graine!).map((p) => p.map((e) => e.id).join())
    expect(peutRetirer(t)).toBe(false)
    t = retirerAuSort(t, 999)
    expect(t.config.graine).toBe(1)
    expect(repartir(t.equipes, t.config.graine!).map((p) => p.map((e) => e.id).join())).toEqual(poulesAvant)
  })

  it('ne propose rien tant que le tour en cours n’est pas terminé', () => {
    const t = lancerProchainsMatchs(tournoi(12, 'poules'))
    expect(propositionDe(t)).toEqual([])
  })

  it('propose exactement ce qui sera créé à la validation', () => {
    for (const format of ['poules', 'suisse', 'seeding', 'multichances'] as const) {
      const t = tournoi(16, format)
      const propose = propositionDe(t)
      const valide = lancerProchainsMatchs(t)
      expect(valide.matchs.length, format).toBe(propose.length)
      expect(valide.matchs.map((m) => [m.equipeA, m.equipeB]), format).toEqual(
        propose.map((m) => [m.equipeA, m.equipeB]),
      )
    }
  })
})

describe('terrains', () => {
  it("ne met jamais deux matchs en cours sur le même terrain", () => {
    for (const format of ['poules', 'suisse', 'seeding', 'multichances'] as const) {
      let t = tournoi(24, format, { nbTerrains: 6 })
      for (let i = 0; i < 30 && !termine(t); i++) {
        t = lancerProchainsMatchs(t)
        const occupes = t.matchs.filter((m) => !matchJoue(m) && m.terrain !== null).map((m) => m.terrain)
        expect(new Set(occupes).size, format).toBe(occupes.length)
        expect(occupes.every((n) => n! >= 1 && n! <= 6), format).toBe(true)
        const suivant = t.matchs.find((m) => !matchJoue(m))
        if (!suivant) break
        t = saisirScore(t, suivant.id, 13, 4)
      }
    }
  })

  it('n’attribue aucun terrain quand le club n’en gère pas', () => {
    for (const format of ['poules', 'suisse', 'seeding', 'multichances'] as const) {
      const { final } = jouer(tournoi(16, format, { nbTerrains: null }))
      expect(termine(final), format).toBe(true)
      expect(final.matchs.every((m) => m.terrain === null), format).toBe(true)
    }
  })

  it('lance tout le tour d’un coup quand les terrains ne sont pas gérés', () => {
    // Avec 6 terrains, 2 des 8 affiches attendraient ; sans gestion, aucune.
    const avec = lancerProchainsMatchs(tournoi(16, 'suisse', { nbTerrains: 6 }))
    const sans = lancerProchainsMatchs(tournoi(16, 'suisse', { nbTerrains: null }))
    expect(enCoursSansTerrain(avec)).toBe(2)
    expect(enCoursSansTerrain(sans)).toBe(8)
    expect(sans.matchs.length).toBe(8)
  })

  it('ne laisse aucun terrain libre pendant qu’un match attend', () => {
    let t = tournoi(24, 'suisse', { nbTerrains: 6 })
    t = lancerProchainsMatchs(t)
    const enAttente = t.matchs.filter((m) => !matchJoue(m) && m.terrain === null)
    const occupes = t.matchs.filter((m) => !matchJoue(m) && m.terrain !== null)
    expect(enAttente.length > 0 ? occupes.length : 6).toBe(6)
  })
})

describe('classement', () => {
  const ligne = (id: string, sa: number, sb: number, adv: string): Match => ({
    id, tour: 1, equipeA: id, equipeB: adv, scoreA: sa, scoreB: sb, terrain: null,
  })

  it('départage par victoires, puis goal-average, puis points marqués', () => {
    const eqs = equipes(4)
    const matchs: Match[] = [
      ligne('e1', 13, 2, 'e2'),
      ligne('e3', 13, 11, 'e4'),
      { id: 'm3', tour: 2, equipeA: 'e1', equipeB: 'e3', scoreA: 7, scoreB: 13, terrain: null },
      { id: 'm4', tour: 2, equipeA: 'e2', equipeB: 'e4', scoreA: 13, scoreB: 9, terrain: null },
    ]
    const cl = classement(eqs, matchs)
    expect(cl[0].equipeId).toBe('e3') // 2 victoires
    expect(cl[0].victoires).toBe(2)
    expect(cl[1].equipeId).toBe('e1') // 1 V, diff (13+7) - (2+13) = +5
    expect(cl[1].diff).toBe(5)
    expect(cl.at(-1)!.equipeId).toBe('e4') // 0 victoire
  })

  /**
   * Le club peut refuser que l'exempt pèse sur le goal-average. « Aucun point »
   * s'écrit alors 0-0, jamais des scores nuls : matchJoue() prendrait l'exempt
   * pour une partie en cours, et le tour ne se terminerait jamais.
   */
  it('accepte un exempt sans points, sans bloquer le tour', () => {
    const base = tournoi(9, 'suisse', { nbTours: 3 })
    const { final } = jouer({ ...base, config: { ...base.config, scoreExempt: [0, 0] } })

    expect(termine(final)).toBe(true)
    const exempts = final.matchs.filter((m) => m.equipeB === null)
    expect(exempts.length).toBeGreaterThan(0)
    expect(exempts.every(matchJoue)).toBe(true)

    for (const m of exempts) {
      const l = classement(final.equipes, final.matchs).find((x) => x.equipeId === m.equipeA)!
      // La victoire est bien acquise, mais l'exempt n'a rien ajouté au départage.
      expect(l.victoires).toBeGreaterThan(0)
      expect(m.scoreA).toBe(0)
      expect(m.scoreB).toBe(0)
    }
  })

  it('compte un exempt comme une victoire sans match joué', () => {
    const cl = classement(equipes(2), [
      { id: 'm1', tour: 1, equipeA: 'e1', equipeB: null, scoreA: 13, scoreB: 7, terrain: null },
    ])
    const e1 = cl.find((l) => l.equipeId === 'e1')!
    expect(e1.victoires).toBe(1)
    expect(e1.joues).toBe(0)
    expect(e1.exempts).toBe(1)
  })
})
