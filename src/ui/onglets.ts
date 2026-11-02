/**
 * Les cinq étapes d'un concours, dans l'ordre où elles se présentent.
 *
 * Ce sont des onglets, mais ils se lisent comme un chemin : on règle, on
 * saisit, on tire, on joue, on classe. Le type vit à part parce que trois
 * écrans doivent pouvoir renvoyer vers un autre sans dépendre de `App`.
 */
export type Onglet = 'reglages' | 'equipes' | 'tirage' | 'matchs' | 'classement'
