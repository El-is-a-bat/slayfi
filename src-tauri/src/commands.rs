use std::path::PathBuf;

use applications::common::SearchPath;
use applications::{App, AppInfo, AppInfoContext};
use itertools::Itertools;
use std::process::{self, Command};

#[tauri::command]
pub fn exit(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
pub fn start_program(exec: String) -> bool {
    Command::new(exec).spawn().expect("Failed to start program");
    true
}

#[tauri::command]
pub fn list_applications() -> Vec<App> {
    let extra_paths = vec![
        SearchPath::new(
            PathBuf::from("/home/elis/.local/share/Steam/steamapps/common/"),
            u8::MAX,
        ),
        SearchPath::new(PathBuf::from("/home/elis/Desktop/"), u8::MAX),
    ];

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
