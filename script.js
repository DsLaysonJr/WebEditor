'use strict';

// Cached DOM references
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const fontSizeInput = document.getElementById('fontSizeInput');
const headingSelect = document.getElementById('headingSelect');
const fontFamilySelect = document.getElementById('fontFamilySelect');
const textColorPicker = document.getElementById('textColorPicker');
const highlightColorPicker = document.getElementById('highlightColorPicker');

// Toolbar buttons
const toolbar = document.querySelector('.toolbar');
const clearBtn = document.getElementById('clearBtn');
const clearFormatBtn = document.getElementById('clearFormatBtn');
const printBtn = document.getElementById('printBtn');
const exportBtn = document.getElementById('exportBtn');
const decreaseFontBtn = document.getElementById('decreaseFontBtn');
const increaseFontBtn = document.getElementById('increaseFontBtn');

let isUpdatingFormat = false;

// Initialize editor
editor.focus();
updatePreview();

// Use inline CSS for execCommand styling
if (document.queryCommandSupported('styleWithCSS')) {
    document.execCommand('styleWithCSS', false, true);
}

function execCmd(cmd, value = null) {
    document.execCommand(cmd, false, value);
    editor.focus();
    updatePreview();
    updateToolbarState();
}

// Event delegation for toolbar
toolbar.addEventListener('click', e => {
    const btn = e.target.closest('[data-cmd]');
    if (!btn) return;
    const cmd = btn.dataset.cmd;
    const value = btn.dataset.value || null;
    execCmd(cmd, value);
});

// Simple heading formatting - no complex cursor management
headingSelect.addEventListener('change', () => {
    if (isUpdatingFormat) return;
    
    const selectedFormat = headingSelect.value;
    execCmd('formatBlock', selectedFormat);
});

fontFamilySelect.addEventListener('change', () => {
    execCmd('fontName', fontFamilySelect.value);
});

textColorPicker.addEventListener('input', () => {
    execCmd('foreColor', textColorPicker.value);
});

highlightColorPicker.addEventListener('input', () => {
    execCmd('hiliteColor', highlightColorPicker.value);
});

// Font size handling
fontSizeInput.addEventListener('input', () => {
    const size = parseInt(fontSizeInput.value, 10);
    if (size >= 8 && size <= 72) {
        execCmd('fontSize', getFontSizeLevel(size));
    }
});

fontSizeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const size = parseInt(fontSizeInput.value, 10);
        if (size >= 8 && size <= 72) {
            execCmd('fontSize', getFontSizeLevel(size));
        }
        editor.focus();
    }
});

decreaseFontBtn.addEventListener('click', (e) => {
    e.preventDefault();
    adjustFontSize(-2);
});

increaseFontBtn.addEventListener('click', (e) => {
    e.preventDefault();
    adjustFontSize(2);
});

clearFormatBtn.addEventListener('click', () => {
    execCmd('removeFormat');
    fontSizeInput.value = 16;
    headingSelect.value = 'P';
});

clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all content?')) {
        editor.innerHTML = '<p>Start typing your document here...</p>';
        updatePreview();
        fontSizeInput.value = 16;
        headingSelect.value = 'P';
    }
});

printBtn.addEventListener('click', printContent);
exportBtn.addEventListener('click', exportHTML);

// Convert font size to execCommand level (1-7)
function getFontSizeLevel(size) {
    if (size <= 10) return 1;
    if (size <= 13) return 2;
    if (size <= 16) return 3;
    if (size <= 18) return 4;
    if (size <= 24) return 5;
    if (size <= 32) return 6;
    return 7;
}

// Simple input handler
editor.addEventListener('input', () => {
    updatePreview();
    // Small delay to avoid conflicts
    setTimeout(updateToolbarState, 10);
});

// Update toolbar state when selection changes
['mouseup', 'keyup', 'focus'].forEach(evt =>
    editor.addEventListener(evt, () => {
        setTimeout(updateToolbarState, 10);
    })
);

function updateToolbarState() {
    if (isUpdatingFormat) return;
    
    // Update text formatting buttons
    const commands = ['bold', 'italic', 'underline', 'strikeThrough'];
    commands.forEach(cmd => {
        const btn = document.querySelector(`[data-cmd="${cmd}"]`);
        if (btn) {
            btn.classList.toggle('active', document.queryCommandState(cmd));
        }
    });

    // Update alignment buttons
    const alignCommands = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
    alignCommands.forEach(cmd => {
        const btn = document.querySelector(`[data-cmd="${cmd}"]`);
        if (btn) {
            btn.classList.toggle('active', document.queryCommandState(cmd));
        }
    });

    // Update heading select based on current block
    const sel = window.getSelection();
    if (!sel.rangeCount || !editor.contains(sel.anchorNode)) return;

    let element = sel.anchorNode;
    if (element.nodeType === Node.TEXT_NODE) {
        element = element.parentElement;
    }

    // Find the block element
    while (element && element !== editor) {
        if (['P', 'H1', 'H2', 'H3', 'DIV'].includes(element.tagName)) {
            isUpdatingFormat = true;
            if (element.tagName === 'DIV') {
                headingSelect.value = 'P';
            } else {
                headingSelect.value = element.tagName;
            }
            setTimeout(() => { isUpdatingFormat = false; }, 50);
            break;
        }
        element = element.parentElement;
    }

    // Update font family
    if (element && editor.contains(element)) {
        const computedStyle = window.getComputedStyle(element);
        const fontFamily = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '');
        
        // Check if this font exists in our options
        const fontOptions = [...fontFamilySelect.options].map(o => o.value);
        if (fontOptions.includes(fontFamily)) {
            fontFamilySelect.value = fontFamily;
        }

        // Update font size
        const fontSize = parseInt(computedStyle.fontSize, 10);
        if (fontSize && !isNaN(fontSize) && fontSize !== parseInt(fontSizeInput.value, 10)) {
            fontSizeInput.value = fontSize;
        }
    }
}

