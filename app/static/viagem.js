/**
 * Roupeiro Virtual — Dedicated Travel Page Logic (viagem.js)
 * Manages full trip itinerary, complete outfit slots with placeholders,
 * wardrobe piece assignment with cross-usage tracking, and Google Shopping integration.
 */

(function () {
  "use strict";

  // State
  let currentUser = null;
  let authToken = null;
  let currentTrip = null;
  let wardrobeItems = [];
  let userShoppingCatalog = [];
  let availableCategories = [];

  // Active Contexts
  let activePickerContext = null; // { dayIndex, periodKey, itemIndex, item }
  let activeSwapContext = null;   // { sourceDayIndex, sourcePeriodKey }
  let activeAiLookContext = null; // { dayIndex, periodKey }
  let draggedLocContext = null;   // { dayIndex, periodKey, locIndex }

  // Visibility / Expansion State
  let allDaysExpanded = true;
  let allLocationsVisible = true;
  let allLooksVisible = true;
  const dayExpandedMap = {};
  const locationsVisibleMap = {};
  const looksVisibleMap = {};

  // Speech Recognition State
  let speechRecognition = null;
  let isRecordingVoice = false;

  // DOM Elements
  const pageTripDestination = document.getElementById("pageTripDestination");
  const pageTripDates = document.getElementById("pageTripDates");
  const tripDaysBadge = document.getElementById("tripDaysBadge");
  const tripWeatherSummaryBadge = document.getElementById("tripWeatherSummaryBadge");
  const tripHeadingTitle = document.getElementById("tripHeadingTitle");
  const tripHeaderDatesTimes = document.getElementById("tripHeaderDatesTimes");
  const tripSummaryParagraph = document.getElementById("tripSummaryParagraph");
  const tripDaysAccordion = document.getElementById("tripDaysAccordion");

  // Toolbar
  const btnToggleAllDays = document.getElementById("btnToggleAllDays");
  const btnToggleAllDaysText = document.getElementById("btnToggleAllDaysText");
  const btnToggleAllLocations = document.getElementById("btnToggleAllLocations");
  const btnToggleAllLocationsText = document.getElementById("btnToggleAllLocationsText");
  const btnToggleAllLooks = document.getElementById("btnToggleAllLooks");
  const btnToggleAllLooksText = document.getElementById("btnToggleAllLooksText");

  // Top Nav Buttons
  const btnOpenMyTripsModal = document.getElementById("btnOpenMyTripsModal");
  const btnOpenChecklistModal = document.getElementById("btnOpenChecklistModal");
  const btnPrintTrip = document.getElementById("btnPrintTrip");

  // View Switcher & Mala View Elements (Requisito: Visão da Mala inspirada no Roupeiro)
  const tabBtnRoteiro = document.getElementById("tabBtnRoteiro");
  const tabBtnMala = document.getElementById("tabBtnMala");
  const tabMalaPendingBadge = document.getElementById("tabMalaPendingBadge");
  const navMalaPendingBadge = document.getElementById("navMalaPendingBadge");
  const overviewQuickStats = document.getElementById("overviewQuickStats");
  const roteiroViewContainer = document.getElementById("roteiroViewContainer");
  const malaViewContainer = document.getElementById("malaViewContainer");
  const malaSummaryCard = document.getElementById("malaSummaryCard");
  const malaCategoriesGrid = document.getElementById("malaCategoriesGrid");
  const malaPackingTips = document.getElementById("malaPackingTips");
  const malaEssentialsList = document.getElementById("malaEssentialsList");

  let currentActiveView = "roteiro"; // "roteiro" | "mala"
  let malaFilterCategory = "Todas";
  let malaStatusFilter = "all"; // "all" | "prontas" | "atencao" | "comprar" | "definir"
  let malaOnlyPending = false;

  // Unified Picker Modal
  const unifiedPiecePickerModal = document.getElementById("unifiedPiecePickerModal");
  const btnClosePickerModal = document.getElementById("btnClosePickerModal");
  const pickerSlotBadge = document.getElementById("pickerSlotBadge");
  const pickerModalTitle = document.getElementById("pickerModalTitle");
  const pickerModalSubtitle = document.getElementById("pickerModalSubtitle");
  const tabBtnOptionWardrobe = document.getElementById("tabBtnOptionWardrobe");
  const tabBtnOptionShopping = document.getElementById("tabBtnOptionShopping");
  const panelOptionWardrobe = document.getElementById("panelOptionWardrobe");
  const panelOptionShopping = document.getElementById("panelOptionShopping");

  // Wardrobe Panel Elements
  const wardrobeSearchInput = document.getElementById("wardrobeSearchInput");
  const wardrobeCategorySelect = document.getElementById("wardrobeCategorySelect");
  const wardrobePiecesGrid = document.getElementById("wardrobePiecesGrid");

  // Shopping Panel Elements
  const subtabBtnGoogleShopping = document.getElementById("subtabBtnGoogleShopping");
  const subtabBtnProductUrl = document.getElementById("subtabBtnProductUrl");
  const subtabBtnCatalog = document.getElementById("subtabBtnCatalog");
  const subtabContentGoogleShopping = document.getElementById("subtabContentGoogleShopping");
  const subtabContentProductUrl = document.getElementById("subtabContentProductUrl");
  const subtabContentCatalog = document.getElementById("subtabContentCatalog");

  const shoppingQueryInput = document.getElementById("shoppingQueryInput");
  const shoppingFilterColor = document.getElementById("shoppingFilterColor");
  const shoppingFilterMaterial = document.getElementById("shoppingFilterMaterial");
  const shoppingFilterMaxPrice = document.getElementById("shoppingFilterMaxPrice");
  const btnSearchShopping = document.getElementById("btnSearchShopping");
  const shoppingLoadingSpinner = document.getElementById("shoppingLoadingSpinner");
  const shoppingResultsGrid = document.getElementById("shoppingResultsGrid");

  const manualProductUrlInput = document.getElementById("manualProductUrlInput");
  const btnExtractProductUrl = document.getElementById("btnExtractProductUrl");
  const urlExtractLoadingSpinner = document.getElementById("urlExtractLoadingSpinner");
  const urlExtractResultContainer = document.getElementById("urlExtractResultContainer");
  const userShoppingCatalogGrid = document.getElementById("userShoppingCatalogGrid");

  // Swap Period Modal Elements
  const swapPeriodModal = document.getElementById("swapPeriodModal");
  const btnCloseSwapPeriodModal = document.getElementById("btnCloseSwapPeriodModal");
  const btnCancelSwapPeriod = document.getElementById("btnCancelSwapPeriod");
  const btnConfirmSwapPeriod = document.getElementById("btnConfirmSwapPeriod");
  const swapSourcePeriodTitle = document.getElementById("swapSourcePeriodTitle");
  const swapSourcePeriodSummary = document.getElementById("swapSourcePeriodSummary");
  const swapTargetDaySelect = document.getElementById("swapTargetDaySelect");
  const swapPreviewBox = document.getElementById("swapPreviewBox");

  // Location Modal Elements
  const locationModal = document.getElementById("locationModal");
  const btnCloseLocationModal = document.getElementById("btnCloseLocationModal");
  const btnCancelLocationModal = document.getElementById("btnCancelLocationModal");
  const locationForm = document.getElementById("locationForm");
  const locationModalTitle = document.getElementById("locationModalTitle");
  const locationModalSubtitle = document.getElementById("locationModalSubtitle");
  const locFormDayIndex = document.getElementById("locFormDayIndex");
  const locFormPeriodKey = document.getElementById("locFormPeriodKey");
  const locFormLocIndex = document.getElementById("locFormLocIndex");
  const locFormStartTime = document.getElementById("locFormStartTime");
  const locFormEndTime = document.getElementById("locFormEndTime");
  const locFormName = document.getElementById("locFormName");
  const locFormDescription = document.getElementById("locFormDescription");
  const locFormStyle = document.getElementById("locFormStyle");
  const locFormTravelTime = document.getElementById("locFormTravelTime");

  // AI Look Edit Modal Elements
  const editLookAiModal = document.getElementById("editLookAiModal");
  const btnCloseEditLookAiModal = document.getElementById("btnCloseEditLookAiModal");
  const btnCancelEditLookAi = document.getElementById("btnCancelEditLookAi");
  const btnSubmitEditLookAi = document.getElementById("btnSubmitEditLookAi");
  const editLookContextSubtitle = document.getElementById("editLookContextSubtitle");
  const editLookContextChip = document.getElementById("editLookContextChip");
  const aiPromptInput = document.getElementById("aiPromptInput");
  const voicePromptBtn = document.getElementById("voicePromptBtn");
  const voiceMicIcon = document.getElementById("voiceMicIcon");
  const voicePromptStatusText = document.getElementById("voicePromptStatusText");
  const editLookLoadingOverlay = document.getElementById("editLookLoadingOverlay");

  // Checklist Modal Elements
  const tripChecklistModal = document.getElementById("tripChecklistModal");
  const btnCloseChecklistModal = document.getElementById("btnCloseChecklistModal");
  const checklistItemsContainer = document.getElementById("checklistItemsContainer");
  const checklistPackingTips = document.getElementById("checklistPackingTips");
  const checklistEssentialsList = document.getElementById("checklistEssentialsList");

  // Saved Trips Modal Elements
  const savedTripsModal = document.getElementById("savedTripsModal");
  const btnCloseSavedTripsModal = document.getElementById("btnCloseSavedTripsModal");
  const savedTripsListContainer = document.getElementById("savedTripsListContainer");

  // Image Zoom Modal Elements (Zoom 4x)
  const imageZoomModal = document.getElementById("imageZoomModal");
  const zoomModalImg = document.getElementById("zoomModalImg");
  const zoomModalTitle = document.getElementById("zoomModalTitle");
  const zoomModalSlot = document.getElementById("zoomModalSlot");
  const btnCloseZoomModal = document.getElementById("btnCloseZoomModal");

  function openImageZoomModal(imgUrl, title, slot) {
    if (!imgUrl) return;
    if (zoomModalImg) zoomModalImg.src = imgUrl;
    if (zoomModalTitle) zoomModalTitle.textContent = title || "Peça do Look";
    if (zoomModalSlot) {
      if (slot) {
        zoomModalSlot.textContent = slot;
        zoomModalSlot.classList.remove("hidden");
      } else {
        zoomModalSlot.classList.add("hidden");
      }
    }
    imageZoomModal?.classList.remove("hidden");
  }

  function closeImageZoomModal() {
    imageZoomModal?.classList.add("hidden");
    if (zoomModalImg) zoomModalImg.src = "";
  }

  // ==========================================
  // HELPERS & AUTH
  // ==========================================

  function formatDateBR(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function getFreshAuthToken() {
    if (!currentUser && window.firebase && firebase.auth().currentUser) {
      currentUser = firebase.auth().currentUser;
    }
    if (!currentUser) return null;
    try {
      authToken = await currentUser.getIdToken();
      return authToken;
    } catch (e) {
      console.error("Token error:", e);
      return authToken;
    }
  }

  async function authFetch(url, options = {}) {
    const token = await getFreshAuthToken();
    if (!token) {
      window.location.href = "/";
      throw new Error("Usuário não autenticado");
    }
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
      options.headers.set("Authorization", `Bearer ${token}`);
      options.headers.set("Cache-Control", "no-cache");
    } else {
      options.headers["Authorization"] = `Bearer ${token}`;
      options.headers["Cache-Control"] = "no-cache";
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
      window.location.href = "/";
      throw new Error("Sessão expirada");
    }
    return res;
  }

  // ==========================================
  // CROSS-USAGE TRACKING
  // ==========================================

  /**
   * Checks if a wardrobe piece is already in use in another day or period of the trip.
   * Tracks generic quantities, sequential unit numbers, and no-repeat constraints.
   */
  function findPieceUsageInTrip(pieceId, excludeDayIndex = null, excludePeriodKey = null, excludeItemIndex = null) {
    if (!currentTrip || !currentTrip.days || !pieceId) {
      return { isUsed: false, usedCount: 0, uses: [], nextUnitNumber: 1, isExhausted: false, maxQty: 1 };
    }

    const piece = wardrobeItems.find(w => w.id === pieceId);
    const isGeneric = piece ? Boolean(piece.is_generic) : false;
    const maxQty = piece ? (parseInt(piece.quantidade) || 1) : 1;
    const naoRepetir = piece ? Boolean(piece.nao_repetir) : false;

    const uses = [];

    for (let dIdx = 0; dIdx < currentTrip.days.length; dIdx++) {
      const day = currentTrip.days[dIdx];
      const dNum = day.day_number || (dIdx + 1);
      const dDate = formatDateBR(day.date);

      const periods = [
        { key: "day_period", label: "Diurno" },
        { key: "night_period", label: "Noturno" }
      ];

      for (const p of periods) {
        const period = day[p.key];
        const look = period ? period.look : null;
        if (!look || !Array.isArray(look.items)) continue;

        for (let itIdx = 0; itIdx < look.items.length; itIdx++) {
          if (excludeDayIndex === dIdx && excludePeriodKey === p.key && excludeItemIndex === itIdx) {
            continue;
          }
          const item = look.items[itIdx];
          const isItemShopping = item && (item.source_type === "shopping" || (item.source_type !== "wardrobe" && (!!item.merchant || !!item.shopping_id || !!item.shopping_item_id)));
          if (item && !isItemShopping && item.item_id === pieceId) {
            uses.push({
              dayIndex: dIdx,
              dayNumber: dNum,
              date: dDate,
              periodKey: p.key,
              periodLabel: p.label,
              lookTitle: look.title || `Look ${p.label}`,
              slotName: item.slot_name || "Peça",
              unitNumber: item.unit_number || null,
              tipo: item.tipo
            });
          }
        }
      }
    }

    const usedCount = uses.length;
    const isUsed = usedCount > 0;
    const nextUnitNumber = usedCount + 1;
    const isExhausted = naoRepetir && (usedCount >= maxQty);

    return {
      isUsed,
      usedCount,
      maxQty,
      isGeneric,
      naoRepetir,
      isExhausted,
      nextUnitNumber,
      uses,
      dayNumber: uses[0]?.dayNumber,
      date: uses[0]?.date,
      periodLabel: uses[0]?.periodLabel,
      lookTitle: uses[0]?.lookTitle,
      slotName: uses[0]?.slotName
    };
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async function initViagemPage() {
    try {
      const configResp = await fetch(`/api/config?_t=${Date.now()}`, { cache: "no-store" });
      const config = await configResp.json();
      availableCategories = config.categories || [];

      // Populate wardrobe picker category filter
      wardrobeCategorySelect.innerHTML = `<option value="all">Todas as Categorias</option>` +
        availableCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

      if (window.firebase && config.firebase) {
        if (!firebase.apps.length) {
          firebase.initializeApp(config.firebase);
        }

        firebase.auth().onAuthStateChanged(async (user) => {
          if (user) {
            currentUser = user;
            authToken = await user.getIdToken();
            await loadInitialData();
          } else {
            window.location.href = "/";
          }
        });
      }
    } catch (err) {
      console.error("Init viagem error:", err);
    }
  }

  async function loadInitialData() {
    // 1. Fetch Wardrobe Items
    try {
      const resp = await authFetch("/api/clothes");
      if (resp.ok) {
        const data = await resp.json();
        wardrobeItems = data.items || [];
      }
    } catch (e) {
      console.warn("Could not load wardrobe items:", e);
    }

    // 2. Fetch User Shopping Catalog
    try {
      const cResp = await authFetch("/api/shopping/catalog");
      if (cResp.ok) {
        const cData = await cResp.json();
        userShoppingCatalog = cData.items || [];
      }
    } catch (e) {
      console.warn("Could not load shopping catalog:", e);
    }

    // 3. Fetch User Custom Categories
    try {
      const catResp = await authFetch("/api/categories");
      if (catResp.ok) {
        const catData = await catResp.json();
        if (catData.categories && Array.isArray(catData.categories)) {
          availableCategories = Array.from(new Set([...availableCategories, ...catData.categories]));
          if (wardrobeCategorySelect) {
            const cur = wardrobeCategorySelect.value;
            wardrobeCategorySelect.innerHTML = `<option value="all">Todas as Categorias</option>` +
              availableCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
            if (cur) wardrobeCategorySelect.value = cur;
          }
        }
      }
    } catch (e) {
      console.warn("Could not load categories:", e);
    }

    // 3. Load Trip by URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get("id");

    if (tripId) {
      await loadTrip(tripId);
    } else {
      // Load latest trip
      try {
        const tripsResp = await authFetch("/api/trips");
        const tripsData = await tripsResp.json();
        if (tripsData.trips && tripsData.trips.length) {
          currentTrip = tripsData.trips[0];
          // Update URL without refresh
          window.history.replaceState({}, "", `?id=${currentTrip.id}`);
          renderTripPage();
        } else {
          openSavedTripsModal();
        }
      } catch (e) {
        console.error("Error loading trips:", e);
      }
    }

    setupEventListeners();
  }

  async function loadTrip(tripId) {
    try {
      const resp = await authFetch(`/api/trips/${tripId}`);
      if (!resp.ok) throw new Error("Viagem não encontrada");
      currentTrip = await resp.json();
      renderTripPage();
    } catch (err) {
      console.error("Failed to load trip:", err);
      alert("Não foi possível carregar o roteiro da viagem.");
    }
  }

  // ==========================================
  // RENDER TRIP PAGE
  // ==========================================

  function updateLockStateUI() {
    const isLocked = !!currentTrip?.is_locked;
    const banner = document.getElementById("tripLockedBanner");
    const btnLock = document.getElementById("btnToggleLockTrip");
    const iconLock = document.getElementById("btnToggleLockTripIcon");
    const textLock = document.getElementById("btnToggleLockTripText");

    if (banner) {
      if (isLocked) banner.classList.remove("hidden");
      else banner.classList.add("hidden");
    }
    if (iconLock) iconLock.textContent = isLocked ? "🔓" : "🔒";
    if (textLock) textLock.textContent = isLocked ? "Desbloquear Edição" : "Bloquear Edição";
    if (btnLock) {
      btnLock.className = isLocked
        ? "px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        : "px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5";
    }
  }

  function renderTripPage() {
    if (!currentTrip) return;

    // Header info
    pageTripDestination.textContent = currentTrip.destination || "Roteiro de Viagem";
    const totalDays = currentTrip.total_days || (currentTrip.days ? currentTrip.days.length : 0);
    const datesStr = `${formatDateBR(currentTrip.arrival_date)} às ${currentTrip.arrival_time || '13:00'} → ${formatDateBR(currentTrip.departure_date)} às ${currentTrip.departure_time || '18:00'}`;

    pageTripDates.textContent = datesStr;
    tripDaysBadge.textContent = `${totalDays} ${totalDays === 1 ? 'Dia' : 'Dias'} de Viagem`;
    tripHeadingTitle.textContent = currentTrip.destination || "Destino";
    tripHeaderDatesTimes.textContent = datesStr;
    tripSummaryParagraph.textContent = currentTrip.summary || "Roteiro e looks personalizados pelo Gemini 3.7 Flash.";

    // Weather summary from first day
    const firstDay = currentTrip.days && currentTrip.days[0];
    if (firstDay && firstDay.weather && firstDay.weather.day) {
      tripWeatherSummaryBadge.innerHTML = `
        <span>🌤️</span>
        <span>${firstDay.weather.day.temp_c || '--'} • ${firstDay.weather.day.condition || 'Ameno'}</span>
      `;
    }

    updateLockStateUI();
    renderTripAccordion();
    updateTripPendingBadges();
    if (currentActiveView === "mala") {
      renderMalaView();
    }
  }

  // ==========================================
  // LOOK STATUS HELPERS (LOOK COMPLETO vs FALTAM ITENS)
  // ==========================================

  function isItemPendingDefinition(item) {
    if (!item) return true;
    if (item.is_placeholder === true) return true;
    if (item.item_id && typeof item.item_id === "string" && item.item_id.trim() !== "") return false;
    if (item.source_type === "shopping" || item.shopping_id || item.shopping_item_id || item.merchant) return false;
    return true;
  }

  function getLookPendingCount(look) {
    if (!look || !Array.isArray(look.items) || look.items.length === 0) return 0;
    return look.items.filter(isItemPendingDefinition).length;
  }

  function getDayLookStatus(day) {
    let totalItems = 0;
    let pendingCount = 0;
    let hasAnyLook = false;

    const periods = [day.day_period, day.night_period].filter(p => p && p.look);
    periods.forEach(p => {
      hasAnyLook = true;
      const items = p.look.items || [];
      totalItems += items.length;
      items.forEach(it => {
        if (isItemPendingDefinition(it)) {
          pendingCount++;
        }
      });
    });

    return {
      hasAnyLook,
      totalItems,
      pendingCount,
      isComplete: hasAnyLook && totalItems > 0 && pendingCount === 0
    };
  }

  function buildDayStatusBadgeHtml(dayStatus) {
    if (!dayStatus.hasAnyLook || dayStatus.totalItems === 0) {
      return `
        <div class="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl text-xs font-medium text-slate-600 shadow-2xs" title="Nenhum look configurado para este dia">
          <span>❓</span>
          <span>Sem look definido</span>
        </div>
      `;
    }

    if (dayStatus.isComplete) {
      return `
        <div class="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs" title="Todos os looks deste dia estão com peças definidas">
          <span>✅</span>
          <span>Look Completo</span>
        </div>
      `;
    }

    return `
      <div class="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-3 py-1 rounded-xl text-xs font-bold text-amber-900 shadow-2xs" title="${dayStatus.pendingCount} item(ns) pendente(s) a definir neste dia">
        <span>⚠️</span>
        <span>Faltam ${dayStatus.pendingCount} ${dayStatus.pendingCount === 1 ? 'item' : 'itens'} a definir</span>
      </div>
    `;
  }

  function buildPeriodStatusBadgeHtml(look) {
    if (!look || !Array.isArray(look.items) || look.items.length === 0) return "";
    let pending = 0;
    look.items.forEach(it => {
      if (isItemPendingDefinition(it)) pending++;
    });

    if (pending === 0) {
      return `
        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full ml-1 normal-case tracking-normal shadow-2xs">
          <span>✅</span> Look Completo
        </span>
      `;
    }

    return `
      <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full ml-1 normal-case tracking-normal shadow-2xs">
        <span>⚠️</span> Faltam ${pending} ${pending === 1 ? 'item' : 'itens'} a definir
      </span>
    `;
  }

  function renderTripAccordion() {
    if (!tripDaysAccordion || !currentTrip || !currentTrip.days) return;
    tripDaysAccordion.innerHTML = "";

    currentTrip.days.forEach((day, dayIndex) => {
      const dayNum = day.day_number || (dayIndex + 1);
      const dayDate = formatDateBR(day.date);
      const dayTitle = day.title || `Dia ${dayNum} em ${currentTrip.destination}`;

      // Initialize expansion states if not set
      if (dayExpandedMap[dayIndex] === undefined) dayExpandedMap[dayIndex] = allDaysExpanded;
      if (locationsVisibleMap[dayIndex] === undefined) locationsVisibleMap[dayIndex] = allLocationsVisible;
      if (looksVisibleMap[dayIndex] === undefined) looksVisibleMap[dayIndex] = allLooksVisible;

      const isDayExpanded = dayExpandedMap[dayIndex];
      const areLocationsVisible = locationsVisibleMap[dayIndex];
      const areLooksVisible = looksVisibleMap[dayIndex];

      const dayWeather = day.weather?.day || { temp_c: "--", condition: "Ameno", icon: "☀️" };
      const nightWeather = day.weather?.night || { temp_c: "--", condition: "Fresco", icon: "🌙" };

      // Calculate Day Look Status (Completo vs Faltam itens a definir)
      const dayStatus = getDayLookStatus(day);
      const dayStatusBadgeHtml = buildDayStatusBadgeHtml(dayStatus);

      // Calculate individual period status badges
      const dayPeriodBadgeHtml = buildPeriodStatusBadgeHtml(day.day_period?.look);
      const nightPeriodBadgeHtml = buildPeriodStatusBadgeHtml(day.night_period?.look);

      const dayCard = document.createElement("div");
      dayCard.className = "bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition duration-200";

      dayCard.innerHTML = `
        <!-- DAY HEADER (ACCORDION TOGGLE) -->
        <div class="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/80 transition" data-day-toggle="${dayIndex}">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-2xl bg-brand-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm shrink-0">
              D${dayNum}
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-slate-900 font-serif">${escapeHtml(dayTitle)}</h3>
              </div>
              <p class="text-xs text-slate-500 font-medium">${dayDate}</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <!-- Day Look Status Badge (Look Completo ou Faltam Itens a Definir) -->
            ${dayStatusBadgeHtml}

            <!-- Day Weather Badge -->
            <div class="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-xs text-amber-900" title="Previsão do Dia">
              <span>☀️</span>
              <span class="font-bold">${escapeHtml(dayWeather.temp_c)}</span>
              <span class="text-[10px] text-amber-700 hidden sm:inline">${escapeHtml(dayWeather.condition)}</span>
            </div>

            <!-- Night Weather Badge -->
            <div class="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl text-xs text-indigo-900" title="Previsão da Noite">
              <span>🌙</span>
              <span class="font-bold">${escapeHtml(nightWeather.temp_c)}</span>
              <span class="text-[10px] text-indigo-700 hidden sm:inline">${escapeHtml(nightWeather.condition)}</span>
            </div>

            <!-- Chevron Icon -->
            <button type="button" class="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-brand-600 flex items-center justify-center shadow-2xs transition ml-1">
              <span>${isDayExpanded ? '🔼' : '🔽'}</span>
            </button>
          </div>
        </div>

        <!-- DAY BODY (COLLAPSIBLE) -->
        <div class="p-6 space-y-8 ${isDayExpanded ? '' : 'hidden'}" id="day-body-${dayIndex}">
          
          <!-- 1. PERÍODO DIURNO (☀️) -->
          <div class="period-diurno-container space-y-4">
            <div class="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <div class="flex flex-wrap items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <div class="flex items-center gap-1.5">
                  <span class="text-base">☀️</span>
                  <span>Período Diurno &bull; Roteiro & Look</span>
                </div>
                ${dayPeriodBadgeHtml}
              </div>

              <!-- Actions for this period -->
              <div class="flex items-center gap-1.5 no-print flex-wrap">
                <button type="button" class="btn-open-add-loc px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs" data-day="${dayIndex}" data-period="day_period" title="Adicionar local a este período">
                  <span>➕</span>
                  <span>+ Local</span>
                </button>
                <button type="button" class="swap-period-btn px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs" data-day="${dayIndex}" data-period="day_period" title="Trocar este período (roteiro e look) com outro dia">
                  <span>🔄</span>
                  <span>Trocar Período</span>
                </button>
                <span class="text-slate-300">|</span>
                <button type="button" class="text-[11px] font-semibold text-slate-500 hover:text-brand-600 toggle-period-locs-btn" data-day="${dayIndex}" data-period="day_period">
                  <span>📍</span>
                  <span>${areLocationsVisible ? 'Ocultar Locais' : 'Ver Locais'}</span>
                </button>
                <span class="text-slate-300">|</span>
                <button type="button" class="text-[11px] font-semibold text-slate-500 hover:text-brand-600 toggle-period-look-btn" data-day="${dayIndex}" data-period="day_period">
                  <span>👔</span>
                  <span>${areLooksVisible ? 'Ocultar Look' : 'Ver Look'}</span>
                </button>
              </div>
            </div>

            <!-- Day Locations Section -->
            <div class="${areLocationsVisible ? '' : 'hidden'} space-y-3" id="locs-wrapper-${dayIndex}-day">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="locs-grid-${dayIndex}-day"></div>
            </div>

            <!-- Day Look Section -->
            <div class="${areLooksVisible ? '' : 'hidden'}" id="look-wrapper-${dayIndex}-day">
              <div id="look-container-${dayIndex}-day"></div>
            </div>
          </div>

          <!-- 2. PERÍODO NOTURNO (🌙) -->
          <div class="period-noturno-container space-y-4 pt-6 border-t border-slate-200">
            <div class="flex items-center justify-between border-b border-indigo-200/60 pb-2">
              <div class="flex flex-wrap items-center gap-2 text-xs font-bold text-indigo-800 uppercase tracking-wider">
                <div class="flex items-center gap-1.5">
                  <span class="text-base">🌙</span>
                  <span>Período Noturno &bull; Roteiro & Look</span>
                </div>
                ${nightPeriodBadgeHtml}
              </div>

              <div class="flex items-center gap-1.5 no-print flex-wrap">
                <button type="button" class="btn-open-add-loc px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs" data-day="${dayIndex}" data-period="night_period" title="Adicionar local a este período">
                  <span>➕</span>
                  <span>+ Local</span>
                </button>
                <button type="button" class="swap-period-btn px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs" data-day="${dayIndex}" data-period="night_period" title="Trocar este período (roteiro e look) com outro dia">
                  <span>🔄</span>
                  <span>Trocar Período</span>
                </button>
                <span class="text-slate-300">|</span>
                <button type="button" class="text-[11px] font-semibold text-slate-500 hover:text-brand-600 toggle-period-locs-btn" data-day="${dayIndex}" data-period="night_period">
                  <span>📍</span>
                  <span>${areLocationsVisible ? 'Ocultar Locais' : 'Ver Locais'}</span>
                </button>
                <span class="text-slate-300">|</span>
                <button type="button" class="text-[11px] font-semibold text-slate-500 hover:text-brand-600 toggle-period-look-btn" data-day="${dayIndex}" data-period="night_period">
                  <span>👔</span>
                  <span>${areLooksVisible ? 'Ocultar Look' : 'Ver Look'}</span>
                </button>
              </div>
            </div>

            <!-- Night Locations Section -->
            <div class="${areLocationsVisible ? '' : 'hidden'} space-y-3" id="locs-wrapper-${dayIndex}-night">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="locs-grid-${dayIndex}-night"></div>
            </div>

            <!-- Night Look Section -->
            <div class="${areLooksVisible ? '' : 'hidden'}" id="look-wrapper-${dayIndex}-night">
              <div id="look-container-${dayIndex}-night"></div>
            </div>
          </div>

        </div>
      `;

      // Header click toggles day accordion
      dayCard.querySelector(`[data-day-toggle="${dayIndex}"]`).addEventListener("click", () => {
        dayExpandedMap[dayIndex] = !dayExpandedMap[dayIndex];
        renderTripAccordion();
      });

      // Bind swap period button
      dayCard.querySelectorAll(".swap-period-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const dIdx = parseInt(btn.getAttribute("data-day"), 10);
          const pKey = btn.getAttribute("data-period");
          openSwapPeriodModal(dIdx, pKey);
        });
      });

      // Bind add location button
      dayCard.querySelectorAll(".btn-open-add-loc").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const dIdx = parseInt(btn.getAttribute("data-day"), 10);
          const pKey = btn.getAttribute("data-period");
          openLocationModal(dIdx, pKey);
        });
      });

      // Bind period quick toggles
      dayCard.querySelectorAll(".toggle-period-locs-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const p = btn.getAttribute("data-period");
          const target = dayCard.querySelector(p === "day_period" ? `#locs-wrapper-${dayIndex}-day` : `#locs-wrapper-${dayIndex}-night`);
          if (target) {
            target.classList.toggle("hidden");
            btn.querySelector("span").textContent = target.classList.contains("hidden") ? "Ver Locais" : "Ocultar Locais";
          }
        });
      });

      dayCard.querySelectorAll(".toggle-period-look-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const p = btn.getAttribute("data-period");
          const target = dayCard.querySelector(p === "day_period" ? `#look-wrapper-${dayIndex}-day` : `#look-wrapper-${dayIndex}-night`);
          if (target) {
            target.classList.toggle("hidden");
            btn.querySelector("span").textContent = target.classList.contains("hidden") ? "Ver Look" : "Ocultar Look";
          }
        });
      });

      tripDaysAccordion.appendChild(dayCard);

      // Render Locations
      renderLocations(dayIndex, "day_period", dayCard.querySelector(`#locs-grid-${dayIndex}-day`));
      renderLocations(dayIndex, "night_period", dayCard.querySelector(`#locs-grid-${dayIndex}-night`));

      // Render Look with Complete Slots
      renderCompleteLook(dayIndex, "day_period", dayCard.querySelector(`#look-container-${dayIndex}-day`));
      renderCompleteLook(dayIndex, "night_period", dayCard.querySelector(`#look-container-${dayIndex}-night`));
    });

    updateTripPendingBadges();
  }

  // Render Locations for a period with drag-and-drop ordering and time swapping
  function renderLocations(dayIndex, periodKey, container) {
    if (!container) return;
    const day = currentTrip.days[dayIndex];
    const period = day[periodKey];
    const locations = period && period.locations ? period.locations : [];

    if (!locations.length) {
      container.innerHTML = `
        <div class="col-span-full py-4 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
          <p class="text-xs text-slate-400">${periodKey === 'night_period' ? 'Sem passeios noturnos agendados para este dia.' : 'Nenhuma atividade programada para este período.'}</p>
          <button type="button" class="btn-empty-add-loc inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold transition" data-day="${dayIndex}" data-period="${periodKey}">
            <span>➕</span>
            <span>Adicionar Local</span>
          </button>
        </div>
      `;
      container.querySelector(".btn-empty-add-loc")?.addEventListener("click", () => {
        openLocationModal(dayIndex, periodKey);
      });
      return;
    }

    container.innerHTML = "";
    locations.forEach((loc, locIndex) => {
      const card = document.createElement("div");
      card.draggable = true;
      card.className = "loc-card bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl p-4 transition flex flex-col justify-between space-y-2.5 select-none cursor-grab active:cursor-grabbing shadow-2xs";
      card.setAttribute("data-day", dayIndex);
      card.setAttribute("data-period", periodKey);
      card.setAttribute("data-loc", locIndex);

      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-1.5">
              <span class="cursor-grab active:cursor-grabbing text-xs mr-0.5" title="Arraste para trocar ordem com outro local deste período">⠿</span>
              <button type="button" class="btn-edit-loc-badge text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-0.5 rounded-md border border-brand-200/80 flex items-center gap-1 transition" title="Clique para editar horários de início e término">
                <span>🕒</span>
                <span>${escapeHtml(loc.time || "Horário")}</span>
              </button>
            </div>
            <div class="flex items-center gap-1">
              ${loc.style ? `<span class="text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">${escapeHtml(loc.style)}</span>` : ""}
              <button type="button" class="btn-edit-loc text-slate-400 hover:text-amber-600 p-1 text-xs transition" title="Editar horários e detalhes do local">
                <span>✏️</span>
              </button>
              <button type="button" class="btn-delete-loc text-slate-400 hover:text-rose-600 p-1 text-xs transition" title="Remover local">
                <span>🗑️</span>
              </button>
            </div>
          </div>
          <h4 class="text-xs font-bold text-slate-900 leading-snug">${escapeHtml(loc.name)}</h4>
          ${loc.description ? `<p class="text-[11px] text-slate-600 mt-1 leading-relaxed">${escapeHtml(loc.description)}</p>` : ""}
        </div>

        <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
          <span class="text-slate-500 flex items-center gap-1">
            <span>🚕</span>
            ${escapeHtml(loc.travel_time || "Trajeto livre")}
          </span>
          <span class="text-[10px] text-slate-400 italic">Arraste para reordenar</span>
        </div>
      `;

      // Event listeners for edit / delete
      card.querySelector(".btn-edit-loc")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openLocationModal(dayIndex, periodKey, locIndex);
      });
      card.querySelector(".btn-edit-loc-badge")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openLocationModal(dayIndex, periodKey, locIndex);
      });
      card.querySelector(".btn-delete-loc")?.addEventListener("click", (e) => {
        e.stopPropagation();
        handleDeleteLocation(dayIndex, periodKey, locIndex);
      });

      // Drag and drop listeners for reordering & swapping chronological times
      card.addEventListener("dragstart", (e) => {
        draggedLocContext = { dayIndex, periodKey, locIndex };
        e.dataTransfer.setData("text/plain", `${dayIndex}_${periodKey}_${locIndex}`);
        card.classList.add("opacity-40");
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("opacity-40");
        container.querySelectorAll(".loc-card").forEach(el => {
          el.classList.remove("ring-2", "ring-brand-500", "scale-[1.02]", "bg-brand-50/40");
        });
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (draggedLocContext &&
            draggedLocContext.dayIndex === dayIndex &&
            draggedLocContext.periodKey === periodKey &&
            draggedLocContext.locIndex !== locIndex) {
          card.classList.add("ring-2", "ring-brand-500", "scale-[1.02]", "bg-brand-50/40");
        }
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("ring-2", "ring-brand-500", "scale-[1.02]", "bg-brand-50/40");
      });

      card.addEventListener("drop", async (e) => {
        e.preventDefault();
        card.classList.remove("ring-2", "ring-brand-500", "scale-[1.02]", "bg-brand-50/40");
        if (draggedLocContext &&
            draggedLocContext.dayIndex === dayIndex &&
            draggedLocContext.periodKey === periodKey &&
            draggedLocContext.locIndex !== locIndex) {
          const locs = currentTrip.days[dayIndex][periodKey].locations;
          const fromIdx = draggedLocContext.locIndex;
          const toIdx = locIndex;

          // Preserve chronological schedule slots ("Trocar os horários ao trocar os locais de lugar nos periodos")
          const slotTimes = locs.map(l => ({
            time: l.time,
            start_time: l.start_time,
            end_time: l.end_time
          }));

          const [movedLoc] = locs.splice(fromIdx, 1);
          locs.splice(toIdx, 0, movedLoc);

          // Assign slot times according to new positions
          locs.forEach((l, idx) => {
            if (slotTimes[idx]) {
              l.time = slotTimes[idx].time;
              if (slotTimes[idx].start_time) l.start_time = slotTimes[idx].start_time;
              if (slotTimes[idx].end_time) l.end_time = slotTimes[idx].end_time;
            }
          });

          await saveCurrentTrip();
          renderLocations(dayIndex, periodKey, container);
        }
        draggedLocContext = null;
      });

      container.appendChild(card);
    });
  }

  // ==========================================
  // RENDER COMPLETE LOOK WITH SLOTS
  // ==========================================

  function renderCompleteLook(dayIndex, periodKey, container) {
    if (!container) return;
    const day = currentTrip.days[dayIndex];
    const period = day[periodKey];
    const look = period ? period.look : null;

    if (!look) {
      if (periodKey === "night_period" && (!period || !period.has_activity)) {
        container.innerHTML = "";
        return;
      }
      container.innerHTML = `<div class="text-xs text-slate-400 py-2">Nenhum look configurado para este período.</div>`;
      return;
    }

    const items = look.items || [];

    container.innerHTML = `
      <div class="bg-gradient-to-br from-slate-50 via-white to-blue-50/20 border border-slate-200 rounded-2xl p-5 space-y-4">
        <!-- Look Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                <span>👔</span>
                <span>${escapeHtml(look.title || (periodKey === 'day_period' ? 'Look Diurno Completo' : 'Look Noturno Completo'))}</span>
              </h4>
              ${look.style ? `<span class="text-[10px] font-bold text-brand-700 bg-brand-100/70 px-2.5 py-0.5 rounded-full">${escapeHtml(look.style)}</span>` : ""}
            </div>
            ${look.justification ? `<p class="text-xs text-slate-600 leading-relaxed italic mt-1 font-serif">"${escapeHtml(look.justification)}"</p>` : ""}
          </div>

          <button type="button" class="btn-ai-regenerate-look px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-brand-700 border border-brand-200 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto no-print">
            <span>🪄</span>
            <span>Ajustar com IA (Voz/Texto)</span>
          </button>
        </div>

        <!-- Outfits Slots Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          ${items.map((item, itIdx) => renderSlotCardHtml(item, itIdx, dayIndex, periodKey)).join("")}
          <!-- Add piece slot button -->
          <div class="border border-dashed border-slate-300 hover:border-brand-400 bg-slate-50/50 hover:bg-brand-50/30 rounded-2xl p-3 flex flex-col justify-center items-center text-center shadow-2xs transition cursor-pointer group min-h-[190px] btn-add-look-slot no-print" data-day="${dayIndex}" data-period="${periodKey}" title="Adicionar nova peça a este look">
            <div class="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 group-hover:text-brand-600 group-hover:border-brand-300 flex items-center justify-center transition shadow-2xs">
              <span>➕</span>
            </div>
            <span class="text-xs font-bold text-slate-600 group-hover:text-brand-700 mt-2">+ Peça</span>
            <span class="text-[10px] text-slate-400">Novo item no look</span>
          </div>
        </div>

        ${look.recommendations ? `
          <div class="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3.5 py-2 flex items-center gap-2">
            <span>💡</span>
            <span><strong>Dica do Estilista:</strong> ${escapeHtml(look.recommendations)}</span>
          </div>
        ` : ""}
      </div>
    `;

    // AI Button
    container.querySelector(".btn-ai-regenerate-look")?.addEventListener("click", () => {
      openEditLookAiModal(dayIndex, periodKey);
    });

    // Remove slot item button
    container.querySelectorAll(".btn-remove-slot-item").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const itIdx = parseInt(btn.getAttribute("data-item-index"), 10);
        const item = items[itIdx];
        const itemName = item?.tipo || "este item";
        if (confirm(`Deseja remover "${itemName}" deste look?`)) {
          items.splice(itIdx, 1);
          look.item_ids = items.map(i => i.item_id).filter(Boolean);
          await saveCurrentTrip();
          renderTripAccordion();
        }
      });
    });

    // Add slot button
    container.querySelector(".btn-add-look-slot")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const newSlot = {
        slot: "extra",
        slot_name: "Peça Adicional",
        is_placeholder: true,
        item_id: null,
        tipo: "Peça a Escolher",
        categoria: "Outros",
        cor: "Neutro",
        por_que_foi_escolhida: "Peça adicionada ao look",
        shopping_query: "roupa casual"
      };
      if (!look.items) look.items = [];
      look.items.push(newSlot);
      await saveCurrentTrip();
      renderTripAccordion();
    });

    // Slot card click to open unified picker modal (Requisito: chamada ao clicar no quadrado do item)
    container.querySelectorAll(".slot-item-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (
          e.target.closest(".btn-remove-slot-item") ||
          e.target.closest(".btn-zoom-slot-item") ||
          e.target.closest(".btn-buy-slot-item") ||
          e.target.closest("a")
        ) {
          return;
        }
        const itIdx = parseInt(card.getAttribute("data-item-index"), 10);
        const item = items[itIdx];
        openUnifiedPickerModal(dayIndex, periodKey, itIdx, item);
      });
    });

    // Eye icon zoom button (Requisito: zoom 4x do item ao clicar no olho)
    container.querySelectorAll(".btn-zoom-slot-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const img = btn.getAttribute("data-img");
        const title = btn.getAttribute("data-title");
        const slot = btn.getAttribute("data-slot");
        openImageZoomModal(img, title, slot);
      });
    });

    // Purchase button on slot shopping card
    container.querySelectorAll(".btn-buy-slot-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itIdx = parseInt(btn.getAttribute("data-item-index"), 10);
        const item = items[itIdx];
        openPurchasePieceModal({
          tipo: item.tipo,
          categoria: item.categoria,
          cor_predominante: item.cor,
          price: item.price,
          merchant: item.merchant,
          original_url: item.original_url || item.thumbnail,
          shopping_id: item.shopping_id
        });
      });
    });
  }

  function renderSlotCardHtml(item, itIdx, dayIndex, periodKey) {
    const slotName = item.slot_name || "Peça";
    const isPlaceholder = !!item.is_placeholder;
    const isShopping = item.source_type === "shopping" || (item.source_type !== "wardrobe" && (!!item.merchant || !!item.shopping_id || !!item.shopping_item_id));

    // Check if wardrobe piece (only when not a shopping item)
    let wardrobePiece = null;
    if (!isShopping && item.item_id) {
      wardrobePiece = wardrobeItems.find(w => w.id === item.item_id);
    }

    let shoppingCatalogImg = "";
    if (isShopping && item.shopping_id) {
      const catMatch = userShoppingCatalog.find(c => c.id === item.shopping_id);
      if (catMatch && catMatch.thumbnail) {
        shoppingCatalogImg = catMatch.thumbnail;
      }
    }

    const imgUrl = isShopping
      ? (item.original_url || item.thumbnail || shoppingCatalogImg || "")
      : (wardrobePiece ? (wardrobePiece.cutout_url || wardrobePiece.original_url) : (item.original_url || item.thumbnail || ""));

    // Check if piece is in use elsewhere
    const usage = wardrobePiece ? findPieceUsageInTrip(wardrobePiece.id, dayIndex, periodKey, itIdx) : { isUsed: false };

    if (isPlaceholder) {
      // ESTADO: ITEM A PREENCHER (SEM BOTÃO, QUADRADO CLICÁVEL COM ESPAÇO AMPLIADO)
      return `
        <div class="slot-item-card slot-placeholder rounded-2xl p-3.5 flex flex-col justify-between items-center text-center shadow-2xs relative group min-h-[220px] cursor-pointer hover:border-amber-400 hover:shadow-md transition-all border border-amber-300/80 bg-amber-50/40 select-none" data-day-index="${dayIndex}" data-period-key="${periodKey}" data-item-index="${itIdx}" title="Clique no quadrado para preencher esta peça">
          <div class="w-full text-left mb-1 flex items-center justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded">
                ${escapeHtml(slotName)}
              </span>
              <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs" title="Item a definir no look">
                <span>🧩</span>
                <span>A Definir</span>
              </span>
            </div>
            <button type="button" class="btn-remove-slot-item text-slate-400 hover:text-rose-600 transition p-1 text-xs no-print" data-item-index="${itIdx}" title="Remover item do look">
              <span>🗑️</span>
            </button>
          </div>

          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-100/90 border border-dashed border-amber-300 flex flex-col items-center justify-center text-amber-600 my-auto group-hover:scale-105 group-hover:bg-amber-200/60 transition-all shadow-inner">
            <span class="text-2xl">➕</span>
          </div>

          <div class="w-full my-1">
            <h5 class="text-xs font-bold text-amber-950 truncate" title="${escapeHtml(item.tipo)}">${escapeHtml(item.tipo)}</h5>
            <span class="text-[10px] text-amber-700 font-medium block truncate">Item a preencher</span>
            <span class="text-[9px] text-amber-600 font-semibold block mt-1 flex items-center justify-center gap-1">
              <span>👆</span>
              <span>Toque para escolher</span>
            </span>
          </div>
        </div>
      `;
    }

    if (isShopping) {
      // ESTADO: PEÇA A COMPRAR (IMAGEM EXPANDIDA, BOTÃO OLHO ZOOM 4X, BOTÃO EFETUAR COMPRA)
      return `
        <div class="slot-item-card slot-shopping rounded-2xl p-3.5 flex flex-col justify-between items-center text-center shadow-2xs relative group min-h-[220px] cursor-pointer hover:border-sky-400 hover:shadow-md transition-all border border-sky-200 bg-white select-none" data-day-index="${dayIndex}" data-period-key="${periodKey}" data-item-index="${itIdx}" title="Clique no quadrado para trocar esta peça">
          <div class="w-full text-left mb-1 flex items-center justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[9px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                ${escapeHtml(slotName)}
              </span>
              <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1 shadow-2xs" title="Peça planejada para compra">
                <span>🛍️</span>
                <span>A Comprar</span>
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              ${imgUrl ? `
                <button type="button" class="btn-zoom-slot-item text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded p-1 text-xs transition no-print" data-img="${escapeHtml(imgUrl)}" data-title="${escapeHtml(item.tipo)}" data-slot="${escapeHtml(slotName)}" title="Ampliar imagem (Zoom 4x)">
                  <span>🔍</span>
                </button>
              ` : ''}
              <button type="button" class="btn-remove-slot-item text-slate-400 hover:text-rose-600 transition p-1 text-xs no-print" data-item-index="${itIdx}" title="Remover item do look">
                <span>🗑️</span>
              </button>
            </div>
          </div>

          <div class="w-full h-32 sm:h-36 flex items-center justify-center overflow-hidden my-1 bg-slate-50/70 rounded-xl p-1.5 border border-slate-100">
            ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.tipo)}" class="max-h-full max-w-full object-contain transition group-hover:scale-105 duration-200">` : `<span class="text-3xl">🛍️</span>`}
          </div>

          <div class="w-full my-1 space-y-1">
            <h5 class="text-xs font-bold text-slate-900 truncate" title="${escapeHtml(item.tipo)}">${escapeHtml(item.tipo)}</h5>
            <span class="text-[10px] text-sky-700 font-semibold block truncate">${escapeHtml(item.merchant || 'Loja')} • ${escapeHtml(item.price || 'R$ --')}</span>
            <button type="button" class="btn-buy-slot-item w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-2xs transition flex items-center justify-center gap-1 no-print" data-item-index="${itIdx}">
              <span>🛍️</span>
              <span>Efetuar Compra</span>
            </button>
            ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="text-[9px] text-brand-600 hover:underline block truncate mt-0.5 no-print" onclick="event.stopPropagation()">Ver na loja ↗</a>` : ''}
          </div>
        </div>
      `;
    }

    // ESTADO: PEÇA DO GUARDA-ROUPA (IMAGEM EXPANDIDA, BOTÃO OLHO ZOOM 4X, STATUS ILUSTRATIVO)
    const statusRoupa = (wardrobePiece ? wardrobePiece.status_roupa : item.status_roupa) || "Ok";
    const statusInfo = getPieceStatusInfo(statusRoupa);
    const isPending = statusRoupa !== "Ok";

    return `
      <div class="slot-item-card slot-wardrobe rounded-2xl p-3.5 flex flex-col justify-between items-center text-center shadow-2xs relative group min-h-[220px] cursor-pointer hover:border-brand-400 hover:shadow-md transition-all border ${isPending ? 'border-amber-300 ring-1 ring-amber-300 bg-amber-50/10' : 'border-slate-200 bg-white'} select-none" data-day-index="${dayIndex}" data-period-key="${periodKey}" data-item-index="${itIdx}" title="Clique no quadrado para trocar esta peça">
        <div class="w-full text-left mb-1 flex items-center justify-between">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              ${escapeHtml(slotName)}
            </span>
            <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} flex items-center gap-1 shadow-2xs" title="Status de conservação no roupeiro: ${statusInfo.description}">
              ${statusInfo.iconHtml}
              <span>${statusInfo.label}</span>
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            ${imgUrl ? `
              <button type="button" class="btn-zoom-slot-item text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded p-1 text-xs transition no-print" data-img="${escapeHtml(imgUrl)}" data-title="${escapeHtml(item.tipo)}" data-slot="${escapeHtml(slotName)}" title="Ampliar imagem (Zoom 4x)">
                <span>🔍</span>
              </button>
            ` : ''}
            <span class="text-[10px]" title="Peça do Meu Roupeiro">🚪</span>
            <button type="button" class="btn-remove-slot-item text-slate-400 hover:text-rose-600 transition p-1 text-xs no-print" data-item-index="${itIdx}" title="Remover item do look">
              <span>🗑️</span>
            </button>
          </div>
        </div>

        <div class="w-full h-32 sm:h-36 flex items-center justify-center overflow-hidden my-1 bg-slate-50/70 rounded-xl p-1.5 border border-slate-100">
          ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.tipo)}" class="max-h-full max-w-full object-contain transition group-hover:scale-105 duration-200">` : `<span class="text-3xl">👕</span>`}
        </div>

        <div class="w-full my-1">
          <h5 class="text-xs font-bold text-slate-900 truncate" title="${escapeHtml(item.tipo)}">${escapeHtml(item.tipo)}</h5>
          <span class="text-[10px] text-slate-500 block truncate">${escapeHtml(item.cor || '')}</span>
          ${wardrobePiece && wardrobePiece.is_generic ? `
            <span class="inline-block mt-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded" title="Item Básico">
              Básico (${wardrobePiece.quantidade || 1} un)
            </span>
          ` : ''}
          ${usage.isUsed ? `
            <span class="inline-block mt-1 text-[9px] font-bold ${usage.isExhausted ? 'text-rose-700 bg-rose-100' : 'text-amber-700 bg-amber-100'} px-1.5 py-0.5 rounded-full" title="Esta peça também está programada em outros períodos">
              ${usage.isExhausted ? `⛔ Esgotado (${usage.usedCount}/${usage.maxQty})` : `⚠️ Em uso (${usage.usedCount}x)`}
            </span>
          ` : ''}
          <span class="text-[9px] text-slate-400 group-hover:text-brand-600 transition block mt-0.5 font-medium">Toque para trocar</span>
        </div>
      </div>
    `;
  }

  // ==========================================
  // UNIFIED PICKER MODAL (WARDROBE vs SHOPPING)
  // ==========================================

  function openUnifiedPickerModal(dayIndex, periodKey, itemIndex, item) {
    activePickerContext = { dayIndex, periodKey, itemIndex, item };

    const day = currentTrip.days[dayIndex];
    const periodLabel = periodKey === "day_period" ? "Período Diurno" : "Período Noturno";

    pickerSlotBadge.textContent = item.slot_name || "Peça";
    pickerModalTitle.textContent = item.is_placeholder ? `Preencher ${item.slot_name || 'Peça'}` : `Trocar ${item.slot_name || 'Peça'}`;
    pickerModalSubtitle.textContent = `Dia ${day.day_number || (dayIndex + 1)} • ${periodLabel} — ${item.tipo || ''}`;

    // Default to Wardrobe tab unless it was already a shopping piece
    if (item.source_type === "shopping" || item.merchant) {
      switchPickerOption("shopping");
    } else {
      switchPickerOption("wardrobe");
    }

    // Pre-populate shopping query
    if (shoppingQueryInput) {
      shoppingQueryInput.value = item.shopping_query || `${item.tipo || ''} ${item.cor || ''}`.trim();
    }
    if (shoppingFilterColor) shoppingFilterColor.value = item.cor || "";

    renderWardrobePickerGrid();
    renderShoppingCatalogGrid();

    unifiedPiecePickerModal.classList.remove("hidden");
  }

  function closeUnifiedPickerModal() {
    unifiedPiecePickerModal.classList.add("hidden");
    activePickerContext = null;
  }

  function switchPickerOption(opt) {
    if (opt === "wardrobe") {
      tabBtnOptionWardrobe.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-white text-brand-700 shadow-sm border border-brand-200";
      tabBtnOptionShopping.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 border border-transparent";
      panelOptionWardrobe.classList.remove("hidden");
      panelOptionShopping.classList.add("hidden");
    } else {
      tabBtnOptionWardrobe.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 border border-transparent";
      tabBtnOptionShopping.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-white text-emerald-700 shadow-sm border border-emerald-200";
      panelOptionWardrobe.classList.add("hidden");
      panelOptionShopping.classList.remove("hidden");
    }
  }

  function switchShoppingSubtab(subtab) {
    [subtabBtnGoogleShopping, subtabBtnProductUrl, subtabBtnCatalog].forEach(b => {
      b.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 border border-transparent";
    });
    [subtabContentGoogleShopping, subtabContentProductUrl, subtabContentCatalog].forEach(c => c.classList.add("hidden"));

    if (subtab === "google") {
      subtabBtnGoogleShopping.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200";
      subtabContentGoogleShopping.classList.remove("hidden");
    } else if (subtab === "url") {
      subtabBtnProductUrl.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200";
      subtabContentProductUrl.classList.remove("hidden");
    } else if (subtab === "catalog") {
      subtabBtnCatalog.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200";
      subtabContentCatalog.classList.remove("hidden");
      renderShoppingCatalogGrid();
    }
  }

  // ==========================================
  // WARDROBE PICKER GRID WITH CROSS-USAGE
  // ==========================================

  function renderWardrobePickerGrid() {
    if (!wardrobePiecesGrid) return;
    const query = (wardrobeSearchInput?.value || "").toLowerCase().trim();
    const cat = wardrobeCategorySelect?.value || "all";

    const filtered = wardrobeItems.filter(item => {
      const matchCat = cat === "all" || item.categoria === cat;
      const matchText = !query ||
        (item.tipo && item.tipo.toLowerCase().includes(query)) ||
        (item.cor_predominante && item.cor_predominante.toLowerCase().includes(query)) ||
        (item.categoria && item.categoria.toLowerCase().includes(query));
      return matchCat && matchText;
    });

    if (!filtered.length) {
      wardrobePiecesGrid.innerHTML = `
        <div class="col-span-full py-12 text-center text-xs text-slate-400">
          Nenhuma peça encontrada com esses filtros.
        </div>
      `;
      return;
    }

    wardrobePiecesGrid.innerHTML = "";
    filtered.forEach(piece => {
      const pId = piece.id;
      const usage = findPieceUsageInTrip(pId);
      const isGeneric = Boolean(piece.is_generic) || (parseInt(piece.quantidade) > 1);
      const maxQty = parseInt(piece.quantidade) || 1;
      const isExhausted = usage.isExhausted;

      const card = document.createElement("div");
      card.className = `bg-white border rounded-2xl p-3 flex flex-col justify-between items-center text-center cursor-pointer transition shadow-2xs hover:shadow-md ${
        isExhausted ? 'border-rose-300 bg-rose-50/20 opacity-80' : (usage.isUsed ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 hover:border-brand-500')
      }`;

      const img = piece.cutout_url || piece.original_url;

      card.innerHTML = `
        <div class="w-20 h-20 flex items-center justify-center overflow-hidden mb-2">
          ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(piece.tipo)}" class="max-h-full max-w-full object-contain">` : `
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner border border-slate-200" style="background-color: ${escapeHtml(piece.cor_hex || '#e2e8f0')}20">
              <span class="text-2xl">👕</span>
            </div>
          `}
        </div>

        <div class="w-full">
          <h5 class="text-xs font-bold text-slate-900 truncate" title="${escapeHtml(piece.tipo)}">${escapeHtml(piece.tipo)}</h5>
          <p class="text-[10px] text-slate-500 truncate">${escapeHtml(piece.cor_predominante || "")}</p>
          <div class="flex items-center justify-center gap-1 mt-1 flex-wrap">
            <span class="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${escapeHtml(piece.categoria)}</span>
            ${isGeneric ? `
              <span class="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Qtd: ${maxQty}
              </span>
            ` : ''}
            ${piece.nao_repetir ? `
              <span class="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title="Não repetir em mais de um dia">
                1x/dia
              </span>
            ` : ''}
          </div>
          
          <!-- Cross-usage notice -->
          ${isExhausted ? `
            <div class="mt-1.5 text-[9px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-md text-left">
              ⛔ Esgotado: ${usage.usedCount}/${maxQty} un usadas (Não repetir)
            </div>
          ` : (usage.isUsed ? `
            <div class="mt-1.5 text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md text-left">
              ${isGeneric ? `ℹ️ Em uso: ${usage.usedCount}/${maxQty} un (Próximo: #${usage.nextUnitNumber})` : `⚠️ Em uso: Dia ${usage.dayNumber} (${usage.periodLabel})`}
            </div>
          ` : `
            <div class="mt-1.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              ✓ Disponível no Roupeiro
            </div>
          `)}
        </div>

        <button type="button" ${isExhausted ? 'disabled' : ''} class="mt-2 w-full py-1.5 ${isExhausted ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700'} text-xs font-bold rounded-xl transition">
          ${isExhausted ? 'Esgotado (Não repetir)' : (isGeneric ? `Escolher #${usage.nextUnitNumber}` : (usage.isUsed ? 'Reutilizar Peça' : 'Escolher Peça'))}
        </button>
      `;

      if (!isExhausted) {
        card.addEventListener("click", () => handleSelectWardrobePiece(piece));
      }
      wardrobePiecesGrid.appendChild(card);
    });
  }

  async function handleSelectWardrobePiece(piece) {
    if (!activePickerContext || !currentTrip) return;
    const { dayIndex, periodKey, itemIndex, item } = activePickerContext;

    const usage = findPieceUsageInTrip(piece.id, dayIndex, periodKey, itemIndex);
    if (usage.isExhausted) {
      alert(`Esta peça (${piece.tipo}) tem quantidade máxima ${usage.maxQty} e está marcada com "Não repetir em mais de um dia". Não há unidades restantes disponíveis.`);
      return;
    }

    // Update the slot item
    const targetSlot = currentTrip.days[dayIndex][periodKey].look.items[itemIndex];
    targetSlot.is_placeholder = false;
    targetSlot.source_type = "wardrobe";
    targetSlot.item_id = piece.id;
    targetSlot.shopping_id = null;
    targetSlot.shopping_item_id = null;
    targetSlot.merchant = null;
    targetSlot.price = null;
    targetSlot.link = null;
    targetSlot.thumbnail = null;

    // Clean base name and assign sequential number for generic or multi-quantity piece
    const baseTipo = (piece.tipo || "").replace(/\s*#\d+(\s*\(.*\))?$/, "").trim();
    if (piece.is_generic || piece.quantidade > 1) {
      targetSlot.unit_number = usage.nextUnitNumber;
      targetSlot.tipo = `${baseTipo} #${usage.nextUnitNumber}`;
    } else {
      targetSlot.unit_number = 1;
      targetSlot.tipo = baseTipo || piece.tipo;
    }

    targetSlot.categoria = piece.categoria;
    targetSlot.cor = piece.cor_predominante;
    targetSlot.original_url = piece.original_url;
    targetSlot.cutout_url = piece.cutout_url;

    const periodLook = currentTrip.days[dayIndex][periodKey].look;
    if (periodLook && Array.isArray(periodLook.items)) {
      periodLook.item_ids = periodLook.items
        .filter(i => i.source_type !== "shopping" && i.item_id)
        .map(i => i.item_id);
    }

    // Save trip to backend
    await saveCurrentTrip();
    closeUnifiedPickerModal();
    renderTripAccordion();
  }

  // ==========================================
  // SHOPPING SEARCH & URL EXTRACTION
  // ==========================================

  async function handleExecuteShoppingSearch() {
    const q = shoppingQueryInput.value.trim();
    if (!q) {
      alert("Informe o termo para busca no Google Shopping.");
      return;
    }

    shoppingLoadingSpinner.classList.remove("hidden");
    shoppingResultsGrid.innerHTML = "";

    try {
      const resp = await authFetch("/api/shopping/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          color: shoppingFilterColor.value.trim() || null,
          material: shoppingFilterMaterial.value.trim() || null,
          max_price: parseFloat(shoppingFilterMaxPrice.value) || null
        })
      });

      if (!resp.ok) throw new Error("Erro na busca do Google Shopping.");
      const data = await resp.json();
      const products = data.products || [];

      renderShoppingResults(products);
    } catch (err) {
      console.error("Shopping search error:", err);
      shoppingResultsGrid.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-red-500">
          Não foi possível concluir a busca. Tente outro termo ou insira o link direto do produto.
        </div>
      `;
    } finally {
      shoppingLoadingSpinner.classList.add("hidden");
    }
  }

  function renderShoppingResults(products) {
    if (!products.length) {
      shoppingResultsGrid.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-slate-400">
          Nenhum produto encontrado. Tente termos mais amplos ou use a aba de link direto.
        </div>
      `;
      return;
    }

    shoppingResultsGrid.innerHTML = "";
    products.forEach(prod => {
      const card = document.createElement("div");
      card.className = "bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-3 flex flex-col justify-between items-center text-center shadow-2xs hover:shadow-md transition";

      card.innerHTML = `
        <div class="w-24 h-24 flex items-center justify-center overflow-hidden mb-2">
          <img src="${escapeHtml(prod.thumbnail)}" alt="${escapeHtml(prod.title)}" class="max-h-full max-w-full object-contain">
        </div>

        <div class="w-full">
          <h5 class="text-xs font-bold text-slate-900 line-clamp-2" title="${escapeHtml(prod.title)}">${escapeHtml(prod.title)}</h5>
          <div class="mt-1 flex items-center justify-between text-[10px]">
            <span class="font-extrabold text-emerald-600">${escapeHtml(prod.price || 'R$ --')}</span>
            <span class="text-slate-500 font-semibold">${escapeHtml(prod.merchant || 'Loja')}</span>
          </div>
          ${prod.link ? `<a href="${escapeHtml(prod.link)}" target="_blank" rel="noopener noreferrer" class="text-[9px] text-brand-600 hover:underline block truncate mt-1">Ver na loja ↗</a>` : ''}
        </div>

        <button type="button" class="btn-choose-buy-product mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition">
          🛍️ Escolher para Compra
        </button>
      `;

      card.querySelector(".btn-choose-buy-product").addEventListener("click", () => handleSelectShoppingProduct(prod));
      shoppingResultsGrid.appendChild(card);
    });
  }

  async function handleExtractProductFromUrl() {
    const rawUrl = manualProductUrlInput.value.trim();
    if (!rawUrl) {
      alert("Por favor, cole o link completo do produto.");
      return;
    }

    urlExtractLoadingSpinner.classList.remove("hidden");
    urlExtractResultContainer.innerHTML = "";

    try {
      const resp = await authFetch("/api/shopping/extract-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rawUrl })
      });

      if (!resp.ok) throw new Error("Não foi possível extrair dados desta URL.");
      const data = await resp.json();
      const prod = data.product;

      urlExtractResultContainer.innerHTML = `
        <div class="bg-white border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div class="flex items-center gap-3">
            <img src="${escapeHtml(prod.thumbnail)}" alt="${escapeHtml(prod.title)}" class="w-16 h-16 object-contain rounded-xl border border-slate-200">
            <div>
              <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">${escapeHtml(prod.merchant || 'Loja')}</span>
              <h5 class="text-xs font-bold text-slate-900 mt-1">${escapeHtml(prod.title)}</h5>
              <span class="text-xs font-extrabold text-emerald-600">${escapeHtml(prod.price || 'R$ --')}</span>
            </div>
          </div>
          <button type="button" id="btnConfirmExtractedProduct" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition">
            🛍️ Escolher para Compra
          </button>
        </div>
      `;

      urlExtractResultContainer.querySelector("#btnConfirmExtractedProduct").addEventListener("click", () => handleSelectShoppingProduct(prod));
    } catch (err) {
      urlExtractResultContainer.innerHTML = `
        <div class="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center">
          ${escapeHtml(err.message)}
        </div>
      `;
    } finally {
      urlExtractLoadingSpinner.classList.add("hidden");
    }
  }

  async function handleSelectShoppingProduct(prod) {
    if (!activePickerContext || !currentTrip) return;
    const { dayIndex, periodKey, itemIndex, item } = activePickerContext;

    // 1. Add to User Shopping Catalog in Firestore
    let savedCatalogItem = null;
    try {
      const resp = await authFetch("/api/shopping/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prod.title,
          category: item.categoria || "Outros",
          color: prod.color || item.cor || "",
          price: prod.price || "",
          merchant: prod.merchant || "",
          link: prod.link || "",
          thumbnail: prod.thumbnail || "",
          purchased: false,
          notes: `Planejado para ${currentTrip.destination} (Dia ${dayIndex + 1})`
        })
      });

      if (resp.ok) {
        savedCatalogItem = await resp.json();
        userShoppingCatalog.unshift(savedCatalogItem);
      }
    } catch (e) {
      console.warn("Could not save to shopping catalog:", e);
    }

    // 2. Assign to the look slot
    const targetSlot = currentTrip.days[dayIndex][periodKey].look.items[itemIndex];
    targetSlot.is_placeholder = false;
    targetSlot.source_type = "shopping";
    targetSlot.item_id = null;
    targetSlot.cutout_url = null;
    targetSlot.unit_number = null;
    targetSlot.shopping_id = savedCatalogItem ? savedCatalogItem.id : null;
    targetSlot.tipo = prod.title;
    targetSlot.categoria = item.categoria || "Outros";
    targetSlot.merchant = prod.merchant || "Loja";
    targetSlot.price = prod.price || "";
    targetSlot.link = prod.link || "";
    targetSlot.original_url = prod.thumbnail || "";
    targetSlot.thumbnail = prod.thumbnail || "";

    const periodLook = currentTrip.days[dayIndex][periodKey].look;
    if (periodLook && Array.isArray(periodLook.items)) {
      periodLook.item_ids = periodLook.items
        .filter(i => i.source_type !== "shopping" && i.item_id)
        .map(i => i.item_id);
    }

    await saveCurrentTrip();
    closeUnifiedPickerModal();
    renderTripAccordion();
  }

  // Render Saved Shopping Catalog Grid (Reutilização — apenas peças a comprar vinculadas aos looks da viagem atual)
  function renderShoppingCatalogGrid() {
    if (!userShoppingCatalogGrid) return;

    const { shoppingItems } = collectMalaItems();

    if (!shoppingItems.length) {
      userShoppingCatalogGrid.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
          Nenhuma peça a comprar associada aos looks desta viagem no momento.
        </div>
      `;
      return;
    }

    const storageKey = `mala_packed_${currentTrip?.id || 'default'}`;
    let packedMap = {};
    try {
      packedMap = JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (e) {
      packedMap = {};
    }

    userShoppingCatalogGrid.innerHTML = "";
    shoppingItems.forEach(({ item: lookShopItem, usages }) => {
      const catalogMatch = lookShopItem.shopping_id
        ? userShoppingCatalog.find(c => c.id === lookShopItem.shopping_id)
        : null;

      const sKey = lookShopItem.shopping_id ? `shop_${lookShopItem.shopping_id}` : `shop_${lookShopItem.tipo}`;
      const isPurchased = catalogMatch ? !!catalogMatch.purchased : !!packedMap[sKey];

      const catItem = {
        id: lookShopItem.shopping_id || (catalogMatch ? catalogMatch.id : null),
        title: lookShopItem.tipo || catalogMatch?.title || "Peça a Comprar",
        category: lookShopItem.categoria || catalogMatch?.category || "Outros",
        merchant: lookShopItem.merchant || catalogMatch?.merchant || "Loja",
        price: lookShopItem.price || catalogMatch?.price || "",
        link: lookShopItem.link || catalogMatch?.link || "",
        thumbnail: lookShopItem.original_url || lookShopItem.thumbnail || catalogMatch?.thumbnail || "",
        purchased: isPurchased
      };

      const usageLabels = (usages || []).map(u => `Dia ${u.dayNum} (${u.periodLabel})`).join(", ");

      const card = document.createElement("div");
      card.className = "bg-white border border-slate-200 hover:border-blue-500 rounded-2xl p-3 flex flex-col justify-between items-center text-center shadow-2xs transition";

      card.innerHTML = `
        <div class="w-20 h-20 flex items-center justify-center overflow-hidden mb-2">
          ${catItem.thumbnail ? `<img src="${escapeHtml(catItem.thumbnail)}" alt="${escapeHtml(catItem.title)}" class="max-h-full max-w-full object-contain">` : `<span class="text-3xl">🛍️</span>`}
        </div>

        <div class="w-full mb-2">
          <h5 class="text-xs font-bold text-slate-900 truncate" title="${escapeHtml(catItem.title)}">${escapeHtml(catItem.title)}</h5>
          <span class="text-[10px] text-slate-500 block truncate">${escapeHtml(catItem.merchant || 'Loja')} • ${escapeHtml(catItem.price || 'Sob consulta')}</span>
          ${usageLabels ? `<span class="text-[9px] text-sky-700 font-semibold block truncate mt-0.5" title="${escapeHtml(usageLabels)}">🗓️ ${escapeHtml(usageLabels)}</span>` : ''}
        </div>

        <div class="w-full space-y-1.5">
          <button type="button" class="btn-buy-catalog-item w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs">
            <span>🛍️</span>
            <span>Efetuar Compra</span>
          </button>

          <button type="button" class="btn-desistir-catalog-item w-full py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-xs font-bold rounded-xl transition border border-rose-200 flex items-center justify-center gap-1">
            <span>🗑️</span>
            <span>Desistir</span>
          </button>

          <button type="button" class="btn-reuse-shopping-item w-full py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold rounded-xl transition">
            Reutilizar no Look
          </button>
        </div>
      `;

      card.querySelector(".btn-reuse-shopping-item").addEventListener("click", () => handleReuseShoppingCatalogItem(catItem));
      card.querySelector(".btn-desistir-catalog-item").addEventListener("click", () => handleDesistirShoppingPiece({
        tipo: catItem.title,
        shopping_id: catItem.id
      }));
      card.querySelector(".btn-buy-catalog-item").addEventListener("click", () => {
        openPurchasePieceModal({
          tipo: catItem.title,
          categoria: catItem.category,
          price: catItem.price,
          merchant: catItem.merchant,
          original_url: catItem.thumbnail,
          shopping_id: catItem.id
        });
      });

      userShoppingCatalogGrid.appendChild(card);
    });
  }

  async function handleDesistirShoppingPiece(itemData) {
    if (!itemData) return;
    const title = itemData.tipo || itemData.title || "esta peça";
    if (!confirm(`Deseja desistir de comprar "${title}"?\nA peça será removida da lista de compras e de todas as viagens.`)) {
      return;
    }

    try {
      const resp = await authFetch("/api/shopping/desistir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopping_id: itemData.shopping_id || itemData.id || null,
          title: title,
          trip_id: currentTrip?.id || null
        })
      });

      const targetShopId = itemData.shopping_id || itemData.id || null;
      const targetTitleLower = title.trim().toLowerCase();

      userShoppingCatalog = userShoppingCatalog.filter(c => {
        if (targetShopId && c.id === targetShopId) return false;
        if (targetTitleLower && (c.title || "").trim().toLowerCase() === targetTitleLower) return false;
        return true;
      });

      if (currentTrip && Array.isArray(currentTrip.days)) {
        currentTrip.days.forEach(day => {
          ["day_period", "night_period"].forEach(periodKey => {
            const look = day[periodKey]?.look;
            if (!look || !Array.isArray(look.items)) return;
            look.items = look.items.filter(slot => {
              const isShopping = slot.source_type === "shopping" || !!slot.merchant || !!slot.shopping_id;
              if (!isShopping) return true;
              const matchesId = !!(targetShopId && slot.shopping_id === targetShopId);
              const matchesTitle = !!(targetTitleLower && (slot.tipo || "").trim().toLowerCase() === targetTitleLower);
              return !(matchesId || matchesTitle);
            });
            look.item_ids = look.items
              .filter(i => i.source_type !== "shopping" && i.item_id)
              .map(i => i.item_id);
          });
        });
      }

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (data.trip) {
          currentTrip = data.trip;
        }
      } else {
        await saveCurrentTrip();
      }

      updateTripPendingBadges();
      renderTripAccordion();
      renderMalaView();
      renderShoppingCatalogGrid();
    } catch (err) {
      console.error("Erro ao desistir de comprar peça:", err);
      alert("Erro ao remover peça da lista de compras.");
    }
  }

  async function handleReuseShoppingCatalogItem(catItem) {
    if (!activePickerContext || !currentTrip) return;
    const { dayIndex, periodKey, itemIndex, item } = activePickerContext;

    const targetSlot = currentTrip.days[dayIndex][periodKey].look.items[itemIndex];
    targetSlot.is_placeholder = false;
    targetSlot.source_type = "shopping";
    targetSlot.item_id = null;
    targetSlot.cutout_url = null;
    targetSlot.unit_number = null;
    targetSlot.shopping_id = catItem.id;
    targetSlot.tipo = catItem.title;
    targetSlot.categoria = catItem.category || item.categoria || "Outros";
    targetSlot.merchant = catItem.merchant || "Loja";
    targetSlot.price = catItem.price || "";
    targetSlot.link = catItem.link || "";
    targetSlot.original_url = catItem.thumbnail || "";
    targetSlot.thumbnail = catItem.thumbnail || "";

    const periodLook = currentTrip.days[dayIndex][periodKey].look;
    if (periodLook && Array.isArray(periodLook.items)) {
      periodLook.item_ids = periodLook.items
        .filter(i => i.source_type !== "shopping" && i.item_id)
        .map(i => i.item_id);
    }

    await saveCurrentTrip();
    closeUnifiedPickerModal();
    renderTripAccordion();
  }

  // ==========================================
  // SWAP PERIOD MODAL (TROCAR PERÍODOS DE DIA)
  // ==========================================

  function openSwapPeriodModal(sourceDayIndex, sourcePeriodKey) {
    if (!currentTrip || !currentTrip.days) return;
    activeSwapContext = { sourceDayIndex, sourcePeriodKey };

    const sourceDay = currentTrip.days[sourceDayIndex];
    const sourcePeriod = sourceDay[sourcePeriodKey] || { locations: [], look: {} };
    const sourcePeriodName = sourcePeriodKey === "day_period" ? "Período Diurno" : "Período Noturno";
    const sourceDayNum = sourceDay.day_number || (sourceDayIndex + 1);

    if (swapSourcePeriodTitle) {
      swapSourcePeriodTitle.innerHTML = `
        <span class="w-6 h-6 rounded-lg bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center">
          D${sourceDayNum}
        </span>
        <span>Dia ${sourceDayNum} (${formatDateBR(sourceDay.date)}) • ${sourcePeriodName}</span>
      `;
    }

    const locCount = (sourcePeriod.locations || []).length;
    const itemsCount = (sourcePeriod.look?.items || []).length;
    if (swapSourcePeriodSummary) {
      swapSourcePeriodSummary.textContent = `${locCount} ${locCount === 1 ? 'local' : 'locais'} planejados • Look com ${itemsCount} peças`;
    }

    // Populate Target Selector with other days
    if (swapTargetDaySelect) {
      swapTargetDaySelect.innerHTML = "";
      currentTrip.days.forEach((d, dIdx) => {
        if (dIdx === sourceDayIndex) return; // Don't swap with same day
        const dNum = d.day_number || (dIdx + 1);
        const dDate = formatDateBR(d.date);

        // Only corresponding period allowed (diurno com diurno, noturno com noturno)
        const optCorr = document.createElement("option");
        optCorr.value = `${dIdx}_${sourcePeriodKey}`;
        const targetPeriod = d[sourcePeriodKey] || { locations: [], look: {} };
        const tLocCount = (targetPeriod.locations || []).length;
        optCorr.textContent = `Dia ${dNum} (${dDate}) — ${sourcePeriodName} (${tLocCount} locais)`;
        swapTargetDaySelect.appendChild(optCorr);
      });

      // Update preview on select change
      swapTargetDaySelect.onchange = updateSwapPreview;
      updateSwapPreview();
    }

    if (swapPeriodModal) swapPeriodModal.classList.remove("hidden");
  }

  function updateSwapPreview() {
    if (!activeSwapContext || !swapPreviewBox || !swapTargetDaySelect) return;
    const { sourceDayIndex, sourcePeriodKey } = activeSwapContext;
    if (!swapTargetDaySelect.value) return;
    const [tDayStr, tPeriodKey] = swapTargetDaySelect.value.split("_");
    const targetDayIndex = parseInt(tDayStr, 10);

    const sourceDay = currentTrip.days[sourceDayIndex];
    const targetDay = currentTrip.days[targetDayIndex];
    if (!sourceDay || !targetDay) return;

    const sDayNum = sourceDay.day_number || (sourceDayIndex + 1);
    const tDayNum = targetDay.day_number || (targetDayIndex + 1);
    const sPeriodName = sourcePeriodKey === "day_period" ? "Diurno" : "Noturno";
    const tPeriodName = tPeriodKey === "day_period" ? "Diurno" : "Noturno";

    swapPreviewBox.innerHTML = `
      <div class="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200 pb-1.5 mb-1.5">
        <span>Resultado da Troca:</span>
        <span>🔄</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div class="bg-white/80 p-2 rounded-xl border border-amber-200">
          <span class="text-[10px] text-slate-500 font-semibold block">Dia ${sDayNum} (${sPeriodName}) receberá:</span>
          <p class="font-bold text-slate-900 mt-0.5">Locais & Look do Dia ${tDayNum} (${tPeriodName})</p>
        </div>
        <div class="bg-white/80 p-2 rounded-xl border border-amber-200">
          <span class="text-[10px] text-slate-500 font-semibold block">Dia ${tDayNum} (${tPeriodName}) receberá:</span>
          <p class="font-bold text-slate-900 mt-0.5">Locais & Look do Dia ${sDayNum} (${sPeriodName})</p>
        </div>
      </div>
    `;
  }

  function closeSwapPeriodModal() {
    if (swapPeriodModal) swapPeriodModal.classList.add("hidden");
    activeSwapContext = null;
  }

  async function handleConfirmSwapPeriod() {
    if (!activeSwapContext || !currentTrip) return;
    const { sourceDayIndex, sourcePeriodKey } = activeSwapContext;
    if (!swapTargetDaySelect || !swapTargetDaySelect.value) return;

    const [tDayStr, targetPeriodKey] = swapTargetDaySelect.value.split("_");
    const targetDayIndex = parseInt(tDayStr, 10);

    const sourceDay = currentTrip.days[sourceDayIndex];
    const targetDay = currentTrip.days[targetDayIndex];
    if (!sourceDay || !targetDay) return;

    if (!sourceDay[sourcePeriodKey]) {
      sourceDay[sourcePeriodKey] = { has_activity: true, locations: [], look: { items: [] } };
    }
    if (!targetDay[targetPeriodKey]) {
      targetDay[targetPeriodKey] = { has_activity: true, locations: [], look: { items: [] } };
    }

    btnConfirmSwapPeriod.disabled = true;
    btnConfirmSwapPeriod.innerHTML = `<span class="animate-spin">⏳</span><span>Trocando...</span>`;

    try {
      // Swap period content: locations and look move together as requested
      const tempSource = {
        has_activity: sourceDay[sourcePeriodKey].has_activity,
        locations: JSON.parse(JSON.stringify(sourceDay[sourcePeriodKey].locations || [])),
        look: JSON.parse(JSON.stringify(sourceDay[sourcePeriodKey].look || {}))
      };

      sourceDay[sourcePeriodKey].has_activity = targetDay[targetPeriodKey].has_activity;
      sourceDay[sourcePeriodKey].locations = JSON.parse(JSON.stringify(targetDay[targetPeriodKey].locations || []));
      sourceDay[sourcePeriodKey].look = JSON.parse(JSON.stringify(targetDay[targetPeriodKey].look || {}));

      targetDay[targetPeriodKey].has_activity = tempSource.has_activity;
      targetDay[targetPeriodKey].locations = tempSource.locations;
      targetDay[targetPeriodKey].look = tempSource.look;

      // Save updated trip to Firestore
      await saveCurrentTrip();
      closeSwapPeriodModal();
      renderTripAccordion();
    } catch (err) {
      console.error("Error swapping periods:", err);
      alert("Erro ao trocar períodos: " + err.message);
    } finally {
      btnConfirmSwapPeriod.disabled = false;
      btnConfirmSwapPeriod.innerHTML = `<span>🔄</span><span>Confirmar Troca</span>`;
    }
  }

  // ==========================================
  // LOCATION MANAGEMENT MODAL (ADD & EDIT)
  // ==========================================

  function openLocationModal(dayIndex, periodKey, locIndex = null) {
    if (!locationModal || !currentTrip || !currentTrip.days) return;
    const day = currentTrip.days[dayIndex];
    if (!day) return;
    const period = day[periodKey];
    if (!period) return;
    const dayNum = day.day_number || (dayIndex + 1);
    const periodName = periodKey === "day_period" ? "Período Diurno" : "Período Noturno";

    if (locFormDayIndex) locFormDayIndex.value = dayIndex;
    if (locFormPeriodKey) locFormPeriodKey.value = periodKey;
    if (locFormLocIndex) locFormLocIndex.value = (locIndex !== null && locIndex !== undefined) ? locIndex : "-1";

    if (locationModalSubtitle) {
      locationModalSubtitle.textContent = `Dia ${dayNum} (${formatDateBR(day.date)}) • ${periodName}`;
    }

    if (locIndex !== null && locIndex !== undefined && period.locations && period.locations[locIndex]) {
      // Editing existing location
      const loc = period.locations[locIndex];
      if (locationModalTitle) locationModalTitle.textContent = "Editar Local";
      let sTime = loc.start_time || "";
      let eTime = loc.end_time || "";
      if (!sTime && loc.time && loc.time.includes("-")) {
        const parts = loc.time.split("-");
        sTime = (parts[0] || "").trim();
        eTime = (parts[1] || "").trim();
      }
      if (locFormStartTime) locFormStartTime.value = sTime || (periodKey === "night_period" ? "19:30" : "10:00");
      if (locFormEndTime) locFormEndTime.value = eTime || (periodKey === "night_period" ? "22:00" : "12:30");
      if (locFormName) locFormName.value = loc.name || "";
      if (locFormDescription) locFormDescription.value = loc.description || "";
      if (locFormStyle) locFormStyle.value = loc.style || "Casual";
      if (locFormTravelTime) locFormTravelTime.value = loc.travel_time || "20 min de trajeto";
    } else {
      // Adding new location
      if (locationModalTitle) locationModalTitle.textContent = "Adicionar Local";
      if (locFormStartTime) locFormStartTime.value = periodKey === "night_period" ? "20:00" : "14:00";
      if (locFormEndTime) locFormEndTime.value = periodKey === "night_period" ? "22:30" : "16:30";
      if (locFormName) locFormName.value = "";
      if (locFormDescription) locFormDescription.value = "";
      if (locFormStyle) locFormStyle.value = "Casual";
      if (locFormTravelTime) locFormTravelTime.value = "20 min de trajeto";
    }

    locationModal.classList.remove("hidden");
    locFormName?.focus();
  }

  function closeLocationModal() {
    locationModal?.classList.add("hidden");
  }

  function handleDeleteLocation(dayIndex, periodKey, locIndex) {
    if (!currentTrip || !currentTrip.days) return;
    const period = currentTrip.days[dayIndex]?.[periodKey];
    if (!period || !period.locations || !period.locations[locIndex]) return;
    const loc = period.locations[locIndex];

    if (confirm(`Deseja remover o local "${loc.name}" deste período?`)) {
      period.locations.splice(locIndex, 1);
      saveCurrentTrip().then(() => {
        renderTripAccordion();
      });
    }
  }

  locationForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dIdx = parseInt(locFormDayIndex?.value, 10);
    const pKey = locFormPeriodKey?.value;
    const lIdxStr = locFormLocIndex?.value;
    const isEdit = (lIdxStr !== "" && lIdxStr !== "-1");
    const lIdx = isEdit ? parseInt(lIdxStr, 10) : -1;

    const startTime = (locFormStartTime?.value || "").trim();
    const endTime = (locFormEndTime?.value || "").trim();
    const name = (locFormName?.value || "").trim();
    const description = (locFormDescription?.value || "").trim();
    const style = (locFormStyle?.value || "Casual").trim();
    const travelTime = (locFormTravelTime?.value || "Trajeto livre").trim();

    if (!name || !startTime || !endTime) {
      alert("Por favor, preencha o nome do local e os horários de início e término.");
      return;
    }

    const timeStr = `${startTime} - ${endTime}`;
    const period = currentTrip.days[dIdx]?.[pKey];
    if (!period) return;
    if (!period.locations) period.locations = [];

    if (isEdit) {
      const loc = period.locations[lIdx];
      if (loc) {
        loc.name = name;
        loc.time = timeStr;
        loc.start_time = startTime;
        loc.end_time = endTime;
        loc.description = description;
        loc.style = style;
        loc.travel_time = travelTime;
      }
    } else {
      const newLoc = {
        id: `loc_${dIdx + 1}_${Date.now()}`,
        name,
        time: timeStr,
        start_time: startTime,
        end_time: endTime,
        description,
        style: style || "Casual",
        travel_time: travelTime || "Deslocamento livre"
      };
      period.locations.push(newLoc);
    }

    closeLocationModal();
    await saveCurrentTrip();
    renderTripAccordion();
  });

  // ==========================================
  // AI LOOK EDIT & SPEECH RECOGNITION
  // ==========================================

  function initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      speechRecognition = new SpeechRec();
      speechRecognition.continuous = false;
      speechRecognition.interimResults = true;
      speechRecognition.lang = "pt-BR";

      speechRecognition.onstart = () => {
        isRecordingVoice = true;
        if (voicePromptStatusText) voicePromptStatusText.textContent = "Ouvindo... Fale agora";
        if (voicePromptBtn) voicePromptBtn.classList.add("bg-red-100", "text-red-700", "animate-pulse");
        if (voiceMicIcon) voiceMicIcon.classList.add("text-red-600");
      };

      speechRecognition.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
        if (aiPromptInput) aiPromptInput.value = transcript;
      };

      speechRecognition.onerror = () => stopVoiceRecognition();
      speechRecognition.onend = () => stopVoiceRecognition();
    }
  }

  function toggleVoiceRecognition() {
    if (!speechRecognition) {
      alert("Reconhecimento de voz não suportado neste navegador. Digite sua instrução no campo de texto.");
      if (aiPromptInput) aiPromptInput.focus();
      return;
    }
    if (isRecordingVoice) {
      speechRecognition.stop();
    } else {
      try {
        speechRecognition.start();
      } catch (e) {
        stopVoiceRecognition();
      }
    }
  }

  function stopVoiceRecognition() {
    isRecordingVoice = false;
    if (voicePromptStatusText) voicePromptStatusText.textContent = "Falar por voz";
    if (voicePromptBtn) voicePromptBtn.classList.remove("bg-red-100", "text-red-700", "animate-pulse");
    if (voiceMicIcon) voiceMicIcon.classList.remove("text-red-600");
  }

  function openEditLookAiModal(dayIndex, periodKey) {
    activeAiLookContext = { dayIndex, periodKey };
    const day = currentTrip.days[dayIndex];
    const period = day[periodKey];
    const periodLabel = periodKey === "day_period" ? "Período Diurno" : "Período Noturno";

    editLookContextSubtitle.textContent = `Dia ${day.day_number || (dayIndex + 1)} • ${periodLabel}`;

    const weather = day.weather ? (periodKey === "day_period" ? day.weather.day : day.weather.night) : null;
    const locNames = (period.locations || []).map(l => l.name).join(", ") || "Passeio livre";

    editLookContextChip.innerHTML = `
      <div class="flex items-center justify-between text-slate-600">
        <span><strong>Destino:</strong> ${escapeHtml(currentTrip.destination)}</span>
        <span><strong>Clima:</strong> ${weather ? `${escapeHtml(weather.temp_c)} (${escapeHtml(weather.condition)})` : "Ameno"}</span>
      </div>
      <div class="text-slate-600 truncate"><strong>Locais:</strong> ${escapeHtml(locNames)}</div>
      <div class="text-brand-700 truncate"><strong>Look Atual:</strong> ${escapeHtml(period.look?.title || "Atual")}</div>
    `;

    if (aiPromptInput) aiPromptInput.value = "";
    stopVoiceRecognition();
    editLookAiModal.classList.remove("hidden");
    if (aiPromptInput) aiPromptInput.focus();
  }

  function closeEditLookAiModal() {
    stopVoiceRecognition();
    editLookAiModal.classList.add("hidden");
    activeAiLookContext = null;
  }

  async function handleExecuteLookAiRegeneration() {
    if (!activeAiLookContext || !currentTrip) return;
    const promptText = aiPromptInput.value.trim();
    if (!promptText) {
      alert("Por favor, digite ou fale como gostaria de ajustar o visual.");
      return;
    }

    stopVoiceRecognition();
    editLookLoadingOverlay.classList.remove("hidden");

    const { dayIndex, periodKey } = activeAiLookContext;
    const day = currentTrip.days[dayIndex];
    const period = day[periodKey];
    const weather = day.weather ? (periodKey === "day_period" ? day.weather.day : day.weather.night) : {};

    try {
      const resp = await authFetch("/api/trips/regenerate-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: currentTrip.id,
          day_number: day.day_number || (dayIndex + 1),
          period_name: periodKey === "day_period" ? "Dia" : "Noite",
          destination: currentTrip.destination,
          weather: weather || {},
          locations: period.locations || [],
          current_look: period.look || {},
          user_prompt: promptText
        })
      });

      if (!resp.ok) throw new Error("Falha ao recriar look com Gemini.");
      const newLook = await resp.json();
      currentTrip.days[dayIndex][periodKey].look = newLook;

      await saveCurrentTrip();
      closeEditLookAiModal();
      renderTripAccordion();
    } catch (err) {
      console.error("AI look regen error:", err);
      alert(`Erro ao ajustar look: ${err.message}`);
    } finally {
      editLookLoadingOverlay.classList.add("hidden");
    }
  }

  // ==========================================
  // VIEW SWITCHER: ROTEIRO & LOOKS vs VISÃO DA MALA
  // (Requisito: Visão da Mala inspirada no Roupeiro)
  // ==========================================

  async function switchView(viewName) {
    currentActiveView = viewName;
    if (viewName === "mala") {
      tabBtnMala?.classList.add("bg-white", "text-slate-900", "shadow-sm", "border", "border-slate-200/60");
      tabBtnMala?.classList.remove("text-slate-600");
      tabBtnRoteiro?.classList.remove("bg-white", "text-slate-900", "shadow-sm", "border", "border-slate-200/60");
      tabBtnRoteiro?.classList.add("text-slate-600");
      roteiroViewContainer?.classList.add("hidden");
      malaViewContainer?.classList.remove("hidden");
      await refreshWardrobeItems();
      renderMalaView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      tabBtnRoteiro?.classList.add("bg-white", "text-slate-900", "shadow-sm", "border", "border-slate-200/60");
      tabBtnRoteiro?.classList.remove("text-slate-600");
      tabBtnMala?.classList.remove("bg-white", "text-slate-900", "shadow-sm", "border", "border-slate-200/60");
      tabBtnMala?.classList.add("text-slate-600");
      malaViewContainer?.classList.add("hidden");
      roteiroViewContainer?.classList.remove("hidden");
      await refreshWardrobeItems();
      renderTripAccordion();
    }
  }

  async function refreshWardrobeItems() {
    try {
      const resp = await authFetch("/api/clothes");
      if (resp.ok) {
        const data = await resp.json();
        wardrobeItems = data.items || [];
      }
    } catch (e) {
      console.warn("Could not reload wardrobe items:", e);
    }
  }

  // Piece Status Configuration Helper (Requisito: Status Ok, Passar, Lavar, Lavanderia, Emprestada, Achar com ícones ilustrativos)
  function getPieceStatusInfo(status) {
    switch (status) {
      case "Passar":
        return {
          label: "Passar",
          description: "Passar a ferro",
          iconHtml: `<span>♨️</span>`,
          bg: "bg-amber-50",
          text: "text-amber-800",
          border: "border-amber-300",
          dot: "bg-amber-500",
          badge: "bg-amber-100 text-amber-800 border-amber-300"
        };
      case "Lavar":
        return {
          label: "Lavar",
          description: "Lavar na máquina / cesto",
          iconHtml: `<span>🫧</span>`,
          bg: "bg-sky-50",
          text: "text-sky-800",
          border: "border-sky-300",
          dot: "bg-sky-500",
          badge: "bg-sky-100 text-sky-800 border-sky-300"
        };
      case "Lavanderia":
        return {
          label: "Lavanderia",
          description: "Lavanderia a seco / externa",
          iconHtml: `<span>🧼</span>`,
          bg: "bg-blue-50",
          text: "text-blue-800",
          border: "border-blue-300",
          dot: "bg-blue-500",
          badge: "bg-blue-100 text-blue-800 border-blue-300"
        };
      case "Emprestada":
        return {
          label: "Emprestada",
          description: "Emprestada a alguém",
          iconHtml: `<span>🤝</span>`,
          bg: "bg-orange-50",
          text: "text-orange-800",
          border: "border-orange-300",
          dot: "bg-orange-500",
          badge: "bg-orange-100 text-orange-800 border-orange-300"
        };
      case "Achar":
        return {
          label: "Achar",
          description: "Localizar / procurar peça",
          iconHtml: `<span>🔍</span>`,
          bg: "bg-rose-50",
          text: "text-rose-800",
          border: "border-rose-300",
          dot: "bg-rose-500",
          badge: "bg-rose-100 text-rose-800 border-rose-300"
        };
      case "Ok":
      default:
        return {
          label: "Ok",
          description: "Pronta pra uso ou mala",
          iconHtml: `<span>✅</span>`,
          bg: "bg-emerald-50",
          text: "text-emerald-800",
          border: "border-emerald-300",
          dot: "bg-emerald-500",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300"
        };
    }
  }

  // Quick API update for piece status from Mala view
  async function updatePieceStatus(itemId, newStatus) {
    try {
      const resp = await authFetch(`/api/clothes/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_roupa: newStatus })
      });
      if (!resp.ok) throw new Error("Erro ao atualizar status");
      const updated = await resp.json();
      const localItem = wardrobeItems.find(w => w.id === itemId);
      if (localItem) localItem.status_roupa = newStatus;
      renderMalaView();
      return updated;
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar o status da peça.");
    }
  }

  // Collect all wardrobe pieces, shopping items, and missing slots in the trip
  function collectMalaItems() {
    if (!currentTrip) return { wardrobePiecesMap: new Map(), shoppingItems: [], missingSlots: [] };

    const wardrobePiecesMap = new Map();
    const shoppingItems = [];
    const missingSlots = [];

    (currentTrip.days || []).forEach((day, dayIndex) => {
      const dayNum = day.day_number || (dayIndex + 1);
      ["day_period", "night_period"].forEach(periodKey => {
        const periodLabel = periodKey === "day_period" ? "Diurno" : "Noturno";
        const look = day[periodKey]?.look;
        if (!look || !Array.isArray(look.items)) return;

        look.items.forEach((it, itIdx) => {
          const isShopping = it.source_type === "shopping" || !!it.merchant || !!it.shopping_item_id;
          const isPlaceholder = !!it.is_placeholder;

          if (isShopping) {
            const imgA = it.original_url || it.thumbnail || "";
            const existing = shoppingItems.find(s => {
              const imgB = s.item.original_url || s.item.thumbnail || "";
              if (it.shopping_id && s.item.shopping_id && it.shopping_id === s.item.shopping_id) return true;
              return s.item.tipo === it.tipo && imgA === imgB;
            });
            if (existing) {
              existing.usages.push({ dayIndex, periodKey, dayNum, periodLabel });
            } else {
              shoppingItems.push({
                item: it,
                dayIndex,
                periodKey,
                itIdx,
                usages: [{ dayIndex, periodKey, dayNum, periodLabel }]
              });
            }
          } else if (isPlaceholder) {
            missingSlots.push({
              item: it,
              dayIndex,
              periodKey,
              itIdx,
              dayNum,
              periodLabel
            });
          } else {
            const itemId = it.item_id || it.id || `look_piece_${dayIndex}_${periodKey}_${itIdx}`;
            let piece = wardrobeItems.find(w => String(w.id) === String(it.item_id || it.id));
            if (!piece) {
              piece = {
                id: itemId,
                tipo: it.tipo || it.slot_name || "Peça do Look",
                categoria: it.categoria || it.slot_name || "Outros",
                cor_predominante: it.cor || it.cor_predominante || "Padrão",
                cor_hex: it.cor_hex || "#94a3b8",
                original_url: it.original_url || it.thumbnail || "",
                cutout_url: it.cutout_url || it.original_url || it.thumbnail || "",
                status_roupa: it.status_roupa || "Ok"
              };
            }
            if (!wardrobePiecesMap.has(piece.id)) {
              wardrobePiecesMap.set(piece.id, {
                piece,
                usages: []
              });
            }
            wardrobePiecesMap.get(piece.id).usages.push({
              dayIndex,
              periodKey,
              dayNum,
              periodLabel
            });
          }
        });
      });
    });

    return { wardrobePiecesMap, shoppingItems, missingSlots };
  }

  function updateTripPendingBadges() {
    const { wardrobePiecesMap, shoppingItems, missingSlots } = collectMalaItems();
    const wardrobeList = Array.from(wardrobePiecesMap.values());
    const countShopping = shoppingItems.length;
    const countMissing = missingSlots.length;
    const attentionPieces = wardrobeList.filter(wp => (wp.piece.status_roupa || "Ok") !== "Ok");
    const countAttention = attentionPieces.length;
    const totalPendencias = countMissing + countShopping + countAttention;
    const totalPieces = wardrobeList.length + countShopping;

    if (tabMalaPendingBadge) {
      if (totalPendencias > 0) {
        tabMalaPendingBadge.textContent = `${totalPendencias} ${totalPendencias === 1 ? 'pendência' : 'pendências'}`;
        tabMalaPendingBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-2xs";
      } else {
        tabMalaPendingBadge.textContent = "Mala Pronta ✓";
        tabMalaPendingBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs";
      }
      tabMalaPendingBadge.classList.remove("hidden");
    }

    if (navMalaPendingBadge) {
      if (totalPendencias > 0) {
        navMalaPendingBadge.textContent = totalPendencias;
        navMalaPendingBadge.classList.remove("hidden");
      } else {
        navMalaPendingBadge.classList.add("hidden");
      }
    }

    if (overviewQuickStats) {
      overviewQuickStats.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold">
          <span>🧳</span>
          <span>${totalPieces} peças na mala</span>
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${totalPendencias > 0 ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-emerald-100 text-emerald-900 font-bold'}">
          <span>${totalPendencias > 0 ? '⚠️' : '✅'}</span>
          <span>${totalPendencias > 0 ? `${totalPendencias} pendências` : '100% pronta'}</span>
        </span>
      `;
    }

    return { totalPendencias, countShopping, countMissing, countAttention, totalPieces };
  }

  function getCategoryIcon(catName) {
    const c = (catName || "").toLowerCase();
    if (c.includes("calçado") || c.includes("sapato") || c.includes("tênis") || c.includes("sandália") || c.includes("bota")) return "👟";
    if (c.includes("camisa") || c.includes("camiseta") || c.includes("blusa") || c.includes("top")) return "👕";
    if (c.includes("calça") || c.includes("bermuda") || c.includes("short") || c.includes("saia")) return "👖";
    if (c.includes("casaco") || c.includes("jaqueta") || c.includes("frio") || c.includes("blazer")) return "🧥";
    if (c.includes("íntima") || c.includes("intima") || c.includes("meia") || c.includes("cueca")) return "🧦";
    if (c.includes("acessório") || c.includes("acessorio") || c.includes("óculos") || c.includes("bolsa")) return "🕶️";
    if (c.includes("vestido") || c.includes("macacão")) return "👗";
    return "🏷️";
  }

  function renderMalaView() {
    if (!malaSummaryCard || !malaCategoriesGrid || !currentTrip) return;

    const { wardrobePiecesMap, shoppingItems, missingSlots } = collectMalaItems();
    const wardrobeList = Array.from(wardrobePiecesMap.values());

    const countWardrobe = wardrobeList.length;
    const countShopping = shoppingItems.length;
    const countMissing = missingSlots.length;
    const totalItems = countWardrobe + countShopping + countMissing;

    const attentionPieces = wardrobeList.filter(wp => (wp.piece.status_roupa || "Ok") !== "Ok");
    const countAttention = attentionPieces.length;
    const countOk = wardrobeList.filter(wp => (wp.piece.status_roupa || "Ok") === "Ok").length;
    const totalPendencias = countMissing + countShopping + countAttention;

    // Packed items state (from localStorage)
    const storageKey = `roupeiro_mala_packed_${currentTrip.id}`;
    let packedMap = {};
    try {
      packedMap = JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (e) {
      packedMap = {};
    }

    const countPacked = wardrobeList.filter(wp => !!packedMap[wp.piece.id]).length + shoppingItems.filter(sp => {
      const sKey = sp.item.shopping_id ? `shop_${sp.item.shopping_id}` : `shop_${sp.item.tipo}`;
      return !!packedMap[sKey];
    }).length;
    const packedPercent = (countWardrobe + countShopping) > 0 ? Math.round((countPacked / (countWardrobe + countShopping)) * 100) : 0;

    // Build unified category map and collect all days with looks in the trip
    const categoryMap = new Map();
    const allTripDaysSet = new Set();

    wardrobeList.forEach(wp => {
      const cat = wp.piece.categoria || "Outros";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { wardrobe: [], shopping: [], missing: [], allDays: new Set() });
      }
      const entry = categoryMap.get(cat);
      entry.wardrobe.push(wp);
      wp.usages.forEach(u => {
        entry.allDays.add(u.dayNum);
        allTripDaysSet.add(u.dayNum);
      });
    });

    shoppingItems.forEach(sp => {
      const cat = sp.item.categoria || "Outros";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { wardrobe: [], shopping: [], missing: [], allDays: new Set() });
      }
      const entry = categoryMap.get(cat);
      entry.shopping.push(sp);
      sp.usages.forEach(u => {
        entry.allDays.add(u.dayNum);
        allTripDaysSet.add(u.dayNum);
      });
    });

    missingSlots.forEach(ms => {
      const cat = ms.item.categoria || ms.item.slot_name || "Outros";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { wardrobe: [], shopping: [], missing: [], allDays: new Set() });
      }
      const entry = categoryMap.get(cat);
      entry.missing.push(ms);
      entry.allDays.add(ms.dayNum);
      allTripDaysSet.add(ms.dayNum);
    });

    if (malaFilterCategory !== "Todas" && !categoryMap.has(malaFilterCategory)) {
      malaFilterCategory = "Todas";
    }

    // Update badges
    updateTripPendingBadges();

    // Attention breakdown detail
    const attentionBreakdown = {};
    attentionPieces.forEach(wp => {
      const st = wp.piece.status_roupa || "Ok";
      attentionBreakdown[st] = (attentionBreakdown[st] || 0) + 1;
    });
    const attentionPillsHtml = Object.entries(attentionBreakdown).map(([st, c]) => {
      const info = getPieceStatusInfo(st);
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${info.bg} ${info.text} ${info.border} inline-flex items-center gap-1">${info.iconHtml}<span>${c} ${info.label}</span></span>`;
    }).join(" ");

    let statusFilterLabel = "Todos os Status";
    if (malaStatusFilter === "prontas") statusFilterLabel = "Prontas (Ok)";
    else if (malaStatusFilter === "atencao") statusFilterLabel = "Precisam de Atenção";
    else if (malaStatusFilter === "comprar") statusFilterLabel = "A Comprar";
    else if (malaStatusFilter === "definir") statusFilterLabel = "A Definir";

    const hasActiveFilters = (malaStatusFilter !== "all") || (malaFilterCategory !== "Todas") || malaOnlyPending;

    // 1. RENDER SUMMARY CARD
    malaSummaryCard.innerHTML = `
      <!-- TOP STATUS ALERT BANNER -->
      <div class="p-5 rounded-2xl ${totalPendencias === 0 ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-200' : 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-blue-500/10 border border-amber-200'} flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl ${totalPendencias === 0 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'} flex items-center justify-center text-xl shadow-md shrink-0">
            <span>${totalPendencias === 0 ? '📋' : '⚠️'}</span>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base sm:text-lg font-bold text-slate-900 font-serif">
                ${totalPendencias === 0 ? 'Mala 100% Pronta para Embarcar!' : `Mala com ${totalPendencias} ${totalPendencias === 1 ? 'Pendência' : 'Pendências'}`}
              </h3>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${totalPendencias === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                ${totalPendencias === 0 ? 'Tudo Pronto' : `${totalPendencias} a resolver`}
              </span>
            </div>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">
              ${totalPendencias === 0 
                ? `Todas as ${countWardrobe + countShopping} peças foram planejadas, compradas e estão prontas para uso (Ok).` 
                : `Existem peças que precisam de atenção (passar/lavar), peças planejadas para compra ou vagas a definir no roteiro.`}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          <button type="button" id="btnToggleOnlyPending" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs ${malaOnlyPending ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}">
            <span>${malaOnlyPending ? '👁️' : '🔍'}</span>
            <span>${malaOnlyPending ? 'Ver Todas as Peças' : `Ver Somente Pendências (${totalPendencias})`}</span>
          </button>
        </div>
      </div>

      <!-- COUNTER STATS TILES (TOTALIZADORES COMO FILTROS INTERATIVOS COMBINÁVEIS) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <!-- 1. Total Peças & Packing Progress -->
        <div id="statFilterTotal" class="stat-filter-tile rounded-2xl p-3.5 border transition cursor-pointer flex flex-col justify-between select-none ${malaStatusFilter === 'all' && !malaOnlyPending ? 'border-emerald-500 ring-2 ring-emerald-500 bg-white shadow-md' : 'border-slate-200/80 bg-slate-50 hover:bg-slate-100/90 shadow-2xs'}" title="Clique para exibir todos os itens na mala">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span>Total na Mala</span>
              ${malaStatusFilter === 'all' && !malaOnlyPending ? '<span class="text-[9px] text-emerald-600 font-extrabold">• Ativo</span>' : ''}
            </span>
            <span>🧳</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-900">${countWardrobe + countShopping}</div>
            <div class="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>${countPacked} guardadas</span>
              <span class="font-bold text-emerald-600">${packedPercent}%</span>
            </div>
            <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div class="bg-emerald-500 h-full rounded-full transition-all duration-300" style="width: ${packedPercent}%;"></div>
            </div>
          </div>
        </div>

        <!-- 2. Peças Prontas (Ok) -->
        <div id="statFilterProntas" class="stat-filter-tile rounded-2xl p-3.5 border transition cursor-pointer flex flex-col justify-between select-none ${malaStatusFilter === 'prontas' ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-100 shadow-md' : 'border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100/50 shadow-2xs'}" title="Clique para filtrar apenas peças prontas para uso (Ok)">
          <div class="flex items-center justify-between text-emerald-700 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span>Prontas</span>
              ${malaStatusFilter === 'prontas' ? '<span class="text-[9px] text-emerald-700 font-extrabold">• Ativo</span>' : ''}
            </span>
            <span>✅</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-emerald-950">${countOk}</div>
            <p class="text-[10px] text-emerald-700 mt-0.5">Prontas para uso</p>
          </div>
        </div>

        <!-- 3. Precisam de Atenção -->
        <div id="statFilterAtencao" class="stat-filter-tile rounded-2xl p-3.5 border transition cursor-pointer flex flex-col justify-between select-none ${malaStatusFilter === 'atencao' ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-100 shadow-md' : 'border-amber-200/80 bg-amber-50/60 hover:bg-amber-100/50 shadow-2xs'}" title="Clique para filtrar peças que precisam de passar/lavar/achar">
          <div class="flex items-center justify-between text-amber-800 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span>Atenção</span>
              ${malaStatusFilter === 'atencao' ? '<span class="text-[9px] text-amber-800 font-extrabold">• Ativo</span>' : ''}
            </span>
            <span>👕</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-amber-950">${countAttention}</div>
            <p class="text-[10px] text-amber-800 mt-0.5 truncate" title="${attentionPieces.map(p => `${p.piece.tipo}: ${p.piece.status_roupa}`).join(', ')}">
              ${countAttention > 0 ? (attentionPillsHtml || 'Passar / Lavar') : 'Nenhuma pendente'}
            </p>
          </div>
        </div>

        <!-- 4. A Comprar -->
        <div id="statFilterComprar" class="stat-filter-tile rounded-2xl p-3.5 border transition cursor-pointer flex flex-col justify-between select-none ${malaStatusFilter === 'comprar' ? 'border-sky-500 ring-2 ring-sky-500 bg-sky-100 shadow-md' : 'border-sky-200/80 bg-sky-50/60 hover:bg-sky-100/50 shadow-2xs'}" title="Clique para filtrar apenas itens a comprar">
          <div class="flex items-center justify-between text-sky-800 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span>A Comprar</span>
              ${malaStatusFilter === 'comprar' ? '<span class="text-[9px] text-sky-800 font-extrabold">• Ativo</span>' : ''}
            </span>
            <span>🛍️</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-sky-950">${countShopping}</div>
            <p class="text-[10px] text-sky-700 mt-0.5">Compras planejadas</p>
          </div>
        </div>

        <!-- 5. A Definir (Faltantes) -->
        <div id="statFilterDefinir" class="stat-filter-tile rounded-2xl p-3.5 border transition cursor-pointer flex flex-col justify-between select-none ${malaStatusFilter === 'definir' ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-100 shadow-md' : 'border-blue-200/80 bg-blue-50/60 hover:bg-blue-100/50 shadow-2xs'}" title="Clique para filtrar apenas vagas a definir no look">
          <div class="flex items-center justify-between text-blue-800 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span>A Definir</span>
              ${malaStatusFilter === 'definir' ? '<span class="text-[9px] text-blue-800 font-extrabold">• Ativo</span>' : ''}
            </span>
            <span>🧩</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-950">${countMissing}</div>
            <p class="text-[10px] text-blue-700 mt-0.5">Vagas sem peça</p>
          </div>
        </div>
      </div>

      <!-- ACTIVE FILTERS BAR (QUANDO HOUVER FILTRO ATIVO) -->
      ${hasActiveFilters ? `
        <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-slate-500 font-semibold flex items-center gap-1">
              <span>🔍</span>
              <span>Filtros ativos:</span>
            </span>
            ${malaStatusFilter !== 'all' ? `
              <span class="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold shadow-2xs">
                Status: ${statusFilterLabel}
              </span>
            ` : ''}
            ${malaFilterCategory !== 'Todas' ? `
              <span class="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold shadow-2xs">
                Categoria: ${escapeHtml(malaFilterCategory)}
              </span>
            ` : ''}
            ${malaOnlyPending ? `
              <span class="px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 font-bold shadow-2xs">
                Somente Pendências
              </span>
            ` : ''}
          </div>
          <button type="button" id="btnClearActiveFilters" class="text-brand-600 hover:text-brand-800 font-bold text-xs hover:underline flex items-center gap-1">
            <span>🔄</span>
            <span>Limpar filtros</span>
          </button>
        </div>
      ` : ''}

      <!-- FILTER TABS & QUICK PACK ACTIONS -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
        <!-- Category Filter Pills with Item Count and Days Count -->
        <div class="flex items-center gap-1.5 flex-wrap" id="malaCategoryFilterContainer">
          <!-- Dynamically populated category buttons -->
        </div>

        <!-- Bulk Pack / Unpack Checkbox Buttons -->
        <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button type="button" id="btnPackAllPieces" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs" title="Marcar todas as peças como colocadas na mala">
            <span>✅</span>
            <span>Guardar Todas</span>
          </button>
          <button type="button" id="btnUnpackAllPieces" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs" title="Desmarcar todas">
            <span>🔄</span>
            <span>Desmarcar</span>
          </button>
        </div>
      </div>
    `;

    // 1.1 Attach Listeners to Stat Filter Tiles
    malaSummaryCard.querySelector("#statFilterTotal")?.addEventListener("click", () => {
      malaStatusFilter = "all";
      malaOnlyPending = false;
      renderMalaView();
    });
    malaSummaryCard.querySelector("#statFilterProntas")?.addEventListener("click", () => {
      malaStatusFilter = (malaStatusFilter === "prontas") ? "all" : "prontas";
      malaOnlyPending = false;
      renderMalaView();
    });
    malaSummaryCard.querySelector("#statFilterAtencao")?.addEventListener("click", () => {
      malaStatusFilter = (malaStatusFilter === "atencao") ? "all" : "atencao";
      malaOnlyPending = false;
      renderMalaView();
    });
    malaSummaryCard.querySelector("#statFilterComprar")?.addEventListener("click", () => {
      malaStatusFilter = (malaStatusFilter === "comprar") ? "all" : "comprar";
      malaOnlyPending = false;
      renderMalaView();
    });
    malaSummaryCard.querySelector("#statFilterDefinir")?.addEventListener("click", () => {
      malaStatusFilter = (malaStatusFilter === "definir") ? "all" : "definir";
      malaOnlyPending = false;
      renderMalaView();
    });

    // Clear Active Filters Button
    malaSummaryCard.querySelector("#btnClearActiveFilters")?.addEventListener("click", () => {
      malaStatusFilter = "all";
      malaFilterCategory = "Todas";
      malaOnlyPending = false;
      renderMalaView();
    });

    // Toggle only pending filter
    malaSummaryCard.querySelector("#btnToggleOnlyPending")?.addEventListener("click", () => {
      malaOnlyPending = !malaOnlyPending;
      renderMalaView();
    });

    // Pack all pieces
    malaSummaryCard.querySelector("#btnPackAllPieces")?.addEventListener("click", () => {
      wardrobeList.forEach(w => packedMap[w.piece.id] = true);
      shoppingItems.forEach(s => {
        const sKey = s.item.shopping_id ? `shop_${s.item.shopping_id}` : `shop_${s.item.tipo}`;
        packedMap[sKey] = true;
      });
      localStorage.setItem(storageKey, JSON.stringify(packedMap));
      renderMalaView();
    });

    // Unpack all pieces
    malaSummaryCard.querySelector("#btnUnpackAllPieces")?.addEventListener("click", () => {
      packedMap = {};
      localStorage.setItem(storageKey, JSON.stringify(packedMap));
      renderMalaView();
    });

    // 1.2 Populate Category Filters in Mala (Com quantidade de peças e dias de uso)
    const filterContainer = malaSummaryCard.querySelector("#malaCategoryFilterContainer");
    if (filterContainer) {
      filterContainer.innerHTML = "";

      // 1.2.1 "Todas" Category Button
      const isTodasSelected = malaFilterCategory === "Todas";
      const totalTripDays = allTripDaysSet.size;
      const todasBtn = document.createElement("button");
      todasBtn.type = "button";
      todasBtn.className = `px-3 py-1.5 rounded-xl text-xs transition shadow-2xs flex items-center gap-1.5 ${
        isTodasSelected ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'
      }`;
      todasBtn.innerHTML = `
        <span>🌈</span>
        <span>Todas (${totalItems} ${totalItems === 1 ? 'item' : 'itens'} • ${totalTripDays} ${totalTripDays === 1 ? 'dia' : 'dias'})</span>
      `;
      todasBtn.addEventListener("click", () => {
        malaFilterCategory = "Todas";
        renderMalaView();
      });
      filterContainer.appendChild(todasBtn);

      // 1.2.2 Buttons for each Category with Items and Days count
      const sortedCatNames = Array.from(categoryMap.keys()).sort();
      sortedCatNames.forEach(catName => {
        const cEntry = categoryMap.get(catName);
        const cTotalItems = cEntry.wardrobe.length + cEntry.shopping.length + cEntry.missing.length;
        const cDays = cEntry.allDays.size;
        const isSelected = (malaFilterCategory === catName);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `px-3 py-1.5 rounded-xl text-xs transition shadow-2xs flex items-center gap-1.5 ${
          isSelected ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'
        }`;
        btn.innerHTML = `
          <span>${getCategoryIcon(catName)}</span>
          <span>${escapeHtml(catName)} (${cTotalItems} ${cTotalItems === 1 ? 'peça' : 'peças'} • ${cDays} ${cDays === 1 ? 'dia' : 'dias'})</span>
        `;
        btn.addEventListener("click", () => {
          malaFilterCategory = isSelected ? "Todas" : catName;
          renderMalaView();
        });
        filterContainer.appendChild(btn);
      });
    }

    // 2. RENDER CATEGORIES GRID (Agrupado por categoria com itens do roupeiro, compras e a definir)
    malaCategoriesGrid.innerHTML = "";
    let renderedAnySection = false;

    const sortedCatNames = Array.from(categoryMap.keys()).sort();
    for (const catName of sortedCatNames) {
      if (malaFilterCategory !== "Todas" && malaFilterCategory !== catName) {
        continue;
      }

      const entry = categoryMap.get(catName);

      // Filter wardrobe pieces in this category according to malaStatusFilter and malaOnlyPending
      let piecesInCat = entry.wardrobe;
      if (malaStatusFilter === "prontas") {
        piecesInCat = piecesInCat.filter(w => (w.piece.status_roupa || "Ok") === "Ok");
      } else if (malaStatusFilter === "atencao") {
        piecesInCat = piecesInCat.filter(w => (w.piece.status_roupa || "Ok") !== "Ok");
      } else if (malaStatusFilter === "comprar" || malaStatusFilter === "definir") {
        piecesInCat = [];
      }
      if (malaOnlyPending) {
        piecesInCat = piecesInCat.filter(w => (w.piece.status_roupa || "Ok") !== "Ok");
      }

      // Filter shopping items in this category
      let shoppingInCat = entry.shopping;
      if (malaStatusFilter === "prontas" || malaStatusFilter === "atencao" || malaStatusFilter === "definir") {
        shoppingInCat = [];
      }

      // Filter missing slots in this category
      let missingInCat = entry.missing;
      if (malaStatusFilter === "prontas" || malaStatusFilter === "atencao" || malaStatusFilter === "comprar") {
        missingInCat = [];
      }

      const totalMatchingInCat = piecesInCat.length + shoppingInCat.length + missingInCat.length;
      if (totalMatchingInCat === 0) continue;

      renderedAnySection = true;

      const secElem = document.createElement("section");
      secElem.className = "category-section bg-slate-50/70 rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-4";

      // 2.1 Wardrobe Piece Cards
      const wardrobeCardsHtml = piecesInCat.map(({ piece, usages }) => {
        const isPacked = !!packedMap[piece.id];
        const imgUrl = piece.cutout_url || piece.original_url;
        const statusRoupa = piece.status_roupa || "Ok";
        const statusInfo = getPieceStatusInfo(statusRoupa);
        const isPending = statusRoupa !== "Ok";

        const uniqueDays = Array.from(new Set(usages.map(u => u.dayNum))).sort((a, b) => a - b);
        const daysCount = uniqueDays.length;
        const daysLabel = daysCount === 1 ? "1 dia" : `${daysCount} dias`;
        const daysListStr = uniqueDays.map(d => `Dia ${d}`).join(", ");
        const periodsDetailStr = usages.map(u => `Dia ${u.dayNum} (${u.periodLabel})`).join(", ");

        return `
          <div class="garment-card bg-white rounded-2xl border ${isPending ? 'border-amber-300 ring-2 ring-amber-300/60' : 'border-slate-200/90'} overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group relative ${isPacked ? 'opacity-70 bg-emerald-50/30' : ''}" data-piece-id="${piece.id}">
            <!-- Visual Area -->
            <div class="relative h-44 sm:h-48 bg-slate-50 p-3 flex items-center justify-center overflow-hidden border-b border-slate-100">
              <!-- Checkbox "Na Mala" -->
              <label class="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-white/95 px-2 py-1 rounded-lg border border-slate-200 shadow-2xs cursor-pointer select-none hover:bg-slate-50" onclick="event.stopPropagation()">
                <input type="checkbox" class="mala-pack-checkbox w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer" data-piece-id="${piece.id}" ${isPacked ? 'checked' : ''}>
                <span class="text-[10px] font-bold ${isPacked ? 'text-emerald-700' : 'text-slate-600'}">${isPacked ? 'Na Mala ✓' : 'Pôr na Mala'}</span>
              </label>

              <!-- Eye Icon for 4x Zoom -->
              ${imgUrl ? `
                <button type="button" class="btn-zoom-slot-item absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/95 text-slate-600 hover:text-brand-600 hover:scale-110 shadow-sm border border-slate-200 flex items-center justify-center transition z-20" data-img="${escapeHtml(imgUrl)}" data-title="${escapeHtml(piece.tipo)}" data-slot="${escapeHtml(piece.categoria)}" title="Visualizar em Zoom (4x)">
                  <span>🔍</span>
                </button>
              ` : ''}

              ${imgUrl ? `
                <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(piece.tipo)}" class="max-h-36 max-w-full object-contain transition group-hover:scale-105 duration-200">
              ` : `
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style="background-color: ${piece.cor_hex || '#94a3b8'}20">
                  <span class="text-2xl">${getCategoryIcon(piece.categoria)}</span>
                </div>
              `}

              <!-- Category Pill -->
              <span class="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-slate-800 shadow-2xs border border-slate-200/80">
                ${escapeHtml(piece.categoria || 'Outros')}
              </span>

              <!-- Status Pill on Image with Illustrative Icon -->
              <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold border shadow-2xs ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} flex items-center gap-1 z-10" title="${statusInfo.description}">
                ${statusInfo.iconHtml}
                <span>${statusInfo.label}</span>
              </span>
            </div>

            <!-- Card Content -->
            <div class="p-3 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-1" title="${escapeHtml(piece.tipo)}">${escapeHtml(piece.tipo)}</h4>
                <div class="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                  <span class="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style="background-color: ${piece.cor_hex || '#94a3b8'}"></span>
                  <span class="truncate">${escapeHtml(piece.cor_predominante || 'Cor padrão')}</span>
                </div>
              </div>

              <!-- Usages in Trip with Days Count -->
              <div class="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2 text-[10px] text-indigo-900 leading-tight">
                <span class="font-bold block text-indigo-950 mb-0.5 flex items-center gap-1">
                  <span>🗓️</span>
                  <span>Usada em ${daysLabel} (${daysListStr}):</span>
                </span>
                <span class="font-medium text-slate-600">${escapeHtml(periodsDetailStr)}</span>
              </div>

              <!-- Status Row with Illustrative Icon (Alteração exclusiva pelo modal de edição do roupeiro) -->
              <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <span class="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                  <span>Status:</span>
                </span>
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} inline-flex items-center gap-1.5 shadow-2xs" title="Definido no Roupeiro: ${statusInfo.description}">
                  ${statusInfo.iconHtml}
                  <span>${statusInfo.label}</span>
                </span>
              </div>
            </div>
          </div>
        `;
      }).join("");

      // 2.2 Shopping Cards in this Category
      const shoppingCardsHtml = shoppingInCat.map(({ item, usages }, shopIdx) => {
        const imgUrl = item.original_url || item.thumbnail;

        const uniqueDays = Array.from(new Set(usages.map(u => u.dayNum))).sort((a, b) => a - b);
        const daysCount = uniqueDays.length;
        const daysLabel = daysCount === 1 ? "1 dia" : `${daysCount} dias`;
        const daysListStr = uniqueDays.map(d => `Dia ${d}`).join(", ");
        const periodsDetailStr = usages.map(u => `Dia ${u.dayNum} (${u.periodLabel})`).join(", ");

        return `
          <div class="garment-card bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group relative">
            <div class="relative h-44 sm:h-48 bg-sky-50/40 p-3 flex items-center justify-center overflow-hidden border-b border-sky-100">
              <!-- Quick Buy Button in top-left -->
              <button type="button" class="btn-buy-mala-piece absolute top-2 left-2 z-20 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg shadow-xs cursor-pointer transition text-[10px] font-bold" data-shop-idx="${shopIdx}" onclick="event.stopPropagation()">
                <span>🛍️</span>
                <span>Efetuar Compra</span>
              </button>

              <!-- Zoom eye button -->
              ${imgUrl ? `
                <button type="button" class="btn-zoom-slot-item absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/95 text-slate-600 hover:text-sky-600 hover:scale-110 shadow-sm border border-slate-200 flex items-center justify-center transition z-20" data-img="${escapeHtml(imgUrl)}" data-title="${escapeHtml(item.tipo)}" data-slot="${escapeHtml(item.merchant || 'Loja')}" title="Visualizar em Zoom (4x)">
                  <span>🔍</span>
                </button>
              ` : ''}

              ${imgUrl ? `
                <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.tipo)}" class="max-h-36 max-w-full object-contain transition group-hover:scale-105 duration-200">
              ` : `
                <div class="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 text-2xl">
                  <span>🛍️</span>
                </div>
              `}

              <span class="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                🛍️ A Comprar
              </span>
            </div>

            <div class="p-3 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-1" title="${escapeHtml(item.tipo)}">${escapeHtml(item.tipo)}</h4>
                <p class="text-[11px] text-sky-800 font-semibold mt-0.5">
                  ${escapeHtml(item.merchant || 'Loja')} • <span class="text-emerald-700 font-bold">${escapeHtml(item.price || 'Sob consulta')}</span>
                </p>
              </div>

              <!-- Usages in Trip with Days Count -->
              <div class="bg-sky-50 border border-sky-100 rounded-xl p-2 text-[10px] text-sky-900 leading-tight">
                <span class="font-bold block text-sky-950 mb-0.5">
                  <span>🗓️</span>
                  <span>Planejada para ${daysLabel} (${daysListStr}):</span>
                </span>
                <span class="font-medium text-slate-600">${escapeHtml(periodsDetailStr)}</span>
              </div>

              <div class="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                <button type="button" class="btn-buy-mala-piece w-full text-center py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-2xs" data-shop-idx="${shopIdx}">
                  <span>🛍️</span>
                  <span>Efetuar Compra (Mover p/ Roupeiro)</span>
                </button>
                <button type="button" class="btn-desistir-mala-piece w-full text-center py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-rose-200 shadow-2xs" data-shop-idx="${shopIdx}">
                  <span>🗑️</span>
                  <span>Desistir</span>
                </button>
                ${item.link ? `
                  <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="w-full text-center py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-semibold transition flex items-center justify-center gap-1 border border-sky-200">
                    <span>↗️</span>
                    <span>Ver na Loja</span>
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join("");

      // 2.3 Missing Slot Cards in this Category
      const missingCardsHtml = missingInCat.map(({ item, dayIndex, periodKey, itIdx, dayNum, periodLabel }) => {
        const slotName = item.slot_name || item.tipo || "Peça Faltante";

        return `
          <div class="garment-card bg-white rounded-2xl border-2 border-dashed border-rose-300 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
            <div class="flex flex-col items-center text-center space-y-2 pt-2">
              <div class="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl">
                <span>🧩</span>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                ⚠️ A Definir
              </span>
              <div>
                <h4 class="text-xs font-bold text-slate-900">${escapeHtml(slotName)}</h4>
                <p class="text-[10px] text-slate-500 mt-0.5">${escapeHtml(item.por_que_foi_escolhida || 'Peça sugerida no roteiro')}</p>
              </div>
            </div>

            <div class="bg-rose-50 border border-rose-100 rounded-xl p-2 text-[10px] text-rose-900">
              <span class="font-bold block">Faltando no Look:</span>
              <span>Dia ${dayNum} • Período ${periodLabel}</span>
            </div>

            <button type="button" class="btn-fill-missing-slot w-full py-2 rounded-xl bg-gradient-to-r from-rose-500 to-brand-600 hover:from-rose-600 hover:to-brand-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5" data-day="${dayIndex}" data-period="${periodKey}" data-item-idx="${itIdx}">
              <span>➕</span>
              <span>Escolher Peça</span>
            </button>
          </div>
        `;
      }).join("");

      const catDays = entry.allDays.size;

      secElem.innerHTML = `
        <div class="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200/80">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <span class="text-base">${getCategoryIcon(catName)}</span>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 font-serif">${escapeHtml(catName)}</h3>
              <p class="text-[11px] text-slate-500">
                ${totalMatchingInCat} ${totalMatchingInCat === 1 ? 'item exibido' : 'itens exibidos'} • Utilizado(s) em ${catDays} ${catDays === 1 ? 'dia' : 'dias'} da viagem
              </p>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          ${wardrobeCardsHtml}
          ${shoppingCardsHtml}
          ${missingCardsHtml}
        </div>
      `;
      malaCategoriesGrid.appendChild(secElem);
    }

    if (!renderedAnySection) {
      let filterDesc = "";
      if (malaStatusFilter === "prontas") filterDesc = "com status 'Prontas (Ok)'";
      else if (malaStatusFilter === "atencao") filterDesc = "com status de 'Atenção'";
      else if (malaStatusFilter === "comprar") filterDesc = "planejadas para compra";
      else if (malaStatusFilter === "definir") filterDesc = "pendentes a definir";

      const catDesc = malaFilterCategory !== "Todas" ? `na categoria "${malaFilterCategory}"` : "";

      malaCategoriesGrid.innerHTML = `
        <div class="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
            <span>🔍</span>
          </div>
          <h4 class="text-sm font-bold text-slate-800">Nenhum item encontrado ${filterDesc} ${catDesc}</h4>
          <p class="text-xs text-slate-500">Alterne os totalizadores ou os filtros de categoria para visualizar outros itens.</p>
          <button type="button" id="btnResetMalaFilters" class="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-700 transition">
            Limpar Filtros e Ver Todos
          </button>
        </div>
      `;
      malaCategoriesGrid.querySelector("#btnResetMalaFilters")?.addEventListener("click", () => {
        malaFilterCategory = "Todas";
        malaStatusFilter = "all";
        malaOnlyPending = false;
        renderMalaView();
      });
    }

    // Attach Event Listeners on Mala Elements:
    // 1. Zoom Eye Icon
    malaCategoriesGrid.querySelectorAll(".btn-zoom-slot-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openImageZoomModal(btn.dataset.img, btn.dataset.title, btn.dataset.slot);
      });
    });

    // 2. Wardrobe "Na Mala" Checkbox
    malaCategoriesGrid.querySelectorAll(".mala-pack-checkbox").forEach(chk => {
      chk.addEventListener("change", (e) => {
        e.stopPropagation();
        const pid = chk.getAttribute("data-piece-id");
        packedMap[pid] = e.target.checked;
        localStorage.setItem(storageKey, JSON.stringify(packedMap));
        renderMalaView();
      });
    });

    // 3. Shopping "Efetuar Compra" Button
    malaCategoriesGrid.querySelectorAll(".btn-buy-mala-piece").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-shop-idx"), 10);
        const shopEntry = shoppingItems[idx];
        if (!shopEntry) return;
        const item = shopEntry.item;
        openPurchasePieceModal({
          tipo: item.tipo,
          categoria: item.categoria,
          cor_predominante: item.cor,
          price: item.price,
          merchant: item.merchant,
          original_url: item.original_url || item.thumbnail,
          shopping_id: item.shopping_id
        });
      });
    });

    // 3.1 Shopping "Desistir" Button
    malaCategoriesGrid.querySelectorAll(".btn-desistir-mala-piece").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-shop-idx"), 10);
        const shopEntry = shoppingItems[idx];
        if (!shopEntry) return;
        await handleDesistirShoppingPiece(shopEntry.item);
      });
    });

    // 4. Fill Missing Slot Button
    malaCategoriesGrid.querySelectorAll(".btn-fill-missing-slot").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dayIdx = parseInt(btn.dataset.day, 10);
        const pKey = btn.dataset.period;
        const itIdx = parseInt(btn.dataset.itemIdx, 10);
        const item = currentTrip.days[dayIdx][pKey].look.items[itIdx];
        openUnifiedPickerModal(dayIdx, pKey, itIdx, item);
      });
    });

    // 3. PACKING TIPS & ESSENTIALS
    if (malaPackingTips) {
      malaPackingTips.textContent = currentTrip.packing_tips || "Organize peças leves, versáteis e priorize calçados confortáveis para os passeios da viagem.";
    }
    if (malaEssentialsList) {
      malaEssentialsList.innerHTML = "";
      const essentials = currentTrip.suggested_essentials || ["Documentos e passaporte", "Carregador e adaptador", "Protetor solar", "Medicamentos de uso contínuo"];
      essentials.forEach(ess => {
        const li = document.createElement("li");
        li.textContent = ess;
        malaEssentialsList.appendChild(li);
      });
    }
  }

  function openChecklistModal() {
    switchView("mala");
  }

  function closeChecklistModal() {
    tripChecklistModal?.classList.add("hidden");
  }

  // ==========================================
  // SAVED TRIPS SELECTOR MODAL
  // ==========================================

  async function openSavedTripsModal() {
    savedTripsListContainer.innerHTML = `
      <div class="py-8 text-center text-xs text-slate-400">
        <span class="inline-block animate-spin text-lg mb-2">⏳</span>
        <p>Carregando histórico de viagens...</p>
      </div>
    `;
    savedTripsModal.classList.remove("hidden");

    try {
      const resp = await authFetch("/api/trips");
      const data = await resp.json();
      const trips = data.trips || [];

      if (!trips.length) {
        savedTripsListContainer.innerHTML = `
          <div class="py-8 text-center text-slate-400 space-y-3 bg-slate-50 rounded-2xl p-6">
            <p class="text-xs">Nenhuma viagem encontrada.</p>
            <a href="/" class="inline-flex items-center gap-1 px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl shadow transition">
              Planejar no Roupeiro ✈️
            </a>
          </div>
        `;
        return;
      }

      savedTripsListContainer.innerHTML = "";
      trips.forEach(trip => {
        const isCurrent = currentTrip && currentTrip.id === trip.id;
        const totalDays = trip.total_days || (trip.days ? trip.days.length : 0);

        const card = document.createElement("div");
        card.className = `p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
          isCurrent ? 'bg-brand-50/70 border-brand-300 ring-2 ring-brand-400' : 'bg-white border-slate-200 hover:border-brand-300'
        }`;

        card.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <span class="text-sm">✈️</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h5 class="text-sm font-bold text-slate-900 font-serif">${escapeHtml(trip.destination)}</h5>
                <span class="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">${totalDays} Dias</span>
              </div>
              <p class="text-xs text-slate-500">${formatDateBR(trip.arrival_date)} → ${formatDateBR(trip.departure_date)}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" class="btn-select-trip px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isCurrent ? 'bg-brand-600 text-white' : 'bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-700'
            }">
              ${isCurrent ? '✓ Viagem Atual' : 'Abrir Roteiro'}
            </button>
            <button type="button" class="btn-delete-trip p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Excluir">
              <span class="text-xs">🗑️</span>
            </button>
          </div>
        `;

        card.querySelector(".btn-select-trip").addEventListener("click", () => {
          window.location.href = `/viagem.html?id=${trip.id}`;
        });

        card.querySelector(".btn-delete-trip").addEventListener("click", async () => {
          if (!confirm("Tem certeza que deseja excluir este roteiro de viagem?")) return;
          try {
            await authFetch(`/api/trips/${trip.id}`, { method: "DELETE" });
            openSavedTripsModal();
          } catch (e) {
            alert("Erro ao excluir viagem.");
          }
        });

        savedTripsListContainer.appendChild(card);
      });
    } catch (err) {
      console.error("Saved trips error:", err);
    }
  }

  function closeSavedTripsModal() {
    savedTripsModal.classList.add("hidden");
  }

  // ==========================================
  // SAVE TRIP TO FIRESTORE
  // ==========================================

  async function saveCurrentTrip() {
    if (!currentTrip) return;
    if (currentTrip.is_locked) {
      alert("Esta viagem está com a edição bloqueada. Desbloqueie no botão do topo caso deseje fazer alterações.");
      await loadTrip(currentTrip.id);
      return;
    }
    try {
      const resp = await authFetch(`/api/trips/${currentTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_data: currentTrip })
      });
      if (resp.ok) {
        currentTrip = await resp.json();
      }
      updateTripPendingBadges();
      if (currentActiveView === "mala") {
        renderMalaView();
      }
    } catch (e) {
      console.error("Error saving trip:", e);
    }
  }

  async function handleToggleLockCurrentTrip(forceLockState = null) {
    if (!currentTrip) return;
    const newLocked = forceLockState !== null ? forceLockState : !currentTrip.is_locked;
    try {
      const resp = await authFetch(`/api/trips/${currentTrip.id}/lock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: newLocked })
      });
      if (!resp.ok) throw new Error("Falha ao atualizar status de bloqueio");
      currentTrip.is_locked = newLocked;
      updateLockStateUI();
    } catch (e) {
      console.error("Erro ao bloquear/desbloquear:", e);
      alert("Não foi possível alterar o bloqueio da viagem.");
    }
  }

  async function handleDuplicateCurrentTrip() {
    if (!currentTrip) return;
    try {
      const resp = await authFetch(`/api/trips/${currentTrip.id}/duplicate`, {
        method: "POST"
      });
      if (!resp.ok) throw new Error("Falha ao duplicar viagem");
      const newTrip = await resp.json();
      window.location.href = `/viagem?id=${encodeURIComponent(newTrip.id)}`;
    } catch (e) {
      console.error("Erro ao duplicar viagem:", e);
      alert("Não foi possível duplicar a viagem.");
    }
  }

  // ==========================================
  // PURCHASE PIECE MODAL (MOVER PEÇA A COMPRAR PARA O ROUPEIRO)
  // ==========================================

  let activePurchaseItemData = null;

  function openPurchasePieceModal(itemData) {
    activePurchaseItemData = itemData || {};
    const modal = document.getElementById("purchasePieceModal");
    if (!modal) return;

    const titleInput = document.getElementById("purchasePieceTitle");
    const dateInput = document.getElementById("purchasePieceDate");
    const priceInput = document.getElementById("purchasePiecePrice");
    const merchantInput = document.getElementById("purchasePieceMerchant");
    const titlePreview = document.getElementById("purchasePieceTitlePreview");
    const catPreview = document.getElementById("purchasePieceCategoryPreview");
    const imgPreview = document.getElementById("purchasePieceImg");
    const fallbackIcon = document.getElementById("purchasePieceFallbackIcon");

    const title = itemData.tipo || itemData.title || "Peça Comprada";
    const category = itemData.categoria || "Outros";
    const todayStr = new Date().toISOString().split("T")[0];

    if (titleInput) titleInput.value = title;
    if (dateInput) dateInput.value = todayStr;
    if (priceInput) priceInput.value = itemData.price || "";
    if (merchantInput) merchantInput.value = itemData.merchant || "";
    if (titlePreview) titlePreview.textContent = title;
    if (catPreview) catPreview.textContent = category;

    if (itemData.original_url && imgPreview) {
      imgPreview.src = itemData.original_url;
      imgPreview.classList.remove("hidden");
      if (fallbackIcon) fallbackIcon.classList.add("hidden");
    } else {
      if (imgPreview) imgPreview.classList.add("hidden");
      if (fallbackIcon) fallbackIcon.classList.remove("hidden");
    }

    modal.classList.remove("hidden");
  }
  window.openPurchasePieceModal = openPurchasePieceModal;

  function closePurchasePieceModal() {
    const modal = document.getElementById("purchasePieceModal");
    if (modal) modal.classList.add("hidden");
    activePurchaseItemData = null;
  }
  window.closePurchasePieceModal = closePurchasePieceModal;

  async function handleConfirmPurchasePiece(e) {
    e.preventDefault();
    if (!activePurchaseItemData) return;

    const btn = document.getElementById("btnConfirmPurchasePiece");
    const originalBtnHtml = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Movendo para o Roupeiro...</span>`;
    }

    const title = (document.getElementById("purchasePieceTitle")?.value || activePurchaseItemData.tipo || "Peça Comprada").trim();
    const acqDate = document.getElementById("purchasePieceDate")?.value || new Date().toISOString().split("T")[0];
    const precoPago = (document.getElementById("purchasePiecePrice")?.value || "").trim();
    const lojaComprada = (document.getElementById("purchasePieceMerchant")?.value || "").trim();

    try {
      const resp = await authFetch("/api/clothes/from-shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: title,
          categoria: activePurchaseItemData.categoria || "Outros",
          cor_predominante: activePurchaseItemData.cor_predominante || "Padrão",
          data_aquisicao: acqDate,
          preco_pago: precoPago,
          loja_comprada: lojaComprada,
          image_url: activePurchaseItemData.original_url || "",
          shopping_id: activePurchaseItemData.shopping_id || null
        })
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || "Não foi possível registrar a compra no roupeiro.");
      }

      const data = await resp.json();
      const newWardrobePiece = data.item;

      // 1. Add to local wardrobeItems array
      if (newWardrobePiece) {
        wardrobeItems.unshift(newWardrobePiece);
      }

      // 2. Convert all matching slots in currentTrip from shopping -> wardrobe
      if (currentTrip && Array.isArray(currentTrip.days)) {
        const oldTitleLower = (activePurchaseItemData.tipo || "").trim().toLowerCase();
        const targetShopId = activePurchaseItemData.shopping_id;

        currentTrip.days.forEach(day => {
          ["day_period", "night_period"].forEach(periodKey => {
            const look = day[periodKey]?.look;
            if (!look || !Array.isArray(look.items)) return;

            let periodModified = false;
            look.items.forEach(slot => {
              const isShopping = slot.source_type === "shopping" || (slot.source_type !== "wardrobe" && (!!slot.merchant || !!slot.shopping_id || !!slot.shopping_item_id));
              if (!isShopping) return;

              const matchesId = !!(targetShopId && slot.shopping_id === targetShopId);
              const matchesTitle = !!(oldTitleLower && (slot.tipo || "").trim().toLowerCase() === oldTitleLower);

              if (matchesId || matchesTitle) {
                slot.source_type = "wardrobe";
                slot.item_id = newWardrobePiece.id;
                slot.tipo = newWardrobePiece.tipo;
                slot.categoria = newWardrobePiece.categoria || slot.categoria || "Outros";
                slot.cor = newWardrobePiece.cor_predominante || slot.cor || "Padrão";
                slot.original_url = newWardrobePiece.original_url || slot.original_url;
                slot.cutout_url = newWardrobePiece.cutout_url || newWardrobePiece.original_url || slot.original_url;
                slot.shopping_id = null;
                slot.shopping_item_id = null;
                slot.merchant = null;
                slot.price = null;
                slot.link = null;
                slot.thumbnail = null;
                periodModified = true;
              }
            });

            if (periodModified) {
              look.item_ids = look.items
                .filter(i => i.source_type !== "shopping" && i.item_id)
                .map(i => i.item_id);
            }
          });
        });

        await saveCurrentTrip();
      }

      closePurchasePieceModal();
      closeUnifiedPickerModal();
      renderTripAccordion();
      renderMalaView();
      renderShoppingCatalogGrid();

      alert(`✅ Peça "${newWardrobePiece.tipo}" adicionada ao seu Roupeiro e atualizada nos looks da viagem!`);
    } catch (err) {
      console.error("Erro ao efetuar compra:", err);
      alert(err.message || "Erro ao efetuar compra da peça.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
      }
    }
  }

  // ==========================================
  // EVENT LISTENERS SETUP
  // ==========================================

  function setupEventListeners() {
    // Lock & Duplicate buttons
    document.getElementById("btnToggleLockTrip")?.addEventListener("click", () => handleToggleLockCurrentTrip());
    document.getElementById("btnUnlockFromBanner")?.addEventListener("click", () => handleToggleLockCurrentTrip(false));
    document.getElementById("btnDuplicateTrip")?.addEventListener("click", () => handleDuplicateCurrentTrip());

    // Main View Switcher Tabs (Roteiro vs Visão da Mala)
    tabBtnRoteiro?.addEventListener("click", () => switchView("roteiro"));
    tabBtnMala?.addEventListener("click", () => switchView("mala"));

    // Toolbar Expansion / Contraction
    btnToggleAllDays?.addEventListener("click", () => {
      allDaysExpanded = !allDaysExpanded;
      btnToggleAllDaysText.textContent = allDaysExpanded ? "Recolher Todos os Dias" : "Expandir Todos os Dias";
      (currentTrip?.days || []).forEach((_, idx) => dayExpandedMap[idx] = allDaysExpanded);
      renderTripAccordion();
    });

    btnToggleAllLocations?.addEventListener("click", () => {
      allLocationsVisible = !allLocationsVisible;
      btnToggleAllLocationsText.textContent = allLocationsVisible ? "Ocultar Detalhes dos Locais" : "Ver Detalhes dos Locais";
      (currentTrip?.days || []).forEach((_, idx) => locationsVisibleMap[idx] = allLocationsVisible);
      renderTripAccordion();
    });

    btnToggleAllLooks?.addEventListener("click", () => {
      allLooksVisible = !allLooksVisible;
      btnToggleAllLooksText.textContent = allLooksVisible ? "Ocultar Looks" : "Ver Looks";
      (currentTrip?.days || []).forEach((_, idx) => looksVisibleMap[idx] = allLooksVisible);
      renderTripAccordion();
    });

    // Top Nav buttons
    btnOpenMyTripsModal?.addEventListener("click", openSavedTripsModal);
    btnCloseSavedTripsModal?.addEventListener("click", closeSavedTripsModal);
    btnCloseChecklistModal?.addEventListener("click", closeChecklistModal);
    btnPrintTrip?.addEventListener("click", () => window.print());

    // Unified Picker Modal
    btnClosePickerModal?.addEventListener("click", closeUnifiedPickerModal);
    tabBtnOptionWardrobe?.addEventListener("click", () => switchPickerOption("wardrobe"));
    tabBtnOptionShopping?.addEventListener("click", () => switchPickerOption("shopping"));

    wardrobeSearchInput?.addEventListener("input", renderWardrobePickerGrid);
    wardrobeCategorySelect?.addEventListener("change", renderWardrobePickerGrid);

    subtabBtnGoogleShopping?.addEventListener("click", () => switchShoppingSubtab("google"));
    subtabBtnProductUrl?.addEventListener("click", () => switchShoppingSubtab("url"));
    subtabBtnCatalog?.addEventListener("click", () => switchShoppingSubtab("catalog"));

    btnSearchShopping?.addEventListener("click", handleExecuteShoppingSearch);
    shoppingQueryInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleExecuteShoppingSearch();
    });

    btnExtractProductUrl?.addEventListener("click", handleExtractProductFromUrl);
    manualProductUrlInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleExtractProductFromUrl();
    });

    // Swap period modal
    btnCloseSwapPeriodModal?.addEventListener("click", closeSwapPeriodModal);
    btnCancelSwapPeriod?.addEventListener("click", closeSwapPeriodModal);
    btnConfirmSwapPeriod?.addEventListener("click", handleConfirmSwapPeriod);

    // Location modal
    btnCloseLocationModal?.addEventListener("click", closeLocationModal);
    btnCancelLocationModal?.addEventListener("click", closeLocationModal);

    // AI Look modal
    initSpeechRecognition();
    voicePromptBtn?.addEventListener("click", toggleVoiceRecognition);
    btnCloseEditLookAiModal?.addEventListener("click", closeEditLookAiModal);
    btnCancelEditLookAi?.addEventListener("click", closeEditLookAiModal);
    btnSubmitEditLookAi?.addEventListener("click", handleExecuteLookAiRegeneration);

    document.querySelectorAll(".quick-prompt-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const txt = chip.textContent.trim();
        if (aiPromptInput) {
          aiPromptInput.value = aiPromptInput.value ? `${aiPromptInput.value}, ${txt}` : txt;
          aiPromptInput.focus();
        }
      });
    });

    // Image Zoom Modal listeners
    btnCloseZoomModal?.addEventListener("click", closeImageZoomModal);
    imageZoomModal?.addEventListener("click", closeImageZoomModal);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && imageZoomModal && !imageZoomModal.classList.contains("hidden")) {
        closeImageZoomModal();
      }
    });

    // Purchase Piece Modal listeners
    document.getElementById("btnClosePurchasePieceModal")?.addEventListener("click", closePurchasePieceModal);
    document.getElementById("btnCancelPurchasePiece")?.addEventListener("click", closePurchasePieceModal);
    document.getElementById("purchasePieceModal")?.addEventListener("click", closePurchasePieceModal);
    document.getElementById("purchasePieceForm")?.addEventListener("submit", handleConfirmPurchasePiece);

    // Auto-sync status with wardrobe when window regains focus (e.g. user returns from Roupeiro tab)
    window.addEventListener("focus", async () => {
      await refreshWardrobeItems();
      if (currentActiveView === "mala") {
        renderMalaView();
      } else {
        renderTripAccordion();
      }
    });
  }

  // Bootstrap
  initViagemPage();
})();
