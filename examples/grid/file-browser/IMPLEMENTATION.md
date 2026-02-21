# File Browser Implementation

## Overview

A Finder-like file browser built with **vlist** using the `withGrid` plugin. This example demonstrates virtualized file browsing with switchable grid/list views and an integrated backend API for real filesystem access.

## Architecture

### Frontend (vlist/builder + withGrid)

**Location**: `examples/grid/file-browser/javascript/`

- **Grid View**: Uses `withGrid` plugin for 2D virtualized layout with configurable columns (3-6) and gap (4-16px)
- **List View**: Standard vlist with fixed 40px row height and columnar layout
- **Dynamic Templates**: `gridItemTemplate()` for icon-based cards, `listItemTemplate()` for rows
- **Navigation**: Breadcrumb, back/up buttons, double-click to enter folders
- **Event Handling**: Click to select, double-click to navigate

**Files**:
- `content.html` - HTML structure with breadcrumb, toolbar, browser container, side panel
- `script.js` - Main logic with view switching, navigation, API calls (497 lines)
- `styles.css` - Styling for both view modes with responsive design (376 lines)

### Backend API (Integrated)

**Location**: `src/api/files.ts` + `src/api/router.ts`

- **Endpoint**: `/api/files?path=<path>` - List directory contents
- **Info Endpoint**: `/api/files/info` - Configuration and allowed roots
- **Security**: Path validation prevents directory traversal, restricts to `vlist` and `vlist.dev` only
- **Filtering**: Auto-filters `.git`, `node_modules`, `dist`, hidden files, etc.
- **Sorting**: Directories first, then alphabetically by name

**Type Definitions**:
```typescript
interface FileItem {
  name: string;
  type: "directory" | "file";
  size: number;
  modified: string; // ISO date
  extension: string | null;
}

interface DirectoryListing {
  path: string;
  items: FileItem[];
}
```

## Features

### Visual Design

**Grid View**:
- Large emoji icons (48px) centered above filename
- Card-based layout with hover effects (translateY, shadow)
- File size displayed below name
- Icon colors based on file type (folders blue, JS yellow, TS blue, etc.)
- 4:3 aspect ratio (colWidth * 0.8 height)

**List View**:
- Compact rows with 4 columns: Icon (40px) | Name (flex) | Size (100px) | Date (120px)
- 24px icons, 40px row height
- Grid layout for consistent alignment
- Responsive: hides date column on mobile

### File Type Recognition

**Icons & Colors**:
- 📁 Folders (blue `#64b5f6`)
- 📄 JavaScript (yellow `#f7df1e`)
- 📘 TypeScript (blue `#3178c6`)
- 🌐 HTML (orange `#e34c26`)
- 🎨 CSS/SCSS (blue/pink)
- 🖼️ Images (green `#4caf50`)
- 📦 Archives (orange `#ff9800`)
- And more...

### Navigation

**Breadcrumb**:
- Clickable path segments (Home / folder / subfolder)
- Automatically generated from current path
- Horizontal scroll for long paths

**History**:
- Browser-like back/forward functionality
- `navigationHistory[]` array tracks visited paths
- `historyIndex` for current position
- Back button disabled at start of history

**Keyboard/Mouse**:
- Single click: Select and show details
- Double click: Navigate into folder
- Back button: Previous location
- Up button: Parent directory

### Details Panel

Shows for selected item:
- Large icon (48px)
- Full name
- Type (directory or `.extension`)
- File size (formatted: B, KB, MB, GB)
- Last modified date/time (localized)

### Statistics

Real-time display:
- Total items count
- Folder count
- File count  
- DOM nodes currently rendered
- Virtualization percentage (typically 95-98%)

## Implementation Details

### View Switching

```javascript
// Grid view
currentView = "grid"
→ withGrid({ columns, gap })
→ Dynamic height: colWidth * 0.8
→ gridItemTemplate()

// List view
currentView = "list"
→ Standard vlist (no grid plugin)
→ Fixed height: 40px
→ listItemTemplate()
```

