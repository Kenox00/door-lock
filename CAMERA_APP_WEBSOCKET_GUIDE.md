# Camera App WebSocket Integration Guide

## Overview
The camera app needs to listen for access approval/denial responses from the admin dashboard via WebSocket.

## Socket Events to Listen For

### 1. `access_granted` Event
Emitted when an admin approves visitor access.

**Event Data:**
```javascript
{
  visitorId: "673abc123def456789",  // MongoDB _id of the visitor log
  approved: true,
  note: "Expected visitor",          // Optional admin note
  timestamp: "2025-11-14T10:30:00Z"
}
```

**Camera App Action:**
- Show success message: "Access Granted!"
- Trigger door unlock (if camera controls door)
- Display green indicator
- Play success sound
- Log the approval

---

### 2. `access_denied` Event
Emitted when an admin denies visitor access.

**Event Data:**
```javascript
{
  visitorId: "673abc123def456789",  // MongoDB _id of the visitor log
  approved: false,
  reason: "Access denied",           // Reason for denial
  timestamp: "2025-11-14T10:30:00Z"
}
```

**Camera App Action:**
- Show warning message: "Access Denied"
- Display red indicator
- Play denial sound
- Keep door locked
- Log the denial

---

## Implementation Example

### Step 1: Add Event Listeners in Camera App

```javascript
// In your camera app WebSocket setup (e.g., CameraContext or useSocket hook)

// Listen for access granted
socket.on('access_granted', (data) => {
  console.log('✅ Access Granted:', data);
  
  const { visitorId, note, timestamp } = data;
  
  // Update UI
  showSuccessMessage('Access Granted!');
  setAccessStatus('granted');
  
  // Trigger door unlock if camera controls door
  if (canControlDoor) {
    unlockDoor();
  }
  
  // Play success sound
  playSound('success');
  
  // Update local state
  updateVisitorStatus(visitorId, 'approved');
});

// Listen for access denied
socket.on('access_denied', (data) => {
  console.log('❌ Access Denied:', data);
  
  const { visitorId, reason, timestamp } = data;
  
  // Update UI
  showWarningMessage(`Access Denied: ${reason}`);
  setAccessStatus('denied');
  
  // Play denial sound
  playSound('denied');
  
  // Update local state
  updateVisitorStatus(visitorId, 'rejected');
});
```

### Step 2: Update Camera Upload Function

When uploading a visitor photo, store the `visitorId` returned by the backend:

```javascript
const uploadVisitorPhoto = async (photoBlob) => {
  try {
    const formData = new FormData();
    formData.append('image', photoBlob);
    formData.append('deviceId', CAMERA_DEVICE_ID);
    
    const response = await axios.post('/api/door/upload', formData);
    
    // Store the visitor ID for tracking
    const visitorId = response.data.data.visitorLog._id;
    setCurrentVisitorId(visitorId);
    
    // Show "Waiting for approval..." message
    showMessage('Photo sent. Waiting for admin approval...');
    
    return visitorId;
  } catch (error) {
    console.error('Upload failed:', error);
    showError('Failed to upload photo');
  }
};
```

### Step 3: Create UI Feedback Components

```jsx
// VisitorStatusIndicator.jsx
export const VisitorStatusIndicator = ({ status }) => {
  if (status === 'waiting') {
    return (
      <div className="bg-yellow-500 text-white p-4 rounded-lg flex items-center gap-3">
        <div className="animate-spin">⏳</div>
        <div>
          <p className="font-bold">Waiting for Approval</p>
          <p className="text-sm">Admin is reviewing your request...</p>
        </div>
      </div>
    );
  }
  
  if (status === 'granted') {
    return (
      <div className="bg-green-500 text-white p-4 rounded-lg flex items-center gap-3">
        <div className="text-2xl">✅</div>
        <div>
          <p className="font-bold">Access Granted!</p>
          <p className="text-sm">You may enter</p>
        </div>
      </div>
    );
  }
  
  if (status === 'denied') {
    return (
      <div className="bg-red-500 text-white p-4 rounded-lg flex items-center gap-3">
        <div className="text-2xl">❌</div>
        <div>
          <p className="font-bold">Access Denied</p>
          <p className="text-sm">Please contact the administrator</p>
        </div>
      </div>
    );
  }
  
  return null;
};
```

