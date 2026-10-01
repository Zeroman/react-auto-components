#!/usr/bin/env bash

# Purpose:
# - This script is a lightweight command launcher for quickly adding personal
#   shell commands without maintaining a separate CLI framework.
# - Add a new function named `cmd_<name>()`, then run it with `./run.sh <name>`.
# - Run `./run.sh help` to see discovered commands and aliases.
# - Requires Bash 4.0 or newer.
#
# How commands are defined:
# - `cmd_<name>()` defines a normal command, for example `cmd_test_1()` becomes
#   `./run.sh test_1`.
# - `run_<prefix>_handler()` defines a prefix handler, for example
#   `run_test_handler()` handles `./run.sh test_xxx`.
# - Command and handler names may contain letters, numbers, and underscores.
# - Nearby comments become help text.
# - `alias -> comment` comments provide both alias and help text; comments
#   without `->` provide help text only.
# - Command names must be unique; aliases must be unique; aliases must not
#   conflict with command names.
#
# Supported comment layouts:
# - same line: `cmd_test_1() { # a1 -> test 1`
# - next line: `cmd_test_2()  # a2 -> test 2`
# - previous line:
#   `# z3 -> test 3`
#   `cmd_test_3()`
#
# How input is matched and executed:
# 1. exact command name or alias
# 2. handler prefix like `test_*`; the longest matching handler prefix wins
# 3. path route like `tests/*`; the longest matching path prefix wins
# 4. fuzzy command match
# 5. raw handler fallback
#
# Handler argument rules:
# - `./run.sh test_demo a b` calls `run_test_handler demo a b`.
# - `./run.sh test a b` calls `run_test_handler a b`.
#
# Path routes:
# - Register path routes with `add_path_route "tests/" run_pytest`.
# - Route prefixes must end with `/`.
# - A path route function receives the full matched path as `$1`, followed by
#   remaining command arguments.
#
# Fuzzy match rules:
# - command names are split on `_`
# - `_` in the input pattern is ignored
# - the pattern may be split into non-empty pieces
# - each piece must match the continuous prefix of a later command segment
# - matching can start at any segment, and can skip segments
# - segment internals are not matched as subsequences
#
# Notes for AI/code agents:
# - Keep reusable launcher internals above `# --- OS-specific setup ---`.
# - Keep project-specific commands below `# --- User-defined Commands ---`.
# - Preserve dispatch order and argument forwarding semantics unless explicitly
#   changing the launcher contract.
# - Launcher status messages should go to stderr; command output should remain
#   on stdout for piping.
# - Do not introduce Bash features newer than Bash 4 without updating the
#   version guard.

RUN_SH_MIN_BASH_MAJOR=4
if [[ -z "${BASH_VERSINFO[0]:-}" || "${BASH_VERSINFO[0]}" -lt "$RUN_SH_MIN_BASH_MAJOR" ]]; then
    echo "Error: run.sh requires Bash ${RUN_SH_MIN_BASH_MAJOR}.0 or newer; current version is ${BASH_VERSION:-unknown}." >&2
    exit 2
fi

cur_dir=$PWD
cur_path="${BASH_SOURCE[0]}"
if [[ "$cur_path" != */* ]]; then
    cur_path="$(command -v "$cur_path")"
fi
cur_workdir=$(cd "$(dirname "$cur_path")" && pwd -L)
cur_filename=$(basename "$cur_path")
cur_path="${cur_workdir}/${cur_filename}"

# --- Cached Index Data ---
# These globals are populated once per process. They cache the scanned command
# metadata so the dispatcher does not reparse the script multiple times.
SCAN_DATA=""
CMD_DATA=""
HANDLER_DATA=""
RUN_SH_FIELD_SEP=$'\034'
declare -a CMD_NAMES=()
declare -a HANDLER_NAMES=()
declare -A CMD_LOOKUP=()
declare -A CMD_ALIAS_BY_NAME=()
declare -A CMD_COMMENT_BY_NAME=()
declare -A HANDLER_EXISTS=()
declare -A HANDLER_COMMENT_BY_NAME=()
declare -a RUN_PATH_ROUTE_PREFIXES=()
declare -a RUN_PATH_ROUTE_FUNCS=()

# --- Utility Functions ---
add_path_route() {
    local prefix="$1"
    local func="$2"

    if [[ -z "$prefix" || -z "$func" ]]; then
        echo "add_path_route requires a path prefix and function name." >&2
        return 1
    fi
    if [[ "$prefix" != */ ]]; then
        echo "add_path_route prefix must end with '/': $prefix" >&2
        return 1
    fi

    RUN_PATH_ROUTE_PREFIXES+=("$prefix")
    RUN_PATH_ROUTE_FUNCS+=("$func")
}

