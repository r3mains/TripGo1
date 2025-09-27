# Mobile Testing Setup Instructions

## Quick Mobile Test (HTTP)

1. Ensure your mobile is on the same Wi-Fi network as your computer
2. Access: http://192.168.1.4:3000
3. Note: Some PWA features may be limited on HTTP

## Full PWA Testing with HTTPS (Recommended)

### Option 1: Using ngrok (Free)

1. Install ngrok: https://ngrok.com/download
2. Run: `ngrok http 3000`
3. Use the HTTPS URL provided (e.g., https://abc123.ngrok.io)
4. This gives you full PWA functionality including background sync

### Option 2: Using localtunnel (Free alternative)

1. Install: `npm install -g localtunnel`
2. Run: `lt --port 3000 --subdomain tripgo-test`
3. Access: https://tripgo-test.loca.lt

### Option 3: Using Cloudflare Tunnel (Free)

1. Install: `npm install -g cloudflared`
2. Run: `cloudflared tunnel --url localhost:3000`
3. Use the provided HTTPS URL

## Testing Checklist

### Basic Functionality ✓

- [ ] App loads on mobile browser
- [ ] Can register/login
- [ ] Location permission granted
- [ ] Can start/end trips
- [ ] GPS tracking works

### PWA Features ✓

- [ ] Install prompt appears
- [ ] App installs to home screen
- [ ] Offline mode works
- [ ] Background notifications work

### Background Tracking ✓

- [ ] Distance accumulates when app is backgrounded
- [ ] Location tracking continues in background
- [ ] Data syncs when returning to app
- [ ] Wake lock prevents screen from turning off during trips

## Troubleshooting

### Location Issues:

- Ensure location services are enabled in device settings
- Grant "Always" location permission (not just "While Using App")
- Test outdoors for better GPS signal

### Background Issues:

- Install as PWA for better background support
- Don't force-close the app
- Check battery optimization settings
- Ensure notifications are enabled

### Connection Issues:

- Verify both devices are on same Wi-Fi
- Check firewall settings on computer
- Try different browsers (Chrome recommended for Android)
