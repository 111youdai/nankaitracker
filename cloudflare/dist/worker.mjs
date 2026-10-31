var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// core.cjs
var require_core = __commonJS({
  "core.cjs"(exports, module) {
    "use strict";
    var GROUPS = { 1: "nankai", 2: "koya" };
    var IGNORED_TRAIN_KEYS = Object.freeze(["88"]);
    function numberKey2(value) {
      const s = String(value ?? "").normalize("NFKC").trim().replace(/^回\s*/, "").toUpperCase();
      return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, "") : s;
    }
    function ignoredTrain2(value) {
      return IGNORED_TRAIN_KEYS.includes(numberKey2(value));
    }
    function serviceDate(time) {
      return new Date(new Date(time).getTime() + 5 * 36e5).toISOString().slice(0, 10);
    }
    function sourceTime(feed, group) {
      const date = String(feed[`${group}_update_date`] || "").replaceAll("/", "-");
      const time = String(feed[`${group}_update_time`] || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(time)) throw new Error(`${group}: \u914D\u4FE1\u6642\u523B\u306E\u5F62\u5F0F\u304C\u4E0D\u660E\u3067\u3059`);
      const value = /* @__PURE__ */ new Date(`${date}T${time}+09:00`);
      if (!Number.isFinite(value.getTime())) throw new Error(`${group}: \u914D\u4FE1\u6642\u523B\u304C\u4E0D\u6B63\u3067\u3059`);
      return value.toISOString();
    }
    function tableNumbers2(table) {
      if (!table || !table.operations || typeof table.operations !== "object") throw new Error("\u904B\u7528\u8868\u306E\u5F62\u5F0F\u304C\u5909\u308F\u3063\u3066\u3044\u307E\u3059");
      const numbers = /* @__PURE__ */ new Set(), branch = /* @__PURE__ */ new Set(), lines = /* @__PURE__ */ new Set();
      for (const op of Object.values(table.operations)) {
        if (!Array.isArray(op.trains)) throw new Error("\u904B\u7528\u8868\u306Etrains\u304C\u4E0D\u6B63\u3067\u3059");
        for (const t of op.trains) {
          if (typeof t.train_number !== "string") throw new Error("\u904B\u7528\u8868\u306E\u5217\u756A\u304C\u4E0D\u6B63\u3067\u3059");
          if (!t.line_id || /^[_.]/.test(t.train_number)) continue;
          const key2 = numberKey2(t.train_number);
          if (!key2) continue;
          numbers.add(key2);
          lines.add(t.line_id);
          if (t.line_id === "shiomibashisen") branch.add(key2);
        }
      }
      if (numbers.size < 50) throw new Error("\u904B\u7528\u8868\u304C\u7A7A\u307E\u305F\u306F\u4E0D\u5B8C\u5168\u3067\u3059\u3002\u5224\u5B9A\u3092\u4FDD\u7559\u3057\u307E\u3059");
      return { numbers: [...numbers], branch: [...branch], lines: [...lines] };
    }
    function formation2(t) {
      const ns = Array.isArray(t.car_numbers) ? t.car_numbers : [];
      const cs = Array.isArray(t.car_counts) ? t.car_counts : [];
      const pairs = ns.map((n, i) => [Number(n), Number(cs[i] || 0)]).filter(([n, c]) => n > 0 || c > 0);
      const total = Number(t.train_length_id);
      const valid = pairs.length > 0 && pairs.every(([n, c]) => Number.isInteger(n) && n > 0 && Number.isInteger(c) && c > 0) && pairs.reduce((sum, p) => sum + p[1], 0) === total && !cs.slice(ns.length).some((c) => Number(c) > 0);
      return { verified: valid, text: valid ? pairs.map(([n, c]) => `${n}F (${c}\u4E21)`).join(" + ") : "\u7DE8\u6210\u672A\u78BA\u8A8D", numbers: ns, counts: cs, totalCars: total || null };
    }
    var SPECIAL_TRAINS = Object.freeze({
      "8376": { category: "chiyoda-test", label: "\u5343\u4EE3\u7530\u51FA\u5834\u8A66\u904B\u8EE2\uFF08\u4E0A\u308A\uFF09", route: "\u5343\u4EE3\u7530\u51FA\u5834\u30FB\u4E0A\u308A", note: "\u5343\u4EE3\u7530\u5DE5\u5834\u51FA\u5834\u5F8C\u306E\u8A66\u904B\u8EE2\u306B\u4F7F\u308F\u308C\u308B\u5217\u756A" },
      "8679": { category: "chiyoda-test", label: "\u5343\u4EE3\u7530\u51FA\u5834\u8A66\u904B\u8EE2\uFF08\u4E0B\u308A\uFF09", route: "\u5343\u4EE3\u7530\u51FA\u5834\u30FB\u4E0B\u308A", note: "\u5343\u4EE3\u7530\u5DE5\u5834\u51FA\u5834\u5F8C\u306E\u8A66\u904B\u8EE2\u306B\u4F7F\u308F\u308C\u308B\u5217\u756A" },
      "9185": { category: "scrap-transfer", label: "\u5EC3\u8ECA\u56DE\u9001\uFF08\u5EC3\u56DE\uFF09\u30B9\u30B8", route: "\u5343\u4EE3\u7530 \u2192 \u5C0F\u539F\u7530", note: "\u5343\u4EE3\u7530\u767A\u30FB\u5C0F\u539F\u7530\u884C\u304D\u306E\u5EC3\u8ECA\u56DE\u9001\u30B9\u30B8" },
      "8680": { category: "temporary-deadhead", label: "\u81E8\u6642\u56DE\u9001\u30B9\u30B8", route: "\u5C0F\u539F\u7530 \u2192 \u5343\u4EE3\u7530", schedule: "\u5C0F\u539F\u7530 17:01\u767A \u2192 \u5343\u4EE3\u7530 17:24\u7740" },
      "8721": { category: "liner-substitute-deadhead", label: "\u6CC9\u5317\u30E9\u30A4\u30CA\u30FC\u4EE3\u8D70\u95A2\u9023\u56DE\u9001", route: "\u4F4F\u30CE\u6C5F \u2192 \u306A\u3093\u3070", schedule: "\u4F4F\u30CE\u6C5F 13:50\u767A \u2192 \u306A\u3093\u3070 14:02\u7740", note: "11000\u7CFB\u306E\u9AD8\u91CE\u7DDA\u7279\u6025\u8CB8\u51FA\u6642\u306B\u3001\u6CC9\u5317\u30E9\u30A4\u30CA\u30FC\u3092\u4EE3\u8D70\u3059\u308B\u30B5\u30B6\u30F3\u8ECA\u306E\u56DE\u9001" },
      "8722": { category: "liner-substitute-deadhead", label: "\u6CC9\u5317\u30E9\u30A4\u30CA\u30FC\u4EE3\u8D70\u95A2\u9023\u30FB\u5343\u4EE3\u7530\u56DE\u9001", route: "\u306A\u3093\u3070 \u2192 \u5343\u4EE3\u7530", schedule: "\u306A\u3093\u3070 14:14\u767A \u2192 \u5343\u4EE3\u7530 14:56\u7740", note: "11000\u7CFB\u306E\u9AD8\u91CE\u7DDA\u7279\u6025\u8CB8\u51FA\u6642\u306B\u3001\u6CC9\u5317\u30E9\u30A4\u30CA\u30FC\u3092\u4EE3\u8D70\u3059\u308B\u30B5\u30B6\u30F3\u8ECA\u306E\u56DE\u9001" },
      "8450": { category: "chiyoda-entry-feeder", label: "\u5343\u4EE3\u7530\u5165\u5834\u56DE\u9001\uFF08\u524D\u904B\u7528\uFF09", route: "\u7FBD\u5009\u5D0E\u30FB\u4F4F\u30CE\u6C5F \u2192 \u306A\u3093\u3070", note: "\u306A\u3093\u3070\u30678673\u30EC\uFF08\u5834\u5408\u306B\u3088\u308A8070\u30EC\uFF09\u3078\u5217\u756A\u3092\u5909\u3048\u3001\u5343\u4EE3\u7530\u5DE5\u5834\u307E\u3067\u7D99\u7D9A\u3059\u308B\u5165\u5834\u56DE\u9001" },
      "8673": { category: "chiyoda-entry", label: "\u5343\u4EE3\u7530\u5165\u5834\u56DE\u9001", route: "\u4F4F\u30CE\u6C5F \u2192 \u306A\u3093\u3070 \u2192 \u5343\u4EE3\u7530", schedules: { weekday: "\u4F4F\u30CE\u6C5F 10:40\u767A \u2192 \u306A\u3093\u3070 10:52\u7740\u30FB10:58\u767A \u2192 \u5343\u4EE3\u7530 11:34\u7740", weekend: "\u571F\u65E5\uFF1A\u306A\u3093\u3070 10:43\u767A \u2192 \u5343\u4EE3\u7530 11:24\u7740" }, note: "8070\u30EC\u3068\u306A\u308B\u5834\u5408\u3042\u308A" },
      "8070": { category: "chiyoda-entry", label: "\u5343\u4EE3\u7530\u5165\u5834\u56DE\u9001", route: "\u4F4F\u30CE\u6C5F \u2192 \u306A\u3093\u3070 \u2192 \u5343\u4EE3\u7530", schedules: { weekday: "\u4F4F\u30CE\u6C5F 10:40\u767A \u2192 \u306A\u3093\u3070 10:52\u7740\u30FB10:58\u767A \u2192 \u5343\u4EE3\u7530 11:34\u7740", weekend: "\u571F\u65E5\uFF1A\u306A\u3093\u3070 10:43\u767A \u2192 \u5343\u4EE3\u7530 11:24\u7740" }, note: "8673\u30EC\u3068\u306A\u308B\u5834\u5408\u3042\u308A" }
    });
    function specialService2(value, day = "") {
      const trainKey = numberKey2(value), base = SPECIAL_TRAINS[trainKey];
      if (!base) return null;
      const result = { ...base, trainKey };
      if (base.schedules) {
        const dow = /^\d{4}-\d{2}-\d{2}$/.test(day) ? (/* @__PURE__ */ new Date(`${day}T00:00:00Z`)).getUTCDay() : -1;
        result.schedule = base.schedules[dow === 0 || dow === 6 ? "weekend" : "weekday"];
        delete result.schedules;
      }
      return result;
    }
    module.exports = { GROUPS, IGNORED_TRAIN_KEYS, numberKey: numberKey2, ignoredTrain: ignoredTrain2, serviceDate, sourceTime, tableNumbers: tableNumbers2, formation: formation2, specialService: specialService2 };
  }
});

