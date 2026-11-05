import { useRef, useState } from 'react'
import { JOUEURS_PAR_EQUIPE, melanger, rng, type Equipe, type Formation } from '../engine'
import { Confirmation } from './Confirmation'
import { accord } from './format'

/** Découpe une liste plate de joueurs en équipes de la bonne taille. */
export function equipesDepuisNoms(noms: string[], formation: Formation): Equipe[] {
  const taille = JOUEURS_PAR_EQUIPE[formation]
  const propres = noms.map((n) => n.trim())
  const equipes: Equipe[] = []
  for (let i = 0; i + taille <= propres.length; i += taille) {
    const membres = propres.slice(i, i + taille)
    if (membres.some((m) => m === '')) continue
    equipes.push({
      id: `eq${equipes.length + 1}`,
      numero: equipes.length + 1,
      nom: membres.join(' / '),
      joueurs: membres.map((nom, j) => ({ id: `eq${equipes.length + 1}j${j}`, nom })),
    })
  }
  return equipes
}

interface Props {
  formation: Formation
  noms: string[]
  onChange: (noms: string[]) => void
}

/**
 * Saisie des équipes.
 *
 * Le point sensible : un opérateur tape 40 noms d'affilée sans lâcher le clavier.
 * Donc une seule liste plate, Entrée passe au champ suivant, la dernière ligne
 * se crée toute seule, et un copier-coller depuis un tableur se répartit tout
 * seul dans les cases. Aucun bouton « ajouter une équipe » à cliquer.
 */
export function SaisieEquipes({ formation, noms, onChange }: Props) {
  const taille = JOUEURS_PAR_EQUIPE[formation]
  const refs = useRef<(HTMLInputElement | null)[]>([])
  // Les deux boutons défont un travail de frappe que rien ne permet de retrouver.
  const [aConfirmer, setAConfirmer] = useState<'melee' | 'effacer' | null>(null)
  const nbLignes = Math.floor(noms.length / taille) + 1

  const ecrire = (i: number, valeur: string) => {
    const suite = [...noms]
    while (suite.length < i) suite.push('')
    suite[i] = valeur
    onChange(rogner(suite))
  }

  const coller = (i: number, texte: string) => {
    const morceaux = texte
      .split(/[\n\t;,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (morceaux.length <= 1) return false
    const suite = [...noms]
    while (suite.length < i) suite.push('')
    suite.splice(i, morceaux.length, ...morceaux)
    onChange(rogner(suite))
    setTimeout(() => refs.current[i + morceaux.length]?.focus(), 0)
    return true
  }

  const clavier = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      refs.current[i + 1]?.focus()
    } else if (e.key === 'Backspace' && e.currentTarget.value === '' && i > 0) {
      e.preventDefault()
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      refs.current[i + taille]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      refs.current[i - taille]?.focus()
    }
  }

  const equipes = equipesDepuisNoms(noms, formation)
  const joueursSaisis = noms.filter((n) => n.trim() !== '').length
  const incomplets = joueursSaisis - equipes.length * taille

  return (
    <div className="carte">
      <h2>Joueurs</h2>
      <p className="aide">
        Tapez les noms à la suite : <kbd>Entrée</kbd> passe au champ suivant et la ligne
        suivante apparaît d'elle-même. Vous pouvez aussi coller une liste entière depuis un
        tableur ou un mail, elle se répartit automatiquement.
      </p>

      <div className="equipes">
        {Array.from({ length: nbLignes }, (_, ligne) => {
          const debut = ligne * taille
          const complete = Array.from({ length: taille }, (_, k) => noms[debut + k]?.trim()).every(
            Boolean,
          )
          return (
            <div
              key={ligne}
              className={`ligne-equipe${complete ? ' complete' : ''}`}
              style={{ ['--taille' as string]: taille }}
            >
              <span className="num">{ligne + 1}</span>
              <div className="joueurs">
                {Array.from({ length: taille }, (_, k) => {
                  const i = debut + k
                  return (
                    <input
                      key={i}
                      ref={(el) => {
                        refs.current[i] = el
                      }}
                      value={noms[i] ?? ''}
                      placeholder={k === 0 ? `Équipe ${ligne + 1}` : ''}
                      aria-label={`Équipe ${ligne + 1}, joueur ${k + 1}`}
                      onChange={(e) => ecrire(i, e.target.value)}
                      onKeyDown={(e) => clavier(e, i)}
                      onPaste={(e) => {
                        if (coller(i, e.clipboardData.getData('text'))) e.preventDefault()
                      }}
                    />
                  )
                })}
              </div>
              <button
                className="secondaire"
                aria-label={`Supprimer l'équipe ${ligne + 1}`}
                onClick={() => onChange(rogner(noms.filter((_, i) => i < debut || i >= debut + taille)))}
                disabled={ligne === nbLignes - 1 && !complete}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <p className="compteur">
        <strong>{equipes.length}</strong> équipe{accord(equipes.length)} complète
        {accord(equipes.length)} · {joueursSaisis} joueur{accord(joueursSaisis)}
        {incomplets > 0 && (
          <span style={{ color: 'var(--alerte)' }}>
            {' '}
            · {incomplets} joueur{accord(incomplets)} sans équipe complète
          </span>
        )}
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          className="secondaire"
          onClick={() => setAConfirmer('melee')}
          disabled={joueursSaisis < taille * 2}
        >
          Tirer les équipes au sort (mêlée)
        </button>
        <button
          className="secondaire"
          onClick={() => setAConfirmer('effacer')}
          disabled={joueursSaisis === 0}
        >
          Tout effacer
        </button>
      </div>

      {aConfirmer === 'melee' && (
        <Confirmation
          titre="Refaire les équipes au hasard ?"
          action="Oui, mélanger les joueurs"
          retour="Non, garder ces équipes"
          onAnnuler={() => setAConfirmer(null)}
          onValider={() => {
            setAConfirmer(null)
            onChange(melanger(noms.filter(Boolean), rng(Date.now())))
          }}
        >
          <p>
            Les <strong>{joueursSaisis} joueurs</strong> saisis vont être répartis au hasard dans
            de nouvelles {formation}s.
          </p>
          <p className="attention">
            Les équipes que vous avez composées vous-même seront perdues.
          </p>
        </Confirmation>
      )}

      {aConfirmer === 'effacer' && (
        <Confirmation
          titre="Effacer toute la liste ?"
          action="Oui, tout effacer"
          retour="Non, garder la liste"
          onAnnuler={() => setAConfirmer(null)}
          onValider={() => {
            setAConfirmer(null)
            onChange([])
          }}
        >
          <p>
            Les <strong>{joueursSaisis} joueurs</strong> saisis vont être supprimés.
          </p>
          <p className="attention">Rien ne permet de les retrouver : il faudra tout retaper.</p>
        </Confirmation>
      )}
    </div>
  )
}

/** Retire les cases vides en fin de liste, pour que le compteur reste juste. */
function rogner(noms: string[]): string[] {
  const out = [...noms]
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop()
  return out
}
