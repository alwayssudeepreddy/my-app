# 📺 Screen Sharing & Contest System

## Project Overview
A comprehensive browser-based system for secure contest monitoring with tamper-resistant mistake tracking.

## 🗂️ File Structure

```
src/
├── app/
│   ├── screen/page.tsx           # Screen sharing verification
│   ├── contest/page.tsx          # Main contest page
│   └── api/contest/route.tsx     # Contest API endpoints
└── utils/
    ├── secureMistakeTracker.ts   # Secure local storage system
    └── screenShare.tsx           # Screen sharing utilities
```

## 🔧 Core Components

### 1. Screen Sharing Page (`/screen`)
**Purpose**: Verify user has proper screen sharing setup before contest
- **Monitor Detection**: Ensures user shares entire monitor (not just tab/window)
- **Image Capture**: Takes screenshots and compresses them (80% scale, 40% quality)
- **Auto Download**: Saves verification images locally
- **Mistake Tracking**: Records violations to secure local storage

### 2. Contest Page (`/contest`)
**Purpose**: Main contest interface with real-time monitoring
- **Screen Share Monitoring**: Continuous verification of screen sharing status
- **Contest Freeze**: Automatic freeze when violations occur
- **Mistake Counter**: Real-time display of violation count
- **Admin Controls**: Freeze/unfreeze contest management

### 3. Secure Mistake Tracker (`/utils/secureMistakeTracker.ts`)
**Purpose**: Tamper-proof local storage for tracking violations
- **Multi-Layer Encryption**: Triple storage with different encryption keys
- **Browser Fingerprinting**: Device-specific encryption salts
- **Tamper Detection**: Automatic data validation and reset
- **Admin Features**: Daily admin keys for data management

## 🚀 Getting Started

### Prerequisites
- Next.js 13+
- TypeScript
- Modern browser with Screen Capture API support

### Installation
```bash
npm install
npm run dev
```

### Usage Flow
1. **Navigate to `/screen`** - Verify screen sharing setup
2. **Start Screen Share** - Must share entire monitor
3. **Verification Complete** - Auto-redirect to contest page
4. **Begin Contest** - Monitored environment with mistake tracking

## 🛡️ Security Features

### Screen Sharing Security
- **Monitor-Only Enforcement**: Rejects tab/window sharing
- **Real-Time Monitoring**: Continuous verification during contest
- **Automatic Freeze**: Contest freezes when screen sharing stops
- **Image Verification**: Screenshot capture for audit trails

### Mistake Tracking Security
- **Tamper-Resistant Storage**: Multiple encryption layers
- **Data Validation**: Cross-validation between storage locations
- **Automatic Reset**: Any tampering triggers data reset
- **Audit Logging**: Complete violation history

## 📊 Monitored Violations

| Type | Description | Auto Action |
|------|-------------|-------------|
| Screen Share Stopped | User stops screen sharing | Freeze contest |
| Tab Switch | User switches tabs | Record mistake |
| Fullscreen Exit | User exits fullscreen | Record mistake |
| Mouse Leave | Mouse leaves window | Record mistake |
| Blocked Shortcut | Prohibited keyboard shortcut | Record mistake |

## 🎨 UI Components

### Mistake Counter
- **Green** (0-2): Safe zone
- **Orange** (3-5): Warning zone  
- **Red** (6+): Danger zone

### Contest Freeze Overlay
- Full-screen overlay when violations occur
- Admin controls for freeze management
- Automatic submission at mistake threshold

## 🔧 Configuration

### Environment Variables
```env
# Contest settings
NEXT_PUBLIC_MAX_MISTAKES=3
NEXT_PUBLIC_AUTO_SUBMIT_THRESHOLD=5

# Admin settings
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
```

### Mistake Thresholds
- **3 mistakes**: Warning state
- **5 mistakes**: Auto-submit threshold
- **Continuous monitoring**: Real-time updates

## 📝 API Endpoints

### Contest Management
- `POST /api/contest/freeze` - Freeze/unfreeze contest
- `GET /api/contest/status` - Get current contest state
- `POST /api/contest/submit` - Submit contest responses

### Mistake Tracking
- Local storage only (no server storage)
- Secure client-side tracking
- Admin export capabilities

## 🐛 Troubleshooting

### Common Issues

**Screen sharing not working**
- Ensure using HTTPS (required for Screen Capture API)
- Grant camera/screen permissions
- Use supported browser (Chrome, Firefox, Safari)

**Mistake count resets**
- Normal security behavior (tamper detection)
- Indicates possible user manipulation attempt

**Contest freeze not lifting**
- Check admin controls
- Verify screen sharing is active
- Review mistake threshold settings

### Debug Mode
```javascript
// Enable console logging
localStorage.setItem('debug_contest', 'true');
localStorage.setItem('debug_mistakes', 'true');
```

## 📈 Performance Considerations

### Image Processing
- 80% scale reduction for screenshots
- 40% JPEG quality compression
- Automatic file size optimization

### Storage Management
- Local storage only (no server load)
- Automatic cleanup of old data
- Memory-efficient mistake tracking

### Real-Time Monitoring
- Efficient event listeners
- Debounced violation detection
- Minimal performance impact


## 🎯 Summary

This system provides a comprehensive, secure contest monitoring solution with:
- **Tamper-resistant mistake tracking**
- **Real-time screen sharing verification**
- **Automatic violation enforcement**
- **Admin control capabilities**
- **User-friendly interface**

The combination of client-side security and real-time monitoring creates a robust platform for secure online assessments.
