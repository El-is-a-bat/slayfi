import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

interface App {
    name: string;
    icon_path: string;
    app_path_exe: string;
    app_desktop_path: string;
}

interface SlayfiConfig {
    apps_per_page: number
}

let apps: App[] = [];
let config: SlayfiConfig;
let currentPage = 0;
let maxPages: number;




async function fetchApps() {
    apps = await invoke("list_applications");
}

async function createAppsEntries() {
    const container = document.getElementById("app-list");

    if (!container) {
        //TODO tell user that container is missing
        console.log("container is missing");
    }

    apps.forEach((app, idx) => {
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

        if (idx >= config.apps_per_page) {
            entry.hidden = true;
        }
        container?.appendChild(entry);

        // smth like rarity in cyberpunk
        // TODO later
        const appType = document.createElement("div");
        appType.className = "app-type";
        entry.appendChild(appType);

        const appInfo = document.createElement("div");
        appInfo.className = "app-info";
        entry.appendChild(appInfo);

        const appIcon = document.createElement("img");
        appIcon.src = convertFileSrc(app.icon_path);
        appIcon.className = "app-icon";
        appInfo.appendChild(appIcon);

        const appName = document.createElement("div");
        appName.className = "app-name";
        appName.textContent = app.name;
        appInfo.appendChild(appName);
    })

}

function selectItem(ind: number) {

}

function setPage(page: number) {
    console.log("Set page", currentPage);
    const entries = Array.from(document.getElementsByClassName("entry")) as HTMLDivElement[];
    entries.forEach(entry => {
        entry.hidden = true;
    });

    // TODO research for more elegant way
    let idx;
    for (let i = 0; i < config.apps_per_page; i++) {
        idx = page * config.apps_per_page + i;
        if (idx < entries.length) {
            entries[idx].hidden = false;
        }
    }

}

function nextPage() {
    currentPage = (currentPage + 1) % maxPages;
    setPage(currentPage);
}

function prevPage() {
    currentPage = (currentPage - 1 + maxPages) % maxPages;
    setPage(currentPage);
}

async function addAppSelection() {
    document.addEventListener("keydown", (e) => {
        const appsContainers = document.querySelectorAll(".entry");

        const selected = document.querySelector(".entry.selected");
        if (selected === null) {
            return;
        } else {
            console.log("Selected item is missing");
        }

        let index = Array.from(appsContainers).indexOf(selected);

        switch (e.key) {
            case "ArrowUp":
                e.preventDefault();
                index -= 1;
                if (index < currentPage * config.apps_per_page) {
                    index = (index + appsContainers.length) % appsContainers.length;
                    prevPage();
                }
                break;
            case "ArrowDown":
                e.preventDefault();
                index += 1;
                let lastIdxOnPage = currentPage * config.apps_per_page + config.apps_per_page - 1;
                if (index > lastIdxOnPage || index >= appsContainers.length) {
                    index = index % appsContainers.length;
                    nextPage();
                }
                break;
            case "ArrowLeft":
                e.preventDefault();
                index = (index - config.apps_per_page + appsContainers.length) % appsContainers.length;
                prevPage();
                break;
            case "ArrowRight":
                e.preventDefault();
                index = (index + config.apps_per_page) % appsContainers.length;
                nextPage();
                break;
            case "Enter":
                const appName = selected.querySelector(".app-name")?.textContent;
                if (appName) {
                    runApp(appName);
                }
                break;
        }
        console.log("index = ", index);
        selected.classList.remove("selected");
        appsContainers[index].classList.add("selected");
        //appsContainers[index].scrollIntoView({ behavior: "smooth" });
    })

}

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
            container.hidden = false;
        } else {
            container.hidden = true;
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

async function main() {
    await invoke<string>("get_config").then((raw) => {
        config = JSON.parse(raw) as SlayfiConfig;
        console.log("Config loaded: ", config);
    });

    await fetchApps();

    if (apps.length === 0) {
        // TODO show that apps not found
        console.log("Apps not found");
        return;
    }

    maxPages = Math.ceil(apps.length / config.apps_per_page)

    await createAppsEntries();

    const filter = document.getElementById("filter") as HTMLInputElement;
    filter.focus();
    filter.oninput = showFiltered;

    const firstApp = document.getElementById("app-list")?.firstElementChild;
    if (firstApp) {
        firstApp?.classList.add("selected");
    } else {
        console.log("First app entry not found");
        return;
    }

    await addAppSelection();

    await invoke("set_application_size", { width: 50, height: 50 });
}

main();
