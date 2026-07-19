function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showUpdateTime(trainData) {
    const updateTime =
        document.getElementById("updateTime");

    if (!updateTime) {
        return;
    }

    updateTime.textContent =
        `${trainData.koya_update_date} ${trainData.koya_update_time}`;
}

function getStationNumber(station) {
    if (station.name_ja === "中百舌鳥") {
        return "NK59";
    }

    if (
        Number(station.id) >= 152 &&
        Number(station.id) <= 156
    ) {
        return `NK${Number(station.id) - 64}`;
    }

    return `NK${station.eki_number}`;
}

function createStationElement(
    station,
    extraClass = ""
) {
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
                ${escapeHtml(station.name_ja)}
            </div>

            <div class="station-number">
                ${escapeHtml(getStationNumber(station))}
            </div>
        </div>

        <div class="down-track"></div>
    `;

    return stationElement;
}

function showStations(
    koyaLine,
    sembokuStations
) {
    const lineElement =
        document.getElementById("line");

    if (!lineElement) {
        console.error(
            "路線表示要素#lineが見つかりません"
        );
        return;
    }

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
        .filter(
            station =>
                Number(station.id) !== 151
        )
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

function getResolvedKind(train) {
    try {
        if (
            typeof window.resolveTrainKind ===
            "function"
        ) {
            return window.resolveTrainKind({
                lineId:
                    Number(train.line_id) || 2,

                trainNumber:
                    train.train_number,

                trainKindId:
                    train.train_kind_id
            });
        }
    } catch (error) {
        console.warn(
            "列車種別の取得失敗",
            train.train_number,
            error
        );
    }

    return {
        trainType: "種別不明",
        section: "運転区間不明",
        kind: "",
        imageName: ""
    };
}

function getFormationInfo(train) {
    if (
        typeof window.analyzeTrainFormation ===
        "function"
    ) {
        return window.analyzeTrainFormation(train);
    }

    const totalCars =
        Number(train.train_length_id) || null;

    return {
        rawTotalCars: totalCars,
        totalCars,
        totalCarsReliable: Boolean(totalCars),
        formationReliable: false,
        formationText: "",
        carNumbers: [],
        carCounts: [],
        carCountTotal: 0,
        sembokuService: false,
        limitedExpress: false,
        problems: [
            "編成情報の検証機能を読み込めませんでした"
        ]
    };
}

function showTrains(
    trainData,
    stationIds
) {
    const visibleStationIds =
        new Set(
            stationIds.map(id => String(id))
        );

    trainData.trains.forEach(train => {
        const currentStationId =
            String(train.station_id);

        const nextStationId =
            train.next_station_id == null
                ? null
                : String(train.next_station_id);

        const currentIsVisible =
            visibleStationIds.has(
                currentStationId
            );

        const nextIsVisible =
            nextStationId !== null &&
            visibleStationIds.has(
                nextStationId
            );

        if (
            !currentIsVisible &&
            !nextIsVisible
        ) {
            return;
        }

        /*
         * 現在駅が表示範囲外で、次駅だけが表示範囲内の場合は
         * 次駅側へ仮置きする。
         */
        const placementStationId =
            currentIsVisible
                ? currentStationId
                : nextStationId;

        const stationElement =
            document.getElementById(
                `station-${placementStationId}`
            );

        if (!stationElement) {
            console.warn(
                "列車を置く駅が見つかりません",
                train.train_number,
                placementStationId
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

        const kindInfo =
            getResolvedKind(train);

        const formationInfo =
            getFormationInfo(train);

        const carsText =
            formationInfo.totalCars
                ? `${formationInfo.totalCars}両`
                : "両数不明";

        trainElement.innerHTML = `
            <div class="train-kind">
                ${escapeHtml(kindInfo.trainType)}
            </div>

            <div class="train-number">
                ${escapeHtml(train.train_number)}
            </div>

            <div class="train-cars">
                ${escapeHtml(carsText)}
            </div>
        `;

        if (
            formationInfo.problems.length > 0
        ) {
            trainElement.dataset.formationWarning =
                formationInfo.problems.join(" / ");

            trainElement.title =
                formationInfo.problems.join("\n");
        }

        target.appendChild(
            trainElement
        );
    });
}

function getPositionText(train) {
    const current =
        window.stationMap?.[
            train.station_id
        ] || "位置不明";

    const next =
        train.next_station_id == null
            ? null
            : (
                window.stationMap?.[
                    train.next_station_id
                ] || "次駅不明"
            );

    return next
        ? `${current} → ${next}`
        : `${current} 停車中`;
}

function getDelayMinutes(train) {
    return (
        train.delay_minutes ??
        train.delay_min ??
        train.delay ??
        0
    );
}

function getDoorText(train) {
    const doorCounts =
        Array.isArray(train.door_counts)
            ? train.door_counts
                .map(value => Number(value))
                .filter(value =>
                    Number.isFinite(value) &&
                    value > 0
                )
            : [];

    if (doorCounts.length > 0) {
        return doorCounts.join(" + ");
    }

    const doorCount =
        Number(train.door_count);

    return (
        Number.isFinite(doorCount) &&
        doorCount > 0
    )
        ? String(doorCount)
        : "不明";
}

function getFormationDetailHtml(
    formationInfo
) {
    const totalCarsText =
        formationInfo.totalCars
            ? `${formationInfo.totalCars}両`
            : "不明";

    if (
        formationInfo.formationReliable
    ) {
        return `
            <p><b>編成番号</b></p>
            <p>${escapeHtml(
                formationInfo.formationText
            )}</p>

            <p><b>両数</b></p>
            <p>${escapeHtml(totalCarsText)}</p>
        `;
    }

    const problemText =
        formationInfo.problems.length > 0
            ? formationInfo.problems.join("／")
            : "編成情報が不完全です";

    return `
        <p><b>編成番号</b></p>
        <p>API情報不一致のため非表示</p>

        <p><b>両数</b></p>
        <p>${escapeHtml(totalCarsText)}</p>

        <div class="detail-warning">
            編成情報を検証したところ、
            ${escapeHtml(problemText)}
        </div>
    `;
}

function createStationTable(detail) {
    if (
        !Array.isArray(detail?.station_infos) ||
        detail.station_infos.length === 0
    ) {
        return "";
    }

    const stationRows =
        detail.station_infos
            .map(station => `
                <tr>
                    <td>
                        ${escapeHtml(
                            station.station_name ?? "-"
                        )}
                    </td>
                    <td>
                        ${escapeHtml(
                            station.arrival_time ?? "-"
                        )}
                    </td>
                    <td>
                        ${escapeHtml(
                            station.departure_time ?? "-"
                        )}
                    </td>
                </tr>
            `)
            .join("");

    return `
        <h3>停車駅・時刻</h3>

        <table>
            <tr>
                <th>駅名</th>
                <th>着</th>
                <th>発</th>
            </tr>
            ${stationRows}
        </table>
    `;
}

function renderTrainDetail({
    content,
    train,
    kindInfo,
    formationInfo,
    detail = null,
    warningText = ""
}) {
    const trainType =
        detail?.train_kind_name ||
        kindInfo.trainType;

    const departure =
        detail?.departure_station_name;

    const arrival =
        detail?.arrival_station_name;

    const section =
        departure && arrival
            ? `${departure} → ${arrival}`
            : kindInfo.section;

    const positionText =
        getPositionText(train);

    const delay =
        getDelayMinutes(train);

    const direction =
        train.direction === "up"
            ? "上り"
            : "下り";

    const routeName =
        formationInfo.sembokuService
            ? "泉北線系統"
            : "高野線系統";

    const warningHtml =
        warningText
            ? `
                <div class="detail-warning">
                    ${escapeHtml(warningText)}
                </div>
            `
            : "";

    const stationTable =
        createStationTable(detail);

    content.innerHTML = `
        <h2>
            🚃 ${escapeHtml(train.train_number)}列車
        </h2>

        ${warningHtml}

        <hr>

        <p><b>種別</b></p>
        <p>${escapeHtml(trainType)}</p>

        <p><b>系統判定</b></p>
        <p>${escapeHtml(routeName)}</p>

        <p><b>運転区間</b></p>
        <p>${escapeHtml(section)}</p>

        ${getFormationDetailHtml(
            formationInfo
        )}

        <p><b>扉数</b></p>
        <p>${escapeHtml(getDoorText(train))}</p>

        <p><b>遅延</b></p>
        <p>${escapeHtml(delay)}分</p>

        <p><b>方向</b></p>
        <p>${escapeHtml(direction)}</p>

        <p><b>現在位置</b></p>
        <p>${escapeHtml(positionText)}</p>

        <hr>

        ${
            stationTable ||
            `
                <p class="detail-error">
                    この列車は停車駅・時刻を取得できません。
                </p>
            `
        }
    `;
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

    const kindInfo =
        getResolvedKind(train);

    const formationInfo =
        getFormationInfo(train);

    panel.classList.add("open");

    content.innerHTML = `
        <h2>
            🚃 ${escapeHtml(train.train_number)}列車
        </h2>
        <p>列車情報を取得中...</p>
    `;

    /*
     * 回送は詳細APIが「リクエストフォーマットが不正」と
     * 返すことが多いため、位置APIの情報だけで表示する。
     */
    if (/回送/.test(kindInfo.trainType)) {
        renderTrainDetail({
            content,
            train,
            kindInfo,
            formationInfo,
            warningText:
                "回送列車のため、列車位置データから表示しています。"
        });
        return;
    }

    try {
        const detail =
            await getTrainDetail(
                train.train_number
            );

        renderTrainDetail({
            content,
            train,
            kindInfo,
            formationInfo,
            detail
        });

    } catch (error) {
        console.warn(
            `${train.train_number}列車の詳細取得失敗:`,
            error
        );

        renderTrainDetail({
            content,
            train,
            kindInfo,
            formationInfo,
            warningText:
                "詳細APIから情報を取得できなかったため、列車位置データから表示しています。"
        });
    }
}