trim() {
    local var="$*"
    var="${var#${var%%[![:space:]]*}}" # remove leading whitespace
    var="${var%${var##*[![:space:]]}}" # remove trailing whitespace
    echo -n "$var"
}

select_yes_or_no() {
    local tip="$*"
    # if tip is not empty, add space
    if [[ -n "$tip" ]]; then
        tip="$tip "
    fi
    echo "${tip}Are you sure you want to continue? [Y/n]" >&2
    read -r input
    case "$input" in
    [yY][eE][sS] | [yY])
        echo "yes"
        ;;
    [nN][oO] | [nN])
        echo "no"
        ;;
    *)
        echo "Invalid input: $input" >&2
        echo "no"
        ;;
    esac
}

_internal_fuzzy_highlight_path() {
    local item="$1"
    local path="$2"
    local highlight_start=$'\033[1;31m'
    local highlight_end=$'\033[0m'
    local entry index len i segment
    local -a segments
    local -A highlight_lens=()

    IFS='_' read -r -a segments <<< "$item"

    for entry in $path; do
        index="${entry%%:*}"
        len="${entry#*:}"
        highlight_lens["$index"]="$len"
    done

    for ((i = 0; i < ${#segments[@]}; i++)); do
        segment="${segments[i]}"
        len="${highlight_lens[$i]:-0}"

        if ((i > 0)); then
            printf '_'
        fi

        if ((len > 0)); then
            printf '%s%s%s%s' \
                "$highlight_start" \
                "${segment:0:len}" \
                "$highlight_end" \
                "${segment:len}"
        else
            printf '%s' "$segment"
        fi
    done
}

# --- Source Scan ---
_internal_scan_script_index() {
    # Single source scan for both commands and handlers.
    # Output format:
    #   cmd<sep>name<sep>alias<sep>comment
    #   handler<sep>prefix_*<sep><sep>comment
    awk -v sep="$RUN_SH_FIELD_SEP" '
        BEGIN { OFS=sep ; ORS="\n" }
        { lines[NR] = $0 }

        function extract_comment(idx, rest_of_line,    comment_part) {
            comment_part = ""
            if (rest_of_line ~ /#/) {
                comment_part = rest_of_line
                sub(/.*#/, "", comment_part)
            } else if (idx + 1 <= NR && lines[idx + 1] ~ /^[[:space:]]*#/) {
                comment_part = lines[idx + 1]
                sub(/^[[:space:]]*#/, "", comment_part)
            } else if (idx > 1 && lines[idx - 1] ~ /^[[:space:]]*#/) {
                comment_part = lines[idx - 1]
                sub(/^[[:space:]]*#/, "", comment_part)
            }
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", comment_part)
            return comment_part
        }

        END {
            for (i = 1; i <= NR; i++) {
                line = lines[i]

                if (line ~ /^[[:space:]]*cmd_([A-Za-z0-9_]+)[[:space:]]*\(\)/) {
                    name = line
                    sub(/^[[:space:]]*cmd_/, "", name)
                    sub(/[[:space:]]*\(.*/, "", name)

                    rest_of_line = line
                    sub(/^[[:space:]]*cmd_[A-Za-z0-9_]+[[:space:]]*\(\)[[:space:]]*/, "", rest_of_line)

                    comment_part = extract_comment(i, rest_of_line)
                    alias = ""
                    comment = ""
                    if (comment_part != "") {
                        if (match(comment_part, / *-> */)) {
                            alias = substr(comment_part, 1, RSTART - 1)
                            comment = substr(comment_part, RSTART + RLENGTH)
                        } else {
                            comment = comment_part
                        }
                    }
                    print "cmd", name, alias, comment
                    continue
                }

                if (line ~ /^[[:space:]]*run_([A-Za-z0-9_]+)_handler[[:space:]]*\(\)/) {
                    name = line
                    sub(/^[[:space:]]*run_/, "", name)
                    sub(/_handler.*/, "_*", name)

                    rest_of_line = line
                    sub(/^[[:space:]]*run_[A-Za-z0-9_]+_handler[[:space:]]*\(\)[[:space:]]*/, "", rest_of_line)

                    comment_part = extract_comment(i, rest_of_line)
                    comment = ""
                    if (comment_part != "") {
                        if (match(comment_part, / *-> */)) {
                            comment = substr(comment_part, RSTART + RLENGTH)
                        } else {
                            comment = comment_part
                        }
                    }
                    print "handler", name, "", comment
                }
            }
        }
    ' "$cur_path"
}

_internal_extract_scan_data() {
    local type="$1"
    local scan_data="$2"

    awk -F "$RUN_SH_FIELD_SEP" -v sep="$RUN_SH_FIELD_SEP" -v type="$type" '
        $1 == type {
            print $2 sep $3 sep $4
        }
    ' <<< "$scan_data"
}

_internal_load_scan_data() {
    local name alias comment prefix scan_data cmd_data handler_data
    local has_conflict=0
    local -A cmd_name_seen=()
    local -A alias_seen=()

    if [[ -n "$SCAN_DATA" ]]; then
        return
    fi

    scan_data=$(_internal_scan_script_index)
    cmd_data=$(_internal_extract_scan_data "cmd" "$scan_data")
    handler_data=$(_internal_extract_scan_data "handler" "$scan_data")

    while IFS="$RUN_SH_FIELD_SEP" read -r name alias _
    do
        [[ -z "$name" ]] && continue
        if [[ -n "${cmd_name_seen[$name]:-}" ]]; then
            echo "Error: duplicate command name '$name': cmd_$name is defined more than once." >&2
            has_conflict=1
        else
            cmd_name_seen["$name"]=1
        fi
    done <<< "$cmd_data"

    while IFS="$RUN_SH_FIELD_SEP" read -r name alias _
    do
        [[ -z "$name" || -z "$alias" ]] && continue
        if [[ -n "${cmd_name_seen[$alias]:-}" ]]; then
            echo "Error: alias '$alias' for cmd_$name conflicts with command name cmd_$alias." >&2
            has_conflict=1
        fi
        if [[ -n "${alias_seen[$alias]:-}" ]]; then
            echo "Error: duplicate alias '$alias': cmd_${alias_seen[$alias]} and cmd_$name." >&2
            has_conflict=1
        else
            alias_seen["$alias"]="$name"
        fi
    done <<< "$cmd_data"

    if [[ $has_conflict -ne 0 ]]; then
        return 1
    fi

    SCAN_DATA="$scan_data"
    CMD_DATA="$cmd_data"
    HANDLER_DATA="$handler_data"

    CMD_NAMES=()
    HANDLER_NAMES=()
    CMD_LOOKUP=()
    CMD_ALIAS_BY_NAME=()
    CMD_COMMENT_BY_NAME=()
    HANDLER_EXISTS=()
    HANDLER_COMMENT_BY_NAME=()

    while IFS="$RUN_SH_FIELD_SEP" read -r name alias comment
    do
        [[ -z "$name" ]] && continue
        CMD_NAMES+=("$name")
        CMD_LOOKUP["$name"]="$name"
        CMD_ALIAS_BY_NAME["$name"]="$alias"
        CMD_COMMENT_BY_NAME["$name"]="$comment"
        if [[ -n "$alias" ]]; then
            CMD_LOOKUP["$alias"]="$name"
        fi
    done <<< "$CMD_DATA"

    while IFS="$RUN_SH_FIELD_SEP" read -r name _ comment
    do
        [[ -z "$name" ]] && continue
        HANDLER_NAMES+=("$name")
        HANDLER_COMMENT_BY_NAME["$name"]="$comment"
        prefix="${name%\*}"
        prefix="${prefix%_}"
        [[ -n "$prefix" ]] && HANDLER_EXISTS["$prefix"]=1
    done <<< "$HANDLER_DATA"
}

_internal_scan_script_commands() {
    _internal_load_scan_data || return $?
    printf '%s\n' "$CMD_DATA"
}

_internal_scan_script_handlers() {
    _internal_load_scan_data || return $?
    printf '%s\n' "$HANDLER_DATA"
}

# --- Matching Rules ---
_internal_fuzzy_match_path_from() {
    local remaining="$1"
    local start_index="$2"
    local path="$3"
    local i seg max_len len pattern_piece segment_piece next_path

    if [[ -z "$remaining" ]]; then
        echo "${path# }"
        return 0
    fi

    for ((i = start_index; i < ${#_internal_fuzzy_segments[@]}; i++)); do
        seg="${_internal_fuzzy_segments[i]}"
        [[ -z "$seg" ]] && continue

        max_len=${#seg}
        if (( ${#remaining} < max_len )); then
            max_len=${#remaining}
        fi

        for ((len = 1; len <= max_len; len++)); do
            pattern_piece="${remaining:0:len}"
            segment_piece="${seg:0:len}"
            [[ "$pattern_piece" != "$segment_piece" ]] && continue

            next_path="${path} ${i}:${len}"
            if _internal_fuzzy_match_path_from "${remaining:len}" "$((i + 1))" "$next_path"; then
                return 0
            fi
        done
    done

    return 1
}

_internal_fuzzy_match_path() {
    local pattern="$1"
    local item="$2"
    local normalized_pattern
    local -a _internal_fuzzy_segments

    [[ -z "$pattern" || -z "$item" ]] && return 1

    normalized_pattern="${pattern//_/}"
    [[ -z "$normalized_pattern" ]] && return 1

    IFS='_' read -r -a _internal_fuzzy_segments <<< "$item"
    _internal_fuzzy_match_path_from "$normalized_pattern" 0 ""
}

_internal_fuzzy_match() {
    local pattern="$1"
    local item="$2"

    _internal_fuzzy_match_path "$pattern" "$item" >/dev/null
}

find_exact_cmd() {
    local cmd="$1"
    local resolved

    _internal_load_scan_data || return 1
    resolved="${CMD_LOOKUP[$cmd]:-}"
    if [[ -n "$resolved" ]]; then
        echo "$resolved"
        return 0
    fi

    return 2 # No command found
}

_internal_find_handler_prefix() {
    local cmd_name="$1"
    local name prefix
    local best_prefix=""

    _internal_load_scan_data || return 1
    for name in "${HANDLER_NAMES[@]}"; do
        prefix="${name%\*}"
        prefix="${prefix%_}"
        [[ -z "$prefix" ]] && continue

        if [[ "$cmd_name" == "$prefix" || "$cmd_name" == "${prefix}_"* ]]; then
            if (( ${#prefix} > ${#best_prefix} )); then
                best_prefix="$prefix"
            fi
        fi
    done

    [[ -n "$best_prefix" ]] || return 1
    printf '%s\n' "$best_prefix"
}


find_fuzzy_cmd() {
    local cmd="$1"
    local name alias
    local -a fuzzy_matches=()

    _internal_load_scan_data || return 1
    for name in "${CMD_NAMES[@]}"; do
        alias="${CMD_ALIAS_BY_NAME[$name]}"
        # Check fuzzy rule on name/alias:
        # 1) continuous in command text
        # 2) ordered subsequence in '_' segment initials
        if _internal_fuzzy_match "$cmd" "$name" || _internal_fuzzy_match "$cmd" "$alias"; then
            fuzzy_matches+=("$name")
        fi
    done

    if [[ ${#fuzzy_matches[@]} -eq 1 ]]; then
        echo "${fuzzy_matches[0]}"
        return 0
    elif [[ ${#fuzzy_matches[@]} -gt 1 ]]; then
        # Found multiple potential commands
        echo ${fuzzy_matches[@]}
        return 1 # Multiple matches
    fi

    return 2 # No command found
}

_internal_has_function() {
    [[ "$(type -t "$1" 2>/dev/null)" == "function" ]]
}

_internal_run_cmd_by_name() {
    local cmd_name="$1"
    local need_wait="$2"
    shift 2
    local -a cmd_args=("$@")

    echo "Running cmd_${cmd_name}..." >&2
    if [[ "$need_wait" == 'yes' ]]; then
        local ret
        ret=$(select_yes_or_no)
        if [[ "$ret" != 'yes' ]]; then
            echo "Execution cancelled by user." >&2
            return 1
        fi
    fi

    if _internal_has_function "cmd_${cmd_name}"; then
        if ((${#cmd_args[@]} > 0)); then
            "cmd_${cmd_name}" "${cmd_args[@]}"
        else
            "cmd_${cmd_name}"
        fi
        return $?
    fi

    echo "Error: Command function 'cmd_${cmd_name}' not found!" >&2
    return 1
}

_internal_format_help() {
    local cmd_data="$1"
    local handler_data="$2"
    local all_data="${handler_data}"$'\n'"${cmd_data}"
    local max_len=0
    local name alias comment display_name
    local help_line=""
    local other_lines=""

    while IFS="$RUN_SH_FIELD_SEP" read -r name alias _
    do
        [[ -z "$name" ]] && continue
        display_name="$name"
        [[ -n "$alias" ]] && display_name="$name ($alias)"
        (( ${#display_name} > max_len )) && max_len=${#display_name}
    done <<< "$all_data"

    while IFS="$RUN_SH_FIELD_SEP" read -r name alias comment
    do
        [[ -z "$name" ]] && continue
        display_name="$name"
        [[ -n "$alias" ]] && display_name="$name ($alias)"
        printf -v line "  %-*s - %s" "$max_len" "$display_name" "$comment"
        if [[ "$name" == "help" ]]; then
            help_line="$line"
        else
            other_lines+="$line"$'\n'
        fi
    done <<< "$all_data"

    [[ -n "$help_line" ]] && printf '%s\n' "$help_line"
    printf '%s' "$other_lines"
}

_internal_show_output() {
    local output="$1"
    local line_count=0
    local terminal_lines

    while IFS= read -r _
    do
        ((line_count++))
    done <<< "$output"

    if terminal_lines=$(stty size 2>/dev/null); then
        terminal_lines="${terminal_lines%% *}"
    else
        terminal_lines=24
    fi

    if [[ -t 1 ]] && (( line_count > terminal_lines )); then
        printf '%s\n' "$output" | less -r
    else
        printf '%s\n' "$output"
    fi
}

_internal_show_fuzzy_matches() {
    local matches="$1"
    local cmd_name="$2"
    local name alias display_name highlighted_name highlighted_alias name_path alias_path
    local -A selected=()

    for name in $matches; do
        selected["$name"]=1
    done

    for name in "${CMD_NAMES[@]}"; do
        [[ -z "${selected[$name]:-}" ]] && continue
        alias="${CMD_ALIAS_BY_NAME[$name]}"
        highlighted_name="$name"
        highlighted_alias="$alias"

        if name_path=$(_internal_fuzzy_match_path "$cmd_name" "$name"); then
            highlighted_name=$(_internal_fuzzy_highlight_path "$name" "$name_path")
        elif [[ -n "$alias" ]] && alias_path=$(_internal_fuzzy_match_path "$cmd_name" "$alias"); then
            highlighted_alias=$(_internal_fuzzy_highlight_path "$alias" "$alias_path")
        fi

        display_name="$highlighted_name"
        if [[ -n "$alias" ]]; then
            display_name="$display_name ($highlighted_alias)"
        fi
        printf "  %s - %s\n" "$display_name" "${CMD_COMMENT_BY_NAME[$name]}"
    done
}

_run_handler_func() {
    local cmd_name="$1"
    shift
    local cmd_arg1="$1"
    local func="run_${cmd_name}_handler"

    echo "run $cmd_name handler:" >&2
    if [[ "$cmd_name" == "$cmd_arg1" ]]; then
        "$func" "${@:2}"
    else
        local cmd_body="${cmd_arg1#${cmd_name}_}"
        "$func" "$cmd_body" "${@:2}"
    fi
}

_internal_find_path_route_func() {
    local path="$1"
    local i prefix func
    local best_prefix=""
    local best_func=""

    for ((i = 0; i < ${#RUN_PATH_ROUTE_PREFIXES[@]}; i++)); do
        prefix="${RUN_PATH_ROUTE_PREFIXES[i]}"
        func="${RUN_PATH_ROUTE_FUNCS[i]}"

        if [[ "$path" == "$prefix"* && ${#prefix} -gt ${#best_prefix} ]]; then
            best_prefix="$prefix"
            best_func="$func"
        fi
    done

    [[ -n "$best_func" ]] || return 1
    printf '%s\n' "$best_func"
}

_internal_run_path_route() {
    local path="$1"
    shift
    local func

    func=$(_internal_find_path_route_func "$path") || return 2
    if ! _internal_has_function "$func"; then
        echo "Error: Path route function '$func' not found for '$path'." >&2
        return 1
    fi

    "$func" "$path" "$@"
}

run_main() {
    # Dispatch flow:
    # 1. exact command / alias
    # 2. exact handler prefix
    # 3. path route
    # 4. fuzzy command match
    # 5. raw handler fallback
    # If no arguments, show help
    if (($# == 0)); then
        cmd_help
        return
    fi

    # Preserve argument boundaries; avoid globbing and word-splitting
    local -a cmd_param=("$@")
    local need_wait='no'

    # More robustly check for and remove -p/pause flags
    local -a filtered_params=()
    for param in "${cmd_param[@]}"; do
        if [[ "$param" == "-p" || "$param" == "pause" ]]; then
            need_wait='yes'
        else
            filtered_params+=("$param")
        fi
    done
    cmd_param=("${filtered_params[@]}")

    local cmd_name="${cmd_param[0]}"
    # Remove cmd_ prefix if present
    if [[ "$cmd_name" == cmd_* ]]; then
        cmd_name="${cmd_name#cmd_}"
    fi
    # Default to help if empty
    if [[ -z "$cmd_name" ]]; then
        cmd_name="help"
    fi
    # Initialize as empty array to keep it defined under set -u
    local -a cmd_args=()
    # Fill only if there are extra arguments
    if ((${#cmd_param[@]} > 1)); then
        cmd_args=("${cmd_param[@]:1}")
    fi

    _internal_load_scan_data || return $?

    # 1. Exact match for cmd_*
    local _cmd
    _cmd=$(find_exact_cmd "$cmd_name" "$CMD_DATA")
    local exit_code=$?
    if [[ $exit_code -eq 0 && -n "$_cmd" ]]; then
        _internal_run_cmd_by_name "$_cmd" "$need_wait" "${cmd_args[@]}"
        return $?
    elif [[ $exit_code -eq 1 ]]; then # Multiple matches
        echo "Found multiple exact commands: $_cmd" >&2
        return 1
    fi

    # 2. Exact match for handler
    local prefix handler_func

    # Check if a handler function for this prefix exists
    if prefix=$(_internal_find_handler_prefix "$cmd_name"); then
        handler_func="run_${prefix}_handler"
    fi
    if [[ -n "${prefix:-}" ]] && _internal_has_function "$handler_func"; then
        _run_handler_func "$prefix" "$@"
        return $?
    fi

    # 3. Path route match
    if _internal_run_path_route "$cmd_name" "${cmd_args[@]}"; then
        return $?
    else
        exit_code=$?
        if [[ $exit_code -ne 2 ]]; then
            return $exit_code
        fi
    fi

    # 4. Fuzzy match for cmd_*
    _cmd=$(find_fuzzy_cmd "$cmd_name" "$CMD_DATA")
    exit_code=$?
    if [[ $exit_code -eq 0 && -n "$_cmd" ]]; then
        _internal_run_cmd_by_name "$_cmd" "$need_wait" "${cmd_args[@]}"
        return $?
    elif [[ $exit_code -eq 1 ]]; then # Multiple matches
        echo "Found multiple potential commands:" >&2
        _internal_show_fuzzy_matches "$_cmd" "$cmd_name"
        return 1
    elif [[ $exit_code -ne 2 ]]; then # Not "no match", so it's a fatal error.
        return $exit_code
    fi

    # --- Handler Dispatch Logic (fallback when no cmd_ function found) ---
    if [[ $# -gt 0 ]]; then
        local arg1="$1"
        local raw_prefix raw_handler_func

        if raw_prefix=$(_internal_find_handler_prefix "$arg1"); then
            raw_handler_func="run_${raw_prefix}_handler"
        fi
        if [[ -n "${raw_prefix:-}" ]] && _internal_has_function "$raw_handler_func"; then
            _run_handler_func "$raw_prefix" "$@"
            return $?
        fi
    fi
    # --- End of Handler Dispatch Logic ---

    # If neither cmd_ function nor handler was found
    echo "Error: Command or handler '${cmd_name}' not found." >&2
    return 1
}

cmd_help() { # Show all available commands and handler prefixes.
    local output
    _internal_load_scan_data || return $?
    output=$(_internal_format_help "$CMD_DATA" "$HANDLER_DATA")
    _internal_show_output "$output"
}


# --- User-defined Commands ---
# Versions already registered on npm. 0.1.1 and 0.1.2 stayed in validation and
# still cannot be published again. The next release must be a new x.y.z.

_release_bump_patch() {
    local version="$1"
    local major minor patch
    if [[ ! "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
        echo "版本不是 x.y.z: ${version}" >&2
        return 1
    fi
    major="${BASH_REMATCH[1]}"
    minor="${BASH_REMATCH[2]}"
    patch="${BASH_REMATCH[3]}"
    printf '%s.%s.%s\n' "$major" "$minor" "$((patch + 1))"
}

_release_version_taken() {
    case "$1" in
        0.1.0 | 0.1.1 | 0.1.2) return 0 ;;
        *) return 1 ;;
    esac
}

_release_allowed_path() {
    case "$1" in
        package.json | README.md | docs/CHANGELOG.md) return 0 ;;
        docs/i18n/*/README.md | docs/i18n/*/CHANGELOG.md) return 0 ;;
        *) return 1 ;;
    esac
}

_release_reject_other_changes() {
    local line path
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ -z "$line" ]] && continue
        path="${line:3}"
        path="${path#* -> }"
        if ! _release_allowed_path "$path"; then
            echo "工作区有发版以外的改动: ${path}" >&2
            return 1
        fi
    done < <(git status --porcelain=v1)
}

_release_apply_version() {
    local mode="$1"
    local version="$2"
    local today="$3"
    python3 - "$mode" "$version" "$today" << 'PY'
import json
import pathlib
import re
import sys

mode, version, today = sys.argv[1], sys.argv[2], sys.argv[3]
root = pathlib.Path.cwd()
errors = []
pkg_path = root / "package.json"
pkg = json.loads(pkg_path.read_text())
old = pkg["version"]
if pkg.get("name") != "@zeroman.yang/react-auto-components":
    errors.append("package.json name is %s" % pkg.get("name"))

version_heading = re.compile(r"^## (\d+\.\d+\.\d+)(?:\s|$)")
changelogs = [root / "docs" / "CHANGELOG.md"]
changelogs += sorted((root / "docs" / "i18n").glob("*/CHANGELOG.md"))
readmes = [root / "README.md"]
readmes += sorted((root / "docs" / "i18n").glob("*/README.md"))
if len(changelogs) < 10:
    errors.append("found %s changelogs, expected at least 10" % len(changelogs))
if len(readmes) < 10:
    errors.append("found %s READMEs, expected at least 10" % len(readmes))

def body_after(lines, start):
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    return "".join(lines[start + 1:end]).strip()

def version_index(lines):
    for i, line in enumerate(lines):
        match = version_heading.match(line)
        if match and match.group(1) == version:
            return i
    return None

changelog_writes = []
for path in changelogs:
    if not path.is_file():
        errors.append("%s: missing" % path)
        continue
    lines = path.read_text().splitlines(keepends=True)
    try:
        index = next(i for i, line in enumerate(lines) if line.startswith("## "))
    except StopIteration:
        errors.append("%s: missing a section heading" % path)
        continue
    existing = version_index(lines)
    if existing is not None:
        if not body_after(lines, existing):
            errors.append("%s: version section has no notes" % path)
            continue
        if index != existing and not version_heading.match(lines[index]) and body_after(lines, index):
            errors.append("%s: unreleased section still has notes while ## %s exists" % (path, version))
        continue
    match = version_heading.match(lines[index])
    if match:
        errors.append("%s: first section is %s; write notes under the unreleased heading" % (path, match.group(1)))
        continue
    if not body_after(lines, index):
        errors.append("%s: unreleased section has no notes" % path)
        continue
    heading = lines[index]
    rewritten = lines.copy()
    rewritten[index] = "## %s - %s\n" % (version, today)
    rewritten.insert(index, "\n")
    rewritten.insert(index, heading if heading.endswith("\n") else heading + "\n")
    changelog_writes.append((path, "".join(rewritten)))

readme_writes = []
if old != version:
    token = re.compile(r"(?<![\d.])" + re.escape(old) + r"(?![\d.])")
    for path in readmes:
        if not path.is_file():
            errors.append("%s: missing" % path)
            continue
        text = path.read_text()
        if not token.search(text):
            errors.append("%s: does not mention %s" % (path, old))
            continue
        readme_writes.append((path, token.sub(version, text)))
else:
    token = re.compile(r"(?<![\d.])" + re.escape(version) + r"(?![\d.])")
    for path in readmes:
        if not path.is_file() or not token.search(path.read_text()):
            errors.append("%s: does not mention %s" % (path, version))

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
if mode == "check":
    print("release notes found in %s changelogs" % len(changelogs))
    sys.exit(0)

for path, text in changelog_writes:
    path.write_text(text)
if old != version:
    pkg["version"] = version
    pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n")
for path, text in readme_writes:
    path.write_text(text)
print("updated %s changelogs and %s READMEs" % (len(changelog_writes), len(readme_writes)))
PY
}

_release_registry_has_version() {
    local version="$1"
    local versions_json status
    if ! versions_json=$(npm view @zeroman.yang/react-auto-components versions --json --registry=https://registry.npmjs.org/); then
        echo "无法读取 npm 上已有的版本。" >&2
        return 1
    fi
    node -e '
const fs = require("fs");
const version = process.argv[1];
let parsed = JSON.parse(fs.readFileSync(0, "utf8"));
if (typeof parsed === "string") parsed = [parsed];
if (!Array.isArray(parsed)) process.exit(2);
if (parsed.includes(version)) process.exit(3);
' "$version" <<<"$versions_json"
    status=$?
    if [[ "$status" -eq 3 ]]; then
        echo "npm 上已经有 ${version}。" >&2
        return 1
    fi
    if [[ "$status" -ne 0 ]]; then
        echo "无法解析 npm 版本列表。" >&2
        return 1
    fi
}

cmd_release() { # rel -> 无参数时补丁号加 1，推送 main 和 tag。
    local version="$1"
    local current smaller origin branch today answer

    if [[ "$version" == "-h" || "$version" == "--help" ]]; then
        cat >&2 << 'USAGE'
用法: ./run.sh release [version]
不带参数时，把 package.json 的补丁号加 1，例如 0.1.2 会变成 0.1.3。
./run.sh release 0.2.0 可以指定版本。

先在每个 CHANGELOG 的未发布小节写下本次说明。
脚本会把该小节改成版本标题，更新 package.json 和各语言 README，
提交并推送 main，再推送 tag v<version>。
GitHub Actions 测试通过后才会 npm publish。
不要使用 0.1.0、0.1.1、0.1.2。
USAGE
        return 0
    fi

    cd "$cur_workdir" || return 1
    current=$(node -p "require('./package.json').version") || return 1
    if [[ -z "$version" ]]; then
        version=$(_release_bump_patch "$current") || return 1
        while _release_version_taken "$version"; do
            version=$(_release_bump_patch "$version") || return 1
        done
        echo "未指定版本，从 ${current} 加到 ${version}。" >&2
    else
        if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "版本必须是 x.y.z，例如 0.2.0。" >&2
            return 1
        fi
        if _release_version_taken "$version"; then
            echo "版本 ${version} 已经在 npm 注册过，不能再次发布。" >&2
            return 1
        fi
        if [[ "$version" != "$current" ]]; then
            smaller=$(printf '%s\n%s\n' "$current" "$version" | sort -V | head -1)
            if [[ "$smaller" != "$current" ]]; then
                echo "package.json 当前是 ${current}，新版本必须更高。" >&2
                return 1
            fi
        fi
    fi

    _release_apply_version check "$version" "" || return 1
    _release_reject_other_changes || return 1

    origin=$(git remote get-url origin) || return 1
    case "$origin" in
        *Zeroman/react-auto-components*) ;;
        *)
            echo "origin 不是 Zeroman/react-auto-components: ${origin}" >&2
            return 1
            ;;
    esac
    branch=$(git branch --show-current)
    if [[ "$branch" != "main" ]]; then
        echo "当前分支是 ${branch:-detached}，发版要在 main 上。" >&2
        return 1
    fi

    git fetch origin main --tags || return 1
    if ! git merge-base --is-ancestor origin/main HEAD; then
        echo "本地 main 落后或偏离 origin/main。" >&2
        return 1
    fi
    if git rev-parse -q --verify "refs/tags/v${version}" >/dev/null; then
        echo "本地已有 tag v${version}。" >&2
        return 1
    fi
    if git ls-remote --tags origin "refs/tags/v${version}" | grep -q .; then
        echo "远端已有 tag v${version}。" >&2
        return 1
    fi
    _release_registry_has_version "$version" || return 1

    today=$(date +%Y-%m-%d)
    _release_apply_version write "$version" "$today" || return 1

    echo "运行 check:public、typecheck 和 test。" >&2
    if ! pnpm check:public || ! pnpm typecheck || ! pnpm test; then
        echo "检查失败。版本文件留在工作区，没有提交，也没有推送。" >&2
        return 1
    fi

    echo "即将提交这些改动并推送 tag v${version}：" >&2
    git diff --stat >&2
    if [[ ! -t 0 ]]; then
        echo "发版需要在交互终端里确认。" >&2
        return 1
    fi
    answer=$(select_yes_or_no "推送 main，并推送 tag v${version} 以发布到 npm。")
    if [[ "$answer" != "yes" ]]; then
        echo "已取消，没有推送。" >&2
        return 1
    fi

    git add -- package.json README.md docs/CHANGELOG.md docs/i18n/*/README.md docs/i18n/*/CHANGELOG.md || return 1
    if ! git diff --cached --quiet; then
        git commit -m "chore(release): bump to ${version}" || return 1
    fi
    git push origin main || return 1
    git tag "v${version}" || return 1
    git push origin "v${version}" || return 1
    echo "已推送 v${version}。GitHub Actions 的 Publish 工作流会测试并发布到 npm。"
}

run_main "$@"