// Adjust font size by delta
function adjustFontSize(delta) {
    const currentSize = parseInt(fontSizeInput.value, 10) || 16;
    const newSize = Math.min(72, Math.max(8, currentSize + delta));
    fontSizeInput.value = newSize;
    execCmd('fontSize', getFontSizeLevel(newSize));
}

// Preview update with proper font inheritance
function updatePreview() {
    const title = document.getElementById('docTitle').value.trim() || 'Untitled Document';
    const content = editor.innerHTML;

    const previewHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { 
      font-family: Inter, Arial, sans-serif; 
      line-height: 1.6; 
      margin: 20px;
      font-size: 16px;
    }
    h1 { 
      font-size: 2em; 
      font-weight: bold; 
      margin: 1em 0 0.5em 0; 
    }
    h2 { 
      font-size: 1.5em; 
      font-weight: bold; 
      margin: 1em 0 0.5em 0; 
    }
    h3 { 
      font-size: 1.25em; 
      font-weight: bold; 
      margin: 1em 0 0.5em 0; 
    }
    p { 
      margin: 0.5em 0; 
    }
    /* Preserve font family changes */
    * {
      font-family: inherit;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
    `;

    preview.srcdoc = previewHTML;
}

// Print function
function printContent() {
    const title = document.getElementById('docTitle').value.trim() || 'Untitled Document';
    const win = window.open('', '_blank');
    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { 
      font-family: Inter, Arial, sans-serif; 
      line-height: 1.6; 
      margin: 20px;
      font-size: 16px;
    }
    h1 { font-size: 2em; font-weight: bold; margin: 1em 0 0.5em 0; }
    h2 { font-size: 1.5em; font-weight: bold; margin: 1em 0 0.5em 0; }
    h3 { font-size: 1.25em; font-weight: bold; margin: 1em 0 0.5em 0; }
    p { margin: 0.5em 0; }
    * { font-family: inherit; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${editor.innerHTML}
</body>
</html>
    `);
    win.document.close();
    win.print();
}

// Export HTML
function exportHTML() {
    const title = document.getElementById('docTitle').value.trim() || 'Untitled Document';
    const html = generateExportHTML(title, editor.innerHTML);
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
}

function generateExportHTML(title, contentHTML) {
    const year = new Date().getFullYear();

    const css = `
:root { --brand-green: #f0fdfa; --border: #e2e8f0; --text-dark: #111; --text-light: #555;}
*{box-sizing:border-box;}
body{margin:0;padding:0;font-family:system-ui,sans-serif;color:var(--text-dark);}
header{background:var(--brand-green);padding:2rem 1rem;}
header .inner{max-width:900px;margin:auto;}
header h1{margin:0;text-align:center;font-size:2rem;}
header p{margin:.5rem 0 0;text-align:center;color:var(--text-light);}
.container{display:flex;max-width:900px;margin:2rem 10vw;gap:2rem;}
.sidebar{flex:0 0 200px;position:sticky;top:1rem;align-self:start;border-right:1px solid var(--border);padding-right:1rem;max-height:calc(100vh-4rem);overflow-y:auto;}
.sidebar ul{list-style:none;padding:0;margin:0;}
.sidebar li+li{margin-top:.5rem;}
.sidebar a{text-decoration:none;color:var(--text-dark);}
.sidebar a.active,.sidebar a:hover{font-weight:bold;color:#007a5a;}
.sidebar li.nested a{display:block;padding-left:1rem;font-size:.9em;color:var(--text-light);}
.content{flex:1;line-height:1.6;}
.content h1{position:relative;font-size:1.6rem;text-transform:uppercase;text-align:center;letter-spacing:.05em;margin:3rem 0 1.5rem;padding-bottom:.5rem;color:#007a5a;border-bottom:3px solid var(--border);}
.content h1::before{content:'';position:absolute;left:-1rem;top:0;width:4px;height:100%;background:#007a5a;}
.content h2{font-size:1.2rem;text-transform:uppercase;letter-spacing:.05em;margin:3rem 0 1.5rem;color:#007a5a;}
.content table{width:100%;border-collapse:collapse;margin:1rem 0;}
.content th,.content td{border:1px solid var(--border);padding:.5rem;}
.content code,.content pre{background:#f7fafc;padding:.2rem .4rem;border-radius:4px;}
* { font-family: inherit; }
`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${css}</style>
</head>
<body>
  <header><div class="inner"><h1>${title}</h1><p>Updated: ${year} Edition</p></div></header>
  <div class="container">
    <nav class="sidebar"><ul></ul></nav>
    <main class="content" id="export-content">${editor.innerHTML}</main>
  </div>
  <script>
    const c = document.getElementById('export-content');
    const s = document.querySelector('.sidebar ul');
    c.querySelectorAll('h1,h2').forEach(h => {
      if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/[^\\w]+/g,'-').replace(/(^-+|-+$)/g,'');
    });
    s.innerHTML = '';
    c.querySelectorAll('h1,h2').forEach(h => {
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.href = '#'+h.id;
      a.textContent = h.textContent;
      if (h.tagName === 'H1') li.classList.add('nested');
      li.appendChild(a);
      s.appendChild(li);
    });
    document.querySelectorAll('.sidebar a').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        const t = document.getElementById(link.getAttribute('href').slice(1));
        if (t) t.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  <\/script>
</body>
</html>`;
    return html;
}

// Initialize toolbar state
setTimeout(() => {
    updateToolbarState();
}, 100);