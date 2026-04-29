#!/usr/bin/env bash
# TOOLSHED installer — Docker or self-hosted, you pick.
set -euo pipefail

# ─── colors ───────────────────────────────────────────────────────────────────
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  LIME=$'\033[38;5;190m'; INK=$'\033[38;5;235m'; CYAN=$'\033[38;5;81m'
  RED=$'\033[38;5;203m'; YEL=$'\033[38;5;221m'; GRY=$'\033[38;5;244m'
else
  BOLD=""; DIM=""; RESET=""; LIME=""; INK=""; CYAN=""; RED=""; YEL=""; GRY=""
fi

# ─── ascii art ────────────────────────────────────────────────────────────────
banner() {
  printf '%s' "$LIME"
  cat <<'EOF'

  ████████╗ ██████╗  ██████╗ ██╗     ███████╗██╗  ██╗███████╗██████╗
  ╚══██╔══╝██╔═══██╗██╔═══██╗██║     ██╔════╝██║  ██║██╔════╝██╔══██╗
     ██║   ██║   ██║██║   ██║██║     ███████╗███████║█████╗  ██║  ██║
     ██║   ██║   ██║██║   ██║██║     ╚════██║██╔══██║██╔══╝  ██║  ██║
     ██║   ╚██████╔╝╚██████╔╝███████╗███████║██║  ██║███████╗██████╔╝
     ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚═════╝
EOF
  printf '%s' "$RESET"
  printf "  %s※ tiny tools. big attitude. zero uploads.%s\n\n" "$DIM" "$RESET"
}

rule() {
  local cols; cols=$(tput cols 2>/dev/null || echo 78)
  (( cols > 78 )) && cols=78
  printf '%s' "$GRY"
  printf '─%.0s' $(seq 1 "$cols")
  printf '%s\n' "$RESET"
}

step()  { printf "  %s▸%s %s\n"            "$LIME" "$RESET" "$1"; }
info()  { printf "  %s·%s %s\n"            "$GRY"  "$RESET" "$1"; }
ok()    { printf "  %s✓%s %s\n"            "$LIME" "$RESET" "$1"; }
warn()  { printf "  %s!%s %s\n"            "$YEL"  "$RESET" "$1"; }
fail()  { printf "  %s✗%s %s\n"            "$RED"  "$RESET" "$1" >&2; }

# ─── env ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${TOOLSHED_PORT:-8665}"
MODE="${1:-}"
IMAGE_NAME="toolshed"
CONTAINER_NAME="toolshed"

usage() {
  cat <<EOF
${BOLD}usage:${RESET} ./install.sh [docker|self-hosted|stop|--help]

  docker         build & run the containerized stack
  self-hosted    install bun deps and run on this machine
  stop           stop & remove the toolshed container
  (no args)      interactive picker

${BOLD}env:${RESET}
  TOOLSHED_PORT  port to bind on host (default: 8665)
EOF
}

# ─── prompts ──────────────────────────────────────────────────────────────────
pick_mode() {
  printf "  %sHow would you like to spin up TOOLSHED?%s\n\n" "$BOLD" "$RESET"
  printf "    %s[1]%s  %sdocker%s        — containerized, one command, clean exit\n" "$LIME" "$RESET" "$BOLD" "$RESET"
  printf "    %s[2]%s  %sself-hosted%s   — run directly with bun on this machine\n" "$LIME" "$RESET" "$BOLD" "$RESET"
  printf "    %s[q]%s  quit\n\n" "$GRY" "$RESET"
  local choice
  while :; do
    printf "  %s?%s choice [1/2/q]: " "$CYAN" "$RESET"
    read -r choice </dev/tty || { echo; exit 130; }
    case "${choice,,}" in
      1|d|docker)        MODE="docker"; return ;;
      2|s|self|self-hosted|host) MODE="self-hosted"; return ;;
      q|quit|exit)       echo; info "later."; exit 0 ;;
      *)                 warn "pick 1, 2, or q." ;;
    esac
  done
}

