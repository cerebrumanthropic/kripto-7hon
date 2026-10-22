# Тайлангийн .md frontmatter-ийг задлах (validate). Сайтын build-д нэгтгэх нь scripts/lib/reports.ts (TS) хэвээр.
import re
from datetime import date
from typing import Any

import yaml

from kripto_api.schemas import Editorial

_FRONTMATTER = re.compile(r"\A﻿?---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.S)


def _normalize_dates(value: Any) -> Any:
    """YAML огноог «YYYY-MM-DD» мөр рүү буцаана (gray-matter-ийн адил)."""
    if isinstance(value, date):
        return value.isoformat()[:10]
    if isinstance(value, list):
        return [_normalize_dates(v) for v in value]
    if isinstance(value, dict):
        return {k: _normalize_dates(v) for k, v in value.items()}
    return value


def parse_frontmatter(source: str) -> tuple[dict[str, Any], str]:
    m = _FRONTMATTER.match(source)
    if not m:
        return {}, source
    data = yaml.safe_load(m[1]) or {}
    if not isinstance(data, dict):
        raise ValueError("frontmatter нь YAML объект биш")
    return _normalize_dates(data), source[m.end() :]


def parse_editorial(source: str) -> Editorial:
    fm, _ = parse_frontmatter(source)
    return Editorial.model_validate(fm)
