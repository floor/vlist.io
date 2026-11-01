#!/usr/bin/env bash
# Owner-run only, from a shell with the required permissions. This file never
# elevates privileges. Run with bash; no executable bit is needed:
#   bash /home/floor/vlist.io/scripts/retire-staging-server.sh --check
#   bash /home/floor/vlist.io/scripts/retire-staging-server.sh --apply
# Default: --check, no writes. Requires bash, python3, nginx, pm2, curl and ss.
# Use a shell with nginx write/reload permission and the application's existing
# PM2 daemon selected (export PM2_HOME if necessary). The script requires its
# existing live pid file before it will query PM2; it has no daemon-start step.
# Command overrides are single executable/function names, never shell fragments:
# NGINX_DIR, NGINX_BIN, PM2_BIN, CURL_BIN, SS_BIN, PYTHON_BIN, PM2_PID_FILE,
# STAGING_PARENT (ecosystem search root), or explicit STAGING_ECOSYSTEM.
set -euo pipefail
umask 077

mode=${1:---check}
[[ $# -le 1 && ( "$mode" == --check || "$mode" == --apply ) ]] || {
  echo 'Usage: bash scripts/retire-staging-server.sh [--check|--apply]' >&2
  echo 'nothing was changed by this run'
  exit 1
}
NGINX_DIR=${NGINX_DIR:-/etc/nginx}
NGINX_BIN=${NGINX_BIN:-nginx}
PM2_BIN=${PM2_BIN:-pm2}
CURL_BIN=${CURL_BIN:-curl}
SS_BIN=${SS_BIN:-ss}
PYTHON_BIN=${PYTHON_BIN:-python3}
PM2_PID_FILE=${PM2_PID_FILE:-${PM2_HOME:-$HOME/.pm2}/pm2.pid}
STAGING_PARENT=${STAGING_PARENT:-/home/floor}
STAGING_ECOSYSTEM=${STAGING_ECOSYSTEM:-}
host=staging.vlist.io
vhost='' backup='' ecosystem='' rows=''
rollback_ready=false
changed=false

rollback_commands() {
  [[ "$rollback_ready" == true && -f "$backup" && -n "$vhost" && -n "$ecosystem" ]] || return 0
  echo 'Rollback (owner, same nginx permissions and PM2 daemon):'
  printf '  cp -p -- %q %q &&\n' "$backup" "$vhost"
  printf '  %q -t && %q -s reload &&\n' "$NGINX_BIN" "$NGINX_BIN"
  printf '  (cd %q && %q start %q --only %q && %q save)\n' \
    "$(dirname "$ecosystem")" "$PM2_BIN" "$ecosystem" "$host" "$PM2_BIN"
}
die() {
  echo "ERROR: $*" >&2
  if [[ "$changed" == false ]]; then echo 'nothing was changed by this run'; fi
  rollback_commands
  exit 1
}

# One embedded parser: read nginx syntax without executing includes or configs;
# emit only selected nginx directives and permitted PM2 table columns.
inspect() {
  "$PYTHON_BIN" - "$@" <<'PY'
import glob, re, sys
from pathlib import Path

HOST = "staging.vlist.io"
MARKER = "# staging-retirement: redirect-only"

def fail(message):
    print("ERROR: " + message)
    raise SystemExit(1)

def parse(text):
    tokens = []
    i = 0
    while i < len(text):
        if text[i].isspace(): i += 1; continue
        if text[i] == "#":
            end = text.find("\n", i)
            i = len(text) if end < 0 else end + 1
            continue
        start = i
        if text[i] in ";{}":
            tokens.append((text[i], i, i + 1)); i += 1; continue
        value = ""
        quote = None
        while i < len(text):
            c = text[i]
            if c == "\\" and i + 1 < len(text):
                value += text[i:i + 2]; i += 2; continue
            if quote:
                if c == quote: quote = None
                else: value += c
                i += 1
            elif c in "\"'": quote = c; i += 1
            elif c.isspace() or c in ";{}#": break
            else: value += c; i += 1
        if quote: fail("unsupported unterminated nginx quote")
        if i == start: fail("unsupported nginx syntax")
        tokens.append((value, start, i))
    position = 0
    def group(nested=False):
        nonlocal position
        result = []
        while position < len(tokens):
            if tokens[position][0] == "}":
                if not nested: fail("unexpected nginx closing brace")
                position += 1
                return result
            start = tokens[position][1]
            words = []
            while position < len(tokens) and tokens[position][0] not in (";", "{", "}"):
                words.append(tokens[position][0]); position += 1
            if not words or position == len(tokens): fail("incomplete nginx directive")
            delimiter = tokens[position][0]
            position += 1
            if delimiter == ";": body = None
            elif delimiter == "{": body = group(True)
            else: fail("unsupported nginx directive")
            result.append(dict(key=words[0], args=words[1:], body=body,
                               start=start, end=tokens[position - 1][2]))
        if nested: fail("unclosed nginx block")
        return result
    return group()

def matching(nodes):
    return [n for n in nodes if n["key"] == "server" and n["body"] is not None
            and any(x["key"] == "server_name" and HOST in x["args"] for x in n["body"])]

def keep(node):
    return node["key"] in ("listen", "server_name", "include", "http2") or node["key"].startswith("ssl_")

def validate(path, text, nodes, root):
    blocks = matching(nodes)
    if len(blocks) != len(nodes): fail("refusing shared or non-dedicated vhost file: " + str(path))
    tls = False
    for block in blocks:
        names = [x for x in block["body"] if x["key"] == "server_name"]
        if len(names) != 1 or names[0]["args"] != [HOST]:
            fail("refusing aliases or wildcard names in staging vhost: " + str(path))
        listeners = [x for x in block["body"] if x["key"] == "listen"]
        if not listeners: fail("staging block has no explicit listener")
        for listener in listeners:
            if not listener["args"] or not re.search(r"(^|:)\d+$", listener["args"][0]):
                fail("unsupported staging listener")
            port = listener["args"][0].split(":")[-1]
            if port not in ("80", "443"): fail("refusing staging listener outside ports 80/443")
            if "default_server" in listener["args"]: fail("refusing shared default_server listener")
            if port == "443":
                keys = {x["key"] for x in block["body"]}
                if "ssl" not in listener["args"] or not {"ssl_certificate", "ssl_certificate_key"} <= keys:
                    fail("cannot verify explicit TLS listener and certificate lines")
                tls = True
        for node in block["body"]:
            if keep(node) and node["body"] is not None: fail("unsupported nested TLS directive")
            if node["key"].startswith("ssl_certificate") and any(a.startswith("data:") for a in node["args"]):
                fail("inline certificate material is unsupported and not displayed")
            if node["key"] in ("ssl_certificate", "ssl_certificate_key") and len(node["args"]) != 1:
                fail("cannot verify certificate directive arguments")
            if node["key"] == "include":
                if len(node["args"]) != 1 or "$" in node["args"][0]: fail("cannot verify dynamic nginx include")
                pattern = node["args"][0]
                if not Path(pattern).is_absolute(): pattern = str(root / pattern)
                included = glob.glob(pattern)
                if not included: fail("cannot inventory nginx TLS include: " + pattern)
                for filename in included:
                    try: directives = parse(Path(filename).read_text())
                    except (OSError, UnicodeError): fail("cannot read nginx TLS include: " + filename)
                    if any(n["body"] is not None or not (n["key"].startswith("ssl_") or n["key"] == "http2") for n in directives):
                        fail("refusing include that is not TLS-only: " + filename)
    if not tls: fail("no explicit staging TLS listener; refusing a certificate-breaking redirect")
    return blocks

action = sys.argv[1]
if action == "pm2":
    table = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", sys.argv[2])
    header = None
    found = []
    for line in table.splitlines():
        columns = [x.strip() for x in re.split(r"[│|]", line)[1:-1]]
        if {"id", "name", "status"} <= set(columns):
            header = columns
            continue
        if not header or len(columns) != len(header): continue
        row = dict(zip(header, columns))
        if not row.get("id", "").isdigit(): continue
        restarts = next((row[k] for k in ("↺", "restart", "restarts") if k in row), "")
        if not restarts.isdigit(): fail("PM2 table lacks numeric restart counts")
        values = [row["id"], row["name"], row["status"], restarts]
        if any(re.search(r"[\x00-\x1f\x7f]", value) for value in values): fail("unsupported PM2 table value")
        found.append(values)
    if header is None or not found: fail("cannot parse nonempty PM2 list table safely")
    if len({r[0] for r in found}) != len(found): fail("duplicate PM2 ids")
    for row in found: print("\t".join(row))
elif action == "ecosystem":
    parent, explicit = Path(sys.argv[2]), sys.argv[3]
    if explicit:
        files = [Path(explicit).resolve()]
    else:
        files = sorted({p.resolve() for d in parent.glob("staging*") if d.is_dir()
                        for p in d.glob("**/ecosystem.staging.config.cjs") if p.is_file()})
    for p in files: print("ecosystem candidate: " + str(p))
    if len(files) != 1 or not files[0].is_file() or files[0].name != "ecosystem.staging.config.cjs":
        fail("need exactly one retained staging ecosystem file; set STAGING_ECOSYSTEM if discovery is ambiguous")
    print("ECOSYSTEM_PATH=" + str(files[0]))
elif action == "scan":
    root = Path(sys.argv[2]).resolve()
    files = {}
    enabled = set()
    for directory in ("sites-enabled", "sites-available", "conf.d"):
        base = root / directory
        if not base.is_dir(): continue
        for alias in sorted(base.rglob("*")):
            if not alias.is_file(): continue
            path = alias.resolve()
            if directory == "sites-enabled" or (directory == "conf.d" and alias.suffix == ".conf"):
                enabled.add(path)
            try: text = path.read_text()
            except (OSError, UnicodeError): fail("cannot inventory nginx file: " + str(alias))
            if HOST not in text: continue
            print("nginx file: " + str(alias) + (" -> " + str(path) if alias.is_symlink() else ""))
            if path not in files: files[path] = (text, parse(text))
    candidates = []
    for path, (text, nodes) in files.items():
        blocks = matching(nodes)
        for number, block in enumerate(blocks, 1):
            print("  staging server block " + str(number) + ":")
            for node in block["body"]:
                if node["key"] in ("listen", "server_name") or node["key"].startswith("ssl_certificate"):
                    raw = text[node["start"]:node["end"]]
                    print("    " + (node["key"] + " <inline value omitted>;" if any(a.startswith("data:") for a in node["args"]) else raw))
        if blocks: candidates.append((path, text, nodes))
    print("found " + str(len(candidates)) + " staging vhosts (canonical files; enabled symlinks deduplicated)")
    if len(candidates) != 1: fail("need exactly one dedicated staging vhost")
    path, text, nodes = candidates[0]
    if path not in enabled: fail("staging vhost has no sites-enabled or conf.d/*.conf entry")
    for protected in (Path("/home/floor/vlist.io"), Path("/home/floor/vlist")):
        if path == protected or protected in path.parents: fail("refusing production application path")
    blocks = validate(path, text, nodes, root)
    retired = MARKER in text and all(
        len([n for n in b["body"] if n["key"] == "return" and n["args"] == ["301", "https://vlist.io$request_uri"]]) == 1
        and all(keep(n) or (n["key"] == "return" and n["args"] == ["301", "https://vlist.io$request_uri"]) for n in b["body"])
        for b in blocks)
    backup = ""
    if retired:
        match = re.search(r"^# staging-retirement-backup: (.+)$", text, re.M)
        if not match: fail("retired vhost has no recorded backup")
        backup = match[1]
        if Path(backup).resolve().parent != (root / "staging-retirement-backups").resolve() or not Path(backup).is_file():
            fail("recorded backup is not present in the dedicated backup directory")
    print("VHOST_PATH=" + str(path))
    print("STATE=" + ("retired" if retired else "active"))
    print("BACKUP_PATH=" + backup)
    print("COMPLETE=" + ("yes" if retired and "# staging-retirement-complete: yes" in text else "no"))
elif action == "render":
    path, backup = Path(sys.argv[2]), sys.argv[3]
    text = path.read_text()
    blocks = validate(path, text, parse(text), Path(backup).parent.parent)
    for block in reversed(blocks):
        body = "\n".join("    " + text[n["start"]:n["end"]] for n in block["body"] if keep(n))
        replacement = "server {\n" + body + "\n    return 301 https://vlist.io$request_uri;\n}"
        text = text[:block["start"]] + replacement + text[block["end"]:]
    print(MARKER + "\n# staging-retirement-backup: " + backup + "\n" + text, end="")
elif action == "complete":
    text = Path(sys.argv[2]).read_text()
    if not text.startswith(MARKER + "\n"): fail("retirement marker changed unexpectedly")
    print("# staging-retirement-complete: yes\n" + text, end="")
else:
    fail("unknown inspection mode")
PY
}

load_pm2() {
  local table
  table=$("$PM2_BIN" list 2>/dev/null) || die 'pm2 list failed'
  rows=$(inspect pm2 "$table") || {
    printf '%s\n' "$rows"
    die 'PM2 inventory refused'
  }
  while IFS=$'\t' read -r id name status restarts; do
    printf 'pm2 id=%s name=%s status=%s restarts=%s\n' "$id" "$name" "$status" "$restarts"
  done <<< "$rows"
}
production_snapshot() {
  local snapshot
  snapshot=$(printf '%s\n' "$rows" | awk -F '\t' '$2=="vlist.io" {if($3!="online") exit 1; print $1 " " $3 " " $4}' | sort -n) || return 1
  [[ -n "$snapshot" ]] || return 1
  printf '%s\n' "$snapshot"
}
assert_production() {
  local now
  load_pm2
  now=$(production_snapshot) || die 'production PM2 changed or is not online'
  [[ "$now" == "$before_production" ]] || die 'production PM2 changed (id/status/restart count)'
}
assert_staging() {
  local ids
  ids=$(printf '%s\n' "$rows" | awk -F '\t' '$2=="staging.vlist.io" {print $1}')
  [[ "$ids" == "$1" ]] || die 'staging PM2 inventory changed; refusing another mutation'
}
port_listening() {
  local output
  output=$("$SS_BIN" -ltn "sport = :$1" 2>/dev/null) || die 'ss inventory failed'
  [[ "$output" == State* ]] || die 'unrecognized ss output; port state is unknown'
  printf '%s\n' "$output" | awk 'NR>1 && NF {found=1} END {exit !found}'
}
version_ok() {
  local body version
  body=$("$CURL_BIN" -fsS --connect-timeout 5 --max-time 15 https://vlist.io/dist/version.json 2>/dev/null) || die 'production version request failed'
  version=$(printf '%s' "$body" | "$PYTHON_BIN" -c 'import json,sys; print(json.load(sys.stdin).get("version", ""))') || die 'invalid production version response'
  [[ "$version" == 3.3.1 ]] || die 'production version is not the expected 3.3.1'
  echo 'production version: 3.3.1'
}
redirect_ok() {
  local label=$1 headers status location
  shift
  headers=$("$CURL_BIN" -sSI --noproxy '*' --connect-timeout 5 --max-time 15 "$@" "https://$host/some/path" 2>/dev/null) || die "$label redirect failed (request)"
  status=$(printf '%s\n' "$headers" | tr -d '\r' | awk '/^HTTP\// {code=$2} END {print code}')
  location=$(printf '%s\n' "$headers" | tr -d '\r' | awk 'tolower($1)=="location:" {$1=""; sub(/^ /, ""); value=$0} END {print value}')
  [[ "$status" == 301 && "$location" == https://vlist.io/some/path ]] || die "$label redirect failed (expected 301 to https://vlist.io/some/path)"
  echo "$label redirect: 301 https://vlist.io/some/path"
}

for bin in "$PYTHON_BIN" "$NGINX_BIN" "$PM2_BIN" "$CURL_BIN" "$SS_BIN"; do
  command -v "$bin" >/dev/null || die "required command is unavailable: $bin"
done
# Avoid letting a read-only pm2 list start a new daemon in the wrong account.
[[ -f "$PM2_PID_FILE" ]] || die 'select the existing application PM2 daemon before running this script'
daemon_pid=$(cat "$PM2_PID_FILE")
[[ "$daemon_pid" =~ ^[1-9][0-9]*$ ]] && kill -0 "$daemon_pid" 2>/dev/null || die 'existing PM2 daemon is not running or accessible'
if inventory=$(inspect scan "$NGINX_DIR"); then
  printf '%s\n' "$inventory"
else
  printf '%s\n' "$inventory"
  die 'nginx inventory refused; no changes made'
fi
vhost=$(printf '%s\n' "$inventory" | sed -n 's/^VHOST_PATH=//p')
state=$(printf '%s\n' "$inventory" | sed -n 's/^STATE=//p')
backup=$(printf '%s\n' "$inventory" | sed -n 's/^BACKUP_PATH=//p')
complete=$(printf '%s\n' "$inventory" | sed -n 's/^COMPLETE=//p')
# Check may describe a previous run's verified backup. Apply may print a
# rollback only after its own backup copy succeeds, never for a planned path.
if [[ "$mode" == --check && "$state" == retired ]]; then rollback_ready=true; fi
ecosystem_inventory=$(inspect ecosystem "$STAGING_PARENT" "$STAGING_ECOSYSTEM") || {
  printf '%s\n' "$ecosystem_inventory"
  die 'rollback ecosystem inventory refused'
}
printf '%s\n' "$ecosystem_inventory"
ecosystem=$(printf '%s\n' "$ecosystem_inventory" | sed -n 's/^ECOSYSTEM_PATH=//p')
load_pm2
before_production=$(production_snapshot) || die 'production PM2 must already be online'
staging_count=$(printf '%s\n' "$rows" | awk -F '\t' '$2=="staging.vlist.io" {count++} END {print count+0}')
staging_id=$(printf '%s\n' "$rows" | awk -F '\t' '$2=="staging.vlist.io" {print $1}')
if [[ "$staging_count" != 1 ]]; then
  # Zero is accepted only for an already completed retirement, making reapply
  # read-only. A fresh configuration with zero (or multiple) matches stops.
  [[ "$staging_count" == 0 && "$state" == retired && "$complete" == yes ]] || die "found $staging_count exact staging PM2 matches; expected one (or a recorded completed retirement)"
fi
port3338=free; port3339=free
if port_listening 3338; then port3338=listening; fi
if port_listening 3339; then port3339=listening; fi
echo "port 3338: $port3338"
echo "port 3339: $port3339"
[[ "$port3338" == listening ]] || die 'production port 3338 is not listening'
[[ "$staging_count" != 0 || "$port3339" == free ]] || die 'port 3339 is busy despite recorded retirement; owner inventory required'
version_ok
echo 'DNS is retained; no DNS or Cloudflare settings are changed.'
echo 'Cloudflare may serve cached staging pages until the zone is purged; the next vlist.io deploy purges everything.'
if [[ -z "$backup" ]]; then
  backup="${NGINX_DIR%/}/staging-retirement-backups/staging.vlist.io-$(date -u +%Y%m%dT%H%M%SZ)-$$.conf.bak"
fi
if [[ "$mode" == --check ]]; then
  if [[ "$state" == retired && "$staging_count" == 0 && "$port3339" == free ]]; then
    redirect_ok origin --resolve "$host:443:127.0.0.1"
    redirect_ok Cloudflare
    echo 'nothing to do'
  else
    if [[ "$state" != retired ]]; then
      echo "would change: back up $vhost to $backup; replace only its staging server bodies with a TLS-preserving 301; nginx -t then reload"
      echo 'would change: drop other staging body directives/handlers; retain listen/server_name, http2, ssl_* and verified TLS-only includes; add return 301 https://vlist.io$request_uri;'
    fi
    echo 'would change: only after origin and Cloudflare both return 301, pm2 stop staging.vlist.io; pm2 delete staging.vlist.io; pm2 save; verify production and free port 3339; record a completion comment in the backed-up vhost'
  fi
  echo 'nothing was changed by this run'
  rollback_commands
  exit 0
fi

# (a) Replace only the verified staging vhost, preserving every TLS directive.
if [[ "$state" == retired ]]; then
  echo 'already done: nginx redirect configuration (retained dated backup)'
  echo 'Use --check for rollback commands from the verified prior-run backup.'
else
  [[ ! -e "$backup" ]] || die 'dated backup already exists; refusing to overwrite it'
  replacement=$(inspect render "$vhost" "$backup") || {
    printf '%s\n' "$replacement"
    die 'could not render a safe staging-only replacement'
  }
  mkdir -p -- "$(dirname "$backup")" || die 'could not create backup directory'
  changed=true
  cp -p -- "$vhost" "$backup" || die 'backup copy failed; no rollback available from this run'
  rollback_ready=true
  echo "dated backup retained: $backup"
  if ! printf '%s\n' "$replacement" > "$vhost"; then
    cp -p -- "$backup" "$vhost"
    die 'vhost write failed; backup restored'
  fi
  if ! "$NGINX_BIN" -t >/dev/null 2>&1; then
    cp -p -- "$backup" "$vhost"
    die 'nginx -t failed; backup restored; not reloading or touching PM2'
  fi
  if ! "$NGINX_BIN" -s reload >/dev/null 2>&1; then
    cp -p -- "$backup" "$vhost"
    die 'nginx reload failed; backup restored; no PM2 changes; see rollback commands'
  fi
  echo 'nginx: tested and reloaded staging redirect'
fi
redirect_ok origin --resolve "$host:443:127.0.0.1"
redirect_ok Cloudflare

# (b) Read-only inventory precedes changes; no PM2 mutation precedes both 301s.
assert_production
assert_staging "$staging_id"
if [[ "$staging_count" == 0 ]]; then
  echo 'already done: pm2 staging entry absent; production unchanged'
else
  changed=true
  "$PM2_BIN" stop "$host" >/dev/null 2>&1 || die 'staging PM2 stop failed'
  assert_production
  assert_staging "$staging_id"
  [[ $(printf '%s\n' "$rows" | awk -F '\t' '$2=="staging.vlist.io" {print $3}') == stopped ]] || die 'staging PM2 did not reach stopped status'
  "$PM2_BIN" delete "$host" >/dev/null 2>&1 || die 'staging PM2 delete failed'
  assert_production
  assert_staging ''
  "$PM2_BIN" save >/dev/null 2>&1 || die 'pm2 save failed'
  assert_production
  assert_staging ''
  echo 'pm2: stopped/deleted only staging.vlist.io and saved; production unchanged'
fi
version_ok

# (c) No process command lines are requested; ss has no -p flag.
if port_listening 3339; then die 'port 3339 is still listening; refusing any further action'; fi
port_listening 3338 || die 'production port 3338 is no longer listening'
if [[ "$complete" == yes ]]; then echo 'already done: port 3339 is free'; else echo 'port 3339: confirmed free'; fi
if [[ "$complete" != yes ]]; then
  # A comment-only receipt distinguishes successful save/checks from a run
  # interrupted after delete but before save. An incomplete zero-entry state
  # requires owner rollback, rather than incorrectly claiming it was saved.
  completed_content=$(inspect complete "$vhost") || {
    printf '%s\n' "$completed_content"
    die 'could not record completed retirement'
  }
  printf '%s\n' "$completed_content" > "$vhost" || die 'could not record completed retirement'
fi
echo 'already done: DNS retained (no action); staging directories, ecosystem file and certificates retained'
rollback_commands
