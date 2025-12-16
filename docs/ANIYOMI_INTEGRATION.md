# AniYomi Integration Documentation

## Overview

This document explains the "Open in AniYomi" feature implementation, which allows users to open MangaDex manga pages directly in the AniYomi Android app from the web browser.

## Implementation Details

### Architecture

The feature consists of three main components:

1. **Utility Function** (`lib/utils.ts`): `generateAniyomiIntent()`
   - Generates Android intent URLs
   - Handles URL encoding and fallback URLs

2. **React Component** (`components/manga/open-in-aniyomi-button.tsx`): `OpenInAniyomiButton`
   - Reusable button component
   - Only renders on Android devices
   - Handles click events and intent URL navigation

3. **Integration** (`app/manga/[id]/page.tsx`)
   - Uses the component on manga detail pages

### Intent URL Format

The implementation uses Android intent URLs with the following format:

```
intent://mangadex.org/title/{mangaId}#Intent;scheme=https;package=xyz.jmir.tachiyomi.mi;S.browser_fallback_url={encodedMangaDexUrl};end
```

**Components:**
- **Scheme**: `https` - Tachiyomi/AniYomi forks typically register for HTTPS URLs from MangaDex
- **Package**: `xyz.jmir.tachiyomi.mi` - AniYomi's package name
- **Fallback URL**: Encoded MangaDex URL that opens if the app isn't installed

### How It Works

1. User clicks the "Open in AniYomi" button (only visible on Android)
2. JavaScript generates an intent URL using `generateAniyomiIntent()`
3. Browser attempts to resolve the intent:
   - If AniYomi is installed: Opens the manga in AniYomi
   - If not installed: Opens the MangaDex website URL instead
4. The fallback is automatic and handled by the browser

## Platform Limitations

### Why Websites Cannot Force-Open Apps

**Security Restrictions:**
- Browsers prevent automatic app launches to protect users from malicious websites
- Intent URLs **must** be triggered by user interaction (button clicks, link clicks)
- Programmatic navigation to intent URLs without user interaction will be blocked

**User Interaction Required:**
- The button click is a required user gesture
- This is a browser security feature, not a limitation of our implementation
- Prevents websites from automatically opening apps without user consent

### Browser Compatibility

#### Chrome (Android)
- ✅ **Full Support**: Intent URLs work as expected
- ✅ Opens app if installed, falls back to URL if not
- ✅ Works in both regular Chrome and Chrome-based PWAs

#### Firefox (Android)
- ⚠️ **Limited Support**: May not handle intent URLs properly
- ⚠️ May always open the fallback URL instead of attempting to open the app
- ⚠️ Behavior may vary by Firefox version

#### Other Browsers
- ⚠️ **Variable Support**: Behavior depends on browser implementation
- ⚠️ Samsung Internet, Edge, etc. may have different behaviors
- ✅ Generally fall back to opening the MangaDex URL

#### Progressive Web Apps (PWAs)
- ✅ **Works**: PWAs behave like their host browser
- ✅ Chrome-based PWAs: Full intent URL support
- ⚠️ Firefox-based PWAs: May have limitations similar to Firefox

## App Compatibility

### Supported Apps

**Primary Target:**
- **AniYomi** (package: `xyz.jmir.tachiyomi.mi`)
  - Fork of Tachiyomi that supports both anime and manga
  - Must have MangaDex extension installed

**Also Compatible:**
- **Tachiyomi** and other forks that:
  - Register intent filters for `https://mangadex.org/title/*` URLs
  - Have the MangaDex extension installed
  - Support HTTPS deep linking

### Requirements

For the feature to work, users need:
1. ✅ AniYomi (or compatible Tachiyomi fork) installed
2. ✅ MangaDex extension installed in the app
3. ✅ Android device
4. ✅ User interaction (button click)

## Usage

### Basic Usage

```tsx
import { OpenInAniyomiButton } from "@/components/manga/open-in-aniyomi-button";

<OpenInAniyomiButton mangaId="abc123-def456" />
```

### With Custom Styling

```tsx
<OpenInAniyomiButton
  mangaId="abc123-def456"
  variant="default"
  size="lg"
  className="custom-class"
  showHelperText={true}
/>
```

### Programmatic Usage (Utility Function)

```tsx
import { generateAniyomiIntent } from "@/lib/utils";

const intentUrl = generateAniyomiIntent("abc123-def456");
window.location.href = intentUrl; // Requires user interaction
```

## Expected Behavior

### When AniYomi is Installed

