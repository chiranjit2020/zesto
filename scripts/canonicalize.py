# -*- coding: utf-8 -*-
"""Canonicalise recipe ingredients + estimate nutrition -> final seed data."""
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ROOT / "scripts"
data = json.load(open(BASE / "recipes_raw.json", encoding="utf-8"))

# canonical ingredient: id -> (display, category, is_staple, aliases[], shelf_life_days|None)
# is_staple => cheap/always-assumed; doesn't count against pantry match.
CANON = {
    # ---- staples (assumed on hand) ----
    "salt":            ("Salt", "seasoning", True, ["salt", "salt and pepper", "salt to taste"], None),
    "cooking-oil":     ("Cooking oil", "oil-fat", True, ["oil", "mustard oil", "any oil", "ghee or oil", "oil or ghee"], None),
    "turmeric":        ("Turmeric", "spice", True, ["turmeric"], None),
    "red-chilli-powder": ("Red chilli powder", "spice", True, ["red chilli powder", "chilli powder", "chilli sauce or chilli powder"], None),
    "chilli-flakes":   ("Chilli flakes", "spice", True, ["chilli flakes", "chilli flakes or oregano", "chilli flakes or pepper", "oregano or chilli flakes"], None),
    "black-pepper":    ("Black pepper", "spice", True, ["pepper", "black pepper"], None),
    "chaat-masala":    ("Chaat masala", "spice", True, ["chaat masala", "chaat masala or salt", "chaat masala or red chilli powder"], None),
    "garam-masala":    ("Garam masala", "spice", True, ["garam masala"], None),
    "cumin-seeds":     ("Cumin seeds", "spice", True, ["cumin seeds", "carom seeds", "carom seeds  or cumin seeds"], None),
    "mustard-seeds":   ("Mustard seeds", "spice", True, ["mustard seeds", "curry leaves or a pinch of mustard seeds"], None),
    "cardamom":        ("Cardamom", "spice", True, ["cardamom powder", "cardamom", "cinnamon or cardamom powder"], None),
    "cinnamon":        ("Cinnamon", "spice", True, ["cinnamon", "small piece cinnamon", "small piece of cinnamon"], None),
    "bay-leaf":        ("Bay leaf", "spice", True, ["bay leaf"], None),
    "clove-spice":     ("Clove (spice)", "spice", True, ["clove", "small piece cinnamon or 1 clove"], None),
    "oregano":         ("Oregano", "spice", True, ["oregano", "oregano or chilli flakes"], None),
    "sugar":           ("Sugar", "sweetener", True, ["sugar", "sugar or jaggery", "jaggery or sugar", "honey or sugar"], None),
    "water":           ("Water", "other", True, ["water", "cold water", "little water", "splash of water", "warm water"], None),
    "baking-soda":     ("Baking soda", "other", True, ["baking soda"], None),
    "cornflour":       ("Cornflour", "pantry", True, ["cornflour"], None),
    "vinegar":         ("Vinegar", "condiment", True, ["vinegar", "soy sauce or vinegar"], None),

    # ---- proteins ----
    "egg":             ("Eggs", "protein", False, ["egg", "eggs"], 14),
    "paneer":          ("Paneer", "protein", False, ["paneer"], 3),
    "curd":            ("Curd (yoghurt)", "dairy", False, ["curd", "dollop of curd", "milk or curd", "curd  or a mix of both"], 5),
    "milk":            ("Milk", "dairy", False, ["milk", "milk and water mixed", "milk  or curd"], 3),
    "butter":          ("Butter", "oil-fat", False, ["butter", "butter or ghee", "butter per slice", "butter  for toasting"], 30),
    "ghee":            ("Ghee", "oil-fat", False, ["ghee", "ghee or oil"], 90),
    "cheese-slice":    ("Cheese slice", "dairy", False, ["cheese slice", "processed cheese slice", "grated cheese", "grated cheese or 1 cheese slice", "cheese slice or a sprinkle of grated cheese", "cheese slice or a small handful of grated cheese"], 20),
    "boiled-chickpeas": ("Boiled chickpeas (chana)", "protein", False, ["boiled chickpeas", "chickpeas", "chana"], 3),
    "rajma":           ("Rajma (kidney beans)", "protein", False, ["boiled rajma", "rajma", "kidney beans"], 3),
    "moong-dal":       ("Moong dal", "pulse", False, ["yellow moong dal", "moong dal", "toor or moong dal", "moong dal or toor dal", "yellow moong dal or toor dal", "dal"], 180),
    "toor-dal":        ("Toor dal", "pulse", False, ["toor dal", "toor"], 180),
    "sprouted-moong":  ("Sprouted moong", "protein", False, ["sprouted moong"], 3),
    "peanut-butter":   ("Peanut butter", "protein", False, ["peanut butter"], 120),
    "peanuts":         ("Peanuts", "protein", False, ["peanuts", "roasted peanuts", "crushed peanuts", "chopped nuts", "nuts", "nuts or raisins", "few peanuts", "few nuts", "few roasted peanuts", "few crushed peanuts", "chopped nuts "], 120),

    # ---- bases / grains ----
    "rice":            ("Rice", "grain", False, ["rice", "cooked rice", "cooked", "day-old rice"], 60),
    "bread":           ("Bread", "grain", False, ["bread"], 4),
    "roti":            ("Roti / chapati", "grain", False, ["roti", "roti or chapati", "chapati", "leftover rotis", "roti or plain paratha", "roti or paratha"], 2),
    "atta":            ("Atta (wheat flour)", "grain", False, ["atta", "wheat flour", "atta or plain flour", "atta  or plain flour", "plain flour", "flour"], 120),
    "maggi-noodles":   ("Maggi / instant noodles", "grain", False, ["maggi noodles", "maggi", "leftover cooked maggi", "instant noodles", "noodles"], 180),
    "poha":            ("Poha (flattened rice)", "grain", False, ["poha", "thin poha", "flattened rice"], 120),
    "vermicelli":      ("Vermicelli (semiya)", "grain", False, ["thin vermicelli", "vermicelli"], 120),
    "sooji":           ("Sooji (semolina)", "grain", False, ["sooji", "semolina"], 120),
    "dalia":           ("Dalia (broken wheat)", "grain", False, ["dalia", "broken wheat"], 120),
    "rolled-oats":     ("Rolled oats", "grain", False, ["rolled oats", "oats"], 120),
    "besan":           ("Besan (gram flour)", "grain", False, ["besan", "gram flour"], 90),
    "puffed-rice":     ("Puffed rice (muri)", "grain", False, ["puffed rice", "muri"], 60),
    "makhana":         ("Makhana (fox nuts)", "snack", False, ["makhana", "fox nuts"], 120),
    "popcorn-kernels": ("Popcorn kernels", "snack", False, ["popcorn kernels"], 180),
    "banana-chips":    ("Banana chips", "snack", False, ["banana chips"], 30),
    "papad":           ("Papad", "snack", False, ["papad", "papads"], 120),
    "biscuits":        ("Biscuits", "snack", False, ["biscuits", "parle-g"], 60),
    "rusks":           ("Rusks", "snack", False, ["rusks", "rusk"], 60),

    # ---- vegetables ----
    "onion":           ("Onion", "vegetable", False, ["onion", "small onion", "cucumber or onion"], 20),
    "tomato":          ("Tomato", "vegetable", False, ["tomato", "tomatoes"], 7),
    "potato":          ("Potato", "vegetable", False, ["potato", "small potato", "medium potato", "medium potatoes", "potatoes"], 20),
    "capsicum":        ("Capsicum (bell pepper)", "vegetable", False, ["capsicum", "capsicums", "bell peppers", "bell pepper"], 7),
    "carrot":          ("Carrot", "vegetable", False, ["carrot", "small carrot"], 14),
    "cucumber":        ("Cucumber", "vegetable", False, ["cucumber"], 5),
    "spinach":         ("Spinach", "vegetable", False, ["spinach leaves", "spinach", "palak"], 3),
    "eggplant":        ("Eggplant (baingan)", "vegetable", False, ["eggplant", "baingan", "medium eggplant"], 5),
    "peas":            ("Peas", "vegetable", False, ["peas", "frozen peas", "peas or mixed vegetables", "peas  carrot  beans"], 90),
    "mixed-vegetables": ("Mixed vegetables", "vegetable", False, ["mixed vegetables", "vegetable scraps", "vegetable scraps or frozen peas", "pieces of any vegetable you have", "any vegetable", "few pieces of any vegetable you have"], 5),
    "green-chilli":    ("Green chilli", "vegetable", False, ["green chilli", "green chillies"], 10),
    "garlic":          ("Garlic", "vegetable", False, ["garlic", "clove garlic", "cloves garlic"], 30),
    "ginger":          ("Ginger", "vegetable", False, ["ginger", "small piece of ginger", "piece of ginger"], 21),
    "curry-leaves":    ("Curry leaves", "herb", False, ["curry leaves", "few curry leaves", "small handful curry leaves"], 7),
    "coriander":       ("Coriander leaves", "herb", False, ["coriander", "chopped coriander", "spring onion or coriander", "coriander chutney"], 4),
    "mint":            ("Mint", "herb", False, ["mint", "mint or coriander chutney"], 4),
    "spring-onion":    ("Spring onion", "herb", False, ["spring onion", "chopped spring onion"], 7),

    # ---- fruit / sweet ----
    "banana":          ("Banana", "fruit", False, ["banana", "small banana", "ripe banana", "banana slices", "few banana slices"], 5),
    "lemon":           ("Lemon", "fruit", False, ["lemon", "squeeze of lemon", "juice of 1 lemon", "juice of lemon"], 14),
    "jaggery":         ("Jaggery", "sweetener", False, ["jaggery", "jaggery or sugar"], 180),
    "honey":           ("Honey", "sweetener", False, ["honey", "honey or sugar"], 365),
    "cocoa-powder":    ("Cocoa powder", "pantry", False, ["cocoa powder"], 365),
    "desiccated-coconut": ("Desiccated coconut", "pantry", False, ["desiccated coconut", "coconut"], 90),
    "coconut-milk":    ("Coconut milk", "pantry", False, ["coconut milk"], 4),

    # ---- condiments ----
    "ketchup":         ("Tomato ketchup", "condiment", False, ["ketchup", "tomato ketchup", "ketchup or chutney", "ketchup or tomato chutney", "tomato chutney"], 60),
    "soy-sauce":       ("Soy sauce", "condiment", False, ["soy sauce", "few drops of soy sauce"], 180),
    "chilli-sauce":    ("Chilli sauce", "condiment", False, ["chilli sauce"], 180),
    "chutney":         ("Chutney", "condiment", False, ["chutney", "mint chutney", "mint or coriander chutney"], 7),
    "tea-leaves":      ("Tea leaves", "pantry", False, ["tea leaves", "tea bag", "tea leaves  or 1 tea bag"], 180),
    "leftover-sabzi":  ("Leftover sabzi", "leftover", False, ["leftover sabzi", "leftover sabzi ", "sabzi", "vegetable curry"], 2),
}

