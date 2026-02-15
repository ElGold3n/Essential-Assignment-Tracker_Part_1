(function(){

    const backupBtn = document.getElementById('backupBtn');
    const backupMenu = document.getElementById('backupMenu');
    const restoreBtn = document.getElementById('restoreBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importFileInput = document.getElementById('importFileInput');

    // If the main elements are missing (page doesn't include the UI), bail out gracefully.
    if(!backupBtn || !backupMenu) return;

    function closeMenu(){
        backupMenu.setAttribute('aria-hidden','true');
        backupBtn.setAttribute('aria-expanded','false');
    }

    function openMenu(){
        backupMenu.setAttribute("aria-hidden",'false');
        backupBtn.setAttribute('aria-expanded','true');
    }

    backupBtn.addEventListener('click', function(e){
        const isOpen = backupMenu.getAttribute('aria-hidden') === 'false';
        if(isOpen) closeMenu(); else openMenu();
        e.stopPropagation();
    });

    // Close when clicking outside
    document.addEventListener('click', function(e){
        if(!backupMenu.contains(e.target) && e.target !== backupBtn) closeMenu();
    });

    // Keyboard support: Esc to close
    document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') closeMenu();
    });

    // Export localStorage as JSON
    if(exportBtn){
        exportBtn.addEventListener('click', function(){
            const data = {};
            for(let i=0; i<localStorage.length; i++){
                const key = localStorage.key(i);
                try { data[key] = JSON.parse(localStorage.getItem(key)); }
                catch(_) { data[key] = localStorage.getItem(key); }
            }
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
            alert('Export started — file should download shortly.');
            closeMenu();
        });
    }

    // Import: open a file picker and handle a file
    if(restoreBtn && importFileInput){
        restoreBtn.addEventListener('click', function(){
            importFileInput.value = null;
            importFileInput.click();
            closeMenu();
        });

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
                    const overwrite = confirm('Import will add keys to localStorage. Click OK to overwrite existing keys, Cancel to only add keys that do not exist.');
                    if(overwrite){
                        Object.keys(imported).forEach(k => {
                            const val = imported[k];
                            localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val));
                        });
                        alert('Import complete (existing keys overwritten).');
                    } else {
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
                    alert('Failed to parse JSON: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
    }
})();
