function showUpdateTime(trainData) {
    document.getElementById("updateTime").textContent =
        `${trainData.koya_update_date} ${trainData.koya_update_time}`;
}

function getStationNumber(station) {
    if (station.name_ja === "中百舌鳥") {
        return "NK59";
    }

    if (station.id >= 152 && station.id <= 156) {
        return `NK${station.id - 64}`;
    }

    return `NK${station.eki_number}`;
}

function createStationElement(station, extraClass = "") {
    const stationElement =
        document.createElement("div");

    stationElement.className =
        `station-row ${extraClass}`.trim();

    stationElement.id =
        `station-${station.id}`;

    stationElement.innerHTML = `
        <div class="up-track"></div>

        <div class="station-center">
            <div class="track"></div>

            <div class="station-name">
                ${station.name_ja}
            </div>

            <div class="station-number">
                ${getStationNumber(station)}
            </div>
        </div>

        <div class="down-track"></div>
    `;

    return stationElement;
}

function showStations(koyaLine, sembokuStations) {
    const lineElement =
        document.getElementById("line");

    lineElement.innerHTML = "";

    const routeContainer =
        document.createElement("div");

    routeContainer.className =
        "route-container";

    const koyaColumn =
        document.createElement("div");

    koyaColumn.className =
        "koya-column";

    koyaLine.stations.forEach(station => {
        koyaColumn.appendChild(
            createStationElement(station)
        );
    });

    routeContainer.appendChild(koyaColumn);
    lineElement.appendChild(routeContainer);

    const nakamozuStation =
        koyaLine.stations.find(
            station =>
                station.name_ja === "中百舌鳥"
        );

    if (!nakamozuStation) {
        console.error(
            "中百舌鳥が見つかりません"
        );
        return;
    }

    const nakamozuRow =
        document.getElementById(
            `station-${nakamozuStation.id}`
        );

    if (!nakamozuRow) {
        console.error(
            "中百舌鳥の駅表示が見つかりません"
        );
        return;
    }

    nakamozuRow.style.position =
        "relative";

    const branchConnector =
        document.createElement("div");

    branchConnector.style.position =
        "absolute";

    branchConnector.style.top =
        "50%";

    branchConnector.style.left =
        "60%";

    branchConnector.style.width =
        "180px";

    branchConnector.style.height =
        "4px";

    branchConnector.style.background =
        "#666";

    branchConnector.style.transform =
        "translateY(-50%)";

    branchConnector.style.zIndex =
        "1";

    const arrow =
        document.createElement("div");

    arrow.style.position =
        "absolute";

    arrow.style.right =
        "0";

    arrow.style.top =
        "-5px";

    arrow.style.width =
        "10px";

    arrow.style.height =
        "10px";

    arrow.style.borderTop =
        "4px solid #666";

    arrow.style.borderRight =
        "4px solid #666";

    arrow.style.transform =
        "rotate(45deg)";

    branchConnector.appendChild(arrow);

    const sembokuColumn =
        document.createElement("div");

    sembokuColumn.style.position =
        "absolute";

    sembokuColumn.style.top =
        "78px";

        sembokuColumn.style.left =
    "70%";

    sembokuColumn.style.width =
        "500px";

    sembokuColumn.style.zIndex =
        "2";

    sembokuStations
        .filter(station => station.id !== 151)
        .forEach(station => {
            sembokuColumn.appendChild(
                createStationElement(
                    station,
                    "semboku-station"
                )
            );
        });

    nakamozuRow.appendChild(
        branchConnector
    );

    nakamozuRow.appendChild(
        sembokuColumn
    );
}

function showTrains(trainData, stationIds) {
    const visibleStationIds =
        stationIds.map(id => String(id));

    trainData.trains.forEach(train => {
        const currentStationId =
            String(train.station_id);

        const nextStationId =
            train.next_station_id == null
                ? null
                : String(train.next_station_id);

        const isVisible =
            visibleStationIds.includes(
                currentStationId
            ) ||
            (
                nextStationId !== null &&
                visibleStationIds.includes(
                    nextStationId
                )
            );

        if (!isVisible) {
            return;
        }

        const stationElement =
            document.getElementById(
                `station-${currentStationId}`
            );

        if (!stationElement) {
            console.warn(
                "列車を置く駅が見つかりません",
                train.train_number,
                currentStationId
            );
            return;
        }

        const target =
            train.direction === "up"
                ? stationElement.querySelector(
                    ".up-track"
                )
                : stationElement.querySelector(
                    ".down-track"
                );

        if (!target) {
            return;
        }

        const trainElement =
            document.createElement("div");

        trainElement.className =
            "train";

        trainElement.onclick = () => {
            openDetail(train);
        };

        const cars =
            Array.isArray(
                train.car_numbers
            )
                ? train.car_numbers
                    .filter(car => car !== 0)
                    .join(" + ")
                : "";

        let trainType =
            "種別不明";

        try {
            const kindInfo =
                window.getTrainKindByNumber(
                    2,
                    train.train_number
                );

            trainType =
                kindInfo?.train_type ||
                "種別不明";

        } catch (error) {
            console.warn(
                "列車種別の取得失敗",
                train.train_number,
                error
            );
        }

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

        target.appendChild(
            trainElement
        );
    });
}

async function openDetail(train) {
    const panel =
        document.getElementById(
            "detailPanel"
        );

    const content =
        document.getElementById(
            "detailContent"
        );

    if (!panel || !content) {
        return;
    }

    const cars =
        Array.isArray(
            train.car_numbers
        )
            ? train.car_numbers
                .filter(car => car !== 0)
                .join(" + ")
            : "";

    const carCounts =
        Array.isArray(
            train.car_counts
        )
            ? train.car_counts
                .filter(count => count !== 0)
                .join(" + ")
            : "";

    const doorCounts =
        Array.isArray(
            train.door_counts
        )
            ? train.door_counts
                .filter(count => count !== 0)
                .join(" + ")
            : "";

    const current =
        window.stationMap[
            train.station_id
        ] || "位置不明";

    const next =
        train.next_station_id == null
            ? null
            : window.stationMap[
                train.next_station_id
            ] || "次駅不明";

    const positionText =
        next
            ? `${current} → ${next}`
            : `${current} 停車中`;

    const kindInfo =
        window.getTrainKindByNumber(
            2,
            train.train_number
        );

    const fallbackTrainType =
        kindInfo?.train_type ||
        "種別不明";

    const fallbackSection =
        kindInfo?.section ||
        "運転区間不明";

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
        const detail =
            await getTrainDetail(
                train.train_number
            );

        console.log(
            "詳細取得成功",
            train.train_number,
            detail
        );

        const stationList =
            Array.isArray(
                detail.station_infos
            )
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
                ${
                    train.direction === "up"
                        ? "上り"
                        : "下り"
                }
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
                ${
                    train.direction === "up"
                        ? "上り"
                        : "下り"
                }
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
        document.getElementById(
            "closeButton"
        );

    if (closeButton) {
        closeButton.onclick = () => {
            panel.classList.remove(
                "open"
            );
        };
    }
}