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

const appState = {
    trainData: null,
    lineData: null,
    stationLookup: new Map()
};

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

        const branches = [
            {
                label: "高師浜線",
                junctionId: 14,
                stationIds: [62, 63],
                aliases: { 61: 14 }
            },
            {
                label: "空港線",
                junctionId: 28,
                stationIds: [76, 77],
                aliases: { 75: 28 }
            },
            {
                label: "多奈川線",
                junctionId: 37,
                stationIds: [83, 82, 81],
                aliases: { 84: 37 }
            },
            {
                label: "加太線",
                junctionId: 40,
                stationIds: [88, 89, 90, 91, 92, 93, 94],
                aliases: { 87: 40 }
            }
        ];

        const visibleStationIds = [
            ...mainIds,
            61, 62, 63,
            75, 76, 77,
            81, 82, 83, 84,
            87, 88, 89, 90, 91, 92, 93, 94
        ];

        const placementAliases = {
            61: 14,
            75: 28,
            84: 37,
            87: 40
        };

        return {
            mode,
            lineId: 1,
            label: "南海線（本線・空港線・支線）",
            mainStations: getStations(mainIds),
            branches: branches.map(branch => ({
                ...branch,
                stations: getStations(branch.stationIds)
            })),
            visibleStationIds,
            placementAliases
        };
    }

    const mainIds = range(95, 136);

    return {
        mode: MODE_KOYA,
        lineId: 2,
        label: "高野線・泉北線",
        mainStations: getStations(mainIds),
        branches: [
            {
                label: "泉北線",
                junctionId: 109,
                stationIds: [152, 153, 154, 155, 156],
                stations: getStations([152, 153, 154, 155, 156]),
                aliases: { 151: 109 }
            }
        ],
        visibleStationIds: [
            ...mainIds,
            151, 152, 153, 154, 155, 156
        ],
        placementAliases: {
            151: 109
        }
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

    const normalizedMode =
        mode === MODE_NANKAI
            ? MODE_NANKAI
            : MODE_KOYA;

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

    localStorage.setItem(
        "nankaiTrackerLineMode",
        normalizedMode
    );

    history.replaceState(
        null,
        "",
        `#${normalizedMode}`
    );
}

window.switchNankaiTrackerLine = renderMode;

async function loadApp() {
    try {
        const [trainData, lineData] =
            await Promise.all([
                getTrainData(),
                getLineData()
            ]);

        appState.trainData = trainData;
        appState.lineData = lineData;
        appState.stationLookup =
            buildStationLookup(lineData);

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
            hashMode === MODE_NANKAI ||
            hashMode === MODE_KOYA
                ? hashMode
                : (
                    savedMode === MODE_NANKAI
                        ? MODE_NANKAI
                        : MODE_KOYA
                );

        renderMode(initialMode);

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
    }
}

for (
    const button of
    document.querySelectorAll(
        ".line-switch-btn"
    )
) {
    button.addEventListener(
        "click",
        () => {
            renderMode(
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

loadApp();
