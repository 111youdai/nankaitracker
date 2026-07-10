import {
  TRAIN_KINDS,
  NANKAI_TRAIN_KINDS,
  KOYA_TRAIN_KINDS
} from "./constants.js";

/**
 * 列車番号から運行上の種別・区間を取得する
 *
 * lineId
 * 1 = 南海線
 * 2 = 高野線
 */
export function getTrainKindByNumber(lineId, trainNumber) {
  const number = String(trainNumber ?? "").trim();

  if (!number) {
    return null;
  }

  // 3415 → 34、2750 → 27
  const kindNumber =
    number.length >= 4
      ? number.substring(0, 2)
      : number.padStart(2, "0").substring(0, 2);

  const key = `${lineId}${kindNumber}`;

  return TRAIN_KINDS[key] ?? null;
}

/**
 * APIのtrain_kind_idから表示用種別を取得する
 */
export function getTrainKindById(lineId, trainKindId) {
  if (trainKindId === undefined || trainKindId === null) {
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
  const byId = getTrainKindById(lineId, trainKindId);
  const byNumber = getTrainKindByNumber(lineId, trainNumber);

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