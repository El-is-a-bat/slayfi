use applications::{App, AppInfo, AppInfoContext};

#[tauri::command]
pub fn exit(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
pub fn list_applications() -> Vec<App> {
    let mut ctx = AppInfoContext::new(Vec::new());
    ctx.refresh_apps().unwrap(); // must refresh apps before getting them
    let apps = ctx
        .get_all_apps()
        .iter()
        .filter(|&app| {
            !(app.name.trim().is_empty() && app.icon_path.is_none() && app.app_path_exe.is_none())
        })
        .cloned()
        .collect();
    println!("Apps: {:#?}", apps);
    apps
}
