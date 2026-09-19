"""Read-only comparison of the upstream authoring workbooks and exported JSON.

Usage: python scripts/audit-officer-workbooks.py <source-project> <output.json>
Requires openpyxl. Never saves or recalculates the source workbooks.
"""
import hashlib
import json
import pathlib
import sys

import openpyxl

project = pathlib.Path(sys.argv[1])
output = pathlib.Path(sys.argv[2])
specs = [
    ("PersonLibrary_武将库.xlsx", "PersonLibrary"),
    ("Personality_性格.xlsx", "Personalities"),
    ("Argumentation_义理.xlsx", "Argumentations"),
]
report = {"tables": []}
for filename, table in specs:
    path = project / "Data/Export/Common" / filename
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = workbook[table]
    rows = list(sheet.values)
    headers, types = rows[2], rows[3]
    fields = [(i, key, types[i]) for i, key in enumerate(headers)
              if key and key != "#" and types[i] and types[i] != "#"]
    source_path = project / "Build/Content/Data/Common" / (table + ".json")
    source = json.loads(source_path.read_text(encoding="utf-8-sig"))[table]
    result = {"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
              "sourceJsonPath": str(source_path), "sourceJsonSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
              "sheet": table, "fields": [key for _, key, _ in fields],
              "rowCount": 0, "cellsCompared": 0, "differences": [], "samples": []}
    ids = set()
    for row_number, row in enumerate(rows[4:], 5):
        if row[0] == "#" or row[1] in (None, ""):
            continue
        source_id = str(int(row[1]))
        if source_id in ids:
            result["differences"].append({"row": row_number, "duplicateId": source_id})
        ids.add(source_id)
        result["rowCount"] += 1
        if source_id not in source:
            result["differences"].append({"row": row_number, "missingJsonId": source_id})
            continue
        for index, key, kind in fields:
            value = row[index]
            # The exporter omits empty cells; preserve numeric zero and array order.
            if value in (None, ""):
                value = None
            elif kind == "ai32":
                value = [int(v) for v in str(value).split(",")]
            elif kind != "s":
                value = int(value)
            else:
                value = str(value)
            exported = source[source_id].get(key)
            result["cellsCompared"] += 1
            if value != exported:
                result["differences"].append({"id": source_id, "name": row[2], "field": key,
                                              "cell": f"{openpyxl.utils.get_column_letter(index + 1)}{row_number}",
                                              "xlsx": value, "json": exported})
        if table == "PersonLibrary" and row[2] in ["关羽", "张飞", "刘备", "吕布", "诸葛亮", "周瑜", "曹操", "赵云"]:
            result["samples"].append({"id": source_id, "name": row[2], "row": row_number,
                                      "argumentation": row[36], "argumentationText": row[37],
                                      "personality": row[40], "personalityText": row[41]})
    result["missingWorkbookIds"] = sorted(set(source) - ids, key=int)
    workbook.close()
    report["tables"].append(result)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps([{k: v for k, v in table.items() if k not in ("samples", "fields", "differences")} |
                  {"differenceCount": len(table["differences"]), "examples": table["differences"][:8]}
                  for table in report["tables"]], ensure_ascii=False, indent=2))
