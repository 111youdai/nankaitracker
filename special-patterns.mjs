export const SPECIAL_TRAIN_PATTERNS = Object.freeze([
    {
        trains: ["8376"],
        category: "試運転",
        title: "千代田出場試運転（上り）",
        route: "千代田工場からの出場試運転",
        schedules: [],
        note: "通過時刻は未登録です。列番を検出した場合は千代田出場として記録します。"
    },
    {
        trains: ["8679"],
        category: "試運転",
        title: "千代田出場試運転（下り）",
        route: "千代田工場への折返し試運転",
        schedules: [],
        note: "通過時刻は未登録です。列番を検出した場合は千代田出場として記録します。"
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

function patternCard(pattern) {
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
    if (pattern.schedules.length) {
        pattern.schedules.forEach(schedule => timetable.append(scheduleBlock(schedule)));
    } else {
        timetable.append(element("p", "通過時刻は未登録です", "pattern-unregistered"));
    }
    card.append(header, copy, timetable);
    if (pattern.note) card.append(element("p", pattern.note, "pattern-note"));
    return card;
}

export function renderSpecialPatterns(container) {
    if (!container || container.dataset.rendered === "true") return;
    container.replaceChildren(...SPECIAL_TRAIN_PATTERNS.map(patternCard));
    container.dataset.rendered = "true";
}
