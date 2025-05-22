use applications::{App, AppInfo, AppInfoContext};
use gtk::traits::{GtkWindowExt, WidgetExt};
use itertools::Itertools;
use std::process::Command;
use tauri::{Manager, PhysicalSize, Size};

#[tauri::command]
pub fn exit(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
pub fn start_program(exec: String) -> bool {
    Command::new(exec).spawn().expect("Failed to start program");
    //TODO make program to close after program starts
    true
}

#[tauri::command]
pub fn list_applications() -> Vec<App> {
    let extra_paths = vec![];

    let mut ctx = AppInfoContext::new(extra_paths);
    ctx.refresh_apps().unwrap(); // must refresh apps before getting them
    let apps = ctx
        .get_all_apps()
        .iter()
        .filter(|&app| {
            !app.name.trim().is_empty() && app.icon_path.is_some() && app.app_path_exe.is_some()
        })
        .unique_by(|&app| &app.name)
        .sorted_by_key(|&app| &app.name)
        .cloned()
        .collect();
    apps
}

#[tauri::command]
pub fn get_config() -> String {
    "{\"apps_per_page\":\"5\"}".into()
}

#[tauri::command]
pub fn set_application_size(app_handle: tauri::AppHandle, height: u32, width: u32) {
    if let Some(window) = app_handle.get_window("main") {
        let _ = window.set_size(Size::Physical(PhysicalSize { width, height }));
    }
    println!("Width: {}", width);
    println!("Height: {}", height);
}
