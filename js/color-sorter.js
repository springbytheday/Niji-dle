const families = ["Red", "Orange", "Yellow", "Green", "Teal", "Blue", "Purple", "Pink", "Cream", "Magenta", "Grey", "Black", "White", "Other"];
    let items = [];
    let nextId = 1;
    const $ = s => document.querySelector(s);

    const itemsById = new Map();
    const itemEls = new Map();
    const categoryEls = new Map();
    let unsortedGrid, unsortedCountEl, boardEl;

    function normalizeHex(s) {
      s = s.trim();
      if (!s) return null;
      if (!s.startsWith("#")) s = "#" + s;
      if (/^#[0-9a-fA-F]{3}$/.test(s)) s = "#" + [...s.slice(1)].map(c => c + c).join("");
      return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : null;
    }

    function parseColors(text) {
      const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      const out = [];
      for (const line of lines) {
        const parts = line.split(",");
        let id, hex;
        if (parts.length >= 2) {id = parts[0].trim(); hex = normalizeHex(parts[1]);}
        else {hex = normalizeHex(parts[0]); id = String(nextId++);}
        if (hex) out.push({id: id || String(nextId++), hex, family: null, otherNote: ""});
      }
      const seen = new Set();
      return out.filter(x => {let k = x.id; if (seen.has(k)) {k = x.id + "-" + Math.random().toString(36).slice(2, 6); x.id = k;} seen.add(k); return true;});
    }

    function buildBoard() {
      unsortedGrid = $('#unsorted');
      unsortedCountEl = $('#unsortedCount');
      boardEl = $('.board');

      const cats = $('#categories'); cats.innerHTML = "";
      categoryEls.clear();
      families.forEach(f => {
        const cat = document.createElement("div"); cat.className = "category"; cat.dataset.family = f;
        const title = document.createElement("div"); title.className = "title";
        const countSpan = document.createElement("span"); countSpan.className = "count"; countSpan.textContent = "0";
        title.append(f + " ", countSpan);
        const grid = document.createElement("div"); grid.className = "grid dropzone";
        cat.append(title, grid);

        let noteInput = null;
        if (f === "Other") {
          const noteWrap = document.createElement("div"); noteWrap.className = "other-note";
          noteInput = document.createElement("input");
          noteInput.type = "text";
          noteInput.placeholder = "Optional: explain unusual/unclear colors";
          noteWrap.appendChild(noteInput);
          cat.appendChild(noteWrap);
          // Applies to every item currently sorted into "Other" — this is a
          // single shared note for the category, not a per-swatch note.
          noteInput.addEventListener("input", () => {
            const v = noteInput.value;
            items.forEach(x => {if (x.family === "Other") x.otherNote = v;});
            save();
          });
        }
        cats.appendChild(cat);
        categoryEls.set(f, {el: cat, grid, count: countSpan, noteInput});
      });

      boardEl.addEventListener("dragstart", e => {
        const swatch = e.target.closest(".swatch");
        if (!swatch) return;
        e.dataTransfer.setData("text/plain", swatch.dataset.id);
        swatch.classList.add("dragging");
      });
      boardEl.addEventListener("dragend", e => {
        const swatch = e.target.closest(".swatch");
        if (swatch) swatch.classList.remove("dragging");
      });
      boardEl.addEventListener("dragover", e => {
        const zone = e.target.closest(".dropzone");
        if (!zone) return;
        e.preventDefault();
        zone.closest(".category")?.classList.add("drop");
      });
      boardEl.addEventListener("dragleave", e => {
        const zone = e.target.closest(".dropzone");
        zone?.closest(".category")?.classList.remove("drop");
      });
      boardEl.addEventListener("drop", e => {
        const zone = e.target.closest(".dropzone");
        if (!zone) return;
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        const parent = zone.closest(".category");
        assignFamily(id, parent ? parent.dataset.family : null);
        parent?.classList.remove("drop");
      });

      boardEl.addEventListener("click", e => {
        const swatch = e.target.closest(".swatch");
        if (swatch) {
          const id = swatch.dataset.id;
          setSelected(selectedId === id ? null : id);
          return;
        }
        if (!selectedId || e.target.closest("input")) return;
        const cat = e.target.closest(".category");
        if (cat) {
          assignFamily(selectedId, cat.dataset.family);
          setSelected(null);
          return;
        }
        if (e.target.closest(".column")) {
          assignFamily(selectedId, null);
          setSelected(null);
        }
      });
    }

    let selectedId = null;
    function setSelected(id) {
      if (selectedId) itemEls.get(selectedId)?.classList.remove("selected");
      selectedId = id;
      if (id) itemEls.get(id)?.classList.add("selected");
    }

    function assignFamily(id, family) {
      const item = itemsById.get(id);
      if (!item) return;
      item.family = family;
      if (family !== "Other") item.otherNote = "";
      const el = itemEls.get(id);
      const target = family ? categoryEls.get(family).grid : unsortedGrid;
      if (el && target) target.appendChild(el);
      updateCounts();
      save();
    }

    function makeCard(item) {
      const el = document.createElement("div"); el.className = "swatch"; el.draggable = true; el.dataset.id = item.id;
      const box = document.createElement("div"); box.className = "color-box"; box.style.background = item.hex;
      const hex = document.createElement("div"); hex.className = "hex"; hex.textContent = item.hex;
      el.append(box, hex);
      itemEls.set(item.id, el);
      return el;
    }

    function render() {
      itemsById.clear();
      itemEls.clear();
      unsortedGrid.innerHTML = "";
      categoryEls.forEach(c => {c.grid.innerHTML = ""; if (c.noteInput) c.noteInput.value = "";});

      if (!items.length) {
        unsortedGrid.innerHTML = '<div class="empty" style="grid-column:1/-1">No colors to sort.</div>';
      } else {
        items.forEach(x => {
          itemsById.set(String(x.id), x);
          const card = makeCard(x);
          if (x.family) {
            const c = categoryEls.get(x.family);
            c.grid.appendChild(card);
            if (x.family === "Other" && x.otherNote) c.noteInput.value = x.otherNote;
          } else {
            unsortedGrid.appendChild(card);
          }
        });
      }
      updateCounts();
    }

    function updateCounts() {
      const counts = Object.create(null);
      let sorted = 0;
      items.forEach(x => {
        if (x.family) {sorted++; counts[x.family] = (counts[x.family] || 0) + 1;}
      });
      $('#progress').textContent = `${sorted} / ${items.length} sorted`;
      unsortedCountEl.textContent = items.length - sorted;
      families.forEach(f => {categoryEls.get(f).count.textContent = counts[f] || 0;});
    }

    function save() {localStorage.setItem("colorSorterState", JSON.stringify({participant: $('#participant').value, items}));}
    function loadSaved() {
      try {
        const s = JSON.parse(localStorage.getItem("colorSorterState") || "null");
        if (s) {$('#participant').value = s.participant || ""; items = s.items || []; render();}
      } catch (e) { }
    }
    function csvEscape(v) {return '"' + String(v ?? "").replace(/"/g, '""') + '"';}

    function valueFor(x) {
      if (!x.family) return "";
      if (x.family === "Other" && x.otherNote) return `Other (${x.otherNote})`;
      return x.family;
    }

    function exportCSV() {
      if (!items.length) {alert("Load colors first."); return;}
      const participant = $('#participant').value.trim();
      const header = ["participant_id", ...items.map(x => x.hex)];
      const row = [participant, ...items.map(valueFor)];
      const csv = [header, row].map(r => r.map(csvEscape).join(",")).join("\r\n");
      const blob = new Blob([csv], {type: "text/csv;charset=utf-8"});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `color_classifications_${participant || "participant"}.csv`; a.click();
      URL.revokeObjectURL(a.href);
    }

    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyapaC2za4NRoIcAyGu4rMuvIN4XjJRVCTU0GZ51MxwpElFqgiNDRiZyDdafzdiMGenSA/exec";

    function setStatus(msg, isError) {
      const el = $('#submitStatus');
      el.textContent = msg;
      el.style.display = "inline-block";
      el.style.background = isError ? "#fee2e2" : "#dcfce7";
      el.style.color = isError ? "#991b1b" : "#166534";
    }

    async function submitToSheet() {
      if (!items.length) {alert("No colors loaded."); return;}
      const unsorted = items.filter(x => !x.family).length;
      if (unsorted > 0 && !confirm(`${unsorted} color(s) are still unsorted. Submit anyway?`)) return;
      if (!$('#participant').value.trim() && !confirm("No Participant ID entered. Submit anyway?")) return;
      if (SCRIPT_URL.includes("PASTE_YOUR")) {alert("Submission isn't configured yet — SCRIPT_URL needs to be set."); return;}

      const payload = {
        participant: $('#participant').value.trim(),
        answers: items.map(x => ({hex: x.hex, value: valueFor(x)}))
      };
      setStatus("Submitting…", false);
      try {
        await fetch(SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {"Content-Type": "text/plain;charset=utf-8"},
          body: JSON.stringify(payload)
        });
        setStatus("Submitted ✓", false);
      } catch (err) {
        setStatus("Submission failed — use Download CSV backup", true);
      }
    }

    buildBoard();
    $('#participant').addEventListener("input", () => {$('#participantDisplay').textContent = `Participant: ${$('#participant').value.trim() || "—"}`; save();});
    $('#resetBtn').onclick = () => {if (confirm("Reset all classifications?")) {items.forEach(x => {x.family = null; x.otherNote = ""}); render(); save();} };
    $('#exportBtn').onclick = exportCSV;
    $('#submitBtn').onclick = submitToSheet;
    $('#reviewBtn').onclick = () => {
      const total = items.length, sorted = items.filter(x => x.family).length;
      $('#summaryText').textContent = `${sorted} of ${total} colors sorted. ${total - sorted} remain unsorted.`;
      let html = "<table style='width:100%;border-collapse:collapse'><tr><th style='text-align:left;padding:6px;border-bottom:1px solid #ddd'>Family</th><th style='text-align:right;padding:6px;border-bottom:1px solid #ddd'>Count</th></tr>";
      families.forEach(f => html += `<tr><td style='padding:6px;border-bottom:1px solid #eee'>${f}</td><td style='text-align:right;padding:6px;border-bottom:1px solid #eee'>${items.filter(x => x.family === f).length}</td></tr>`);
      html += "</table>";
      $('#summary').innerHTML = html; $('#modal').classList.add("show");
    };
    $('#closeModal').onclick = () => $('#modal').classList.remove("show");
    loadSaved();
    const PRELOADED_COLORS = `#FFFEF7\n#F98FB7\n#CA636C\n#FF8C9B\n#A9CEEC\n#FF5F00\n#FA5578\n#C5EDFF\n#756F7D\n#C83C35\n#7FD6E2\n#FAD8DC\n#683D46\n#7D3CAF\n#444C7D\n#F6D4DF\n#A83E4A\n#A50082\n#DAFFF9\n#95C8D8\n#E2364F\n#B32F51\n#858ED1\n#DC143C\n#5C9BBC\n#79CFB8\n#AA0037\n#F4E49D\n#EBDD84\n#F0F0F5\n#EC1D2F\n#FFCB5B\n#BF69F4\n#F9E072\n#B43246\n#002FA7\n#B14D4D\n#EEFFFF\n#FFEFD5\n#40CF84\n#818FBF\n#4B5F9E\n#72D5CE\n#AA7BE8\n#64C8F0\n#FBAF71\n#9FCEC9\n#FBE340\n#FAB80D\n#A58CDC\n#CD3796\n#7CA1F0\n#FF899D\n#FF8C3C\n#DCFF50\n#92F3A4\n#E6325F\n#F3A4A9\n#D598DD\n#198CAA\n#FFE673\n#CDCD00\n#B9ADB9\n#4DD7E3\n#0C6F72\n#ABD3D8\n#F4D35B\n#07A4E3\n#A590AF\n#FFD264\n#846FC7\n#38B48B\n#FF6E1E\n#DFCDBF\n#4270B2\n#CDA5FF\n#5A5FAA\n#FFC6E2\n#EB4682\n#CC8F7A\n#585C82\n#8AD1EF\n#ACA7BB\n#F74848\n#C10E49\n#F9CACA\n#FDFF7A\n#234A87\n#FF5A00\n#42FFFF\n#D4AF37\n#E86A74\n#D8E9FC\n#80C8EF\n#094078\n#EF6F94\n#E55A9B\n#1E2232\n#C93965\n#A09BD8\n#D0669A\n#2C35BD\n#FEBC87\n#5AC8FF\n#FF8184\n#91ABD0\n#81D4E2\n#C8F39A\n#6EB487\n#FEECF3\n#625DA1\n#CC338B\n#77B6C2\n#9DD9B9\n#FF8C73\n#3A8FB7\n#D24E5F\n#F1F4F4\n#BCC37E\n#442657\n#FFAE42\n#5A7DFF\n#7DF9FF\n#F36C21\n#558E8D\n#4BB3CE\n#429B76\n#745BFF\n#952D22\n#96CEEB\n#5DCCAB\n#F03C32\n#8C4664\n#C2AAE6\n#BA6EA5\n#C57FC7\n#DF6D7C\n#EF9AAF\n#E60012\n#C92235\n#0A44AA\n#543298\n#DC3C41\n#6C2735\n#D7FAD7\n#FFE36C\n#F1C8DE\n#235AAA\n#AAD9F4\n#2887FF\n#54A2E5\n#6E3FE7\n#E5E2F6\n#FFD728\n#745399\n#A660A7\n#DFC6A8\n#7C86DE\n#FFF321\n#C8C3DC\n#44DDF4\n#FF2FA2\n#EEB1CC\n#EF8468\n#FFADBB\n#7B788A\n#C31E5A\n#CC3D7B\n#63AED9\n#EA930A\n#E66186\n#7DC7B0\n#4A4A5C\n#E43F3B\n#B600FF\n#FFE632\n#FAC31E\n#FFCACE\n#F9E97A\n#8728E1\n#D5345E\n#C34196\n#960018\n#192332\n#FEECD8\n#BD81D4\n#384B5A\n#FAD1D6\n#B6C6F2\n#F7265A\n#F5EB28\n#B4E9FF\n#AC324B\n#BFFFFF\n#D8368D\n#007328\n#FFEEA0\n#FFCEF1\n#E4D571\n#82ACC8`;
    if (!items.length) {
      items = parseColors(PRELOADED_COLORS);
      render();
      save();
    }