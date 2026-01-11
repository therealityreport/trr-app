#!/bin/bash
#
# Risky Bash Command Blocker
# Prevents Claude from running potentially destructive commands
#
# This hook checks for dangerous command patterns before execution.
# If a risky pattern is detected, the command is blocked.

COMMAND="$1"

# Exit codes
EXIT_BLOCKED=1
EXIT_ALLOWED=0

# List of risky command patterns
# These patterns are checked using grep -E (extended regex)
RISKY_PATTERNS=(
  # Dangerous deletions
  "rm -rf /"
  "rm -fr /"
  "rm -rf \*"
  "rm -fr \*"
  "rm -rf \~"
  "rm -fr \~"

  # Disk operations
  "dd if="
  "mkfs"
  "fdisk"
  "parted"

  # Fork bombs
  ":\(\)\{ :\|:& \};"

  # Mass moves/copies to root
  "mv /\* "
  "cp .* /"

  # Dangerous permissions
  "chmod -R 777"
  "chmod 777 -R"
  "chown -R root"

  # Piping to shells (potential malware)
  "curl.*\|.*bash"
  "curl.*\|.*sh"
  "wget.*\|.*bash"
  "wget.*\|.*sh"
  "curl.*\| sh"
  "wget.*\| sh"

  # Sudo commands (require explicit user approval)
  "sudo rm"
  "sudo dd"
  "sudo mkfs"
  "sudo chmod"
  "sudo chown"

  # Potentially destructive redirects
  "> /dev/sda"
  "> /dev/disk"

  # Kernel/system modifications
  "sysctl"
  "modprobe"

  # Package manager uninstalls (mass)
  "apt-get.*purge"
  "yum.*remove"
  "npm.*uninstall -g"
)

# Check command against each risky pattern
for pattern in "${RISKY_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "----------------------------------------------" >&2
    echo "ALERT: BLOCKED: Risky command detected" >&2
    echo "----------------------------------------------" >&2
    echo "" >&2
    echo "Pattern matched: $pattern" >&2
    echo "Command: $COMMAND" >&2
    echo "" >&2
    echo "This command appears to be potentially destructive." >&2
    echo "If you need to run this command, ask the user for" >&2
    echo "explicit approval before proceeding." >&2
    echo "" >&2
    echo "----------------------------------------------" >&2
    exit $EXIT_BLOCKED
  fi
done

# Command is safe - allow execution
exit $EXIT_ALLOWED