---

## Important Notes

### 1. **WebSocket Connection**
The camera app should maintain a persistent WebSocket connection to receive real-time responses. If using device token authentication:

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: DEVICE_TOKEN,  // Use device token, not JWT
    clientType: 'device'
  }
});
```

### 2. **Timeout Handling**
Add a timeout for admin responses:

```javascript
const APPROVAL_TIMEOUT = 60000; // 60 seconds

const waitForApproval = (visitorId) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Approval timeout - no response from admin'));
      showWarningMessage('No response from admin. Please try again.');
    }, APPROVAL_TIMEOUT);
    
    // Store timeout ID to clear it when response arrives
    setApprovalTimeout(visitorId, timeout);
  });
};

// Clear timeout when response arrives
socket.on('access_granted', (data) => {
  clearTimeout(approvalTimeouts[data.visitorId]);
  // ... handle approval
});

socket.on('access_denied', (data) => {
  clearTimeout(approvalTimeouts[data.visitorId]);
  // ... handle denial
});
```

### 3. **Error Handling**
Handle connection errors gracefully:

```javascript
socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
  showError('Connection lost. Photo uploaded but real-time notifications unavailable.');
});

socket.on('disconnect', (reason) => {
  console.log('WebSocket disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server kicked us out - try reconnecting
    socket.connect();
  }
});
```

---

## Testing the Integration

### Test 1: Successful Approval
1. Camera app uploads visitor photo
2. Admin dashboard receives notification
3. Admin clicks notification and approves
4. Camera app receives `access_granted` event
5. Camera shows "Access Granted!" message

### Test 2: Denial
1. Camera app uploads visitor photo
2. Admin dashboard receives notification
3. Admin clicks notification and denies
4. Camera app receives `access_denied` event
5. Camera shows "Access Denied" message

### Test 3: Timeout
1. Camera app uploads visitor photo
2. Admin doesn't respond within 60 seconds
3. Camera app shows timeout message
4. User can retry

---

## Backend Events Summary

**Backend emits these events to camera device room:**
- `access_granted` - When admin approves (to device room: `device:${deviceId}`)
- `access_denied` - When admin denies (to device room: `device:${deviceId}`)

**Backend expects these from camera:**
- None required for approval flow (camera just listens)

**Camera should emit these (if not already):**
- `device_register` - On connection to register device
- `device_heartbeat` - Periodic status updates

---

## Quick Start Checklist

- [ ] Add `access_granted` event listener to camera WebSocket
- [ ] Add `access_denied` event listener to camera WebSocket
- [ ] Store `visitorId` when uploading photo
- [ ] Show "Waiting for approval..." UI after upload
- [ ] Handle approval with success message + unlock door
- [ ] Handle denial with warning message
- [ ] Add 60-second timeout for admin response
- [ ] Test full flow: upload → admin approval → camera receives event
- [ ] Test denial flow: upload → admin denial → camera receives event
- [ ] Handle WebSocket disconnection gracefully

---

## Example Camera App Flow

```
User arrives at door
     ↓
Camera detects motion
     ↓
Camera captures photo
     ↓
Photo uploaded to /api/door/upload
     ↓
Backend returns visitorId
     ↓
Camera shows "Waiting for approval..." (yellow)
     ↓
WebSocket stays connected listening for response
     ↓
[Admin reviews and approves/denies]
     ↓
Camera receives 'access_granted' OR 'access_denied'
     ↓
Camera shows green "Access Granted!" OR red "Access Denied"
     ↓
If approved: Door unlocks for 5 seconds
If denied: Door stays locked
```

---

That's it! Once you implement these event listeners in your camera app, the full approval flow will work end-to-end.
