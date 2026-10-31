import {
    getTrainKindByNumber,
    getTrainKindById,
    resolveTrainKind,
    isSembokuService,
    isLimitedExpressTrain,
    canPlaceOnSemboku,
    analyzeTrainFormation
} from "./train-kind.js";

window.getTrainKindByNumber = getTrainKindByNumber;
window.getTrainKindById = getTrainKindById;
window.resolveTrainKind = resolveTrainKind;
window.isSembokuService = isSembokuService;
window.isLimitedExpressTrain = isLimitedExpressTrain;
window.canPlaceOnSemboku = canPlaceOnSemboku;
window.analyzeTrainFormation = analyzeTrainFormation;

const MODE_NANKAI = "nankai";
const MODE_KOYA = "koya";
const MODE_SEMBOKU = "semboku";
const MODE_BRANCHES = "branches";
const LINE_MODES = new Set([
    MODE_NANKAI,
    MODE_KOYA,
    MODE_SEMBOKU,
    MODE_BRANCHES
]);

const appState = {
    trainData: null,
    lineData: null,
    liveFormationData: null,
    stationLookup: new Map()
};
let refreshLabelResetTimer = null;

function range(start, end) {
    return Array.from(
        { length: end - start + 1 },
        (_, index) => start + index
    );
}

function buildStationLookup(lineData) {
    const lookup = new Map();

    for (const line of lineData?.lines || []) {
        for (const station of line?.stations || []) {
            const id = Number(station.id);

            if (
                Number.isFinite(id) &&
                !lookup.has(id)
            ) {
                lookup.set(id, station);
            }
        }
    }

    return lookup;
}

function getStations(ids) {
    return ids
        .map(id =>
            appState.stationLookup.get(Number(id))
        )
        .filter(Boolean);
}

function createRouteConfig(mode) {
    if (mode === MODE_NANKAI) {
        const mainIds = range(1, 42);

        return {
            mode,
            lineId: 1,
            label: "南海線",
            mainLabel: "南海本線",
            mainStations: getStations(mainIds),
            branches: [],
            visibleStationIds: mainIds,
            placementAliases: {}
        };
    }

    if (mode === MODE_SEMBOKU) {
        const mainIds = [109, 152, 153, 154, 155, 156];
        return {
            mode,
            lineId: 2,
            label: "泉北線",
            mainLabel: "泉北線",
            mainStations: getStations(mainIds),
            branches: [],
            visibleStationIds: [151, 152, 153, 154, 155, 156],
            placementAliases: { 151: 109 }
        };
    }

    if (mode === MODE_BRANCHES) {
        const branchDefinitions = [
            { label: "高師浜線", junctionId: 14, stationIds: [62, 63] },
            { label: "空港線", junctionId: 28, stationIds: [76, 77] },
            { label: "多奈川線", junctionId: 37, stationIds: [83, 82, 81] },
            { label: "加太線", junctionId: 40, stationIds: [88, 89, 90, 91, 92, 93, 94] }
        ];
        return {
            mode,
            lineId: 1,
            label: "支線",
            mainLabel: "",
            mainStations: [],
            branches: branchDefinitions.map(branch => ({
                ...branch,
                stations: getStations([branch.junctionId, ...branch.stationIds])
            })),
            visibleStationIds: [
                61, 62, 63,
                75, 76, 77,
                81, 82, 83, 84,
                87, 88, 89, 90, 91, 92, 93, 94
            ],
            placementAliases: { 61: 14, 75: 28, 84: 37, 87: 40 }
        };
    }

    const mainIds = range(95, 136);

    return {
        mode: MODE_KOYA,
        lineId: 2,
        label: "高野線",
        mainLabel: "高野線",
        mainStations: getStations(mainIds),
        branches: [],
        visibleStationIds: mainIds,
        placementAliases: {}
    };
}

function populateStationMap(routeConfig) {
    window.stationMap = {};

    for (const [id, station] of appState.stationLookup) {
        if (station?.name_ja) {
            window.stationMap[id] = station.name_ja;
        }
    }

    for (
        const [sourceId, targetId]
        of Object.entries(routeConfig.placementAliases)
    ) {
        const sourceName =
            window.stationMap[sourceId];

        const targetName =
            window.stationMap[targetId];

        if (!sourceName && targetName) {
            window.stationMap[sourceId] = targetName;
        }
    }
}

function updateLineSwitchButtons(mode) {
    document
        .querySelectorAll(".line-switch-btn")
        .forEach(button => {
            const active =
                button.dataset.lineMode === mode;

            button.classList.toggle(
                "active",
                active
            );

            button.setAttribute(
                "aria-selected",
                active ? "true" : "false"
            );
        });
}

