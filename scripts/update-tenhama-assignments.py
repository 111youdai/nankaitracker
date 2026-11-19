#!/usr/bin/env python3
"""Update Tenhama train-to-vehicle assignments from the official PDF tables."""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

from pypdf import PdfReader


OFFICIAL_PAGE = "https://www.tenhama.co.jp/events/18847/"
VEHICLE_PATTERN = re.compile(r"(?<![A-Z0-9])(THG101|TH(?:210[1-9]|211[0-4]|9200))(?![A-Z0-9])", re.I)
DATE_PATTERN = re.compile(r"(?<!\d)(\d{1,2})/(\d{1,2})(?!\d)")
TRAIN_PATTERN = re.compile(r"(?<!\d)(\d{3})(?=\s+\d{1,2}:\d{2})")
TIME_PATTERN = re.compile(r"\d{1,2}:\d{2}")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "NankaiTracker/1.0 (+https://111youdai.github.io/nankaitracker/)"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


class OfficialPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.current_vehicle: str | None = None
        self.pdfs: dict[str, list[str]] = defaultdict(list)

    def handle_data(self, data: str) -> None:
        match = VEHICLE_PATTERN.search(data.upper())
        if match:
            self.current_vehicle = match.group(1).upper()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a" or not self.current_vehicle:
            return
        href = dict(attrs).get("href") or ""
        filename = href.lower().split("?", 1)[0].rsplit("/", 1)[-1]
        if re.fullmatch(r"[a-f0-9]{32}(?:-\d+)?\.pdf", filename) and href not in self.pdfs[self.current_vehicle]:
            self.pdfs[self.current_vehicle].append(href)


def official_pdf_links(html: str) -> dict[str, list[str]]:
    parser = OfficialPageParser()
    parser.feed(html)
    return dict(parser.pdfs)


def service_date(month: int, day: int, reference: date) -> str:
    candidate = date(reference.year, month, day)
    difference = (candidate - reference).days
    if difference > 180:
        candidate = candidate.replace(year=candidate.year - 1)
    elif difference < -180:
        candidate = candidate.replace(year=candidate.year + 1)
    return candidate.isoformat()


def parse_layout_assignments(text: str, reference: date) -> dict[str, set[str]]:
    """Parse fixed-width columns emitted by pypdf's layout extraction mode."""
    result: dict[str, set[str]] = defaultdict(set)
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        header = lines[index]
        matches = list(DATE_PATTERN.finditer(header))
        if len(matches) < 1:
            index += 1
            continue

        dates = [service_date(int(match.group(1)), int(match.group(2)), reference) for match in matches]
        # The date is centred over a column; the train number begins about eight
        # layout characters earlier in every official table.
        starts = [max(0, match.start() - 8) for match in matches]
        index += 1
        while index < len(lines):
            line = lines[index]
            if DATE_PATTERN.search(line) or "始発駅以外の時刻" in line:
                break
            for column, day_key in enumerate(dates):
                start = starts[column]
                end = starts[column + 1] if column + 1 < len(starts) else len(line)
                segment = line[start:end]
                for train in TRAIN_PATTERN.findall(segment):
                    result[day_key].add(train)
            index += 1
        index += 1
    return dict(result)


def pdf_assignments(data: bytes, reference: date) -> dict[str, set[str]]:
    reader = PdfReader(io.BytesIO(data))
    merged: dict[str, set[str]] = defaultdict(set)
    for page in reader.pages:
        items: list[tuple[float, float, str]] = []

        def visit(text, _cm, tm, _font, _size):
            value = text.strip()
            if value:
                items.append((round(float(tm[4]), 1), round(float(tm[5]), 1), value))

        page.extract_text(visitor_text=visit)
        for day_key, trains in parse_positioned_assignments(items, reference).items():
            merged[day_key].update(trains)
    return dict(merged)


def parse_positioned_assignments(
    items: list[tuple[float, float, str]], reference: date
) -> dict[str, set[str]]:
    """Use PDF coordinates so empty cells cannot shift a train into another date."""
    headers_by_y: dict[float, list[tuple[float, str]]] = defaultdict(list)
    rows_by_y: dict[float, list[tuple[float, str]]] = defaultdict(list)
    for x, y, text in items:
        date_match = DATE_PATTERN.search(text)
        if date_match:
            day_key = service_date(int(date_match.group(1)), int(date_match.group(2)), reference)
            headers_by_y[y].append((x, day_key))
        rows_by_y[y].append((x, text))

    result: dict[str, set[str]] = defaultdict(set)
    header_rows = sorted(headers_by_y.items(), reverse=True)
    for position, (header_y, columns) in enumerate(header_rows):
        columns.sort()
        lower_header_y = header_rows[position + 1][0] if position + 1 < len(header_rows) else -1
        for row_y, row in rows_by_y.items():
            if not lower_header_y < row_y < header_y:
                continue
            if not any(TIME_PATTERN.fullmatch(text) for _, text in row):
                continue
            for x, text in row:
                if not re.fullmatch(r"\d{3}", text):
                    continue
                _, day_key = min(columns, key=lambda column: abs(column[0] - x))
                result[day_key].add(text)
    return dict(result)


def collect_assignments(reference: date, page_url: str = OFFICIAL_PAGE) -> dict[str, dict[str, str | list[str]]]:
    html = fetch(page_url).decode("utf-8", errors="replace")
    links = official_pdf_links(html)
    if len(links) < 10:
        raise RuntimeError(f"公式ページから車両運用PDFを十分に取得できませんでした: {len(links)}両")

    assignments: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    jobs = [(vehicle, url) for vehicle, urls in sorted(links.items()) for url in urls]
    downloaded: list[tuple[str, str, bytes]] = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        pending = {executor.submit(fetch, url): (vehicle, url) for vehicle, url in jobs}
        for future in as_completed(pending):
            vehicle, url = pending[future]
            downloaded.append((vehicle, url, future.result()))

    for vehicle, url, data in sorted(downloaded):
        for day_key, trains in pdf_assignments(data, reference).items():
            for train in trains:
                assignments[day_key][train].add(vehicle)

    if not assignments:
        raise RuntimeError("公式PDFから運用を1件も抽出できませんでした")
    return {
        day_key: {
            train: sorted(vehicles)[0] if len(vehicles) == 1 else sorted(vehicles)
            for train, vehicles in sorted(trains.items(), key=lambda item: int(item[0]))
        }
        for day_key, trains in sorted(assignments.items())
    }


def render_module(assignments: dict[str, dict[str, str | list[str]]]) -> str:
    first, last = min(assignments), max(assignments)
    payload = json.dumps(assignments, ensure_ascii=False, separators=(",", ":"))
    return (
        "// Generated automatically from the official Tenryu Hamanako Railway vehicle-operation PDFs.\n"
        f"// Covered service dates: {first} through {last}. Do not edit by hand.\n"
        f"export const TENHAMA_SPECIAL_BY_DATE = {payload};\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="tenhama-assignments.mjs")
    parser.add_argument("--reference-date", default=date.today().isoformat())
    args = parser.parse_args()
    reference = date.fromisoformat(args.reference_date)
    assignments = collect_assignments(reference)
    output = Path(args.output)
    output.write_text(render_module(assignments), encoding="utf-8")
    print(f"{output}: {len(assignments)}日分、{sum(len(x) for x in assignments.values())}件を更新")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"天浜線運用表の更新に失敗: {error}", file=sys.stderr)
        raise
