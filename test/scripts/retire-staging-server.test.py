"""Local fake-server gate: python3 test/scripts/retire-staging-server.test.py."""
import hashlib
import json
import os
import shutil
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts/retire-staging-server.sh"
HOST = "staging.vlist.io"


def fake(kind, args):
    root = Path(os.environ["FAKE_ROOT"])
    state_path = root / "state.json"
    state = json.loads(state_path.read_text())

    def record():
        with Path(os.environ["FAKE_LOG"]).open("a") as stream:
            stream.write(json.dumps([kind, *args]) + "\n")

    if kind == "pm2":
        if args == ["list"]:
            print("│ id │ name │ status │ ↺ │")
            for p in state["processes"]:
                print(f"│ {p['id']} │ {p['name']} │ {p['status']} │ {p['restarts']} │")
            return 0
        record()
        if args == ["stop", HOST]:
            for p in state["processes"]:
                if p["name"] == HOST:
                    p["status"] = "stopped"
                if state.get("damage_production") and p["name"] == "vlist.io":
                    p["restarts"] += 1
            state["port3339"] = state.get("keep_port3339", False)
        elif args == ["delete", HOST]:
            state["processes"] = [p for p in state["processes"] if p["name"] != HOST]
        elif args == ["save"]:
            if not state.get("save_ok", True): return 1
            state["saves"] += 1
        else:
            raise AssertionError(f"unexpected pm2 operation: {args}")
        state_path.write_text(json.dumps(state))
    elif kind == "nginx":
        record()
        if args == ["-t"]:
            return 0 if state["nginx_ok"] else 1
        if args != ["-s", "reload"]:
            raise AssertionError(args)
        if not state.get("reload_ok", True): return 1
        state["reloaded"] = True
        state_path.write_text(json.dumps(state))
    elif kind == "curl":
        if args[-1] == "https://vlist.io/dist/version.json":
            print(json.dumps({"version": state["version"]}))
        else:
            if args[-1] != "https://staging.vlist.io/some/path": raise AssertionError(args)
            origin = "--resolve" in args
            if origin and args[args.index("--resolve") + 1] != "staging.vlist.io:443:127.0.0.1":
                raise AssertionError("origin must hit loopback with TLS hostname preserved")
            if "-k" in args or "--insecure" in args: raise AssertionError("TLS verification must remain on")
            ok = state["reloaded"] and state["origin_ok" if origin else "edge_ok"]
            print(f"HTTP/2 {301 if ok else 200}\r")
            print("location: https://vlist.io/some/path\r\n")
    elif kind == "ss":
        if args not in (["-ltn", "sport = :3338"], ["-ltn", "sport = :3339"]): raise AssertionError(args)
        if not state.get("ss_ok", True): return 0
        print("State Recv-Q Send-Q Local Address:Port Peer Address:Port")
        port = 3339 if "3339" in args[-1] else 3338
        if state[f"port{port}"]:
            print(f"LISTEN 0 511 127.0.0.1:{port} 0.0.0.0:*")
    else:
        raise AssertionError(kind)
    return 0


def digest(root):
    result = []
    for p in sorted(root.rglob("*")):
        if p.is_symlink():
            result.append((str(p.relative_to(root)), "link", os.readlink(p)))
        elif p.is_file():
            result.append((str(p.relative_to(root)), "file", hashlib.sha256(p.read_bytes()).hexdigest()))
        else:
            result.append((str(p.relative_to(root)), "dir"))
    return result


def tree_checksum(entries):
    return hashlib.sha256(json.dumps(entries).encode()).hexdigest()


