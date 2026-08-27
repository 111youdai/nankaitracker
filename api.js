const TRACKER_BACKEND =
    "https://nankaitracker.onrender.com";

const NANKAI_AUTH_STORAGE_KEY =
    "nankaiTrackerAuthToken";

function getNankaiAuthToken() {
    return (
        sessionStorage.getItem(
            NANKAI_AUTH_STORAGE_KEY
        ) || ""
    );
}

function clearNankaiAuthToken() {
    sessionStorage.removeItem(
        NANKAI_AUTH_STORAGE_KEY
    );
}

async function authenticateNankai(
    password
) {
    const response = await fetch(
        `${TRACKER_BACKEND}/api/auth/nankai`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json"
            },
            body: JSON.stringify({
                password
            })
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok || !data.token) {
        clearNankaiAuthToken();

        throw new Error(
            data.error ||
            "認証に失敗しました"
        );
    }

    sessionStorage.setItem(
        NANKAI_AUTH_STORAGE_KEY,
        data.token
    );

    return true;
}

async function verifyNankaiAuth() {
    const token =
        getNankaiAuthToken();

    if (!token) {
        return false;
    }

    try {
        const response = await fetch(
            `${TRACKER_BACKEND}/api/auth/nankai/verify`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            clearNankaiAuthToken();
            return false;
        }

        const data =
            await response.json();

        if (!data.ok) {
            clearNankaiAuthToken();
            return false;
        }

        return true;

    } catch (error) {
        console.warn(
            "南海線認証確認に失敗:",
            error
        );

        return false;
    }
}

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
        `${TRACKER_BACKEND}/api/train` +
        `?train_number=${encodeURIComponent(trainNumber)}` +
        `&dia_kind=${numericLineId}` +
        `&interface_no=1` +
        `&base_time=${encodeURIComponent(baseTime)}`;

    const headers = {};

    if (numericLineId === 1) {
        const token =
            getNankaiAuthToken();

        if (token) {
            headers.Authorization =
                `Bearer ${token}`;
        }
    }

    const response =
        await fetch(url, { headers });

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (
        response.status === 401 &&
        numericLineId === 1
    ) {
        clearNankaiAuthToken();

        throw new Error(
            "南海線の閲覧認証が必要です"
        );
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

window.authenticateNankai =
    authenticateNankai;

window.verifyNankaiAuth =
    verifyNankaiAuth;

window.clearNankaiAuthToken =
    clearNankaiAuthToken;
