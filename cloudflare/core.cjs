'use strict';
const GROUPS = {1: 'nankai', 2: 'koya'};
function numberKey(value) {
  const s = String(value ?? '').normalize('NFKC').trim().replace(/^回\s*/, '').toUpperCase();
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s;
}
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
module.exports = {GROUPS, numberKey, serviceDate, sourceTime, tableNumbers, formation};
