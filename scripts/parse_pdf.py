#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parse '99 Recipes Under 99' PDF into structured recipe JSON for Zesto."""
import re, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ROOT / "scripts"
raw = (BASE / "_pdf_text.txt").read_text(encoding="utf-8")

DASH = "\u2013"  # en dash
KEEP_HYPHEN = {"golden-brown", "medium-high", "onion-tomato", "low-medium", "open-flame",
               "see-through", "sunny-side", "cast-iron", "indo-chinese", "stir-fry"}


def dehyphenate(t):
    def repl(m):
        a, b = m.group(1), m.group(2)
        if f"{a.lower()}-{b.lower()}" in KEEP_HYPHEN:
            return f"{a}-{b}"
        return a + b
    return re.sub(r"(\w+)-\n(\w+)", repl, t)


raw = dehyphenate(raw)

lines = []
for ln in raw.split("\n"):
    if ln.startswith("===== PAGE "):
        continue
    if re.fullmatch(r"\s*\d{1,3}\s*", ln):
        continue
    lines.append(ln.rstrip())
text = "\n".join(lines)

CHAPTERS = [
    "Ultra-Quick 5\u201310 Minute Meals",
    "Breakfast & Morning Meals",
    "Maggi/Noodles Reinvented",
    "Rice & One-Pot Meals",
    "Roti/Bread-Based Meals",
    "Egg-Based Meals",
    "Vegetarian Comfort Food",
    "Budget Snacks & Late-Night Hunger",
    "Sweet/Cheap Comfort Recipes",
    "Emergency \u201cAlmost Nothing Left\u201d Meals",
]
MEAL_TYPE_BY_CHAPTER = {
    "Ultra-Quick 5\u201310 Minute Meals": "any",
    "Breakfast & Morning Meals": "breakfast",
    "Maggi/Noodles Reinvented": "any",
    "Rice & One-Pot Meals": "main",
    "Roti/Bread-Based Meals": "main",
    "Egg-Based Meals": "main",
    "Vegetarian Comfort Food": "main",
    "Budget Snacks & Late-Night Hunger": "snack",
    "Sweet/Cheap Comfort Recipes": "dessert",
    "Emergency \u201cAlmost Nothing Left\u201d Meals": "main",
}

L = text.split("\n")

starts, expected = [], 1
for i, ln in enumerate(L):
    m = re.match(r"^(\d{1,2})\.\s+(\S.*)$", ln)
    if not m or int(m.group(1)) != expected:
        continue
    if "TIME:" not in "\n".join(L[i:i + 14]):
        continue
    starts.append((i, expected, m.group(2).strip()))
    expected += 1
    if expected > 99:
        break
assert len(starts) == 99, f"found {len(starts)}"

FRAC = {"\u00bc": 0.25, "\u00bd": 0.5, "\u00be": 0.75, "\u2153": 1 / 3, "\u2154": 2 / 3, "\u215b": 0.125}
UNIT_RE = (r"(cups?|tbsp|tsp|tablespoons?|teaspoons?|g|kg|ml|l|litres?|slices?|packs?|packets?|"
           r"cloves?|pinch(?:es)?|pieces?|eggs?|small|medium|large|handful|sprigs?|drops?)")

MODIFIER_ONLY = re.compile(
    r"^(and\s+)?(finely\s+|roughly\s+|thinly\s+|freshly\s+)?"
    r"(chopped|sliced|diced|minced|grated|crushed|mashed|boiled|peeled|beaten|shredded|cubed|"
    r"halved|quartered|torn|drained|rinsed|deseeded|deshelled|to taste|as needed|as required|"
    r"plus more|if available|if using|if you have it|or more|or to taste|optional|"
    r"for (cooking|frying|garnish|topping|serving|kneading|drizzling|the pan|greasing)|"
    r"cut into .*|about .*|roughly .*|preferably .*|leftover or fresh|a day old works best)\.?$", re.I)

