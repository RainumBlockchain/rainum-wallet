#!/bin/bash
# Setup clean commit hooks for Rainum repos
# Run this script to install commit message cleaning

HOOK_CONTENT='#!/bin/bash
# Auto-clean commit messages

commit_msg_file="$1"
msg=$(cat "$commit_msg_file")

# Remove Claude references
msg=$(echo "$msg" | grep -v "Generated with \[Claude Code\]")
msg=$(echo "$msg" | grep -v "Co-Authored-By: Claude")
msg=$(echo "$msg" | grep -v "https://claude.com/claude-code")
msg=$(echo "$msg" | grep -v "🤖 Generated with")

# Remove emojis
msg=$(echo "$msg" | perl -C -pe '"'"'s/[\x{1F000}-\x{1FFFF}]//g'"'"')
msg=$(echo "$msg" | perl -C -pe '"'"'s/[\x{2600}-\x{27BF}]//g'"'"')

# Remove markdown bold and hype
msg=$(echo "$msg" | sed '"'"'s/\*\*//g'"'"')
msg=$(echo "$msg" | sed -E '"'"'s/LEGENDARY|EPIC|ULTIMATE|BREAKTHROUGH|PERFECT//gi'"'"')
msg=$(echo "$msg" | sed -E '"'"'s/[0-9]+% (Complete|Working|Done)//gi'"'"')
msg=$(echo "$msg" | sed '"'"'s/!$//'"'"')
msg=$(echo "$msg" | sed '"'"'s/✅//g; s/❌//g; s/⚠️//g'"'"')
msg=$(echo "$msg" | sed '"'"'s/  \+/ /g'"'"')

echo "$msg" > "$commit_msg_file"
'

TEMPLATE='# <type>: <short description>
#
# Types: feat, fix, refactor, docs, test, chore
#
# Guidelines:
# - No emojis, no hype words
# - Keep it technical and professional
'

echo "Installing git hooks..."
mkdir -p .git/hooks
echo "$HOOK_CONTENT" > .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
echo "$TEMPLATE" > .gitmessage
git config commit.template .gitmessage
echo "✅ Git hooks installed! Future commits will be automatically cleaned."
