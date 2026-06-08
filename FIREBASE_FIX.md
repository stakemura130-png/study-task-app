# Firebase Data Validation and Migration Fix

## Problem
Firebase data validation was failing with "Invalid Firebase data received" because:
- Firebase was returning data from old/migrated accounts
- Old data was missing new fields added in recent versions (e.g., `pomodoroConfig`, `marqueeConfig`)
- The validation in `useStore.ts` was too strict - it rejected the entire data object if ANY field was missing
- This caused infinite loading state because the listener never confirmed data was valid

## Root Cause
When the app was updated with new features, the validation logic expected ALL fields to exist:
```typescript
// OLD CODE - Too strict
if (firebaseData &&
    firebaseData.tasks && Array.isArray(firebaseData.tasks) &&
    firebaseData.exams && Array.isArray(firebaseData.exams) &&
    firebaseData.subjects && Array.isArray(firebaseData.subjects) &&
    firebaseData.statusMeta && Array.isArray(firebaseData.statusMeta) &&
    firebaseData.checklists && typeof firebaseData.checklists === 'object') {
  // ... use data
} else {
  // Invalid data - skip!
}
```

But old data in Firebase only had the basic fields. New fields like `pomodoroCustomization` and `marqueeConfig` were never added to old accounts, causing validation to fail.

## Solution

### 1. Created `validateAndRepairAppState()` function in `firebase.ts`
This function:
- Validates the basic structure (tasks, exams, subjects, statusMeta, checklists)
- If basic structure is valid but optional fields are missing, adds them with defaults
- Ensures all required sub-fields exist (e.g., all checklist subjects)
- Returns a complete, valid `AppState` or `null`

**Key repairs:**
- `marqueeConfig`: Defaults to { patterns: [], speed: 20, switchIntervalMinutes: 5 }
- `pomodoroCustomization`: Defaults with learning color, break color, animations, sound volume
- `menuConfig`: Defaults to standard menu items
- `checklistColorThresholds`: Defaults for all checklist subjects
- `checklists`: Ensures all 9 subject types exist (minpou1, minpou2, keihoi, etc.)

### 2. Updated `loadFromFirebase()` in `firebase.ts`
```typescript
export const loadFromFirebase = async () => {
  // ... fetch from Firebase
  const repairedData = validateAndRepairAppState(data)
  if (repairedData) {
    console.log('[Firebase] Data repaired successfully')
    return repairedData
  }
  return null
}
```

Now always repairs data before returning, ensuring it's valid.

### 3. Updated `subscribeToFirebase()` in `firebase.ts`
```typescript
export const subscribeToFirebase = (callback: (data: AppState) => void) => {
  // ... Firebase listener
  const repairedData = validateAndRepairAppState(rawData)
  if (repairedData) {
    console.log('[Firebase Listener] Data validated and repaired successfully')
    callback(repairedData)  // Only call if data is valid
  }
}
```

Repairs data before passing to callback, ensuring listener always receives valid data.

### 4. Simplified validation in `useStore.ts`
Since data is now repaired upstream in Firebase functions, the validation in `useStore.ts` can be simplified:

```typescript
// OLD: Strict validation checking every field
if (firebaseData && firebaseData.tasks && ... && firebaseData.checklists) {
  // use it
}

// NEW: Simple null check (data is already validated by Firebase functions)
if (firebaseData) {
  console.log('[Firebase Init] Firebase has valid data')
  setState(firebaseData)
}
```

## Benefits

1. **Handles Migration**: Old/migrated data with missing fields is automatically repaired
2. **No Infinite Loading**: Firebase listener now always confirms data (after repair) is valid
3. **Backward Compatible**: Existing data is preserved; only missing fields are added with defaults
4. **Type Safe**: Returns `AppState | null`, clearly indicating validity
5. **Maintainable**: Repair logic is centralized in one function
6. **Logged**: Console logs show data repair happening (helpful for debugging)

## Test Scenarios

