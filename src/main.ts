import { invoke } from "@tauri-apps/api/core";

interface App {
    name: string;
    icon_path: string;
    app_path_exe: string;
    app_desktop_path: string;
}

async function fetchApps() {
    const apps: App[] = await invoke('list_applications');
    return apps;
}

fetchApps().then(apps => {
    const container = document.getElementById("app-list");
    apps.forEach(app => {
        const appDiv = document.createElement("div");
        container?.appendChild(appDiv);

        const icon = document.createElement("img");
        icon.src = app.icon_path;
        icon.className = "app-icon";
        appDiv.appendChild(icon);

        const name = document.createElement("div");
        name.textContent = app.name;
        appDiv.appendChild(name);
    })
})
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        invoke('exit').then(() => console.log("Exiting app"));
    }
});
