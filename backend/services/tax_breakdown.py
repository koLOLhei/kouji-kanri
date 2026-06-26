"""適格請求書(インボイス)の税率別区分計算。

明細(items)を税率(10% / 8%軽減 等)ごとに集計し、税率別の対価合計と消費税額を返す。
各明細に tax_rate があればそれを、無ければ請求書の既定税率を適用（後方互換）。
"""


def compute_tax_breakdown(items: list | None, default_rate: float) -> list[dict]:
    """items を税率ごとに集計。返り値: [{tax_rate, taxable_amount, tax_amount}] (税率降順)。"""
    groups: dict[float, int] = {}
    for it in items or []:
        if not isinstance(it, dict):
            continue
        amt = it.get("amount")
        if amt in (None, 0):
            qty = float(it.get("quantity") or it.get("qty") or 0)
            unit_price = float(it.get("unit_price") or it.get("sale_unit_price") or 0)
            amt = int(qty * unit_price)
        amt = int(amt or 0)
        if amt == 0:
            continue
        rate = it.get("tax_rate")
        rate = float(rate) if rate is not None else float(default_rate or 0)
        groups[rate] = groups.get(rate, 0) + amt

    out = []
    for rate in sorted(groups.keys(), reverse=True):
        taxable = groups[rate]
        out.append({
            "tax_rate": rate,
            "taxable_amount": taxable,
            "tax_amount": int(taxable * rate / 100),
        })
    return out
