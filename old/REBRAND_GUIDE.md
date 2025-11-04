# 🎨 VAPPLER REBRAND - EXECUTION GUIDE

## 📋 Overview

This guide walks you through the complete rebrand from "Vappler" to "Vappler".

**Scope:** 
- ✅ 50+ files affected
- ✅ Container names, environment keys, user-facing text
- ✅ Git remote URL update
- ✅ Directory rename

---

## ⚠️ PRE-EXECUTION CHECKLIST

Before running the rebrand scripts, verify:

- [ ] You're in the project root directory: `pwd`
- [ ] Git is clean: `git status` (should show nothing)
- [ ] Remote is correct: `git remote -v`
- [ ] On `main` branch: `git branch`
- [ ] Node modules installed: `ls node_modules | head`

**If changes exist, commit them first:**
```bash
git add .
git commit -m "WIP: checkpoint before rebrand"
```

---

## 🚀 STEP-BY-STEP EXECUTION

### Step 1: Make Scripts Executable

```bash
chmod +x rebrand-script.sh verify-rebrand.sh
```

### Step 2: Run Rebrand Script

```bash
./rebrand-script.sh
```

**Expected output:**
```
🎨 Starting Vappler Rebrand...
[1/7] Creating backup...
✅ Working directory clean

[2/7] Checking directory name...
   Current directory: vulcan-scan
   (You'll need to rename the parent directory separately)

[3/7] Updating git remote URL...
   Current remote: https://github.com/aspida-security/vulcan-scan.git
   To update to new repository:
   git remote set-url origin https://github.com/aspida-security/vappler.git

[4/7] Replacing 'Vappler' → 'Vappler'...
✅ Updated X files

[5/7] Replacing 'Vappler' → 'Vappler'...
✅ Updated X files

[6/7] Replacing 'vulcan-scan' → 'vappler'...
✅ Updated X files

[7/7] Replacing 'Vulcan' → 'Vappler' (singular)...
✅ Updated X files
```

### Step 3: Verify Changes

```bash
./verify-rebrand.sh
```

**Expected output:**
```
✅ CRITICAL FILES
✅ package.json has 'Vappler'
✅ index.html has 'Vappler'
✅ manifest.json has 'Vappler'
✅ README.md has 'Vappler'
✅ Register page has 'Vappler'

✅ CONFIGURATION FILES
✅ docker-compose.yml uses 'vappler' containers
✅ .supabase/config.toml uses 'Vappler'

✅ CONTEXT & STATE
✅ AuthContext uses 'vappler_session' key
✅ AuthContext uses 'vappler_user' key

✅ NO VULCAN REFERENCES
✅ No remaining 'Vulcan' references
✅ No remaining 'vulcan-scan' references

Results: 13 passed, 0 failed
🎉 REBRAND VERIFICATION PASSED!
```

### Step 4: Review Specific Changes

```bash
# See summary of all changes
git diff --stat

# Review critical files individually
git diff src/pages/register/index.jsx
git diff package.json
git diff docker-compose.yml
git diff src/contexts/AuthContext.jsx
```

### Step 5: Update Git Remote

```bash
git remote set-url origin https://github.com/aspida-security/vappler.git
git remote -v  # Verify change
```

### Step 6: Commit Rebrand Changes

```bash
git add .
git commit -m "🎨 Rebrand: Vappler → Vappler

- Updated all user-facing text to 'Vappler'
- Renamed container services: vulcan-* → vappler-*
- Updated localStorage keys: vulcan_* → vappler_*
- Updated git remote URL
- Updated environment configuration
- Verified all references replaced"
```

### Step 7: Push to GitHub

```bash
git push -u origin main
```

### Step 8: Rename Local Directory (in parent dir)

```bash
cd ..
mv vulcan-scan vappler
cd vappler
pwd  # Should show path ending in /vappler
```

### Step 9: Verify Everything Works

```bash
# Test build
npm run build

# Check for any remaining old references
grep -r "vulcan" --exclude-dir={node_modules,.git,dist,build} . 2>/dev/null || echo "✅ No Vulcan references found"

# Verify git history
git log --oneline -5
```

---

## 📊 FILES THAT WILL BE MODIFIED

