/// Bascule en mode portable si un dossier `donnees` est posé à côté de
/// l'exécutable.
///
/// Sans ça, WebView2 écrit dans %LOCALAPPDATA% : l'application tournerait
/// depuis une clé USB, mais le concours resterait sur le PC. Avec ça, les deux
/// voyagent ensemble. Le dossier n'existe que dans l'archive portable, donc la
/// version installée garde le comportement normal — écrire à côté de
/// l'exécutable échouerait de toute façon sous Program Files.
fn activer_mode_portable() {
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    let Some(donnees) = exe.parent().map(|p| p.join("donnees")) else {
        return;
    };
    if donnees.is_dir() {
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", &donnees);
    }
}

/// Coque applicative. Toute la logique de concours vit dans le frontend
/// (`src/engine`), testée séparément ; le Rust ne fait qu'ouvrir la fenêtre et
/// donner accès au disque pour enregistrer et rouvrir un concours.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    activer_mode_portable();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("erreur au lancement de l'application");
}
