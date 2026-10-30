function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showUpdateTime(
    trainData,
    mode = window.activeLineMode || "koya"
) {
    const updateTime =
        document.getElementById(
            "updateTime"
        );

    if (!updateTime) {
        return;
    }

    const isNankai =
        mode === "nankai";

    const date =
        isNankai
            ? (
                trainData.nankai_update_date ||
                trainData.koya_update_date ||
                ""
            )
            : (
                trainData.koya_update_date ||
                trainData.nankai_update_date ||
                ""
            );

    const time =
        isNankai
            ? (
                trainData.nankai_update_time ||
                trainData.koya_update_time ||
                ""
            )
            : (
                trainData.koya_update_time ||
                trainData.nankai_update_time ||
                ""
            );

    updateTime.textContent =
        `${date} ${time}`.trim() ||
        "更新時刻不明";
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

    const rawNumber =
        String(
            station.eki_number ?? ""
        ).trim();

    if (!rawNumber) {
        return "";
    }

    return rawNumber
        .toUpperCase()
        .startsWith("NK")
            ? rawNumber
            : `NK${rawNumber}`;
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

    const stationNumber =
        getStationNumber(station);

    stationElement.innerHTML = `
        <div class="up-track"></div>

        <div class="station-center">
            <div class="track"></div>

            <div class="station-name">
                ${escapeHtml(station.name_ja)}
            </div>

            <div class="station-number">
                ${escapeHtml(stationNumber)}
            </div>
        </div>

        <div class="down-track"></div>
    `;

    return stationElement;
}

function createRouteSection(label, stations, subtitle = "") {
    const section = document.createElement("section");
    section.className = "route-section";

    const header = document.createElement("header");
    header.className = "route-section-header";

    const heading = document.createElement("h3");
    heading.textContent = label;
    const note = document.createElement("span");
    note.textContent = subtitle || `${stations.length}駅`;
    header.append(heading, note);
    section.append(header);

    for (const station of stations) {
        section.appendChild(createStationElement(station));
    }

    return section;
}

function showRouteStations(routeConfig) {
    const lineElement =
        document.getElementById("line");

    if (!lineElement) {
        console.error(
            "路線表示要素#lineが見つかりません"
        );
        return;
    }

    lineElement.innerHTML = "";

    lineElement.appendChild(createRouteSection(
        routeConfig.mode === "nankai" ? "南海本線" : "高野線",
        routeConfig.mainStations,
        "上り・下りを縦に表示"
    ));

    for (
        const branch of
        routeConfig.branches
    ) {
        if (!branch.stations.length) {
            continue;
        }

        const junction = routeConfig.mainStations.find(
            station => Number(station.id) === Number(branch.junctionId)
        );
        lineElement.appendChild(createRouteSection(
            branch.label || "支線",
            branch.stations,
            junction?.name_ja ? `${junction.name_ja}から分岐` : "支線"
        ));
    }
}

