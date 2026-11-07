/**
 * Mode d'emploi d'une page, à imprimer et à laisser près de l'ordinateur.
 *
 * Une aide en ligne ne sert à rien à quelqu'un qui n'ose pas cliquer : la
 * feuille posée à côté du clavier, si. Elle est volontairement courte — cinq
 * étapes et les trois pannes qui arrivent vraiment.
 */
export function Guide({ nomConcours }: { nomConcours: string }) {
  return (
    <div className="guide">
      <div className="guide-tete">
        <div className="guide-titre">Concours de pétanque — mode d’emploi</div>
        <div className="guide-sous">
          À garder près de l’ordinateur. {nomConcours ? `Concours : ${nomConcours}.` : ''} Tout ce
          que vous tapez est enregistré au fur et à mesure : même si l’ordinateur s’éteint, rien
          n’est perdu.
        </div>
      </div>

      <ol className="guide-etapes">
        <li>
          <strong>Réglages</strong>
          <p>
            Donnez un nom au concours. Choisissez la formation — tête-à-tête, doublette ou triplette — et la formule (si vous
            hésitez, prenez <em>Poules</em>). Le nombre de terrains n’est pas obligatoire : laissez
            vide si vous ne les numérotez pas.
          </p>
        </li>
        <li>
          <strong>Équipes</strong>
          <p>
            Tapez le nom du premier joueur, appuyez sur <em>Entrée</em>, tapez le suivant, et ainsi
            de suite. Les équipes se forment toutes seules et une ligne vide apparaît à chaque fois.
            Vous n’avez jamais à cliquer pour ajouter une équipe.
          </p>
        </li>
        <li>
          <strong>Tirage</strong>
          <p>
            Le logiciel propose le tirage. Regardez-le, annoncez-le aux joueurs. Tant que vous
            n’avez pas cliqué sur <em>Valider</em>, rien n’est parti : vous pouvez le relancer.
          </p>
        </li>
        <li>
          <strong>Matchs</strong>
          <p>
            Quand une équipe rentre, tapez le score du perdant dans sa case : le 13 du gagnant
            s’écrit tout seul. Appuyez sur <em>Entrée</em>. Quand tous les scores sont saisis, le
            bandeau vert vous propose le tirage suivant.
          </p>
        </li>
        <li>
          <strong>Classement</strong>
          <p>
            Il se met à jour tout seul. En fin de concours, le bouton{' '}
            <em>Imprimer le bilan</em> sort une page avec le podium et le classement complet.
          </p>
        </li>
      </ol>

      {/* Deux personnes du club ont demandé si la préparation était possible,
          et elle l'était déjà. Ce qui manquait n'était pas la fonction mais la
          phrase qui la dit — et la feuille posée près du clavier est le seul
          endroit que l'on lit vraiment. */}
      <div className="guide-titre-section">Préparer à l’avance</div>
      <p className="guide-texte">
        Rien n’oblige à tout taper le jour du concours. Saisissez les noms quand vous voulez :
        tout s’enregistre au fur et à mesure, et vous retrouverez la saisie en rouvrant le
        logiciel. Si vous travaillez depuis la clé USB, la préparation reste sur la clé et vous
        suit au club. <strong>Pensez à régler la date du concours</strong> dans les Réglages,
        sinon les feuilles de match porteront celle du jour où vous avez préparé.
      </p>
      <p className="guide-texte">
        Pour préparer <strong>plusieurs</strong> concours, enregistrez chacun dans son fichier
        avec le bouton <em>Enregistrer</em>, puis repartez d’un <em>Nouveau concours</em>. Le
        jour venu, <em>Ouvrir</em> rouvre celui qu’il faut. Un concours qui n’a pas été
        enregistré dans un fichier n’existe que dans le logiciel.
      </p>

      <div className="guide-titre-section">Si ça se passe mal</div>
      <table className="guide-pannes">
        <tbody>
          <tr>
            <td>Je me suis trompé de score</td>
            <td>
              Onglet <em>Matchs</em>, sur la partie concernée : <em>Corriger ce score</em>. Le
              classement se recalcule tout seul.
            </td>
          </tr>
          <tr>
            <td>L’ordinateur s’est éteint</td>
            <td>Rouvrez le logiciel : le concours est là où vous l’aviez laissé.</td>
          </tr>
          <tr>
            <td>Je veux garder le concours</td>
            <td>
              Bouton <em>Enregistrer</em> en haut : il crée un fichier que vous pouvez copier sur
              une clé USB et rouvrir plus tard, même sur un autre ordinateur.
            </td>
          </tr>
          <tr>
            <td>Les joueurs veulent voir où ça en est</td>
            <td>
              Bouton <em>Second écran</em> si une télé est branchée, sinon <em>Projeter ici</em>.
              Touche <em>Échap</em> pour revenir.
            </td>
          </tr>
        </tbody>
      </table>

      <div className="guide-pied">
        Un seul bandeau vert en haut de l’écran vous dit à chaque instant la seule chose à faire.
        En cas de doute, suivez-le.
      </div>
    </div>
  )
}
