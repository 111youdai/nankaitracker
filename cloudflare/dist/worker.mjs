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
    module.exports = { STATION_NAMES, ROUTES, stationName, stationLabel, stationPosition, trajectoryPositions: trajectoryPositions2, observedRange };
  }
});

// data.mjs
var import_core = __toESM(require_core(), 1);
var { tableNumbers, numberKey, ignoredTrain, formation } = import_core.default;
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
var { specialService } = import_core2.default;
var { trajectoryPositions } = import_stations.default;
var json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json;charset=UTF-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
async function handle(request, env) {
  const u = new URL(request.url), p = u.pathname, db = env.DB;
  try {
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
        let sql = `SELECT events.*,
     (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time,o.id LIMIT 1) AS first_payload,
     (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time,o.id LIMIT 1 OFFSET 1) AS second_payload,
     (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time DESC,o.id DESC LIMIT 1 OFFSET 1) AS previous_payload
     FROM events WHERE id<?${ignored.length ? ` AND train_key NOT IN (${ignored.map(() => "?").join(",")})` : ""}`, args = [before, ...ignored];
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
        const rows = (await db.prepare(sql + " ORDER BY id DESC LIMIT 100").bind(...args).all()).results;
        const items = rows.map((e) => {
          const { second_payload, previous_payload, ...event } = e, first = JSON.parse(e.first_payload || e.last_payload), second = second_payload ? JSON.parse(second_payload) : null, previous = previous_payload ? JSON.parse(previous_payload) : null, last = JSON.parse(e.last_payload);
          const firstPosition = trajectoryPositions(second ? [first, second] : [first], { eventStart: true })[0];
          const lastPositions = trajectoryPositions(previous ? [previous, last] : [last], { eventEnd: true }), lastPosition = lastPositions.at(-1);
          return { ...event, formation: JSON.parse(e.formation), baseline: JSON.parse(e.baseline), first_payload: first, last_payload: last, first_position: firstPosition, last_position: lastPosition, observed_range: { first: firstPosition, last: lastPosition, text: `\u521D\u56DE\uFF1A${firstPosition.text} \uFF0F \u6700\u7D42\uFF1A${lastPosition.text}` }, special: specialService(e.train_number, e.service_date) };
        });
        return json({ items, next: items.length === 100 ? items.at(-1).id : null });
      }
      const m = p.match(/^\/api\/logs\/(\d+)\/observations$/);
      if (m) {
        const id = Number(m[1]), after = Number(u.searchParams.get("after") || 0);
        if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(after) || after < 0) return json({ error: "ID\u304C\u4E0D\u6B63\u3067\u3059" }, 400);
        const rows = (await db.prepare("SELECT * FROM observations WHERE event_id=? AND id>? ORDER BY id LIMIT 501").bind(id, after).all()).results, hasMore = rows.length > 500, page = rows.slice(0, 500), payloads = rows.map((r) => JSON.parse(r.payload)), positions = trajectoryPositions(payloads, { eventStart: after === 0, eventEnd: !hasMore });
        return json({ items: page.map((r, index) => ({ ...r, payload: payloads[index], position: positions[index] })), next: hasMore ? page.at(-1).id : null });
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
var pages = { "/logs.html": '<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u5B9A\u671F\u5916\u30ED\u30B0 | \u5357\u6D77\u30C8\u30E9\u30C3\u30AB\u30FC</title>\n<style>\n:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#0d1720;color:#e8f2f6}*{box-sizing:border-box}body{max-width:1100px;margin:auto;padding:24px}h1{margin:8px 0}small,.muted{color:#abc0ce}p{line-height:1.7}header{margin-bottom:24px}.label{color:#65e0ba;font-size:12px;letter-spacing:2px}.panel,article{border:1px solid #324550;border-radius:12px;background:#14232e;padding:18px;margin-bottom:14px}input,select,button{font:inherit;border-radius:7px;border:1px solid #48606e;padding:10px;background:#0d1720;color:inherit}button{cursor:pointer;background:#1b554b}button:disabled{opacity:.5;cursor:wait}form,.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:end}label{display:flex;flex-direction:column;gap:6px;font-size:13px}#status{border-left:4px solid #e5b858}#status.ok{border-color:#65e0ba}.error{color:#ffc6b9}.top{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}h2{font-size:22px;margin:0}.tag{background:#624b23;border-radius:5px;padding:4px 7px;font-size:12px}.tag.known{background:#12604d;color:#e2fff7}.known-service{margin-top:14px;padding:12px 14px;border-left:4px solid #65e0ba;border-radius:7px;background:#102d2b;display:grid;gap:5px}.known-service strong{color:#8ff0d2}.details{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:16px 0}.details b{display:block;margin-top:4px;font-size:15px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;background:#0d1720;padding:12px;border-radius:7px}.history{margin-top:12px;border-top:1px solid #324550;padding-top:12px}#error{min-height:24px}a{color:#8ddac7}[hidden]{display:none!important}@media(max-width:540px){body{padding:14px}.details{grid-template-columns:1fr}input{max-width:100%}h1{font-size:26px}}\n</style></head><body>\n<header><span class="label">NANKAI TRACKER / RECORDS</span><h1>\u5B9A\u671F\u5916\u5217\u8ECA\u306E\u8A18\u9332</h1><p class="muted">Cloudflare\u3067\u6BCE\u5206\u76E3\u8996\u3002\u5357\u6D77\u7DDA\u30FB\u9AD8\u91CE\u7DDA\u30FB\u6CC9\u5317\u7DDA\u30FB\u652F\u7DDA\u3002\u901A\u5E38\u306E\u5E73\u65E5\uFF0F\u4F11\u65E5\u30C0\u30A4\u30E4\u306B\u306A\u3044\u5217\u756A\u306E\u78BA\u8A8D\u5C65\u6B74\u3002</p></header>\n<section class="panel" id="loginPanel"><form id="login"><label>\u30ED\u30B0\u95B2\u89A7\u30D1\u30B9\u30EF\u30FC\u30C9<input id="password" type="password" required autocomplete="current-password"></label><button>\u30ED\u30B0\u3092\u958B\u304F</button></form></section>\n<div id="error" class="error" role="alert"></div>\n<main id="main" hidden><div class="panel" id="status" role="status">\u76E3\u8996\u72B6\u6CC1\u3092\u78BA\u8A8D\u4E2D\u2026</div>\n<div class="panel"><form id="filters"><label>\u904B\u884C\u65E5\uFF08\u5348\u524D4\u6642\u533A\u5207\u308A\uFF09<input id="date" type="date"></label><label>\u7CFB\u7D71<select id="group"><option value="">\u3059\u3079\u3066</option><option value="nankai">\u5357\u6D77\u7DDA\u7CFB\u7D71</option><option value="koya">\u9AD8\u91CE\u7DDA\u7CFB\u7D71</option></select></label><label>\u5217\u756A\u30FB\u7DE8\u6210\u756A\u53F7<input id="query" placeholder="\u4F8B\uFF1A8310"></label><button>\u691C\u7D22\u30FB\u66F4\u65B0</button><button type="button" id="export">\u691C\u7D22\u7D50\u679C\u3092JSON\u4FDD\u5B58</button><button type="button" id="logout">\u30ED\u30B0\u30A2\u30A6\u30C8</button></form></div>\n<p class="muted">\u300C\u5B9A\u671F\u5916\u5019\u88DC\u300D\u306F\u8A66\u904B\u8EE2\u30FB\u81E8\u6642\u56DE\u9001\u306E\u78BA\u5B9A\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u904B\u7528\u8868\u306E\u672A\u53CE\u9332\u30FB\u914D\u4FE1\u8AA4\u308A\u3082\u542B\u307F\u307E\u3059\u3002\u7DE8\u6210\u306FAPI\u306E\u7DE8\u6210\u756A\u53F7\u3067\u3001\u5168\u8ECA\u4E21\u306E\u8ECA\u756A\u4E00\u89A7\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>\n<section id="events" aria-live="polite"></section><button id="more" hidden>\u7D9A\u304D\u3092\u8AAD\u307F\u8FBC\u3080</button>\n<p class="muted">\u53D6\u5F97\u5143\uFF1A<a href="https://unyohub.2pd.jp/" target="_blank" rel="noopener">\u9244\u9053\u904B\u7528Hub</a>\uFF08\u901A\u5E38\u30C0\u30A4\u30E4\u7167\u5408\uFF09\uFF0F\u5357\u6D77\u30A2\u30D7\u30EA\u914D\u4FE1\u30C7\u30FC\u30BF\uFF08\u5217\u756A\u30FB\u7DE8\u6210\u30FB\u4F4D\u7F6E\uFF09\u3002</p></main>\n<script src="logs.js"><\/script></body></html>\n', "/logs.js": "'use strict';\nconst $=id=>document.getElementById(id),KEY='nankaiTrackerCloudLogToken';\nlet token=sessionStorage.getItem(KEY)||'',next=null,params=new URLSearchParams(),busy=false;\nconst time=x=>x?new Date(x).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false}):'\u672A\u78BA\u8A8D';\nconst clock=x=>x?new Date(x).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}):'\u6642\u523B\u4E0D\u660E';\nfunction el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}\nasync function api(url,options={}){\n const response=await fetch(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});\n const data=await response.json();\n if(!response.ok){if(response.status===401){token='';sessionStorage.removeItem(KEY);$('loginPanel').hidden=false;$('main').hidden=true;}throw new Error(data.error||`HTTP ${response.status}`);}return data;\n}\nfunction error(e){$('error').textContent=e.message;}\nasync function status(){\n try{const s=await api('/api/logs/status');const box=$('status');box.className='panel'+(s.healthy?' ok':'');box.replaceChildren(el('strong',s.healthy?'\u30AF\u30E9\u30A6\u30C9\u3067\u76E3\u8996\u4E2D':'\u76E3\u8996\u30FB\u7167\u5408\u306E\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044'));\n box.append(el('p',`\u6700\u7D42\u53D6\u5F97\uFF1A${time(s.lastSuccess)} \uFF0F \u53D6\u5F97\u9593\u9694\uFF1A${s.intervalSeconds}\u79D2 \uFF0F \u7167\u5408\u5F85\u3061\uFF1A${s.pending}\u4EF6`));\n for(const [g,v] of Object.entries(s.groups))box.append(el('div',`${g==='nankai'?'\u5357\u6D77\u7DDA':'\u9AD8\u91CE\u7DDA'}\uFF1A${v.error||`\u914D\u4FE1\u6642\u523B ${time(v.sourceTime)}\u30FB${v.trainCount}\u5217\u8ECA`}`));\n if(s.refresh?.error)box.append(el('p','\u904B\u7528\u8868\u306E\u66F4\u65B0\u306B\u5931\u6557\uFF1A'+s.refresh.error,'error'));\n if(s.feedError||s.baselineError)box.append(el('p',[s.feedError,s.baselineError].filter(Boolean).join(' / '),'error'));\n if(s.baseline)box.append(el('small',`\u7167\u5408\u30C7\u30FC\u30BF\u66F4\u65B0\uFF1A${time(s.baseline.fetchedAt)}\u3002\u753B\u9762\u3092\u9589\u3058\u3066\u3082\u3001Cloudflare\u3067\u6BCE\u5206\u76E3\u8996\u3092\u7D99\u7D9A\u3057\u307E\u3059\u3002`));\n }catch(e){$('status').className='panel';$('status').textContent='\u76E3\u8996\u72B6\u6CC1\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u76E3\u8996\u4E2D\u304B\u3069\u3046\u304B\u78BA\u8A8D\u3067\u304D\u306A\u3044\u72B6\u614B\u3067\u3059\u3002';error(e);}\n}\nasync function allHistory(id){let after=0,items=[];do{const d=await api(`/api/logs/${id}/observations?after=${after}`);items.push(...d.items);after=d.next;}while(after);return items;}\nfunction card(e){\n const known=e.special,a=el('article'),top=el('div',undefined,'top');top.append(el('h2',`${e.train_number} \u5217\u8ECA`),el('span',known?.label||'\u5B9A\u671F\u5916\u5019\u88DC','tag'+(known?' known':'')));a.append(top);\n if(known){const box=el('div',undefined,'known-service');box.append(el('strong',known.label));if(known.route)box.append(el('div','\u533A\u9593\uFF1A'+known.route));if(known.schedule)box.append(el('div','\u6642\u523B\uFF1A'+known.schedule));if(known.note)box.append(el('small',known.note));a.append(box);}\n const d=el('div',undefined,'details');const p=e.last_payload,last=e.last_position;\n for(const [k,v] of [['\u7DE8\u6210\uFF08\u6700\u5F8C\u306B\u691C\u8A3C\u3067\u304D\u305F\u5024\uFF09',e.formation.text],['\u904B\u884C\u65E5\u30FB\u7CFB\u7D71',`${e.service_date} \uFF0F ${e.group_name==='nankai'?'\u5357\u6D77\u7DDA\u7CFB\u7D71':'\u9AD8\u91CE\u7DDA\u7CFB\u7D71'}`],['\u521D\u56DE \u2192 \u6700\u7D42\u78BA\u8A8D',`${time(e.first_seen)} \u2192 ${time(e.last_seen)}`],['\u78BA\u8A8D\u3067\u304D\u305F\u904B\u8EE2\u7BC4\u56F2',e.observed_range?.text||'\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093'],['\u6700\u7D42\u78BA\u8A8D\u5730\u70B9',last?`${last.text} \uFF0F ${last.directionLabel}`:`${p.station_id??'\u4E0D\u660E'} \uFF0F ${p.direction??'\u65B9\u5411\u4E0D\u660E'}`]]){const c=el('div',k,'muted');c.append(el('b',v));d.append(c);}a.append(d);\n const button=el('button','\u5728\u7DDA\u5C65\u6B74'),history=el('div',undefined,'history');history.hidden=true;a.append(button,history);\n button.onclick=async()=>{if(!history.hidden){history.hidden=true;return;}button.disabled=true;try{const data=await allHistory(e.id);history.replaceChildren(el('p',`\u5728\u7DDA\u5C65\u6B74 ${data.length}\u4EF6`));for(const o of data){const row=el('details'),where=o.position?.text||'\u4F4D\u7F6E\u4E0D\u660E';row.append(el('summary',`${clock(o.source_time)}\u3000${where}`),el('pre',JSON.stringify(o.payload,null,2)));history.append(row);}const b=el('details');b.append(el('summary','\u7167\u5408\u3057\u305F\u904B\u7528\u8868'),el('pre',JSON.stringify(e.baseline,null,2)));history.append(b);history.hidden=false;}catch(e){error(e);}finally{button.disabled=false;}};\n return a;\n}\nasync function load(reset=true){if(busy)return;busy=true;$('error').textContent='';try{\n if(reset){params=new URLSearchParams({date:$('date').value,group:$('group').value,q:$('query').value});next=null;}\n const query=new URLSearchParams(params);if(next)query.set('before',next);\n const data=await api('/api/logs?'+query);if(reset)$('events').replaceChildren();for(const e of data.items)$('events').append(card(e));\n if(reset&&!data.items.length)$('events').append(el('p','\u8A72\u5F53\u3059\u308B\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u76E3\u8996\u958B\u59CB\u524D\u306E\u5C65\u6B74\u306F\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002'));\n next=data.next;$('more').hidden=!next;await status();\n }catch(e){error(e);}finally{busy=false;}}\nasync function open(){ $('loginPanel').hidden=true;$('main').hidden=false;await load(); }\n$('login').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const d=await api('/api/auth/logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('password').value})});token=d.token;sessionStorage.setItem(KEY,token);$('password').value='';await open();}catch(e){error(e);}finally{b.disabled=false;}};\n$('filters').onsubmit=e=>{e.preventDefault();void load();};$('more').onclick=()=>load(false);\n$('logout').onclick=()=>{token='';sessionStorage.removeItem(KEY);$('main').hidden=true;$('loginPanel').hidden=false;};\n$('export').onclick=async()=>{const button=$('export');button.disabled=true;try{let cursor=null,items=[];do{const query=new URLSearchParams(params);if(cursor)query.set('before',cursor);const data=await api('/api/logs?'+query);items.push(...data.items);cursor=data.next;}while(cursor);for(const e of items)e.observations=await allHistory(e.id);const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),filters:Object.fromEntries(params),items},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download='nankai-train-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){error(e);}finally{button.disabled=false;}};\nsetInterval(()=>{if(token&&!document.hidden)void status();},30000);\nif(token)void open();\n" };
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
