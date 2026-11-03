const sequences = Object.freeze({
    nankai: Array.from({ length: 42 }, (_, index) => index + 1),
    koya: Array.from({ length: 42 }, (_, index) => index + 95),
    semboku: [109, 152, 153, 154, 155, 156],
    takashinohama: [14, 62, 63],
    airport: [28, 76, 77],
    tanagawa: [37, 83, 82, 81],
    kada: [40, 88, 89, 90, 91, 92, 93, 94],
    shiomibashi: [137, 138, 139, 140, 141, 142]
});

const anchors = Object.freeze({
    nankai: {
        1: [34.663, 135.501], 3: [34.637, 135.496], 7: [34.609, 135.486],
        9: [34.581, 135.468], 14: [34.534, 135.442], 18: [34.503, 135.406],
        22: [34.460, 135.378], 24: [34.445, 135.357], 28: [34.410, 135.317],
        29: [34.399, 135.300], 33: [34.360, 135.240], 37: [34.325, 135.160],
        40: [34.251, 135.166], 41: [34.236, 135.167], 42: [34.220, 135.147]
    },
    koya: {
        95: [34.663, 135.501], 99: [34.637, 135.496], 102: [34.612, 135.499],
        106: [34.575, 135.483], 109: [34.557, 135.505], 113: [34.523, 135.543],
        116: [34.496, 135.558], 118: [34.468, 135.570], 119: [34.451, 135.573],
        123: [34.395, 135.595], 127: [34.319, 135.615], 130: [34.289, 135.563],
        136: [34.227, 135.574]
    },
    semboku: {
        109: [34.557, 135.505], 152: [34.530, 135.499], 153: [34.496, 135.512],
        154: [34.485, 135.490], 155: [34.474, 135.475], 156: [34.461, 135.457]
    },
    takashinohama: { 14: [34.534, 135.442], 62: [34.529, 135.438], 63: [34.523, 135.434] },
    airport: { 28: [34.410, 135.317], 76: [34.411, 135.300], 77: [34.435, 135.244] },
    tanagawa: { 37: [34.325, 135.160], 83: [34.318, 135.145], 82: [34.314, 135.140], 81: [34.311, 135.136] },
    kada: { 40: [34.251, 135.166], 88: [34.248, 135.143], 91: [34.257, 135.118], 94: [34.275, 135.074] },
    shiomibashi: { 137: [34.668, 135.482], 142: [34.629, 135.494] }
});

function interpolateSequence(sequence, known) {
    const result = new Map();
    const knownIndexes = sequence
        .map((id, index) => known[id] ? index : -1)
        .filter(index => index >= 0);

    for (let anchor = 0; anchor < knownIndexes.length - 1; anchor += 1) {
        const startIndex = knownIndexes[anchor];
        const endIndex = knownIndexes[anchor + 1];
        const start = known[sequence[startIndex]];
        const end = known[sequence[endIndex]];
        const span = endIndex - startIndex;

        for (let index = startIndex; index <= endIndex; index += 1) {
            const ratio = span ? (index - startIndex) / span : 0;
            result.set(Number(sequence[index]), [
                start[0] + ((end[0] - start[0]) * ratio),
                start[1] + ((end[1] - start[1]) * ratio)
            ]);
        }
    }
    return result;
}

const stationCoordinates = new Map();
for (const [route, sequence] of Object.entries(sequences)) {
    for (const [id, coordinate] of interpolateSequence(sequence, anchors[route])) {
        if (!stationCoordinates.has(id)) stationCoordinates.set(id, coordinate);
    }
}
stationCoordinates.set(151, stationCoordinates.get(109));
stationCoordinates.set(61, stationCoordinates.get(14));
stationCoordinates.set(75, stationCoordinates.get(28));
stationCoordinates.set(84, stationCoordinates.get(37));
stationCoordinates.set(87, stationCoordinates.get(40));

export const mapRoutes = Object.freeze([
    { id: "nankai", label: "南海本線", color: "#2f8cff", stationIds: sequences.nankai },
    { id: "koya", label: "高野線", color: "#22bd72", stationIds: sequences.koya },
    { id: "semboku", label: "泉北線", color: "#b9ca2d", stationIds: sequences.semboku },
    { id: "takashinohama", label: "高師浜線", color: "#ffa51f", stationIds: sequences.takashinohama },
    { id: "airport", label: "空港線", color: "#ffa51f", stationIds: sequences.airport },
    { id: "tanagawa", label: "多奈川線", color: "#ffa51f", stationIds: sequences.tanagawa },
    { id: "kada", label: "加太線", color: "#ffa51f", stationIds: sequences.kada },
    { id: "shiomibashi", label: "汐見橋線", color: "#ffa51f", stationIds: sequences.shiomibashi }
]);

export function getStationCoordinate(stationId) {
    return stationCoordinates.get(Number(stationId)) || null;
}

export function getTrainCoordinate(train) {
    const current = getStationCoordinate(train?.station_id);
    const next = getStationCoordinate(train?.next_station_id);
    if (!current) return next;
    if (!next) return current;
    return [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2];
}

export function getRouteCoordinates(route) {
    return route.stationIds.map(getStationCoordinate).filter(Boolean);
}

export function projectCoordinate([latitude, longitude], width = 1000, height = 760) {
    const bounds = { north: 34.69, south: 34.19, west: 135.03, east: 135.66 };
    return {
        x: ((longitude - bounds.west) / (bounds.east - bounds.west)) * width,
        y: ((bounds.north - latitude) / (bounds.north - bounds.south)) * height
    };
}
