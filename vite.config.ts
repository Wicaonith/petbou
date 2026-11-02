import react from '@vitejs/plugin-react'
// defineConfig vient de vitest et non de vite : lui seul connaît la clé
// « test », que la configuration de couverture ci-dessous utilise.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      // « json-summary » est le format que lit outils/badge-couverture.mjs ;
      // « text » reste pour qu’un lancement en local affiche le tableau.
      reporter: ["text", "json-summary"],
      include: ["src/engine/**"],
    },
  },
  server: {
    watch: {
      // `npm run app:portable` dépose l'application dans `portable/`, et la
      // lancer depuis là y crée le dossier `donnees` de WebView2 — dont
      // certains fichiers restent verrouillés par Windows. Sans cette
      // exclusion, un `npm run dev` lancé après un essai de la version
      // portable meurt sur EBUSY. `src-tauri/target` est écarté pour la même
      // raison : rien à y surveiller, et des milliers de fichiers.
      ignored: ['**/portable/**', '**/src-tauri/target/**'],
    },
  },
})