class Retirement(unittest.TestCase):
    def setUp(self):
        self.temp = Path(tempfile.mkdtemp(prefix="retire-staging-test-"))
        self.root = self.temp / "root"
        self.nginx = self.root / "nginx"
        for name in ["sites-enabled", "sites-available", "conf.d"]:
            (self.nginx / name).mkdir(parents=True)
        self.vhost = self.nginx / "sites-available/staging.conf"
        self.certs = self.root / "certs/staging"
        self.certs.mkdir(parents=True)
        (self.certs / "fullchain.pem").write_text("FAKE CERTIFICATE BODY MUST NOT BE PRINTED\n")
        (self.certs / "privkey.pem").write_text("FAKE PRIVATE KEY BODY MUST NOT BE PRINTED\n")
        tls_include = self.nginx / "tls-options.conf"
        tls_include.write_text("ssl_protocols TLSv1.2 TLSv1.3;\n")
        self.original = """# staging only
server {
    listen 80;
    server_name staging.vlist.io;
    location / { proxy_pass http://127.0.0.1:3339; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name staging.vlist.io;
    ssl_certificate /certs/staging/fullchain.pem;
    ssl_certificate_key /certs/staging/privkey.pem;
    include TLS_OPTIONS;
    location / { proxy_pass http://127.0.0.1:3339; }
}
""".replace("TLS_OPTIONS", str(tls_include)).replace("/certs/staging", str(self.certs))
        self.vhost.write_text(self.original)
        (self.nginx / "sites-enabled/staging.conf").symlink_to(self.vhost)
        (self.nginx / "sites-available/production.conf").write_text(
            "server { listen 443 ssl; server_name vlist.io; }\n"
        )
        ecosystem = self.root / "staging.vlist.io/ecosystem.staging.config.cjs"
        ecosystem.parent.mkdir()
        ecosystem.write_text("// retained rollback fixture\n")
        (self.root / "pm2.pid").write_text(str(os.getpid()))
        self.state = {
            "processes": [
                {"id": 0, "name": "vlist.io", "status": "online", "restarts": 3},
                {"id": 2, "name": "vlist.io", "status": "online", "restarts": 5},
                {"id": 1, "name": HOST, "status": "online", "restarts": 0},
            ],
            "port3338": True, "port3339": True, "nginx_ok": True,
            "origin_ok": True, "edge_ok": True, "reloaded": False,
            "version": "3.3.1", "saves": 0,
        }
        self.save()
        self.log = self.temp / "calls.jsonl"

    def tearDown(self):
        # Session rule: local fixtures go to Trash, never recursive rm.
        if shutil.which("trash"):
            subprocess.run(["trash", str(self.temp)], check=True, stdout=subprocess.DEVNULL)

    def save(self):
        (self.root / "state.json").write_text(json.dumps(self.state))

    def commands(self):
        return [json.loads(x) for x in self.log.read_text().splitlines()] if self.log.exists() else []

    def run_script(self, mode="--check"):
        functions = """
fake_pm2() { "$FAKE_PYTHON" "$FAKE_DRIVER" --fake pm2 "$@"; }
fake_nginx() { "$FAKE_PYTHON" "$FAKE_DRIVER" --fake nginx "$@"; }
fake_curl() { "$FAKE_PYTHON" "$FAKE_DRIVER" --fake curl "$@"; }
fake_ss() { "$FAKE_PYTHON" "$FAKE_DRIVER" --fake ss "$@"; }
if [[ -n "$MODE" ]]; then source "$SCRIPT" "$MODE"; else source "$SCRIPT"; fi
"""
        env = dict(os.environ, FAKE_ROOT=str(self.root), FAKE_LOG=str(self.log),
                   FAKE_PYTHON=sys.executable, FAKE_DRIVER=str(Path(__file__).resolve()),
                   NGINX_DIR=str(self.nginx), PM2_PID_FILE=str(self.root / "pm2.pid"),
                   STAGING_PARENT=str(self.root), NGINX_BIN="fake_nginx", PM2_BIN="fake_pm2",
                   CURL_BIN="fake_curl", SS_BIN="fake_ss", PYTHON_BIN=sys.executable,
                   SCRIPT=str(SCRIPT), MODE=mode)
        p = subprocess.run(["bash", "-c", functions], env=env, text=True,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=30)
        print(f"\nCASE {self._testMethodName} {mode}: exit={p.returncode}\n{p.stdout}", flush=True)
        return p

    def test_check_zero_vhosts(self):
        self.vhost.write_text("# no staging vhost\n")
        p = self.run_script()
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("found 0 staging vhosts", p.stdout)

    def test_check_two_vhosts(self):
        (self.nginx / "conf.d/another.conf").write_text(self.original)
        p = self.run_script()
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("found 2 staging vhosts", p.stdout)

    def test_check_is_read_only(self):
        before = digest(self.root)
        p = self.run_script()
        self.assertEqual(p.returncode, 0)
        self.assertIn("would change:", p.stdout)
        self.assertIn("ssl_certificate " + str(self.certs / "fullchain.pem") + ";", p.stdout)
        self.assertNotIn("FAKE PRIVATE KEY BODY", p.stdout)
        self.assertIn("port 3338: listening", p.stdout)
        self.assertEqual(before, digest(self.root))
        print("CHECK TREE CHECKSUM before=" + tree_checksum(before) + " after=" + tree_checksum(digest(self.root)), flush=True)
        self.assertEqual(self.commands(), [])

    def test_default_is_read_only(self):
        before = digest(self.root)
        p = self.run_script("")
        self.assertEqual(p.returncode, 0)
        self.assertIn("would change:", p.stdout)
        self.assertEqual(before, digest(self.root))

    def test_zero_staging_process_is_not_assumed_retired(self):
        self.state["processes"] = self.state["processes"][:2]
        self.save()
        p = self.run_script()
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("found 0 exact staging PM2 matches", p.stdout)
        self.assertEqual(self.commands(), [])

    def test_two_staging_processes_stop_inventory(self):
        self.state["processes"].append({"id": 3, "name": HOST, "status": "online", "restarts": 0})
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("found 2 exact staging PM2 matches", p.stdout)
        self.assertEqual(self.commands(), [])

    def test_shared_vhost_is_refused(self):
        self.vhost.write_text(self.original + "server { listen 80; server_name vlist.io; }\n")
        before = digest(self.root)
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("refusing shared", p.stdout)
        self.assertEqual(before, digest(self.root))

    def test_missing_tls_is_refused(self):
        self.vhost.write_text("server { listen 80; server_name staging.vlist.io; }\n")
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("no explicit staging TLS listener", p.stdout)
        self.assertEqual(self.commands(), [])

    def test_non_tls_include_is_refused(self):
        (self.nginx / "tls-options.conf").write_text("server_name vlist.io;\n")
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("not TLS-only", p.stdout)
        self.assertEqual(self.commands(), [])

    def test_unknown_port_state_is_refused(self):
        self.state["ss_ok"] = False
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("port state is unknown", p.stdout)
        self.assertEqual(self.commands(), [])

    def test_invalid_nginx_restores_backup(self):
        self.state["nginx_ok"] = False
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("backup restored", p.stdout)
        self.assertEqual(self.vhost.read_text(), self.original)
        self.assertEqual(next((self.nginx / "staging-retirement-backups").glob("*")).read_text(), self.original)
        self.assertEqual(self.commands(), [["nginx", "-t"]])

    def test_failed_reload_restores_backup(self):
        self.state["reload_ok"] = False
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("nginx reload failed; backup restored", p.stdout)
        self.assertEqual(self.vhost.read_text(), self.original)
        self.assertFalse(any(c[0] == "pm2" for c in self.commands()))

    def test_no_origin_redirect_no_pm2(self):
        self.state["origin_ok"] = False
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("origin redirect failed", p.stdout)
        self.assertFalse(any(c[0] == "pm2" for c in self.commands()))
        print("PM2 MUTATIONS without origin 301: " + json.dumps([c for c in self.commands() if c[0] == "pm2"]), flush=True)

    def test_no_edge_redirect_no_pm2(self):
        self.state["edge_ok"] = False
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("Cloudflare redirect failed", p.stdout)
        self.assertFalse(any(c[0] == "pm2" for c in self.commands()))
        print("PM2 MUTATIONS without Cloudflare 301: " + json.dumps([c for c in self.commands() if c[0] == "pm2"]), flush=True)

    def test_apply_twice_second_is_read_only(self):
        protected = [self.nginx / "sites-available/production.conf", self.nginx / "tls-options.conf",
                     self.root / "staging.vlist.io/ecosystem.staging.config.cjs",
                     self.certs / "fullchain.pem", self.certs / "privkey.pem"]
        originals = {p: p.read_bytes() for p in protected}
        p = self.run_script("--apply")
        self.assertEqual(p.returncode, 0)
        self.assertIn("return 301 https://vlist.io$request_uri;", self.vhost.read_text())
        self.assertIn("ssl_certificate_key " + str(self.certs / "privkey.pem") + ";", self.vhost.read_text())
        for path, content in originals.items(): self.assertEqual(path.read_bytes(), content)
        self.assertNotIn("FAKE PRIVATE KEY BODY", p.stdout)
        self.assertEqual(len(list((self.nginx / "staging-retirement-backups").glob("*"))), 1)
        state = json.loads((self.root / "state.json").read_text())
        self.assertEqual(state["processes"], self.state["processes"][:2])
        self.assertEqual(state["saves"], 1)
        self.assertFalse(state["port3339"])
        before, commands = digest(self.root), self.commands()
        again = self.run_script("--apply")
        self.assertEqual(again.returncode, 0)
        self.assertIn("already done: nginx", again.stdout)
        self.assertIn("already done: pm2", again.stdout)
        self.assertIn("already done: port 3339", again.stdout)
        self.assertEqual(before, digest(self.root))
        self.assertEqual(commands, self.commands())
        print("SECOND APPLY MUTATING COMMANDS before=" + str(len(commands)) + " after=" + str(len(self.commands())), flush=True)
        print("SECOND APPLY TREE CHECKSUM before=" + tree_checksum(before) + " after=" + tree_checksum(digest(self.root)), flush=True)
        checked = self.run_script()
        self.assertEqual(checked.returncode, 0)
        self.assertIn("nothing to do", checked.stdout)
        self.assertEqual(before, digest(self.root))

    def test_production_change_stops_before_delete(self):
        self.state["damage_production"] = True
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("production PM2 changed", p.stdout)
        self.assertNotIn(["pm2", "delete", HOST], self.commands())
        self.assertNotIn(["pm2", "save"], self.commands())

    def test_failed_save_is_not_recorded_as_success(self):
        self.state["save_ok"] = False
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("pm2 save failed", p.stdout)
        self.assertNotIn("# staging-retirement-complete: yes", self.vhost.read_text())
        again = self.run_script("--apply")
        self.assertNotEqual(again.returncode, 0)
        self.assertIn("found 0 exact staging PM2 matches", again.stdout)

    def test_port3339_must_be_free_after_pm2(self):
        self.state["keep_port3339"] = True
        self.save()
        p = self.run_script("--apply")
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("port 3339 is still listening", p.stdout)
        self.assertNotIn("# staging-retirement-complete: yes", self.vhost.read_text())


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--fake":
        sys.exit(fake(sys.argv[2], sys.argv[3:]))
    unittest.main(verbosity=2)
