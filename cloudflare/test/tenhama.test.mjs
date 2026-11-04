import test from "node:test";
import assert from "node:assert/strict";

import {
    TENHAMA_STATIONS,
    TENHAMA_TRIPS,
    getActiveTenhamaTrains,
    getTenhamaFleetGroups,
    getTenhamaVehicleIcon
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

test("全車両に判別用の正面アイコンを生成する", () => {
    const icons = [];
    for (const vehicleId of [
        "THG101", "TH2101", "TH2102", "TH2103", "TH2104",
        "TH2105", "TH2107", "TH2108", "TH2109", "TH2110",
        "TH2111", "TH2112", "TH2113", "TH2114", "TH9200"
    ]) {
        const icon = getTenhamaVehicleIcon(vehicleId);
        assert.match(icon, /<svg/);
        assert.match(icon, /viewBox="0 0 \d+ \d+"/);
        assert.match(icon, new RegExp(vehicleId));
        icons.push(icon);
    }
    assert.equal(new Set(icons).size, 15, "15車両すべてを個別の塗装で描き分ける");
    assert.match(getTenhamaVehicleIcon("THG101"), /data-model="thg100"/);
    assert.match(getTenhamaVehicleIcon("THG101"), /viewBox="0 0 100 112"/);
    assert.match(getTenhamaVehicleIcon("THG101"), />THG101<\/text>/);
    assert.doesNotMatch(getTenhamaVehicleIcon("THG101"), /c18 8 23-3/);
});

test("天浜線の編成表を3形式15両で構成する", () => {
    const groups = getTenhamaFleetGroups();
    const vehicles = groups.flatMap(group => group.vehicles);

    assert.deepEqual(groups.map(group => group.label), ["TH2100形", "TH9200形", "THG100形"]);
    assert.equal(groups[0].vehicles.length, 13);
    assert.equal(vehicles.length, 15);
    assert.equal(new Set(vehicles.map(vehicle => vehicle.vehicleId)).size, 15);
    assert.ok(vehicles.some(vehicle => vehicle.vehicleId === "THG101"));
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