function getResolvedKind(train) {
    try {
        if (
            typeof window.resolveTrainKind ===
            "function"
        ) {
            return window.resolveTrainKind({
                lineId:
                    Number(train.line_id) ||
                    window.activeLineId ||
                    2,

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
        return window
            .analyzeTrainFormation(train);
    }

    const totalCars =
        Number(train.train_length_id) ||
        null;

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

function normalizePlacementStationId(
    stationId,
    aliases
) {
    const rawId =
        String(stationId);

    return String(
        aliases?.[rawId] ??
        aliases?.[Number(rawId)] ??
        rawId
    );
}

function canRenderAtRawStation(
    train,
    rawStationId,
    mode
) {
    const stationId =
        Number(rawStationId);

    if (
        mode === "koya" &&
        stationId >= 151 &&
        stationId <= 156 &&
        typeof window.canPlaceOnSemboku ===
            "function"
    ) {
        const allowed =
            window.canPlaceOnSemboku(train);

        if (!allowed) {
            console.warn(
                "泉北線への誤配置を抑止",
                train.train_number,
                stationId
            );
        }

        return allowed;
    }

    return true;
}

function showTrains(
    trainData,
    stationIds,
    options = {}
) {
    const visibleStationIds =
        new Set(
            stationIds.map(id =>
                String(id)
            )
        );

    const expectedLineId =
        Number(options.lineId) ||
        window.activeLineId ||
        2;

    const mode =
        options.mode ||
        window.activeLineMode ||
        "koya";

    const aliases =
        options.placementAliases || {};

    let renderedCount = 0;

    for (const train of trainData.trains || []) {
        if (
            Number(train.line_id) !==
            expectedLineId
        ) {
            continue;
        }

        const currentStationId =
            String(train.station_id);

        const nextStationId =
            train.next_station_id == null
                ? null
                : String(
                    train.next_station_id
                );

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
            continue;
        }

        let rawPlacementStationId =
            currentIsVisible
                ? currentStationId
                : nextStationId;

        if (
            !canRenderAtRawStation(
                train,
                rawPlacementStationId,
                mode
            )
        ) {
            continue;
        }

        const placementStationId =
            normalizePlacementStationId(
                rawPlacementStationId,
                aliases
            );

        const stationElement =
            document.getElementById(
                `station-${placementStationId}`
            );

        if (!stationElement) {
            console.warn(
                "列車を置く駅が見つかりません",
                train.train_number,
                rawPlacementStationId,
                placementStationId
            );
            continue;
        }

        const target =
            train.direction === "up"
                ? stationElement
                    .querySelector(
                        ".up-track"
                    )
                : stationElement
                    .querySelector(
                        ".down-track"
                    );

        if (!target) {
            continue;
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

        trainElement.dataset.trainNumber =
            String(train.train_number || "");
        trainElement.dataset.formation =
            String(formationInfo.formationText || "");
        trainElement.tabIndex = 0;
        trainElement.setAttribute("role", "button");
        trainElement.setAttribute(
            "aria-label",
            `${train.train_number}列車の詳細を開く`
        );
        trainElement.onkeydown = event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail(train);
            }
        };

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
            trainElement.dataset
                .formationWarning =
                    formationInfo.problems
                        .join(" / ");

            trainElement.title =
                formationInfo.problems
                    .join("\n");
        }

        target.appendChild(
            trainElement
        );
        renderedCount += 1;
    }

    const countElement = document.getElementById("visibleTrainCount");
    if (countElement) {
        countElement.textContent = `${renderedCount}列車を表示中`;
    }
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
            <p>
                ${escapeHtml(
                    formationInfo.formationText
                )}
            </p>

            <p><b>両数</b></p>
            <p>${escapeHtml(totalCarsText)}</p>
        `;
    }

    const problemText =
        formationInfo.problems.length > 0
            ? formationInfo.problems
                .join("／")
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
        !Array.isArray(
            detail?.station_infos
        ) ||
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

function getRouteName(
    train,
    formationInfo
) {
    if (Number(train.line_id) === 1) {
        return "南海線系統";
    }

    return formationInfo.sembokuService
        ? "泉北線系統"
        : "高野線系統";
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
        getRouteName(
            train,
            formationInfo
        );

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

    const closeDetail = () => {
        panel.classList.remove("open");
        document.body.classList.remove("detail-open");
    };

    if (closeButton) closeButton.onclick = closeDetail;

    const kindInfo =
        getResolvedKind(train);

    const formationInfo =
        getFormationInfo(train);

    panel.classList.add("open");
    document.body.classList.add("detail-open");

    content.innerHTML = `
        <h2>
            🚃 ${escapeHtml(train.train_number)}列車
        </h2>
        <p>列車情報を取得中...</p>
    `;

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
                train.train_number,
                Number(train.line_id) ||
                window.activeLineId ||
                2
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

window.openTrainDetail = openDetail;
window.closeTrainDetail = () => {
    document.getElementById("detailPanel")?.classList.remove("open");
    document.body.classList.remove("detail-open");
};
