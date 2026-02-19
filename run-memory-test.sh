#!/bin/bash
# run-memory-test.sh — Open Chrome with memory profiling enabled
#
# This script opens Chrome with the --enable-precise-memory-info flag
# which is required for accurate memory measurements using performance.memory API

URL="http://localhost:3338/test-memory-optimization.html"

# Determine Chrome path based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CHROME_PATH="google-chrome"
else
    # Windows (Git Bash)
    CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
fi

echo "🚀 Opening Chrome with memory profiling enabled..."
echo ""
echo "URL: $URL"
echo ""
echo "Chrome flags:"
echo "  --enable-precise-memory-info  (accurate heap measurements)"
echo "  --no-sandbox                  (required on some systems)"
echo "  --disable-web-security        (allow local file access)"
echo ""
echo "Instructions:"
echo "1. Click '10K Items' or '100K Items' button"
echo "2. Wait for test to complete"
echo "3. Review results on the page"
echo "4. Record measurements in docs/refactoring/memory-baseline-measurements.md"
echo ""

# Open Chrome with required flags
"$CHROME_PATH" \
  --enable-precise-memory-info \
  --no-sandbox \
  --disable-web-security \
  --user-data-dir=/tmp/chrome-memory-test \
  "$URL" \
  2>/dev/null &

echo "✅ Chrome opened successfully!"
echo ""
echo "If Chrome doesn't open, you can manually run:"
echo "\"$CHROME_PATH\" --enable-precise-memory-info \"$URL\""
