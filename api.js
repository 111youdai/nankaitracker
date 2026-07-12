async function getTrainData() {
    const response = await fetch(
        "https://external-data.nankaiapp.com/tid/trains.json"
    );
    return await response.json();
}

async function getLineData() {
    const response = await fetch(
        "https://external-data.nankaiapp.com/line/lines.json"
    );
    return await response.json();
}

aasync function getTrainDetail(trainNumber) {
    const baseTime =
        window.koyaBaseTime || "00:00:00";

    const url =
        `https://nankaitracker.onrender.com/api/train` +
        `?train_number=${encodeURIComponent(trainNumber)}` +
        `&dia_kind=2` +
        `&interface_no=1` +
        `&base_time=${encodeURIComponent(baseTime)}`;

    console.log("詳細APIリクエスト", {
        trainNumber,
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