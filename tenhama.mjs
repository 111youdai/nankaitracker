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

const VEHICLE_ICON_THEMES = Object.freeze({
    THG101: { body: "#f4f7f5", lower: "#eef4f2", stripe: "#159a76", accent: "#f28a2e", motif: "thg" },
    TH2101: { body: "#f0d990", lower: "#e8751b", stripe: "#17683a", accent: "#f2aa32", motif: "re" },
    TH2102: { body: "#e8d9b8", lower: "#dc4726", stripe: "#28231d", accent: "#f1c56a", motif: "retro" },
    TH2103: { body: "#e9edf0", lower: "#bb1728", stripe: "#111820", accent: "#e6bd39", motif: "catalyzer" },
    TH2104: { body: "#f3f5f4", lower: "#e8eeee", stripe: "#1577b7", accent: "#ef7b2d", motif: "original" },
    TH2105: { body: "#f3f5f4", lower: "#e8eeee", stripe: "#1599c8", accent: "#ed8a2f", motif: "una" },
    TH2107: { body: "#1c603b", lower: "#154b31", stripe: "#e8f4e9", accent: "#ef8db5", motif: "flower" },
    TH2108: { body: "#d9edf3", lower: "#9bd6e8", stripe: "#2678ae", accent: "#172f4b", motif: "bike" },
    TH2109: { body: "#dce9c9", lower: "#31a89b", stripe: "#f0a045", accent: "#407c42", motif: "mountain" },
    TH2110: { body: "#f4d64d", lower: "#c68b18", stripe: "#29261d", accent: "#fff5c2", motif: "bee" },
    TH2111: { body: "#5a34a5", lower: "#35206f", stripe: "#38d0a4", accent: "#ff6b2e", motif: "eva" },
    TH2112: { body: "#d8eff8", lower: "#2377ca", stripe: "#55c4ed", accent: "#f1c842", motif: "wave" },
    TH2113: { body: "#1b2e51", lower: "#17243d", stripe: "#c9d2dd", accent: "#dd2532", motif: "katana" },
    TH2114: { body: "#f3f5f4", lower: "#e8eeee", stripe: "#1577b7", accent: "#ef7b2d", motif: "original" },
    TH9200: { body: "#28445a", lower: "#21394d", stripe: "#ad9560", accent: "#d6caa1", motif: "marimekko" }
});

function getVehicleMotif(theme) {
    switch (theme.motif) {
        case "flower":
            return `<g fill="${theme.accent}"><circle cx="22" cy="56" r="2.6"/><circle cx="18" cy="59" r="2.6"/><circle cx="26" cy="59" r="2.6"/><circle cx="22" cy="62" r="2.6"/><circle cx="22" cy="59" r="1.6" fill="#fff4a8"/><circle cx="43" cy="59" r="2.4"/><circle cx="47" cy="62" r="2.4"/><circle cx="39" cy="62" r="2.4"/></g>`;
        case "bike":
            return `<g fill="none" stroke="${theme.accent}" stroke-width="1.8"><circle cx="23" cy="60" r="4"/><circle cx="42" cy="60" r="4"/><path d="M23 60l7-8 5 8H23l5-5h9l5 5M30 52h5"/></g>`;
        case "katana":
            return `<g stroke-linecap="round"><path d="M19 64L44 51" stroke="#eef3f8" stroke-width="3"/><path d="M18 61L25 67" stroke="${theme.accent}" stroke-width="3"/><path d="M37 49L45 57" stroke="${theme.accent}" stroke-width="2"/></g>`;
        case "eva":
            return `<path d="M17 63l9-12 6 8 7-8 9 12-8-5-8 8-8-8z" fill="${theme.accent}"/><path d="M21 60h22" stroke="#42e5a7" stroke-width="2"/>`;
        case "wave":
            return `<path d="M12 62c9-10 15 7 24-3s13 1 17 4" fill="none" stroke="#eafaff" stroke-width="3"/><path d="M12 66c8-7 16 6 25-2s12 0 16 2" fill="none" stroke="${theme.accent}" stroke-width="2"/>`;
        case "marimekko":
            return `<g fill="${theme.accent}"><circle cx="20" cy="58" r="3"/><circle cx="27" cy="63" r="2"/><circle cx="37" cy="57" r="2.5"/><circle cx="45" cy="63" r="3"/></g>`;
        case "mountain":
            return `<path d="M13 64l10-12 7 8 7-11 15 15z" fill="${theme.accent}"/><path d="M23 52l3 4 2-3 4 7" fill="none" stroke="#fff7db" stroke-width="1.6"/>`;
        case "bee":
            return `<g><ellipse cx="32" cy="58" rx="9" ry="6" fill="${theme.accent}"/><path d="M25 55h14M24 59h16M27 63h10" stroke="#29261d" stroke-width="2"/><ellipse cx="21" cy="55" rx="5" ry="3" fill="#fff" opacity=".8"/><ellipse cx="43" cy="55" rx="5" ry="3" fill="#fff" opacity=".8"/></g>`;
        case "una":
            return `<path d="M15 62c7-12 13 7 20-4s10-5 15-1" fill="none" stroke="${theme.accent}" stroke-width="4" stroke-linecap="round"/><circle cx="47" cy="55" r="1.2" fill="#17212a"/>`;
        case "re":
            return `<path d="M13 55h39v5H13z" fill="${theme.stripe}"/><path d="M13 61h39v5H13z" fill="${theme.accent}"/>`;
        case "thg":
            return `<path d="M12 55h40v3H12z" fill="#ef8b2f"/><path d="M12 59h40v3H12z" fill="#159a76"/><path d="M12 63h40v3H12z" fill="#2786bf"/>`;
        case "catalyzer":
            return `<path d="M14 65l8-14 9 9 9-12 11 17z" fill="${theme.stripe}"/><circle cx="32" cy="57" r="4" fill="${theme.accent}"/>`;
        case "retro":
            return `<path d="M12 58h40v8H12z" fill="${theme.lower}"/><path d="M12 57h40" stroke="#3a3022" stroke-width="2"/>`;
        default:
            return `<path d="M12 57h40v3H12z" fill="${theme.stripe}"/><path d="M12 61h40v3H12z" fill="${theme.accent}"/>`;
    }
}

