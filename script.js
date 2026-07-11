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

        // ←ここで駅ID→駅名の対応表を作る
        window.stationMap = {};

        lineData.lines.forEach(line => {
            line.stations.forEach(station => {
                window.stationMap[station.id] = station.name_ja;
            });
        });
        window.koyaDiaKind = trainData.koya_schedule_types;
        window.koyaBaseTime = trainData.koya_update_time;

        showUpdateTime(trainData);

        const koyaLine = lineData.lines.find(
    line => line.name_ja === "高野線"
);

// 高野線の駅だけで駅名対応表を作る
window.stationMap = {};

koyaLine.stations.forEach(station => {
    window.stationMap[station.id] = station.name_ja;
});

showStations(koyaLine);

const koyaStationIds = koyaLine.stations.map(
    station => station.id
);

showTrains(trainData, koyaStationIds);

    } catch (error) {

        console.error(error);

    }

}

loadApp();

const modal = document.getElementById("versionModal");
const versionBtn = document.getElementById("versionBtn");
const closeModal = document.getElementById("closeModal");

versionBtn.addEventListener("click", () => {
    modal.hidden = false;
    modal.style.display = "block";
});

closeModal.addEventListener("click", () => {
    modal.hidden = true;
    modal.style.display = "none";
});

modal.addEventListener("click", event => {
    if (event.target === modal) {
        modal.hidden = true;
        modal.style.display = "none";
    }
});