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

let savedRange = null;
let isUpdatingFontSize = false;

// Global document styles
let documentStyles = {
    headingLevel: 'P',
    fontFamily: 'Inter',
    fontSize: 16,
    textColor: '#000000',
    backgroundColor: '#ffffff'
};

// Initialize editor
editor.focus();
updatePreview();

// Use inline CSS for execCommand styling
if (document.queryCommandSupported('styleWithCSS')) {
    document.execCommand('styleWithCSS', false, true);
}

function execCmd(cmd, value = null) {
    // put back the last selection
    restoreSelection();
    document.execCommand(cmd, false, value);
    // grab it again in case the command modified it
    saveSelection();
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

// Enhanced heading select - applies CSS styling instead of formatBlock
headingSelect.addEventListener('change', () => {
    documentStyles.headingLevel = headingSelect.value;
    applyGlobalHeadingStyle();
    updatePreview();
});

// Enhanced font family - applies to entire document
fontFamilySelect.addEventListener('change', () => {
    documentStyles.fontFamily = fontFamilySelect.value;
    applyGlobalFontFamily();
    updatePreview();
});

textColorPicker.addEventListener('input', () => {
    execCmd('foreColor', textColorPicker.value);
});

highlightColorPicker.addEventListener('input', () => {
    execCmd('hiliteColor', highlightColorPicker.value);
});

// Improved font size handling
fontSizeInput.addEventListener('input', () => {
    if (isUpdatingFontSize) return;
    documentStyles.fontSize = parseInt(fontSizeInput.value, 10);
    applyGlobalFontSize();
    updatePreview();
});

fontSizeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        documentStyles.fontSize = parseInt(fontSizeInput.value, 10);
        applyGlobalFontSize();
        updatePreview();
        editor.focus();
    }
});

decreaseFontBtn.addEventListener('click', (e) => {
    e.preventDefault();
    adjustGlobalFontSize(-2);
});

increaseFontBtn.addEventListener('click', (e) => {
    e.preventDefault();
    adjustGlobalFontSize(2);
});

clearFormatBtn.addEventListener('click', () => {
    execCmd('removeFormat');
    // Reset to defaults
    documentStyles = {
        headingLevel: 'P',
        fontFamily: 'Inter',
        fontSize: 16,
        textColor: '#000000',
        backgroundColor: '#ffffff'
    };
    headingSelect.value = 'P';
    fontFamilySelect.value = 'Inter';
    fontSizeInput.value = 16;
    applyAllGlobalStyles();
    updatePreview();
});

clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all content?')) {
        editor.innerHTML = '<p>Start typing your document here...</p>';
        // Reset to defaults
        documentStyles = {
            headingLevel: 'P',
            fontFamily: 'Inter',
            fontSize: 16,
            textColor: '#000000',
            backgroundColor: '#ffffff'
        };
        headingSelect.value = 'P';
        fontFamilySelect.value = 'Inter';
        fontSizeInput.value = 16;
        applyAllGlobalStyles();
        updatePreview();
    }
});

printBtn.addEventListener('click', printContent);
exportBtn.addEventListener('click', exportHTML);

// Global styling functions
function applyGlobalHeadingStyle() {
    const level = documentStyles.headingLevel;
    let fontSize, fontWeight, marginTop, marginBottom;
    
    switch(level) {
        case 'H1':
            fontSize = Math.max(documentStyles.fontSize * 2, 32);
            fontWeight = 'bold';
            marginTop = '1.5em';
            marginBottom = '0.5em';
            break;
        case 'H2':
            fontSize = Math.max(documentStyles.fontSize * 1.5, 24);
            fontWeight = 'bold';
            marginTop = '1.3em';
            marginBottom = '0.4em';
            break;
        case 'H3':
            fontSize = Math.max(documentStyles.fontSize * 1.25, 20);
            fontWeight = 'bold';
            marginTop = '1.2em';
            marginBottom = '0.3em';
            break;
        default: // P
            fontSize = documentStyles.fontSize;
            fontWeight = 'normal';
            marginTop = '0.5em';
            marginBottom = '0.5em';
    }
    
    editor.style.fontSize = fontSize + 'px';
    editor.style.fontWeight = fontWeight;
    editor.style.marginTop = marginTop;
    editor.style.marginBottom = marginBottom;
}

function applyGlobalFontFamily() {
    editor.style.fontFamily = documentStyles.fontFamily;
}

function applyGlobalFontSize() {
    // Recalculate heading size based on new base font size
    applyGlobalHeadingStyle();
}

function applyAllGlobalStyles() {
    applyGlobalFontFamily();
    applyGlobalHeadingStyle();
}

function adjustGlobalFontSize(delta) {
    const newSize = Math.min(72, Math.max(8, documentStyles.fontSize + delta));
    documentStyles.fontSize = newSize;
    fontSizeInput.value = newSize;
    applyGlobalFontSize();
    updatePreview();
    editor.focus();
}

// Selection management
function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount && editor.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0);
    }
}

