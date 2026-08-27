import {
    TRAIN_KINDS,
    NANKAI_TRAIN_KINDS,
    KOYA_TRAIN_KINDS
} from "./constants.js";

const SEMBOKU_STATION_IDS =
    new Set([151, 152, 153, 154, 155, 156]);

function toPositiveIntegers(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .map(value => Number(value))
        .filter(value =>
            Number.isFinite(value) &&
            value > 0
        );
}

export function getTrainKindByNumber(
    lineId,
    trainNumber
) {
    const number =
        String(trainNumber ?? "").trim();

    if (!number) {
        return null;
    }

    const kindNumber =
        number.length >= 4
            ? number.substring(0, 2)
            : number
                .padStart(2, "0")
                .substring(0, 2);

    const key =
        `${Number(lineId)}${kindNumber}`;

    return TRAIN_KINDS[key] ?? null;
}

export function getTrainKindById(
    lineId,
    trainKindId
) {
    if (
        trainKindId === undefined ||
        trainKindId === null
    ) {
        return null;
    }

    const id = String(trainKindId);

    if (Number(lineId) === 1) {
        return NANKAI_TRAIN_KINDS[id] ?? null;
    }

    if (Number(lineId) === 2) {
        return KOYA_TRAIN_KINDS[id] ?? null;
    }

    return null;
}

export function resolveTrainKind({
    lineId,
    trainNumber,
    trainKindId
}) {
    const byId =
        getTrainKindById(
            lineId,
            trainKindId
        );

    const byNumber =
        getTrainKindByNumber(
            lineId,
            trainNumber
        );

    return {
        trainType:
            byId?.train_type ||
            byNumber?.train_type ||
            "種別不明",

        section:
            byNumber?.section ||
            byId?.section ||
            "運転区間不明",

        kind:
            byId?.kind ||
            byNumber?.kind ||
            "",

        imageName:
            byId?.image_name ||
            byNumber?.image_name ||
            "",

        source: {
            byId,
            byNumber
        }
    };
}

function textContainsSemboku(text) {
    return /泉北|和泉中央|光明池|中百舌鳥|各停Ｅ|区間急行Ｅ|準急Ｅ|泉北ライナー/i
        .test(String(text ?? ""));
}

function textExplicitlyMeansNonSemboku(text) {
    return /こうや|りんかん|天空|極楽橋|橋本|河内長野|三日市町|林間田園都市|金剛|北野田|堺東/i
        .test(String(text ?? ""));
}

/**
 * 高野線データの列車が泉北系統かを判定する。
 *
 * 列車番号から判定できる運転区間を最優先にする。
 * これにより、APIの位置駅IDだけが誤って泉北側になった列車を
 * そのまま泉北線へ描画しにくくする。
 */
export function isSembokuService(train) {
    if (!train || Number(train.line_id) !== 2) {
        return false;
    }

    const byNumber =
        getTrainKindByNumber(
            2,
            train.train_number
        );

    if (byNumber?.section) {
        if (
            textContainsSemboku(
                `${byNumber.train_type} ${byNumber.section} ${byNumber.kind}`
            )
        ) {
            return true;
        }

        if (
            textExplicitlyMeansNonSemboku(
                `${byNumber.train_type} ${byNumber.section} ${byNumber.kind}`
            )
        ) {
            return false;
        }
    }

    const byId =
        getTrainKindById(
            2,
            train.train_kind_id
        );

    const byIdText =
        `${byId?.train_type || ""} ${byId?.section || ""} ${byId?.kind || ""}`;

    if (textContainsSemboku(byIdText)) {
        return true;
    }

    if (textExplicitlyMeansNonSemboku(byIdText)) {
        return false;
    }

    const stationIds = [
        train.station_id,
        train.next_station_id
    ]
        .map(value => Number(value))
        .filter(Number.isFinite);

    return stationIds.some(id =>
        SEMBOKU_STATION_IDS.has(id)
    );
}

export function isLimitedExpressTrain(train) {
    if (!train) {
        return false;
    }

    const kindInfo =
        resolveTrainKind({
            lineId: Number(train.line_id) || 2,
            trainNumber: train.train_number,
            trainKindId: train.train_kind_id
        });

    const kindText = [
        kindInfo.trainType,
        kindInfo.section,
        kindInfo.kind
    ].join(" ");

    return /特急|ラピート|ｻｻﾞﾝ|サザン|こうや|りんかん|泉北ライナー|天空/i
        .test(kindText);
}

/**
 * 泉北線の駅IDにいると配信された列車を、
 * 実際に泉北側へ描画してよいか判定する。
 */
export function canPlaceOnSemboku(train) {
    if (!train) {
        return false;
    }

    return isSembokuService(train);
}

/**
 * trains.json の編成情報を検証する。
 *
 * train_length_id と car_counts の合計が一致しない場合は、
 * 編成番号 car_numbers を画面へ出さない。
 */
export function analyzeTrainFormation(train) {
    const rawTotalCars =
        Number(train?.train_length_id);

    const hasTotalCars =
        Number.isFinite(rawTotalCars) &&
        rawTotalCars > 0;

    const carNumbers =
        toPositiveIntegers(
            train?.car_numbers
        );

    const carCounts =
        toPositiveIntegers(
            train?.car_counts
        );

    const carCountTotal =
        carCounts.reduce(
            (sum, count) => sum + count,
            0
        );

    const sembokuService =
        isSembokuService(train);

    const limitedExpress =
        isLimitedExpressTrain(train);

    const impossibleFourCarSemboku =
        sembokuService &&
        !limitedExpress &&
        rawTotalCars === 4;

    const totalCarsReliable =
        hasTotalCars &&
        !impossibleFourCarSemboku;

    const formationProblems = [];

    if (!hasTotalCars) {
        formationProblems.push(
            "列車全体の両数がありません"
        );
    }

    if (carNumbers.length === 0) {
        formationProblems.push(
            "編成番号がありません"
        );
    }

    if (carCounts.length === 0) {
        formationProblems.push(
            "編成ごとの両数がありません"
        );
    }

    if (
        carNumbers.length > 0 &&
        carCounts.length > 0 &&
        carNumbers.length !== carCounts.length
    ) {
        formationProblems.push(
            "編成番号と編成両数の件数が一致しません"
        );
    }

    if (
        hasTotalCars &&
        carCounts.length > 0 &&
        carCountTotal !== rawTotalCars
    ) {
        formationProblems.push(
            `列車全体${rawTotalCars}両に対して編成情報は${carCountTotal}両です`
        );
    }

    if (impossibleFourCarSemboku) {
        formationProblems.push(
            "特急以外の泉北線列車が4両として配信されています"
        );
    }

    const formationReliable =
        formationProblems.length === 0;

    const formationText =
        formationReliable
            ? carNumbers
                .map(number => `${number}F`)
                .join(" + ")
            : "";

    return {
        rawTotalCars:
            hasTotalCars
                ? rawTotalCars
                : null,

        totalCars:
            totalCarsReliable
                ? rawTotalCars
                : null,

        totalCarsReliable,
        formationReliable,
        formationText,
        carNumbers,
        carCounts,
        carCountTotal,
        sembokuService,
        limitedExpress,
        problems: formationProblems
    };
}
