from __future__ import annotations

import math


def _euclidean(a: list[float], b: list[float]) -> float:
    dx = float(a[0]) - float(b[0])
    dy = float(a[1]) - float(b[1])
    return math.sqrt(dx * dx + dy * dy)


def calculate_ade(pred: list[list[float]], gt: list[list[float]]) -> float:
    n = min(len(pred), len(gt))
    if n <= 0:
        return 0.0

    total = 0.0
    used = 0
    for i in range(n):
        p = pred[i]
        g = gt[i]
        if not (isinstance(p, list) and len(p) >= 2 and isinstance(g, list) and len(g) >= 2):
            continue
        total += _euclidean(p, g)
        used += 1

    if used == 0:
        return 0.0
    return total / float(used)


def calculate_fde(pred: list[list[float]], gt: list[list[float]]) -> float:
    n = min(len(pred), len(gt))
    if n <= 0:
        return 0.0

    p = pred[n - 1]
    g = gt[n - 1]
    if not (isinstance(p, list) and len(p) >= 2 and isinstance(g, list) and len(g) >= 2):
        return 0.0
    return _euclidean(p, g)
