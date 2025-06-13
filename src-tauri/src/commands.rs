use chrono::Local;
use freedesktop_file_parser::{EntryType, LocaleString};
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs::OpenOptions;
use std::io::Write;
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

    match Command::new("sh").arg("-c").arg(shell_cmd).spawn() {
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

#[cfg(debug_assertions)]
fn log_error_to_file(message: &str) {
    let error_log_path = format!(
        "{}/.local/share/slayfi/error.log",
        env::var("HOME").unwrap_or_else(|_| String::from("/home"))
    );
    if let Ok(mut error_log) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&error_log_path)
    {
        let error_msg = format!(
            "[{}] {}\n",
            Local::now().format("%Y-%m-%d %H:%M:%S"),
            message
        );
        let _ = error_log.write_all(error_msg.as_bytes());
    }
}

#[tauri::command]
pub fn list_desktop_applications() -> Vec<Application> {
    let applications_path = "/usr/share/applications/";
    let mut applications: Vec<Application> = vec![];

    // Get current desktop environment
    let desktop_environment =
        env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| String::from("Hyprland"));
    #[cfg(debug_assertions)]
    info!("Current desktop environment: {}", desktop_environment);

    for entry in WalkDir::new(applications_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path().to_string_lossy();
        #[cfg(debug_assertions)]
        debug!("Processing: {}", file_path);

        let content = match std::fs::read_to_string(entry.path()) {
            Ok(content) => content,
            Err(e) => {
                #[cfg(debug_assertions)]
                log_error_to_file(&format!("Error reading file {}: {}", file_path, e));
                error!("Error reading file {}: {}", file_path, e);
                continue;
            }
        };

        // Extract only the [Desktop Entry] section
        let desktop_entry_content = match content.split("[Desktop Entry]").nth(1) {
            Some(section) => {
                // Find the next section header or end of file
                let next_section = section.find("\n[").unwrap_or(section.len());
                format!("[Desktop Entry]{}", &section[..next_section])
            }
            None => {
                #[cfg(debug_assertions)]
                log_error_to_file(&format!(
                    "No [Desktop Entry] section found in {}",
                    file_path
                ));
                error!("No [Desktop Entry] section found in {}", file_path);
                continue;
            }
        };

        let desktop_file = match freedesktop_file_parser::parse(&desktop_entry_content) {
            Ok(parsed) => parsed,
            Err(e) => {
                #[cfg(debug_assertions)]
                log_error_to_file(&format!("Error parsing desktop file {}: {}", file_path, e));
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
                    #[cfg(debug_assertions)]
                    {
                        log_error_to_file(&format!(
                            "Skipping {}: No exec field",
                            desktop_entry.name.default
                        ));
                        debug!("Skipping {}: No exec field", desktop_entry.name.default);
                    }
                    continue;
                }
            };

            // TODO figure out how to start terminal apps

            // Skip if application is hidden or shouldn't be displayed
            if desktop_entry.hidden.unwrap_or(false) || desktop_entry.no_display.unwrap_or(false) {
                #[cfg(debug_assertions)]
                {
                    log_error_to_file(&format!(
                        "Skipping {}: Hidden or no display",
                        desktop_entry.name.default
                    ));
                    debug!(
                        "Skipping {}: Hidden or no display",
                        desktop_entry.name.default
                    );
                }
                continue;
            }

            // Check if application should be shown in current desktop environment
            let only_show_in = desktop_entry.only_show_in.unwrap_or_default();
            let not_show_in = desktop_entry.not_show_in.unwrap_or_default();

            if !only_show_in.is_empty() && !only_show_in.contains(&desktop_environment) {
                #[cfg(debug_assertions)]
                {
                    log_error_to_file(&format!(
                        "Skipping {}: Not compatible with current desktop environment",
                        desktop_entry.name.default
                    ));
                    debug!(
                        "Skipping {}: Not compatible with current desktop environment",
                        desktop_entry.name.default
                    );
                }
                continue;
            }

            if not_show_in.contains(&desktop_environment) {
                #[cfg(debug_assertions)]
                {
                    log_error_to_file(&format!(
                        "Skipping {}: Explicitly not shown in current desktop environment",
                        desktop_entry.name.default
                    ));
                    debug!(
                        "Skipping {}: Explicitly not shown in current desktop environment",
                        desktop_entry.name.default
                    );
                }
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
                            #[cfg(debug_assertions)]
                            log_error_to_file(&format!(
                                "No icon path found for {}",
                                desktop_entry.name.default
                            ));
                            warn!("No icon path found for {}", desktop_entry.name.default);
                            String::from("")
                        }
                    },
                    None => {
                        #[cfg(debug_assertions)]
                        log_error_to_file(&format!(
                            "No icon found for {}",
                            desktop_entry.name.default
                        ));
                        warn!("No icon found for {}", desktop_entry.name.default);
                        String::from("")
                    }
                },
                exec,
            };

            #[cfg(debug_assertions)]
            debug!("Added application: {}", app);
            applications.push(app);
        } else {
            #[cfg(debug_assertions)]
            {
                log_error_to_file(&format!("Skipping {}: Not an application entry", file_path));
                debug!("Skipping {}: Not an application entry", file_path);
            }
            continue;
        }
    }

    #[cfg(debug_assertions)]
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