**Rebuild Logic**:
- Destroys previous list instance
- Clears container
- Creates new vlist with appropriate plugins
- Rebinds event handlers
- Updates controls visibility

### API Integration

```javascript
async function fetchDirectory(path) {
  const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
  const data = await response.json();
  return data; // { path, items }
}
```

**Error Handling**:
- Try-catch wraps API calls
- Console logs errors
- Alert shows user-friendly message
- Returns empty listing on failure

### Security

**Path Validation** (`src/api/files.ts`):
```typescript
function isPathAllowed(requestedPath: string): boolean {
  const resolvedPath = resolve(BASE_DIR, requestedPath || "");
  const relativePath = relative(BASE_DIR, resolvedPath);
  
  // Prevent directory traversal
  if (relativePath.startsWith("..") || ...) return false;
  
  // Must start with allowed root
  const firstSegment = relativePath.split("/")[0];
  return ALLOWED_ROOTS.includes(firstSegment);
}
```

**Ignore Patterns**:
```typescript
const IGNORE_PATTERNS = [
  "node_modules", "dist", "build", ".git",
  ".turbo", ".next", "coverage", ".cache"
];
```

### Performance

**Virtualization**:
- Grid view with 1000 files, 4 columns = 250 rows
  - Only ~20-30 rows rendered (~80-120 DOM nodes)
  - Savings: ~92% fewer DOM nodes
  
- List view with 1000 files, 40px rows
  - Only ~15-20 rows rendered (~15-20 DOM nodes)
  - Savings: ~98% fewer DOM nodes

**Optimization Techniques**:
- `requestAnimationFrame` for stats updates
- Efficient sorting: directories first (single pass)
- Cached container dimensions
- CSS transforms for hover effects

### Responsive Design

**Breakpoint: 820px**:
- Container height: 600px → 400px
- Breadcrumb font size: 13px → 12px
- Toolbar: column layout (stacked)
- List view: 3 columns (hide date)
- Grid icons: 48px → 40px
- Grid names: 12px → 11px

## Usage

### Start vlist.dev Server

The API is integrated, no separate backend needed:

```bash
cd vlist.dev
bun run dev
```

Navigate to the file-browser example in the examples.

### Configure Allowed Directories

Edit `src/api/files.ts`:

```typescript
const ALLOWED_ROOTS = ["vlist", "vlist.dev"];
```

Add/remove directories as needed.

### Customize File Icons

Edit `FILE_ICONS` and `FILE_COLORS` in `script.js`:

```javascript
const FILE_ICONS = {
  folder: "📁",
  py: "🐍",  // Add Python
  // ...
};

const FILE_COLORS = {
  folder: "#64b5f6",
  py: "#3776ab",  // Add Python color
  // ...
};
```

## API Endpoints

### `GET /api/files?path=<path>`

List directory contents.

**Request**:
```
GET /api/files?path=vlist/src/core
```

**Response**:
```json
{
  "path": "vlist/src/core",
  "items": [
    {
      "name": "compose.ts",
      "type": "file",
      "size": 3421,
      "modified": "2024-01-15T10:30:00.000Z",
      "extension": "ts"
    },
    {
      "name": "utils",
      "type": "directory",
      "size": 4096,
      "modified": "2024-01-14T15:20:00.000Z",
      "extension": null
    }
  ]
}
```

### `GET /api/files/info`

Get configuration.

**Response**:
```json
{
  "baseDir": "/Users/yourname/Code/floor",
  "allowedRoots": ["vlist", "vlist.dev"],
  "ignorePatterns": ["node_modules", "dist", ".git", "..."],
  "description": "Browse vlist and vlist.dev project files"
}
```

## Code Structure

### Key Functions

**Navigation**:
- `navigateTo(path, addToHistory)` - Fetch and display directory
- `navigateBack()` - Go to previous directory in history
- `navigateUp()` - Go to parent directory
- `handleItemDoubleClick(item)` - Navigate into folders

