/*
  backup-button.js
  ----------------

  Purpose
  - Adds a small Backup/Restore menu next to the header "Back" link.
  - Exports all localStorage keys to a downloadable JSON file (Backup/Export).
  - Imports JSON to localStorage (Restore/Import) with an option to overwrite or only add new keys.

  Required HTML IDs (must match the page where this runs)
  - #backupBtn         -> the visible button the user clicks (gear icon)
  - #backupMenu        -> the popover menu element (aria-hidden toggled)
  - #restoreBtn        -> the menu button that opens the hidden file input
  - #exportBtn         -> the menu button that triggers the download/export
  - #importFileInput   -> an <input type="file"> element (hidden) used for importing

  Accessibility notes
  - The code toggles `aria-hidden` on the menu and `aria-expanded` on the button so screen readers
    and assistive tech can understand the open/closed state.

  Quick test (manual)
  - Open the About page in a browser, click the gear (⚙️). The menu should open.
  - Choose "Backup (Export)" to download a JSON file of localStorage.
  - Choose "Restore (Import)…" and pick a previously exported JSON file to import.
*/

(function(){
    // Select the DOM elements we need. We find them by ID so these exact IDs must exist in the HTML.
    const backupBtn = document.getElementById('backupBtn');
    const backupMenu = document.getElementById('backupMenu');
    const restoreBtn = document.getElementById('restoreBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importFileInput = document.getElementById('importFileInput');

    // Bail out early if this page doesn't have the backup UI. This makes the script safe to include
    // on pages that don't use the menu.
    if(!backupBtn || !backupMenu) return;

    // Make sure the menu's initial inline styles match its aria-hidden state. This helps the
    // show/hide logic work even if the CSS hasn't applied yet.
    backupMenu.style.display = backupMenu.getAttribute('aria-hidden') === 'false' ? 'block' : 'none';
    backupMenu.style.opacity = backupMenu.getAttribute('aria-hidden') === 'false' ? '1' : '0';
    backupMenu.style.pointerEvents = backupMenu.getAttribute('aria-hidden') === 'false' ? 'auto' : 'none';

    // closeMenu: hides the menu and updates ARIA attributes. We animate the opacity and then hide
    // the element (so keyboard users and screen readers see a clean state change).
    function closeMenu(){
        backupMenu.setAttribute('aria-hidden','true');
        backupBtn.setAttribute('aria-expanded','false');
        backupMenu.style.opacity = '0';
        backupMenu.style.pointerEvents = 'none';
        // Wait slightly for the opacity transition before setting display: none
        setTimeout(function(){ try{ backupMenu.style.display = 'none'; }catch(e){} }, 160);
    }

    // openMenu: shows the menu and updates ARIA attributes. We set display first, then turn on opacity
    // so the CSS transition runs.
    function openMenu(){
        backupMenu.setAttribute('aria-hidden','false');
        backupBtn.setAttribute('aria-expanded','true');
        backupMenu.style.display = 'block';
        // tiny timeout so the browser registers the display change, then transition opacity
        setTimeout(function(){ backupMenu.style.opacity = '1'; backupMenu.style.pointerEvents = 'auto'; }, 10);
    }

    // Toggle the menu when the button is clicked. We also stop propagation so the document-level
    // click handler (which closes the menu on outside clicks) doesn't immediately close it.
    backupBtn.addEventListener('click', function(e){
        var isOpen = backupMenu.getAttribute('aria-hidden') === 'false';
        if(isOpen) closeMenu(); else openMenu();
        e.stopPropagation();
    });

    // If the user clicks anywhere outside the menu, close it.
    document.addEventListener('click', function(e){
        if(!backupMenu.contains(e.target) && e.target !== backupBtn) closeMenu();
    });

    // Allow Esc to close the menu for keyboard users.
    document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') closeMenu();
    });

    // Export (Backup) logic: gather all keys from localStorage, try to parse values as JSON where possible
    // so stored objects come back as objects in the file, then create and download a .json file.
    if(exportBtn){
        exportBtn.addEventListener('click', function(){
            const data = {};
            for(let i=0; i<localStorage.length; i++){
                const key = localStorage.key(i);
                try { data[key] = JSON.parse(localStorage.getItem(key)); }
                catch(_) { data[key] = localStorage.getItem(key); }
            }

            // Create a pretty-printed JSON string and trigger a download via a temporary <a> element.
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
            a.href = url;
            a.download = 'assignments-export-' + ts + '.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            alert('Exported file should download shortly.');
            closeMenu();
        });
    }

    // Import (Restore) logic: user picks a JSON file, we parse it and either overwrite existing keys or
    // only add missing keys, based on a confirm prompt. We store values back into localStorage as strings
    // (JSON.stringify for objects) so they are preserved the same way they were exported.
    if(restoreBtn && importFileInput){
        // clicking restore simply opens the hidden file input
        restoreBtn.addEventListener('click', function(){
            importFileInput.value = null; // reset selection
            importFileInput.click();
            closeMenu();
        });

        // when a file is chosen, read it as text and parse JSON
        importFileInput.addEventListener('change', function(ev){
            const file = ev.target.files && ev.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = function(e){
                try{
                    const imported = JSON.parse(e.target.result);
                    if(typeof imported !== 'object' || imported === null){
                        alert('Imported file does not contain a valid JSON object.');
                        return;
                    }

                    // Ask whether to overwrite or only add missing keys
                    const overwrite = confirm('Import will add keys to localStorage. Click OK to overwrite existing keys, Cancel to only add keys that do not exist.');

                    if(overwrite){
                        // overwrite existing keys
                        Object.keys(imported).forEach(k => {
                            const val = imported[k];
                            localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val));
                        });
                        alert('Import complete (existing keys overwritten).');
                    } else {
                        // add only keys that don't already exist
                        let added = 0;
                        Object.keys(imported).forEach(k => {
                            if(localStorage.getItem(k) == null){
                                const val = imported[k];
                                localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val));
                                added++;
                            }
                        });
                        alert('Import complete — ' + added + ' new keys added.');
                    }
                } catch(err){
                    // If parsing fails, notify the user
                    alert('Failed to parse JSON: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
    }

    // small console/log marker — helpful when debugging
    console && console.log && console.log('[backup-button] initialized');
    // mark that initialization ran so fallback code can detect it
    try{ window.backupButtonInitialized = true; }catch(e){}

})();
