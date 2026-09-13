import { useEffect, useState } from 'react'
import './ui/styles.css'
import {
  DRIVERS,
  creerTournoi,
  driverDe,
  enCours,
  lancerProchainsMatchs,
  propositionDe,
  retirerAuSort,
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
import { Tirage } from './ui/Tirage'
import { Affichage } from './ui/Affichage'
import { Bilan } from './ui/Bilan'
import { Guide } from './ui/Guide'
import { ouvrirSecondEcran } from './ui/secondEcran'
import { ecrire, lire } from './stockage'
import { Classement } from './ui/Classement'
import { NumEquipe } from './ui/NumEquipe'

/**
 * Les formats présentés par ce que le club en obtient, pas par leur nom de
 * règlement : « système suisse » ne dit rien à quelqu'un qui organise son
 * premier concours, « tout le monde joue toute la journée » si.
 */
const FORMATS: { id: FormatId; titre: string; quand: string; conseille?: boolean }[] = [
  {
    id: 'poules',
    titre: 'Poules',
    quand: 'Des groupes de 4 équipes, puis les 2 meilleures de chaque groupe continuent : les premières dans le tableau A, les deuxièmes dans le tableau B. Chacun joue au moins 2 parties. C’est ce que font la plupart des clubs.',
    conseille: true,
  },
  {
    id: 'suisse',
    titre: 'Tout le monde joue tous les tours',
    quand: 'Personne n’est éliminé. Chaque équipe joue le même nombre de parties, contre des équipes qui ont gagné autant qu’elle. À choisir si vous voulez que tout le monde joue toute la journée.',
  },
  {
    id: 'multichances',
    titre: 'Deuxième chance',
    quand: 'Battu dès la première partie, on repart dans un second tableau au lieu de rentrer chez soi. Chacun joue au moins 2 parties.',
  },
  {
    id: 'seeding',
    titre: 'Élimination directe',
    quand: 'On perd, on sort. La moitié des équipes rentre après une seule partie. Réservez-le aux concours courts.',
  },
]

type Onglet = 'reglages' | 'equipes' | 'tirage' | 'matchs' | 'classement'

export default function App() {
  const [tournoi, setTournoi] = useState<Tournoi>(() => lire()?.tournoi ?? nouveau())
  const [noms, setNoms] = useState<string[]>(() => lire()?.noms ?? [])
  const [onglet, setOnglet] = useState<Onglet>('reglages')
  const [projection, setProjection] = useState(false)

  const lance = tournoi.matchs.length > 0

  // Sauvegarde à chaque frappe : un PC qui s'éteint en plein concours ne doit
  // rien coûter de plus qu'un redémarrage.
  useEffect(() => {
    ecrire({ tournoi, noms })
  }, [tournoi, noms])

  // Tant qu'aucun match n'est lancé, les équipes suivent la saisie.
  useEffect(() => {
    if (lance) return
    setTournoi((t) => ({ ...t, equipes: equipesDepuisNoms(noms, t.formation) }))
  }, [noms, tournoi.formation, lance])

  const regler = <K extends keyof Tournoi>(cle: K, valeur: Tournoi[K]) =>
    setTournoi((t) => ({ ...t, [cle]: valeur }))

  const valider = () => {
    setTournoi((t) => lancerProchainsMatchs(t))
    setOnglet('matchs')
  }

  /** `feuilles` ou `bilan` n'impriment que ce document ; sinon, l'écran courant. */
  const imprimer = (mode?: 'feuilles' | 'bilan' | 'guide') => {
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
  const aTirer = propositionDe(tournoi).length

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
          <button
            className="secondaire"
            onClick={() => setProjection(true)}
            disabled={tournoi.equipes.length === 0}
            title="Occupe cette fenêtre. Pour un PC à un seul écran."
          >
            Projeter ici
          </button>
          <button
            className="secondaire"
            onClick={() =>
              ouvrirSecondEcran(tournoi.nom).catch(() =>
                alert("La fenêtre d'affichage n'a pas pu être ouverte."),
              )
            }
            disabled={tournoi.equipes.length === 0}
            title="Ouvre une seconde fenêtre à glisser sur la télé. La saisie reste possible ici."
          >
            Second écran
          </button>
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
            ['reglages', '1. Réglages'],
            ['equipes', `2. Équipes (${prets})`],
            ['tirage', aTirer > 0 ? `3. Tirage · ${aTirer} à lancer` : '3. Tirage'],
            ['matchs', attente > 0 ? `4. Matchs · ${attente} en cours` : '4. Matchs'],
            ['classement', '5. Classement'],
          ] as const
        ).map(([id, libelle]) => (
          <button key={id} role="tab" aria-selected={onglet === id} onClick={() => setOnglet(id)}>
            {libelle}
          </button>
        ))}
      </nav>

      <ProchaineEtape
        etape={prochaineEtape({ tournoi, prets, aTirer, attente, fini })}
        onglet={onglet}
        aller={setOnglet}
        imprimerBilan={() => imprimer('bilan')}
      />

      {onglet === 'reglages' && (
        <>
          <Reglages
            tournoi={tournoi}
            lance={lance}
            regler={regler}
            setTournoi={setTournoi}
            aller={setOnglet}
          />
          <div className="carte">
            <button className="secondaire" onClick={() => imprimer('guide')}>
              Imprimer le mode d’emploi
            </button>
            <p className="aide" style={{ margin: '12px 0 0' }}>
              Une page à garder près de l’ordinateur : les cinq étapes et quoi faire en cas de
              problème. Utile si ce n’est pas toujours la même personne qui tient la table.
            </p>
          </div>
        </>
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
              <ul className="equipes-engagees">
                {tournoi.equipes.map((e) => (
                  <li key={e.id}>
                    <NumEquipe n={e.numero} />
                    {e.nom}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <SaisieEquipes formation={tournoi.formation} noms={noms} onChange={setNoms} />
              <div className="carte">
                <button className="action" onClick={() => setOnglet('tirage')} disabled={prets < 2}>
                  Tirer au sort les {prets} équipe{prets > 1 ? 's' : ''}
                </button>
                {prets < 2 && <p className="aide" style={{ marginTop: 12 }}>Il faut au moins 2 équipes complètes.</p>}
              </div>
            </>
          )}
        </>
      )}

      {onglet === 'tirage' && (
        <Tirage
          tournoi={tournoi}
          onRetirer={() => setTournoi((t) => retirerAuSort(t))}
          onValider={valider}
        />
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

      {onglet === 'classement' && (
        <>
          <Classement tournoi={tournoi} />
          {lance && (
            <div className="carte">
              <button className="secondaire" onClick={() => imprimer('bilan')}>
                Imprimer le bilan du concours
              </button>
              <p className="aide" style={{ margin: '12px 0 0' }}>
                Une page A4 : podium, classement complet et méthode de départage.
              </p>
            </div>
          )}
        </>
      )}

      <Feuilles tournoi={tournoi} />
      <Bilan tournoi={tournoi} />
      <Guide nomConcours={tournoi.nom} />
      {projection && <Affichage tournoi={tournoi} onFermer={() => setProjection(false)} />}
    </div>
  )
}

interface Etape {
  titre: string
  detail: string
  onglet: Onglet
  bouton: string
  /** Vrai quand l'étape se termine en imprimant le bilan plutôt qu'en changeant d'onglet. */
  bilan?: boolean
}

/**
 * La seule chose à faire maintenant.
 *
 * Une personne qui organise son premier concours ne sait pas dans quel ordre
 * remplir cinq onglets. Plutôt que de tout ouvrir et d'espérer, l'application
 * nomme à chaque instant l'unique action suivante — et se tait dès qu'on est
 * déjà au bon endroit.
 */
function prochaineEtape(e: {
  tournoi: Tournoi
  prets: number
  aTirer: number
  attente: number
  fini: boolean
}): Etape {
  if (e.fini) {
    return {
      titre: 'Le concours est terminé',
      detail: 'Le classement final est définitif. Il ne reste qu’à l’imprimer et à l’afficher.',
      onglet: 'classement',
      bouton: 'Imprimer le bilan',
      bilan: true,
    }
  }
  if (e.attente > 0) {
    return {
      titre: `${e.attente} partie${e.attente > 1 ? 's' : ''} en cours`,
      detail:
        'Quand une équipe rentre, tapez le score du perdant : le 13 du gagnant se met tout seul, puis appuyez sur Entrée.',
      onglet: 'matchs',
      bouton: 'Saisir les scores',
    }
  }
  if (e.aTirer > 0) {
    return {
      titre: 'Le tirage au sort est prêt',
      detail:
        'Regardez-le, annoncez-le aux joueurs, et relancez-le si besoin. Rien ne part sur les terrains tant que vous ne l’avez pas validé.',
      onglet: 'tirage',
      bouton: 'Voir le tirage',
    }
  }
  if (e.prets < 2) {
    return {
      titre: 'Saisissez les joueurs',
      detail:
        'Tapez les noms les uns après les autres : la touche Entrée passe au champ suivant et les équipes se forment toutes seules.',
      onglet: 'equipes',
      bouton: 'Saisir les joueurs',
    }
  }
  return {
    titre: 'Vérifiez le nom et le format',
    detail:
      'Donnez un nom à votre concours et choisissez la formule. Vous n’avez rien d’autre à calculer : le logiciel déduit les poules et les tours du nombre d’équipes.',
    onglet: 'reglages',
    bouton: 'Aller aux réglages',
  }
}

function ProchaineEtape({
  etape,
  onglet,
  aller,
  imprimerBilan,
}: {
  etape: Etape
  onglet: Onglet
  aller: (o: Onglet) => void
  imprimerBilan: () => void
}) {
  const ici = onglet === etape.onglet
  return (
    <div className="etape">
      <div className="etape-texte">
        <strong>{etape.titre}</strong>
        <span>{etape.detail}</span>
      </div>
      {/* Déjà au bon endroit : un bouton qui n'emmène nulle part ne ferait qu'ajouter du bruit. */}
      {(!ici || etape.bilan) && (
        <button className="action" onClick={() => (etape.bilan ? imprimerBilan() : aller(etape.onglet))}>
          {etape.bouton}
        </button>
      )}
    </div>
  )
}

function Reglages({
  tournoi,
  lance,
  regler,
  setTournoi,
  aller,
}: {
  tournoi: Tournoi
  lance: boolean
  regler: <K extends keyof Tournoi>(cle: K, valeur: Tournoi[K]) => void
  setTournoi: (maj: (t: Tournoi) => Tournoi) => void
  aller: (o: Onglet) => void
}) {
  const config = (champ: 'format' | 'butScore' | 'nbTours' | 'tableauFinal', valeur: unknown) =>
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
              <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>
                {f.titre}
                {f.conseille && <span className="conseille">conseillé</span>}
              </strong>
              <span style={{ color: 'var(--discret)', fontSize: 13, fontWeight: 400 }}>{f.quand}</span>
            </button>
          ))}
        </div>

        {tournoi.config.format === 'poules' && (
          <div style={{ marginTop: 20 }}>
            <label className="case">
              <input
                type="checkbox"
                disabled={lance}
                checked={tournoi.config.tableauFinal !== false}
                onChange={(e) => config('tableauFinal', e.target.checked)}
              />
              Enchaîner sur les tableaux finals
            </label>
            <p className="aide" style={{ marginTop: 8 }}>
              Les premières de chaque groupe jouent le tableau A, les deuxièmes le tableau B,
              jusqu’à un vainqueur dans chacun. Décochez si le concours doit s’arrêter à la fin
              des poules.
            </p>
          </div>
        )}

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

        {/* Le format choisi, la page est finie : le pas suivant se prend ici, sans
            remonter chercher un onglet. Dire « joueurs » et non « équipes », parce
            que ce qui se tape est une liste de noms. */}
        <button className="action" style={{ marginTop: 24 }} onClick={() => aller('equipes')}>
          {lance ? 'Voir les équipes engagées' : 'Saisir les joueurs'}
        </button>
      </div>
    </>
  )
}

const nouveau = (): Tournoi =>
  creerTournoi({ nom: '', formation: 'doublette', nbTerrains: null, format: 'poules' })

