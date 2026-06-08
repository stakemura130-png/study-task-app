# Pomodoro Timer Fix and Customization Implementation

## Problems Fixed

### 1. Page Scrolling Issue
- **Problem**: The Pomodoro page didn't scroll down properly, making content below the fold inaccessible
- **Solution**: 
  - Updated `.pomodoro-container` to use `overflow-y: auto` and `max-height: 100%`
  - Added `margin-bottom: 40px` to `.pomodoro-card` for spacing
  - Changed `min-height` to `100%` instead of `calc(100vh - 200px)`
  - Ensured proper flex layout for content centering

## Features Added

### 1. Color Customization
**Location**: ⚙ 各種設定 → ポモドーロ設定 → 色設定

Features:
- Color picker for "学習中" (Learning) - Default: #0ea5e9 (Sky Blue)
- Color picker for "休憩中" (Break) - Default: #10b981 (Green)
- Live color preview squares showing selected colors
- Colors update in real-time on the timer display
- Hex color input for precise color selection
- Automatically persists to localStorage and syncs via Firebase

### 2. Background Image Customization
**Location**: ⚙ 各種設定 → ポモドーロ設定 → 背景画像

Features:
- File upload input accepting JPG and PNG formats
- File size limit: 5MB with user-friendly validation
- Automatic base64 encoding for persistent storage
- Background image displays on timer with overlay
- Remove/Clear button to delete background image
- Opacity slider (0-100%) to control background visibility
- Real-time preview of opacity effect
- Settings persist across browser sessions and devices

### 3. Additional Settings
**Location**: ⚙ 各種設定 → ポモドーロ設定 → その他の設定

Features:
- **Pulse Animation Toggle**: Enable/disable subtle pulsing animation on timer
  - When enabled: Timer gently scales 1 → 1.02 → 1 (2-second cycle)
  - When disabled: Static timer display
- **Sound Volume Control**: Slider from 0-100%
  - Affects all alarm sounds (Bell, Beep, Chime, Notification, Alarm)
  - Volume factor applied to Web Audio API oscillator gains
  - Default: 100%

## Technical Implementation

### Type Definitions (types.ts)
```typescript
interface PomodoroCustomization {
  learningColor: string           // Hex color for learning state
  breakColor: string              // Hex color for break state
  backgroundImage: string | null  // Base64 data URL
  backgroundOpacity: number       // 0-100
  enablePulseAnimation: boolean    // Toggle animation
  soundVolume: number            // 0-100
}
```

### State Management
- **Storage**: Persists in localStorage with key `study-task-app:v3`
- **Cloud Sync**: Automatically syncs via Firebase using timestamp-based reconciliation
- **Fallback**: Default values apply if customization not found in loaded state

### Store Methods (useStore.ts)
```typescript
updatePomodoroCustomization(customization: Partial<PomodoroCustomization>)
```

### UI Components
1. **PomodoroSettings** (new component in SubjectSettings.tsx)
   - Collapsible section matching existing settings panels
   - Organized into three subsections:
     - 色設定 (Color Settings)
     - 背景画像 (Background Image)
     - その他の設定 (Additional Settings)

2. **Enhanced PomodoroTimer** (components/PomodoroTimer.tsx)
   - Accepts `store` prop for accessing customization settings
   - Dynamic border colors based on state (learning/break)
   - Background image with overlay for opacity control
   - Conditional pulse animation based on setting
   - Volume-adjusted alarm sounds

### Styling Updates (index.css)
- `.pomodoro-container`: Fixed scrolling with `overflow-y: auto`
- `.pomodoro-timer-modern`: Added flexbox, positioned overlay support
- Proper z-index management for background image overlays
- Maintained glassmorphism design while supporting background images

## Persistence & Sync

### localStorage
- Settings stored in `study-task-app:v3` JSON key
- Automatic save on state changes

### Firebase
- Settings included in cloud sync payload
- Timestamp-based conflict resolution (`lastUpdatedAt`)
- Ensures data consistency across devices

## Browser Compatibility
- Hex to RGB color conversion for rgba() values
- File input with accept="image/jpeg,image/png" for browser file filtering
- Web Audio API with vendor prefixes for alarm sounds
- CSS features supported by modern browsers (flexbox, backdrop-filter, background-blend-mode)

## User Experience Enhancements
- Inline validation (5MB file size limit, JPG/PNG format)
- Real-time color preview
- Intuitive range sliders with percentage display
- Checkbox for boolean settings
- Clear "削除" (Delete) button for background image
- Organized settings matching existing design language
- Japanese localization for all labels and messages
