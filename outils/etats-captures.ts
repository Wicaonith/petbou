/**
 * Fabrique les concours de démonstration que « outils/captures.mjs » met en
 * scène, et les écrit dans captures/etats/.
 *
 * Ils sortent du moteur plutôt que d un fichier écrit à la main : un concours
 * inventé finirait par montrer des écrans que le logiciel ne produit jamais —
 * des captures qui mentent sur le produit.
 *
 *   npx vite-node outils/etats-captures.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  creerTournoi,
  enCours,
  lancerProchainsMatchs,
  saisirScore,
  type Equipe,
  type Tournoi,
} from '../src/engine/index'

const NOMS = [
  'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Garcia', 'David',
  'Roux', 'Vidal', 'Blanc', 'Faure', 'Girard', 'Bonnet', 'Rousseau', 'Mercier',
  'Perrin', 'Morel', 'Fournier', 'Giraud', 'Lemoine', 'Gautier', 'Chevalier', 'Robin',
  'Pelletier', 'Colin', 'Vincent', 'Masson', 'Brun', 'Clement', 'Lopez', 'Arnaud',
  'Barbier', 'Renard', 'Leroy', 'Guerin', 'Boyer', 'Caron', 'Charles', 'Benoit',
  'Marchand', 'Dumas', 'Gaillard', 'Philippe', 'Riviere', 'Noel', 'Meyer', 'Lefebvre',
]

const PRENOMS = [
  'Alain', 'Michel', 'Josiane', 'Gérard', 'Monique', 'Daniel', 'Nicole', 'Patrick',
  'Christiane', 'Bernard', 'Martine', 'Claude', 'Jacqueline', 'Serge', 'Danielle', 'René',
  'Françoise', 'Guy', 'Annie', 'Roger', 'Chantal', 'Jean-Pierre', 'Sylvie', 'André',
]

function equipes(n: number): Equipe[] {
  return Array.from({ length: n }, (_, i) => {
    const a = `${PRENOMS[(i * 2) % PRENOMS.length]} ${NOMS[(i * 2) % NOMS.length]}`
    const b = `${PRENOMS[(i * 2 + 1) % PRENOMS.length]} ${NOMS[(i * 2 + 1) % NOMS.length]}`
    return {
      id: `eq${i + 1}`,
      numero: i + 1,
      nom: `${a} / ${b}`,
      joueurs: [
        { id: `eq${i + 1}j1`, nom: a },
        { id: `eq${i + 1}j2`, nom: b },
      ],
    }
  })
}

/** Scores plausibles : le gagnant à 13, le perdant entre 3 et 12. */
function jouerTour(t: Tournoi, graine: number): Tournoi {
  let n = graine
  const suivant = () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648
  for (const m of enCours(t)) {
    const perdu = 3 + Math.floor(suivant() * 10)
    t = suivant() < 0.5 ? saisirScore(t, m.id, 13, perdu) : saisirScore(t, m.id, perdu, 13)
  }
  return t
}


const base = creerTournoi({
  nom: 'Concours de la Bouillonne',
  date: '2026-10-03',
  formation: 'doublette',
  nbTerrains: 8,
  format: 'suisse',
  nbTours: 4,
  graine: 20261003,
})
const eqs = equipes(24)
const noms = eqs.flatMap((e) => e.joueurs.map((j) => j.nom))
const ecrire = (nom: string, t: Tournoi) =>
  writeFileSync(`captures/etats/${nom}.json`, JSON.stringify({ tournoi: t, noms }))

mkdirSync('captures/etats', { recursive: true })

// 0 — équipes saisies, rien de lancé : réglages, saisie, premier tirage.
const avant: Tournoi = { ...base, equipes: eqs }
ecrire('avant', avant)

// A — deux tours joués, tout saisi : classement, et tirage du tour 3.
let t = avant
for (let i = 0; i < 2; i++) t = jouerTour(lancerProchainsMatchs(t), 7 + i)
ecrire('entre-deux-tours', t)

// B — tour 3 lancé, trois parties encore en jeu : saisie et écran public.
let b = lancerProchainsMatchs(t)
const aJouer = enCours(b)
for (const m of aJouer.slice(0, aJouer.length - 3)) b = saisirScore(b, m.id, 13, 7)
ecrire('en-cours', b)
