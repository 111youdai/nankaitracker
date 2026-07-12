function showUpdateTime(trainData) {
    document.getElementById("updateTime").textContent =
        `${trainData.koya_update_date} ${trainData.koya_update_time}`;
}

function showStations(line) {
    const lineElement = document.getElementById("line");

    lineElement.innerHTML = "";

    line.stations.forEach(station => {
        const stationElement = document.createElement("div");

        stationElement.className = "station-row";
        stationElement.id = `station-${station.id}`;

        stationElement.innerHTML = `
            <div class="up-track"></div>

            <div class="station-center">
                <div class="track"></div>
                <div class="station-name">${station.name_ja}</div>
                <div class="station-number">NK${station.eki_number}</div>
            </div>

            <div class="down-track"></div>
        `;

        lineElement.appendChild(stationElement);
    });
}

function showTrains(trainData, stationIds) {
    trainData.trains.forEach(train => {
        const isVisible =
            stationIds.includes(train.station_id) ||
            stationIds.includes(train.next_station_id);

        if (!isVisible) return;

        const stationElement = document.getElementById(
            `station-${train.station_id}`
        );

        if (!stationElement) return;

        const target =
            train.direction === "up"
                ? stationElement.querySelector(".up-track")
                : stationElement.querySelector(".down-track");

        if (!target) return;

        const trainElement = document.createElement("div");

        trainElement.className = "train";

        trainElement.onclick = () => {
            openDetail(train);
        };

        const cars = train.car_numbers
            .filter(car => car !== 0)
            .join(" + ");

        const kindInfo = window.getTrainKindByNumber(
    2,
    train.train_number
);

const trainType =
    kindInfo?.train_type || "種別不明";

trainElement.innerHTML = `
    <div class="train-kind">
        ${trainType}
    </div>

    <div class="train-number">
        ${train.train_number}
    </div>

    <div class="train-cars">
        ${cars || "編成不明"}
    </div>
`;

        target.appendChild(trainElement);
    });
}

async function openDetail(train) {
    const panel = document.getElementById("detailPanel");
    const content = document.getElementById("detailContent");

    if (!panel || !content) return;

    const cars = Array.isArray(train.car_numbers)
        ? train.car_numbers
            .filter(car => car !== 0)
            .join(" + ")
        : "";

    const carCounts = Array.isArray(train.car_counts)
        ? train.car_counts
            .filter(count => count !== 0)
            .join(" + ")
        : "";

    const doorCounts = Array.isArray(train.door_counts)
        ? train.door_counts
            .filter(count => count !== 0)
            .join(" + ")
        : "";

    const current =
        window.stationMap[train.station_id] || "位置不明";

    const next =
        train.next_station_id == null
            ? null
            : window.stationMap[train.next_station_id] || "次駅不明";

    const positionText = next
        ? `${current} → ${next}`
        : `${current} 停車中`;

    const kindInfo = window.getTrainKindByNumber(
        2,
        train.train_number
    );

    const fallbackTrainType =
        kindInfo?.train_type || "種別不明";

    const fallbackSection =
        kindInfo?.section || "運転区間不明";

    const delay =
        train.delay_minutes ??
        train.delay_min ??
        train.delay ??
        0;

    panel.classList.add("open");

    content.innerHTML = `
        <h2>🚃 ${train.train_number}列車</h2>
        <p>列車情報を取得中...</p>
    `;

    try {
        const detail = await getTrainDetail(
            train.train_number
        );

        console.log(
            "詳細取得成功",
            train.train_number,
            detail
        );
        const detailStations =
    Array.isArray(detail.station_infos)
        ? detail.station_infos.map(
            station => station.station_name
        )
        : [];

const currentStation =
    window.stationMap[train.station_id];

const nextStation =
    train.next_station_id == null
        ? null
        : window.stationMap[train.next_station_id];

const matchesCurrentPosition =
    detailStations.includes(currentStation) ||
    (nextStation && detailStations.includes(nextStation));

if (!matchesCurrentPosition) {
    throw new Error(
        "別ダイヤの時刻表が返されたため表示しません"
    );
}
const departure =
    detail.departure_station_name;

const arrival =
    detail.arrival_station_name;

const fallbackSectionText =
    kindInfo?.section || "";

const matchesSection =
    !departure ||
    !arrival ||
    fallbackSectionText.includes(departure) ||
    fallbackSectionText.includes(arrival);

if (!matchesCurrentPosition && !matchesSection) {
    throw new Error(
        "別ダイヤの時刻表が返されたため表示しません"
    );
}

        const stationList =
            Array.isArray(detail.station_infos)
                ? detail.station_infos
                    .map(station => `
                        <tr>
                            <td>${station.station_name ?? "-"}</td>
                            <td>${station.arrival_time ?? "-"}</td>
                            <td>${station.departure_time ?? "-"}</td>
                        </tr>
                    `)
                    .join("")
                : "";

        const trainType =
            detail.train_kind_name ||
            fallbackTrainType;

        const departure =
            detail.departure_station_name;

        const arrival =
            detail.arrival_station_name;

        const section =
            departure && arrival
                ? `${departure} → ${arrival}`
                : fallbackSection;

        content.innerHTML = `
            <h2>🚃 ${train.train_number}列車</h2>

            <hr>

            <p><b>種別</b></p>
            <p>${trainType}</p>

            <p><b>運転区間</b></p>
            <p>${section}</p>

            <p><b>編成</b></p>
            <p>${cars || "不明"}</p>

            <p><b>両数</b></p>
            <p>${carCounts || "不明"}</p>

            <p><b>扉数</b></p>
            <p>${doorCounts || "不明"}</p>

            <p><b>遅延</b></p>
            <p>${delay}分</p>

            <p><b>方向</b></p>
            <p>
                ${train.direction === "up"
                    ? "上り"
                    : "下り"}
            </p>

            <p><b>現在位置</b></p>
            <p>${positionText}</p>

            <hr>

            <h3>停車駅・時刻</h3>

            ${
                stationList
                    ? `
                        <table>
                            <tr>
                                <th>駅名</th>
                                <th>着</th>
                                <th>発</th>
                            </tr>
                            ${stationList}
                        </table>
                    `
                    : "<p>停車駅情報なし</p>"
            }
        `;

    } catch (error) {
        console.warn(
            `${train.train_number}列車の詳細取得失敗:`,
            error
        );

        content.innerHTML = `
            <h2>🚃 ${train.train_number}列車</h2>

            <div class="detail-warning">
                詳細APIから情報を取得できなかったため、
                列車位置データから表示しています。
            </div>

            <p><b>種別</b></p>
            <p>${fallbackTrainType}</p>

            <p><b>運転区間</b></p>
            <p>${fallbackSection}</p>

            <p><b>編成</b></p>
            <p>${cars || "不明"}</p>

            <p><b>両数</b></p>
            <p>${carCounts || "不明"}</p>

            <p><b>扉数</b></p>
            <p>${doorCounts || "不明"}</p>

            <p><b>遅延</b></p>
            <p>${delay}分</p>

            <p><b>方向</b></p>
            <p>
                ${train.direction === "up"
                    ? "上り"
                    : "下り"}
            </p>

            <p><b>現在位置</b></p>
            <p>${positionText}</p>

            <hr>

            <p class="detail-error">
    この列車は停車駅・時刻を取得できません。
</p>
        `;
    }

    const closeButton =
        document.getElementById("closeButton");

    if (closeButton) {
        closeButton.onclick = () => {
            panel.classList.remove("open");
        };
    }
}