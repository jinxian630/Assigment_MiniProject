# Worklets/Reanimated Version Mismatch Fix Guide

## Problem

Your mobile app crashes with:

```
[Worklets] Mismatch between JavaScript part and native part (0.7.1 vs 0.5.1)
```

**Why this happens:**

- `react-native-reanimated` is installed as a transitive dependency (not in package.json directly)
- The version doesn't match what Expo Go on mobile expects
- Web (PC) works because it doesn't use native Worklets runtime
- Mobile crashes because Expo Go has fixed native versions

## Solution: Install Expo-Compatible Versions

### Step 1: Install React Native Reanimated (Expo-compatible)

Run this command to install the version that matches your Expo SDK 54:

```bash
npx expo install react-native-reanimated
```

**IMPORTANT:** Use `expo install`, NOT `npm install`! This ensures you get the version compatible with Expo SDK 54.

### Step 2: Ensure Other Dependencies Are Expo-Compatible

While you're at it, make sure these are also Expo-compatible:

```bash
npx expo install react-native-gesture-handler react-native-screens
```

### Step 3: Verify Babel Config

✅ **Already done!** Your `babel.config.js` already has the reanimated plugin as the last plugin:

```javascript
"react-native-reanimated/plugin", // ✅ MUST be last
```

### Step 4: Clear Caches and Reinstall

After installing, do a clean reinstall:

```bash
# Stop your current dev server (Ctrl+C)

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall everything
npm install

# Start with cleared cache
npx expo start -c
```

**On Windows PowerShell:**

```powershell
# Remove node_modules and lock file
Remove-Item -Recurse -Force node_modules, package-lock.json

# Reinstall
npm install

# Start with cleared cache
npx expo start -c
```

### Step 5: If Using Dev Client (Not Expo Go)

If you're building a development client (not using Expo Go), you'll need to rebuild native code:

```bash
npx expo prebuild --clean
# Then rebuild via EAS or Android Studio / Xcode
```

## Verification

After following these steps:

1. ✅ The Worklets error should disappear
2. ✅ Memory Timeline page should load on mobile
3. ✅ FilterModal should work without crashes
4. ✅ Voice recording should work on mobile (expo-av)
5. ✅ Voice recording should work on web (MediaRecorder)

## Why This Works

- `expo install` automatically selects versions compatible with your Expo SDK
- The babel plugin transforms reanimated code correctly
- Clearing cache ensures old incorrect code isn't used
- Both modules (memory-book and health-fitness) can now coexist

## Current Status

✅ **Already Configured:**

- Babel plugin for reanimated (in `babel.config.js`)
- Error Boundary for memory-book module (suppresses Worklets errors as fallback)
- Safety check in FilterModal (prevents crashes if EMOTION_COLORS is undefined)

⏳ **Needs Action:**

- Run `npx expo install react-native-reanimated` (Step 1)
- Clear cache and restart (Step 4)

## Questions?

**Q: Do I need to rebuild if using Expo Go?**  
A: No, Expo Go handles native modules automatically. Just restart with cleared cache.

**Q: Will this break the health-fitness module?**  
A: No, both modules will work together since they'll use the same Expo-compatible reanimated version.

**Q: Why did this happen after merging with health-fitness?**  
A: The health-fitness module (or one of its dependencies) pulled in a version of reanimated that doesn't match Expo Go's native version.
