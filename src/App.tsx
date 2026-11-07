import { useEffect, useState } from 'react'
import './ui/styles.css'
import {
  DRIVERS,
  creerTournoi,
  enCours,
  lancerProchainsMatchs,
  propositionDe,
  retirerAuSort,
  saisirScore,
  annulerScore,
  termine,
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
import {
  basculer,
  concoursRanges,
  ecrire,
  lire,
  oublier,
  ranger,
  remplacer,
  vierge,
} from './stockage'
import { Concours } from './ui/Concours'
import { Classement } from './ui/Classement'
import { NomEquipe } from './ui/Equipe'
import { CarteAction } from './ui/CarteAction'
import type { Onglet } from './ui/onglets'
import { ProchaineEtape } from './ui/ProchaineEtape'
import { Reglages } from './ui/Reglages'
import { accord, LIBELLE_FORMATION } from './ui/format'

/**
 * L'écran principal : les cinq onglets, et l'état du concours.
 *
 * Tout l'état tient ici, dans deux `useState` — le concours et la liste de
 * noms en cours de saisie. Rien de plus : ni contexte, ni réducteur, ni
 * bibliothèque d'état. Un concours est un objet immuable que le moteur
 * transforme, et chaque écran n'en reçoit que ce qu'il affiche.
 *
 * Ce fichier ne décide de rien. Les règles sont dans `src/engine/`, l'étape
 * suivante dans `ProchaineEtape`, les réglages dans `Reglages` : ce qui reste
 * est l'aiguillage entre les onglets et le passage des fonctions de
 * modification.
 */
export default function App() {
  const [tournoi, setTournoi] = useState<Tournoi>(() => lire()?.tournoi ?? nouveau())
  const [noms, setNoms] = useState<string[]>(() => lire()?.noms ?? [])
  const [onglet, setOnglet] = useState<Onglet>('reglages')
  const [projection, setProjection] = useState(false)
  const [listeOuverte, setListeOuverte] = useState(false)
  const [ranges, setRanges] = useState(concoursRanges)
  // Le concours qui vient d'être rangé, pour dire où il est parti. Le dire une
  // fois ne suffit pas : c'est au moment de ne plus le voir à l'écran qu'on
  // croit l'avoir perdu.
  const [vientDEtreRange, setVientDEtreRange] = useState<{ id: string; nom: string } | null>(null)

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

  const enregistrerConcours = () => enregistrer({ version: 1, tournoi, noms }, tournoi.nom)

  /**
   * Range le concours ouvert, et en ouvre un vierge.
   *
   * Ce bouton effaçait, et demandait donc confirmation. Il ne détruit plus
   * rien : le concours quitté va dans la liste, d'où on le reprend. Une
   * fenêtre qui annoncerait une perte mentirait, et une confirmation pour un
   * geste réversible apprend surtout à cliquer sans lire.
   */
  const nouveauConcours = () => {
    ranger({ tournoi, noms })
    setVientDEtreRange(vierge(tournoi) ? null : { id: tournoi.id, nom: tournoi.nom })
    setTournoi(nouveau())
    setNoms([])
    setOnglet('reglages')
    setRanges(concoursRanges())
  }

  /** Repose le concours ouvert dans la liste et en sort celui qu'on demande. */
  const reprendre = (id: string) => {
    const repris = basculer({ tournoi, noms }, id)
    if (!repris) return
    setTournoi(repris.tournoi)
    setNoms(repris.noms)
    setOnglet(repris.tournoi.matchs.length > 0 ? 'matchs' : 'equipes')
    setVientDEtreRange(null)
    setListeOuverte(false)
    setRanges(concoursRanges())
  }

  const supprimer = (id: string) => {
    oublier(id)
    setRanges(concoursRanges())
  }

  const ouvrirFichier = async () => {
    try {
      const donnees = await ouvrir()
      if (!donnees) return
      // Le concours en place part dans la liste plutôt que sous le fichier
      // ouvert : ouvrir un fichier n'est pas une raison de perdre l'autre.
      remplacer({ tournoi, noms }, { tournoi: donnees.tournoi, noms: donnees.noms ?? [] })
      setTournoi(donnees.tournoi)
      setNoms(donnees.noms ?? [])
      setOnglet(donnees.tournoi.matchs.length > 0 ? 'matchs' : 'equipes')
      setListeOuverte(false)
      setRanges(concoursRanges())
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
          {LIBELLE_FORMATION[tournoi.formation].singulier} · {DRIVERS[tournoi.config.format].nom} · {prets} équipe
          {accord(prets)}
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
          <button className="secondaire" onClick={() => setListeOuverte(true)}>
            Mes concours{ranges.length > 0 && ` (${ranges.length + 1})`}
          </button>
          <button className="secondaire" onClick={enregistrerConcours}>
            Enregistrer
          </button>
          <button className="secondaire" onClick={() => imprimer()}>
            Imprimer
          </button>
          <button className="secondaire" onClick={nouveauConcours}>
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
        avancement={{ prets, aTirer, attente, fini }}
        onglet={onglet}
        aller={setOnglet}
        imprimerBilan={() => imprimer('bilan')}
      />

      {/* Dit où est parti le concours qu'on vient de quitter, à l'endroit où
          l'on arrive. La condition `vierge` lui sert de date de péremption :
          dès que le nouveau concours a un nom ou une équipe, la phrase ne
          répond plus à la question que l'on se posait, et s'en va seule. */}
      {onglet === 'reglages' && vientDEtreRange && vierge(tournoi) && (
        <div className="bandeau bandeau-range">
          <span>
            {vientDEtreRange.nom ? `« ${vientDEtreRange.nom} »` : 'Le concours précédent'} est rangé
            dans <strong>Mes concours</strong>. Rien n’a été effacé.
          </span>
          <button className="secondaire" onClick={() => reprendre(vientDEtreRange.id)}>
            Le reprendre
          </button>
        </div>
      )}

      {onglet === 'reglages' && (
        <>
          <Reglages
            tournoi={tournoi}
            lance={lance}
            regler={regler}
            setTournoi={setTournoi}
            aller={setOnglet}
          />
          <CarteAction
            libelle="Imprimer le mode d’emploi"
            onClick={() => imprimer('guide')}
            aide="Une page à garder près de l’ordinateur : les cinq étapes et quoi faire en cas de problème. Utile si ce n’est pas toujours la même personne qui tient la table."
          />
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
                    <NomEquipe equipe={e} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <SaisieEquipes formation={tournoi.formation} noms={noms} onChange={setNoms} />
              <CarteAction
                principale
                libelle={`Tirer au sort les ${prets} équipe${accord(prets)}`}
                onClick={() => setOnglet('tirage')}
                desactive={prets < 2}
                aide={prets < 2 ? 'Il faut au moins 2 équipes complètes.' : undefined}
              />
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
          // Le même classement qu'à l'onglet 5, et non une version réduite :
          // un classement qui montrerait autre chose selon l'écran se ferait
          // contester le jour où quelqu'un compare les deux.
          apresLesParties={<Classement tournoi={tournoi} />}
        />
      )}

      {/* Le bandeau du haut nomme déjà l'étape suivante, mais après le dernier
          score saisi on est en bas d'une liste de cinquante résultats, et il est
          hors de l'écran. L'action se reprend donc ici, là où l'œil se trouve. */}
      {onglet === 'matchs' && attente === 0 && (fini || aTirer > 0) && (
        <CarteAction
          principale
          libelle={fini ? 'Voir le classement final' : 'Voir le tirage suivant'}
          onClick={() => setOnglet(fini ? 'classement' : 'tirage')}
          aide={
            fini
              ? 'Tous les scores sont saisis et le concours est allé à son terme.'
              : 'Tous les scores sont saisis : les parties suivantes attendent d’être tirées.'
          }
        />
      )}

      {onglet === 'classement' && (
        <>
          <Classement tournoi={tournoi} />
          {lance && (
            <CarteAction
              libelle="Imprimer le bilan du concours"
              onClick={() => imprimer('bilan')}
              aide="Une page A4 : podium, classement complet et méthode de départage."
            />
          )}
        </>
      )}

      <Feuilles tournoi={tournoi} />
      <Bilan tournoi={tournoi} />
      <Guide nomConcours={tournoi.nom} />
      {projection && <Affichage tournoi={tournoi} onFermer={() => setProjection(false)} />}

      {listeOuverte && (
        <Concours
          ouvert={tournoi}
          ranges={ranges}
          onReprendre={reprendre}
          onOublier={supprimer}
          onOuvrirFichier={ouvrirFichier}
          onFermer={() => setListeOuverte(false)}
        />
      )}
    </div>
  )
}

const nouveau = (): Tournoi =>
  creerTournoi({ nom: '', formation: 'doublette', nbTerrains: null, format: 'poules' })

