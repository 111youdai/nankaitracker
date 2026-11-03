import { getRouteCoordinates, getStationCoordinate, getTrainCoordinate, mapRoutes, projectCoordinate } from "./map-data.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const state = { trains: [], stationLookup: new Map(), mode: "nankai", selected: null, camera: "rear" };

function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
}

function modeIncludesTrain(train, mode) {
    const ids = [train.station_id, train.next_station_id].map(Number);
    if (mode === "nankai") return Number(train.line_id) === 1 && !ids.some(id => [61,62,63,75,76,77,81,82,83,84,87,88,89,90,91,92,93,94].includes(id));
    if (mode === "branches") return Number(train.line_id) === 1 && ids.some(id => [61,62,63,75,76,77,81,82,83,84,87,88,89,90,91,92,93,94].includes(id));
    if (mode === "semboku") return Number(train.line_id) === 2 && ids.some(id => id >= 151 && id <= 156);
    return Number(train.line_id) === 2 && !ids.some(id => id >= 151 && id <= 156);
}

function stationName(id) {
    return state.stationLookup.get(Number(id))?.name_ja || window.stationMap?.[id] || "位置不明";
}

function positionText(train) {
    const current = stationName(train.station_id);
    return train.next_station_id == null ? current : `${current} → ${stationName(train.next_station_id)}`;
}

function trainMeta(train) {
    const kind = window.resolveTrainKind?.({ lineId: Number(train.line_id), trainNumber: train.train_number, trainKindId: train.train_kind_id });
    const formation = window.resolveTrainFormation?.(train);
    const key = String(train.train_number || "").normalize("NFKC").replace(/^0+(?=\d)/, "");
    const group = Number(train.line_id) === 1 ? "nankai" : "koya";
    const irregular = window.liveIrregularMap?.get?.(`${group}:${key}`) || window.getTrainIrregularInfo?.(train);
    return {
        kind: kind?.trainType || "種別不明",
        cars: formation?.totalCars ? `${formation.totalCars}両` : "両数不明",
        formation: formation?.formationReliable ? formation.formationText : "編成未確認",
        irregular
    };
}

function visibleTrains() {
    return state.trains.filter(train => modeIncludesTrain(train, state.mode) && getTrainCoordinate(train));
}

function routeVisible(route) {
    if (state.mode === "nankai") return route.id === "nankai";
    if (state.mode === "koya") return route.id === "koya";
    if (state.mode === "semboku") return ["koya", "semboku"].includes(route.id);
    return !["nankai", "koya", "semboku"].includes(route.id);
}

function selectTrain(train, switchToChase = false) {
    state.selected = train;
    renderMapCard();
    renderChase();
    document.querySelectorAll(".map-train-marker").forEach(marker => marker.classList.toggle("selected", marker.dataset.trainNumber === String(train.train_number)));
    if (switchToChase) window.setNankaiLocationView?.("chase");
}

function renderMapCard() {
    const card = document.getElementById("mapTrainCard");
    if (!card || !state.selected) return;
    const meta = trainMeta(state.selected);
    card.hidden = false;
    card.classList.toggle("irregular", Boolean(meta.irregular));
    card.innerHTML = `
        <button class="map-card-close" type="button" aria-label="閉じる">×</button>
        <div><small>${escapeText(meta.kind)}${meta.irregular ? " · 定期外" : ""}</small><strong>${escapeText(state.selected.train_number)}列車</strong></div>
        <p>${escapeText(positionText(state.selected))}</p>
        <p>${escapeText(meta.cars)}　${escapeText(meta.formation)}</p>
        <div class="map-card-actions"><button type="button" data-map-action="detail">詳細</button><button type="button" data-map-action="chase">追っかけ</button></div>`;
    card.querySelector(".map-card-close").onclick = () => { card.hidden = true; };
    card.querySelector('[data-map-action="detail"]').onclick = () => window.openTrainDetail?.(state.selected);
    card.querySelector('[data-map-action="chase"]').onclick = () => selectTrain(state.selected, true);
}