confirm_port() {
  local p="$PORT"
  printf "  %s?%s port [%s]: " "$CYAN" "$RESET" "$p"
  local input
  read -r input </dev/tty || { echo; return; }
  [[ -n "$input" ]] && PORT="$input"
  if ! [[ "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
    fail "invalid port: $PORT"; exit 1
  fi
}

# ─── docker path ──────────────────────────────────────────────────────────────
ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    fail "docker not found on PATH."
    info "install docker: https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    fail "docker daemon isn't responding. is it running?"
    exit 1
  fi
  ok "docker is alive ($(docker --version | awk '{print $3}' | tr -d ','))"
}

run_docker() {
  ensure_docker
  confirm_port

  step "building image ${BOLD}${IMAGE_NAME}${RESET} ${DIM}(this can take a minute on first run)${RESET}"
  docker build -t "$IMAGE_NAME" . | sed "s/^/  ${GRY}│${RESET} /"
  ok "image built"

  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    info "removing existing container '${CONTAINER_NAME}'"
    docker rm -f "$CONTAINER_NAME" >/dev/null
  fi

  step "starting container on port ${BOLD}${PORT}${RESET}"
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "${PORT}:8665" \
    "$IMAGE_NAME" >/dev/null
  ok "container '${CONTAINER_NAME}' is up"

  finish_banner "http://localhost:${PORT}"
  printf "  %slogs:%s  docker logs -f %s\n"   "$DIM" "$RESET" "$CONTAINER_NAME"
  printf "  %sstop:%s  ./install.sh stop\n\n" "$DIM" "$RESET"
}

stop_docker() {
  ensure_docker
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    docker rm -f "$CONTAINER_NAME" >/dev/null
    ok "stopped & removed '${CONTAINER_NAME}'"
  else
    info "no '${CONTAINER_NAME}' container to stop"
  fi
}

# ─── self-hosted path ─────────────────────────────────────────────────────────
ensure_bun() {
  if command -v bun >/dev/null 2>&1; then
    ok "bun detected ($(bun --version))"
    return
  fi
  warn "bun not found."
  printf "  %s?%s install bun via the official installer? [Y/n]: " "$CYAN" "$RESET"
  local ans
  read -r ans </dev/tty || ans="y"
  case "${ans,,}" in
    n|no) fail "bun is required. install: https://bun.sh"; exit 1 ;;
  esac
  step "installing bun"
  curl -fsSL https://bun.sh/install | bash
  # shellcheck disable=SC1091
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  if ! command -v bun >/dev/null 2>&1; then
    fail "bun install ran but 'bun' isn't on PATH. open a new shell and re-run."
    exit 1
  fi
  ok "bun installed ($(bun --version))"
}

run_self_hosted() {
  ensure_bun
  confirm_port

  step "installing dependencies"
  bun install | sed "s/^/  ${GRY}│${RESET} /"
  ok "dependencies installed"

  finish_banner "http://localhost:${PORT}"
  printf "  %sstop:%s  ctrl-c\n\n" "$DIM" "$RESET"

  step "starting toolshed (vite dev) — your browser opens shortly"
  exec bun run dev --host 0.0.0.0 --port "$PORT"
}

# ─── outro ────────────────────────────────────────────────────────────────────
finish_banner() {
  local url="$1"
  echo
  rule
  printf "  %s%sTOOLSHED is open.%s  %s%s%s\n" "$BOLD" "$LIME" "$RESET" "$BOLD" "$url" "$RESET"
  rule
  echo
}

# ─── dispatch ─────────────────────────────────────────────────────────────────
main() {
  case "${MODE}" in
    -h|--help|help) usage; exit 0 ;;
    stop)           banner; stop_docker; exit 0 ;;
    docker)         banner; run_docker ;;
    self-hosted|self|host) banner; run_self_hosted ;;
    "")             banner; pick_mode
                    case "$MODE" in
                      docker)      run_docker ;;
                      self-hosted) run_self_hosted ;;
                    esac ;;
    *) usage; exit 2 ;;
  esac
}

main "$@"
