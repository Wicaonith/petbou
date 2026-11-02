import { accord } from './format'
import type { Onglet } from './onglets'

interface Etape {
  titre: string
  detail: string
  onglet: Onglet
  bouton: string
  /** Vrai quand l'étape se termine en imprimant le bilan plutôt qu'en changeant d'onglet. */
  bilan?: boolean
}

/** Ce qu'il faut savoir du concours pour désigner l'étape suivante. */
interface Avancement {
  /** Équipes complètes, donc prêtes à être tirées. */
  prets: number
  /** Matchs proposés par le tirage, pas encore lancés. */
  aTirer: number
  /** Matchs lancés dont le score n'est pas rentré. */
  attente: number
  fini: boolean
}

/**
 * La seule chose à faire maintenant.
 *
 * Une personne qui organise son premier concours ne sait pas dans quel ordre
 * remplir cinq onglets. Plutôt que de tout ouvrir et d'espérer, l'application
 * nomme à chaque instant l'unique action suivante — et se tait dès qu'on est
 * déjà au bon endroit.
 *
 * L'ordre des cas est l'ordre des priorités, pas celui du parcours : des
 * parties en cours passent avant un tirage en attente, parce que c'est ce qui
 * se joue sur le terrain qui commande.
 */
function prochaineEtape(e: Avancement): Etape {
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
      titre: `${e.attente} partie${accord(e.attente)} en cours`,
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

/**
 * Le bandeau permanent qui nomme l'étape suivante.
 *
 * Il calcule lui-même quelle elle est : l'écran principal n'a que des nombres
 * à lui donner, et n'a pas à connaître l'ordre des priorités.
 */
export function ProchaineEtape({
  avancement,
  onglet,
  aller,
  imprimerBilan,
}: {
  avancement: Avancement
  onglet: Onglet
  aller: (o: Onglet) => void
  imprimerBilan: () => void
}) {
  const etape = prochaineEtape(avancement)
  const ici = onglet === etape.onglet
  return (
    <div className="etape">
      <div className="etape-texte">
        <strong>{etape.titre}</strong>
        <span>{etape.detail}</span>
      </div>
      {/* Déjà au bon endroit : un bouton qui n'emmène nulle part ne ferait qu'ajouter du bruit. */}
      {(!ici || etape.bilan) && (
        <button
          className="action"
          onClick={() => (etape.bilan ? imprimerBilan() : aller(etape.onglet))}
        >
          {etape.bouton}
        </button>
      )}
    </div>
  )
}