function restoreSelection() {
    if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
    }
}

editor.addEventListener('input', () => {
    updatePreview();
    updateToolbarState();
});

['mouseup', 'keyup', 'focus'].forEach(evt =>
    editor.addEventListener(evt, () => {
        saveSelection();
        updateToolbarState();
    })
);

function updateToolbarState() {
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
}

// Enhanced preview update with proper styling
function updatePreview() {
    const title = document.getElementById('docTitle').value.trim() || 'Untitled Document';
    const content = editor.innerHTML;
    
    // Generate CSS based on current document styles
    const level = documentStyles.headingLevel;
    let previewFontSize, previewFontWeight, previewMargin;
    
    switch(level) {
        case 'H1':
            previewFontSize = Math.max(documentStyles.fontSize * 2, 32);
            previewFontWeight = 'bold';
            previewMargin = '1.5em 0 0.5em 0';
            break;
        case 'H2':
            previewFontSize = Math.max(documentStyles.fontSize * 1.5, 24);
            previewFontWeight = 'bold';
            previewMargin = '1.3em 0 0.4em 0';
            break;
        case 'H3':
            previewFontSize = Math.max(documentStyles.fontSize * 1.25, 20);
            previewFontWeight = 'bold';
            previewMargin = '1.2em 0 0.3em 0';
            break;
        default: // P
            previewFontSize = documentStyles.fontSize;
            previewFontWeight = 'normal';
            previewMargin = '0.5em 0';
    }

    const previewHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { 
      font-family: ${documentStyles.fontFamily}, Arial, sans-serif; 
      line-height: 1.6; 
      margin: 20px;
      font-size: ${previewFontSize}px;
      font-weight: ${previewFontWeight};
      color: ${documentStyles.textColor};
      background-color: ${documentStyles.backgroundColor};
    }
    p, div { 
      margin: ${previewMargin};
      font-size: inherit;
      font-weight: inherit;
    }
    /* Override any inline styles that might conflict */
    * {
      font-family: inherit !important;
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

// Enhanced print function
function printContent() {
    const title = document.getElementById('docTitle').value.trim() || 'Untitled Document';
    
    // Generate CSS based on current document styles
    const level = documentStyles.headingLevel;
    let printFontSize, printFontWeight, printMargin;
    
    switch(level) {
        case 'H1':
            printFontSize = Math.max(documentStyles.fontSize * 2, 32);
            printFontWeight = 'bold';
            printMargin = '1.5em 0 0.5em 0';
            break;
        case 'H2':
            printFontSize = Math.max(documentStyles.fontSize * 1.5, 24);
            printFontWeight = 'bold';
            printMargin = '1.3em 0 0.4em 0';
            break;
        case 'H3':
            printFontSize = Math.max(documentStyles.fontSize * 1.25, 20);
            printFontWeight = 'bold';
            printMargin = '1.2em 0 0.3em 0';
            break;
        default: // P
            printFontSize = documentStyles.fontSize;
            printFontWeight = 'normal';
            printMargin = '0.5em 0';
    }
    
    const win = window.open('', '_blank');
    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { 
      font-family: ${documentStyles.fontFamily}, Arial, sans-serif; 
      line-height: 1.6; 
      margin: 20px;
      font-size: ${printFontSize}px;
      font-weight: ${printFontWeight};
      color: ${documentStyles.textColor};
    }
    p, div { 
      margin: ${printMargin};
      font-size: inherit;
      font-weight: inherit;
    }
    h1 { font-size: 1.2em; margin: 1em 0 0.5em 0; }
    * {
      font-family: inherit !important;
    }
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

// Enhanced export HTML
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
    
    // Generate CSS based on current document styles
    const level = documentStyles.headingLevel;
    let exportFontSize, exportFontWeight;
    
    switch(level) {
        case 'H1':
            exportFontSize = Math.max(documentStyles.fontSize * 2, 32);
            exportFontWeight = 'bold';
            break;
        case 'H2':
            exportFontSize = Math.max(documentStyles.fontSize * 1.5, 24);
            exportFontWeight = 'bold';
            break;
        case 'H3':
            exportFontSize = Math.max(documentStyles.fontSize * 1.25, 20);
            exportFontWeight = 'bold';
            break;
        default: // P
            exportFontSize = documentStyles.fontSize;
            exportFontWeight = 'normal';
    }

    const css = `
:root { --brand-green: #f0fdfa; --border: #e2e8f0; --text-dark: #111; --text-light: #555;}
*{box-sizing:border-box;}
body{margin:0;padding:0;font-family:${documentStyles.fontFamily},system-ui,sans-serif;color:var(--text-dark);font-size:${exportFontSize}px;font-weight:${exportFontWeight};}
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
.content p, .content div { font-size: inherit; font-weight: inherit; font-family: inherit; }
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

// Initialize with default styles
setTimeout(() => {
    applyAllGlobalStyles();
    updateToolbarState();
    updatePreview();
}, 100);