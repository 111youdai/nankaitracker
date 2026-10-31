const TRACKER_BACKEND =
    "https://nankaitracker.onrender.com";

const TRACKER_LOG_WORKER =
    "https://nankai-tracker-logger.youdai-tracker.workers.dev";

window.TRACKER_LOG_WORKER_URL =
    TRACKER_LOG_WORKER;

async function getTrainData() {
    const response = await fetch(
        "https://external-data.nankaiapp.com/tid/trains.json"
    );

    if (!response.ok) {
        throw new Error(
            `列車位置APIエラー: ${response.status}`
        );
    }

    return await response.json();
}

async function getLineData() {
    const response = await fetch(
        "https://external-data.nankaiapp.com/line/lines.json"
    );

    if (!response.ok) {
        throw new Error(
            `路線APIエラー: ${response.status}`
        );
    }

    return await response.json();
}

async function getLiveFormationData() {
    const response = await fetch(
        `${TRACKER_LOG_WORKER}/api/live-formations`
    );

    if (!response.ok) {
        throw new Error(
            `運用Hub編成照合エラー: ${response.status}`
        );
    }

    return await response.json();
}

async function getLiveIrregularData() {
    const response = await fetch(
        `${TRACKER_LOG_WORKER}/api/live-irregular`
    );

    if (!response.ok) {
        throw new Error(
            `定期外列車照合エラー: ${response.status}`
        );
    }

    return await response.json();
}

async function getTrainDetail(
    trainNumber,
    lineId = window.activeLineId || 2
) {
    const numericLineId =
        Number(lineId) === 1 ? 1 : 2;

    const baseTime =
        numericLineId === 1
            ? (
                window.nankaiBaseTime ||
                window.koyaBaseTime ||
                "00:00:00"
            )
            : (
                window.koyaBaseTime ||
                window.nankaiBaseTime ||
                "00:00:00"
            );

    const url =
        `${TRACKER_BACKEND}/api/train` +
        `?train_number=${encodeURIComponent(trainNumber)}` +
        `&dia_kind=${numericLineId}` +
        `&interface_no=1` +
        `&base_time=${encodeURIComponent(baseTime)}`;

    const response = await fetch(url);

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }


    if (!response.ok) {
        throw new Error(
            data.error_message ||
            data.error ||
            `HTTPエラー ${response.status}`
        );
    }

    if (data.result === "NG") {
        throw new Error(
            data.error_message ||
            "この列車の時刻情報は取得できません"
        );
    }

    return data;
}

