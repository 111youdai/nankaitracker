import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../../map-data.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const map = await import(moduleUrl);

test("主要駅と全路線の地図座標を生成する", () => {
    assert.deepEqual(map.getStationCoordinate(1), [34.663, 135.501]);
    assert.deepEqual(map.getStationCoordinate(109), map.getStationCoordinate(151));
    assert.ok(map.getStationCoordinate(118));
    assert.ok(map.getStationCoordinate(94));
    assert.equal(map.mapRoutes.length, 8);
});

test("駅間を走る列車は両駅の中点へ置く", () => {
    const current = map.getStationCoordinate(28);
    const next = map.getStationCoordinate(76);
    const position = map.getTrainCoordinate({ station_id: 28, next_station_id: 76 });
    assert.equal(position[0], (current[0] + next[0]) / 2);
    assert.equal(position[1], (current[1] + next[1]) / 2);
});

test("地図投影は表示領域内へ収まる", () => {
    const point = map.projectCoordinate(map.getStationCoordinate(95));
    assert.ok(point.x > 0 && point.x < 1000);
    assert.ok(point.y > 0 && point.y < 760);
});