function renderMode(mode) {
    if (!appState.trainData) {
        return;
    }

    const normalizedMode = LINE_MODES.has(mode) ? mode : MODE_NANKAI;

    const routeConfig =
        createRouteConfig(normalizedMode);

    window.activeLineMode = normalizedMode;
    window.activeLineId = routeConfig.lineId;
    window.activePlacementAliases =
        routeConfig.placementAliases;

    populateStationMap(routeConfig);

    updateLineSwitchButtons(
        normalizedMode
    );

    const labelElement =
        document.getElementById(
            "currentLineLabel"
        );

    if (labelElement) {
        labelElement.textContent =
            routeConfig.label;
    }

    showUpdateTime(
        appState.trainData,
        normalizedMode
    );

    showRouteStations(
        routeConfig
    );

    showTrains(
        appState.trainData,
        routeConfig.visibleStationIds,
        {
            lineId: routeConfig.lineId,
            mode: normalizedMode,
            placementAliases:
                routeConfig.placementAliases
        }
    );

    const detailPanel =
        document.getElementById(
            "detailPanel"
        );

    detailPanel?.classList.remove("open");
    document.body.classList.remove("detail-open");

    localStorage.setItem(
        "nankaiTrackerLineMode",
        normalizedMode
    );

}

async function requestMode(mode) {
    renderMode(LINE_MODES.has(mode) ? mode : MODE_NANKAI);
    return true;
}

window.switchNankaiTrackerLine =
    requestMode;

async function loadApp() {
    const refreshButton =
        document.getElementById("refreshTrains");
    const refreshLabel =
        refreshButton?.querySelector(".refresh-label");

    if (refreshLabelResetTimer) {
        window.clearTimeout(refreshLabelResetTimer);
        refreshLabelResetTimer = null;
    }

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.classList.add("loading");
        refreshButton.setAttribute("aria-busy", "true");
    }
    if (refreshLabel) refreshLabel.textContent = "更新中…";

    try {
        const [trainData, lineData, liveFormationData] =
            await Promise.all([
                getTrainData(),
                getLineData(),
                getLiveFormationData().catch(error => {
                    console.warn(
                        "運用Hubの編成照合を取得できませんでした",
                        error
                    );
                    return { items: {} };
                })
            ]);

        appState.trainData = trainData;
        appState.lineData = lineData;
        appState.liveFormationData = liveFormationData;
        window.hubFormationMap = new Map(
            Object.entries(liveFormationData?.items || {})
        );
        appState.stationLookup =
            buildStationLookup(lineData);

        const trainCount = (trainData.trains || []).filter(
            train => [1, 2].includes(Number(train.line_id))
        ).length;
        const networkTrainCount =
            document.getElementById("networkTrainCount");
        if (networkTrainCount) {
            networkTrainCount.textContent = `${trainCount}列車を取得`;
        }

        const cloudState = document.querySelector(".cloud-state");
        if (cloudState) {
            cloudState.classList.add("ready");
            cloudState.innerHTML = "<i></i>位置情報を取得済み";
        }

        window.koyaBaseTime =
            trainData.koya_update_time ||
            trainData.nankai_update_time ||
            "00:00:00";

        window.nankaiBaseTime =
            trainData.nankai_update_time ||
            trainData.koya_update_time ||
            "00:00:00";

        const hashMode =
            location.hash.replace("#", "");

        const savedMode =
            localStorage.getItem(
                "nankaiTrackerLineMode"
            );

        const initialMode =
            LINE_MODES.has(hashMode)
                ? hashMode
                : (
                    LINE_MODES.has(savedMode)
                        ? savedMode
                        : MODE_NANKAI
                );

        renderMode(initialMode);

        if (refreshLabel) refreshLabel.textContent = "更新完了";
        return true;

    } catch (error) {
        console.error(
            "loadAppエラー:",
            error
        );

        const lineElement =
            document.getElementById("line");

        if (lineElement) {
            lineElement.innerHTML = `
                <p class="detail-error">
                    列車位置情報を読み込めませんでした。
                </p>
            `;
        }

        const cloudState = document.querySelector(".cloud-state");
        if (cloudState) {
            cloudState.classList.add("error");
            cloudState.innerHTML = "<i></i>取得できません";
        }
        if (refreshLabel) refreshLabel.textContent = "再試行";
        return false;
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.classList.remove("loading");
            refreshButton.removeAttribute("aria-busy");
        }

        if (refreshLabel?.textContent === "更新完了") {
            refreshLabelResetTimer = window.setTimeout(() => {
                refreshLabel.textContent = "位置を更新";
                refreshLabelResetTimer = null;
            }, 1500);
        }
    }
}

function normalizeSearchValue(value) {
    return String(value || "")
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/Ｆ/g, "F");
}

