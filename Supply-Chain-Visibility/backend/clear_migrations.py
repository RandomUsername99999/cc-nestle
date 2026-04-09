import sqlite3
import os

db_path = 'db.sqlite3'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("DELETE FROM django_migrations WHERE app='api'")
        conn.commit()
        print("Cleared migration history for 'api'")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print("db.sqlite3 not found")
