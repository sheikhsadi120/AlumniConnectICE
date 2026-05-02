import sys
sys.path.insert(0, r'D:\project\sshowed\AC\backend')

from app import app

print("=== ALL ROUTES ===")
for rule in sorted(app.url_map.iter_rules(), key=lambda r: str(r)):
    if 'fund' in str(rule):
        print(f"{rule.rule} -> {rule.endpoint} : {rule.methods}")

print("\n=== Total routes ===")
print(f"Total: {len(list(app.url_map.iter_rules()))}")
