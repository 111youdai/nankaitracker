'use strict';
const GROUPS = {1: 'nankai', 2: 'koya'};
const IGNORED_TRAIN_KEYS = Object.freeze(['88']);
function numberKey(value) {
  const s = String(value ?? '').normalize('NFKC').trim().replace(/^回\s*/, '').toUpperCase();
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s;
}
function ignoredTrain(value) {return IGNORED_TRAIN_KEYS.includes(numberKey(value));}
function serviceDate(time) {
  // 04:00 JST boundary; a night train belongs to the preceding operating day.
  return new Date(new Date(time).getTime() + 5 * 3600000).toISOString().slice(0, 10);
}
function sourceTime(feed, group) {
  const date = String(feed[`${group}_update_date`] || '').replaceAll('/', '-');
  const time = String(feed[`${group}_update_time`] || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(time)) throw new Error(`${group}: 配信時刻の形式が不明です`);
  const value = new Date(`${date}T${time}+09:00`);
  if (!Number.isFinite(value.getTime())) throw new Error(`${group}: 配信時刻が不正です`);
  return value.toISOString();
}
function tableNumbers(table) {
  if (!table || !table.operations || typeof table.operations !== 'object') throw new Error('運用表の形式が変わっています');
  const numbers = new Set(), branch = new Set(), lines = new Set();
  for (const op of Object.values(table.operations)) {
    if (!Array.isArray(op.trains)) throw new Error('運用表のtrainsが不正です');
    for (const t of op.trains) {
      if (typeof t.train_number !== 'string') throw new Error('運用表の列番が不正です');
      if (!t.line_id || /^[_.]/.test(t.train_number)) continue; // garage/virtual records
      const key = numberKey(t.train_number);
      if (!key) continue;
      numbers.add(key); lines.add(t.line_id);
      if (t.line_id === 'shiomibashisen') branch.add(key);
    }
  }
  if (numbers.size < 50) throw new Error('運用表が空または不完全です。判定を保留します');
  return {numbers: [...numbers], branch: [...branch], lines: [...lines]};
}
function formation(t) {
  const ns = Array.isArray(t.car_numbers) ? t.car_numbers : [];
  const cs = Array.isArray(t.car_counts) ? t.car_counts : [];
  const pairs = ns.map((n,i) => [Number(n), Number(cs[i] || 0)]).filter(([n,c]) => n > 0 || c > 0);
  const total = Number(t.train_length_id);
  const valid = pairs.length > 0 && pairs.every(([n,c]) => Number.isInteger(n) && n > 0 && Number.isInteger(c) && c > 0) && pairs.reduce((sum,p) => sum+p[1],0) === total && !cs.slice(ns.length).some(c=>Number(c)>0);
  return {verified: valid, text: valid ? pairs.map(([n,c])=>`${n}F (${c}両)`).join(' + ') : '編成未確認', numbers: ns, counts: cs, totalCars: total || null};
}
const SPECIAL_TRAINS = Object.freeze({
  '8376': {category:'chiyoda-test',label:'千代田出場試運転（上り）',route:'千代田出場・上り',note:'千代田工場出場後の試運転に使われる列番'},
  '8679': {category:'chiyoda-test',label:'千代田出場試運転（下り）',route:'千代田出場・下り',note:'千代田工場出場後の試運転に使われる列番'},
  '9185': {category:'scrap-transfer',label:'廃車回送（廃回）スジ',route:'千代田 → 小原田',note:'千代田発・小原田行きの廃車回送スジ'},
  '8680': {category:'temporary-deadhead',label:'臨時回送スジ',route:'小原田 → 千代田',schedule:'小原田 17:01発 → 千代田 17:24着'},
  '8721': {category:'liner-substitute-deadhead',label:'泉北ライナー代走関連回送',route:'住ノ江 → なんば',schedule:'住ノ江 13:50発 → なんば 14:02着',note:'11000系の高野線特急貸出時に、泉北ライナーを代走するサザン車の回送'},
  '8722': {category:'liner-substitute-deadhead',label:'泉北ライナー代走関連・千代田回送',route:'なんば → 千代田',schedule:'なんば 14:14発 → 千代田 14:56着',note:'11000系の高野線特急貸出時に、泉北ライナーを代走するサザン車の回送'},
  '8673': {category:'chiyoda-entry',label:'千代田入場回送',route:'住ノ江 → なんば → 千代田',schedules:{weekday:'住ノ江 10:40発 → なんば 10:52着・10:58発 → 千代田 11:34着',weekend:'土日：なんば 10:43発 → 千代田 11:24着'},note:'8070レとなる場合あり'},
  '8070': {category:'chiyoda-entry',label:'千代田入場回送',route:'住ノ江 → なんば → 千代田',schedules:{weekday:'住ノ江 10:40発 → なんば 10:52着・10:58発 → 千代田 11:34着',weekend:'土日：なんば 10:43発 → 千代田 11:24着'},note:'8673レとなる場合あり'}
});
function specialService(value,day='') {
  const trainKey=numberKey(value),base=SPECIAL_TRAINS[trainKey];
  if (!base) return null;
  const result={...base,trainKey};
  if (base.schedules) {
    const dow=/^\d{4}-\d{2}-\d{2}$/.test(day)?new Date(`${day}T00:00:00Z`).getUTCDay():-1;
    result.schedule=base.schedules[dow===0||dow===6?'weekend':'weekday'];
    delete result.schedules;
  }
  return result;
}
module.exports = {GROUPS, IGNORED_TRAIN_KEYS, numberKey, ignoredTrain, serviceDate, sourceTime, tableNumbers, formation, specialService};