# build alias -> id (longest alias first)
alias_map = []
for cid, (disp, cat, staple, aliases, shelf) in CANON.items():
    for a in set(aliases + [cid.replace("-", " ")]):
        alias_map.append((a.lower().strip(), cid))
alias_map.sort(key=lambda t: -len(t[0]))

MANUAL = {
    "salt and pepper": ["salt", "black-pepper"],
    "salt and pepper to taste": ["salt", "black-pepper"],
}

def canonicalise(name, raw):
    n = name.lower().strip()
    if n in MANUAL:
        return MANUAL[n]
    for a, cid in alias_map:
        if re.search(r"\b" + re.escape(a) + r"\b", n):
            return [cid]
    # try raw
    rl = raw.lower()
    for a, cid in alias_map:
        if a in rl:
            return [cid]
    return []

# ---- nutrition: kcal & macros per canonical unit ----
# (kcal, protein, carbs, fat, fibre) for a "typical single use" in these recipes
PORTION_NUTRITION = {
    "egg": (65, 5.5, 0.4, 4.5, 0),          # per egg
    "paneer": (265, 14, 3, 21, 0),          # per 100g
    "curd": (60, 3.5, 4.5, 3, 0),           # per ½ cup
    "milk": (75, 4, 6, 4, 0),               # per ½ cup
    "butter": (35, 0, 0, 4, 0),             # per tsp
    "ghee": (40, 0, 0, 4.5, 0),
    "cheese-slice": (60, 3.5, 1, 4.5, 0),
    "cooking-oil": (40, 0, 0, 4.5, 0),      # per tsp
    "boiled-chickpeas": (135, 7, 22, 2, 6), # per ½ cup
    "rajma": (120, 8, 22, 0.5, 6),
    "moong-dal": (170, 12, 30, 0.5, 8),     # per ¼ cup raw
    "toor-dal": (170, 11, 30, 0.6, 8),
    "sprouted-moong": (120, 8, 20, 0.5, 5),
    "peanut-butter": (95, 4, 3, 8, 1),      # per tbsp
    "peanuts": (85, 4, 3, 7, 1.5),          # per tbsp
    "rice": (135, 2.7, 30, 0.3, 0.5),       # per ½ cup cooked
    "bread": (70, 2.5, 13, 1, 0.7),         # per slice
    "roti": (105, 3, 20, 2, 2),             # per roti
    "atta": (110, 4, 22, 0.5, 3),           # per ¼ cup
    "maggi-noodles": (350, 8, 45, 15, 2),   # per packet
    "poha": (110, 2, 24, 0.5, 1),           # per ½ cup
    "vermicelli": (110, 3, 22, 0.5, 1),
    "sooji": (170, 6, 34, 0.5, 2),          # per ½ cup
    "dalia": (110, 4, 22, 0.5, 3),          # per ¼ cup
    "rolled-oats": (150, 5, 27, 3, 4),      # per ½ cup
    "besan": (100, 5, 15, 2, 3),            # per ¼ cup
    "puffed-rice": (55, 1, 12, 0.1, 0.2),   # per cup
    "makhana": (105, 3, 20, 0.1, 1),        # per cup
    "popcorn-kernels": (110, 3, 22, 1.3, 4),
    "banana-chips": (500, 2, 55, 32, 3),    # per cup
    "papad": (35, 2, 5, 0.4, 0.5),          # each
    "biscuits": (110, 1.5, 16, 4, 0.3),     # ~4 biscuits
    "rusks": (110, 2, 20, 2.5, 0.5),
    "onion": (16, 0.5, 3.7, 0, 0.7),        # per ¼ onion
    "tomato": (11, 0.5, 2.4, 0.1, 0.7),     # per ½
    "potato": (110, 3, 25, 0.2, 2.5),       # per medium
    "capsicum": (12, 0.5, 2.5, 0.1, 1),
    "carrot": (12, 0.3, 3, 0.1, 0.8),
    "cucumber": (8, 0.3, 2, 0.1, 0.3),
    "spinach": (10, 1, 1.5, 0.1, 1),        # per cup
    "eggplant": (35, 1, 8, 0.2, 4),
    "peas": (60, 4, 10, 0.3, 4),            # per ½ cup
    "mixed-vegetables": (45, 2, 9, 0.2, 3),
    "green-chilli": (4, 0.2, 0.8, 0, 0.3),
    "garlic": (5, 0.2, 1, 0, 0.1),
    "ginger": (5, 0.1, 1, 0, 0.1),
    "banana": (95, 1.2, 24, 0.3, 2.6),
    "lemon": (4, 0.1, 1.3, 0, 0.4),
    "jaggery": (40, 0, 10, 0, 0),           # per tbsp
    "honey": (60, 0, 16, 0, 0),
    "sugar": (40, 0, 10, 0, 0),             # per tbsp when a real qty; staple pinch -> 0
    "cocoa-powder": (12, 1, 3, 0.7, 2),
    "desiccated-coconut": (60, 0.6, 2, 6, 1.5),
    "coconut-milk": (110, 1, 3, 11, 0),     # per ½ cup
    "ketchup": (15, 0.2, 4, 0, 0),
    "soy-sauce": (8, 1, 1, 0, 0),
    "leftover-sabzi": (120, 3, 12, 7, 3),
}
UNIT_SCALE = {  # multiply portion nutrition by this for the given unit
    "tsp": {"cooking-oil": 1, "butter": 1, "ghee": 1, "default": 0.4},
    "tbsp": {"peanuts": 1, "peanut-butter": 1.5, "jaggery": 1, "sugar": 1, "honey": 1,
             "cooking-oil": 3, "besan": 0.75, "atta": 0.75, "desiccated-coconut": 1, "default": 1},
    "cup": {"rice": 2, "curd": 2, "milk": 2, "poha": 2, "rolled-oats": 2, "besan": 4,
            "sooji": 2, "spinach": 1, "peas": 2, "mixed-vegetables": 2, "makhana": 1,
            "puffed-rice": 1, "atta": 4, "dalia": 4, "banana-chips": 1, "coconut-milk": 2,
            "popcorn-kernels": 4, "vermicelli": 2, "boiled-chickpeas": 2, "moong-dal": 4,
            "water": 0, "default": 2},
    "cups": None,  # alias handled below
    "slices": {"bread": 1, "cheese-slice": 1, "default": 1},
    "packs": {"maggi-noodles": 1, "default": 1},
    "cloves": {"garlic": 0.3, "default": 0.3},
    "pinch": {"default": 0},
    "eggs": {"egg": 1, "default": 1},
}
UNIT_SCALE["cups"] = UNIT_SCALE["cup"]

