#!/bin/bash

###############################################################################
# 🎨 VAPPLER REBRAND SCRIPT
# Converts all "Vappler" / "vulcan-scan" references to "Vappler"
# Date: November 1, 2025
###############################################################################

set -e  # Exit on error

echo "🎨 Starting Vappler Rebrand..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

###############################################################################
# 1. BACKUP CURRENT STATE
###############################################################################
echo -e "${BLUE}[1/7]${NC} Creating backup..."
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Aborting."
    exit 1
fi

# Ensure clean working directory
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit first:"
    echo "   git status"
    echo "   git add ."
    echo "   git commit -m 'work in progress'"
    exit 1
fi

echo -e "${GREEN}✅ Working directory clean${NC}"
echo ""

###############################################################################
# 2. RENAME DIRECTORY (if needed)
###############################################################################
echo -e "${BLUE}[2/7]${NC} Checking directory name..."

CURRENT_DIR=$(basename "$(pwd)")
if [ "$CURRENT_DIR" != "vappler" ]; then
    echo "⚠️  Current directory: $CURRENT_DIR"
    echo "   (You'll need to rename the parent directory separately)"
    echo "   Run this in parent directory: mv $CURRENT_DIR vappler"
else
    echo -e "${GREEN}✅ Directory already named 'vappler'${NC}"
fi
echo ""

###############################################################################
# 3. UPDATE GIT REMOTE URL
###############################################################################
echo -e "${BLUE}[3/7]${NC} Updating git remote URL..."

CURRENT_REMOTE=$(git config --get remote.origin.url)
echo "   Current remote: $CURRENT_REMOTE"

# Check if already using new URL
if echo "$CURRENT_REMOTE" | grep -q "vappler"; then
    echo -e "${GREEN}✅ Git remote already updated${NC}"
else
    echo "   To update to new repository:"
    echo "   git remote set-url origin https://github.com/aspida-security/vappler.git"
    echo ""
    echo "   Run this after rebrand completes!"
fi
echo ""

###############################################################################
# 4. FIND-AND-REPLACE: CASE 1 - "Vappler" (with space)
###############################################################################
echo -e "${BLUE}[4/7]${NC} Replacing 'Vappler' → 'Vappler'..."

COUNTER=0
for file in $(grep -r "Vappler" --exclude-dir={node_modules,.git,dist,build} --exclude="*.lock" --exclude="*.css" . 2>/dev/null | cut -d: -f1 | sort -u); do
    sed -i 's/Vappler/Vappler/g' "$file"
    ((COUNTER++)) || true
done

echo -e "${GREEN}✅ Updated $COUNTER files${NC}"
echo ""

###############################################################################
# 5. FIND-AND-REPLACE: CASE 2 - "Vappler" (hyphenated)
###############################################################################
echo -e "${BLUE}[5/7]${NC} Replacing 'Vappler' → 'Vappler'..."

COUNTER=0
for file in $(grep -r "Vappler" --exclude-dir={node_modules,.git,dist,build} --exclude="*.lock" . 2>/dev/null | cut -d: -f1 | sort -u); do
    sed -i 's/Vappler/Vappler/g' "$file"
    ((COUNTER++)) || true
done

echo -e "${GREEN}✅ Updated $COUNTER files${NC}"
echo ""

###############################################################################
# 6. FIND-AND-REPLACE: CASE 3 - "vulcan-scan" (lowercase)
###############################################################################
echo -e "${BLUE}[6/7]${NC} Replacing 'vulcan-scan' → 'vappler'..."

COUNTER=0

# Special handling for specific files
# Container names in docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    sed -i 's/vulcan-redis/vappler-redis/g' docker-compose.yml
    sed -i 's/vulcan-api/vappler-api/g' docker-compose.yml
    sed -i 's/vulcan-worker/vappler-worker/g' docker-compose.yml
    sed -i 's/vulcan-test-target/vappler-test-target/g' docker-compose.yml
    sed -i 's/vulcan-net/vappler-net/g' docker-compose.yml
    echo -e "${GREEN}✅ Updated docker-compose.yml${NC}"
    ((COUNTER++))
fi

# localStorage keys in AuthContext
if [ -f "src/contexts/AuthContext.jsx" ]; then
    sed -i "s/'vulcan_session'/'vappler_session'/g" src/contexts/AuthContext.jsx
    sed -i "s/'vulcan_user'/'vappler_user'/g" src/contexts/AuthContext.jsx
    echo -e "${GREEN}✅ Updated src/contexts/AuthContext.jsx${NC}"
    ((COUNTER++))
fi

# General lowercase replacement (careful with this)
for file in $(grep -r "vulcan-scan" --exclude-dir={node_modules,.git,dist,build} --exclude="*.lock" --exclude="docker-compose.yml" --exclude="AuthContext.jsx" . 2>/dev/null | cut -d: -f1 | sort -u); do
    sed -i 's/vulcan-scan/vappler/g' "$file"
    ((COUNTER++)) || true
done

echo -e "${GREEN}✅ Updated $COUNTER files${NC}"
echo ""

###############################################################################
# 7. FIND-AND-REPLACE: CASE 4 - "Vulcan" (singular, capitalize)
###############################################################################
echo -e "${BLUE}[7/7]${NC} Replacing 'Vulcan' → 'Vappler' (singular)..."

COUNTER=0

# Be careful with this - only replace in non-code files first
for file in $(grep -r "\bVulcan\b" --exclude-dir={node_modules,.git,dist,build} --exclude="*.lock" --exclude="*.jsx" --exclude="*.js" --exclude="*.ts" . 2>/dev/null | cut -d: -f1 | sort -u); do
    sed -i 's/\bVulcan\b/Vappler/g' "$file"
    ((COUNTER++)) || true
done

echo -e "${GREEN}✅ Updated $COUNTER files${NC}"
echo ""

###############################################################################
# SUMMARY
###############################################################################
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ REBRAND COMPLETE!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1️⃣  Verify changes:"
echo "    git diff --stat"
echo ""
echo "2️⃣  Review specific files:"
echo "    git diff src/pages/register/index.jsx"
echo "    git diff package.json"
echo ""
echo "3️⃣  Update git remote (if using new repo):"
echo "    git remote set-url origin https://github.com/aspida-security/vappler.git"
echo ""
echo "4️⃣  Commit rebrand:"
echo "    git add ."
echo "    git commit -m '🎨 Rebrand: Vappler → Vappler'"
echo ""
echo "5️⃣  Push to GitHub:"
echo "    git push -u origin main"
echo ""
echo "6️⃣  Update local directory name (in parent dir):"
echo "    cd .."
echo "    mv $CURRENT_DIR vappler"
echo "    cd vappler"
echo ""
echo -e "${GREEN}🎉 All done!${NC}"
