import app
print(sorted([r.rule for r in app.app.url_map.iter_rules() if "fund" in r.rule or "transaction" in r.rule]))