function escapeText(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function renderLiveMap() {
    const host = document.getElementById("liveMap");
    if (!host) return;
    host.innerHTML = "";
    const svg = svgElement("svg", { viewBox: "0 0 1000 760", role: "img", "aria-label": "南海線ライブマップ" });
    svg.append(svgElement("path", { class: "map-coast", d: "M0 0H340L320 130 365 205 300 310 345 390 250 520 210 760H0Z" }));

    for (const route of mapRoutes.filter(routeVisible)) {
        const points = getRouteCoordinates(route).map(projectCoordinate).map(point => `${point.x},${point.y}`).join(" ");
        svg.append(svgElement("polyline", { class: "map-route-shadow", points }));
        svg.append(svgElement("polyline", { class: "map-route-line", points, stroke: route.color }));
        for (const stationId of route.stationIds) {
            const coordinate = getStationCoordinate(stationId);
            if (!coordinate) continue;
            const point = projectCoordinate(coordinate);
            svg.append(svgElement("circle", { class: "map-station", cx: point.x, cy: point.y, r: 3.3 }));
        }
    }

    for (const train of visibleTrains()) {
        const point = projectCoordinate(getTrainCoordinate(train));
        const meta = trainMeta(train);
        const group = svgElement("g", { class: `map-train-marker${meta.irregular ? " irregular" : ""}`, transform: `translate(${point.x} ${point.y})`, tabindex: "0", role: "button", "aria-label": `${train.train_number}列車` });
        group.dataset.trainNumber = String(train.train_number);
        group.append(svgElement("circle", { r: 12 }));
        const label = svgElement("text", { x: 0, y: 4, "text-anchor": "middle" });
        label.textContent = String(train.train_number || "?").slice(-4);
        group.append(label);
        group.addEventListener("click", () => selectTrain(train));
        group.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) selectTrain(train); });
        svg.append(group);
    }
    host.append(svg);
    renderChaseList();
}

function renderChaseList() {
    const list = document.getElementById("chaseTrainList");
    if (!list) return;
    const trains = visibleTrains();
    list.innerHTML = trains.length ? trains.map(train => {
        const meta = trainMeta(train);
        return `<button type="button" data-train-number="${escapeText(train.train_number)}" class="${meta.irregular ? "irregular" : ""}"><b>${escapeText(train.train_number)}</b><span>${escapeText(meta.kind)} · ${escapeText(meta.formation)}</span></button>`;
    }).join("") : "<p>現在表示できる列車がありません。</p>";
    list.querySelectorAll("button").forEach(button => button.onclick = () => {
        const train = trains.find(item => String(item.train_number) === button.dataset.trainNumber);
        if (train) selectTrain(train);
    });
}

function renderChase() {
    const info = document.getElementById("chaseTrainInfo");
    const next = document.getElementById("chaseNextStation");
    const viewport = document.getElementById("chaseViewport");
    const hint = document.getElementById("chaseHint");
    if (!info || !next || !viewport || !state.selected) return;
    const meta = trainMeta(state.selected);
    viewport.dataset.camera = state.camera;
    viewport.classList.toggle("irregular", Boolean(meta.irregular));
    next.innerHTML = `<small>${escapeText(meta.kind)} ${escapeText(state.selected.train_number)}</small><b>${escapeText(positionText(state.selected))}</b>`;
    info.innerHTML = `<strong>${escapeText(state.selected.train_number)}</strong><span>${escapeText(meta.cars)} · ${escapeText(meta.formation)}</span><button type="button">詳細</button>`;
    info.querySelector("button").onclick = () => window.openTrainDetail?.(state.selected);
    if (hint) hint.textContent = `${state.selected.train_number}列車を追跡中`;
}

export function updateLiveMap({ trains, stationLookup, mode }) {
    state.trains = trains || [];
    state.stationLookup = stationLookup || new Map();
    state.mode = mode || "nankai";
    if (state.selected && !state.trains.includes(state.selected)) state.selected = null;
    renderLiveMap();
}

export function setMapMode(mode) {
    state.mode = mode;
    if (state.selected && !modeIncludesTrain(state.selected, mode)) state.selected = null;
    renderLiveMap();
    renderChase();
}

export function setChaseCamera(camera) {
    state.camera = camera === "front" ? "front" : "rear";
    renderChase();
}
