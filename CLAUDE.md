# Concours de pétanque

Application de table de marque pour une petite association : un concours tous
les six mois, sur un PC Windows, hors ligne, sans compte ni connexion.

Lire le `README.md` pour le produit, et `git log` pour le raisonnement : les
messages de commit portent les arbitrages, pas seulement les changements. Ce
fichier ne répète que ce dont on a besoin pour travailler ici.

## L'idée qui porte tout

Les quatre formats (poules, système suisse, élimination directe, multi-chances
A/B/C) ne sont pas quatre applications. Ils partagent un noyau — équipes, tours,
matchs, terrains, classement — et ne diffèrent que sur une question : **qui joue
contre qui au tour suivant**.

Chaque format est un fichier de `src/engine/formats/` implémentant l'interface
`Driver` (`src/engine/types.ts`) : `prochainsMatchs`, `terminee`, `toursPrevus`.
Un format peut enchaîner plusieurs phases derrière cette interface : les poules
ouvrent deux tableaux à élimination directe une fois toutes les poules jouées
(1res en A, 2es en B), en réutilisant `matchsTableau` du format seeding. Les
phases se distinguent par `Match.groupe`, jamais par un état à part.
L'orchestrateur (`src/engine/tournoi.ts`) ne connaît que cette interface.
**Ajouter un format ne touche à rien d'autre** que le fichier du format et la
table `DRIVERS`.

```
src/engine/       le moteur, TypeScript pur, zéro dépendance — 40 tests
  types.ts          modèle de domaine, interface Driver, et deux lectures
                    partagées : dernierTour() et matchsDuGroupe()
  tournoi.ts        orchestration : créer, tirer, lancer, saisir, terrains
  classement.ts     départage FFPJP
  tableaux.ts       découpe le classement par tableau, quand le format en a plusieurs
  apercu.ts         ce qu'un format donnera, chiffré — alimente l'écran de réglages
  alea.ts           tirage reproductible à partir d'une graine
  formats/          poules, suisse, seeding, multichances, commun (appariement)
src/ui/           React, aucune règle de tournoi
  Equipe.tsx        le dossard et les noms — partagé par tout l'affichage
  format.ts         mises en forme partagées (dateFr)
src/stockage.ts   localStorage — aussi le canal vers la fenêtre d'affichage public
outils/           scripts hors application : captures, portable, PDF, architecture
```

**Ne recopie pas de décompte de lignes ici.** Ceux qui s'y trouvaient ont dérivé
de 40 % en trois semaines sans que personne le voie. `npm run architecture`
compte dans le dépôt et écrit la page publiée ; c'est la seule source à jour.

Le moteur est la partie dont une erreur se verrait publiquement le jour du
concours : **garde-la testée et séparée de l'interface**. Aucune règle de
tournoi dans `src/ui/`.

## Conventions

- Identifiants et commentaires **en français**, comme le domaine.
- Les commentaires disent **pourquoi**, jamais ce que le code fait déjà voir.
- L'état du tournoi est **immuable** : chaque opération renvoie un nouveau
  `Tournoi`.
- Le tirage passe par une graine (`alea.ts`) : reproductible, donc vérifiable
  devant quelqu'un qui conteste.

## Contrainte de conception qui a tout guidé

L'utilisatrice finale maîtrise mal l'informatique. D'où :

- un **bandeau permanent** qui nomme à chaque instant la seule action suivante,
  et se tait quand on est déjà au bon endroit (`ProchaineEtape` dans `App.tsx`) ;
- des formats décrits **par ce qu'ils donnent** plutôt que par leur nom de
  règlement (« tout le monde joue toute la journée », pas « système suisse ») ;
- deux documents papier : `docs/installation.html` pour qui prépare le poste une
  fois, et un mode d'emploi imprimable depuis l'application (onglet Réglages)
  pour qui tient la table.

**Ne casse pas ça en ajoutant des options.** Une option de plus est un écran de
plus à comprendre le jour du concours.

## Commandes

```sh
npm test              # 40 tests du moteur — le garde-fou principal
npm run dev           # interface seule, dans le navigateur
npm run build         # tsc -b && vite build
npm run lint          # oxlint
npm run app:dev       # application Tauri
npm run app:portable  # build Windows + dossier portable (Rust + outils C++ requis)
npm run docs          # docs/installation.html -> installation.pdf
npm run captures      # six captures d'écran du parcours (serveur de dev requis)
npm run architecture  # écrit public/architecture.html, arborescence comptée
```

## Compilation Windows

