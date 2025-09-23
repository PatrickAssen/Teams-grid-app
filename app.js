(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const gridEl = $("#grid");
  const nameListEl = $("#nameList");
  const startBtn = $("#startBtn");
  const resetBtn = $("#resetBtn");
  const showListBtn = $("#showListBtn");
  const sidebarEl = $("#sidebar");
  const overlayEl = $("#overlay");
  const addSelectedBtn = $("#addSelectedBtn");
  const newNameInput = $("#newNameInput");
  const addNameBtn = $("#addNameBtn");
  const deleteSelectedBtn = $("#deleteSelectedBtn");
  const filterInput = $("#filterInput");
  const closeSidebar = $("#closeSidebar");
  const selectMode = $("#selectMode");
  const adminToggle = $("#adminToggle");
  const tileTpl = $("#tileTpl");

  // State
  let state = {
    allNames: [],     // [{id, text}]
    availableIds: [], // queue list ids not yet in grid
    gridIds: [],      // ids placed in grid
    started: false,
    lastSelectedIndex: null
  };

  // Storage
  const save = () => {
    localStorage.setItem("tg_state", JSON.stringify(state));
  };
  const load = () => {
    const raw = localStorage.getItem("tg_state");
    if (raw) {
      try {
        state = Object.assign(state, JSON.parse(raw));
      } catch {}
    } else {
      // seed with placeholders
      const seed = ["Alice","Bob","Carla","David","Emma","Fatima","Gert","Hugo","Iris","Jeroen","Kees","Lotte","Milan","Noa","Olaf"];
      state.allNames = seed.map((t,i)=>({id:String(i+1), text:t}));
      state.availableIds = state.allNames.map(n=>n.id);
      state.gridIds = [];
      state.started = false;
      save();
    }
  };

  const getNameById = id => state.allNames.find(n => n.id === id);

  // Renderers
  const renderGrid = () => {
    gridEl.innerHTML = "";
    state.gridIds.forEach(id => {
      const n = getNameById(id);
      const el = tileTpl.content.firstElementChild.cloneNode(true);
      el.textContent = n.text;
      el.dataset.id = id;
      el.classList.toggle("on", state.started);
      el.classList.toggle("off", false);
      gridEl.appendChild(el);
    });
    // columns rule
    const n = state.gridIds.length;
    let cols = 2;
    if (n <= 4) cols = 2;
    else if (n <= 9) cols = 3;
    else if (n <= 16) cols = 4;
    else cols = 5;
    gridEl.style.setProperty("--cols", cols);
    gridEl.style.setProperty("--cols", cols);
    // Enable click toggle when started
    if (state.started) {
      $$(".tile", gridEl).forEach(t => {
        t.addEventListener("click", () => {
          t.classList.toggle("on");
          t.classList.toggle("off");
        });
      });
    }
  };

  const renderList = () => {
    const filter = filterInput.value.trim().toLowerCase();
    nameListEl.innerHTML = "";
    state.availableIds.forEach((id, idx) => {
      const n = getNameById(id);
      if (filter && !n.text.toLowerCase().includes(filter)) return;
      const li = document.createElement("li");
      li.className = "name-item";
      li.dataset.id = id;
      li.dataset.idx = idx;
      const span = document.createElement("span");
      span.className = "name-text";
      span.textContent = n.text;
      const handle = document.createElement("span");
      handle.className = "name-handle";
      handle.textContent = "≡";
      li.appendChild(span);
      li.appendChild(handle);
      nameListEl.appendChild(li);
    });
  };

  const syncUIByMode = () => {
    if (adminToggle) document.body.classList.toggle('admin-on', adminToggle.checked);
            if (state.started) {
      sidebarEl.classList.add("hidden");
      overlayEl.style.display = "none";
      showListBtn.disabled = false;
      // Disable reordering during started
      gridSortable.option("disabled", true);
    } else {
      sidebarEl.classList.remove("hidden");
      overlayEl.style.display = "none";
      gridSortable.option("disabled", false);
    }
  };

  // Selection logic
  const selectedClass = "selected";
  const getSelectedIds = () =>
    $$(".name-item."+selectedClass, nameListEl).map(li => li.dataset.id);

  nameListEl.addEventListener("click", (e) => {
    const li = e.target.closest(".name-item");
    if (!li) return;
    if (selectMode.checked || e.ctrlKey || e.metaKey) {
      li.classList.toggle(selectedClass);
    } else if (e.shiftKey && state.lastSelectedIndex != null) {
      const idx = Number(li.dataset.idx);
      const [a,b] = [state.lastSelectedIndex, idx].sort((x,y)=>x-y);
      $$(".name-item", nameListEl).forEach((el,i)=> {
        if (i>=a && i<=b) el.classList.add(selectedClass);
      });
    } else {
      // single select
      $$(".name-item."+selectedClass, nameListEl).forEach(el=>el.classList.remove(selectedClass));
      li.classList.add(selectedClass);
    }
    state.lastSelectedIndex = Number(li.dataset.idx);
  });

  // Buttons
  addSelectedBtn.addEventListener("click", () => {
    const ids = getSelectedIds();
    if (!ids.length) return;
    ids.forEach(id => {
      if (!state.gridIds.includes(id)) {
        state.gridIds.push(id);
        state.availableIds = state.availableIds.filter(x => x !== id);
      }
    });
    save();
    renderList();
    renderGrid();
  });

  addNameBtn.addEventListener("click", () => {
    const t = newNameInput.value.trim();
    if (!t) return;
    const id = String(Date.now());
    state.allNames.push({id, text: t});
    state.availableIds.push(id);
    newNameInput.value = "";
    save();
    renderList();
  });

  deleteSelectedBtn.addEventListener("click", () => {
    const ids = new Set(getSelectedIds());
    if (!ids.size) return;
    // Remove from allNames and from queues
    state.allNames = state.allNames.filter(n => !ids.has(n.id));
    state.availableIds = state.availableIds.filter(id => !ids.has(id));
    state.gridIds = state.gridIds.filter(id => !ids.has(id));
    save();
    renderList();
    renderGrid();
  });
  
  startBtn.addEventListener("click", () => {
    state.started = true;
    save();
    renderGrid();
    syncUIByMode();
  });

  resetBtn.addEventListener("click", () => {
    state.started = false;
    // Return all to available
    state.availableIds = state.allNames.map(n=>n.id);
    state.gridIds = [];
    save();
    renderList();
    renderGrid();
    syncUIByMode();
  });

  showListBtn.addEventListener("click", () => {
    // Show sidebar overlay to add people during started
    sidebarEl.classList.remove("hidden");
    overlayEl.style.display = "block";
  });
  overlayEl.addEventListener("click", () => {
    overlayEl.style.display = "none";
    if (state.started) sidebarEl.classList.add("hidden");
  });
  closeSidebar.addEventListener("click", () => {
    overlayEl.style.display = "none";
    if (state.started) sidebarEl.classList.add("hidden");
  });

  filterInput.addEventListener("input", renderList);
  if (adminToggle) {
    const stored = localStorage.getItem("tg_admin_on");
    if (stored !== null) adminToggle.checked = stored === "1";
    adminToggle.addEventListener("change", () => {
      localStorage.setItem("tg_admin_on", adminToggle.checked ? "1" : "0");
      syncUIByMode();
    });
  }
    
  // Sortable
  let gridSortable;
  let listSortable;

  function initSortables() {
    gridSortable = new Sortable(gridEl, {
      draggable: ".tile",
      forceFallback: true,
      onChoose: () => { gridEl.classList.add("drag-target"); },
      onUnchoose: () => { gridEl.classList.remove("drag-target"); },
      animation: 150,
      group: { name: "people", pull: true, put: true },
      delay: 1000,
      delayOnTouchOnly: true,
      touchStartThreshold: 0,
      onAdd: (evt) => {
        const fromList = (evt.from === nameListEl);
        // Collect IDs to move: if dragging from list and multi-selected, move them all.
        let ids = [];
        if (fromList) {
          const selected = getSelectedIds();
          if (selected.length) {
            ids = selected;
          } else if (evt.item && evt.item.dataset && evt.item.dataset.id) {
            ids = [evt.item.dataset.id];
          }
        } else if (evt.item && evt.item.dataset && evt.item.dataset.id) {
          ids = [evt.item.dataset.id];
        }

        // Append at the end in the exact order of 'ids'
        ids.forEach(id => {
          if (state.availableIds.includes(id)) {
            state.availableIds = state.availableIds.filter(x => x !== id);
            if (!state.gridIds.includes(id)) {
              state.gridIds.push(id); // append to end
            }
          }
        });

        // Clean up any transient DOM node created by Sortable
        if (evt.item && evt.item.parentNode) {
          evt.item.parentNode.removeChild(evt.item);
        }
        save();
        renderList();
        renderGrid();

        // Clear selection after move
        $$(".name-item.selected", nameListEl).forEach(el => el.classList.remove("selected"));
        state.lastSelectedIndex = null;
      },
      onUpdate: (evt) => {
        // Recompute grid order
        state.gridIds = $$(".tile", gridEl).map(el => el.dataset.id);
        save();
      }
    });

    listSortable = new Sortable(nameListEl, {
      animation: 150,
      group: { name: "people", pull: "clone", put: false },
      sort: true,
      delay: 120,
      delayOnTouchOnly: true,
      forceFallback: true,
      draggable: ".name-item",
      onStart: (evt) => {
        nameListEl.classList.add("dragging");
        if (gridEl) gridEl.classList.add("drag-target");
        if (evt.item) evt.item.classList.add("dragging");
      },
      onEnd: (evt) => {
        nameListEl.classList.remove("dragging");
        gridEl.classList.remove("drag-target");
        if (evt.item) evt.item.classList.remove("dragging");
        // Persist availableIds based on DOM order
        const currentDomIds = $$(".name-item", nameListEl).map(li => li.dataset.id);
        state.availableIds = currentDomIds;
        save();
      }
    });
  }

  // PWA
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(()=>{});
    });
  }

  // Boot
  load();
  initSortables();
  renderList();
  renderGrid();
  syncUIByMode();
})();