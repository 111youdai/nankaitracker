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

async function getTrainDetail(trainNumber) {
    const baseTime =
        window.koyaBaseTime || "00:00:00";

    const diaKind =
        window.koyaDiaKind || 2;

    const url =
        `https://nankaitracker.onrender.com/api/train` +
        `?train_number=${encodeURIComponent(trainNumber)}` +
        `&dia_kind=${encodeURIComponent(diaKind)}` +
        `&interface_no=1` +
        `&base_time=${encodeURIComponent(baseTime)}`;

    console.log(
        "diaKind=",
        diaKind,
        "baseTime=",
        baseTime
    );

    console.log("詳細APIリクエスト", {
        trainNumber,
        diaKind,
        baseTime,
        url
    });

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