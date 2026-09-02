from __future__ import annotations

import csv
import json
import re
from collections import Counter
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "generated"
OUT.mkdir(parents=True, exist_ok=True)


def read_csv(name: str):
    with (RAW / name).open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def number(value: str, integer: bool = False):
    try:
        return int(float(value)) if integer else float(value)
    except (TypeError, ValueError):
        return 0


def dump(name: str, value):
    with (OUT / name).open("w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, separators=(",", ":"))


def build_region_insights():
    rows = list(read_csv("KS_PHSTRN_LVLH_USE_INFO_202607.csv"))
    latest = max(row["BASE_YM"] for row in rows)
    regions = {}
    for row in rows:
        if row["BASE_YM"] != latest:
            continue
        key = f'{row["CTPRVN_NM"]} {row["SIGNGU_NM"]}'
        region = regions.setdefault(
            key,
            {
                "province": row["CTPRVN_NM"],
                "district": row["SIGNGU_NM"],
                "population": number(row["SIGNGU_ACCTO_POPLTN_CO"], True),
                "demands": [],
            },
        )
        region["demands"].append(
            {
                "category": row["MAIN_DMAND_FCLTY_FLAG_NM"],
                "facility": row["MAIN_DMAND_FCLTY_NM"],
                "count": number(row["SIGNGU_ACCTO_FCLTY_CO"], True),
                "perPerson": number(row["PSNBY_FCLTY_CO"]),
                "rank": number(row["PSNBY_FCL_CO_RANK_CO"], True),
            }
        )
    dump(
        "region-insights.json",
        {"sourceBaseMonth": latest, "regions": sorted(regions.values(), key=lambda x: (x["province"], x["district"]))},
    )


def build_facility_samples():
    candidates = defaultdict(list)
    for row in read_csv("KS_WNTY_PHSTRN_FCLTY_STTUS_202607.csv"):
        if row.get("FCLTY_STATE_VALUE") not in ("", "정상운영"):
            continue
        province = row.get("CTPRVN_NM", "").strip()
        district = row.get("SIGNGU_NM", "").strip()
        name = row.get("FCLTY_NM", "").strip()
        address = " ".join(filter(None, [row.get("RDNMADR_ONE_NM", "").strip(), row.get("RDNMADR_TWO_NM", "").strip()]))
        if not address:
            address = " ".join(filter(None, [row.get("FCLTY_ADDR_ONE_NM", "").strip(), row.get("FCLTY_ADDR_TWO_NM", "").strip()]))
        if not (province and district and name and address):
            continue
        item = {
            "name": name,
            "province": province,
            "district": district,
            "type": row.get("FCLTY_TY_NM", "").strip() or row.get("INDUTY_NM", "").strip(),
            "address": address,
            "longitude": number(row.get("FCLTY_LO", "")),
            "latitude": number(row.get("FCLTY_LA", "")),
            "phone": row.get("FCLTY_TEL_NO", "").strip(),
            "indoorOutdoor": row.get("NDOR_SDIV_NM", "").strip(),
            "owner": row.get("POSESN_MBY_NM", "").strip(),
        }
        score = int(bool(item["latitude"] and item["longitude"])) * 2 + int(bool(item["phone"])) + int("공공" in item["owner"])
        candidates[(province, district)].append((score, item))

    samples = []
    for items in candidates.values():
        seen_types = set()
        selected = []
        for _, item in sorted(items, key=lambda x: (-x[0], x[1]["name"])):
            facility_type = item["type"] or "기타"
            if facility_type not in seen_types or len(selected) < 4:
                selected.append(item)
                seen_types.add(facility_type)
            if len(selected) == 12:
                break
        samples.extend(selected)
    dump("facility-samples.json", {"selection": "지역별 대표 시설 최대 12개", "facilities": samples})


def build_school_facilities():
    schools = []
    for row in read_csv("KS_OPN_SCHUL_ALSFC_INFO_202607.csv"):
        schools.append(
            {
                "baseYear": row.get("BASE_YEAR", ""),
                "province": row.get("ALSFC_CTPRVN_NM", "").strip(),
                "district": row.get("ALSFC_SIGNGU_NM", "").strip(),
                "schoolType": row.get("SCHUL_TY_NM", "").strip(),
                "name": row.get("SCHUL_NM", "").strip(),
                "period": row.get("OPN_PD", "").strip(),
                "address": row.get("ALSFC_ADDR", "").strip(),
                "activities": row.get("OPER_ITEM_CN", "").strip(),
                "hours": row.get("OPER_TIME_CN", "").strip(),
            }
        )
    dump("school-facilities.json", {"recordCount": len(schools), "facilities": schools})


def prescription_exercises(value: str):
    """Return exercise names only; phase labels and individual measurements are excluded."""
    for phase in re.split(r"\s*/\s*", value or ""):
        body = phase.split(":", 1)[-1]
        for exercise in body.split(","):
            exercise = re.sub(r"\s+", " ", exercise).strip()
            if exercise:
                yield exercise


def build_fitness_guidance():
    age_group_counts = defaultdict(Counter)
    centers = {}
    record_count = 0
    prescribed_count = 0

    for row in read_csv("KS_LC_IFRA_FTNESS_MESURE_MVM_PRSCRPTN_INFO_202607.csv"):
        record_count += 1
        age_group = row.get("AGRDE_FLAG_NM", "").strip() or "미분류"
        exercises = list(prescription_exercises(row.get("MVM_PRSCRPTN_CN", "")))
        if exercises:
            prescribed_count += 1
            age_group_counts[age_group].update(exercises)

        center_name = row.get("CNTER_NM", "").strip()
        if center_name and center_name not in centers:
            address = " ".join(
                filter(
                    None,
                    [
                        row.get("CTPRVN_NM", "").strip(),
                        row.get("GUGUN_NM", "").strip(),
                        row.get("ROAD_NM", "").strip(),
                        row.get("BULD_NO", "").strip(),
                        row.get("DETAIL_ADDR", "").strip(),
                    ],
                )
            )
            centers[center_name] = {
                "name": center_name,
                "province": row.get("CTPRVN_NM", "").strip(),
                "district": row.get("GUGUN_NM", "").strip(),
                "address": address,
                "latitude": number(row.get("CNTER_LA", "")),
                "longitude": number(row.get("CNTER_LO", "")),
                "period": row.get("OPER_PD", "").strip(),
                "hours": row.get("OPER_TIME", "").strip(),
                "phone": row.get("REPRSNT_TEL_NO", "").strip(),
            }

    age_groups = []
    for age_group, counts in sorted(age_group_counts.items()):
        age_groups.append(
            {
                "ageGroup": age_group,
                "recordedExerciseMentions": sum(counts.values()),
                "topExercises": [
                    {"name": name, "count": count} for name, count in counts.most_common(12)
                ],
            }
        )

    dump(
        "fitness-guidance.json",
        {
            "privacy": "개인 식별자와 개인별 체력측정값은 제외하고 연령구분별 운동처방 빈도만 집계",
            "recordCount": record_count,
            "recordsWithPrescription": prescribed_count,
            "ageGroups": age_groups,
            "centerCount": len(centers),
            "centers": sorted(centers.values(), key=lambda item: (item["province"], item["district"], item["name"])),
        },
    )


if __name__ == "__main__":
    build_region_insights()
    build_facility_samples()
    build_school_facilities()
    build_fitness_guidance()
    for path in sorted(OUT.glob("*.json")):
        print(f"{path.name}: {path.stat().st_size:,} bytes")
