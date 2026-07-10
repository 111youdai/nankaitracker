async function getTrainData() {
    const response = await fetch("https://external-data.nankaiapp.com/tid/trains.json");
    return await response.json();
}

async function getLineData() {
    const response = await fetch("https://external-data.nankaiapp.com/line/lines.json");
    return await response.json();
}
async function getTrainDetail(trainNumber) {
    const baseTime = window.koyaBaseTime || "00:00:00";

    const url =
        `http://localhost:3000/api/train` +
        `?train_number=${encodeURIComponent(trainNumber)}` +
        `&dia_kind=2` +
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
            data.error_message || "列車詳細を取得できませんでした"
        );
    }

    return data;
}