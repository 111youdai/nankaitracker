import test from "node:test";
import assert from "node:assert/strict";

import {
    TENHAMA_STATIONS,
    TENHAMA_TRIPS,
    getActiveTenhamaTrains
} from "../../tenhama.mjs";

test("天竜浜名湖線の39駅と81列車を収録している", () => {
    assert.equal(TENHAMA_STATIONS.length, 39);
    assert.equal(Object.keys(TENHAMA_TRIPS).length, 81);
    assert.equal(TENHAMA_STATIONS[0].name_ja, "掛川");
    assert.equal(TENHAMA_STATIONS.at(-1).name_ja, "新所原");
});

test("公式予定から503列車の特別車両を照合する", () => {
    const at = new Date("2026-11-02T21:10:00.000Z");
    const train = getActiveTenhamaTrains(at)
        .find(item => item.trainNumber === "503");

    assert.ok(train);
    assert.equal(train.vehicleId, "TH2105");
    assert.match(train.vehicleName, /うなぴっぴごー/);
    assert.equal(train.origin.name_ja, "金指");
    assert.equal(train.destination.name_ja, "新所原");
});

test("深夜帯は在線列車を表示しない", () => {
    const at = new Date("2026-11-02T17:00:00.000Z");
    assert.equal(getActiveTenhamaTrains(at).length, 0);
});

test("全列車の推定時刻が進行方向に単調増加する", () => {
    for (const [trainNumber, trip] of Object.entries(TENHAMA_TRIPS)) {
        const times = trip.s.map(([, minute]) => minute);
        const stationIndexes = trip.s.map(([stationIndex]) => stationIndex);

        assert.deepEqual(
            times,
            [...times].sort((a, b) => a - b),
            `${trainNumber}列車の時刻順`
        );

        assert.deepEqual(
            stationIndexes,
            [...stationIndexes].sort((a, b) =>
                trip.d === "down" ? a - b : b - a
            ),
            `${trainNumber}列車の駅順`
        );
    }
});
