use freedesktop_file_parser::{EntryType, LocaleString};
use itertools::Itertools;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::os::unix::process::CommandExt;
use std::process::Command;
use tauri::{Manager, PhysicalSize, Size};
use walkdir::WalkDir;

#[derive(Serialize, Deserialize)]
pub struct Application {
    pub name: String,
    pub comment: String,
    pub icon: String,
    pub exec: String,
}

impl std::fmt::Display for Application {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "\n\tName:\t{},\n\tComment:\t{},\n\tIcon:\t{},\n\tExec:\t{}\n",
            self.name, self.comment, self.icon, self.exec
        )
    }
}

#[tauri::command]
pub fn exit(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
pub fn start_program(app_handle: tauri::AppHandle, exec: String) -> bool {
    // Use nohup to detach the process and redirect output
    let shell_cmd = format!("nohup {} > /dev/null 2>&1 &", exec);

    match Command::new("sh")
        .arg("-c")
        .arg(shell_cmd)
        .spawn()
    {
        Ok(_) => {
            info!("Successfully started program: {}", exec);
            app_handle.exit(0);
            true
        }
        Err(e) => {
            error!("Failed to start program {}: {}", exec, e);
            false
        }
    }
}

#[tauri::command]
pub fn list_desktop_applications() -> Vec<Application> {
    let applications_path = "/usr/share/applications/";
    let mut applications: Vec<Application> = vec![];

    // Get current desktop environment
    let desktop_environment = env::var("XDG_CURRENT_DESKTOP")
        .unwrap_or_else(|_| String::from("Hyprland"));
    info!("Current desktop environment: {}", desktop_environment);

    for entry in WalkDir::new(applications_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path().to_string_lossy();
        debug!("Processing: {}", file_path);

        let content = match std::fs::read_to_string(entry.path()) {
            Ok(content) => content,
            Err(e) => {
                error!("Error reading file {}: {}", file_path, e);
                continue;
            }
        };

        let desktop_file = match freedesktop_file_parser::parse(&content) {
            Ok(parsed) => parsed,
            Err(e) => {
                error!("Error parsing desktop file {}: {}", file_path, e);
                continue;
            }
        };

        let desktop_entry = desktop_file.entry;

        // Skip if not an application entry
        if let EntryType::Application(application) = &desktop_entry.entry_type {
            // Skip if no exec field
            let exec = match application.exec.clone() {
                Some(exec) => exec,
                None => {
                    debug!("Skipping {}: No exec field", desktop_entry.name.default);
                    continue;
                }
            };

            // Skip if application is hidden or shouldn't be displayed
            if desktop_entry.hidden.unwrap_or(false) || desktop_entry.no_display.unwrap_or(false) {
                debug!(
                    "Skipping {}: Hidden or no display",
                    desktop_entry.name.default
                );
                continue;
            }

            // Check if application should be shown in current desktop environment
            let only_show_in = desktop_entry.only_show_in.unwrap_or_default();
            let not_show_in = desktop_entry.not_show_in.unwrap_or_default();

            if !only_show_in.is_empty() && !only_show_in.contains(&desktop_environment) {
                debug!(
                    "Skipping {}: Not compatible with current desktop environment",
                    desktop_entry.name.default
                );
                continue;
            }

            if not_show_in.contains(&desktop_environment) {
                debug!(
                    "Skipping {}: Explicitly not shown in current desktop environment",
                    desktop_entry.name.default
                );
                continue;
            }

            let app = Application {
                name: desktop_entry.name.default.clone(),
                comment: desktop_entry
                    .comment
                    .unwrap_or(LocaleString {
                        default: String::from(""),
                        variants: HashMap::new(),
                    })
                    .default,
                icon: match desktop_entry.icon {
                    Some(icon) => match icon.get_icon_path() {
                        Some(path) => path.to_string_lossy().into_owned(),
                        None => {
                            warn!("No icon path found for {}", desktop_entry.name.default);
                            String::from("")
                        }
                    },
                    None => {
                        warn!("No icon found for {}", desktop_entry.name.default);
                        String::from("")
                    }
                },
                exec,
            };

            debug!("Added application: {}", app);
            applications.push(app);
        } else {
            debug!("Skipping {}: Not an application entry", file_path);
            continue;
        }
    }

    info!("Total applications found: {}", applications.len());
    applications
}

#[tauri::command]
pub fn get_config() -> String {
    "{\"apps_per_page\": 5}".into()
}

#[tauri::command]
pub fn set_application_size(app_handle: tauri::AppHandle, height: u32, width: u32) {
    if let Some(window) = app_handle.get_window("main") {
        let _ = window.set_size(Size::Physical(PhysicalSize { width, height }));
    }
    println!("Width: {}", width);
    println!("Height: {}", height);
}
