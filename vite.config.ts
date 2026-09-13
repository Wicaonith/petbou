import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