### Scenario 1: Old Account with Minimal Data
**Input:** Firebase data with only basic fields (tasks, exams, subjects, checklists)
```json
{
  "tasks": [...],
  "exams": [...],
  "subjects": [...],
  "statusMeta": [...],
  "checklists": { "minpou1": [...] }
}
```

**Output:** Complete AppState with:
- All missing fields added with defaults
- All checklist subjects populated
- pomodoroCustomization with default colors and settings
- marqueeConfig with default speed and patterns
- menuConfig with all menu items

**Result:** App loads successfully, no infinite loading

### Scenario 2: Partial Data (Some New Fields Present)
**Input:** Firebase data with some new fields but incomplete
```json
{
  "tasks": [...],
  "exams": [...],
  "subjects": [...],
  "statusMeta": [...],
  "checklists": {...},
  "marqueeConfig": { "speed": 50 }  // Missing switchIntervalMinutes
}
```

**Output:** 
- Preserves custom `speed: 50`
- Fills in missing `switchIntervalMinutes: 5`

**Result:** User's customizations are preserved while missing fields get defaults

### Scenario 3: Completely Invalid Data
**Input:** Corrupted or incompatible data
```json
{
  "tasks": "not an array",
  "exams": null
}
```

**Output:** `null` (data is invalid)

**Result:** Falls back to localStorage safely

## Implementation Details

### Default Values Used
```typescript
DEFAULT_MARQUEE_CONFIG = {
  patterns: [],
  speed: 20,
  switchIntervalMinutes: 5,
}

DEFAULT_POMODORO_CUSTOMIZATION = {
  learningColor: '#0ea5e9',
  breakColor: '#10b981',
  backgroundImage: null,
  backgroundOpacity: 100,
  enablePulseAnimation: true,
  soundVolume: 100,
}

DEFAULT_MENU_CONFIG = [
  { key: 'board', label: '学習ボード', visible: true, order: 0 },
  { key: 'stats', label: '統計', visible: true, order: 1 },
  { key: 'settings', label: '各種設定', visible: true, order: 2 },
  { key: 'checklist', label: '学習チェックリスト', visible: true, order: 3 },
  { key: 'timer', label: 'ポモドーロ', visible: true, order: 4 },
  { key: 'calendar', label: 'カレンダー', visible: true, order: 5 },
]

DEFAULT_CHECKLIST_COLOR_THRESHOLDS = {
  excellentThreshold: 80,
  goodThreshold: 60,
  excellentColor: '#ec4899',
  goodColor: '#f59e0b',
  poorColor: '#000000',
}
```

### Checklist Subjects Ensured
All 9 subjects are checked and populated if missing:
- minpou1 (民法Ⅰ)
- minpou2 (民法Ⅱ)
- keihoi (刑法)
- kenshou (憲法)
- gyousei (行政法)
- shougou (商法・会社法)
- minjisoshou (民事訴訟法)
- keijisoshou (刑事訴訟法)
- ippanchiski (一般知識)

## Console Logging
Debug logs are added to help track the repair process:
- `[Firebase] Data repaired successfully` - Initial load succeeded
- `[Firebase] Data validation failed - structure is invalid` - Initial load failed (no basic fields)
- `[Firebase Listener] Data validated and repaired successfully` - Listener received valid data
- `[Firebase Listener] Data validation failed - will not update state` - Listener received invalid data

## Files Modified
1. **src/firebase.ts**
   - Added `validateAndRepairAppState()` function
   - Updated `loadFromFirebase()` to call validation
   - Updated `subscribeToFirebase()` to call validation
   - Added default config constants

2. **src/useStore.ts**
   - Simplified validation in `initializeFromFirebase()`
   - Simplified validation in Firebase listener callback
   - Simplified validation in `reloadFromFirebase()`

## Migration Guide for Users
No action needed! The app automatically:
1. Detects old/incomplete Firebase data
2. Repairs missing fields with sensible defaults
3. Saves the repaired data back to Firebase (on next change)
4. Displays app normally

Users keep their existing data and get new features with default settings.