// fleet.cjs
var require_fleet = __commonJS({
  "fleet.cjs"(exports, module) {
    "use strict";
    var core3 = require_core();
    var STATUS_WORDS = /入場|留置|休止|離脱|工場|検車区|廃車|転属|運用中/;
    var GROUP_LABELS = Object.freeze({ nankai: "\u5357\u6D77\u7DDA\u7CFB\u7D71", koya: "\u9AD8\u91CE\u7DDA\u30FB\u6CC9\u5317\u7DDA\u7CFB\u7D71" });
    function statusKind(text = "") {
      if (/廃車|転属|編成解除/.test(text)) return "transfer";
      if (/出場/.test(text)) return "out";
      if (/入場|工場/.test(text)) return "works";
      if (/休止|留置|離脱/.test(text)) return "inactive";
      return "check";
    }
    function category(item) {
      const number = Number(String(item.formation || "").replace(/\D/g, ""));
      if (number >= 1e4 || /天空|特急/.test(`${item.status || ""} ${item.hubStatus || ""}`)) return "\u7279\u6025\u8ECA\u30FB\u305D\u306E\u4ED6";
      if ([6, 4, 2].includes(Number(item.cars))) return `${item.cars}\u4E21\uFF08\u56FA\u5B9A\uFF09`;
      return item.cars ? `${item.cars}\u4E21\u30FB\u305D\u306E\u4ED6` : "\u4E21\u6570\u672A\u78BA\u8A8D";
    }
    function buildHubFleet2(overviewsByGroup, formationsByGroup, fetchedAt) {
      const byFormation = /* @__PURE__ */ new Map();
      for (const group of ["nankai", "koya"]) {
        const overviews = overviewsByGroup[group] || {}, formations = formationsByGroup[group]?.formations || {};
        for (const [formation2, overview] of Object.entries(overviews)) {
          const caption = String(overview?.caption || "").trim(), unavailable = Number(overview?.unavailable) === 1;
          if (!unavailable && !STATUS_WORDS.test(caption)) continue;
          const detail = formations[formation2] || {}, status = caption || "\u904B\u7528\u96E2\u8131\u4E2D", sourceUrl = `https://unyohub.2pd.jp/railroad_${group}/formations/${encodeURIComponent(formation2)}/`;
          let item = byFormation.get(formation2);
          if (!item) {
            item = { formation: formation2, cars: Array.isArray(detail.cars) ? detail.cars.length : null, seriesName: detail.series_name || null, groups: [], hubEntries: [] };
            byFormation.set(formation2, item);
          }
          if (!item.cars && Array.isArray(detail.cars)) item.cars = detail.cars.length;
          if (!item.seriesName && detail.series_name) item.seriesName = detail.series_name;
          item.groups.push(group);
          item.hubEntries.push({ group, groupLabel: GROUP_LABELS[group], status, unavailable, sourceUrl });
        }
      }
      return { fetchedAt, items: [...byFormation.values()] };
    }
    function cleanPlace2(text = "") {
      return String(text).replace(/（(?:停車中|走行中)）/g, "").trim();
    }
    function formationParts(formation2) {
      if (!formation2?.verified) return [];
      return (formation2.numbers || []).map((n, index) => ({ formation: `${Number(n)}F`, cars: Number(formation2.counts?.[index] || 0) })).filter((x) => /^\d+F$/.test(x.formation) && x.formation !== "0F" && x.cars > 0);
    }
    function logKind(event) {
      const special = event.special || core3.specialService(event.trainNumber, event.serviceDate);
      if (special?.category === "chiyoda-entry" || event.lastPosition?.text === "\u5343\u4EE3\u7530\u5DE5\u5834") return "entry";
      if (special?.category === "chiyoda-test" || event.firstPosition?.text === "\u5343\u4EE3\u7530\u5DE5\u5834") return "exit";
      if (special?.category === "scrap-transfer") return "transfer";
      if (special) return "special";
      return "generic";
    }
    function evidenceLabel(event) {
      const route = [cleanPlace2(event.firstPosition?.text), cleanPlace2(event.lastPosition?.text)].filter(Boolean).join(" \u2192 ");
      return `${event.serviceDate} ${event.trainNumber}\u30EC${route ? ` \uFF08${route}\uFF09` : ""}`;
    }
    function inferLogStatus(events) {
      const ordered = [...events].sort((a, b) => String(a.lastSeen).localeCompare(String(b.lastSeen))), latest = ordered.at(-1);
      const movements = ordered.filter((e) => logKind(e) !== "generic"), movement = movements.at(-1), kind = movement ? logKind(movement) : "generic";
      if (kind === "entry") return { text: `\u5343\u4EE3\u7530\u5DE5\u5834\u3078\u306E\u5165\u5834\u3092${movement.trainNumber}\u30EC\u3067\u78BA\u8A8D`, kind: "works", strong: true, updatedAt: movement.lastSeen };
      if (kind === "exit") {
        const later = String(latest.lastSeen) > String(movement.lastSeen) ? `\u3002\u6700\u65B0\u306F${latest.trainNumber}\u30EC\u30FB${cleanPlace2(latest.lastPosition?.text)}\u307E\u3067\u78BA\u8A8D` : `\u3002\u6700\u7D42\u306F${cleanPlace2(movement.lastPosition?.text)}\u307E\u3067\u78BA\u8A8D`;
        return { text: `\u5343\u4EE3\u7530\u5DE5\u5834\u304B\u3089\u306E\u51FA\u5834\u3092${movement.trainNumber}\u30EC\u3067\u78BA\u8A8D${later}`, kind: "out", strong: true, updatedAt: latest.lastSeen };
      }
      if (kind === "transfer") return { text: `${movement.special?.label || "\u5EC3\u8ECA\u56DE\u9001"}\u3092${movement.trainNumber}\u30EC\u3067\u78BA\u8A8D`, kind: "transfer", strong: true, updatedAt: movement.lastSeen };
      if (kind === "special") return { text: `${movement.special.label}\u3092${movement.trainNumber}\u30EC\u3067\u78BA\u8A8D`, kind: statusKind(movement.special.label), strong: true, updatedAt: movement.lastSeen };
      return { text: `\u5B9A\u671F\u5916\u5019\u88DC ${latest.trainNumber}\u30EC\u3067${cleanPlace2(latest.lastPosition?.text) || "\u6700\u7D42\u4F4D\u7F6E\u4E0D\u660E"}\u307E\u3067\u78BA\u8A8D`, kind: "check", strong: false, updatedAt: latest.lastSeen };
    }
    function mergeFleetStatus2(snapshot = { items: [] }, events = []) {
      const table = /* @__PURE__ */ new Map();
      for (const hub2 of snapshot.items || []) {
        const hubStatus = hub2.hubEntries.map((x) => x.status).filter((v, i, a) => a.indexOf(v) === i).join(" \uFF0F ");
        table.set(hub2.formation, { ...hub2, hubStatus, status: hubStatus, kind: statusKind(hubStatus), source: "hub", updatedAt: snapshot.fetchedAt, evidence: hub2.hubEntries.map((x) => ({ source: "hub", label: `${x.groupLabel}\uFF1A${x.status}`, url: x.sourceUrl })) });
      }
      const logMap = /* @__PURE__ */ new Map();
      for (const event of events) {
        for (const part of formationParts(event.formation)) {
          if (!logMap.has(part.formation)) logMap.set(part.formation, []);
          logMap.get(part.formation).push({ ...event, cars: part.cars });
        }
      }
      for (const [formation2, formationEvents] of logMap) {
        const inferred = inferLogStatus(formationEvents), latest = [...formationEvents].sort((a, b) => String(a.lastSeen).localeCompare(String(b.lastSeen))).at(-1), existing = table.get(formation2);
        const logEvidence = [...formationEvents].sort((a, b) => String(b.lastSeen).localeCompare(String(a.lastSeen))).slice(0, 8).map((e) => ({ source: "log", label: evidenceLabel(e), eventId: e.id, trainNumber: e.trainNumber, serviceDate: e.serviceDate, groupName: e.groupName }));
        const useInference = inferred.strong || !existing;
        table.set(formation2, { ...existing || { formation: formation2, groups: [latest.groupName], hubEntries: [], hubStatus: null, evidence: [] }, cars: existing?.cars || latest.cars, status: useInference ? inferred.text : existing.status, kind: useInference ? inferred.kind : existing.kind, source: useInference ? "log" : "hub", updatedAt: useInference ? inferred.updatedAt : existing.updatedAt, evidence: [...logEvidence, ...existing?.evidence || []] });
      }
      return { fetchedAt: snapshot.fetchedAt || null, items: [...table.values()].map((item) => ({ ...item, category: category(item) })).sort((a, b) => a.category.localeCompare(b.category, "ja") || a.formation.localeCompare(b.formation, "ja", { numeric: true })) };
    }
    module.exports = { STATUS_WORDS, statusKind, category, buildHubFleet: buildHubFleet2, mergeFleetStatus: mergeFleetStatus2, formationParts, inferLogStatus };
  }
});