BARE_NOUNS = {"salt", "pepper", "sugar", "oil", "ghee", "butter", "water", "milk", "curd",
              "turmeric", "coriander", "onion", "tomato", "garlic", "ginger", "jaggery", "honey",
              "lemon", "chilli flakes", "black pepper", "chaat masala", "garam masala",
              "cumin seeds", "mustard seeds", "red chilli powder", "chilli powder", "green chilli",
              "curry leaves", "cheese", "bread", "rice", "roti"}


def norm_frac(s):
    for f, v in FRAC.items():
        s = s.replace(f, f" {v} ")
    return s


def parse_qty(s):
    s2 = norm_frac(s).strip()
    m = re.match(r"^\s*([\d.]+(?:\s*[" + DASH + r"-]\s*[\d.]+)?)\s*" + UNIT_RE + r"?", s2, re.I)
    if not m or not m.group(1):
        if re.match(r"^\s*(a |an )\b", s, re.I):
            return 1.0, None
        if re.match(r"^\s*pinch", s, re.I):
            return None, "pinch"
        return None, None
    try:
        parts = re.split(r"\s*[" + DASH + r"-]\s*", m.group(1))
        qty = round(sum(float(p) for p in parts) / len(parts), 3)
    except ValueError:
        qty = None
    unit = (m.group(2) or "").lower() or None
    unit = {"tablespoons": "tbsp", "tablespoon": "tbsp", "teaspoons": "tsp", "teaspoon": "tsp",
            "slice": "slices", "pack": "packs", "packet": "packs", "packets": "packs",
            "clove": "cloves", "piece": "pieces", "egg": "eggs", "litres": "l", "litre": "l",
            "pinches": "pinch"}.get(unit, unit)
    return qty, unit


def clean_name(s):
    s = re.sub(r"^\s*(a |an |some |the )", "", s, flags=re.I)
    s = norm_frac(s)
    s = re.sub(r"^\s*[\d.\s/" + DASH + r"-]+", "", s)
    # strip a leading measure word only when a real noun follows it
    s = re.sub(r"^(cups?|tbsp|tsp|tablespoons?|teaspoons?|g|kg|ml|l|litres?|slices?|packs?|packets?|"
               r"handful|sprigs?|drops?|pinch(?:es)? of|squeeze of|drops? of|dash of|knob of|"
               r"glass of|block of|bunch of|handful of)\b\.?\s+(?=\S)", "", s, flags=re.I)
    s = re.split(r",| - |\(|\bto taste\b|\bor \b|\bfor \b|\bas needed\b|\bif \b", s)[0]
    return s.strip(" .").lower()


def split_ingredient_line(line):
    parts = [p.strip() for p in re.split(r",(?![^(]*\))|;| and (?=(?:\u00bd|\u00bc|\u00be|\d|a pinch|pinch))", line) if p.strip()]
    items = []
    for idx, p in enumerate(parts):
        if idx > 0 and MODIFIER_ONLY.match(p):
            continue
        if idx > 0:
            has_qty = bool(re.match(r"^\s*(\u00bd|\u00bc|\u00be|\u2153|\u2154|\u215b|\d|a |an |pinch|squeeze|few|dash|handful|small|medium|large)", p, re.I))
            nm = clean_name(p)
            if not (has_qty or nm in BARE_NOUNS):
                continue
        items.append(p)
    return items or [line]


def block_slice(block, start_kw, *end_kws):
    j = block.find(start_kw)
    if j == -1:
        return None
    si = j + len(start_kw)
    ei = len(block)
    for kw in end_kws:
        k = block.find(kw, si)
        if k != -1:
            ei = min(ei, k)
    return block[si:ei].strip()


def join_wrapped(chunk, numbered=False):
    out = []
    for ln in (chunk or "").split("\n"):
        ln = ln.strip()
        if not ln:
            continue
        if numbered:
            if re.match(r"^\d+\.\s", ln):
                out.append(re.sub(r"^\d+\.\s*", "", ln))
            elif out:
                out[-1] += " " + ln
            else:
                out.append(ln)
        else:
            if ln.startswith("\u2022"):
                out.append(ln[1:].strip())
            elif out:
                out[-1] += " " + ln
            else:
                out.append(ln)
    return out


