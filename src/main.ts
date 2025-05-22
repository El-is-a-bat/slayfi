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
let currentPage = 1;
let maxPages;

await invoke<string>("get_config").then((raw) => {
    config = JSON.parse(raw) as SlayfiConfig;
    console.log("Config loaded: ", config);
});


async function fetchApps() {
    apps = await invoke("list_applications");
}

async function createAppsEntries() {
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

function selectItem(ind: number) {

}

function nextPage() {

}

function prevPage() {

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
                index = (index - 1 + appsContainers.length) % appsContainers.length;
                e.preventDefault();
                break;
            case "ArrowDown":
                index = (index + 1) % appsContainers.length;
                e.preventDefault();
                break;
            case "ArrowLeft":
                e.preventDefault();
                prevPage();
                break;
            case "ArrowRight":
                e.preventDefault();
                nextPage();
                break;
            case "Enter":
                const appName = selected.querySelector(".app-name")?.textContent;
                if (appName) {
                    runApp(appName);
                }
                break;
        }

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

async function main() {
    await fetchApps();

    if (apps.length === 0) {
        // TODO show that apps not found
        console.log("Apps not found");
        return;
    }

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
