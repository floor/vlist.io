# File Browser Example

A Finder-like file browser built with **vlist** using the `withGrid` plugin. This example demonstrates virtualized file browsing with switchable grid/list views and a backend API for real filesystem access.

## Features

- 🗂️ **Dual View Modes**: Switch between grid and list views
- 📁 **Real File System**: Browse vlist and vlist.io projects via backend API
- 🎨 **File Type Icons**: Visual differentiation with emoji icons and colors
- 🧭 **Breadcrumb Navigation**: Easy path navigation with clickable breadcrumbs
- ⚡ **Virtualized Rendering**: Only visible items are rendered (DOM efficiency)
- 🎛️ **Configurable Grid**: Adjust columns and gap in grid view
- 📊 **Statistics Display**: Real-time DOM node count and virtualization metrics
- 🔒 **Security**: Path validation to restrict browsing to allowed directories

## Architecture

### Frontend (vlist/builder + withGrid)

- **Grid View**: Uses `withGrid` plugin for 2D virtualized layout
- **List View**: Standard vlist with fixed row height
- **Dynamic Templates**: Different item templates for grid vs list
- **Event Handling**: Click to select, double-click to navigate folders

### Backend (Integrated in vlist.io)

- **RESTful API**: `/api/files?path=<path>` endpoint integrated in vlist.io server
- **Security**: Restricts browsing to `vlist` and `vlist.io` directories only
- **File Metadata**: Returns name, type, size, modified date, extension
- **Auto-sorting**: Directories first, then alphabetically
- **Location**: `src/api/files.ts` and integrated in `src/api/router.ts`

## Setup

### 1. Start the vlist.io Development Server

The file browser API is integrated into the main vlist.io server. No separate backend needed!

```bash
# From vlist.io root
npm run dev
```

Then navigate to the file browser example in your browser.

### 2. Configure Allowed Directories (Optional)

Edit `src/api/files.ts` to change which directories can be browsed:

```javascript
const ALLOWED_ROOTS = ["vlist", "vlist.io"];
```

## API Endpoints

### `GET /api/files?path=<path>`

List directory contents.

**Query Parameters:**
- `path` (optional): Relative path from base directory (default: "")

**Response:**
```json
{
  "path": "vlist/src",
  "items": [
    {
      "name": "core",
      "type": "directory",
      "size": 4096,
      "modified": "2024-01-15T10:30:00.000Z",
      "extension": null
    },
    {
      "name": "index.ts",
      "type": "file",
      "size": 2048,
      "modified": "2024-01-15T10:30:00.000Z",
      "extension": "ts"
    }
  ]
}
```

### `GET /api/files/info`

File browser configuration and metadata.

**Response:**
```json
{
  "baseDir": "/Users/yourname/Code/floor",
  "allowedRoots": ["vlist", "vlist.io"],
  "ignorePatterns": ["node_modules", "dist", "build", ".git", "..."],
  "description": "Browse vlist and vlist.io project files"
}
```

## Code Structure

### JavaScript (`javascript/script.js`)

**Key Functions:**
- `createGridView()` - Creates virtualized grid with dynamic row height
- `createListView()` - Creates standard list with fixed row height
- `navigateTo(path)` - Fetches and displays directory contents
- `handleItemDoubleClick()` - Navigates into folders
- `fetchDirectory()` - Calls backend API

**State Management:**
- `currentPath` - Current directory path
- `items` - Array of files/folders in current directory
- `currentView` - 'grid' or 'list'
- `navigationHistory` - Browser-like back/forward history

### CSS (`javascript/styles.css`)

**Component Styles:**
- `.file-card` - Grid view item with icon, name, metadata
- `.file-row` - List view item with columns
- `.breadcrumb` - Clickable path navigation
- `.toolbar` - View controls and navigation buttons
- `.view-switcher` - Grid/list toggle buttons

### API (`src/api/files.ts`)

**Security Features:**
- Path validation with `isPathAllowed()`
- Restricts browsing to `ALLOWED_ROOTS` only
- Prevents directory traversal attacks
- Filters hidden files and common ignore patterns

**File Metadata:**
- Uses Node.js `fs/promises` API (Bun-compatible)
- Returns file type, size, modified date, extension
- Auto-filters `.git`, `node_modules`, `dist`, etc.
- Integrated with vlist.io router (`src/api/router.ts`)

## Customization

### Change Grid Layout

Adjust columns and gap via panel controls, or modify defaults:

```javascript
let currentColumns = 4;  // Default: 4 columns
let currentGap = 8;      // Default: 8px gap
```

### Change Item Height

**Grid view** - calculated from column width:
```javascript
const height = colWidth * 0.8; // Icon + text height
```

**List view** - fixed height:
```javascript
const height = 40; // Fixed 40px row height
```

### Add More File Types

Edit the `FILE_ICONS` and `FILE_COLORS` objects:

```javascript
const FILE_ICONS = {
  folder: "📁",
  js: "📄",
  py: "🐍",  // Add Python
  // ... more types
};

const FILE_COLORS = {
  folder: "#64b5f6",
  js: "#f7df1e",
  py: "#3776ab",  // Add Python
  // ... more colors
};
```

### Filter Different Patterns

Edit the ignore patterns in `src/api/files.ts`:

```javascript
const IGNORE_PATTERNS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "your-pattern",  // Add custom pattern
];
```

## Browser Features

### Navigation

- **Breadcrumb**: Click any segment to jump to that path
- **Back Button**: Navigate to previous directory (browser-like history)
- **Up Button**: Go to parent directory
- **Double-click folder**: Navigate into folder

### View Modes

- **Grid View**: Icons with name and size, adjustable columns/gap
- **List View**: Compact rows with icon, name, size, and date

### Details Panel

Click any item to see:
- Large icon
- Full name
- Type (directory or file extension)
- File size (formatted)
- Last modified date/time

## Performance

### Virtualization Benefits

With ~1000 files in a directory:

- **Grid View (4 columns)**: ~250 rows, but only ~20-30 rendered in DOM
- **List View**: 1000 items, but only ~15-20 rendered in DOM
- **Savings**: ~95-98% fewer DOM nodes compared to full rendering

### Statistics Display

The stats bar shows:
- Total items (folders + files)
- Folder count
- File count
- DOM nodes currently rendered
- Virtualization percentage

## Security Notes

⚠️ **Important**: This is a **development tool** for browsing local project files. 

**Do NOT use in production without:**
1. Proper authentication/authorization
2. Secure token-based access control
3. Rate limiting
4. Audit logging
5. Sandboxed file access

The current implementation:
- ✅ Validates paths to prevent traversal attacks
- ✅ Restricts to specific allowed directories
- ✅ Filters sensitive files (.git, .env, etc.)
- ❌ Has no authentication
- ❌ Has no rate limiting
- ❌ Exposes file system structure

## Troubleshooting

### Files not loading

1. Check the vlist.io server is running (`npm run dev`)
2. Check browser console for CORS or network errors
3. Verify the path exists and is within allowed roots
4. Check terminal for API errors
5. Try visiting `/api/files/info` to see configuration

### View doesn't update

1. Try switching views (grid ↔ list)
2. Check browser console for JavaScript errors
3. Verify vlist is properly imported and built

## Related Examples

- **photo-album** - Grid view with images
- **list examples** - Standard list implementations
- **builder examples** - Composable vlist APIs

## License

Same as vlist project license.