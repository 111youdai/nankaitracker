import importlib.util
import unittest
from datetime import date
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("update-tenhama-assignments.py")
SPEC = importlib.util.spec_from_file_location("update_tenhama_assignments", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class UpdateTenhamaAssignmentsTest(unittest.TestCase):
    def test_extracts_each_fixed_width_date_column(self):
        text = """        11/19(木）                  11/20(金）
列車番  発車時刻    発 駅    行 先   列車番  発車時刻    発 駅    行 先
 206   6:18 天竜二俣   掛川     802   6:38 宮口     天竜二俣
 109   7:14 掛川    新所原     210   6:49 天竜二俣   掛川
※始発駅以外の時刻に関しては時刻表にてご確認ください。
"""
        actual = MODULE.parse_layout_assignments(text, date(2026, 11, 19))
        self.assertEqual(actual["2026-11-19"], {"206", "109"})
        self.assertEqual(actual["2026-11-20"], {"802", "210"})

    def test_finds_pdf_links_under_each_vehicle(self):
        first = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf"
        second = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-1.pdf"
        html = f"""<dd>TH2105号車</dd><dd><a href='{first}'>11/16～</a></dd>
<dd>TH2113号車</dd><dd><a href='{second}'>11/16～</a></dd>"""
        self.assertEqual(
            MODULE.official_pdf_links(html),
            {"TH2105": [first], "TH2113": [second]},
        )

    def test_pdf_coordinates_keep_empty_columns_on_the_correct_date(self):
        items = [
            (77.2, 750.1, "11/19"), (221.4, 750.1, "11/20"),
            (181.9, 700.0, "322"), (205.0, 700.0, "9:00"),
            (36.6, 680.0, "109"), (60.0, 680.0, "7:14"),
        ]
        actual = MODULE.parse_positioned_assignments(items, date(2026, 11, 19))
        self.assertEqual(actual["2026-11-19"], {"109"})
        self.assertEqual(actual["2026-11-20"], {"322"})


if __name__ == "__main__":
    unittest.main()