def slugify(t):
    t = re.sub(r"\(.*?\)", "", t).strip().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


EQUIP_MAP = [
    (r"no cooking", "no-cook"),
    (r"rice cooker", "rice-cooker"),
    (r"microwave", "microwave"),
    (r"kettle", "kettle"),
    (r"tawa", "tawa"),
    (r"one pan|1 pan|frying pan|\ba pan\b|pan or tawa|tawa or pan|one tawa", "one-pan"),
    (r"one pot|1 pot|saucepan|\bpot\b", "one-pot"),
]


def norm_equipment(s):
    low = s.lower()
    out = []
    for pat, key in EQUIP_MAP:
        if re.search(pat, low) and key not in out:
            out.append(key)
    return out or ["one-pan"]


def chapter_at(idx):
    ch = CHAPTERS[0]
    for j in range(idx):
        if L[j].strip() in CHAPTERS:
            ch = L[j].strip()
    return ch


recipes = []
for si, (lidx, num, title) in enumerate(starts):
    end = starts[si + 1][0] if si + 1 < len(starts) else len(L)
    seg = []
    for ln in L[lidx + 1:end]:
        if ln.strip() in CHAPTERS:
            break
        seg.append(ln)
    block = "\n".join(seg)

    ti = block.find("TIME:")
    tagline = " ".join(x.strip() for x in block[:ti].split("\n") if x.strip())

    stats = "TIME:" + " ".join(x.strip() for x in (block_slice(block, "TIME:", "WHY YOU") or "").split("\n"))
    time_text = (re.search(r"TIME:\s*(.+?)\s+COST:", stats) or [None, ""])[1].strip()
    cost_m = re.search(r"COST:\s*\u20b9?\s*(\d+)", stats)
    serves_m = re.search(r"SERVES:\s*(\S+)", stats)
    equip_m = re.search(r"EQUIPMENT:\s*(.+?)\s+LEVEL:", stats)
    level_m = re.search(r"LEVEL:\s*([A-Za-z]+)", stats)

    tm = re.search(r"(\d+)(?:\s*[" + DASH + r"-]\s*(\d+))?\s*min", time_text)
    tmins = int(tm.group(2) or tm.group(1)) if tm else None
    needs_precooked = "pre-cooked" in time_text.lower() or "pre-made" in time_text.lower() or "pre-boiled" in time_text.lower()

    why = " ".join(x.strip() for x in (block_slice(block, "WHY YOU\u2019LL LOVE IT", "INGREDIENTS") or "").split("\n") if x.strip())

    ing_raw = block_slice(block, "INGREDIENTS", "METHOD") or ""
    ingredients = []
    for it in join_wrapped(ing_raw):
        for piece in split_ingredient_line(it):
            low = piece.lower()
            qty, unit = parse_qty(piece)
            ingredients.append({
                "raw": piece,
                "name": clean_name(piece),
                "quantity": qty,
                "unit": unit,
                "optional": "optional" in low or low.startswith("a few drops"),
            })

    steps = join_wrapped(block_slice(block, "METHOD", "Money Hack:", "COST BREAKDOWN"), numbered=True)
    money_hack = " ".join(x.strip() for x in (block_slice(block, "Money Hack:", "Swap It:", "COST BREAKDOWN") or "").split("\n") if x.strip())
    swap_it = block_slice(block, "Swap It:", "COST BREAKDOWN")
    if swap_it:
        swap_it = " ".join(x.strip() for x in swap_it.split("\n") if x.strip())

    cb_text = " ".join(x.strip() for x in (block_slice(block, "COST BREAKDOWN") or "").split("\n") if x.strip())
    cbm = re.match(r"(.*?(?:Estimated total|total)\s*[\u2014" + DASH + r"-]\s*\u20b9\s*\d+(?:\s*\([^)]*\))?\s*\.?)\s*(.*)$",
                   cb_text, re.S)
    if cbm:
        breakdown_text, closing_line = cbm.group(1).strip(), cbm.group(2).strip()
    else:
        breakdown_text, closing_line = cb_text, ""
    est_m = re.search(r"total\s*[" + DASH + r"\u2014-]\s*\u20b9?\s*(\d+)", breakdown_text)
    cost_items = []
    for part in re.split(r",(?![^(]*\))", breakdown_text.split("Estimated total")[0]):
        pm = re.search(r"(.+?)\s*[\u2014" + DASH + r"-]\s*\u20b9\s*(\d+)", part)
        if pm:
            cost_items.append({"item": pm.group(1).strip(" .\u2014-"), "cost_inr": int(pm.group(2))})

    headline_cost = int(cost_m.group(1)) if cost_m else None
    est_cost = int(est_m.group(1)) if est_m else headline_cost
    equip_text = equip_m.group(1).strip() if equip_m else "One pan"
    chapter = chapter_at(lidx)

    recipes.append({
        "number": num,
        "title": title,
        "slug": slugify(title),
        "tagline": tagline,
        "chapter": chapter,
        "meal_type": MEAL_TYPE_BY_CHAPTER[chapter],
        "time_text": time_text,
        "time_minutes": tmins,
        "needs_precooked_base": needs_precooked,
        "headline_cost_inr": headline_cost,
        "estimated_cost_inr": est_cost,
        "serves": int(serves_m.group(1)) if serves_m and serves_m.group(1).isdigit() else 1,
        "equipment_text": equip_text,
        "equipment": norm_equipment(equip_text),
        "level": level_m.group(1) if level_m else "Beginner",
        "why_youll_love_it": why,
        "ingredients": ingredients,
        "steps": steps,
        "money_hack": money_hack,
        "swap_it": swap_it,
        "cost_breakdown_text": breakdown_text,
        "cost_breakdown_items": cost_items,
        "closing_line": closing_line,
        "tags": [],
    })

