import sys
import os
import sqlite3
import subprocess

# Windows環境での文字化け防止
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

DB_PATH = r'C:\work\antigravity\三国志システム\sangokushi_core.db'
CORE_SCRIPT = r'C:\work\antigravity\三国志システム\war_council_core.py'

def insert_ongoing_topic(topic, project="託児所HP作成"):
    """大本営DBに新規ONGOING軍議セッションを挿入する"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO council_sessions (topic, status, project) VALUES (?, ?, ?)",
            (topic, "ONGOING", project)
        )
        conn.commit()
        session_id = cursor.lastrowid
        conn.close()
        print(f"📊 新規軍議セッションが登録されました (Session ID: {session_id}, Project: {project})")
        return session_id
    except Exception as e:
        print(f"❌ DBへの議題登録エラー: {e}")
        sys.exit(1)

def run_core_council(project="託児所HP作成"):
    """大本営の意思決定エンジンを起動する"""
    print("⚔️ 三国志システム大本営へ軍議の執行を要請します...")
    try:
        # 大本営 Python 仮想環境が使用できるか確認、なければ標準の python を使用
        venv_python = r'C:\work\antigravity\マネタイズ\venv\Scripts\python.exe'
        python_cmd = venv_python if os.path.exists(venv_python) else 'python'
        
        # 大本営を `--once --project <project>` で実行
        result = subprocess.run(
            [python_cmd, CORE_SCRIPT, "--once", "--project", project, "--no-report"],
            capture_output=True,
            text=True,
            encoding='utf-8',
            cwd=r'C:\work\antigravity\三国志システム'
        )
        
        # エラー処理
        if result.returncode != 0:
            print(f"🚨 大本営の実行でエラーが発生しました (Exit Code: {result.returncode})")
            print(f"--- [標準エラー出力] ---\n{result.stderr}")
            print(f"--- [標準出力] ---\n{result.stdout}")
            sys.exit(result.returncode)
            
        print("✅ 大本営による軍議が正常に完了しました。")
        return result.stdout
    except Exception as e:
        print(f"❌ 大本営起動失敗: {e}")
        sys.exit(1)

def print_session_results(session_id):
    """軍師たちの進言をDBから抽出して美しく表示する"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT agent_name, content, timestamp FROM council_history WHERE session_id = ? ORDER BY history_id ASC",
            (session_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            print("⚠️ DBに軍議の履歴が見つかりませんでした。")
            return
            
        print("\n==================================================")
        print("      🏛️ 【託児所HP作成 統治軍議 議事録】")
        print("==================================================")
        
        for agent_name, content, ts in rows:
            print(f"\n🔹 【{agent_name}】 ({ts})")
            print("-" * 50)
            print(content)
            print("-" * 50)
            
        print("\n==================================================")
    except Exception as e:
        print(f"❌ 議事録抽出エラー: {e}")

if __name__ == "__main__":
    default_topic = "個人が新規開業する託児所HPについて、維持費を極限まで無料化し、かつ自身で容易に更新できるようにするための、今日（2026年5月22日）時点で最適な構築手法・技術スタックと構成案は何か？"
    topic = sys.argv[1] if len(sys.argv) > 1 else default_topic
    
    print(f"📝 議題: {topic}")
    session_id = insert_ongoing_topic(topic)
    
    run_core_council()
    print_session_results(session_id)