### 🟢 User-Facing (Critical)
- `package.json` - Project name
- `index.html` - Page title
- `public/manifest.json` - App metadata (2 places)
- `README.md` - Documentation
- `src/pages/register/index.jsx` - "Create Vappler Account"
- `src/pages/register/components/TrustSignals.jsx` - Company branding

### 🟡 Configuration
- `docker-compose.yml` - 5 container names
- `.supabase/config.toml` - Email sender name
- `supabase/migrations/*.sql` - Migration references

### 🔵 State Management
- `src/contexts/AuthContext.jsx` - localStorage keys (4 places)

### 🟠 Comments (Code)
- `api.py` - 4 comment updates
- `tasks.py` - 2 comment updates
- `scanner/mapper.py` - 5+ comment updates
- Various service files - "VULCAN CHANGE" comments

### 📄 Documentation
- `ISSUES.md` - Title reference
- Any GitHub wiki pages

---

## 🔍 VERIFICATION CHECKLIST

After rebrand, verify:

### Command Line Checks
```bash
# 1. No Vulcan references
grep -r "vulcan" --exclude-dir={node_modules,.git,dist,build} . 2>/dev/null | wc -l
# Should return: 0

# 2. Has Vappler references
grep -r "Vappler" --exclude-dir={node_modules,.git,dist,build} . 2>/dev/null | wc -l
# Should return: >20

# 3. Check git remote
git remote -v
# Should show: github.com/aspida-security/vappler.git

# 4. Check package.json
cat package.json | grep name
# Should show: "name": "vappler"
```

### Manual Checks
- [ ] Open registration page in browser - should say "Create Vappler Account"
- [ ] Check browser tab title - should say "Vappler"
- [ ] Run `npm install` - should work without issues
- [ ] Run `npm start` - development server starts correctly
- [ ] Git history shows rebrand commit

---

## 🚨 TROUBLESHOOTING

### Issue: Script won't run
```bash
# Fix permissions
chmod +x rebrand-script.sh verify-rebrand.sh
./rebrand-script.sh
```

### Issue: Uncommitted changes error
```bash
# Commit or stash changes
git status
git add .
git commit -m "checkpoint"
# Then retry rebrand
```

### Issue: Still seeing "Vulcan" references
```bash
# Find remaining references
grep -r "Vulcan" --exclude-dir={node_modules,.git,dist,build} .

# Manually fix with sed
sed -i 's/OldVulcan/Vappler/g' src/pages/specific-file.jsx
```

### Issue: Docker containers won't start
```bash
# Rebuild containers with new names
docker-compose down
docker-compose up --build
```

---

## ✅ SUCCESS CRITERIA

Rebrand is complete when:

1. ✅ `./verify-rebrand.sh` passes all checks
2. ✅ `git grep Vulcan` returns 0 results
3. ✅ Registration page displays "Vappler" text
4. ✅ Git remote points to new repository
5. ✅ Commit pushed to GitHub successfully
6. ✅ Local directory renamed to `vappler`
7. ✅ `npm start` runs without issues

---

## 📝 COMMIT MESSAGE TEMPLATE

```
🎨 Rebrand: Vappler → Vappler

CHANGES:
- Updated all branding text: "Vappler" → "Vappler"
- Renamed container services (docker-compose.yml)
- Updated localStorage keys: vulcan_* → vappler_*
- Updated Supabase configuration
- Updated package.json metadata
- Updated HTML page title and manifest
- Updated README and documentation

FILES MODIFIED: 50+
- 5 user-facing text changes
- 3 configuration files
- 2 state management keys
- 40+ code comments and references

REFERENCES: Migration from vulcan-scan to vappler repo
```

---

## 🎯 NEXT STEPS AFTER REBRAND

1. **Update GitHub UI**
   - [ ] Verify repo renamed successfully
   - [ ] Check GitHub Pages if applicable
   - [ ] Update repo description

2. **Update Local Environment**
   - [ ] Rename root directory to `vappler`
   - [ ] Update IDE/editor workspace settings

3. **Communicate Changes**
   - [ ] Update team wiki/docs
   - [ ] Notify CI/CD if applicable
   - [ ] Update deployment scripts if any

4. **Continue Development**
   - [ ] Check out `feature/workspace-fix` branch
   - [ ] Continue with workspace RLS policy fixes

---

**Created:** November 1, 2025  
**Status:** Ready for execution ✅