# ---- authoritative lists ----
def nums_between(header, stop, blob):
    """Find the header occurrence that is the real section (followed by #NN refs),
    not the table-of-contents line."""
    start = 0
    best = ""
    while True:
        hi = blob.find(header, start)
        if hi == -1:
            break
        rest = blob[hi + len(header):]
        k = rest.find(stop) if stop else -1
        segment = rest[:k] if k != -1 else rest[:1500]
        if "#" in segment and re.search(r"#\d", segment):
            best = segment
            break
        start = hi + len(header)
    return sorted(set(int(x) for x in re.findall(r"#(\d{1,2})\b", best)))

blob = text
LISTS = {
    "situational:too-tired": ("10 Recipes for When You\u2019re Too Tired to Cook", "10 Filling Meals Under"),
    "situational:filling-cheap": ("10 Filling Meals Under \u20b930", "10 Midnight Hunger"),
    "situational:midnight": ("10 Midnight Hunger Fixes", "5 Recipes for When You Miss Home"),
    "situational:miss-home": ("5 Recipes for When You Miss Home", "Weekly Food Planner"),
    "situational:last-week-of-month": ("10 Meals for the Last Week of the Month", "10 Recipes for When You\u2019re Too Tired"),
    "diet:egg": ("Egg Recipes\n(20 recipes)", "Late-Night Recipes"),
    "index:no-cook": ("No cooking needed (13 recipes)", "One pan (69 recipes)"),
    "index:one-pot": ("One pot (9 recipes)", "Microwave (3 recipes)"),
    "index:kettle": ("Kettle (9 recipes)", "Tawa"),
    "index:microwave": ("Microwave (3 recipes)", "Kettle (9 recipes)"),
    "list:late-night": ("Late-Night Recipes", "\u201cAlmost Nothing Left\u201d Recipes"),
    "list:almost-nothing-left": ("\u201cAlmost Nothing Left\u201d Recipes", "Final Quality-Control"),
}
by_num = {r["number"]: r for r in recipes}
list_data = {}
for tag, (h, s) in LISTS.items():
    ns = nums_between(h, s, blob)
    list_data[tag] = ns
    for n in ns:
        if n in by_num and tag not in by_num[n]["tags"]:
            by_num[n]["tags"].append(tag)