// stations.cjs
var require_stations = __commonJS({
  "stations.cjs"(exports, module) {
    "use strict";
    var STATION_NAMES = Object.freeze({
      1: "\u306A\u3093\u3070",
      2: "\u65B0\u4ECA\u5BAE",
      3: "\u5929\u4E0B\u8336\u5C4B",
      4: "\u5CB8\u91CC\u7389\u51FA",
      5: "\u7C89\u6D5C",
      6: "\u4F4F\u5409\u5927\u793E",
      7: "\u4F4F\u30CE\u6C5F",
      8: "\u4E03\u9053",
      9: "\u583A",
      10: "\u6E4A",
      11: "\u77F3\u6D25\u5DDD",
      12: "\u8ACF\u8A2A\u30CE\u68EE",
      13: "\u6D5C\u5BFA\u516C\u5712",
      14: "\u7FBD\u8863",
      15: "\u9AD8\u77F3",
      16: "\u5317\u52A9\u677E",
      17: "\u677E\u30CE\u6D5C",
      18: "\u6CC9\u5927\u6D25",
      19: "\u5FE0\u5CA1",
      20: "\u6625\u6728",
      21: "\u548C\u6CC9\u5927\u5BAE",
      22: "\u5CB8\u548C\u7530",
      23: "\u86F8\u5730\u8535",
      24: "\u8C9D\u585A",
      25: "\u4E8C\u8272\u6D5C",
      26: "\u9DB4\u539F",
      27: "\u4E95\u539F\u91CC",
      28: "\u6CC9\u4F50\u91CE",
      29: "\u7FBD\u5009\u5D0E",
      30: "\u5409\u898B\u30CE\u91CC",
      31: "\u5CA1\u7530\u6D66",
      32: "\u6A3D\u4E95",
      33: "\u5C3E\u5D0E",
      34: "\u9CE5\u53D6\u30CE\u8358",
      35: "\u7BB1\u4F5C",
      36: "\u6DE1\u8F2A",
      37: "\u307F\u3055\u304D\u516C\u5712",
      38: "\u5B5D\u5B50",
      39: "\u548C\u6B4C\u5C71\u5927\u5B66\u524D",
      40: "\u7D00\u30CE\u5DDD",
      41: "\u548C\u6B4C\u5C71\u5E02",
      42: "\u548C\u6B4C\u5C71\u6E2F",
      61: "\u7FBD\u8863",
      62: "\u4F3D\u7F85\u6A4B",
      63: "\u9AD8\u5E2B\u6D5C",
      75: "\u6CC9\u4F50\u91CE",
      76: "\u308A\u3093\u304F\u3046\u30BF\u30A6\u30F3",
      77: "\u95A2\u897F\u7A7A\u6E2F",
      81: "\u591A\u5948\u5DDD",
      82: "\u6DF1\u65E5\u6E2F",
      83: "\u6DF1\u65E5\u753A",
      84: "\u307F\u3055\u304D\u516C\u5712",
      87: "\u7D00\u30CE\u5DDD",
      88: "\u6771\u677E\u6C5F",
      89: "\u4E2D\u677E\u6C5F",
      90: "\u516B\u5E61\u524D",
      91: "\u897F\u30CE\u5E84",
      92: "\u4E8C\u91CC\u30B1\u6D5C",
      93: "\u78EF\u30CE\u6D66",
      94: "\u52A0\u592A",
      95: "\u306A\u3093\u3070",
      96: "\u4ECA\u5BAE\u620E",
      97: "\u65B0\u4ECA\u5BAE",
      98: "\u8429\u30CE\u8336\u5C4B",
      99: "\u5929\u4E0B\u8336\u5C4B",
      100: "\u5CB8\u91CC\u7389\u51FA",
      101: "\u5E1D\u585A\u5C71",
      102: "\u4F4F\u5409\u6771",
      103: "\u6CA2\u30CE\u753A",
      104: "\u6211\u5B6B\u5B50\u524D",
      105: "\u6D45\u9999\u5C71",
      106: "\u583A\u6771",
      107: "\u4E09\u56FD\u30B1\u4E18",
      108: "\u767E\u820C\u9CE5\u516B\u5E61",
      109: "\u4E2D\u767E\u820C\u9CE5",
      110: "\u767D\u9DFA",
      111: "\u521D\u829D",
      112: "\u8429\u539F\u5929\u795E",
      113: "\u5317\u91CE\u7530",
      114: "\u72ED\u5C71",
      115: "\u5927\u962A\u72ED\u5C71\u5E02",
      116: "\u91D1\u525B",
      117: "\u6EDD\u8C37",
      118: "\u5343\u4EE3\u7530",
      119: "\u6CB3\u5185\u9577\u91CE",
      120: "\u4E09\u65E5\u5E02\u753A",
      121: "\u7F8E\u52A0\u306E\u53F0",
      122: "\u5343\u65E9\u53E3",
      123: "\u5929\u898B",
      124: "\u7D00\u898B\u5CE0",
      125: "\u6797\u9593\u7530\u5712\u90FD\u5E02",
      126: "\u5FA1\u5E78\u8FBB",
      127: "\u6A4B\u672C",
      128: "\u7D00\u4F0A\u6E05\u6C34",
      129: "\u5B66\u6587\u8DEF",
      130: "\u4E5D\u5EA6\u5C71",
      131: "\u9AD8\u91CE\u4E0B",
      132: "\u4E0B\u53E4\u6CA2",
      133: "\u4E0A\u53E4\u6CA2",
      134: "\u7D00\u4F0A\u7D30\u5DDD",
      135: "\u7D00\u4F0A\u795E\u8C37",
      136: "\u6975\u697D\u6A4B",
      137: "\u6C50\u898B\u6A4B",
      138: "\u82A6\u539F\u753A",
      139: "\u6728\u6D25\u5DDD",
      140: "\u6D25\u5B88",
      141: "\u897F\u5929\u4E0B\u8336\u5C4B",
      142: "\u5CB8\u91CC\u7389\u51FA",
      151: "\u4E2D\u767E\u820C\u9CE5",
      152: "\u6DF1\u4E95",
      153: "\u6CC9\u30B1\u4E18",
      154: "\u6802\u30FB\u7F8E\u6728\u591A",
      155: "\u5149\u660E\u6C60",
      156: "\u548C\u6CC9\u4E2D\u592E"
    });
    var range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
    var ROUTES = Object.freeze([
      Object.freeze(range(1, 41)),
      Object.freeze([41, 42]),
      Object.freeze([61, 62, 63]),
      Object.freeze([75, 76, 77]),
      Object.freeze([84, 83, 82, 81]),
      Object.freeze(range(87, 94)),
      Object.freeze(range(95, 136)),
      Object.freeze(range(151, 156)),
      Object.freeze(range(137, 142))
    ]);
    var KOYA_ROUTES = Object.freeze([ROUTES[6], ROUTES[7]]);
    var MAIN_KM = Object.freeze([0, 0, 1.4, 3, 3.9, 5.1, 5.7, 6.7, 8.2, 9.8, 11.2, 12.7, 13.8, 14.8, 15.5, 17.4, 18.5, 19.5, 20.4, 22.3, 23.7, 25, 26, 26.9, 28.6, 30.4, 31.3, 32.4, 34, 36.1, 37.4, 38.8, 40.6, 43.1, 44.6, 46.6, 50.2, 51.9, 56.3, 58, 61.6, 64.2]);
    var KOYA_KM = Object.freeze([0, 0.9, 1.4, 2, 3, 3.9, 5, 5.9, 6.8, 7.4, 8.7, 10.3, 11.8, 12.7, 13.4, 14.1, 15.1, 16.6, 17.5, 19.3, 20.2, 21.8, 22.9, 24.6, 25.9, 28, 29.7, 31.3, 33.2, 34.9, 38.6, 39.9, 41.9, 44.7, 47.8, 50.4, 52.2, 54.2, 55.9, 57.6, 60.6, 63, 64.5]);
    var DISTANCE_ROUTES = Object.freeze([
      Object.freeze({ key: "nankai", name: "\u5357\u6D77\u672C\u7DDA", stations: ROUTES[0], km: Object.freeze(Object.fromEntries(ROUTES[0].map((id, index) => [id, MAIN_KM[index + 1]]))) }),
      Object.freeze({ key: "koya", name: "\u9AD8\u91CE\u7DDA", stations: ROUTES[6], km: Object.freeze(Object.fromEntries(ROUTES[6].map((id, index) => [id, KOYA_KM[index]]))) })
    ]);
    function stationName(value) {
      const id = Number(value);
      return Number.isInteger(id) ? STATION_NAMES[id] || null : null;
    }
    function stationLabel(value) {
      const name = stationName(value);
      return name ? `${name}\u99C5` : null;
    }
    function routeContaining(id, routes = ROUTES) {
      const n = Number(id);
      return routes.find((route) => route.includes(n)) || null;
    }
    function routeIndex(payload, routes = ROUTES) {
      const route = routeContaining(payload?.station_id, routes);
      return route ? { route, index: route.indexOf(Number(payload.station_id)) } : null;
    }
    function adjacentOnRoute(a, b) {
      const route = routeContaining(a);
      return !!route && route.includes(Number(b)) && Math.abs(route.indexOf(Number(a)) - route.indexOf(Number(b))) === 1;
    }
    function directionStep(direction) {
      return String(direction || "").toLowerCase() === "up" ? -1 : String(direction || "").toLowerCase() === "down" ? 1 : 0;
    }
    function sameRouteIndex(payload, route) {
      const index = route.indexOf(Number(payload?.station_id));
      return index < 0 ? null : index;
    }
    function koyaInferredSegment(payload, previous, next) {
      const found = routeIndex(payload, KOYA_ROUTES), step = directionStep(payload.direction);
      if (!found || !step) return null;
      const { route, index } = found, previousIndex = sameRouteIndex(previous, route), nextIndex = sameRouteIndex(next, route);
      let from = null, to = null;
      if (nextIndex === index + step) {
        from = index;
        to = nextIndex;
      } else if (nextIndex === index) {
        from = index - step;
        to = index;
      } else if (previousIndex === index - step) {
        from = previousIndex;
        to = index;
      } else if (previousIndex === index) {
        from = index;
        to = index + step;
      }
      if (from == null || to == null || !route[from] || !route[to]) return null;
      return `${stationLabel(route[from])}\uFF5E${stationLabel(route[to])}\u9593\uFF08\u8D70\u884C\u4E2D\uFF09`;
    }
    function nextDifferent(payloads, index, direction = 1) {
      const id = Number(payloads[index]?.station_id);
      for (let i = index + direction; i >= 0 && i < payloads.length; i += direction) {
        const candidate = payloads[i];
        if (Number(candidate?.station_id) !== id) return candidate;
      }
      return null;
    }
    function chiyodaWorks(payloads, index, { eventStart = false, eventEnd = false } = {}) {
      const payload = payloads[index], id = Number(payload?.station_id), marker = Number(payload?.next_station_id), direction = String(payload?.direction || "").toLowerCase();
      if (id !== 118 || marker !== 78) return null;
      const next = nextDifferent(payloads, index, 1), previous = nextDifferent(payloads, index, -1);
      if (eventStart && index === 0 && direction === "up" && [116, 117].includes(Number(next?.station_id))) return "\u5343\u4EE3\u7530\u5DE5\u5834";
      if (eventEnd && index === payloads.length - 1 && direction === "down" && [116, 117].includes(Number(previous?.station_id))) return "\u5343\u4EE3\u7530\u5DE5\u5834";
      return null;
    }
    function position(payload = {}, previous = null, nextPayload = null, works = null) {
      const current = stationLabel(payload.station_id), hasNext = payload.next_station_id != null && payload.next_station_id !== "";
      const next = hasNext ? stationLabel(payload.next_station_id) : null, direction = String(payload.direction || "").toLowerCase();
      const directionLabel = direction === "up" ? "\u4E0A\u308A" : direction === "down" ? "\u4E0B\u308A" : "\u65B9\u5411\u4E0D\u660E";
      let text = "\u4F4D\u7F6E\u4E0D\u660E";
      let corrected = false, correction = null;
      if (works) {
        text = works;
        corrected = true;
        correction = "chiyoda-works";
      } else if (current && hasNext && next && adjacentOnRoute(payload.station_id, payload.next_station_id)) text = `${current}\uFF5E${next}\u9593\uFF08\u8D70\u884C\u4E2D\uFF09`;
      else if (current && hasNext) {
        const inferred = Number(payload.line_id) === 2 ? koyaInferredSegment(payload, previous, nextPayload) : null;
        text = inferred || `${current}\u4ED8\u8FD1\uFF08\u8D70\u884C\u4E2D\uFF09`;
        corrected = true;
        correction = inferred ? "adjacent-stations" : "invalid-next-station";
      } else if (!current && next) text = `${next}\u624B\u524D\uFF08\u8D70\u884C\u4E2D\uFF09`;
      else if (current) text = `${current}\uFF08\u505C\u8ECA\u4E2D\uFF09`;
      return { stationId: payload.station_id ?? null, nextStationId: payload.next_station_id ?? null, current, next, running: hasNext, direction, directionLabel, text, corrected, correction };
    }
    function trajectoryPositions2(payloads = [], options = {}) {
      return payloads.map((payload, index) => position(payload, payloads[index - 1] || null, payloads[index + 1] || null, chiyodaWorks(payloads, index, options)));
    }
    function stationPosition(payload = {}) {
      return position(payload);
    }
    function observedRange(first, last) {
      const start = stationPosition(first), end = stationPosition(last);
      return { first: start, last: end, text: `\u521D\u56DE\uFF1A${start.text} \uFF0F \u6700\u7D42\uFF1A${end.text}` };
    }
    function round(value, digits = 1) {
      const scale = 10 ** digits;
      return Math.round(value * scale) / scale;
    }
    function minute(value) {
      const [hour, minutes] = String(value).split(":").map(Number);
      return hour * 60 + minutes;
    }
    function minuteLabel(value) {
      const minutes = (Math.round(value) % 1440 + 1440) % 1440;
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    }
    function interpolatePath(stationIds, km, known) {
      const distances = /* @__PURE__ */ new Map([[stationIds[0], 0]]);
      for (let index = 1; index < stationIds.length; index++) distances.set(stationIds[index], distances.get(stationIds[index - 1]) + Math.abs(km[stationIds[index]] - km[stationIds[index - 1]]));
      const anchors = Object.entries(known).map(([id, time]) => ({ id: Number(id), time: minute(time), distance: distances.get(Number(id)) })).sort((a, b) => stationIds.indexOf(a.id) - stationIds.indexOf(b.id));
      return stationIds.map((id) => {
        const exact = anchors.find((anchor) => anchor.id === id);
        if (exact) return { stationId: id, station: stationName(id), timeLabel: minuteLabel(exact.time), kind: "known" };
        const distance = distances.get(id);
        let left = null, right = null;
        for (const anchor of anchors) {
          if (anchor.distance < distance) left = anchor;
          else if (anchor.distance > distance) {
            right = anchor;
            break;
          }
        }
        if (!left || !right) return null;
        const time = left.time + (distance - left.distance) / (right.distance - left.distance) * (right.time - left.time);
        return { stationId: id, station: stationName(id), timeLabel: minuteLabel(time), kind: "estimated" };
      }).filter(Boolean);
    }
    function knownChiyodaEntry(trainNumber, serviceDate) {
      if (!["8673", "8070"].includes(String(trainNumber).normalize("NFKC").replace(/^0+/, ""))) return null;
      const dow = /^\d{4}-\d{2}-\d{2}$/.test(serviceDate) ? (/* @__PURE__ */ new Date(`${serviceDate}T00:00:00Z`)).getUTCDay() : -1, weekend = dow === 0 || dow === 6;
      if (weekend) {
        const points = interpolatePath(ROUTES[6].slice(0, 24), DISTANCE_ROUTES[1].km, { 95: "10:43", 118: "11:24" }).map((point) => ({ ...point, line: "\u9AD8\u91CE\u7DDA" }));
        return { available: true, method: "known-distance", distanceKm: 25.9, averageSpeedKmh: round(25.9 / (41 / 60)), averageIncludesStops: true, points, note: "\u65E2\u77E5\u306E\u59CB\u767A\u30FB\u7D42\u7740\u6642\u523B\u3068\u99C5\u9593\u306E\u55B6\u696D\u30AD\u30ED\u304B\u3089\u3001\u5404\u99C5\u306E\u901A\u904E\u6642\u523B\u3092\u88DC\u9593\u3057\u3066\u3044\u307E\u3059\u3002" };
      }
      const outbound = interpolatePath([7, 6, 5, 4, 3, 2, 1], DISTANCE_ROUTES[0].km, { 7: "10:40", 1: "10:52" }).map((point) => ({ ...point, line: "\u5357\u6D77\u672C\u7DDA" }));
      const inbound = interpolatePath(ROUTES[6].slice(0, 24), DISTANCE_ROUTES[1].km, { 95: "10:58", 99: "11:04", 106: "11:12", 107: "11:14", 113: "11:20", 116: "11:22", 118: "11:34" }).map((point) => ({ ...point, line: "\u9AD8\u91CE\u7DDA" }));
      outbound[outbound.length - 1] = { ...outbound[outbound.length - 1], endTimeLabel: "10:58", note: "10:52\u7740\u30FB10:58\u767A" };
      return { available: true, method: "known-distance", distanceKm: 32.6, averageSpeedKmh: round(32.6 / (48 / 60)), averageIncludesStops: false, points: [...outbound, ...inbound.slice(1)], note: "\u65E2\u77E5\u6642\u523B\u3092\u56FA\u5B9A\u3057\u3001\u305D\u306E\u9593\u306E\u5404\u99C5\u306F\u55B6\u696D\u30AD\u30ED\u6BD4\u3067\u88DC\u9593\u3057\u3066\u3044\u307E\u3059\u3002\u306A\u3093\u3070\u3067\u306E6\u5206\u9593\u306F\u5E73\u5747\u901F\u5EA6\u304B\u3089\u9664\u5916\u3057\u3066\u3044\u307E\u3059\u3002" };
    }
    function distanceRoute(id) {
      const value = Number(id);
      return DISTANCE_ROUTES.find((route) => route.stations.includes(value)) || null;
    }
    function observationCoordinate(payload) {
      const route = distanceRoute(payload?.station_id);
      if (!route) return null;
      const id = Number(payload.station_id), index = route.stations.indexOf(id), running = payload.next_station_id != null && payload.next_station_id !== "";
      let value = route.km[id];
      if (running) {
        const next = Number(payload.next_station_id), nextIndex = route.stations.indexOf(next), step = nextIndex >= 0 && Math.abs(nextIndex - index) === 1 ? nextIndex - index : directionStep(payload.direction), adjacent = route.stations[index + step];
        if (adjacent != null) value = (value + route.km[adjacent]) / 2;
      }
      return { route, id, index, km: value, running };
    }
    function observedTimeline(rows = []) {
      const raw = rows.map((row) => {
        const coordinate = observationCoordinate(row.payload), time = Date.parse(row.source_time);
        return coordinate && Number.isFinite(time) ? { ...coordinate, time, payload: row.payload } : null;
      }).filter(Boolean).sort((a, b) => a.time - b.time);
      if (raw.length < 2) return null;
      const counts = /* @__PURE__ */ new Map();
      for (const item of raw) counts.set(item.route.key, (counts.get(item.route.key) || 0) + 1);
      const route = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0], same = raw.filter((item) => item.route.key === route);
      if (same.length < 2) return null;
      const first = same[0], candidate = same.find((item) => Math.abs(item.km - first.km) >= 0.2);
      if (!candidate) return null;
      const direction = Math.sign(candidate.km - first.km), anchors = [];
      for (const item of same) {
        const previous = anchors.at(-1);
        if (!previous || direction * (item.km - previous.km) >= -0.25) anchors.push(item);
      }
      const last = anchors.at(-1), distance = Math.abs(last.km - first.km), hours = (last.time - first.time) / 36e5;
      if (distance < 0.2 || hours <= 0) return null;
      const speed = distance / hours;
      if (speed > 160) return null;
      const progress = (item) => direction * item.km, low = Math.min(first.km, last.km), high = Math.max(first.km, last.km), stationIds = first.route.stations.filter((id) => first.route.km[id] >= low - 0.01 && first.route.km[id] <= high + 0.01);
      if (direction < 0) stationIds.reverse();
      const points = stationIds.map((id) => {
        const observed = anchors.filter((item) => !item.running && item.id === id);
        if (observed.length) return { stationId: id, station: stationName(id), time: new Date(observed[0].time).toISOString(), endTime: observed.length > 1 ? new Date(observed.at(-1).time).toISOString() : null, kind: "observed", line: first.route.name };
        const target = direction * first.route.km[id];
        let left = null, right = null;
        for (const anchor of anchors) {
          const value = progress(anchor);
          if (value <= target) left = anchor;
          if (value >= target) {
            right = anchor;
            break;
          }
        }
        if (!left || !right || progress(right) - progress(left) < 0.01) return null;
        const ratio = (target - progress(left)) / (progress(right) - progress(left)), time = left.time + ratio * (right.time - left.time);
        return { stationId: id, station: stationName(id), time: new Date(time).toISOString(), kind: "estimated", line: first.route.name };
      }).filter(Boolean);
      return { available: true, method: "observations-distance", distanceKm: round(distance), averageSpeedKmh: round(speed), averageIncludesStops: true, points, note: "\u4FDD\u5B58\u3057\u305F\u5728\u7DDA\u6642\u523B\u3092\u56FA\u5B9A\u70B9\u3068\u3057\u3066\u3001\u99C5\u9593\u306E\u55B6\u696D\u30AD\u30ED\u304B\u3089\u901A\u904E\u6642\u523B\u3092\u88DC\u9593\u3057\u3066\u3044\u307E\u3059\u3002\u5E73\u5747\u901F\u5EA6\u306F\u505C\u8ECA\u6642\u9593\u3092\u542B\u3080\u8A18\u9332\u533A\u9593\u306E\u5024\u3067\u3059\u3002" };
    }
    function buildTimeline2(rows = [], options = {}) {
      return knownChiyodaEntry(options.trainNumber, options.serviceDate) || observedTimeline(rows);
    }
    module.exports = { STATION_NAMES, ROUTES, DISTANCE_ROUTES, stationName, stationLabel, stationPosition, trajectoryPositions: trajectoryPositions2, observedRange, buildTimeline: buildTimeline2 };
  }
});

