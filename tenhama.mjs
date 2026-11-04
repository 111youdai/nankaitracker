import {
    TENHAMA_STATIONS,
    TENHAMA_TRIPS,
    TENHAMA_VEHICLES,
    TENHAMA_SPECIAL_BY_DATE
} from "./tenhama-data.mjs";

const JST_TIME_ZONE = "Asia/Tokyo";

export {
    TENHAMA_STATIONS,
    TENHAMA_TRIPS,
    TENHAMA_VEHICLES,
    TENHAMA_SPECIAL_BY_DATE
};

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getJstParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("ja-JP", {
        timeZone: JST_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.map(part => [part.type, part.value])
    );

    return {
        dateKey: `${values.year}-${values.month}-${values.day}`,
        hour: Number(values.hour),
        minute: Number(values.minute)
    };
}

export function formatTenhamaMinute(totalMinutes) {
    const normalized = Math.max(0, Number(totalMinutes) || 0);
    const hour = Math.floor(normalized / 60) % 24;
    const minute = normalized % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getShortVehicleName(name) {
    return String(name || "車両未掲載")
        .replace(/^3代目\s*/, "")
        .replace(/フルラッピング列車/g, "")
        .replace(/電気式気動車\s*/g, "")
        .replace(/New\s*/g, "")
        .trim();
}

function isFeaturedVehicle(vehicleId, vehicleName) {
    return Boolean(
        vehicleId &&
        !String(vehicleName).includes("オリジナルカラー")
    );
}

const VEHICLE_ICON_THEMES = Object.freeze({
    TH2101: { base: "#f0d993", type: "re", destination: "掛川" },
    TH2102: { base: "#e9d7ad", type: "kiha", destination: "回送" },
    TH2103: { base: "#f2f5f2", type: "catalyzer", destination: "掛川" },
    TH2104: { base: "#f4f6f4", type: "standard", destination: "掛川" },
    TH2105: { base: "#f4f6f4", type: "una", destination: "新所原" },
    TH2107: { base: "#165a35", type: "flower", destination: "掛川" },
    TH2108: { base: "#d8edf3", type: "bike", destination: "新所原" },
    TH2109: { base: "#e3e8bd", type: "yurucamp", destination: "掛川" },
    TH2110: { base: "#f3d642", type: "bee", destination: "新所原" },
    TH2111: { base: "#56319b", type: "eva", destination: "掛川" },
    TH2112: { base: "#d9f0f7", type: "wave", destination: "掛川" },
    TH2113: { base: "#152a4b", type: "katana", destination: "掛川" },
    TH2114: { base: "#f4f6f4", type: "standard", destination: "掛川" },
    TH9200: { base: "#27465a", type: "slow", destination: "掛川" }
});

function getDetailedLivery(vehicleId, type) {
    switch (type) {
        case "re":
            return `
                <path d="M15 19h66v57H15z" fill="#175c35"/>
                <path d="M15 76h66v29H15z" fill="#e56f18"/>
                <path d="M15 72h66v6H15z" fill="#f5d88d"/>
                <path d="M42 25h12v70H42z" fill="#f0d991"/>
                <text x="48" y="88" text-anchor="middle" font-size="6" font-weight="900" fill="#175c35">Re+</text>`;
        case "kiha":
            return `
                <path d="M15 18h66v61H15z" fill="#ead9b6"/>
                <path d="M15 79h66v28H15z" fill="#dd4e28"/>
                <path d="M15 76h66v4H15z" fill="#25231f"/>
                <path d="M42 25h12v70H42z" fill="#ead9b6"/>
                <path d="M42 79h12v16H42z" fill="#dc4e28"/>
                <text x="48" y="91" text-anchor="middle" font-size="5" font-weight="900" fill="#302a20">THR</text>`;
        case "catalyzer":
            return `
                <path d="M15 18h66v88H15z" fill="#008c82"/>
                <g fill="#f6f8f5"><path d="M15 23l22-5-17 21 20-7-25 27z"/><path d="M81 25L60 18l16 22-19-8 24 28z"/><path d="M15 69l24-18-12 31 17-12-13 36H15z"/><path d="M81 70L59 52l11 31-16-12 12 35h15z"/></g>
                <path d="M42 26h12v68H42z" fill="#f7faf7"/>
                <circle cx="48" cy="84" r="7" fill="#fff" stroke="#e23845" stroke-width="1.5"/>
                <text x="48" y="82" text-anchor="middle" font-size="4" font-weight="900" fill="#008c82">地元</text><text x="48" y="87" text-anchor="middle" font-size="4" font-weight="900" fill="#e23845">LOVE</text>`;
        case "una":
            return `
                <path d="M15 18h66v88H15z" fill="#f5f7f5"/>
                <path d="M15 80h66v7H15z" fill="#15a8b7"/><path d="M15 88h66v6H15z" fill="#1676b7"/><path d="M15 95h66v4H15z" fill="#ee7a30"/>
                <path d="M42 25h12v70H42z" fill="#f6f8f6"/>
                <path d="M18 101c9-13 14 8 23-4s15-7 22-1 11 1 17-6" fill="none" stroke="#eb79b4" stroke-width="2.2"/>
                <path d="M21 100c8-8 14 6 22-3s14-4 19 0" fill="none" stroke="#32c6ce" stroke-width="2"/>
                <circle cx="68" cy="96" r="3" fill="#f0b2d0"/><text x="48" y="90" text-anchor="middle" font-size="5" font-weight="900" fill="#1680bf">THR</text>`;
        case "flower":
            return `
                <path d="M15 18h66v88H15z" fill="#175b36"/>
                <path d="M42 25h12v69H42z" fill="#17482f"/>
                <g fill="#fff4df"><circle cx="22" cy="80" r="2.2"/><circle cx="29" cy="91" r="1.7"/><circle cx="70" cy="83" r="2"/><circle cx="63" cy="96" r="1.8"/></g>
                <g fill="#ed7dab"><circle cx="21" cy="84" r="1.5"/><circle cx="31" cy="87" r="1.5"/><circle cx="68" cy="88" r="1.6"/><circle cx="75" cy="97" r="1.5"/></g>
                <path d="M17 101c13-12 23 7 33-2s18 1 30-8" fill="none" stroke="#9ecf82" stroke-width="2"/>
                <circle cx="48" cy="84" r="7" fill="#f6f4dc"/><path d="M43 85c5-8 9-3 10 0-3 4-7 5-10 0z" fill="#dc6e85"/>`;
        case "bike":
            return `
                <path d="M15 18h66v88H15z" fill="#a9dced"/>
                <path d="M15 18h66v19H15z" fill="#1f6f9c"/>
                <path d="M15 78l18-6 15 7 16-9 17 7v29H15z" fill="#e6f3f6"/>
                <path d="M42 25h12v69H42z" fill="#75c4df"/>
                <path d="M18 98c16-4 23 4 32-4s17-5 29-1" fill="none" stroke="#e75872" stroke-width="2"/>
                <g fill="none" stroke="#183f5c" stroke-width="1.4"><circle cx="43" cy="86" r="5"/><circle cx="56" cy="86" r="5"/><path d="M43 86l5-8 4 8h-9l5-5h6l2 5"/></g>
                <circle cx="48" cy="84" r="7" fill="#f7fbfb" opacity=".93"/><path d="M45 84l3-4 3 4-3 4z" fill="#235e7f"/>`;
        case "yurucamp":
            return `
                <path d="M15 18h66v88H15z" fill="#cfe8dd"/>
                <path d="M15 18h66v31H15z" fill="#168b82"/>
                <path d="M42 25h12v69H42z" fill="#287a55"/>
                <path d="M15 82l13-13 10 10 12-17 16 19 15-10v35H15z" fill="#f0a044"/>
                <path d="M15 90l13-10 10 8 11-14 15 16 17-9v25H15z" fill="#e8e3b7"/>
                <path d="M22 101l8-14 8 14zM62 102l7-13 8 13z" fill="#397947"/>
                <path d="M48 78l4 7h-8z" fill="#fff4cf"/><circle cx="48" cy="82" r="7" fill="none" stroke="#f7efe1" stroke-width="1.5"/>`;
        case "bee":
            return `
                <path d="M15 18h66v88H15z" fill="#f4d73d"/>
                <path d="M42 25h12v69H42z" fill="#f8e46a"/>
                <g fill="none" stroke="#bf8714" stroke-width="1.2" opacity=".8"><path d="M18 76l5-3 5 3v6l-5 3-5-3zM68 76l5-3 5 3v6l-5 3-5-3zM22 90l5-3 5 3v6l-5 3-5-3zM64 90l5-3 5 3v6l-5 3-5-3z"/></g>
                <g transform="translate(48 84)"><ellipse cx="0" cy="0" rx="8" ry="5" fill="#2d2a22"/><path d="M-5-3v6M0-4v8M5-3v6" stroke="#f6d53e" stroke-width="2"/><ellipse cx="-8" cy="-5" rx="4" ry="2.5" fill="#fff" opacity=".85"/><ellipse cx="8" cy="-5" rx="4" ry="2.5" fill="#fff" opacity=".85"/></g>
                <text x="48" y="101" text-anchor="middle" font-size="5" font-weight="900" fill="#3b3020">BEE HAPPY!</text>`;
        case "eva":
            return `
                <path d="M15 18h66v88H15z" fill="#563098"/>
                <path d="M42 25h12v69H42z" fill="#30205f"/>
                <path d="M15 80l25-10 14 10 27-15v41H15z" fill="#34bd98"/>
                <path d="M15 91l25-10 15 8 26-14v13L57 99l-16-8-26 10z" fill="#ef6a2d"/>
                <path d="M15 86l25-10 15 8 26-15" fill="none" stroke="#cfda31" stroke-width="3"/>
                <path d="M37 85l11-12 11 12-5-2-6 7-6-7z" fill="#171326" stroke="#f0aa31" stroke-width="1.5"/>
                <text x="48" y="102" text-anchor="middle" font-size="5" font-weight="900" fill="#efe8ff">EVA</text>`;
        case "wave":
            return `
                <path d="M15 18h66v88H15z" fill="#34aee1"/>
                <path d="M15 18h66v23H15z" fill="#d3eff7"/>
                <path d="M42 25h12v69H42z" fill="#158ac7"/>
                <path d="M15 82c17-16 26 11 42-2s17-6 24-3v29H15z" fill="#166bc1"/>
                <path d="M15 91c16-18 28 10 43-3s17-6 23-3" fill="none" stroke="#f5fbff" stroke-width="4"/>
                <path d="M15 99c17-15 27 8 43-2s17-6 23-4" fill="none" stroke="#f2d33f" stroke-width="3"/>
                <path d="M42 84l12-8v18H42z" fill="#d9f2f8" opacity=".55"/><text x="48" y="90" text-anchor="middle" font-size="5" font-weight="900" fill="#fff">C</text>`;
        case "katana":
            return `
                <path d="M15 18h66v88H15z" fill="#16294a"/>
                <path d="M42 25h12v69H42z" fill="#111b30"/>
                <path d="M15 91h66v15H15z" fill="#1e345a"/>
                <path d="M43 92l14-22" stroke="#f0f2f4" stroke-width="4"/><path d="M41 88l8 7" stroke="#d92332" stroke-width="3"/>
                <path d="M18 94h19v7H18z" fill="#f3f5f5"/><path d="M18 99h19v2H18z" fill="#de2730"/>
                <text x="48" y="87" text-anchor="middle" font-size="5" font-weight="900" fill="#fff">刀</text><text x="66" y="98" text-anchor="middle" font-size="4.5" font-weight="800" fill="#d9e2eb">KATANA</text>`;
        case "slow":
            return `
                <path d="M15 18h66v88H15z" fill="#28485b"/>
                <path d="M42 25h12v69H42z" fill="#243c4d"/>
                <path d="M15 91h66v15H15z" fill="#203948"/>
                <g fill="none" stroke="#bba267" stroke-width="1.4"><path d="M19 99c8-12 11 5 18-4M77 99c-8-12-11 5-18-4M22 91c5-8 9-7 13 0M74 91c-5-8-9-7-13 0"/><circle cx="27" cy="98" r="2"/><circle cx="69" cy="98" r="2"/></g>
                <path d="M43 79h10v13H43z" fill="#1d3444"/><text x="48" y="88" text-anchor="middle" font-size="4" font-weight="900" fill="#c8b27a">THR</text>`;
        default:
            return `
                <path d="M15 18h66v88H15z" fill="#f4f6f4"/>
                <path d="M42 25h12v69H42z" fill="#f5f7f5"/>
                <path d="M15 81h66v5H15z" fill="#159ba1"/><path d="M15 87h66v5H15z" fill="#ee7b2d"/><path d="M15 93h66v5H15z" fill="#1975b4"/>
                <path d="M42 81h12v17H42z" fill="#f5f7f5"/><text x="48" y="91" text-anchor="middle" font-size="5" font-weight="900" fill="#1880bd">THR</text>`;
    }
}

function getTh2100Icon(vehicleId, theme, label, size) {
    const id = `${label}-${size}`.replace(/[^a-zA-Z0-9-]/g, "");
    const doorColors = {
        re: "#f0d991",
        kiha: "#ead9b6",
        catalyzer: "#f7faf7",
        standard: "#f5f7f5",
        una: "#f5f7f5",
        flower: "#17482f",
        bike: "#75c4df",
        yurucamp: "#287a55",
        bee: "#f8e46a",
        eva: "#30205f",
        wave: "#158ac7",
        katana: "#111b30",
        slow: "#243c4d"
    };
    const doorColor = doorColors[theme.type] || theme.base;
    const doorMark = {
        re: '<text x="48" y="88" text-anchor="middle" font-size="5.2" font-weight="900" fill="#175c35">Re+</text>',
        kiha: `<text x="48" y="90" text-anchor="middle" font-size="4.1" font-weight="900" fill="#3b3329">${escapeHtml(vehicleId)}</text>`,
        catalyzer: '<circle cx="48" cy="84" r="6.3" fill="#fff" stroke="#e23845" stroke-width="1.2"/><text x="48" y="83" text-anchor="middle" font-size="3.4" font-weight="900" fill="#008c82">地元</text><text x="48" y="87" text-anchor="middle" font-size="3.2" font-weight="900" fill="#e23845">LOVE</text>',
        standard: '<text x="48" y="89" text-anchor="middle" font-size="4.5" font-weight="900" fill="#1880bd">THR</text>',
        una: '<circle cx="48" cy="84" r="6.5" fill="#f8f8f3" stroke="#ef78b2" stroke-width="1.2"/><text x="48" y="86" text-anchor="middle" font-size="4" font-weight="900" fill="#1680bf">音街</text>',
        flower: '<circle cx="48" cy="84" r="6.5" fill="#f6f4dc" stroke="#dfbe72" stroke-width="1.1"/><path d="M43 85c5-8 9-3 10 0-3 4-7 5-10 0z" fill="#dc6e85"/>',
        bike: '<circle cx="48" cy="84" r="6.5" fill="#f7fbfb" stroke="#235e7f" stroke-width="1.1"/><path d="M45 84l3-4 3 4-3 4z" fill="#235e7f"/>',
        yurucamp: '<path d="M42 88l6-11 6 11z" fill="#fff4cf" stroke="#397947" stroke-width="1.1"/><path d="M45 88l3-5 3 5z" fill="#e99343"/>',
        bee: '<g transform="translate(48 84)"><ellipse rx="6" ry="4" fill="#2d2a22"/><path d="M-3.5-3v6M0-4v8M3.5-3v6" stroke="#f6d53e" stroke-width="1.5"/></g>',
        eva: '<path d="M42 87l6-9 6 9-3-1-3 4-3-4z" fill="#171326" stroke="#f0aa31" stroke-width="1.2"/>',
        wave: '<text x="48" y="88" text-anchor="middle" font-size="8" font-weight="900" fill="#fff">C</text>',
        katana: '<path d="M43 90l10-15" stroke="#f0f2f4" stroke-width="3"/><path d="M42 86l6 5" stroke="#d92332" stroke-width="2.2"/><text x="49" y="89" text-anchor="middle" font-size="4.4" font-weight="900" fill="#fff">刀</text>',
        slow: '<text x="48" y="88" text-anchor="middle" font-size="4" font-weight="900" fill="#c8b27a">THR</text>'
    }[theme.type] || "";
    return `
        <svg class="tenhama-vehicle-icon ${escapeHtml(size)}" viewBox="0 0 96 108" role="img" aria-label="${escapeHtml(label)}の車両アイコン">
            <defs>
                <clipPath id="body-${id}"><path d="M13 25Q13 15 23 11Q48 3 73 11Q83 15 83 25V96Q83 101 77 103H19Q13 101 13 96z"/></clipPath>
                <linearGradient id="glass-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#253944"/><stop offset=".6" stop-color="#071117"/><stop offset="1" stop-color="#17272f"/></linearGradient>
                <linearGradient id="lamp-${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffde1"/><stop offset="1" stop-color="#e9d98d"/></linearGradient>
            </defs>
            <g transform="scale(1 .84)">
            <ellipse cx="48" cy="121" rx="35" ry="5" fill="rgba(0,0,0,.38)"/>
            <g fill="#8c999e" stroke="#4e595d" stroke-width="1"><path d="M7 42h7v27H9Q6 67 6 63V46q0-3 1-4z"/><path d="M89 42h-7v27h5q3-2 3-6V46q0-3-1-4z"/><path d="M13 48H8M83 48h5" fill="none"/></g>
            <path d="M13 25Q13 15 23 11Q48 3 73 11Q83 15 83 25V96Q83 101 77 103H19Q13 101 13 96z" fill="${theme.base}" stroke="#6f7d80" stroke-width="2"/>
            <g clip-path="url(#body-${id})">${getDetailedLivery(vehicleId, theme.type)}</g>
            <path d="M22 11Q48 3 74 11" fill="none" stroke="#c2cacc" stroke-width="1.7"/>
            <rect x="35" y="14" width="26" height="11" rx="1.5" fill="#182328" stroke="#88979a" stroke-width="1"/>
            <text x="48" y="21.5" text-anchor="middle" font-size="5.2" font-weight="800" fill="#ff8b3d">${escapeHtml(theme.destination)}</text>
            <path d="M17 30Q17 25 22 24H36Q39 24 39 28V70Q39 76 34 77H23Q17 76 17 70z" fill="url(#glass-${id})" stroke="#4f6067" stroke-width="1.35"/>
            <path d="M57 28Q57 24 60 24H74Q79 25 79 30V70Q79 76 73 77H62Q57 76 57 70z" fill="url(#glass-${id})" stroke="#4f6067" stroke-width="1.35"/>
            <g fill="#4b5356" stroke="#899397" stroke-width=".65">
                <rect x="20" y="27" width="16" height="10" rx="1.3"/><rect x="60" y="27" width="16" height="10" rx="1.3"/>
            </g>
            <g fill="url(#lamp-${id})" stroke="#958348" stroke-width=".55">
                <rect x="21.3" y="28.3" width="6.1" height="7.4" rx="1"/><rect x="28.6" y="28.3" width="6.1" height="7.4" rx="1"/>
                <rect x="61.3" y="28.3" width="6.1" height="7.4" rx="1"/><rect x="68.6" y="28.3" width="6.1" height="7.4" rx="1"/>
            </g>
            <path d="M19.5 71l14-14M76.5 71l-14-14" stroke="#b0c0c4" stroke-width="1.4"/>
            <path d="M37 28h22v68H37z" fill="${doorColor}" stroke="#65757b" stroke-width="1.5"/>
            <rect x="40" y="36" width="16" height="32" rx="2" fill="#122129" stroke="#778b92" stroke-width="1.1"/>
            <path d="M41.5 38h13M41.5 66h13" stroke="#3b515a" stroke-width=".85"/>
            <path d="M38.5 31v61M57.5 31v61" stroke="#b8c1c2" stroke-width=".55" stroke-dasharray="1.2 2.6"/>
            <path d="M53.5 72h1.8v8h-1.8z" fill="#747f82"/>
            ${doorMark}
            <g fill="#7e252c" stroke="#3f1d21" stroke-width=".55"><rect x="18" y="81" width="7" height="2.8" rx="1.2"/><rect x="71" y="81" width="7" height="2.8" rx="1.2"/></g>
            <path d="M18 91h12M66 91h12" stroke="#5c6669" stroke-width="2.2" stroke-linecap="round"/>
            <text x="69" y="87.5" text-anchor="middle" font-size="3.4" font-weight="800" fill="#30393c">${escapeHtml(vehicleId)}</text>
            <g fill="#89969a" stroke="#4a5559" stroke-width=".8"><path d="M18 101h8v16h-8zM70 101h8v16h-8z"/><path d="M28 102h8v15h-8zM60 102h8v15h-8z"/></g>
            <path d="M18 112h60v5H18z" fill="#68767a" stroke="#3e484c" stroke-width="1"/>
            <path d="M34 102v14M62 102v14" stroke="#252d30" stroke-width="3"/>
            <g fill="#525d61" stroke="#252d30" stroke-width="1"><rect x="40" y="104" width="16" height="10" rx="1.5"/><path d="M43 113h10v8H43z"/><path d="M38 119h20v4H38z"/></g>
            <path d="M39 107c-8 4-8 12-13 13M57 107c8 4 8 12 13 13" fill="none" stroke="#202729" stroke-width="1.5"/>
            </g>
        </svg>`;
}

function getThg101Icon(label, size) {
    const id = `thg-${size}`.replace(/[^a-zA-Z0-9-]/g, "");
    return `
        <svg class="tenhama-vehicle-icon ${escapeHtml(size)}" data-model="thg100" viewBox="0 0 100 112" role="img" aria-label="${escapeHtml(label)}の車両アイコン">
            <defs>
                <linearGradient id="thg-body-${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d7dddc"/><stop offset=".55" stop-color="#f0f1ee"/><stop offset="1" stop-color="#aeb8b8"/></linearGradient>
                <linearGradient id="thg-mask-${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1c2427"/><stop offset=".55" stop-color="#080d0f"/><stop offset="1" stop-color="#151b1d"/></linearGradient>
                <linearGradient id="thg-glass-${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#27383d"/><stop offset=".45" stop-color="#071013"/><stop offset="1" stop-color="#11191c"/></linearGradient>
                <filter id="thg-led-${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".65" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <ellipse cx="50" cy="107" rx="36" ry="4.2" fill="rgba(0,0,0,.48)"/>

            <!-- Smooth stainless body and the full-width black mask seen on THG101 -->
            <path d="M13 91V25Q13 9 50 5Q87 9 87 25v66q0 9-9 13H22q-9-4-9-13z" fill="url(#thg-body-${id})" stroke="#647277" stroke-width="2"/>
            <path d="M15 25Q15 12 50 8Q85 12 85 25v54Q76 86 70 93H30Q24 86 15 79z" fill="url(#thg-mask-${id})" stroke="#28363a" stroke-width="1.2"/>
            <path d="M17 22Q25 12 50 10Q75 12 83 22" fill="none" stroke="#f5f6f3" stroke-width="1.1" opacity=".8"/>

            <!-- Destination display, car number and compact LED light arrays -->
            <rect x="37" y="14" width="26" height="10" rx="1.2" fill="#263c35" stroke="#6c7d78" stroke-width=".8"/>
            <text x="50" y="19.2" text-anchor="middle" font-size="4.5" font-weight="900" fill="#e9eee3">掛川</text>
            <text x="50" y="22.2" text-anchor="middle" font-size="1.8" font-weight="700" fill="#c8d6ca">KAKEGAWA</text>
            <text x="72" y="20.2" text-anchor="middle" font-size="4.2" font-weight="900" fill="#f4f2fa">THG101</text>
            <g filter="url(#thg-led-${id})" fill="#f6eaff">
                <g transform="translate(21 27)"><circle cx="0" cy="0" r="1"/><circle cx="3" cy="0" r="1"/><circle cx="6" cy="0" r="1"/><circle cx="9" cy="0" r="1"/><circle cx="0" cy="3" r="1"/><circle cx="3" cy="3" r="1"/><circle cx="6" cy="3" r="1"/><circle cx="9" cy="3" r="1"/></g>
                <g transform="translate(70 27)"><circle cx="0" cy="0" r="1"/><circle cx="3" cy="0" r="1"/><circle cx="6" cy="0" r="1"/><circle cx="9" cy="0" r="1"/><circle cx="0" cy="3" r="1"/><circle cx="3" cy="3" r="1"/><circle cx="6" cy="3" r="1"/><circle cx="9" cy="3" r="1"/></g>
            </g>

            <!-- Large windscreens and the black gangway door -->
            <path d="M17 34h22v34H17q-2-4-2-9V40q0-4 2-6zM61 34h22q2 2 2 6v19q0 5-2 9H61z" fill="url(#thg-glass-${id})" stroke="#39494e" stroke-width="1.2"/>
            <path d="M39 25h22v59q0 6-4 9H43q-4-3-4-9z" fill="#090e10" stroke="#4d5c60" stroke-width="1.2"/>
            <rect x="43" y="35" width="14" height="27" rx="1.5" fill="#162328" stroke="#6f7d80" stroke-width="1"/>
            <path d="M44.5 37h11M44.5 60h11" stroke="#334449" stroke-width=".7"/>
            <path d="M35 61L20 72M65 61l15 11" stroke="#aebdc0" stroke-width="1.35" stroke-linecap="round"/>
            <path d="M23 69l10-7M77 69l-10-7" stroke="#46575c" stroke-width=".55"/>
            <path d="M55 66h1.8v7H55z" fill="#6e797b"/>

            <!-- Side mirrors -->
            <path d="M13 39h-3q-2 0-2 3v13q0 3 2 3h3M87 39h3q2 0 2 3v13q0 3-2 3h-3" fill="#9da8a9" stroke="#59676b" stroke-width="1"/>
            <path d="M9 43h4v11H9zM87 43h4v11h-4z" fill="#c8cfce"/>

            <!-- The three bands rise toward the centre instead of running straight -->
            <path d="M13 74h20q4 0 7 5l2 3H30q-2-3-6-3H13zM87 74H67q-4 0-7 5l-2 3h12q2-3 6-3h11z" fill="#f28a25"/>
            <path d="M13 80h16q4 0 7 4l3 4H27q-3-3-7-3h-7zM87 80H71q-4 0-7 4l-3 4h12q3-3 7-3h7z" fill="#149d69"/>
            <path d="M13 86h13q4 0 7 4l2 3h-9q-3-2-7-2h-6zM87 86H74q-4 0-7 4l-2 3h9q3-2 7-2h6z" fill="#2184bb"/>
            <path d="M13 79h17M70 79h17M13 85h14M73 85h14" stroke="#f1f1ed" stroke-width="1"/>

            <!-- Lower lamps, skirt and exposed coupling gear -->
            <g fill="#eef1ee" stroke="#899395" stroke-width=".65"><rect x="17" y="94" width="14" height="3.4" rx=".6"/><rect x="69" y="94" width="14" height="3.4" rx=".6"/></g>
            <path d="M16 99h18v7H16zM66 99h18v7H66z" fill="#aeb8b8" stroke="#596569" stroke-width=".8"/>
            <path d="M22 98v11M78 98v11M33 96v13M67 96v13" stroke="#697679" stroke-width="2.4"/>
            <g fill="#697477" stroke="#30393c" stroke-width="1"><rect x="40" y="94" width="20" height="9" rx="1.7"/><path d="M44 102h12v7H44z"/><path d="M36 108h28v3H36z"/></g>
            <path d="M41 99c-9 2-10 7-15 9M59 99c9 2 10 7 15 9" fill="none" stroke="#222a2d" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
}

export function getTenhamaVehicleIcon(vehicleId, size = "card") {
    const label = vehicleId || "天浜線車両";
    if (vehicleId === "THG101") return getThg101Icon(label, size);
    const theme = VEHICLE_ICON_THEMES[vehicleId] || VEHICLE_ICON_THEMES.TH2114;
    return getTh2100Icon(vehicleId || "TH2114", theme, label, size);
}

export function getTenhamaFleetGroups() {
    const vehicles = Object.entries(TENHAMA_VEHICLES).map(([vehicleId, vehicleName]) => ({
        vehicleId,
        vehicleName
    }));
    const byNumber = (a, b) => a.vehicleId.localeCompare(b.vehicleId, "ja", { numeric: true });

    return [
        {
            id: "th2100",
            label: "TH2100形",
            description: "天浜線の主力となる普通形気動車",
            vehicles: vehicles.filter(vehicle => /^TH21\d{2}$/.test(vehicle.vehicleId)).sort(byNumber)
        },
        {
            id: "th9200",
            label: "TH9200形",
            description: "観光列車 New スローライフトレイン",
            vehicles: vehicles.filter(vehicle => /^TH92\d{2}$/.test(vehicle.vehicleId)).sort(byNumber)
        },
        {
            id: "thg100",
            label: "THG100形",
            description: "電気式気動車 Green DEC",
            vehicles: vehicles.filter(vehicle => /^THG\d{3}$/.test(vehicle.vehicleId)).sort(byNumber)
        }
    ];
}

export function renderTenhamaFleet(container) {
    if (!container) return [];

    const groups = getTenhamaFleetGroups();
    const total = groups.reduce((sum, group) => sum + group.vehicles.length, 0);
    container.innerHTML = `
        <section class="tenhama-fleet-intro">
            <div>
                <span class="eyebrow">TENHAMA FLEET</span>
                <h3>天竜浜名湖線 編成表</h3>
                <p>現在掲載している${total}両を、形式と愛称・塗装ごとに一覧表示しています。</p>
            </div>
            <span class="tenhama-fleet-total">全${total}両</span>
        </section>
        ${groups.map(group => `
            <section class="tenhama-fleet-group" data-fleet-group="${escapeHtml(group.id)}">
                <header class="tenhama-fleet-group-head">
                    <div>
                        <h3>${escapeHtml(group.label)}</h3>
                        <p>${escapeHtml(group.description)}</p>
                    </div>
                    <span>${group.vehicles.length}両</span>
                </header>
                <div class="tenhama-fleet-grid">
                    ${group.vehicles.map(vehicle => `
                        <article class="tenhama-fleet-card">
                            <div class="tenhama-fleet-icon">${getTenhamaVehicleIcon(vehicle.vehicleId, "detail")}</div>
                            <div class="tenhama-fleet-card-copy">
                                <strong>${escapeHtml(vehicle.vehicleId)}</strong>
                                <span>${escapeHtml(vehicle.vehicleName)}</span>
                                <small>1両編成</small>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>
        `).join("")}
        <p class="tenhama-fleet-note">車両の愛称・塗装は掲載データに基づく一覧です。在線位置は時刻表からの推定表示で、実際の車両変更が反映されない場合があります。</p>
    `;

    return groups;
}

function getPosition(trip, currentMinute) {
    const stops = trip.stops;
    let currentIndex = 0;

    for (let index = 0; index < stops.length; index += 1) {
        if (stops[index].minute <= currentMinute) {
            currentIndex = index;
        } else {
            break;
        }
    }

    const current = stops[currentIndex];
    const next = stops[currentIndex + 1] || null;
    const span = next ? Math.max(1, next.minute - current.minute) : 1;
    const progress = next
        ? Math.max(0, Math.min(1, (currentMinute - current.minute) / span))
        : 1;

    return {
        current,
        next,
        progress,
        label: next
            ? `${current.station.name_ja} → ${next.station.name_ja}`
            : current.station.name_ja
    };
}

export function getActiveTenhamaTrains(date = new Date()) {
    const jst = getJstParts(date);
    const currentMinute = jst.hour * 60 + jst.minute;
    const vehicleAssignments = TENHAMA_SPECIAL_BY_DATE[jst.dateKey] || {};
    const active = [];

    for (const [trainNumber, rawTrip] of Object.entries(TENHAMA_TRIPS)) {
        const stops = rawTrip.s.map(([stationIndex, minute]) => ({
            stationIndex,
            station: TENHAMA_STATIONS[stationIndex],
            minute
        }));
        const first = stops[0];
        const last = stops[stops.length - 1];

        if (
            !first ||
            !last ||
            currentMinute < first.minute ||
            currentMinute > last.minute + 1
        ) {
            continue;
        }

        const vehicleId = vehicleAssignments[trainNumber] || "";
        const vehicleName = TENHAMA_VEHICLES[vehicleId] || "車両未掲載";
        const trip = {
            trainNumber,
            direction: rawTrip.d,
            stops,
            origin: first.station,
            destination: last.station,
            departureMinute: first.minute,
            arrivalMinute: last.minute,
            vehicleId,
            vehicleName,
            shortVehicleName: getShortVehicleName(vehicleName),
            featured: isFeaturedVehicle(vehicleId, vehicleName),
            dateKey: jst.dateKey
        };

        active.push({
            ...trip,
            position: getPosition(trip, currentMinute)
        });
    }

    return active.sort((a, b) => {
        if (a.position.current.stationIndex !== b.position.current.stationIndex) {
            return a.position.current.stationIndex - b.position.current.stationIndex;
        }
        return Number(a.trainNumber) - Number(b.trainNumber);
    });
}

export function getTenhamaRouteConfig() {
    return {
        mode: "tenhama",
        lineId: 3,
        label: "天竜浜名湖線",
        mainLabel: "天竜浜名湖線",
        mainStations: TENHAMA_STATIONS,
        branches: [],
        visibleStationIds: TENHAMA_STATIONS.map(station => station.id),
        placementAliases: {}
    };
}

function openTenhamaDetail(train) {
    const panel = document.getElementById("detailPanel");
    const content = document.getElementById("detailContent");
    const closeButton = document.getElementById("closeButton");

    if (!panel || !content) return;

    const close = () => window.closeTrainDetail?.();
    if (closeButton) closeButton.onclick = close;

    const rows = train.stops.map(stop => {
        const current = stop.stationIndex === train.position.current.stationIndex;
        const next = stop.stationIndex === train.position.next?.stationIndex;
        const marker = current ? "現在地側" : (next ? "次駅側" : "");
        return `
            <tr${current || next ? ' class="tenhama-current-stop"' : ""}>
                <td>${escapeHtml(stop.station.name_ja)}</td>
                <td>${escapeHtml(formatTenhamaMinute(stop.minute))}</td>
                <td>${escapeHtml(marker)}</td>
            </tr>
        `;
    }).join("");

    const vehicle = train.vehicleId
        ? `${train.vehicleId}　${train.vehicleName}`
        : "この日の公式車両予定には掲載なし";

    content.innerHTML = `
        <div class="tenhama-detail-title">
            ${getTenhamaVehicleIcon(train.vehicleId, "detail")}
            <h2>${escapeHtml(train.trainNumber)}列車</h2>
        </div>

        <div class="tenhama-detail-status">
            <strong>時刻表からの推定位置</strong>
            <span>${escapeHtml(train.position.label)}</span>
        </div>

        <p><b>運転区間</b></p>
        <p>${escapeHtml(train.origin.name_ja)} → ${escapeHtml(train.destination.name_ja)}</p>

        <p><b>始発時刻</b></p>
        <p>${escapeHtml(formatTenhamaMinute(train.departureMinute))}</p>

        <p><b>車両運行予定</b></p>
        <p>${escapeHtml(vehicle)}</p>

        <div class="detail-warning">
            リアルタイムGPSではありません。公式時刻表を基にした推定で、遅延・運休・臨時変更や車両変更は反映されない場合があります。
        </div>

        <h3>推定通過・発車時刻</h3>
        <table class="tenhama-timetable">
            <tr><th>駅</th><th>時刻</th><th>位置</th></tr>
            ${rows}
        </table>

        <p class="tenhama-source-links">
            <a href="https://www.tenhama.co.jp/about/timetable-2/" target="_blank" rel="noopener">公式時刻表</a>
            <a href="https://www.tenhama.co.jp/events/18847/" target="_blank" rel="noopener">特別車両運行予定</a>
            <a href="https://www.tenhama.co.jp/operation-status/" target="_blank" rel="noopener">運行情報</a>
        </p>
    `;

    panel.classList.add("open");
    document.body.classList.add("detail-open");
}

function createTrainCard(train) {
    const element = document.createElement("div");
    element.className = `train tenhama-train${train.featured ? " featured" : ""}`;
    element.dataset.trainNumber = train.trainNumber;
    element.dataset.vehicle = train.vehicleId;
    element.tabIndex = 0;
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", `${train.trainNumber}列車の推定位置詳細を開く`);

    const open = () => openTenhamaDetail(train);
    element.onclick = open;
    element.onkeydown = event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
        }
    };

    element.innerHTML = `
        ${train.featured ? '<div class="tenhama-special-badge">特別車両</div>' : ""}
        ${getTenhamaVehicleIcon(train.vehicleId)}
        <div class="train-kind">時刻表推定</div>
        <div class="train-number">${escapeHtml(train.trainNumber)}</div>
        <div class="train-cars">1両</div>
        <div class="train-formation">${escapeHtml(train.vehicleId || "車両未掲載")}</div>
        <div class="tenhama-vehicle-name">${escapeHtml(train.shortVehicleName)}</div>
    `;

    return element;
}

export function renderTenhamaTrains(date = new Date()) {
    const trains = getActiveTenhamaTrains(date);

    for (const train of trains) {
        const stationId = train.position.current.station.id;
        const stationElement = document.getElementById(`station-${stationId}`);
        const target = stationElement?.querySelector(
            train.direction === "up" ? ".up-track" : ".down-track"
        );
        target?.appendChild(createTrainCard(train));
    }

    const countElement = document.getElementById("visibleTrainCount");
    if (countElement) {
        countElement.textContent = `${trains.length}列車を時刻表から推定`;
    }

    const updateTime = document.getElementById("updateTime");
    if (updateTime) {
        const jst = getJstParts(date);
        updateTime.textContent = `推定基準 ${String(jst.hour).padStart(2, "0")}:${String(jst.minute).padStart(2, "0")}`;
    }

    return trains;
}
