import {
    getTrainKindByNumber,
    getTrainKindById,
    resolveTrainKind
} from "./train-kind.js";

window.getTrainKindByNumber = getTrainKindByNumber;
window.getTrainKindById = getTrainKindById;
window.resolveTrainKind = resolveTrainKind;
async function loadApp() {
    try {
        const trainData = await getTrainData();
        const lineData = await getLineData();

        window.koyaDiaKind =
            trainData.koya_schedule_types;

        window.koyaBaseTime =
            trainData.koya_update_time;

        showUpdateTime(trainData);

        const koyaLine = lineData.lines.find(
            line => line.name_ja === "高野線"
        );

        const koyaBranchLine = lineData.lines.find(
            line => line.name_ja === "高野支線"
        );

        if (!koyaLine) {
            throw new Error("高野線が見つかりません");
        }

        if (!koyaBranchLine) {
            throw new Error("高野支線が見つかりません");
        }

        const sembokuStations =
            koyaBranchLine.stations.filter(
                station =>
                    station.id >= 151 &&
                    station.id <= 156
            );

        console.log("泉北駅", sembokuStations);

        // 駅ID → 駅名
        window.stationMap = {};

        koyaLine.stations.forEach(station => {
            window.stationMap[station.id] =
                station.name_ja;
        });

        sembokuStations.forEach(station => {
            window.stationMap[station.id] =
                station.name_ja;
        });

        showStations(
            koyaLine,
            sembokuStations
        );

        const koyaStationIds =
            koyaLine.stations.map(
                station => station.id
            );

        const sembokuStationIds =
            sembokuStations.map(
                station => station.id
            );

        const visibleStationIds = [
            ...new Set([
                ...koyaStationIds,
                ...sembokuStationIds
            ])
        ];

        showTrains(
            trainData,
            visibleStationIds
        );

    } catch (error) {
        console.error("loadAppエラー:", error);
    }
}

loadApp();

const versionModal = document.getElementById("versionModal");
const versionBtn = document.getElementById("versionBtn");
const closeModalBtn = document.getElementById("closeModal");

versionBtn.addEventListener("click", () => {
    versionModal.showModal();
});

closeModalBtn.addEventListener("click", () => {
    versionModal.close();
});

versionModal.addEventListener("click", event => {
    if (event.target === versionModal) {
        versionModal.close();
    }
});