function findLiveTrain(query) {
    const normalized = normalizeSearchValue(query);
    if (!normalized || !appState.trainData) return null;

    const candidates = (appState.trainData.trains || []).map(train => {
        const trainNumber = normalizeSearchValue(train.train_number);
        const formation = normalizeSearchValue(
            window.resolveTrainFormation?.(train)?.formationText ||
            analyzeTrainFormation(train).formationText
        );
        let score = 0;
        if (trainNumber === normalized) score = 4;
        else if (formation === normalized || formation === `${normalized}F`) score = 3;
        else if (trainNumber.includes(normalized)) score = 2;
        else if (formation.includes(normalized)) score = 1;
        return { train, score };
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.score ? candidates[0].train : null;
}

function showSearchMessage(message, isError = false) {
    const element = document.getElementById("searchMessage");
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("error", isError);
}

function getModeForTrain(train) {
    const stationIds = [train.station_id, train.next_station_id]
        .filter(value => value != null)
        .map(Number);
    const branchIds = new Set([
        61, 62, 63,
        75, 76, 77,
        81, 82, 83, 84,
        87, 88, 89, 90, 91, 92, 93, 94
    ]);

    if (Number(train.line_id) === 1) {
        return stationIds.some(id => branchIds.has(id))
            ? MODE_BRANCHES
            : MODE_NANKAI;
    }

    return stationIds.some(id => id >= 151 && id <= 156)
        ? MODE_SEMBOKU
        : MODE_KOYA;
}

function setAppView(view, updateHistory = true) {
    const normalizedView =
        ["home", "route", "log", "fleet"].includes(view)
            ? view
            : "home";
    const home = document.getElementById("home");
    const route = document.getElementById("routeWorkspace");
    const records = document.getElementById("recordsWorkspace");
    const recordsVisible =
        normalizedView === "log" ||
        normalizedView === "fleet";

    if (home) home.hidden = normalizedView !== "home";
    if (route) route.hidden = normalizedView !== "route";
    if (records) records.hidden = !recordsVisible;

    if (recordsVisible) {
        const frame = document.getElementById("recordsFrame");
        const title = document.getElementById("recordsTitle");
        if (title) {
            title.textContent =
                normalizedView === "fleet"
                    ? "編成状況"
                    : "定期外ログ";
        }
        if (frame && frame.dataset.view !== normalizedView) {
            frame.dataset.view = normalizedView;
            frame.src =
                `${window.TRACKER_LOG_WORKER_URL}/logs.html?embed=1#${normalizedView}`;
        }
    }

    document.querySelectorAll(".mobile-nav [data-app-view]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.appView === normalizedView
        );
    });

    window.closeTrainDetail?.();
    if (updateHistory) {
        history.replaceState(null, "", `#${normalizedView}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

const trainSearch = document.getElementById("trainSearch");
trainSearch?.addEventListener("submit", event => {
    event.preventDefault();
    const query = document.getElementById("trainSearchInput")?.value;
    const train = findLiveTrain(query);

    if (!train) {
        showSearchMessage("現在配信中の列車から見つかりませんでした。", true);
        return;
    }

    const mode = getModeForTrain(train);
    setAppView("route");
    renderMode(mode);

    const trainElement = [...document.querySelectorAll(".train")].find(
        element => element.dataset.trainNumber === String(train.train_number)
    );

    if (!trainElement) {
        showSearchMessage("列車は見つかりましたが、現在位置を路線上に表示できません。", true);
        return;
    }

    showSearchMessage(`${train.train_number}列車を表示しました。`);
    trainElement.classList.add("search-hit");
    trainElement.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => trainElement.classList.remove("search-hit"), 2600);
    window.setTimeout(() => window.openTrainDetail?.(train), 350);
});

document.querySelectorAll("[data-app-view]").forEach(control => {
    control.addEventListener("click", event => {
        event.preventDefault();
        setAppView(control.dataset.appView);
    });
});

document.getElementById("detailBackdrop")?.addEventListener(
    "click",
    () => window.closeTrainDetail?.()
);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") window.closeTrainDetail?.();
});

for (
    const button of
    document.querySelectorAll(
        ".line-switch-btn"
    )
) {
    button.addEventListener(
        "click",
        () => {
            requestMode(
                button.dataset.lineMode
            );
        }
    );
}

const versionModal =
    document.getElementById("versionModal");

const versionBtn =
    document.getElementById("versionBtn");

const closeModalBtn =
    document.getElementById("closeModal");

if (versionModal && versionBtn) {
    versionBtn.addEventListener(
        "click",
        () => versionModal.showModal()
    );
}

if (versionModal && closeModalBtn) {
    closeModalBtn.addEventListener(
        "click",
        () => versionModal.close()
    );
}

if (versionModal) {
    versionModal.addEventListener(
        "click",
        event => {
            if (event.target === versionModal) {
                versionModal.close();
            }
        }
    );
}

const initialHash = location.hash.replace("#", "");
setAppView(
    ["route", "log", "fleet"].includes(initialHash) || LINE_MODES.has(initialHash)
        ? (LINE_MODES.has(initialHash) ? "route" : initialHash)
        : "home",
    false
);
document.getElementById("refreshTrains")?.addEventListener(
    "click",
    () => void loadApp()
);
loadApp();