// data.mjs
var import_core = __toESM(require_core(), 1);
var import_fleet = __toESM(require_fleet(), 1);
var { tableNumbers, numberKey, ignoredTrain, formation } = import_core.default;
var { buildHubFleet } = import_fleet.default;
var read = async (db, key2) => {
  const r = await db.prepare("SELECT value FROM meta WHERE key=?").bind(key2).first();
  return r ? JSON.parse(r.value) : null;
};
var put = (db, key2, v) => db.prepare("INSERT OR REPLACE INTO meta VALUES (?,?)").bind(key2, JSON.stringify(v));
async function requestJson(url, options = {}) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(2e4) });
  if (!r.ok) throw Error(`\u53D6\u5F97\u5931\u6557 HTTP ${r.status}`);
  const text = await r.text();
  if (text.length > 3e6) throw Error("\u53D6\u5F97\u30C7\u30FC\u30BF\u304C\u4E0A\u9650\u3092\u8D85\u3048\u307E\u3057\u305F");
  return JSON.parse(text);
}
async function hub(endpoint, p) {
  return requestJson("https://unyohub.2pd.jp/api/" + endpoint + ".php", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...p, last_modified_timestamp: "0" }) });
}
async function refreshFleet(db, now, request = hub) {
  const [nankaiOverviews, nankaiFormations, koyaOverviews, koyaFormations] = await Promise.all([
    request("formation_overviews", { railroad_id: "nankai" }),
    request("formations", { railroad_id: "nankai" }),
    request("formation_overviews", { railroad_id: "koya" }),
    request("formations", { railroad_id: "koya" })
  ]);
  for (const [group, overviews, formations] of [["nankai", nankaiOverviews, nankaiFormations], ["koya", koyaOverviews, koyaFormations]]) {
    if (!overviews || typeof overviews !== "object" || Array.isArray(overviews)) throw Error(`${group}: \u7DE8\u6210\u6982\u8981\u304C\u4E0D\u6B63\u3067\u3059`);
    if (!formations?.formations || typeof formations.formations !== "object") throw Error(`${group}: \u7DE8\u6210\u8868\u304C\u4E0D\u6B63\u3067\u3059`);
  }
  const snapshot = buildHubFleet({ nankai: nankaiOverviews, koya: koyaOverviews }, { nankai: nankaiFormations, koya: koyaFormations }, now.toISOString());
  await put(db, "fleet-status", snapshot).run();
  return snapshot;
}
function holidaySet(year) {
  const days = /* @__PURE__ */ new Set(["01-01", "02-11", "02-23", "04-29", "05-03", "05-04", "05-05", "08-11", "11-03", "11-23"]);
  const vernal = Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
  const autumnal = Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
  days.add(`03-${String(vernal).padStart(2, "0")}`);
  days.add(`09-${String(autumnal).padStart(2, "0")}`);
  for (const [month, nth] of [[1, 2], [7, 3], [9, 3], [10, 2]]) {
    const first = new Date(Date.UTC(year, month - 1, 1, 12));
    const offset = (8 - first.getUTCDay()) % 7;
    days.add(`${String(month).padStart(2, "0")}-${String(1 + offset + 7 * (nth - 1)).padStart(2, "0")}`);
  }
  const originals = [...days];
  for (const day of originals) {
    const date = /* @__PURE__ */ new Date(`${year}-${day}T12:00:00Z`);
    if (date.getUTCDay() !== 0) continue;
    do
      date.setUTCDate(date.getUTCDate() + 1);
    while (days.has(date.toISOString().slice(5, 10)));
    if (date.getUTCFullYear() === year) days.add(date.toISOString().slice(5, 10));
  }
  for (let month = 1; month <= 12; month++) for (let date = 2; date <= 30; date++) {
    const current = new Date(Date.UTC(year, month - 1, date, 12));
    if (current.getUTCMonth() !== month - 1) continue;
    const currentKey = current.toISOString().slice(5, 10), previous = new Date(current), next = new Date(current);
    previous.setUTCDate(date - 1);
    next.setUTCDate(date + 1);
    if (!days.has(currentKey) && days.has(previous.toISOString().slice(5, 10)) && days.has(next.toISOString().slice(5, 10))) days.add(currentKey);
  }
  return days;
}
function diagramForDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error("\u904B\u884C\u65E5\u304C\u4E0D\u6B63\u3067\u3059");
  const date = /* @__PURE__ */ new Date(`${day}T12:00:00Z`), dow = date.getUTCDay();
  return dow === 0 || dow === 6 || holidaySet(date.getUTCFullYear()).has(day.slice(5)) ? "holiday" : "weekday";
}
function liveFormationMap(table, operations, group) {
  if (!table?.operations || typeof table.operations !== "object" || !operations || typeof operations !== "object" || Array.isArray(operations)) throw Error(`${group}: \u904B\u7528Hub\u306E\u5F53\u65E5\u904B\u7528\u30C7\u30FC\u30BF\u304C\u4E0D\u6B63\u3067\u3059`);
  const items = {};
  for (const [operationNumber, post] of Object.entries(operations)) {
    const formation2 = String(post?.formations || "").normalize("NFKC").trim();
    if (!formation2 || Number(post?.posts_count || 0) < 1) continue;
    const trains = table.operations[operationNumber]?.trains;
    if (!Array.isArray(trains)) continue;
    for (const train of trains) {
      const raw = String(train?.train_number || "");
      if (!train?.line_id || /^[_.]/.test(raw)) continue;
      const trainNumber = numberKey(raw);
      if (!trainNumber) continue;
      items[trainNumber] = { formation: formation2, source: "unyohub", group, operationNumber, postsCount: Number(post.posts_count) };
    }
  }
  return items;
}
async function refreshLiveFormations(db, now, request = hub) {
  const day = import_core.default.serviceDate(now), cacheKey = `live-formations:${day}`, cached = await read(db, cacheKey);
  if (cached && Number.isFinite(Date.parse(cached.fetchedAt)) && now - Date.parse(cached.fetchedAt) < 12e4) return cached;
  const diagram = diagramForDay(day), groups = await Promise.all(["nankai", "koya"].map(async (group) => {
    const revisions = await request("diagram_revisions", { railroad_id: group });
    if (!Array.isArray(revisions)) throw Error(`${group}: \u30C0\u30A4\u30E4\u6539\u6B63\u4E00\u89A7\u304C\u4E0D\u6B63\u3067\u3059`);
    const revision = revisions.filter((value) => value <= day).sort().at(-1);
    if (!revision) throw Error(`${group}: \u5BFE\u8C61\u30C0\u30A4\u30E4\u304C\u3042\u308A\u307E\u305B\u3093`);
    const [table, operations] = await Promise.all([
      request("operation_table", { railroad_id: group, diagram_revision: revision, diagram_id: diagram }),
      request("operation_data", { railroad_id: group, date: day })
    ]);
    return { group, items: liveFormationMap(table, operations, group) };
  }));
  const items = {};
  for (const result of groups) for (const [trainNumber, item] of Object.entries(result.items)) items[`${result.group}:${trainNumber}`] = item;
  const snapshot = { serviceDate: day, diagram, fetchedAt: now.toISOString(), items };
  await put(db, cacheKey, snapshot).run();
  return snapshot;
}
async function refresh(db, now, request = hub) {
  const group = ["nankai", "nankai", "koya", "koya"][Math.floor(now.getTime() / 9e5) % 4];
  const diagram = ["weekday", "holiday", "weekday", "holiday"][Math.floor(now.getTime() / 9e5) % 4];
  const revisions = await request("diagram_revisions", { railroad_id: group });
  if (!Array.isArray(revisions) || !revisions.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))) throw Error("\u30C0\u30A4\u30E4\u6539\u6B63\u4E00\u89A7\u304C\u4E0D\u6B63\u3067\u3059");
  await put(db, "revisions:" + group, { revisions, checkedAt: now.toISOString() }).run();
  const revision = revisions.filter((r) => r <= import_core.default.serviceDate(now)).sort().at(-1);
  if (!revision) throw Error("\u5BFE\u8C61\u30C0\u30A4\u30E4\u304C\u3042\u308A\u307E\u305B\u3093");
  const parsed = tableNumbers(await request("operation_table", { railroad_id: group, diagram_revision: revision, diagram_id: diagram }));
  const expected = group === "nankai" ? ["honsen", "kukosen", "shiomibashisen", "takashinohamasen", "tanagawasen", "kadasen", "wakayamakosen"] : ["koyasen", "sembokusen"];
  if (expected.some((x) => !parsed.lines.includes(x))) throw Error("\u904B\u7528\u8868\u306B\u5FC5\u8981\u306A\u652F\u7DDA\u304C\u3042\u308A\u307E\u305B\u3093");
  await db.prepare("INSERT OR REPLACE INTO baselines VALUES (?,?,?,?,?)").bind(group, diagram, revision, now.toISOString(), JSON.stringify(parsed)).run();
  await put(db, "refresh", { lastSuccess: now.toISOString(), error: null, group, diagram, revision }).run();
}
async function baseline(db, day, now) {
  const manifests = await db.prepare("SELECT key,value FROM meta WHERE key IN ('revisions:nankai','revisions:koya')").all();
  const ms = Object.fromEntries(manifests.results.map((r) => [r.key, JSON.parse(r.value)]));
  const rev = {};
  for (const group of ["nankai", "koya"]) {
    const m = ms["revisions:" + group];
    if (!m || now - new Date(m.checkedAt) > 72e5) throw Error("\u30C0\u30A4\u30E4\u6539\u6B63\u60C5\u5831\u306E\u66F4\u65B0\u5F85\u3061\u3067\u3059");
    rev[group] = m.revisions.filter((x) => x <= day).sort().at(-1);
    if (!rev[group]) throw Error("\u5BFE\u8C61\u65E5\u306E\u904B\u7528\u8868\u304C\u3042\u308A\u307E\u305B\u3093");
  }
  const rows = (await db.prepare("SELECT * FROM baselines WHERE (group_name=? AND revision=?) OR (group_name=? AND revision=?)").bind("nankai", rev.nankai, "koya", rev.koya).all()).results;
  if (rows.length !== 4) throw Error("\u901A\u5E38\u30C0\u30A4\u30E44\u8868\u306E\u6E96\u5099\u5F85\u3061\u3067\u3059");
  const sets = { nankai: /* @__PURE__ */ new Set(), koya: /* @__PURE__ */ new Set() }, sources = [];
  for (const row of rows) {
    if (day === import_core.default.serviceDate(now) && now - new Date(row.fetched_at) > 72e5) throw Error("\u904B\u7528\u8868\u306E\u66F4\u65B0\u5F85\u3061\u3067\u3059");
    const p = JSON.parse(row.payload);
    for (const n of p.numbers) sets[row.group_name].add(n);
    for (const n of p.branch) sets.koya.add(n);
    sources.push({ group: row.group_name, diagram: row.diagram, revision: row.revision, fetchedAt: row.fetched_at, url: `https://unyohub.2pd.jp/railroad_${row.group_name}/operation_table/${row.revision}/${row.diagram}/` });
  }
  return { numbers: sets, sources, date: day, fetchedAt: sources.map((s) => s.fetchedAt).sort()[0] };
}
async function classify(db, row, b, maxCandidates = 10) {
  const p = JSON.parse(row.payload), remaining = [], statements = [];
  let count = 0;
  for (const t of p.trains) {
    const key2 = numberKey(t.train_number);
    if (!key2 || ignoredTrain(key2) || b.numbers[row.group_name].has(key2)) continue;
    if (count++ >= maxCandidates) {
      remaining.push(t);
      continue;
    }
    const raw = JSON.stringify(t), form = JSON.stringify(formation(t));
    statements.push(db.prepare(`INSERT INTO events(service_date,group_name,train_key,train_number,first_seen,last_seen,formation,baseline,last_payload) VALUES (?,?,?,?,?,?,?,?,?)
  ON CONFLICT(service_date,group_name,train_key) DO UPDATE SET
   first_seen=MIN(events.first_seen,excluded.first_seen),last_seen=MAX(events.last_seen,excluded.last_seen),
   formation=CASE WHEN (excluded.last_seen>=events.last_seen AND json_extract(excluded.formation,'$.verified')=1) OR json_extract(events.formation,'$.verified')=0 THEN excluded.formation ELSE events.formation END,
   last_payload=CASE WHEN excluded.last_seen>=events.last_seen THEN excluded.last_payload ELSE events.last_payload END`).bind(row.service_date, row.group_name, key2, String(t.train_number), row.source_time, row.source_time, form, JSON.stringify(b.sources), raw));
    statements.push(db.prepare(`INSERT OR IGNORE INTO observations(event_id,source_time,observed_at,payload) SELECT id,?,?,? FROM events WHERE service_date=? AND group_name=? AND train_key=?`).bind(row.source_time, p.observedAt, raw, row.service_date, row.group_name, key2));
  }
  statements.push(remaining.length ? db.prepare("UPDATE pending SET payload=? WHERE id=?").bind(JSON.stringify({ ...p, trains: remaining }), row.id) : db.prepare("DELETE FROM pending WHERE id=?").bind(row.id));
  await db.batch(statements);
  return { saved: Math.min(count, maxCandidates), remaining: remaining.length };
}
async function poll(db, now, request = requestJson) {
  const previous = await read(db, "monitor");
  const status = { baseline: previous?.baseline || null, lastPoll: now.toISOString(), lastSuccess: null, feedError: null, baselineError: null, groups: {}, intervalSeconds: 60 };
  try {
    const feed = await request("https://external-data.nankaiapp.com/tid/trains.json");
    if (!Array.isArray(feed.trains) || feed.trains.length > 1e3) throw Error("\u5217\u8ECA\u4E00\u89A7\u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
    const stmts = [];
    for (const [id, group] of Object.entries(import_core.default.GROUPS)) {
      try {
        const time = import_core.default.sourceTime(feed, group), age = now - new Date(time);
        if (age > 3e5 || age < -6e4) throw Error("\u914D\u4FE1\u6642\u523B\u304C\u53E4\u3044\u304B\u4E0D\u6B63\u3067\u3059");
        const trains = feed.trains.filter((t) => Number(t.line_id) === Number(id));
        if (trains.some((t) => !["string", "number"].includes(typeof t.train_number))) throw Error("\u5217\u756A\u304C\u4E0D\u6B63\u3067\u3059");
        stmts.push(db.prepare(`INSERT OR IGNORE INTO pending(group_name,source_time,service_date,payload) SELECT ?,?,?,? WHERE ? > COALESCE((SELECT json_extract(value,'$') FROM meta WHERE key=?),'')`).bind(group, time, import_core.default.serviceDate(time), JSON.stringify({ observedAt: now.toISOString(), trains }), time, "last-source:" + group));
        stmts.push(db.prepare(`INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=MAX(meta.value,excluded.value)`).bind("last-source:" + group, JSON.stringify(time)));
        status.groups[group] = { sourceTime: time, trainCount: trains.length, error: null };
      } catch (e) {
        status.groups[group] = { error: e.message };
      }
    }
    if (stmts.length) await db.batch(stmts);
    status.lastSuccess = now.toISOString();
  } catch (e) {
    status.feedError = e.message;
  }
  let budget = 10;
  const pending = (await db.prepare("SELECT * FROM pending ORDER BY source_time,id LIMIT 6").all()).results;
  const cache = /* @__PURE__ */ new Map();
  for (const row of pending) {
    if (budget <= 0) break;
    try {
      if (!cache.has(row.service_date)) cache.set(row.service_date, await baseline(db, row.service_date, now));
      const b = cache.get(row.service_date), result = await classify(db, row, b, budget);
      budget -= result.saved;
      status.baseline = { date: b.date, fetchedAt: b.fetchedAt, sources: b.sources };
    } catch (e) {
      status.baselineError = e.message;
    }
  }
  await put(db, "monitor", status).run();
  return status;
}

// auth.mjs
var enc = new TextEncoder();
var b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
var un64 = (s) => Uint8Array.from(atob(s.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
async function key(password) {
  return crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function issue(password) {
  const p = b64(enc.encode(JSON.stringify({ scope: "cloudflare-logs-v1", exp: Date.now() + 432e5, nonce: crypto.randomUUID() })));
  return p + "." + b64(await crypto.subtle.sign("HMAC", await key(password), enc.encode(p)));
}
async function authorized(request, password) {
  if (!password) return false;
  try {
    const m = (request.headers.get("Authorization") || "").match(/^Bearer ([\w-]+)\.([\w-]+)$/i);
    if (!m) return false;
    if (!await crypto.subtle.verify("HMAC", await key(password), un64(m[2]), enc.encode(m[1]))) return false;
    const p = JSON.parse(new TextDecoder().decode(un64(m[1])));
    return p.scope === "cloudflare-logs-v1" && Number.isFinite(p.exp) && p.exp > Date.now();
  } catch {
    return false;
  }
}
async function samePassword(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !b) return false;
  const k = await key(b), msg = enc.encode("login");
  return crypto.subtle.verify("HMAC", k, await crypto.subtle.sign("HMAC", await key(a || "\0"), msg), msg);
}

// worker.mjs
var import_core2 = __toESM(require_core(), 1);
var import_stations = __toESM(require_stations(), 1);
var import_fleet2 = __toESM(require_fleet(), 1);
var { specialService } = import_core2.default;
var { trajectoryPositions, buildTimeline } = import_stations.default;
var { mergeFleetStatus } = import_fleet2.default;
var json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json;charset=UTF-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
var publicJson = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json;charset=UTF-8", "Cache-Control": "public, max-age=60", "Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff" } });
var DEPOT_NAMES = Object.freeze({ "\u7FBD\u5009\u5D0E": "\u7FBD\u5009\u5D0E\u691C\u8ECA\u533A", "\u4F4F\u30CE\u6C5F": "\u4F4F\u30CE\u6C5F\u691C\u8ECA\u533A", "\u5343\u4EE3\u7530": "\u5343\u4EE3\u7530\u5DE5\u5834", "\u5C0F\u539F\u7530": "\u5C0F\u539F\u7530\u691C\u8ECA\u533A" });
function cleanPlace(position) {
  let text = String(position?.text || position?.current || "\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093").replace(/駅/g, "").replace(/（(?:停車中|走行中)）/g, "").replace(/\s+/g, " ").trim();
  return text.replace(/付近$/, "").trim() || "\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093";
}
function exactPlace(value) {
  return !/[～・]|間$/.test(value) && value !== "\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093";
}
function depotPlace(value) {
  return exactPlace(value) && DEPOT_NAMES[value] ? DEPOT_NAMES[value] : value;
}
function endpointPlace(value, side) {
  if (exactPlace(value)) return depotPlace(value);
  const stations2 = value.replace(/間$/, "").split("\uFF5E").map((item) => item.trim()).filter(Boolean), candidate = side === "first" ? stations2[0] : stations2.at(-1);
  return candidate && DEPOT_NAMES[candidate] ? DEPOT_NAMES[candidate] : value;
}
function specialEndpoint(special, side) {
  const route = String(special?.route || "").split("\u2192").map((value2) => value2.trim()).filter(Boolean), value = side === "first" ? route[0] : route.at(-1);
  return value && exactPlace(value) ? depotPlace(value) : null;
}
function displayRange(firstPosition, lastPosition, special) {
  let first = endpointPlace(cleanPlace(firstPosition), "first"), last = endpointPlace(cleanPlace(lastPosition), "last");
  const knownFirst = specialEndpoint(special, "first"), knownLast = specialEndpoint(special, "last");
  if (special?.category === "chiyoda-entry-feeder") {
    const observed = cleanPlace(firstPosition);
    if (observed.includes("\u7FBD\u5009\u5D0E")) first = DEPOT_NAMES["\u7FBD\u5009\u5D0E"];
    else if (observed.includes("\u4F4F\u30CE\u6C5F")) first = DEPOT_NAMES["\u4F4F\u30CE\u6C5F"];
  }
  if (knownFirst && special?.category !== "chiyoda-entry") first = knownFirst;
  if (knownLast) last = knownLast;
  return { first, last, text: `${first} \u2192 ${last}` };
}
function decodeEvent(e) {
  const { second_payload, previous_payload, ...event } = e, first = JSON.parse(e.first_payload || e.last_payload), second = second_payload ? JSON.parse(second_payload) : null, previous = previous_payload ? JSON.parse(previous_payload) : null, last = JSON.parse(e.last_payload);
  const firstPosition = trajectoryPositions(second ? [first, second] : [first], { eventStart: true })[0], lastPositions = trajectoryPositions(previous ? [previous, last] : [last], { eventEnd: true }), lastPosition = lastPositions.at(-1);
  const special = specialService(e.train_number, e.service_date), range = displayRange(firstPosition, lastPosition, special);
  return { ...event, formation: JSON.parse(e.formation), baseline: JSON.parse(e.baseline), first_payload: first, last_payload: last, first_position: firstPosition, last_position: lastPosition, observed_range: { first: firstPosition, last: lastPosition, text: `\u521D\u56DE\uFF1A${firstPosition.text} \uFF0F \u6700\u7D42\uFF1A${lastPosition.text}` }, display_range: range, special };
}
var eventSelect = `SELECT events.*,
 (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time,o.id LIMIT 1) AS first_payload,
 (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time,o.id LIMIT 1 OFFSET 1) AS second_payload,
 (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time DESC,o.id DESC LIMIT 1 OFFSET 1) AS previous_payload
 FROM events`;
async function handle(request, env) {
  const u = new URL(request.url), p = u.pathname, db = env.DB;
  try {
    if (p === "/api/live-formations") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "86400" } });
      if (request.method !== "GET") return publicJson({ error: "\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044\u64CD\u4F5C\u3067\u3059" }, 405);
      return publicJson(await refreshLiveFormations(db, /* @__PURE__ */ new Date()));
    }
    if (p === "/api/live-irregular") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "86400" } });
      if (request.method !== "GET") return publicJson({ error: "\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044\u64CD\u4F5C\u3067\u3059" }, 405);
      const cutoff = new Date(Date.now() - 5 * 6e4).toISOString(), rows = (await db.prepare("SELECT group_name,train_number,last_seen FROM events WHERE last_seen>=? ORDER BY last_seen DESC LIMIT 100").bind(cutoff).all()).results, items = {};
      for (const row of rows) {
        const trainKey = import_core2.default.numberKey(row.train_number), special = specialService(row.train_number);
        items[`${row.group_name}:${trainKey}`] = { trainNumber: row.train_number, label: special?.label || "\u5B9A\u671F\u5916\u5019\u88DC", category: special?.category || "candidate", lastSeen: row.last_seen };
      }
      return publicJson({ fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), items });
    }
    if (p === "/api/auth/logs" && request.method === "POST") {
      if (!env.LOG_ACCESS_PASSWORD) return json({ error: "Cloudflare\u306B\u30ED\u30B0\u7528\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u672A\u8A2D\u5B9A\u3067\u3059" }, 503);
      const body = await request.text();
      if (body.length > 1024) return json({ error: "\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u5927\u304D\u3059\u304E\u307E\u3059" }, 413);
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return json({ error: "JSON\u304C\u4E0D\u6B63\u3067\u3059" }, 400);
      }
      if (!await samePassword(data.password, env.LOG_ACCESS_PASSWORD)) return json({ error: "\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u9055\u3044\u307E\u3059" }, 401);
      return json({ ok: true, token: await issue(env.LOG_ACCESS_PASSWORD), expires_in: 43200 });
    }
    if (p === "/api/fleet-status") {
      if (!await authorized(request, env.LOG_ACCESS_PASSWORD)) return json({ error: "\u7DE8\u6210\u72B6\u6CC1\u8868\u306E\u95B2\u89A7\u306B\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u5FC5\u8981\u3067\u3059" }, 401);
      if (!["GET", "POST"].includes(request.method)) return json({ error: "\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044\u64CD\u4F5C\u3067\u3059" }, 405);
      let snapshot = await read(db, "fleet-status");
      const stale = !snapshot || !Number.isFinite(Date.parse(snapshot.fetchedAt)) || Date.now() - Date.parse(snapshot.fetchedAt) > 36e5;
      if (request.method === "POST" || stale) snapshot = await refreshFleet(db, /* @__PURE__ */ new Date());
      snapshot = snapshot || { fetchedAt: null, items: [] };
      const rows = (await db.prepare(eventSelect + " ORDER BY events.last_seen DESC,events.id DESC LIMIT 500").all()).results, events = rows.map(decodeEvent).map((e) => ({ id: e.id, serviceDate: e.service_date, groupName: e.group_name, trainNumber: e.train_number, firstSeen: e.first_seen, lastSeen: e.last_seen, formation: e.formation, firstPosition: e.first_position, lastPosition: e.last_position, special: e.special }));
      return json(mergeFleetStatus(snapshot, events));
    }
    if (p.startsWith("/api/logs")) {
      if (!await authorized(request, env.LOG_ACCESS_PASSWORD)) return json({ error: "\u30ED\u30B0\u95B2\u89A7\u306B\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u5FC5\u8981\u3067\u3059" }, 401);
      if (request.method !== "GET") return json({ error: "\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044\u64CD\u4F5C\u3067\u3059" }, 405);
      if (p === "/api/logs/status") {
        const s = await read(db, "monitor") || { intervalSeconds: 60, groups: {}, lastSuccess: null };
        s.refresh = await read(db, "refresh");
        s.pending = (await db.prepare("SELECT COUNT(*) AS n FROM pending").first()).n;
        s.healthy = !!s.baseline && !s.feedError && !s.baselineError && Date.now() - Date.parse(s.lastSuccess) < 18e4 && Object.keys(s.groups).length === 2 && Object.values(s.groups).every((g) => !g.error);
        return json(s);
      }
      if (p === "/api/logs") {
        const date = u.searchParams.get("date") || "", group = u.searchParams.get("group") || "", q = (u.searchParams.get("q") || "").slice(0, 80), before = Number(u.searchParams.get("before") || Number.MAX_SAFE_INTEGER);
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date) || group && !["nankai", "koya"].includes(group) || !Number.isSafeInteger(before) || before < 1) return json({ error: "\u691C\u7D22\u6761\u4EF6\u304C\u4E0D\u6B63\u3067\u3059" }, 400);
        const ignored = import_core2.default.IGNORED_TRAIN_KEYS;
        let sql = eventSelect + ` WHERE events.id<?${ignored.length ? ` AND events.train_key NOT IN (${ignored.map(() => "?").join(",")})` : ""}`, args = [before, ...ignored];
        if (date) {
          sql += " AND service_date=?";
          args.push(date);
        }
        if (group) {
          sql += " AND group_name=?";
          args.push(group);
        }
        if (q) {
          sql += " AND (train_number LIKE ? OR formation LIKE ? OR EXISTS(SELECT 1 FROM observations o WHERE o.event_id=events.id AND o.payload LIKE ?))";
          args.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        const rows = (await db.prepare(sql + " ORDER BY id DESC LIMIT 100").bind(...args).all()).results, items = rows.map(decodeEvent);
        return json({ items, next: items.length === 100 ? items.at(-1).id : null });
      }
      const m = p.match(/^\/api\/logs\/(\d+)\/observations$/);
      if (m) {
        const id = Number(m[1]), after = Number(u.searchParams.get("after") || 0);
        if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(after) || after < 0) return json({ error: "ID\u304C\u4E0D\u6B63\u3067\u3059" }, 400);
        const rows = (await db.prepare("SELECT * FROM observations WHERE event_id=? AND id>? ORDER BY id LIMIT 501").bind(id, after).all()).results, hasMore = rows.length > 500, page = rows.slice(0, 500), payloads = rows.map((r) => JSON.parse(r.payload)), positions = trajectoryPositions(payloads, { eventStart: after === 0, eventEnd: !hasMore });
        return json({ items: page.map((r, index) => ({ ...r, payload: payloads[index], position: positions[index] })), next: hasMore ? page.at(-1).id : null });
      }
      const timelineMatch = p.match(/^\/api\/logs\/(\d+)\/timeline$/);
      if (timelineMatch) {
        const id = Number(timelineMatch[1]);
        if (!Number.isSafeInteger(id) || id < 1) return json({ error: "ID\u304C\u4E0D\u6B63\u3067\u3059" }, 400);
        const event = await db.prepare("SELECT train_number,service_date FROM events WHERE id=?").bind(id).first();
        if (!event) return json({ error: "\u8A18\u9332\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" }, 404);
        const rows = (await db.prepare("SELECT source_time,payload FROM observations WHERE event_id=? ORDER BY source_time,id LIMIT 2000").bind(id).all()).results.map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
        return json({ timeline: buildTimeline(rows, { trainNumber: event.train_number, serviceDate: event.service_date }) });
      }
      return json({ error: "\u898B\u3064\u304B\u308A\u307E\u305B\u3093" }, 404);
    }
    if (p.startsWith("/api/")) return json({ error: "\u898B\u3064\u304B\u308A\u307E\u305B\u3093" }, 404);
    if (p === "/" || p === "/logs.html" || p === "/logs" || p === "/logs.js") {
      u.pathname = p === "/logs.js" ? "/logs.js" : "/logs.html";
      return env.ASSETS.fetch(new Request(u, request));
    }
    return json({ error: "\u898B\u3064\u304B\u308A\u307E\u305B\u3093" }, 404);
  } catch (e) {
    console.error("request failed", e.message);
    return json({ error: "\u30C7\u30FC\u30BF\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002Cloudflare\u306E\u30ED\u30B0\u3068D1\u8A2D\u5B9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044" }, 503);
  }
}
var worker_default = {
  fetch: handle,
  async scheduled(event, env) {
    const now = new Date(event.scheduledTime);
    if (event.cron === "*/15 * * * *") {
      try {
        await refresh(env.DB, now);
      } catch (e) {
        console.error("baseline refresh", e.message);
        await put(env.DB, "refresh", { error: e.message, attemptedAt: now.toISOString() }).run();
        throw e;
      }
      try {
        const snapshot = await read(env.DB, "fleet-status");
        if (!snapshot || now - Date.parse(snapshot.fetchedAt) > 36e5) await refreshFleet(env.DB, now);
      } catch (e) {
        console.error("fleet refresh", e.message);
      }
    } else {
      const minute = Math.floor(event.scheduledTime / 6e4), lease = await env.DB.prepare(`INSERT OR IGNORE INTO meta(key,value) VALUES (?,?)`).bind("lease:" + minute, JSON.stringify(now.toISOString())).run();
      if (!lease.meta.changes) return;
      try {
        await poll(env.DB, now);
      } catch (e) {
        console.error("monitor", e.message);
        await put(env.DB, "monitor", { lastPoll: now.toISOString(), lastSuccess: null, intervalSeconds: 60, groups: {}, feedError: e.message }).run();
        throw e;
      } finally {
        await env.DB.prepare("DELETE FROM meta WHERE key LIKE 'lease:%' AND key<?").bind("lease:" + (minute - 60)).run();
      }
    }
  }
};

