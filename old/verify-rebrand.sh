#!/bin/bash

###############################################################################
# ✅ VAPPLER REBRAND VERIFICATION SCRIPT
# Verifies all rebrand changes are complete
###############################################################################

echo "✅ Verifying Vappler Rebrand..."
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Track results
PASS=0
FAIL=0

# Function to check
check_file() {
    local file=$1
    local pattern=$2
    local description=$3

    if [ -f "$file" ]; then
        if grep -q "$pattern" "$file"; then
            echo -e "${GREEN}✅${NC} $description"
            ((PASS++))
        else
            echo -e "${RED}❌${NC} $description - NOT FOUND"
            ((FAIL++))
        fi
    else
        echo -e "${YELLOW}⚠️ ${NC} $description - File not found: $file"
    fi
}

echo -e "${YELLOW}📋 CRITICAL FILES${NC}"
echo ""

check_file "package.json" "Vappler" "package.json has 'Vappler'"
check_file "index.html" "Vappler" "index.html has 'Vappler'"
check_file "public/manifest.json" "Vappler" "manifest.json has 'Vappler'"
check_file "README.md" "Vappler" "README.md has 'Vappler'"
check_file "src/pages/register/index.jsx" "Vappler" "Register page has 'Vappler'"

echo ""
echo -e "${YELLOW}📋 CONFIGURATION FILES${NC}"
echo ""

check_file "docker-compose.yml" "vappler-redis" "docker-compose.yml uses 'vappler' containers"
check_file ".supabase/config.toml" "Vappler" "Supabase config uses 'Vappler'"

echo ""
echo -e "${YELLOW}📋 CONTEXT & STATE${NC}"
echo ""

check_file "src/contexts/AuthContext.jsx" "vappler_session" "AuthContext uses 'vappler_session' key"
check_file "src/contexts/AuthContext.jsx" "vappler_user" "AuthContext uses 'vappler_user' key"

echo ""
echo -e "${YELLOW}📋 NO VULCAN REFERENCES${NC}"
echo ""

# Check for remaining Vulcan references
VULCAN_COUNT=$(grep -r "\bVulcan\b" --exclude-dir={node_modules,.git,dist,build} --exclude="*.lock" . 2>/dev/null | wc -l)
VULCAN_SCAN_COUNT=$(grep -r "vulcan-scan" --exclude-dir={node_modules,.git,dist,build} --exclude="*.lock" . 2>/dev/null | wc -l)

if [ "$VULCAN_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅${NC} No remaining 'Vulcan' references"
    ((PASS++))
else
    echo -e "${RED}❌${NC} Found $VULCAN_COUNT 'Vulcan' references:"
    grep -r "\bVulcan\b" --exclude-dir={node_modules,.git,dist,build} --exclude="*.lock" . 2>/dev/null | head -5
    ((FAIL++))
fi

if [ "$VULCAN_SCAN_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅${NC} No remaining 'vulcan-scan' references"
    ((PASS++))
else
    echo -e "${RED}❌${NC} Found $VULCAN_SCAN_COUNT 'vulcan-scan' references:"
    grep -r "vulcan-scan" --exclude-dir={node_modules,.git,dist,build} --exclude="*.lock" . 2>/dev/null | head -5
    ((FAIL++))
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}🎉 REBRAND VERIFICATION PASSED!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  REBRAND VERIFICATION FAILED${NC}"
    exit 1
fi
