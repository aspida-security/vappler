# 🚀 VAPPLER REBRAND - QUICK REFERENCE

## ONE-LINER EXECUTION

```bash
# If you have everything ready, just run:
chmod +x rebrand-script.sh verify-rebrand.sh && \
./rebrand-script.sh && \
./verify-rebrand.sh && \
git diff --stat && \
git add . && \
git commit -m "🎨 Rebrand: Vappler → Vappler" && \
git remote set-url origin https://github.com/aspida-security/vappler.git && \
git push -u origin main
```

---

## COMMAND CHEAT SHEET

### Pre-Execution
```bash
pwd                    # Verify location
git status            # Check for uncommitted changes
git remote -v         # Verify current remote
git branch            # Confirm on main
```

### Execute Rebrand
```bash
chmod +x rebrand-script.sh verify-rebrand.sh
./rebrand-script.sh    # Perform all replacements
./verify-rebrand.sh    # Verify all changes
```

### Review Changes
```bash
git diff --stat                        # Summary
git diff src/pages/register/index.jsx  # Review specific file
git diff package.json                  # Check metadata
git log -1                             # See current HEAD
```

### Update & Commit
```bash
git remote set-url origin https://github.com/aspida-security/vappler.git
git add .
git commit -m "🎨 Rebrand: Vappler → Vappler"
git push -u origin main
```

### Post-Rebrand
```bash
cd ..
mv vulcan-scan vappler
cd vappler
npm start              # Verify it works
```

---

## VERIFICATION COMMANDS

```bash
# Check for remaining Vulcan references
grep -r "vulcan" --exclude-dir={node_modules,.git,dist,build} .

# Verify Vappler present
grep -r "Vappler" --exclude-dir={node_modules,.git,dist,build} . | wc -l

# Check git remote
git remote -v

# Check package.json
grep '"name"' package.json

# Run verification script
./verify-rebrand.sh
```

---

## FILES THAT CHANGE

| File | Type | Change |
|------|------|--------|
| `package.json` | Config | name → "vappler" |
| `index.html` | Config | title → Vappler |
| `public/manifest.json` | Config | name → Vappler |
| `docker-compose.yml` | Config | vulcan-* → vappler-* |
| `src/pages/register/index.jsx` | UI Text | "Vappler" → "Vappler" |
| `src/contexts/AuthContext.jsx` | Storage | vulcan_* → vappler_* |
| `.supabase/config.toml` | Config | Email sender name |
| `README.md` | Docs | All references updated |

---

## WHAT GETS REPLACED

```
"Vappler"          → "Vappler"
"Vappler"          → "Vappler"
"vulcan-scan"          → "vappler"
vulcan-redis           → vappler-redis
vulcan-api             → vappler-api
vulcan-worker          → vappler-worker
vulcan-test-target     → vappler-test-target
vulcan-net             → vappler-net
vulcan_session         → vappler_session
vulcan_user            → vappler_user
"Vulcan" (comments)    → "Vappler"
```

---

## TROUBLESHOOTING QUICK FIX

| Problem | Solution |
|---------|----------|
| Script won't run | `chmod +x *.sh` |
| Uncommitted changes | `git commit -m "checkpoint"` |
| Verification fails | `grep -r "Vulcan" --exclude-dir={node_modules,.git,dist,build} .` |
| Docker issues | `docker-compose down && docker-compose up --build` |
| Git push fails | `git remote -v` then `git push -u origin main` |

---

## SUCCESS CHECKLIST

- [ ] Both scripts created and executable
- [ ] `./rebrand-script.sh` completes without errors
- [ ] `./verify-rebrand.sh` shows all ✅ and 0 failures
- [ ] `git diff --stat` shows ~50+ files changed
- [ ] `git remote -v` shows new vappler URL
- [ ] Commit message created
- [ ] Push to GitHub successful
- [ ] Local directory renamed to vappler
- [ ] `npm start` works without errors

---

## WHAT'S INCLUDED IN THIS REBRAND

📦 **rebrand-script.sh**
- Automated find-and-replace for all variations
- Special handling for container names, storage keys
- Git validation and pre-checks
- Summary with next steps

📦 **verify-rebrand.sh**
- Verifies all critical files updated
- Checks for remaining old references
- Pass/fail report

📦 **REBRAND_GUIDE.md**
- Detailed step-by-step instructions
- Pre-execution checklist
- File-by-file breakdown
- Troubleshooting guide
- Success criteria

📦 **QUICK_REFERENCE.md** (this file)
- Command cheat sheet
- Quick verification
- File change summary

---

## NEXT STEPS AFTER REBRAND

1. **Directory rename** (cd .., mv vulcan-scan vappler)
2. **Verify app works** (`npm start`)
3. **Git push** (already done in commands above)
4. **Check out workspace-fix branch**
   ```bash
   git checkout feature/workspace-fix
   ```
5. **Continue with workspace RLS fixes**

---

**Time to complete:** ~5 minutes  
**Files affected:** 50+  
**Risk level:** Low (all changes are find-and-replace, fully reversible via git)  
**Created:** November 1, 2025
