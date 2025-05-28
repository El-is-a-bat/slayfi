import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

interface App {
    name: string;
    icon_path: string;
    app_path_exe: string;
    app_desktop_path: string;
    //times_runned: number;
}

interface SlayfiConfig {
    apps_per_page: number
}

let apps: App[] = [];
// TODO change to list?
let appsEntries: HTMLDivElement[] = [];
let availableApps: HTMLDivElement[] = [];
let config: SlayfiConfig;
let currentPage = 0;
let maxPages: number;
const filter = document.getElementById("filter") as HTMLInputElement;
const container = document.getElementById("app-list") as HTMLDivElement;

async function fetchApps() {
    apps = await invoke("list_applications");
}

async function createAppsEntries() {
    apps.forEach((app: App) => {
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

        appsEntries.push(entry);

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

    while (container.firstElementChild) {
        container.removeChild(container.lastElementChild!);
    }

    // TODO research for more elegant way
    for (let i = 0, idx; i < config.apps_per_page; i++) {
        idx = page * config.apps_per_page + i;
        if (idx < availableApps.length) {
            container.appendChild(availableApps[i]);
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

        const selected = document.querySelector(".entry.selected") as HTMLDivElement;
        if (selected === null) {
            console.log("Selected item is missing");
            return;
        }


        let index = appsEntries.indexOf(selected);
        let isFiltered = filter.textContent?.length != 0;

        switch (e.key) {
            case "ArrowUp":
                e.preventDefault();
                if (isFiltered) {
                }
                index -= 1;
                if (index < currentPage * config.apps_per_page) {
                    index = (index + appsEntries.length) % appsEntries.length;
                    prevPage();
                }
                break;
            case "ArrowDown":
                e.preventDefault();
                index += 1;
                let lastIdxOnPage = currentPage * config.apps_per_page + config.apps_per_page - 1;
                if (index > lastIdxOnPage || index >= appsEntries.length) {
                    index = index % appsEntries.length;
                    nextPage();
                }
                break;
            case "ArrowLeft":
                e.preventDefault();
                index = (index - config.apps_per_page + appsEntries.length) % appsEntries.length;
                prevPage();
                break;
            case "ArrowRight":
                e.preventDefault();
                index = (index + config.apps_per_page) % appsEntries.length;
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
        appsEntries[index].classList.add("selected");
        //appsContainers[index].scrollIntoView({ behavior: "smooth" });
    })

}

function filterApps() {
    let filterText = filter.value.toLowerCase();

    availableApps.length = 0;

    let app, appName;
    appsEntries.forEach(entry => {
        app = entry.querySelector(".app-name") as HTMLDivElement;
        appName = app.textContent || app.innerText;
        if (appName.toLowerCase().indexOf(filterText) > -1) {
            availableApps.push(entry);
        }
    });

    setPage(0);
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

    if (appsEntries.length == 0) {
        console.log("Apps entries lenght is 0, smth went wrong(");
        return;
    }

    console.log(appsEntries);
    availableApps = appsEntries.map(entry => entry.cloneNode(true) as HTMLDivElement);
    console.log(availableApps);
    setPage(0);
    availableApps[0].classList.add("selected");

    const filter = document.getElementById("filter") as HTMLInputElement;
    filter.focus();
    filter.oninput = filterApps;

    await addAppSelection();

    await invoke("set_application_size", { width: 50, height: 50 });
}

main();
