export const SPECIAL_TRAIN_PATTERNS = Object.freeze([
    {
        trains: ["8376"],
        category: "試運転",
        title: "千代田出場試運転（上り）",
        route: "千代田工場からの出場試運転",
        schedules: [],
        note: "列番を検出した場合は千代田出場として記録します。"
    },
    {
        trains: ["8679"],
        category: "試運転",
        title: "千代田出場試運転（下り）",
        route: "千代田工場への折返し試運転",
        schedules: [],
        note: "列番を検出した場合は千代田出場として記録します。"
    },
    {
        trains: ["9185"],
        category: "臨時回送",
        title: "千代田発・小原田行き臨時回送",
        route: "千代田 → 小原田",
        schedules: [],
        note: "いわゆる廃回スジとして知られる列番ですが、画面上は臨時回送と表示します。"
    },
    {
        trains: ["8680"],
        category: "臨時回送",
        title: "小原田発・千代田行き臨時回送",
        route: "小原田 → 千代田",
        schedules: [
            { label: "基本", stops: ["小原田 17:01発", "千代田 17:24着"] }
        ]
    },
    {
        trains: ["8721"],
        category: "関連回送",
        title: "泉北ライナー代走用サザン回送（往路）",
        route: "住ノ江 → なんば",
        schedules: [
            { label: "基本", stops: ["住ノ江 13:50発", "なんば 14:02着"] }
        ],
        note: "11000系の高野線特急貸出に伴う泉北ライナー代走時の回送です。"
    },
    {
        trains: ["8722"],
        category: "関連回送",
        title: "泉北ライナー代走用サザン回送（復路）",
        route: "なんば → 千代田",
        schedules: [
            { label: "基本", stops: ["なんば 14:14発", "千代田 14:56着"] }
        ],
        note: "11000系の高野線特急貸出に伴う泉北ライナー代走時の回送です。"
    },
    {
        trains: ["8450", "8673", "8070"],
        category: "入場回送",
        title: "千代田入場回送",
        route: "羽倉崎・住ノ江 → なんば → 千代田工場",
        chain: "8450列車 → 8673列車（8070列車の場合あり）",
        schedules: [
            {
                label: "平日・8673/8070",
                stops: ["住ノ江 10:40発", "なんば 10:52着", "なんば 10:58発", "千代田 11:34着"]
            },
            {
                label: "土休日・8673/8070",
                stops: ["なんば 10:43発", "千代田 11:24着"]
            }
        ],
        note: "8450列車は羽倉崎または住ノ江からなんばまでの前運用として、同じ編成の8673・8070列車と連結して表示します。"
    }
]);

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function scheduleBlock(schedule) {
    const block = element("section", undefined, "pattern-schedule");
    block.append(element("strong", schedule.label));
    const stops = element("ol");
    schedule.stops.forEach((stop, index) => {
        const row = element("li");
        row.append(
            element("span", String(index + 1), "pattern-stop-number"),
            element("span", stop)
        );
        stops.append(row);
    });
    block.append(stops);
    return block;
}

function patternCard(pattern, samples = []) {
    const card = element("article", undefined, "pattern-card");
    const header = element("div", undefined, "pattern-card-head");
    const numbers = element("div", undefined, "pattern-train-numbers");
    pattern.trains.forEach(number => numbers.append(element("b", `${number}列車`)));
    header.append(numbers, element("span", pattern.category, "pattern-category"));

    const copy = element("div", undefined, "pattern-card-copy");
    copy.append(
        element("h3", pattern.title),
        element("p", pattern.route, "pattern-route")
    );
    if (pattern.chain) copy.append(element("p", pattern.chain, "pattern-chain"));

    const timetable = element("div", undefined, "pattern-timetable");
    if (pattern.schedules.length && !samples.length) {
        pattern.schedules.forEach(schedule => timetable.append(scheduleBlock(schedule)));
    } else if (!samples.length) {
        timetable.append(element("p", "通過時刻は未登録です", "pattern-unregistered"));
    }
    card.append(header, copy, timetable);
    if (samples.length) card.append(recordedTimetable(samples, pattern.schedules));
    if (pattern.note) card.append(element("p", pattern.note, "pattern-note"));
    return card;
}

const clock = value => new Date(value).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false });
const key = value => String(value).normalize('NFKC').replace(/^0+(?=\d)/, '');