STAPLE_PINCH_ZERO = {"salt", "turmeric", "red-chilli-powder", "chilli-flakes", "black-pepper",
                     "chaat-masala", "garam-masala", "cumin-seeds", "mustard-seeds", "cardamom",
                     "cinnamon", "bay-leaf", "clove-spice", "oregano", "baking-soda", "water",
                     "cornflour", "vinegar", "tea-leaves"}


def est_ingredient_nutrition(cid, qty, unit):
    if cid not in PORTION_NUTRITION:
        return (0, 0, 0, 0, 0)
    base = PORTION_NUTRITION[cid]
    if cid in STAPLE_PINCH_ZERO:
        return (0, 0, 0, 0, 0)
    scale = 1.0
    u = (unit or "").lower()
    if u in UNIT_SCALE:
        table = UNIT_SCALE[u]
        mult = table.get(cid, table.get("default", 1))
        scale = (qty or 1) * mult
    elif qty:
        scale = qty
    else:
        scale = 1.0
        if cid == "sugar":  # "pinch/1 tsp sugar" with no real qty
            return (0, 0, 0, 0, 0)
    return tuple(round(x * scale, 1) for x in base)


all_canon_used = set()
unmapped = []
for r in data["recipes"]:
    tot = [0, 0, 0, 0, 0]
    new_ings = []
    for ing in r["ingredients"]:
        cids = canonicalise(ing["name"], ing["raw"])
        if not cids:
            unmapped.append((r["number"], ing["raw"]))
        ing["canonical"] = cids
        for cid in cids:
            all_canon_used.add(cid)
            n = est_ingredient_nutrition(cid, ing.get("quantity"), ing.get("unit"))
            for i in range(5):
                tot[i] += n[i]
        new_ings.append(ing)
    r["ingredients"] = new_ings
    kcal = int(round(tot[0] / 10.0)) * 10
    kcal = max(120, min(950, kcal))
    r["nutrition"] = {
        "calories": kcal,
        "protein_g": round(tot[1]),
        "carbs_g": round(tot[2]),
        "fat_g": round(tot[3]),
        "fibre_g": round(tot[4]),
        "basis": "heuristic-estimate",
        "confidence": "low",
    }
    # calorie band tag
    for lo, hi, tag in [(0, 300, "kcal:under-300"), (300, 500, "kcal:300-500"),
                        (500, 700, "kcal:500-700"), (700, 10000, "kcal:700-1000")]:
        if lo < kcal <= hi:
            r["tags"].append(tag)
    # pantry-relevant (non-staple) ingredient ids
    r["key_ingredients"] = sorted({c for ing in r["ingredients"] for c in ing["canonical"]
                                   if c in CANON and not CANON[c][2]})
    r["staple_ingredients"] = sorted({c for ing in r["ingredients"] for c in ing["canonical"]
                                      if c in CANON and CANON[c][2]})
    # leftover-friendly?
    if any("leftover" in ing["raw"].lower() or "day-old" in ing["raw"].lower()
           or "day old" in ing["raw"].lower() for ing in r["ingredients"]):
        r["tags"].append("uses-leftovers")
    r["tags"] = sorted(set(r["tags"]))

