import { useEffect, useState } from 'react'
import './ui/styles.css'
import {
  DRIVERS,
  creerTournoi,
  driverDe,
  enCours,
  lancerProchainsMatchs,
  saisirScore,
  annulerScore,
  termine,
  toursRecommandes,
  type FormatId,
  type Formation,
  type Tournoi,
} from './engine'
import { SaisieEquipes, equipesDepuisNoms } from './ui/SaisieEquipes'
import { Feuilles } from './ui/Feuilles'
import { enregistrer, ouvrir } from './ui/fichier'
import { Matchs } from './ui/Matchs'
import { Classement } from './ui/Classement'

const CLE = 'petanque.tournoi.v1'

const FORMATS: { id: FormatId; titre: string; quand: string }[] = [
  {
    id: 'poules',
    titre: 'Poules',
    quand: 'Poules de 4 (ou de 3), 2 équipes qualifiées par poule. Le format de concours classique.',
  },
  {
    id: 'suisse',
    titre: 'Système suisse',
    quand: 'Chacun joue tous les tours contre une équipe au même nombre de victoires. Personne n’est éliminé.',
  },
  {
    id: 'seeding',
    titre: 'Élimination directe',
    quand: 'Tableau avec têtes de série. Rapide, mais la moitié des équipes sort après un match.',
  },
  {
    id: 'multichances',
    titre: 'Multi-chances A / B / C',
    quand: 'Battu d’entrée, on repart dans le tableau suivant. Personne ne rentre après un seul match.',
  },
]

type Onglet = 'reglages' | 'equipes' | 'matchs' | 'classement'