1. User clicks button
2. Browser shows app chooser (if multiple apps can handle the intent)
3. User selects AniYomi (or it opens directly if it's the default)
4. AniYomi opens and navigates to the manga
5. If MangaDex extension is installed: Manga loads in AniYomi
6. If MangaDex extension is not installed: User may see an error in AniYomi

### When AniYomi is NOT Installed

1. User clicks button
2. Browser cannot resolve the intent
3. Browser automatically opens the fallback URL (`https://mangadex.org/title/{mangaId}`)
4. MangaDex website opens in the browser

### On Non-Android Devices

1. Button does not render (component returns `null`)
2. No functionality is exposed
3. Desktop users see no button

## Testing

### Testing Checklist

- [ ] Button only appears on Android devices
- [ ] Button does not appear on desktop/iOS
- [ ] Clicking button with AniYomi installed opens the app
- [ ] Clicking button without AniYomi opens MangaDex website
- [ ] Works in Chrome browser
- [ ] Works in Chrome-based PWA
- [ ] Tested with MangaDex extension installed
- [ ] Tested with MangaDex extension not installed
- [ ] Fallback URL is correctly encoded
- [ ] Intent URL format is correct

### Testing on Real Device

1. Install AniYomi on Android device
2. Install MangaDex extension in AniYomi
3. Open the PWA in Chrome
4. Navigate to a manga detail page
5. Click "Open in AniYomi" button
6. Verify manga opens in AniYomi

### Testing Fallback

1. Uninstall AniYomi (or use device without it)
2. Open the PWA in Chrome
3. Navigate to a manga detail page
4. Click "Open in AniYomi" button
5. Verify MangaDex website opens instead

## Troubleshooting

### Button Not Appearing

**Possible Causes:**
- Not on Android device (button only renders on Android)
- JavaScript error preventing component from rendering
- `isAndroid()` function returning false

**Solutions:**
- Verify device is Android
- Check browser console for errors
- Verify `navigator.userAgent` contains "Android"

### App Not Opening

**Possible Causes:**
- AniYomi not installed
- MangaDex extension not installed in AniYomi
- Browser doesn't support intent URLs (e.g., Firefox)
- Intent URL format incorrect

**Solutions:**
- Verify AniYomi is installed
- Verify MangaDex extension is installed
- Try in Chrome browser
- Check intent URL format in browser console

### Always Opens Website Instead of App

**Possible Causes:**
- AniYomi not installed (expected behavior)
- Browser doesn't support intent URLs
- Intent URL format incorrect

**Solutions:**
- This is expected if AniYomi isn't installed
- Try Chrome browser
- Verify package name is correct (`xyz.jmir.tachiyomi.mi`)

## Technical Notes

### Intent URL Encoding

The fallback URL must be properly encoded:
- Use `encodeURIComponent()` for the full URL
- Ensures special characters are handled correctly
- Example: `https://mangadex.org/title/abc` → `https%3A%2F%2Fmangadex.org%2Ftitle%2Fabc`

### Package Name

The package name `xyz.jmir.tachiyomi.mi` is specific to AniYomi. Other Tachiyomi forks may have different package names:
- Original Tachiyomi: `eu.kanade.tachiyomi`
- TachiyomiSY: `eu.kanade.tachiyomi.sy`
- AniYomi: `xyz.jmir.tachiyomi.mi`

Our implementation targets AniYomi specifically, but may work with other forks if they register for the same HTTPS URLs.

### HTTPS Scheme

We use the `https` scheme because:
- Tachiyomi/AniYomi forks typically register intent filters for MangaDex HTTPS URLs
- More reliable than custom schemes
- Works with standard web URLs

## Future Improvements

Potential enhancements:
1. **Multi-App Support**: Try multiple package names (AniYomi, Tachiyomi, etc.)
2. **App Detection**: Check if AniYomi is installed before showing button
3. **Better Error Handling**: Show user-friendly messages if app fails to open
4. **Analytics**: Track success/failure rates of intent URL launches
5. **Custom Schemes**: Support custom URL schemes if AniYomi adds them

## References

- [Android Intent URLs (Chrome Docs)](https://developer.chrome.com/docs/android/intents)
- [AniYomi Website](https://aniyomi.app)
- [Tachiyomi GitHub](https://github.com/tachiyomiorg/tachiyomi)
- [MangaDex API Documentation](https://api.mangadex.org/docs)

## Support

If you encounter issues:
1. Check this documentation
2. Verify AniYomi and MangaDex extension are installed
3. Test in Chrome browser
4. Check browser console for errors
5. Verify intent URL format matches expected pattern

