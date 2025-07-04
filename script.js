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

        // Specific controls
        headingSelect.addEventListener('change', () => {
            execCmd('formatBlock', headingSelect.value);
            updateFontSizeFromSelection();
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

        // Improved font size handling
        fontSizeInput.addEventListener('input', () => {
            if (isUpdatingFontSize) return;
            applyFontSize();
        });

        fontSizeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyFontSize();
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
            // Reset font size to default
            fontSizeInput.value = 16;
            applyFontSize();
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all content?')) {
                editor.innerHTML = '<p>Start typing your document here...</p>';
                updatePreview();
                fontSizeInput.value = 16;
            }
        });

        printBtn.addEventListener('click', printContent);
        exportBtn.addEventListener('click', exportHTML);

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
            const spans = editor.querySelectorAll('span');
            spans.forEach(span => {
                const parent = span.parentElement;
                if (
                    parent &&
                    parent.tagName === 'SPAN' &&
                    parent.style.fontSize === span.style.fontSize &&
                    parent.attributes.length === 1 // Only fontSize style, nothing else
                ) {
                    // Flatten nested span
                    parent.replaceWith(...parent.childNodes);
                }
            });

            updatePreview();
            updateToolbarState();
        });


        ['mouseup', 'keyup', 'focus'].forEach(evt =>
            editor.addEventListener(evt, () => {
                saveSelection();
                updateToolbarState();
                updateFontSizeFromSelection();
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

    const sel = window.getSelection();
    if (!sel.rangeCount || !editor.contains(sel.anchorNode)) return;

    const range = sel.getRangeAt(0);
    let container = range.startContainer;

    // Traverse up to the block element
    while (container && container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement;
    }

    if (container && editor.contains(container)) {
        // Detect block tag: P, H1, H2, etc.
        let tag = container.tagName;
        if (/^H[1-6]$/.test(tag) || tag === 'P') {
            headingSelect.value = tag;
        } else {
            headingSelect.value = 'P';
        }

        // Detect font family
        const fontFamily = window.getComputedStyle(container).fontFamily.split(',')[0].replace(/['"]/g, '');
        if ([...fontFamilySelect.options].some(o => o.value === fontFamily)) {
            fontFamilySelect.value = fontFamily;
        }

        // Detect font size
        const fontSize = parseInt(window.getComputedStyle(container).fontSize, 10);
        if (fontSize && !isNaN(fontSize)) {
            isUpdatingFontSize = true;
            fontSizeInput.value = fontSize;
            setTimeout(() => { isUpdatingFontSize = false; }, 50);
        }
    }
}


        // Update font size input based on current selection
        function updateFontSizeFromSelection() {
            if (isUpdatingFontSize) return;

            const currentSize = getCurrentFontSize();
            if (currentSize && currentSize !== parseInt(fontSizeInput.value, 10)) {
                isUpdatingFontSize = true;
                fontSizeInput.value = currentSize;
                setTimeout(() => { isUpdatingFontSize = false; }, 50);
            }
        }

        // Get font size from element
        function getFontSizeFromElement(element) {
            if (!element || !editor.contains(element)) return null;

            const computedStyle = window.getComputedStyle(element);
            const fontSize = computedStyle.fontSize;

            if (fontSize && fontSize !== 'medium') {
                return parseInt(fontSize, 10);
            }

            return null;
        }

// Replace the existing applyFontSize function with this smart version
function applyFontSize() {
    const size = parseInt(fontSizeInput.value, 10);
    if (!size || size < 8 || size > 72) return;

    editor.focus();

    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    if (sel.isCollapsed) {
        // No selection - handle cursor position
        const currentNode = range.startContainer;
        let currentSpan = null;

        // Find if we're inside a span
        if (currentNode.nodeType === Node.TEXT_NODE) {
            currentSpan = currentNode.parentElement;
        } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
            currentSpan = currentNode;
        }

        // Check if current span is a font size span and if it's empty or only has zero-width space
        if (currentSpan && 
            currentSpan.tagName === 'SPAN' && 
            currentSpan.style.fontSize &&
            (!currentSpan.textContent.trim() || currentSpan.textContent === '\u200B')) {
            
            // Reuse the existing empty span - just change its font size
            currentSpan.style.fontSize = size + 'px';
            
            // Make sure there's a zero-width space for cursor positioning
            if (!currentSpan.textContent) {
                currentSpan.textContent = '\u200B';
            }
            
            // Position cursor in the span
            try {
                range.setStart(currentSpan.firstChild, 1);
                range.setEnd(currentSpan.firstChild, 1);
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) {
                // Fallback
                currentSpan.focus();
            }
        } else {
            // Create new span only if current span has content
            const tempSpan = document.createElement('span');
            tempSpan.style.fontSize = size + 'px';
            tempSpan.textContent = '\u200B';
            
            try {
                range.insertNode(tempSpan);
                range.setStart(tempSpan.firstChild, 1);
                range.setEnd(tempSpan.firstChild, 1);
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) {
                editor.focus();
            }
        }
    } else {
        // Has selection - apply font size to selected text
        try {
            const contents = range.extractContents();
            const span = document.createElement('span');
            span.style.fontSize = size + 'px';
            span.appendChild(contents);
            range.insertNode(span);
            
            // Position cursor after the span
            range.setStartAfter(span);
            range.setEndAfter(span);
            sel.removeAllRanges();
            sel.addRange(range);
            
        } catch (e) {
            console.warn('Font size application failed:', e);
        }
    }

    saveSelection();
    updatePreview();
}

// Improved input event listener that cleans up better
editor.addEventListener('input', (e) => {
    // Clean up empty spans and merge adjacent spans with same font size
    const spans = editor.querySelectorAll('span');
    spans.forEach(span => {
        // Remove completely empty spans (no text content at all)
        if (!span.textContent) {
            span.remove();
            return;
        }
        
        // Don't remove spans that only contain zero-width space - they're needed for cursor positioning
        if (span.textContent === '\u200B') {
            return;
        }
        
        // Remove spans with no styling
        if (!span.style.cssText) {
            const parent = span.parentNode;
            while (span.firstChild) {
                parent.insertBefore(span.firstChild, span);
            }
            span.remove();
        }
    });

    updatePreview();
    updateToolbarState();
});

// Enhanced cleanup when user types to remove zero-width spaces when real content is added
editor.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
        const sel = window.getSelection();
        if (sel.rangeCount) {
            const range = sel.getRangeAt(0);
            // const currentNode = range.startContainer;
            
            // If we're in a span that only contains zero-width space, remove it before inserting real text
            if (currentNode.nodeType === Node.TEXT_NODE && 
                currentNode.textContent === '\u200B' && 
                currentNode.parentElement.tagName === 'SPAN') {
                
                const span = currentNode.parentElement;
                // Clear the zero-width space so real content can be inserted
                currentNode.textContent = '';
            }
        }
    }
});

        // Adjust font size by delta
        function adjustFontSize(delta) {
            editor.focus();

            // Get current font size from selection or default
            let currentSize = getCurrentFontSize();
            if (!currentSize) {
                currentSize = parseInt(fontSizeInput.value, 10) || 16;
            }

            const newSize = Math.min(72, Math.max(8, currentSize + delta));
            fontSizeInput.value = newSize;
            applyFontSize();
        }

        // Get current font size more reliably
        function getCurrentFontSize() {
            const sel = window.getSelection();
            if (!sel.rangeCount || !editor.contains(sel.anchorNode)) {
                return parseInt(fontSizeInput.value, 10) || 16;
            }

            let element;
            if (sel.isCollapsed) {
                // Get element at cursor position
                const range = sel.getRangeAt(0);
                element = range.startContainer.nodeType === Node.TEXT_NODE
                    ? range.startContainer.parentElement
                    : range.startContainer;
            } else {
                // Get element from selection
                const range = sel.getRangeAt(0);
                element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
                    ? range.commonAncestorContainer.parentElement
                    : range.commonAncestorContainer;
            }

            // Walk up the DOM to find font size
            while (element && editor.contains(element)) {
                const computedStyle = window.getComputedStyle(element);
                const fontSize = computedStyle.fontSize;

                if (fontSize && fontSize !== 'medium') {
                    const size = parseInt(fontSize, 10);
                    if (size && size > 0) {
                        return size;
                    }
                }
                element = element.parentElement;
            }

            return 16; // Default fallback
        }

        // Preview update
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
            h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
            p { margin: 0.5em 0; }
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
            h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
            p { margin: 0.5em 0; }
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
.content h1{font-size:1.2rem;text-transform:uppercase;letter-spacing:.05em;margin:3rem 0 1.5rem;color:#007a5a;}
.content table{width:100%;border-collapse:collapse;margin:1rem 0;}
.content th,.content td{border:1px solid var(--border);padding:.5rem;}
.content code,.content pre{background:#f7fafc;padding:.2rem .4rem;border-radius:4px;}
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
            updateFontSizeFromSelection();
        }, 100);