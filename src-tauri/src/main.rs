// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use gtk::prelude::*;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let main_webview = app.get_webview_window("main").unwrap();
            let gtk_window = main_webview.gtk_window().unwrap();

            gtk_window.set_decorated(false);
            gtk_window.set_resizable(false);
            gtk_window.set_default_size(650, 400);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::exit,
            commands::list_applications
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
