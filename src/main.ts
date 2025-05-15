import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

interface App {
    name: string;
    icon_path: string;
    app_path_exe: string;
    app_desktop_path: string;
}

let apps: App[] = [];

async function fetchApps() {
    apps = await invoke("list_applications");
}

function createAppsEntries() {
    const container = document.getElementById("app-list");

    if (!container) {
        //TODO tell user that container is missing
        console.log("container is missing");
    }

    apps.forEach(app => {
        const entry = document.createElement("div");
        entry.className = "entry";
        entry.id = app.name;

        entry.addEventListener("click", () => {
            const previousSelected = document.querySelector(".entry.selected");
            if (previousSelected) {
                previousSelected.classList.remove("selected");
            }
            entry.classList.add("selected");
        });
        entry.addEventListener("dblclick", () => {
            const appName = entry.querySelector(".app-name")?.textContent;
            if (appName) {
                runApp(appName);
            }
        });
        container?.appendChild(entry);

        const icon = document.createElement("img");
        icon.src = convertFileSrc(app.icon_path);
        icon.className = "app-icon";
        entry.appendChild(icon);

        const name = document.createElement("div");
        name.className = "app-name";
        name.textContent = app.name;
        entry.appendChild(name);
    })

}

fetchApps().then(() => {
    if (apps.length === 0) {
        // TODO show that apps not found
        console.log("Apps not found");
        return;
    }

    const filter = document.getElementById("filter") as HTMLInputElement;
    filter.focus();
    filter.oninput = showFiltered;

    createAppsEntries();

    const firstApp = document.getElementById("app-list")?.firstElementChild;
    if (firstApp) {
        firstApp?.classList.add("selected");
    } else {
        console.log("First app entry not found");
        return;
    }

    document.addEventListener("keydown", (e) => {
        e.preventDefault();
        const appsContainers = document.querySelectorAll(".entry");

        const selected = document.querySelector(".entry.selected");
        if (selected === null) {
            return;
        } else {
            console.log("Selected item is missing");
        }

        let index = Array.from(appsContainers).indexOf(selected);

        if (e.key === "ArrowDown") {
            index = (index + 1) % appsContainers.length;
        } else if (e.key === "ArrowUp") {
            index = (index - 1 + appsContainers.length) % appsContainers.length;
        } else if (e.key === "Enter") {
            const appName = selected.querySelector(".app-name")?.textContent;
            if (appName) {
                runApp(appName);
            }
        }

        selected.classList.remove("selected");
        appsContainers[index].classList.add("selected");
        appsContainers[index].scrollIntoView({ behavior: "smooth" });
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

function runApp(appName: string) {
    invoke("start_program", { "exec": apps.find(app => app.name == appName)?.app_path_exe });
}

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        invoke("exit").then(() => console.log("Exiting app"));
    }
});