ingredients_out = []
for cid, (disp, cat, staple, aliases, shelf) in CANON.items():
    ingredients_out.append({
        "id": cid, "name": disp, "category": cat,
        "is_staple": staple, "shelf_life_days": shelf,
        "used_in_count": sum(1 for r in data["recipes"]
                             if cid in [c for ing in r["ingredients"] for c in ing["canonical"]]),
    })
ingredients_out.sort(key=lambda x: (-x["used_in_count"], x["id"]))

data["ingredients"] = ingredients_out
data["ingredient_categories"] = sorted({i["category"] for i in ingredients_out})

# split into the two committed seed files consumed by src/data/catalog.ts
recipes = data.pop("recipes")
ings = data.pop("ingredients")
meta = data
out_dir = ROOT / "src" / "data"
(out_dir / "recipes.json").write_text(
    json.dumps({"meta": meta, "recipes": recipes}, ensure_ascii=False, indent=1), encoding="utf-8")
(out_dir / "ingredients.json").write_text(
    json.dumps({"categories": meta["ingredient_categories"], "ingredients": ings},
               ensure_ascii=False, indent=1), encoding="utf-8")

print("wrote src/data/recipes.json + src/data/ingredients.json")
print("canon ingredients:", len(CANON), "| used:", len(all_canon_used))
print("unmapped ingredient lines:", len(unmapped))
for n, raw in unmapped[:40]:
    print("  #%d  %s" % (n, raw))
import collections
kb = collections.Counter()
for r in recipes:
    kb[r["nutrition"]["calories"] // 100 * 100] += 1
print("calorie distribution:", dict(sorted(kb.items())))
print("avg kcal:", round(sum(r["nutrition"]["calories"] for r in recipes) / 99))
z = [r["number"] for r in recipes if not r["key_ingredients"]]
print("recipes with NO key ingredients (all staple):", z)