export function getTenhamaVehicleIcon(vehicleId, size = "card") {
    const theme = VEHICLE_ICON_THEMES[vehicleId] || VEHICLE_ICON_THEMES.TH2114;
    const label = vehicleId || "天浜線車両";

    return `
        <svg class="tenhama-vehicle-icon ${escapeHtml(size)}" viewBox="0 0 64 82" role="img" aria-label="${escapeHtml(label)}の車両アイコン">
            <ellipse cx="32" cy="76" rx="22" ry="4" fill="rgba(0,0,0,.34)"/>
            <path d="M26 67v10M38 67v10M22 76h20" stroke="#20282d" stroke-width="3" stroke-linecap="round"/>
            <rect x="4" y="28" width="7" height="20" rx="2" fill="#98a7ab"/>
            <rect x="53" y="28" width="7" height="20" rx="2" fill="#98a7ab"/>
            <path d="M10 17Q32 5 54 17L57 64Q56 71 49 73H15Q8 71 7 64z" fill="${theme.body}" stroke="#75858a" stroke-width="2"/>
            <path d="M13 12Q32 3 51 12L49 18H15z" fill="#59666a"/>
            <rect x="25" y="14" width="14" height="6" rx="2" fill="${theme.accent}"/>
            <rect x="14" y="22" width="36" height="26" rx="4" fill="#101a20"/>
            <path d="M32 22v26" stroke="#607078" stroke-width="2"/>
            <path d="M15 44l7-5M49 44l-7-5" stroke="#8ea1a8" stroke-width="1.5"/>
            <circle cx="16" cy="18" r="3.1" fill="#fff3a6" stroke="#bd9238"/>
            <circle cx="48" cy="18" r="3.1" fill="#fff3a6" stroke="#bd9238"/>
            <path d="M9 50h46v17Q54 71 48 72H16Q10 71 9 67z" fill="${theme.lower}"/>
            ${getVehicleMotif(theme)}
            <rect x="17" y="68" width="30" height="5" rx="2" fill="#2c3438"/>
            <circle cx="22" cy="70.5" r="1.2" fill="#d9e2e3"/><circle cx="42" cy="70.5" r="1.2" fill="#d9e2e3"/>
        </svg>
    `;
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
        <div class="tenhama-detail-title">
            ${getTenhamaVehicleIcon(train.vehicleId, "detail")}
            <h2>${escapeHtml(train.trainNumber)}列車</h2>
        </div>

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
        ${getTenhamaVehicleIcon(train.vehicleId)}
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
