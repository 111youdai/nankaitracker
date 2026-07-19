import {
    TRAIN_KINDS,
    NANKAI_TRAIN_KINDS,
    KOYA_TRAIN_KINDS
} from "./constants.js";

/*
 * 高野線API内の泉北線駅ID。
 * 151は中百舌鳥、152～156は深井～和泉中央。
 */
const SEMBOKU_STATION_IDS =
    new Set([151, 152, 153, 154, 155, 156]);

/*
 * 2026年3月改正時点で、列車番号から泉北系統を補助判定する接頭辞。
 * 現在位置・行先・種別情報を先に使い、これは最後の補助判定だけに使う。
 */
const SEMBOKU_TRAIN_PREFIXES =
    new Set(["32", "41", "57"]);

/*
 * trains.jsonで和泉中央として使われている行先駅ID。
 */
const SEMBOKU_DESTINATION_IDS =
    new Set([66]);

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

function getTrainNumberPrefix(trainNumber) {
    const number =
        String(trainNumber ?? "").trim();

    return number.length >= 2
        ? number.substring(0, 2)
        : number.padStart(2, "0");
}

/**
 * 列車番号から運行上の種別・区間を取得する
 *
 * lineId
 * 1 = 南海線
 * 2 = 高野線
 */
export function getTrainKindByNumber(
    lineId,
    trainNumber
) {
    const number =
        String(trainNumber ?? "").trim();

    if (!number) {
        return null;
    }

    // 3415 → 34、2750 → 27
    const kindNumber =
        number.length >= 4
            ? number.substring(0, 2)
            : number
                .padStart(2, "0")
                .substring(0, 2);

    const key =
        `${lineId}${kindNumber}`;

    return TRAIN_KINDS[key] ?? null;
}

/**
 * APIのtrain_kind_idから表示用種別を取得する
 */
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

    const id =
        String(trainKindId);

    if (Number(lineId) === 1) {
        return NANKAI_TRAIN_KINDS[id] ?? null;
    }

    if (Number(lineId) === 2) {
        return KOYA_TRAIN_KINDS[id] ?? null;
    }

    return null;
}

/**
 * API情報と列車番号情報を合成する
 *
 * 種別名:
 *   train_kind_idを優先
 *
 * 運転区間:
 *   列車番号のTRAIN_KINDSを優先
 */
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

/**
 * 泉北線系統の列車かを判定する。
 *
 * 優先順位:
 * 1. 現在駅・次駅
 * 2. 行先駅
 * 3. 種別・運転区間の文字
 * 4. 列車番号の接頭辞
 */
export function isSembokuService(train) {
    if (!train) {
        return false;
    }

    const stationIds = [
        train.station_id,
        train.next_station_id
    ]
        .map(value => Number(value))
        .filter(Number.isFinite);

    if (
        stationIds.some(id =>
            SEMBOKU_STATION_IDS.has(id)
        )
    ) {
        return true;
    }

    const destinationStationId =
        Number(train.destination_station_id);

    if (
        SEMBOKU_DESTINATION_IDS.has(
            destinationStationId
        )
    ) {
        return true;
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

    if (
        /泉北|和泉中央|中百舌鳥|各停Ｅ|区間急行Ｅ|準急Ｅ|泉北ライナー/i
            .test(kindText)
    ) {
        return true;
    }

    return SEMBOKU_TRAIN_PREFIXES.has(
        getTrainNumberPrefix(
            train.train_number
        )
    );
}

/**
 * 特急系の列車かを判定する。
 * 泉北ライナー・こうや・りんかんを含む。
 */
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

    return /特急|こうや|りんかん|泉北ライナー/i
        .test(kindText);
}

/**
 * trains.jsonの両数・編成番号を検証する。
 *
 * APIではまれに、
 * train_length_id = 8
 * car_counts = [6, 0, 0, 0]
 * car_numbers = [6312, 0, 0, 0]
 * のように、列車全体の両数と編成情報が一致しないことがある。
 *
 * その場合、列車全体の両数は表示するが、
 * 誤った編成番号は画面へ出さない。
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

    /*
     * 通常の泉北線列車は6両または8両。
     * ユーザー確認済みの運用条件により、
     * 特急以外の4両表示は不整合として扱う。
     */
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