**View Management**:
- `createBrowser(view)` - Main factory function
- `createGridView()` - Build grid with dynamic row height
- `createListView()` - Build list with fixed row height

**UI Updates**:
- `updateBreadcrumb()` - Generate clickable path
- `updateStats()` - Update virtualization stats
- `showDetail(item)` - Display item details in panel
- `updateNavigationState()` - Enable/disable back/up buttons

**Utilities**:
- `formatFileSize(bytes)` - Human-readable sizes (B, KB, MB, GB)
- `formatPath(path)` - Display "/" for root
- `getFileIcon(item)` - Get emoji icon for file type
- `getFileColor(item)` - Get color for file type

### State Management

```javascript
let currentPath = "";           // Current directory path
let items = [];                 // Files/folders in current directory
let currentView = "grid";       // "grid" or "list"
let currentColumns = 4;         // Grid columns
let currentGap = 8;             // Grid gap in pixels
let list = null;                // vlist instance
let navigationHistory = [];     // Visited paths
let historyIndex = -1;          // Current position in history
```

### Event Handlers

**View Switcher**:
```javascript
btn-view-grid.click → createBrowser("grid")
btn-view-list.click → createBrowser("list")
```

**Navigation**:
```javascript
btn-back.click → navigateBack()
btn-up.click → navigateUp()
breadcrumb.click → navigateTo(clickedPath)
```

**Grid Controls**:
```javascript
columns-buttons.click → update currentColumns → createBrowser("grid")
gap-buttons.click → update currentGap → createBrowser("grid")
```

**Item Events**:
```javascript
item:click → showDetail(item)
item:dblclick → handleItemDoubleClick(item)
```

## Testing

### Manual Tests

1. **Start server**: `bun run dev`
2. **Open file browser** in examples
3. **Test grid view**:
   - [ ] Files display with icons
   - [ ] Folders have blue tint on hover
   - [ ] Click shows details
   - [ ] Double-click folders navigates
4. **Test list view**:
   - [ ] Rows display with columns
   - [ ] Sizes formatted correctly
   - [ ] Dates display
5. **Test navigation**:
   - [ ] Breadcrumb updates
   - [ ] Back button works
   - [ ] Up button works
   - [ ] History preserved
6. **Test controls**:
   - [ ] Change columns (3-6)
   - [ ] Change gap (4-16px)
   - [ ] View switcher toggles
7. **Test security**:
   - [ ] Can't browse outside allowed roots
   - [ ] Hidden files filtered
   - [ ] `node_modules` hidden

### API Tests

```bash
# List root
curl http://localhost:3000/api/files

# List vlist/src
curl http://localhost:3000/api/files?path=vlist/src

# Get info
curl http://localhost:3000/api/files/info

# Try invalid path (should return 403)
curl http://localhost:3000/api/files?path=../../etc
```

## Security Notes

⚠️ **Development Tool Only**

This is intended for local development. **Do NOT use in production** without:

1. ✅ Authentication/authorization
2. ✅ Token-based access control
3. ✅ Rate limiting
4. ✅ Audit logging
5. ✅ Sandboxed file access

**Current Security**:
- ✅ Path validation (prevents traversal)
- ✅ Restricted to allowed roots
- ✅ Filters sensitive files
- ❌ No authentication
- ❌ No rate limiting
- ❌ Exposes file structure

## Future Enhancements

**Possible additions**:
- Search/filter functionality
- File upload capability
- Folder creation
- File deletion (with confirmation)
- Drag-and-drop support
- Keyboard navigation (arrow keys)
- Multi-select with Ctrl/Cmd
- Context menu (right-click)
- File preview (images, text)
- Sorting options (name, size, date)
- View preferences persistence (localStorage)
- Dark mode support

## Related Examples

- **photo-album** - Grid view with images (inspiration for this example)
- **variable-heights** - Dynamic row heights
- **builder examples** - Composable vlist APIs

## License

Same as vlist project.