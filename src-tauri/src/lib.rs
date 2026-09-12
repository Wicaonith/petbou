/// Coque applicative. Toute la logique de concours vit dans le frontend
/// (`src/engine`), testée séparément ; le Rust ne fait qu'ouvrir la fenêtre et
/// donner accès au disque pour enregistrer et rouvrir un concours.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("erreur au lancement de l'application");
}