async function request(path) {
    const response = await fetch(`${window.TRACKER_LOG_WORKER_URL}${path}`, {
        headers: { Authorization: `Bearer ${window.getTrackerAccountToken?.() || ''}` },
        signal: AbortSignal.timeout(30000), cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
}

export function combinePatterns(items) {
    const known = new Set(SPECIAL_TRAIN_PATTERNS.flatMap(pattern => pattern.trains));
    const result = SPECIAL_TRAIN_PATTERNS.map(pattern => ({
        pattern, samples: items.filter(item => pattern.trains.includes(key(item.trainNumber)))
    }));
    const extra = new Map();
    for (const item of items) {
        const number = key(item.trainNumber);
        if (known.has(number) || number === '88') continue;
        const groupKey = `${item.group}:${number}`;
        if (!extra.has(groupKey)) extra.set(groupKey, { pattern: {
            trains: [item.trainNumber], title: 'ログから自動追加した運転例',
            category: item.special?.label || '定期外候補', route: item.range.text,
            schedules: [], note: '保存された運転例です。今後の運転予定を保証するものではありません。'
        }, samples: [] });
        extra.get(groupKey).samples.push(item);
    }
    return [...result, ...extra.values()].map(entry => ({ ...entry,
        samples: [...entry.samples].sort((a, b) => Date.parse(b.firstSeen) - Date.parse(a.firstSeen) || b.id - a.id)
    }));
}

const timelineCache = new Map();

function latestSamplePerTrain(samples) {
    const latest = new Map();
    for (const sample of samples) {
        const number = key(sample.trainNumber);
        if (!latest.has(number)) latest.set(number, sample);
    }
    return [...latest.values()];
}

async function timelineFor(sample) {
    if (!timelineCache.has(sample.id)) {
        timelineCache.set(sample.id, request(`/api/patterns/${sample.id}`).catch(error => {
            timelineCache.delete(sample.id);
            throw error;
        }));
    }
    return timelineCache.get(sample.id);
}

function recordedTimetable(samples, fallbackSchedules = []) {
    const block = element('section', undefined, 'pattern-recorded');
    block.append(element('h4', '通過時刻'));
    const body = element('div', '時刻を更新中…', 'pattern-recorded-body');
    block.append(body);
    void (async () => {
        try {
            const representatives = latestSamplePerTrain(samples);
            const results = await Promise.all(representatives.map(async sample => ({
                sample,
                data: await timelineFor(sample)
            })));
            body.replaceChildren();
            let added = 0;
            for (const { sample, data } of results) {
                if (!data.timeline?.available) continue;
                const schedule = element('section', undefined, 'pattern-schedule pattern-recorded-schedule');
                if (representatives.length > 1) schedule.append(element('strong', `${sample.trainNumber}列車`));
                const list = element('ol', undefined, 'pattern-recorded-stops');
                for (const point of data.timeline.points) {
                    const row = element('li');
                    const end = point.endTime ? clock(point.endTime) : '';
                    row.append(
                        element('time', clock(point.time) + (end && end !== clock(point.time) ? `〜${end}` : '')),
                        element('span', `${point.station}駅`)
                    );
                    list.append(row);
                }
                schedule.append(list);
                body.append(schedule);
                added++;
            }
            if (!added && fallbackSchedules.length) {
                body.replaceChildren(...fallbackSchedules.map(scheduleBlock));
            } else if (!added) {
                body.append(element('p', '通過時刻は未登録です', 'pattern-unregistered'));
            }
        } catch (error) {
            body.replaceChildren(element('p', `時刻を更新できませんでした：${error.message}`, 'pattern-unregistered'));
        }
    })();
    return block;
}

if (typeof window !== 'undefined') {
    const refreshVisible = () => {
        const workspace = document.getElementById('patternsWorkspace');
        if (workspace && !workspace.hidden && !document.hidden) void renderSpecialPatterns(document.getElementById('specialPatternList'));
    };
    window.setInterval(refreshVisible, 60000);
    document.addEventListener('visibilitychange', refreshVisible);
    document.getElementById('refreshPatterns')?.addEventListener('click', refreshVisible);
}

let busy = false, signature = '';
export async function renderSpecialPatterns(container) {
    if (!container || busy || !window.canViewTrackerRecords?.()) return;
    busy = true;
    const status = document.getElementById('patternsStatus');
    if (status) status.textContent = '保存ログと照合中…';
    try {
        let before = null; const items = [];
        do {
            const data = await request('/api/patterns' + (before ? `?before=${before}` : ''));
            items.push(...data.items); before = data.next;
        } while (before);
        if (!window.canViewTrackerRecords?.()) return;
        const nextSignature = JSON.stringify(items);
        if (nextSignature !== signature || !container.children.length) {
            container.replaceChildren(...combinePatterns(items).map(({ pattern, samples }) => patternCard(pattern, samples)));
            signature = nextSignature;
        }
        if (status) status.textContent = `定スジを更新済み · ${clock(new Date())}更新 · 表示中は毎分更新`;
    } catch (error) {
        if (status) status.textContent = `自動更新できませんでした：${error.message}。「更新」で再試行できます。`;
    } finally { busy = false; }
}