Elle exige la chaîne MSVC — Rust `stable-x86_64-pc-windows-msvc` **et** les
Build Tools C++ de Visual Studio (workload VCTools). Sans le workload, `cargo`
échoue au lien avec `link.exe not found`.

```sh
winget install --id Rustlang.Rustup -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

`outils/portable.mjs` assemble le dossier portable à partir d'un build déjà
fait : `portable/Concours de petanque/` contenant l'exécutable, un dossier
`donnees` vide et `LISEZ-MOI.txt`. Le même script sert en local et dans la CI,
qui n'ajoute que la compression — deux recettes parallèles auraient fini par
diverger. L'archive contient **un dossier**, jamais des fichiers en vrac : une
décompression maladroite ne doit pas séparer l'exécutable de son dossier
`donnees`, puisque c'est la seule présence de ce dossier qui fait écrire WebView2
à côté de l'exécutable (`src-tauri/src/lib.rs`) — donc qui fait que le concours
suit la clé USB.

**Deux pièges vérifiés sur la première compilation réelle (13/09/2026) :**

- L'exécutable produit s'appelle **`petbou.exe`**, d'après le nom du paquet
  Cargo — pas d'après `productName`, faute de `mainBinaryName` dans
  `tauri.conf.json`. Le script le renomme en `Concours de petanque.exe`, sans
  accent : il finit sur une clé parfois formatée en FAT, et se voit recopié à la
  main. Ne pas chercher le binaire par son nom affiché ; `target/release` n'en
  contient qu'un seul, d'où le choix du plus gros.
- Le mode portable est du Rust qui ne s'exécute que si le dossier `donnees`
  existe. Vérifié : WebView2 y écrit ses 8,6 Mo, `Local Storage` compris, et
  `%LOCALAPPDATA%\fr.petbou.concours` reste vide. Toute modification de
  `activer_mode_portable()` doit être revérifiée en lançant vraiment
  l'exécutable depuis `portable/`, les tests ne couvrant pas ce chemin.

Compter environ 4 min pour une compilation complète, et ~3,5 Mo d'exécutable.

Le pipeline GitLab (`.gitlab-ci.yml`) tient les tests sur Linux à chaque
poussée. Le job Windows, lui, est **le bouton de publication** : déclenché à la
main depuis CI/CD (les minutes du forfait sont comptées), il compile, envoie les
trois fichiers au registre de paquets et crée la page de version. Le numéro vient
de `tauri.conf.json` ; republier un numéro déjà publié est refusé **avant** de
compiler, pour ne pas dépenser sept minutes de runner à le découvrir.

Pousser une étiquette ne déclenche rien : un second chemin de publication aurait
fini par diverger. Le lien donné au club est
https://gitlab.com/wicaonith/petbou/-/releases, qui ne périme pas — là où un
artefact de job disparaît au bout de trente jours.

## Décisions encore ouvertes

1. **Têtes de série jamais saisies.** Le moteur sait les gérer (`Equipe.seed`,
   `placer()`, `repartir()`), mais rien ne les écrit : le tableau à élimination
   directe est donc un tirage entièrement aléatoire, et les exempts du premier
   tour partent au hasard alors que la règle FFPJP les donne aux mieux classées.
   Soit on ajoute la saisie, soit on assume le tirage intégral et on le dit à
   l'écran. À trancher avec l'association.
2. **L'installeur NSIS** est conservé en plus de la version portable, parce que
   lui seul sait récupérer WebView2 sur un poste ancien. À supprimer si jugé
   inutile.
3. **Le nombre de terrains est facultatif** ; sans terrains, tout le tour part
   d'un coup. Vérifier que c'est bien ce que veut le club.

## Ce qui est publié en ligne

GitLab Pages sert deux documents, écrits dans `docs/` et déployés à chaque
poussée sur `main` :

- <https://wicaonith.gitlab.io/petbou/> — la notice d'installation. **Son
  adresse ne doit pas bouger** : elle est dans le README, dans le courriel de
  téléchargement et sur la notice imprimée elle-même.
- <https://wicaonith.gitlab.io/petbou/architecture.html> — l'architecture et
  l'arborescence, dont les chiffres sont comptés à la publication.

Ces pages sont aussi faites pour être imprimées : la notice tient sur une seule
page A4, ce qu'il faut revérifier après chaque modification (`npm run docs`).

## Maquettes

19 écrans sur canevas, dont les 4 écrans du parcours déclinés pour les 4
formats : https://claude.ai/code/artifact/434b2839-1c7b-4bb2-9a65-d56c6c63f81b