for r in recipes:
    if "diet:egg" not in r["tags"]:
        r["tags"].append("diet:vegetarian")
    r["tags"].append("chapter:" + slugify(r["chapter"]))
    if r["time_minutes"] is not None:
        if r["time_minutes"] <= 5:
            r["tags"].append("time:5-min")
        if r["time_minutes"] <= 10:
            r["tags"].append("time:10-min")
        if r["time_minutes"] <= 15:
            r["tags"].append("time:15-min")
    if r["estimated_cost_inr"] is not None:
        for c in (10, 20, 30, 50, 99):
            if r["estimated_cost_inr"] <= c:
                r["tags"].append(f"budget:{c}")
    if "no-cook" in r["equipment"]:
        r["tags"].append("effort:no-cook")

out = {
    "source": "99 Recipes Under 99 \u2014 Quick, Cheap and Ridiculously Easy Meals for Students Who Are Broke, Busy and Hungry",
    "currency": "INR",
    "recipe_count": len(recipes),
    "curated_lists": list_data,
    "recipes": recipes,
}
(BASE / "recipes_raw.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

# ---- validation ----
import sys
w = sys.stdout
issues = 0
for r in recipes:
    if len(r["ingredients"]) == 0:
        w.write(f"NO INGREDIENTS #{r['number']}\n"); issues += 1
    if len(r["steps"]) < 2:
        w.write(f"FEW STEPS #{r['number']} {len(r['steps'])}\n"); issues += 1
    if not r["cost_breakdown_text"]:
        w.write(f"NO CB #{r['number']}\n"); issues += 1
    if not r["money_hack"]:
        w.write(f"NO MONEYHACK #{r['number']}\n"); issues += 1
    if not r["closing_line"]:
        w.write(f"NO CLOSING #{r['number']} {r['title']}\n"); issues += 1
    if r["headline_cost_inr"] is None or r["time_minutes"] is None:
        w.write(f"MISSING STAT #{r['number']}\n"); issues += 1
print("issues:", issues)
for k in ("situational:too-tired", "situational:midnight", "situational:filling-cheap",
          "situational:miss-home", "situational:last-week-of-month", "list:late-night"):
    print(f"  {k}: {len(list_data.get(k, []))}  -> {list_data.get(k)}")
print("egg:", sum('diet:egg' in r['tags'] for r in recipes), "/20")
print("veg:", sum('diet:vegetarian' in r['tags'] for r in recipes), "/79")
print("no-cook idx:", len(list_data['index:no-cook']), "/13")
print("<=15min:", sum(1 for r in recipes if r['time_minutes'] and r['time_minutes'] <= 15), "/82")
print("est<15:", sum(1 for r in recipes if r['estimated_cost_inr'] < 15), " est 16-30:",
      sum(1 for r in recipes if 15 <= r['estimated_cost_inr'] <= 30), " est>30:",
      sum(1 for r in recipes if r['estimated_cost_inr'] > 30), " (book idx: 28 / 69 / 2)")
print("head<15:", sum(1 for r in recipes if r['headline_cost_inr'] < 15), " 16-30:",
      sum(1 for r in recipes if 15 <= r['headline_cost_inr'] <= 30), " >30:",
      sum(1 for r in recipes if r['headline_cost_inr'] > 30))
import collections
names = collections.Counter()
for r in recipes:
    for i in r["ingredients"]:
        names[i["name"]] += 1
print("distinct ingredients:", len(names))
print("no-name items:", [i['raw'] for r in recipes for i in r['ingredients'] if not i['name']][:20])
