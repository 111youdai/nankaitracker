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
        `https://nankaitracker.onrender.com/api/train` +
        `?train_number=${encodeURIComponent(trainNumber)}` +
        `&dia_kind=${numericLineId}` +
        `&interface_no=1` +
        `&base_time=${encodeURIComponent(baseTime)}`;

    const response = await fetch(url);
    const data = await response.json();

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
