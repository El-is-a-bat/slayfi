import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

interface App {
    name: string;
    icon_path: string;
    app_path_exe: string;
    app_desktop_path: string;
}

async function fetchApps() {
    const apps: App[] = await invoke("list_applications");
    return apps;
}

function createAppsEntries(apps: App[]) {
    const container = document.getElementById("app-list");

    apps.forEach(app => {
        const entry = document.createElement("div");
        entry.className = "entry";
        entry.id = app.name;
        container?.appendChild(entry);

        const icon = document.createElement("img");
        icon.src = convertFileSrc(app.icon_path);
        icon.className = "app-icon";
        entry.appendChild(icon);

        const name = document.createElement("div");
        name.className = "app-name";
        name.textContent = app.app_path_exe;
        entry.appendChild(name);
    })

}

fetchApps().then(apps => {
    const filter = document.getElementById("filter") as HTMLInputElement;
    filter.focus();
    filter.oninput = showFiltered;

    createAppsEntries(apps);
    const firstApp = document.getElementById("app-list")?.firstElementChild;
    if (firstApp) {
        firstApp?.classList.add("selected");
    }

    document.addEventListener("keydown", (e) => {
        const apps = document.querySelectorAll(".entry");
        if (apps.length === 0) {
            return;
        }

        const selected = document.querySelector(".entry.selected");
        if (selected === null) {
            return;
        }
        let index = Array.from(apps).indexOf(selected);

        if (e.key === "ArrowDown") {
            index = (index + 1) % apps.length;
            e.preventDefault();
        } else if (e.key === "ArrowUp") {
            index = (index - 1 + apps.length) % apps.length;
            e.preventDefault();
        } else if (e.key === "Enter") {
            const appName = selected.querySelector(".app-name")?.textContent;
            invoke("start_program", { "exec": appName });
        }

        if (selected) {
            selected.classList.remove("selected");
            selected.scrollIntoView();
        }
        apps[index].classList.add("selected");
    })

})

function showFiltered() {
    const filter = document.getElementById("filter") as HTMLInputElement;
    let filterText = filter?.value.toLowerCase();
    console.log(filterText);
    let appContainers = Array.from(document.getElementsByClassName("entry")) as HTMLDivElement[];

    let app, appName;
    appContainers.forEach(container => {
        app = container.querySelector(".app-name") as HTMLDivElement;
        appName = app.textContent || app.innerText;
        if (appName.toLowerCase().indexOf(filterText) > -1) {
            container.style.display = "";
        } else {
            container.style.display = "none";
        }
    });
}

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        invoke("exit").then(() => console.log("Exiting app"));
    }
});