// <stdin>
var pages = { "/logs.html": `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#071b24">
<title>\u904B\u7528\u8A18\u9332 | \u5357\u6D77\u30C8\u30E9\u30C3\u30AB\u30FC</title>
<script>if(new URLSearchParams(location.search).get('embed')==='1')document.documentElement.classList.add('embed')<\/script>
<style>
:root{color-scheme:dark;--bg:#06151d;--surface:#0b2029;--surface2:#102b35;--line:rgba(167,212,216,.16);--text:#edf7f7;--muted:#91a9af;--teal:#24c9af;--orange:#ff7836;--blue:#4dbce8;--red:#ff766e;font-family:Inter,"Noto Sans JP",system-ui,sans-serif}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;background:radial-gradient(circle at 10% 0%,rgba(24,99,107,.28),transparent 28rem),linear-gradient(150deg,#06151d,#081922 66%,#06131a);color:var(--text)}button,input,select{font:inherit}button,a{-webkit-tap-highlight-color:transparent}a{color:inherit;text-decoration:none}[hidden]{display:none!important}.app-header{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;min-height:68px;padding:10px max(20px,calc((100% - 1120px)/2));border-bottom:1px solid var(--line);background:rgba(5,20,27,.9);backdrop-filter:blur(18px)}.brand{display:flex;align-items:center;gap:10px}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(145deg,var(--teal),#158d82);color:#03211d;font-weight:1000}.brand span:last-child{display:flex;flex-direction:column}.brand small,.eyebrow{color:var(--teal);font-size:9px;font-weight:800;letter-spacing:.16em}.brand strong{font-size:15px}.home-link{padding:9px 13px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);font-size:12px}.page{width:min(1120px,calc(100% - 32px));margin:auto;padding:38px 0 60px}.hero{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-bottom:24px}.hero h1{margin:6px 0 4px;font-size:clamp(32px,5vw,58px);letter-spacing:-.05em}.hero p{max-width:680px;margin:0;color:var(--muted);line-height:1.7}.panel,article{margin-bottom:14px;padding:18px;border:1px solid var(--line);border-radius:18px;background:rgba(11,32,41,.9);box-shadow:0 18px 55px rgba(0,0,0,.12)}#loginPanel{max-width:620px;margin:46px auto}.login-copy{margin:0 0 18px}.login-copy h2{margin:4px 0 7px}.muted{color:var(--muted)}form,.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:end}label{display:flex;flex:1;min-width:150px;flex-direction:column;gap:6px;color:var(--muted);font-size:12px}input,select,button{min-height:42px;padding:9px 11px;border:1px solid #31505b;border-radius:11px;background:#071a22;color:var(--text)}input:focus,select:focus{outline:0;border-color:var(--teal);box-shadow:0 0 0 3px rgba(36,201,175,.1)}button{cursor:pointer;background:#13584f;font-weight:700}button:hover{border-color:var(--teal)}button:disabled{opacity:.5;cursor:wait}#error{min-height:24px;color:#ffc0b9}#status{border-left:4px solid #e5b858}#status.ok{border-left-color:var(--teal)}#status strong{font-size:17px}#status p{margin:8px 0}.tabs{position:sticky;top:80px;z-index:20;display:flex;width:max-content;gap:5px;margin:0 0 18px;padding:5px;border:1px solid var(--line);border-radius:16px;background:rgba(7,26,34,.92);backdrop-filter:blur(14px)}.tabs button{border:0;background:transparent;color:var(--muted)}.tabs button.active{background:var(--surface2);color:var(--text);box-shadow:0 7px 22px rgba(0,0,0,.25)}.filter-panel{padding:14px}.filter-actions{display:flex;gap:8px;flex-wrap:wrap}.secondary{background:#102b35}.danger{background:#402724}.notice{padding:0 3px;color:var(--muted);font-size:12px;line-height:1.65}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}h2{margin:0;font-size:22px}.tag,.source{display:inline-block;padding:4px 8px;border-radius:7px;background:#624b23;font-size:11px}.tag.known{background:#12604d;color:#e2fff7}.known-service{display:grid;gap:5px;margin-top:14px;padding:12px 14px;border-left:4px solid var(--teal);border-radius:9px;background:#102d2b}.known-service strong{color:#8ff0d2}.details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:16px 0}.details b{display:block;margin-top:5px;color:var(--text);font-size:14px}.history{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}.history details{padding:7px 0;border-bottom:1px solid var(--line)}pre{max-height:340px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;border-radius:9px;background:#06151d;font-size:11px}.fleet-head{margin-bottom:18px}.fleet-summary{display:flex;gap:9px;flex-wrap:wrap;margin:13px 0}.fleet-summary span{padding:6px 11px;border:1px solid var(--line);border-radius:20px;background:#071a22}.fleet-note{color:var(--muted);font-size:12px}.fleet-group{margin:22px 0}.fleet-group h2{margin:0 0 9px;font-size:18px}.table-wrap{overflow:hidden;border:1px solid var(--line);border-radius:16px}table{width:100%;border-collapse:collapse;background:rgba(11,32,41,.9)}th,td{padding:11px 12px;border-bottom:1px dashed #38515b;text-align:left;vertical-align:top}th{background:#071a22;color:#cfe0e8;font-size:12px}.fleet-number{width:48px;text-align:right;color:var(--muted)}.fleet-name{font-size:16px;font-weight:800;white-space:nowrap}.source{margin:0 5px 4px 0;background:#29424e}.source.log{background:#664e20}.fleet-row.works{background:#102c3b}.fleet-row.inactive{background:#382523}.fleet-row.out{background:#10352d}.fleet-row.transfer{background:#272d31}.fleet-row.check{background:#342f1f}.evidence{margin:0;padding-left:18px}.evidence li{margin:0 0 6px}.evidence button{min-height:0;padding:3px 7px;font-size:11px}.empty-row{text-align:center;color:var(--muted);padding:20px}.mobile-nav{display:none}
@media(max-width:700px){body{padding-bottom:82px}.app-header{min-height:62px;padding:8px 13px}.home-link{font-size:0}.home-link:after{content:"\u2302";font-size:20px}.page{width:calc(100% - 22px);padding:28px 0 24px}.hero{display:block;margin-bottom:18px}.hero h1{font-size:40px}.hero p{font-size:12px}.panel,article{padding:14px;border-radius:15px}.tabs{top:70px;width:100%}.tabs button{flex:1;font-size:12px}.details{grid-template-columns:1fr;gap:9px}.filter-actions{width:100%}.filter-actions button{flex:1}.fleet-head .top{align-items:flex-start}.table-wrap{overflow:visible;border:0}table,tbody{display:block}thead{display:none}.fleet-row{display:grid;margin-bottom:11px;padding:13px;border:1px solid var(--line);border-radius:15px}.fleet-row td{display:grid;grid-template-columns:86px minmax(0,1fr);gap:7px;width:auto;padding:8px 0;border:0}.fleet-row td:before{content:attr(data-label);color:var(--muted);font-size:10px;font-weight:700}.fleet-row .fleet-number{display:none}.empty-row{display:block}.mobile-nav{position:fixed;z-index:70;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));display:flex;justify-content:space-around;height:66px;padding:4px 7px;border:1px solid var(--line);border-radius:21px;background:rgba(7,25,33,.95);backdrop-filter:blur(18px);box-shadow:0 14px 42px rgba(0,0,0,.4)}.mobile-nav a,.mobile-nav button{min-width:60px;min-height:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2px;padding:0;border:0;background:transparent;color:#789198;font-size:9px}.mobile-nav .active{color:var(--teal)}.mobile-nav i{font-style:normal;font-size:19px}}
html.embed body{padding-bottom:0;background:transparent}html.embed .app-header,html.embed .hero,html.embed .tabs,html.embed .mobile-nav{display:none!important}html.embed .page{width:100%;padding:0 2px 24px}html.embed #loginPanel{margin:12px auto}html.embed .panel,html.embed article{box-shadow:none}
</style>
<style>
.timeline{margin:0 0 18px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#071a22}.timeline h3{margin:0 0 10px}.timeline-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.timeline-summary span{padding:5px 9px;border-radius:20px;background:#163843;color:#dff7f5;font-size:12px}.timeline-list{list-style:none;margin:0;padding:0}.timeline-list li{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 2px;border-bottom:1px dashed var(--line)}.timeline-list time{color:#b9d6dc;font-variant-numeric:tabular-nums}.timeline-kind{padding:3px 6px;border-radius:6px;background:#4b4525;color:#ffe99b}.timeline-kind.observed{background:#15594e;color:#aff5df}.timeline-kind.known{background:#244d6a;color:#bfe7ff}.timeline-note{margin:11px 0 0;color:var(--muted);font-size:11px;line-height:1.6}
.linked-card{border-color:rgba(36,201,175,.42);box-shadow:inset 4px 0 0 rgba(36,201,175,.8),0 18px 55px rgba(0,0,0,.12)}.chain-service{background:linear-gradient(110deg,#10352f,#10272f)}.segment-title{margin:20px 0 9px;padding-top:12px;border-top:1px solid var(--line);color:#a7f2df;font-size:16px}.history>.segment-title:first-child{margin-top:0;padding-top:0;border-top:0}
.observation-group{margin:10px 0;border:1px solid var(--line)!important;border-radius:12px;background:#071a22}.observation-group>summary{padding:12px 14px;color:#dff7f5;font-weight:800;cursor:pointer}.observation-list{max-height:520px;overflow:auto;padding:0 14px 10px}.observation-list details{padding-left:2px}
</style>
</head>
<body>
<header class="app-header"><a class="brand" href="https://111youdai.github.io/nankaitracker/"><span class="brand-mark">N</span><span><small>NANKAI TRACKER</small><strong>\u904B\u7528\u8A18\u9332</strong></span></a><a class="home-link" href="https://111youdai.github.io/nankaitracker/">\u30C8\u30E9\u30C3\u30AB\u30FC\u3078\u623B\u308B</a></header>
<div class="page">
<section class="hero"><div><span class="eyebrow">OPERATION RECORDS</span><h1>\u5217\u8ECA\u3068\u7DE8\u6210\u306E\u8A18\u9332</h1><p>\u901A\u5E38\u30C0\u30A4\u30E4\u306B\u306A\u3044\u5217\u8ECA\u306E\u78BA\u8A8D\u5C65\u6B74\u3068\u3001\u5343\u4EE3\u7530\u5165\u51FA\u5834\u30FB\u7559\u7F6E\u306A\u3069\u306E\u7DE8\u6210\u72B6\u6CC1\u3092\u307E\u3068\u3081\u307E\u3059\u3002</p></div></section>
<section class="panel" id="loginPanel"><div class="login-copy"><span class="eyebrow">PRIVATE RECORDS</span><h2>\u30ED\u30B0\u3092\u958B\u304F</h2><p class="muted">\u95B2\u89A7\u306B\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u5FC5\u8981\u3067\u3059\u3002</p></div><form id="login"><label>\u30ED\u30B0\u95B2\u89A7\u30D1\u30B9\u30EF\u30FC\u30C9<input id="password" type="password" required autocomplete="current-password"></label><button>\u8A8D\u8A3C\u3057\u3066\u958B\u304F</button></form></section>
<div id="error" role="alert"></div>
<main id="main" hidden>
<div class="panel" id="status" role="status">\u76E3\u8996\u72B6\u6CC1\u3092\u78BA\u8A8D\u4E2D\u2026</div>
<nav class="tabs" aria-label="\u8868\u793A\u5207\u66FF"><button id="logTab" class="active" type="button" data-log-view="log">\u5B9A\u671F\u5916\u30ED\u30B0</button><button id="fleetTab" type="button" data-log-view="fleet">\u7DE8\u6210\u72B6\u6CC1</button></nav>
<section id="logView"><div class="panel filter-panel"><form id="filters"><label>\u904B\u884C\u65E5\uFF08\u5348\u524D4\u6642\u533A\u5207\u308A\uFF09<input id="date" type="date"></label><label>\u7CFB\u7D71<select id="group"><option value="">\u3059\u3079\u3066</option><option value="nankai">\u5357\u6D77\u7DDA\u7CFB\u7D71</option><option value="koya">\u9AD8\u91CE\u7DDA\u7CFB\u7D71</option></select></label><label>\u5217\u756A\u30FB\u7DE8\u6210\u756A\u53F7<input id="query" placeholder="\u4F8B\uFF1A9474 / 2039F"></label><div class="filter-actions"><button>\u691C\u7D22\u30FB\u66F4\u65B0</button><button class="secondary" type="button" id="export">JSON\u4FDD\u5B58</button><button class="danger" type="button" id="logout">\u30ED\u30B0\u30A2\u30A6\u30C8</button></div></form></div><p class="notice">\u300C\u5B9A\u671F\u5916\u5019\u88DC\u300D\u306F\u8A66\u904B\u8EE2\u30FB\u81E8\u6642\u56DE\u9001\u306E\u78BA\u5B9A\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u904B\u7528\u8868\u306E\u672A\u53CE\u9332\u30FB\u914D\u4FE1\u8AA4\u308A\u3082\u542B\u307F\u307E\u3059\u3002</p><section id="events" aria-live="polite"></section><button id="more" hidden>\u7D9A\u304D\u3092\u8AAD\u307F\u8FBC\u3080</button></section>
<section id="fleetView" hidden><div class="panel fleet-head"><div class="top"><div><span class="eyebrow">FLEET BOARD</span><h2>\u4F11\u6B62\u30FB\u5165\u51FA\u5834\u30FB\u7559\u7F6E\u7DE8\u6210</h2><p class="muted">\u904B\u7528Hub\u306E\u8A18\u8F09\u3068\u4FDD\u5B58\u3057\u305F\u5217\u8ECA\u30ED\u30B0\u304B\u3089\u3001\u7DE8\u6210\u306E\u52D5\u304D\u3092\u307E\u3068\u3081\u3066\u3044\u307E\u3059\u3002</p></div><button id="refreshFleet" type="button">Hub\u60C5\u5831\u3092\u66F4\u65B0</button></div><div id="fleetSummary" class="fleet-summary"></div><p class="fleet-note">\u9752\uFF1A\u5DE5\u5834\u5165\u5834\u3000\u8D64\uFF1A\u4F11\u6B62\u30FB\u7559\u7F6E\u3000\u7DD1\uFF1A\u51FA\u5834\u78BA\u8A8D\u3000\u7070\uFF1A\u8EE2\u5C5E\u30FB\u5EC3\u8ECA\u7B49\u3000\u9EC4\uFF1A\u8981\u78BA\u8A8D\u3002\u30ED\u30B0\u306B\u3088\u308B\u5224\u5B9A\u306F\u300C\u63A8\u5B9A\u300D\u3067\u3059\u3002</p></div><div id="fleetTables" aria-live="polite"></div></section>
<p class="notice">\u53D6\u5F97\u5143\uFF1A<a href="https://unyohub.2pd.jp/" target="_blank" rel="noopener">\u9244\u9053\u904B\u7528Hub</a> \uFF0F \u5357\u6D77\u30A2\u30D7\u30EA\u914D\u4FE1\u30C7\u30FC\u30BF</p>
<nav class="mobile-nav" aria-label="\u4E3B\u8981\u30E1\u30CB\u30E5\u30FC"><a href="https://111youdai.github.io/nankaitracker/"><i>\u2302</i><span>\u30DB\u30FC\u30E0</span></a><button class="active" type="button" data-log-view="log"><i>!</i><span>\u30ED\u30B0</span></button><button type="button" data-log-view="fleet"><i>\u2261</i><span>\u7DE8\u6210</span></button></nav>
</main>
</div>
<script src="logs.js"><\/script>
</body>
</html>
`, "/logs.js": "'use strict';\nconst $=id=>document.getElementById(id),KEY='nankaiTrackerCloudLogToken';\nlet token=sessionStorage.getItem(KEY)||'',next=null,params=new URLSearchParams(),busy=false,fleetLoaded=false,logsLoaded=false;\nconst time=x=>x?new Date(x).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false}):'\u672A\u78BA\u8A8D';\nconst clock=x=>x?new Date(x).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}):'\u6642\u523B\u4E0D\u660E';\nfunction el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}\nasync function api(url,options={}){\n const response=await fetch(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});\n const data=await response.json();\n if(!response.ok){if(response.status===401){token='';sessionStorage.removeItem(KEY);$('loginPanel').hidden=false;$('main').hidden=true;}throw new Error(data.error||`HTTP ${response.status}`);}return data;\n}\nfunction error(e){$('error').textContent=e.message;}\nfunction timelineTime(point){const start=point.timeLabel||clock(point.time),end=point.endTimeLabel||(point.endTime?clock(point.endTime):'');return end&&end!==start?`${start}\u301C${end}`:start;}\nfunction timelineView(timeline){\n const box=el('section',undefined,'timeline');box.append(el('h3','\u63A8\u5B9A\u901A\u904E\u6642\u523B'));\n if(!timeline?.available){box.append(el('p','\u3053\u306E\u8A18\u9332\u306F\u3001\u8DDD\u96E2\u8A08\u7B97\u306B\u5FC5\u8981\u306A\u4F4D\u7F6E\u304C\u307E\u3060\u8DB3\u308A\u307E\u305B\u3093\u3002','muted'));return box;}\n const summary=el('div',undefined,'timeline-summary');summary.append(el('span',`\u8A18\u9332\u533A\u9593 ${timeline.distanceKm} km`),el('span',`\u5E73\u5747 ${timeline.averageSpeedKmh} km/h`));box.append(summary);\n const list=el('ol',undefined,'timeline-list');for(const point of timeline.points){const row=el('li'),when=el('time',timelineTime(point)),station=el('span',point.station+'\u99C5'),kind=el('small',point.kind==='observed'?'\u5B9F\u6E2C':point.kind==='known'?'\u65E2\u77E5\u6642\u523B':'\u63A8\u5B9A','timeline-kind '+point.kind);row.append(when,station,kind);if(point.note)row.title=point.note;list.append(row);}box.append(list,el('p',timeline.note,'timeline-note'));return box;\n}\nfunction showView(name){\n const fleet=name==='fleet';$('logView').hidden=fleet;$('fleetView').hidden=!fleet;\n document.querySelectorAll('[data-log-view]').forEach(button=>button.classList.toggle('active',button.dataset.logView===(fleet?'fleet':'log')));\n history.replaceState(null,'',fleet?'#fleet':'#log');\n if(fleet&&!fleetLoaded)void loadFleet();\n if(!fleet&&!logsLoaded)void load();\n}\nasync function status(){\n try{const s=await api('/api/logs/status');const box=$('status');box.className='panel'+(s.healthy?' ok':'');box.replaceChildren(el('strong',s.healthy?'\u30AF\u30E9\u30A6\u30C9\u3067\u76E3\u8996\u4E2D':'\u76E3\u8996\u30FB\u7167\u5408\u306E\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044'));\n box.append(el('p',`\u6700\u7D42\u53D6\u5F97\uFF1A${time(s.lastSuccess)} \uFF0F \u53D6\u5F97\u9593\u9694\uFF1A${s.intervalSeconds}\u79D2 \uFF0F \u7167\u5408\u5F85\u3061\uFF1A${s.pending}\u4EF6`));\n for(const [g,v] of Object.entries(s.groups))box.append(el('div',`${g==='nankai'?'\u5357\u6D77\u7DDA':'\u9AD8\u91CE\u7DDA'}\uFF1A${v.error||`\u914D\u4FE1\u6642\u523B ${time(v.sourceTime)}\u30FB${v.trainCount}\u5217\u8ECA`}`));\n if(s.refresh?.error)box.append(el('p','\u904B\u7528\u8868\u306E\u66F4\u65B0\u306B\u5931\u6557\uFF1A'+s.refresh.error,'error'));\n if(s.feedError||s.baselineError)box.append(el('p',[s.feedError,s.baselineError].filter(Boolean).join(' / '),'error'));\n if(s.baseline)box.append(el('small',`\u7167\u5408\u30C7\u30FC\u30BF\u66F4\u65B0\uFF1A${time(s.baseline.fetchedAt)}\u3002\u753B\u9762\u3092\u9589\u3058\u3066\u3082\u3001Cloudflare\u3067\u6BCE\u5206\u76E3\u8996\u3092\u7D99\u7D9A\u3057\u307E\u3059\u3002`));\n }catch(e){$('status').className='panel';$('status').textContent='\u76E3\u8996\u72B6\u6CC1\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u76E3\u8996\u4E2D\u304B\u3069\u3046\u304B\u78BA\u8A8D\u3067\u304D\u306A\u3044\u72B6\u614B\u3067\u3059\u3002';error(e);}\n}\nasync function allHistory(id){let after=0,items=[];do{const d=await api(`/api/logs/${id}/observations?after=${after}`);items.push(...d.items);after=d.next;}while(after);return items;}\nconst trainKey=value=>String(value??'').normalize('NFKC').replace(/^0+(?=\\d)/,'');\nconst atNamba=position=>/\u306A\u3093\u3070/.test(`${position?.current||''} ${position?.text||''}`);\nfunction formationKey(event){\n const formation=event.formation;\n return formation?.verified&&!/\u672A\u78BA\u8A8D/.test(formation.text||'')?String(formation.text).replace(/\\s+/g,'').toUpperCase():'';\n}\nfunction canLink(first,second){\n if(first.service_date!==second.service_date||!atNamba(first.last_position)||!atNamba(second.first_position))return false;\n const gap=Date.parse(second.first_seen)-Date.parse(first.last_seen);\n if(!Number.isFinite(gap)||gap < -120000||gap > 45*60000)return false;\n const explicit=trainKey(first.train_number)==='8450'&&['8673','8070'].includes(trainKey(second.train_number)),a=formationKey(first),b=formationKey(second);\n return explicit?(!a||!b||a===b):!!a&&a===b;\n}\nfunction groupRuns(items){\n const ordered=[...items].sort((a,b)=>Date.parse(a.first_seen)-Date.parse(b.first_seen)||a.id-b.id),used=new Set(),groups=[];\n for(const event of ordered){\n  if(used.has(event.id))continue;\n  const chain=[event];used.add(event.id);\n  while(true){const next=ordered.find(candidate=>!used.has(candidate.id)&&canLink(chain.at(-1),candidate));if(!next)break;chain.push(next);used.add(next.id);}\n  groups.push(chain);\n }\n return groups.sort((a,b)=>Math.max(...b.map(x=>x.id))-Math.max(...a.map(x=>x.id)));\n}\nfunction chainRange(events){const first=events[0],last=events.at(-1);return `${first.display_range?.first||'\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093'} \u2192 ${last.display_range?.last||'\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093'}`;}\nfunction chainGroups(events){return [...new Set(events.map(event=>event.group_name==='nankai'?'\u5357\u6D77\u7DDA\u7CFB\u7D71':'\u9AD8\u91CE\u7DDA\u7CFB\u7D71'))].join(' \u2192 ');}\nfunction verifiedFormation(events){return [...events].reverse().find(event=>formationKey(event))?.formation?.text||events.at(-1).formation?.text||'\u7DE8\u6210\u672A\u78BA\u8A8D';}\nfunction appendHistory(history,event,data,result,linked){\n if(linked)history.append(el('h3',`${event.train_number}\u5217\u8ECA`,'segment-title'));\n history.append(timelineView(result.timeline));\n const observations=el('details',undefined,'observation-group');observations.append(el('summary',`\u5728\u7DDA\u5C65\u6B74 ${data.length}\u4EF6\uFF08\u958B\u304F\uFF09`));\n const observationList=el('div',undefined,'observation-list');\n for(const observation of data){const row=el('details'),where=observation.position?.text||'\u4F4D\u7F6E\u4E0D\u660E';row.append(el('summary',`${clock(observation.source_time)}\u3000${where}`),el('pre',JSON.stringify(observation.payload,null,2)));observationList.append(row);}\n observations.append(observationList);history.append(observations);\n const baseline=el('details');baseline.append(el('summary','\u7167\u5408\u3057\u305F\u904B\u7528\u8868'),el('pre',JSON.stringify(event.baseline,null,2)));history.append(baseline);\n}\nfunction card(input){\n const events=Array.isArray(input)?input:[input],e=events[0],lastEvent=events.at(-1),linked=events.length>1,known=lastEvent.special||e.special,a=el('article',undefined,linked?'linked-card':''),top=el('div',undefined,'top'),numbers=events.map(event=>`${event.train_number}\u5217\u8ECA`).join(' \u2192 ');\n top.append(el('h2',numbers),el('span',linked?'\u4E00\u9023\u306E\u904B\u8EE2':known?.label||'\u5B9A\u671F\u5916\u5019\u88DC','tag'+(known||linked?' known':'')));a.append(top);\n if(linked){\n  const explicit=trainKey(e.train_number)==='8450'&&['8673','8070'].includes(trainKey(lastEvent.train_number)),box=el('div',undefined,'known-service chain-service');\n  box.append(el('strong',explicit?'\u5343\u4EE3\u7530\u5165\u5834\u56DE\u9001':'\u306A\u3093\u3070\u6298\u8FD4\u3057\u3092\u542B\u3080\u4E00\u9023\u306E\u904B\u8EE2'),el('div','\u5217\u756A\uFF1A'+numbers),el('div','\u904B\u8EE2\u533A\u9593\uFF1A'+chainRange(events)),el('small','\u540C\u4E00\u7DE8\u6210\u30FB\u306A\u3093\u3070\u3067\u306E\u6298\u8FD4\u3057\u30FB\u524D\u5F8C\u306E\u78BA\u8A8D\u6642\u523B\u304B\u3089\u4E00\u9023\u306E\u904B\u8EE2\u3068\u3057\u3066\u307E\u3068\u3081\u3066\u3044\u307E\u3059\u3002'));a.append(box);\n }else if(known){const box=el('div',undefined,'known-service');box.append(el('strong',known.label));if(known.route)box.append(el('div','\u533A\u9593\uFF1A'+known.route));if(known.schedule)box.append(el('div','\u6642\u523B\uFF1A'+known.schedule));if(known.note)box.append(el('small',known.note));a.append(box);}\n const details=el('div',undefined,'details'),rows=[['\u7DE8\u6210\uFF08\u6700\u5F8C\u306B\u691C\u8A3C\u3067\u304D\u305F\u5024\uFF09',verifiedFormation(events)],['\u904B\u884C\u65E5\u30FB\u7CFB\u7D71',`${e.service_date} \uFF0F ${chainGroups(events)}`],['\u521D\u56DE \u2192 \u6700\u7D42\u78BA\u8A8D',`${time(e.first_seen)} \u2192 ${time(lastEvent.last_seen)}`],['\u63A8\u5B9A\u3057\u305F\u904B\u8EE2\u533A\u9593',chainRange(events)],['\u6700\u7D42\u78BA\u8A8D\u5730\u70B9',lastEvent.display_range?.last||'\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093']];\n if(linked)rows.splice(1,0,['\u5217\u756A\u306E\u3064\u306A\u304C\u308A',numbers]);\n for(const [label,value] of rows){const cell=el('div',label,'muted');cell.append(el('b',value));details.append(cell);}a.append(details);\n const button=el('button',linked?'\u5404\u5217\u8ECA\u306E\u63A8\u5B9A\u6642\u523B\u30FB\u5728\u7DDA\u5C65\u6B74':'\u63A8\u5B9A\u6642\u523B\u30FB\u5728\u7DDA\u5C65\u6B74'),history=el('div',undefined,'history');history.hidden=true;a.append(button,history);\n button.onclick=async()=>{if(!history.hidden){history.hidden=true;return;}button.disabled=true;try{const results=await Promise.all(events.map(async event=>({event,data:await allHistory(event.id),result:await api(`/api/logs/${event.id}/timeline`)})));history.replaceChildren();for(const item of results)appendHistory(history,item.event,item.data,item.result,linked);history.hidden=false;}catch(exception){error(exception);}finally{button.disabled=false;}};\n return a;\n}\nasync function load(reset=true){if(busy)return;busy=true;$('error').textContent='';try{\n if(reset){params=new URLSearchParams({date:$('date').value,group:$('group').value,q:$('query').value});next=null;}\n const query=new URLSearchParams(params);if(next)query.set('before',next);\n const data=await api('/api/logs?'+query);if(reset)$('events').replaceChildren();for(const group of groupRuns(data.items))$('events').append(card(group));\n if(reset&&!data.items.length)$('events').append(el('p','\u8A72\u5F53\u3059\u308B\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u76E3\u8996\u958B\u59CB\u524D\u306E\u5C65\u6B74\u306F\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002'));\n if(reset)logsLoaded=true;\n next=data.next;$('more').hidden=!next;await status();\n }catch(e){error(e);}finally{busy=false;}}\nconst categoryOrder=['6\u4E21\uFF08\u56FA\u5B9A\uFF09','4\u4E21\uFF08\u56FA\u5B9A\uFF09','2\u4E21\uFF08\u56FA\u5B9A\uFF09','\u7279\u6025\u8ECA\u30FB\u305D\u306E\u4ED6'];\nfunction evidenceList(item){\n const list=el('ul',undefined,'evidence');\n for(const evidence of item.evidence||[]){const li=el('li'),badge=el('span',evidence.source==='hub'?'\u904B\u7528Hub':'\u5217\u8ECA\u30ED\u30B0','source'+(evidence.source==='log'?' log':''));li.append(badge);\n  if(evidence.source==='hub'&&evidence.url){const a=el('a',evidence.label);a.href=evidence.url;a.target='_blank';a.rel='noopener';li.append(a);}else{li.append(document.createTextNode(evidence.label));if(evidence.trainNumber){const button=el('button','\u30ED\u30B0\u3092\u898B\u308B');button.type='button';button.onclick=()=>{$('date').value=evidence.serviceDate||'';$('group').value=evidence.groupName||'';$('query').value=evidence.trainNumber;showView('log');void load();};li.append(' ',button);}}\n  list.append(li);\n }return list;\n}\nfunction fleetTable(label,items){\n const section=el('section',undefined,'fleet-group');section.append(el('h2',`${label}\u3000${items.length}\u7DE8\u6210`));const wrap=el('div',undefined,'table-wrap'),table=el('table'),head=el('thead'),hr=el('tr');for(const h of ['','\u7DE8\u6210','\u73FE\u5728\u306E\u5224\u5B9A','\u6839\u62E0'])hr.append(el('th',h));head.append(hr);table.append(head);const body=el('tbody');\n if(!items.length){const row=el('tr'),cell=el('td','\u8A72\u5F53\u3059\u308B\u7DE8\u6210\u306F\u3042\u308A\u307E\u305B\u3093','empty-row');cell.colSpan=4;row.append(cell);body.append(row);}\n items.forEach((item,index)=>{const row=el('tr',undefined,'fleet-row '+item.kind),number=el('td',String(index+1),'fleet-number');number.dataset.label='\u756A\u53F7';row.append(number);const name=el('td');name.dataset.label='\u7DE8\u6210';const link=(item.evidence||[]).find(x=>x.source==='hub'&&x.url);if(link){const a=el('a',item.formation,'fleet-name');a.href=link.url;a.target='_blank';a.rel='noopener';name.append(a);}else name.append(el('span',item.formation,'fleet-name'));if(item.seriesName)name.append(el('div',item.seriesName,'fleet-note'));row.append(name);const current=el('td');current.dataset.label='\u73FE\u5728\u306E\u5224\u5B9A';current.append(el('span',item.source==='hub'?'\u904B\u7528Hub':'\u30ED\u30B0\u304B\u3089\u63A8\u5B9A','source'+(item.source==='log'?' log':'')),el('div',item.status));if(item.updatedAt)current.append(el('div','\u66F4\u65B0\uFF1A'+time(item.updatedAt),'fleet-note'));row.append(current);const evidence=el('td');evidence.dataset.label='\u6839\u62E0';evidence.append(evidenceList(item));row.append(evidence);body.append(row);});\n table.append(body);wrap.append(table);section.append(wrap);return section;\n}\nasync function loadFleet(force=false){const button=$('refreshFleet');button.disabled=true;$('error').textContent='';try{const data=await api('/api/fleet-status',{method:force?'POST':'GET'}),groups=new Map();for(const item of data.items||[]){if(!groups.has(item.category))groups.set(item.category,[]);groups.get(item.category).push(item);}const order=[...categoryOrder,...[...groups.keys()].filter(x=>!categoryOrder.includes(x)).sort((a,b)=>a.localeCompare(b,'ja'))];$('fleetTables').replaceChildren(...order.map(group=>fleetTable(group,groups.get(group)||[])));$('fleetSummary').replaceChildren(el('span',`\u63B2\u8F09 ${data.items?.length||0}\u7DE8\u6210`),el('span',`Hub\u78BA\u8A8D ${time(data.fetchedAt)}`));fleetLoaded=true;}catch(e){error(e);}finally{button.disabled=false;}}\nasync function open(){\n $('loginPanel').hidden=true;$('main').hidden=false;\n const view=location.hash==='#fleet'?'fleet':'log';\n showView(view);\n}\n$('login').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const d=await api('/api/auth/logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('password').value})});token=d.token;sessionStorage.setItem(KEY,token);$('password').value='';await open();}catch(e){error(e);}finally{b.disabled=false;}};\n$('filters').onsubmit=e=>{e.preventDefault();void load();};$('more').onclick=()=>load(false);\ndocument.querySelectorAll('[data-log-view]').forEach(button=>button.onclick=()=>showView(button.dataset.logView));$('refreshFleet').onclick=()=>loadFleet(true);\nwindow.addEventListener('hashchange',()=>{\n if(token)showView(location.hash==='#fleet'?'fleet':'log');\n});\n$('logout').onclick=()=>{token='';sessionStorage.removeItem(KEY);$('main').hidden=true;$('loginPanel').hidden=false;};\n$('export').onclick=async()=>{const button=$('export');button.disabled=true;try{let cursor=null,items=[];do{const query=new URLSearchParams(params);if(cursor)query.set('before',cursor);const data=await api('/api/logs?'+query);items.push(...data.items);cursor=data.next;}while(cursor);for(const e of items)e.observations=await allHistory(e.id);const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),filters:Object.fromEntries(params),items},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download='nankai-train-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){error(e);}finally{button.disabled=false;}};\nsetInterval(()=>{if(token&&!document.hidden)void status();},30000);\nif(token)void open();\n" };
var stdin_default = {
  scheduled: worker_default.scheduled,
  fetch(request, env, ctx) {
    return worker_default.fetch(request, { ...env, ASSETS: { fetch: async (r) => {
      const path = new URL(r.url).pathname;
      return new Response(pages[path] ?? "Not found", { status: path in pages ? 200 : 404, headers: { "Content-Type": path.endsWith(".js") ? "text/javascript;charset=UTF-8" : "text/html;charset=UTF-8", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" } });
    } } }, ctx);
  }
};
export {
  stdin_default as default
};