export default function App() {
  const [tournoi, setTournoi] = useState<Tournoi>(() => charger() ?? nouveau())
  const [noms, setNoms] = useState<string[]>(() => chargerNoms())
  const [onglet, setOnglet] = useState<Onglet>('reglages')

  const lance = tournoi.matchs.length > 0

  // Sauvegarde à chaque frappe : un PC qui s'éteint en plein concours ne doit
  // rien coûter de plus qu'un redémarrage.
  useEffect(() => {
    localStorage.setItem(CLE, JSON.stringify({ tournoi, noms }))
  }, [tournoi, noms])

  // Tant qu'aucun match n'est lancé, les équipes suivent la saisie.
  useEffect(() => {
    if (lance) return
    setTournoi((t) => ({ ...t, equipes: equipesDepuisNoms(noms, t.formation) }))
  }, [noms, tournoi.formation, lance])

  const regler = <K extends keyof Tournoi>(cle: K, valeur: Tournoi[K]) =>
    setTournoi((t) => ({ ...t, [cle]: valeur }))

  const lancer = () => {
    setTournoi((t) => lancerProchainsMatchs(t))
    setOnglet('matchs')
  }

  /** `feuilles` n'imprime que les feuilles de match ; sinon, l'écran courant. */
  const imprimer = (mode?: 'feuilles') => {
    if (mode) document.body.dataset.impression = mode
    window.print()
    delete document.body.dataset.impression
  }

  const ouvrirFichier = async () => {
    try {
      const donnees = await ouvrir()
      if (!donnees) return
      setTournoi(donnees.tournoi)
      setNoms(donnees.noms ?? [])
      setOnglet(donnees.tournoi.matchs.length > 0 ? 'matchs' : 'equipes')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fichier illisible.')
    }
  }

  const attente = enCours(tournoi).length
  const fini = termine(tournoi)
  const prets = tournoi.equipes.length

  return (
    <div className="app">
      <header className="entete">
        <h1>{tournoi.nom || 'Concours sans nom'}</h1>
        <span className="meta">
          {tournoi.formation} · {DRIVERS[tournoi.config.format].nom} · {prets} équipe
          {prets > 1 ? 's' : ''}
          {tournoi.nbTerrains !== null && ` · ${tournoi.nbTerrains} terrains`}
        </span>
        <div className="droite">
          <button className="secondaire" onClick={ouvrirFichier}>
            Ouvrir
          </button>
          <button
            className="secondaire"
            onClick={() => enregistrer({ version: 1, tournoi, noms }, tournoi.nom)}
          >
            Enregistrer
          </button>
          <button className="secondaire" onClick={() => imprimer()}>
            Imprimer
          </button>
          <button
            className="secondaire"
            onClick={() => {
              if (!confirm('Effacer ce concours et repartir de zéro ?')) return
              setTournoi(nouveau())
              setNoms([])
              setOnglet('reglages')
            }}
          >
            Nouveau concours
          </button>
        </div>
      </header>

      <nav className="onglets" role="tablist">
        {(
          [
            ['reglages', 'Réglages'],
            ['equipes', `Équipes (${prets})`],
            ['matchs', attente > 0 ? `Matchs · ${attente} en cours` : 'Matchs'],
            ['classement', 'Classement'],
          ] as const
        ).map(([id, libelle]) => (
          <button key={id} role="tab" aria-selected={onglet === id} onClick={() => setOnglet(id)}>
            {libelle}
          </button>
        ))}
      </nav>

      {fini && <div className="bandeau">Concours terminé. Le classement final est définitif.</div>}
      {!fini && lance && attente === 0 && (
        <div className="bandeau">
          Tous les scores du tour sont saisis.{' '}
          <button className="action" style={{ marginLeft: 8 }} onClick={lancer}>
            Lancer le tour suivant
          </button>
        </div>
      )}

      {onglet === 'reglages' && (
        <Reglages tournoi={tournoi} lance={lance} regler={regler} setTournoi={setTournoi} />
      )}

      {onglet === 'equipes' && (
        <>
          {lance && (
            <div className="bandeau">
              Le concours est lancé : la liste des équipes est figée pour ne pas fausser les
              tirages déjà effectués.
            </div>
          )}
          {lance ? (
            <div className="carte">
              <h2>Équipes engagées</h2>
              <ol>
                {tournoi.equipes.map((e) => (
                  <li key={e.id} style={{ padding: '4px 0' }}>
                    {e.nom}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <>
              <SaisieEquipes formation={tournoi.formation} noms={noms} onChange={setNoms} />
              <div className="carte">
                <button className="action" onClick={lancer} disabled={prets < 2}>
                  Lancer le concours avec {prets} équipe{prets > 1 ? 's' : ''}
                </button>
                {prets < 2 && <p className="aide" style={{ marginTop: 12 }}>Il faut au moins 2 équipes complètes.</p>}
              </div>
            </>
          )}
        </>
      )}

      {onglet === 'matchs' && attente > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button className="secondaire" onClick={() => imprimer('feuilles')}>
            Imprimer les {attente} feuilles de match
          </button>
        </div>
      )}

      {onglet === 'matchs' && (
        <Matchs
          tournoi={tournoi}
          onScore={(id, a, b) => setTournoi((t) => saisirScore(t, id, a, b))}
          onAnnuler={(id) => setTournoi((t) => annulerScore(t, id))}
        />
      )}

      {onglet === 'classement' && <Classement tournoi={tournoi} />}

      <Feuilles tournoi={tournoi} />
    </div>
  )
}

function Reglages({
  tournoi,
  lance,
  regler,
  setTournoi,
}: {
  tournoi: Tournoi
  lance: boolean
  regler: <K extends keyof Tournoi>(cle: K, valeur: Tournoi[K]) => void
  setTournoi: (maj: (t: Tournoi) => Tournoi) => void
}) {
  const config = (champ: 'format' | 'butScore' | 'nbTours', valeur: unknown) =>
    setTournoi((t) => ({ ...t, config: { ...t.config, [champ]: valeur } }))

  const prevus = driverDe(tournoi).toursPrevus(tournoi.equipes.length, tournoi.config)

  return (
    <>
      <div className="carte">
        <h2>Le concours</h2>
        <div className="grille">
          <div>
            <label htmlFor="nom">Nom</label>
            <input id="nom" value={tournoi.nom} onChange={(e) => regler('nom', e.target.value)} />
          </div>
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={tournoi.date} onChange={(e) => regler('date', e.target.value)} />
          </div>
          <div>
            <label htmlFor="formation">Formation</label>
            <select
              id="formation"
              value={tournoi.formation}
              disabled={lance}
              onChange={(e) => regler('formation', e.target.value as Formation)}
            >
              <option value="doublette">Doublette (2 joueurs)</option>
              <option value="triplette">Triplette (3 joueurs)</option>
            </select>
          </div>
          <div>
            <label htmlFor="terrains">Nombre de terrains (facultatif)</label>
            <input
              id="terrains"
              type="number"
              min={1}
              max={60}
              placeholder="Non gérés"
              value={tournoi.nbTerrains ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim()
                regler('nbTerrains', v === '' ? null : Math.max(1, Number(v) || 1))
              }}
            />
          </div>
          <div>
            <label htmlFor="but">Partie en</label>
            <select id="but" value={tournoi.config.butScore} onChange={(e) => config('butScore', Number(e.target.value))}>
              <option value={13}>13 points</option>
              <option value={11}>11 points</option>
            </select>
          </div>
        </div>
        <p className="aide" style={{ margin: '16px 0 0' }}>
          Laissez les terrains vides si vous ne les numérotez pas : les parties seront
          simplement annoncées ensemble, sans attribution ni attente.
        </p>
      </div>

      <div className="carte">
        <h2>Format</h2>
        <p className="aide">
          Vous n'indiquez que le nombre d'équipes : le logiciel en déduit les poules, les tours
          et le tableau. {tournoi.equipes.length > 0 && prevus > 0 && (
            <>
              Avec {tournoi.equipes.length} équipes, ce format se joue en <strong>{prevus} tours</strong>.
            </>
          )}
        </p>
        <div className="grille">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              className="secondaire"
              disabled={lance}
              onClick={() => config('format', f.id)}
              style={{
                textAlign: 'left',
                padding: 16,
                borderColor: tournoi.config.format === f.id ? 'var(--accent)' : undefined,
                borderWidth: tournoi.config.format === f.id ? 2 : 1,
                background: tournoi.config.format === f.id ? 'var(--accent-clair)' : undefined,
              }}
            >
              <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>{f.titre}</strong>
              <span style={{ color: 'var(--discret)', fontSize: 13, fontWeight: 400 }}>{f.quand}</span>
            </button>
          ))}
        </div>

        {tournoi.config.format === 'suisse' && (
          <div style={{ marginTop: 20, maxWidth: 240 }}>
            <label htmlFor="tours">Nombre de tours</label>
            <input
              id="tours"
              type="number"
              min={1}
              max={12}
              disabled={lance}
              value={tournoi.config.nbTours ?? toursRecommandes(tournoi.equipes.length)}
              onChange={(e) => config('nbTours', Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="aide" style={{ marginTop: 8 }}>
              Recommandé : {toursRecommandes(tournoi.equipes.length)} pour {tournoi.equipes.length} équipes.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

const nouveau = (): Tournoi =>
  creerTournoi({ nom: '', formation: 'doublette', nbTerrains: null, format: 'poules' })

function charger(): Tournoi | null {
  try {
    const brut = localStorage.getItem(CLE)
    return brut ? (JSON.parse(brut).tournoi as Tournoi) : null
  } catch {
    return null
  }
}

function chargerNoms(): string[] {
  try {
    const brut = localStorage.getItem(CLE)
    return brut ? ((JSON.parse(brut).noms as string[]) ?? []) : []
  } catch {
    return []
  }
}
