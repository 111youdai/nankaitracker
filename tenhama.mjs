import {
    TENHAMA_STATIONS,
    TENHAMA_TRIPS,
    TENHAMA_VEHICLES,
    TENHAMA_SPECIAL_BY_DATE
} from "./tenhama-data.mjs";

const JST_TIME_ZONE = "Asia/Tokyo";

export {
    TENHAMA_STATIONS,
    TENHAMA_TRIPS,
    TENHAMA_VEHICLES,
    TENHAMA_SPECIAL_BY_DATE
};

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getJstParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("ja-JP", {
        timeZone: JST_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.map(part => [part.type, part.value])
    );

    return {
        dateKey: `${values.year}-${values.month}-${values.day}`,
        hour: Number(values.hour),
        minute: Number(values.minute)
    };
}

export function formatTenhamaMinute(totalMinutes) {
    const normalized = Math.max(0, Number(totalMinutes) || 0);
    const hour = Math.floor(normalized / 60) % 24;
    const minute = normalized % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getShortVehicleName(name) {
    return String(name || "車両未掲載")
        .replace(/^3代目\s*/, "")
        .replace(/フルラッピング列車/g, "")
        .replace(/電気式気動車\s*/g, "")
        .replace(/New\s*/g, "")
        .trim();
}

function isFeaturedVehicle(vehicleId, vehicleName) {
    return Boolean(
        vehicleId &&
        !String(vehicleName).includes("オリジナルカラー")
    );
}

function getPosition(trip, currentMinute) {
    const stops = trip.stops;
    let currentIndex = 0;

    for (let index = 0; index < stops.length; index += 1) {
        if (stops[index].minute <= currentMinute) {
            currentIndex = index;
        } else {
            break;
        }
    }

    const current = stops[currentIndex];
    const next = stops[currentIndex + 1] || null;
    const span = next ? Math.max(1, next.minute - current.minute) : 1;
    const progress = next
        ? Math.max(0, Math.min(1, (currentMinute - current.minute) / span))
        : 1;

    return {
        current,
        next,
        progress,
        label: next
            ? `${current.station.name_ja} → ${next.station.name_ja}`
            : current.station.name_ja
    };
}

export function getActiveTenhamaTrains(date = new Date()) {
    const jst = getJstParts(date);
    const currentMinute = jst.hour * 60 + jst.minute;
    const vehicleAssignments = TENHAMA_SPECIAL_BY_DATE[jst.dateKey] || {};
    const active = [];

    for (const [trainNumber, rawTrip] of Object.entries(TENHAMA_TRIPS)) {
        const stops = rawTrip.s.map(([stationIndex, minute]) => ({
            stationIndex,
            station: TENHAMA_STATIONS[stationIndex],
            minute
        }));
        const first = stops[0];
        const last = stops[stops.length - 1];

        if (
            !first ||
            !last ||
            currentMinute < first.minute ||
            currentMinute > last.minute + 1
        ) {
            continue;
        }

        const vehicleId = vehicleAssignments[trainNumber] || "";
        const vehicleName = TENHAMA_VEHICLES[vehicleId] || "車両未掲載";
        const trip = {
            trainNumber,
            direction: rawTrip.d,
            stops,
            origin: first.station,
            destination: last.station,
            departureMinute: first.minute,
            arrivalMinute: last.minute,
            vehicleId,
            vehicleName,
            shortVehicleName: getShortVehicleName(vehicleName),
            featured: isFeaturedVehicle(vehicleId, vehicleName),
            dateKey: jst.dateKey
        };

        active.push({
            ...trip,
            position: getPosition(trip, currentMinute)
        });
    }

    return active.sort((a, b) => {
        if (a.position.current.stationIndex !== b.position.current.stationIndex) {
            return a.position.current.stationIndex - b.position.current.stationIndex;
        }
        return Number(a.trainNumber) - Number(b.trainNumber);
    });
}

export function getTenhamaRouteConfig() {
    return {
        mode: "tenhama",
        lineId: 3,
        label: "天竜浜名湖線",
        mainLabel: "天竜浜名湖線",
        mainStations: TENHAMA_STATIONS,
        branches: [],
        visibleStationIds: TENHAMA_STATIONS.map(station => station.id),
        placementAliases: {}
    };
}

function openTenhamaDetail(train) {
    const panel = document.getElementById("detailPanel");
    const content = document.getElementById("detailContent");
    const closeButton = document.getElementById("closeButton");

    if (!panel || !content) return;

    const close = () => window.closeTrainDetail?.();
    if (closeButton) closeButton.onclick = close;

    const rows = train.stops.map(stop => {
        const current = stop.stationIndex === train.position.current.stationIndex;
        const next = stop.stationIndex === train.position.next?.stationIndex;
        const marker = current ? "現在地側" : (next ? "次駅側" : "");
        return `
            <tr${current || next ? ' class="tenhama-current-stop"' : ""}>
                <td>${escapeHtml(stop.station.name_ja)}</td>
                <td>${escapeHtml(formatTenhamaMinute(stop.minute))}</td>
                <td>${escapeHtml(marker)}</td>
            </tr>
        `;
    }).join("");

    const vehicle = train.vehicleId
        ? `${train.vehicleId}　${train.vehicleName}`
        : "この日の公式車両予定には掲載なし";

    content.innerHTML = `
        <h2>🚃 ${escapeHtml(train.trainNumber)}列車</h2>

        <div class="tenhama-detail-status">
            <strong>時刻表からの推定位置</strong>
            <span>${escapeHtml(train.position.label)}</span>
        </div>

        <p><b>運転区間</b></p>
        <p>${escapeHtml(train.origin.name_ja)} → ${escapeHtml(train.destination.name_ja)}</p>

        <p><b>始発時刻</b></p>
        <p>${escapeHtml(formatTenhamaMinute(train.departureMinute))}</p>

        <p><b>車両運行予定</b></p>
        <p>${escapeHtml(vehicle)}</p>

        <div class="detail-warning">
            リアルタイムGPSではありません。公式時刻表を基にした推定で、遅延・運休・臨時変更や車両変更は反映されない場合があります。
        </div>

        <h3>推定通過・発車時刻</h3>
        <table class="tenhama-timetable">
            <tr><th>駅</th><th>時刻</th><th>位置</th></tr>
            ${rows}
        </table>

        <p class="tenhama-source-links">
            <a href="https://www.tenhama.co.jp/about/timetable-2/" target="_blank" rel="noopener">公式時刻表</a>
            <a href="https://www.tenhama.co.jp/events/18847/" target="_blank" rel="noopener">特別車両運行予定</a>
            <a href="https://www.tenhama.co.jp/operation-status/" target="_blank" rel="noopener">運行情報</a>
        </p>
    `;

    panel.classList.add("open");
    document.body.classList.add("detail-open");
}

function createTrainCard(train) {
    const element = document.createElement("div");
    element.className = `train tenhama-train${train.featured ? " featured" : ""}`;
    element.dataset.trainNumber = train.trainNumber;
    element.dataset.vehicle = train.vehicleId;
    element.tabIndex = 0;
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", `${train.trainNumber}列車の推定位置詳細を開く`);

    const open = () => openTenhamaDetail(train);
    element.onclick = open;
    element.onkeydown = event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
        }
    };

    element.innerHTML = `
        ${train.featured ? '<div class="tenhama-special-badge">特別車両</div>' : ""}
        <div class="train-kind">時刻表推定</div>
        <div class="train-number">${escapeHtml(train.trainNumber)}</div>
        <div class="train-cars">1両</div>
        <div class="train-formation">${escapeHtml(train.vehicleId || "車両未掲載")}</div>
        <div class="tenhama-vehicle-name">${escapeHtml(train.shortVehicleName)}</div>
    `;

    return element;
}

export function renderTenhamaTrains(date = new Date()) {
    const trains = getActiveTenhamaTrains(date);

    for (const train of trains) {
        const stationId = train.position.current.station.id;
        const stationElement = document.getElementById(`station-${stationId}`);
        const target = stationElement?.querySelector(
            train.direction === "up" ? ".up-track" : ".down-track"
        );
        target?.appendChild(createTrainCard(train));
    }

    const countElement = document.getElementById("visibleTrainCount");
    if (countElement) {
        countElement.textContent = `${trains.length}列車を時刻表から推定`;
    }

    const updateTime = document.getElementById("updateTime");
    if (updateTime) {
        const jst = getJstParts(date);
        updateTime.textContent = `推定基準 ${String(jst.hour).padStart(2, "0")}:${String(jst.minute).padStart(2, "0")}`;
    }

    return trains;
}
