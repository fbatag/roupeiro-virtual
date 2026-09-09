// Roupeiro Virtual — Frontend Logic
(function() {
  // Global & Local escapeHtml helper
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  window.escapeHtml = escapeHtml;

  // State
  let currentUser = null;
  let authToken = null;
  let googlePhotosAccessToken = sessionStorage.getItem("google_photos_access_token") || null;
  let wardrobeItems = [];
  let availableCategories = [];
  let selectedCategories = new Set(["Todas"]);
  let selectedPieceIds = new Set();
  let uploadTargetCategory = null;
  let selectedColor = "";
  let searchDebounceTimer = null;
  let googlePhotosList = [];
  let selectedGooglePhotos = new Set();
  let currentGeminiModel = "gemini-3.7-flash";
  let lastCategoryCounts = {};
  let draggedCategory = null;
  let pieceTripUsageMap = new Map();

  // DOM Elements
  const authContainer = document.getElementById("authContainer");
  const unauthControls = document.getElementById("unauthControls");
  const authControls = document.getElementById("authControls");
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const gateGoogleLoginBtn = document.getElementById("gateGoogleLoginBtn");
  const loginErrorMessage = document.getElementById("loginErrorMessage");
  const authLoadingScreen = document.getElementById("authLoadingScreen");
  const loginGateScreen = document.getElementById("loginGateScreen");
  const appProtectedContent = document.getElementById("appProtectedContent");
  const logoutBtn = document.getElementById("logoutBtn");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");

  const selectFilesBtn = document.getElementById("selectFilesBtn");
  const fileInput = document.getElementById("fileInput");
  const selectFolderBtn = document.getElementById("selectFolderBtn");
  const folderInput = document.getElementById("folderInput");
  const dropZone = document.getElementById("dropZone");

  const uploadProgressContainer = document.getElementById("uploadProgressContainer");
  const progressStatusText = document.getElementById("progressStatusText");
  const progressDetailText = document.getElementById("progressDetailText");
  const progressPercent = document.getElementById("progressPercent");
  const progressBar = document.getElementById("progressBar");

  const clothesGrid = document.getElementById("clothesGrid");
  const emptyState = document.getElementById("emptyState");
  const loadingGrid = document.getElementById("loadingGrid");
  const itemsCounterBadge = document.getElementById("itemsCounterBadge");
  const categoryTabsContainer = document.getElementById("categoryTabsContainer");
  const colorFilterSelect = document.getElementById("colorFilterSelect");
  const searchInput = document.getElementById("searchInput");
  const refreshBtn = document.getElementById("refreshBtn");
  const emptyUploadBtn = document.getElementById("emptyUploadBtn");

  const statTotalItems = document.getElementById("statTotalItems");
  const statCategories = document.getElementById("statCategories");

  // Edit Modal Elements
  const editModal = document.getElementById("editModal");
  const closeEditModalBtn = document.getElementById("closeEditModalBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const editForm = document.getElementById("editForm");
  const editItemId = document.getElementById("editItemId");
  const editTipo = document.getElementById("editTipo");
  const editCategoria = document.getElementById("editCategoria");
  const editCor = document.getElementById("editCor");
  const editCorPicker = document.getElementById("editCorPicker");
  const editCorHex = document.getElementById("editCorHex");
  const editDataAquisicao = document.getElementById("editDataAquisicao");
  const editDescricao = document.getElementById("editDescricao");
  const editEstilo = document.getElementById("editEstilo");
  const editEstacao = document.getElementById("editEstacao");
  const editIsGeneric = document.getElementById("editIsGeneric");
  const editQuantidade = document.getElementById("editQuantidade");
  const editNaoRepetir = document.getElementById("editNaoRepetir");
  const editStatusRoupa = document.getElementById("editStatusRoupa");
  const editImagePreview = document.getElementById("editImagePreview");
  const editTitlePreview = document.getElementById("editTitlePreview");
  const editFilenamePreview = document.getElementById("editFilenamePreview");

  // State for Color Sorting per Category (Requisito: ordenar peças por cor)
  const categoryColorSortMap = {}; // { [catName]: 'light_to_dark' | 'dark_to_light' | null }

  // Generic Item Modal Elements
  const openGenericItemModalBtn = document.getElementById("openGenericItemModalBtn");
  const newGenericItemModal = document.getElementById("newGenericItemModal");
  const closeNewGenericItemModalBtn = document.getElementById("closeNewGenericItemModalBtn");
  const cancelGenericItemBtn = document.getElementById("cancelGenericItemBtn");
  const genericItemForm = document.getElementById("genericItemForm");
  const genericItemTipo = document.getElementById("genericItemTipo");
  const genericItemCategoria = document.getElementById("genericItemCategoria");
  const genericItemQuantidade = document.getElementById("genericItemQuantidade");
  const btnQtyMinus = document.getElementById("btnQtyMinus");
  const btnQtyPlus = document.getElementById("btnQtyPlus");
  const genericItemCorPicker = document.getElementById("genericItemCorPicker");
  const genericItemCor = document.getElementById("genericItemCor");
  const genericItemNaoRepetir = document.getElementById("genericItemNaoRepetir");
  const genericItemDescricao = document.getElementById("genericItemDescricao");
  const btnInlineNewCategory = document.getElementById("btnInlineNewCategory");

  // New Category Modal Elements
  const openNewCategoryModalBtn = document.getElementById("openNewCategoryModalBtn");
  const newCategoryModal = document.getElementById("newCategoryModal");
  const closeNewCategoryModalBtn = document.getElementById("closeNewCategoryModalBtn");
  const cancelNewCategoryBtn = document.getElementById("cancelNewCategoryBtn");
  const newCategoryForm = document.getElementById("newCategoryForm");
  const newCategoryNameInput = document.getElementById("newCategoryNameInput");

  // Rename Category Modal Elements
  const renameCategoryModal = document.getElementById("renameCategoryModal");
  const closeRenameCategoryModalBtn = document.getElementById("closeRenameCategoryModalBtn");
  const cancelRenameCategoryBtn = document.getElementById("cancelRenameCategoryBtn");
  const renameCategoryForm = document.getElementById("renameCategoryForm");
  const renameCategoryOldNameInput = document.getElementById("renameCategoryOldNameInput");
  const renameCategoryNewNameInput = document.getElementById("renameCategoryNewNameInput");

  // Batch Operations & Direct Upload Category Elements
  const uploadTargetCategorySelect = document.getElementById("uploadTargetCategorySelect");
  const categorySpecificFileInput = document.getElementById("categorySpecificFileInput");

  const batchActionBar = document.getElementById("batchActionBar");
  const batchSelectedCount = document.getElementById("batchSelectedCount");
  const btnBatchSelectAll = document.getElementById("btnBatchSelectAll");
  const btnBatchMoveModal = document.getElementById("btnBatchMoveModal");
  const btnBatchDelete = document.getElementById("btnBatchDelete");
  const btnBatchClear = document.getElementById("btnBatchClear");

  const batchMoveModal = document.getElementById("batchMoveModal");
  const closeBatchMoveModalBtn = document.getElementById("closeBatchMoveModalBtn");
  const cancelBatchMoveBtn = document.getElementById("cancelBatchMoveBtn");
  const confirmBatchMoveBtn = document.getElementById("confirmBatchMoveBtn");
  const batchMoveCategorySelect = document.getElementById("batchMoveCategorySelect");
  const batchMoveCountText = document.getElementById("batchMoveCountText");

  // Google Photos Modal Elements
  const openGooglePhotosBtn = document.getElementById("openGooglePhotosBtn");
  const googlePhotosModal = document.getElementById("googlePhotosModal");
  const closeGooglePhotosModalBtn = document.getElementById("closeGooglePhotosModalBtn");
  const cancelPhotosImportBtn = document.getElementById("cancelPhotosImportBtn");
  const confirmPhotosImportBtn = document.getElementById("confirmPhotosImportBtn");
  const googlePhotosGrid = document.getElementById("googlePhotosGrid");
  const photosLoadingSpinner = document.getElementById("photosLoadingSpinner");
  const photosEmptyNotice = document.getElementById("photosEmptyNotice");
  const photosReauthBanner = document.getElementById("photosReauthBanner");
  const photosReauthBtn = document.getElementById("photosReauthBtn");
  const photosSelectedCount = document.getElementById("photosSelectedCount");
  const selectAllPhotosBtn = document.getElementById("selectAllPhotosBtn");
  const clearPhotosSelectionBtn = document.getElementById("clearPhotosSelectionBtn");

  // Look Builder Elements
  const openLookBuilderBtn = document.getElementById("openLookBuilderBtn");
  const lookBuilderModal = document.getElementById("lookBuilderModal");
  const closeLookBuilderBtn = document.getElementById("closeLookBuilderBtn");
  const selectLookTop = document.getElementById("selectLookTop");
  const selectLookBottom = document.getElementById("selectLookBottom");
  const selectLookShoes = document.getElementById("selectLookShoes");
  const lookSlotTop = document.getElementById("lookSlotTop");
  const lookSlotBottom = document.getElementById("lookSlotBottom");
  const lookSlotShoes = document.getElementById("lookSlotShoes");
  const randomizeLookBtn = document.getElementById("randomizeLookBtn");

  const openPackingTripBtn = document.getElementById("openPackingTripBtn");
  const openMyTripsHeaderBtn = document.getElementById("openMyTripsHeaderBtn");
  const openPackingModalBtn = document.getElementById("openPackingModalBtn");
  const viewSavedTripsBtn = document.getElementById("viewSavedTripsBtn");

  const savedTripsSelectorModal = document.getElementById("savedTripsSelectorModal");
  const closeSavedTripsSelectorBtn = document.getElementById("closeSavedTripsSelectorBtn");
  const closeSavedTripsSelectorFooterBtn = document.getElementById("closeSavedTripsSelectorFooterBtn");
  const savedTripsSelectorContainer = document.getElementById("savedTripsSelectorContainer");
  const planNewTripFromSelectorBtn = document.getElementById("planNewTripFromSelectorBtn");

  const packingModal = document.getElementById("packingModal");
  const closePackingModalBtn = document.getElementById("closePackingModalBtn");
  const cancelPackingBtn = document.getElementById("cancelPackingBtn");
  const packingForm = document.getElementById("packingForm");
  const packingDestination = document.getElementById("packingDestination");
  const packingArrivalDate = document.getElementById("packingArrivalDate");
  const packingArrivalTime = document.getElementById("packingArrivalTime");
  const packingDepartureDate = document.getElementById("packingDepartureDate");
  const packingDepartureTime = document.getElementById("packingDepartureTime");
  const packingNotes = document.getElementById("packingNotes");
  const packingLoadingOverlay = document.getElementById("packingLoadingOverlay");

  const tripViewerModal = document.getElementById("tripViewerModal");
  const closeTripViewerBtn = document.getElementById("closeTripViewerBtn");
  const tripViewerDestination = document.getElementById("tripViewerDestination");
  const tripViewerDaysBadge = document.getElementById("tripViewerDaysBadge");
  const tripViewerDates = document.getElementById("tripViewerDates");
  const tripViewerSummary = document.getElementById("tripViewerSummary");
  const tripDaysContainer = document.getElementById("tripDaysContainer");
  const tabBtnItinerary = document.getElementById("tabBtnItinerary");
  const tabBtnChecklist = document.getElementById("tabBtnChecklist");
  const tabBtnSavedTrips = document.getElementById("tabBtnSavedTrips");
  const tabContentItinerary = document.getElementById("tabContentItinerary");
  const tabContentChecklist = document.getElementById("tabContentChecklist");
  const tabContentSavedTrips = document.getElementById("tabContentSavedTrips");
  const packingChecklistItems = document.getElementById("packingChecklistItems");
  const tripPackingTips = document.getElementById("tripPackingTips");
  const tripEssentialsList = document.getElementById("tripEssentialsList");
  const printChecklistBtn = document.getElementById("printChecklistBtn");
  const startNewTripBtn = document.getElementById("startNewTripBtn");
  const savedTripsGrid = document.getElementById("savedTripsGrid");

  const editLookAiModal = document.getElementById("editLookAiModal");
  const closeEditLookAiModalBtn = document.getElementById("closeEditLookAiModalBtn");
  const cancelEditLookAiBtn = document.getElementById("cancelEditLookAiBtn");
  const submitEditLookAiBtn = document.getElementById("submitEditLookAiBtn");
  const editLookContextSubtitle = document.getElementById("editLookContextSubtitle");
  const editLookContextChip = document.getElementById("editLookContextChip");
  const aiPromptInput = document.getElementById("aiPromptInput");
  const voicePromptBtn = document.getElementById("voicePromptBtn");
  const voiceMicIcon = document.getElementById("voiceMicIcon");
  const voicePromptStatusText = document.getElementById("voicePromptStatusText");
  const editLookLoadingOverlay = document.getElementById("editLookLoadingOverlay");

  const swapPieceModal = document.getElementById("swapPieceModal");
  const closeSwapPieceModalBtn = document.getElementById("closeSwapPieceModalBtn");
  const swapPieceSubtitle = document.getElementById("swapPieceSubtitle");
  const swapSearchInput = document.getElementById("swapSearchInput");
  const swapCategoryFilter = document.getElementById("swapCategoryFilter");
  const swapPiecesGrid = document.getElementById("swapPiecesGrid");

  const swapPeriodModal = document.getElementById("swapPeriodModal");
  const closeSwapPeriodModalBtn = document.getElementById("closeSwapPeriodModalBtn");
  const cancelSwapPeriodBtn = document.getElementById("cancelSwapPeriodBtn");
  const confirmSwapPeriodBtn = document.getElementById("confirmSwapPeriodBtn");
  const swapSourcePeriodTitle = document.getElementById("swapSourcePeriodTitle");
  const swapSourcePeriodSummary = document.getElementById("swapSourcePeriodSummary");
  const swapTargetDaySelect = document.getElementById("swapTargetDaySelect");
  const swapPreviewBox = document.getElementById("swapPreviewBox");

  // Trip State
  let currentTrip = null;
  let userTrips = [];
  let currentEditLookContext = null;
  let currentSwapPieceContext = null;
  let activeSwapPeriodContext = null;
  let speechRecognition = null;
  let isRecordingVoice = false;

  // UI State Transitions for Auth Gate
  function showAuthLoading() {
    if (authLoadingScreen) authLoadingScreen.classList.remove("hidden");
    if (loginGateScreen) loginGateScreen.classList.add("hidden");
    if (appProtectedContent) appProtectedContent.classList.add("hidden");
    if (openLookBuilderBtn) openLookBuilderBtn.classList.add("hidden");
    if (openPackingTripBtn) openPackingTripBtn.classList.add("hidden");
    if (openMyTripsHeaderBtn) openMyTripsHeaderBtn.classList.add("hidden");
    unauthControls.classList.remove("hidden");
    authControls.classList.add("hidden");
  }

  function showLoginGate(errorMessage = null) {
    if (authLoadingScreen) authLoadingScreen.classList.add("hidden");
    if (loginGateScreen) loginGateScreen.classList.remove("hidden");
    if (appProtectedContent) appProtectedContent.classList.add("hidden");
    if (openLookBuilderBtn) openLookBuilderBtn.classList.add("hidden");
    if (openPackingTripBtn) openPackingTripBtn.classList.add("hidden");
    if (openMyTripsHeaderBtn) openMyTripsHeaderBtn.classList.add("hidden");
    unauthControls.classList.remove("hidden");
    authControls.classList.add("hidden");

    if (errorMessage && loginErrorMessage) {
      loginErrorMessage.textContent = errorMessage;
      loginErrorMessage.classList.remove("hidden");
    } else if (loginErrorMessage) {
      loginErrorMessage.classList.add("hidden");
    }
  }

  function showAuthenticatedApp(user) {
    if (authLoadingScreen) authLoadingScreen.classList.add("hidden");
    if (loginGateScreen) loginGateScreen.classList.add("hidden");
    if (appProtectedContent) appProtectedContent.classList.remove("hidden");
    if (openLookBuilderBtn) openLookBuilderBtn.classList.remove("hidden");
    if (openPackingTripBtn) openPackingTripBtn.classList.remove("hidden");
    if (openMyTripsHeaderBtn) openMyTripsHeaderBtn.classList.remove("hidden");
    unauthControls.classList.add("hidden");
    authControls.classList.remove("hidden");

    userName.textContent = user.displayName || user.email.split("@")[0];
    userEmail.textContent = user.email;
    userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=7c3aed&color=fff`;
  }

  // Token freshness helper
  async function getFreshAuthToken() {
    if (!currentUser && window.firebase && firebase.auth().currentUser) {
      currentUser = firebase.auth().currentUser;
    }
    if (!currentUser) return null;
    try {
      authToken = await currentUser.getIdToken();
      return authToken;
    } catch (e) {
      console.error("Token retrieval failed:", e);
      return authToken;
    }
  }

  // Authenticated Fetch Wrapper
  async function authFetch(url, options = {}) {
    const token = await getFreshAuthToken();
    if (!token) {
      showLoginGate("Autenticação necessária. Por favor, autentique-se com sua Conta Google.");
      throw new Error("No token available");
    }
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
      options.headers.set("Authorization", `Bearer ${token}`);
      options.headers.set("Cache-Control", "no-cache");
      options.headers.set("Pragma", "no-cache");
    } else {
      options.headers["Authorization"] = `Bearer ${token}`;
      options.headers["Cache-Control"] = "no-cache";
      options.headers["Pragma"] = "no-cache";
    }

    const res = await fetch(url, options);
    if (res.status === 401) {
      console.warn("API returned 401 Unauthorized:", url);
      if (window.firebase && firebase.auth().currentUser) {
        await firebase.auth().signOut();
      }
      showLoginGate("Sua sessão expirou. Por favor, faça login com sua Conta Google.");
      throw new Error("Unauthorized (401)");
    }
    return res;
  }

  let cachedFirebaseConfig = null;

  async function ensureFirebaseInitialized() {
    if (window.firebase && firebase.apps && firebase.apps.length > 0) {
      return true;
    }
    try {
      if (!cachedFirebaseConfig || !cachedFirebaseConfig.apiKey) {
        const resp = await fetch(`/api/config?_t=${Date.now()}`, { cache: "no-store" });
        const config = await resp.json();
        cachedFirebaseConfig = config.firebase;
      }
      if (window.firebase && cachedFirebaseConfig && cachedFirebaseConfig.apiKey) {
        if (!firebase.apps.length) {
          firebase.initializeApp(cachedFirebaseConfig);
        }
        return true;
      }
    } catch (e) {
      console.error("Failed to ensure Firebase initialization:", e);
    }
    return false;
  }

  // 1. App Initialization & Firebase Setup
  async function initApp() {
    showAuthLoading();
    try {
      const resp = await fetch(`/api/config?_t=${Date.now()}`, { cache: "no-store" });
      const config = await resp.json();
      cachedFirebaseConfig = config.firebase || null;
      availableCategories = config.categories || [];
      if (config.geminiModel) {
        currentGeminiModel = config.geminiModel;
      }

      // Initialize Firebase immediately before any DOM / UI setup
      if (window.firebase && cachedFirebaseConfig && cachedFirebaseConfig.apiKey) {
        if (!firebase.apps.length) {
          firebase.initializeApp(cachedFirebaseConfig);
        }

        // Handle redirect result if needed
        firebase.auth().getRedirectResult().then((result) => {
          if (result && result.credential && result.credential.accessToken) {
            googlePhotosAccessToken = result.credential.accessToken;
            sessionStorage.setItem("google_photos_access_token", googlePhotosAccessToken);
          }
        }).catch(err => {
          console.error("Redirect sign-in error:", err);
        });

        // Strict Firebase Authentication Listener
        firebase.auth().onAuthStateChanged(async (user) => {
          if (user) {
            currentUser = user;
            authToken = await user.getIdToken();
            showAuthenticatedApp(user);
            await loadWardrobe();
          } else {
            currentUser = null;
            authToken = null;
            showLoginGate();
          }
        });
      } else {
        showLoginGate("Configuração do Firebase não encontrada. Entre em contato com o suporte.");
      }

      // Populate category options
      updateCategorySelects();

      // Initialize Packing Feature
      initPackingFeature();

    } catch (err) {
      console.error("Initialization error:", err);
      showLoginGate("Erro ao carregar a aplicação. Por favor, recarregue a página.");
    }
  }

  // Google Login Flow
  async function signInWithGoogle() {
    if (!window.firebase) {
      alert("Firebase SDK não inicializado.");
      return;
    }
    try {
      if (loginErrorMessage) loginErrorMessage.classList.add("hidden");

      const initialized = await ensureFirebaseInitialized();
      if (!initialized || !firebase.apps.length) {
        showLoginGate("Erro ao autenticar com o Google: Configuração do Firebase não carregada. Recarregue a página.");
        return;
      }

      const provider = new firebase.auth.GoogleAuthProvider();
      // DO NOT request sensitive scopes (like photoslibrary) during initial login.
      // Accounts with Google Advanced Protection Program enabled will be blocked with
      // "Erro 400: policy_enforced" if sensitive scopes are requested on basic login.
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await firebase.auth().signInWithPopup(provider);
      if (result.credential && result.credential.accessToken && result.credential.scope && result.credential.scope.includes("photoslibrary")) {
        googlePhotosAccessToken = result.credential.accessToken;
        sessionStorage.setItem("google_photos_access_token", googlePhotosAccessToken);
      }
    } catch (err) {
      console.error("Google sign in error:", err);
      if (err.code === "auth/popup-blocked") {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await firebase.auth().signInWithRedirect(provider);
      } else if (err.code !== "auth/popup-closed-by-user") {
        showLoginGate("Erro ao autenticar com o Google: " + (err.message || err));
      }
    }
  }

  if (googleLoginBtn) googleLoginBtn.addEventListener("click", signInWithGoogle);
  if (gateGoogleLoginBtn) gateGoogleLoginBtn.addEventListener("click", signInWithGoogle);

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        if (window.firebase && firebase.auth().currentUser) {
          await firebase.auth().signOut();
        }
      } catch (err) {
        console.error("Logout error:", err);
      }
      currentUser = null;
      authToken = null;
      googlePhotosAccessToken = null;
      sessionStorage.removeItem("google_photos_access_token");
      localStorage.removeItem("roupeiro_guest_token");
      wardrobeItems = [];
      showLoginGate();
    });
  }

  // Trip Usage Helper (Requisito: Mostrar em quantos dias as peças estão sendo usadas no planejamento da viagem)
  async function loadUserTrips() {
    if (!currentUser) return;
    try {
      const resp = await authFetch("/api/trips");
      if (resp.ok) {
        const data = await resp.json();
        userTrips = data.trips || [];
        calculatePieceTripUsages();
        renderInlineTripsTable();
      }
    } catch (e) {
      console.warn("Could not load trips for wardrobe piece usage:", e);
    }
  }

  function calculatePieceTripUsages() {
    pieceTripUsageMap.clear();
    (userTrips || []).forEach(trip => {
      (trip.days || []).forEach((day, dayIdx) => {
        const dayNum = day.day_number || (dayIdx + 1);
        ["day_period", "night_period"].forEach(pKey => {
          const look = day[pKey]?.look;
          if (!look || !Array.isArray(look.items)) return;
          look.items.forEach(it => {
            if (!it.item_id) return;
            if (!pieceTripUsageMap.has(it.item_id)) {
              pieceTripUsageMap.set(it.item_id, {
                daysSet: new Set(),
                usages: [],
                tripDest: trip.destination || "Viagem"
              });
            }
            const info = pieceTripUsageMap.get(it.item_id);
            info.daysSet.add(dayNum);
            info.usages.push({
              dayNum,
              periodLabel: pKey === "day_period" ? "Diurno" : "Noturno"
            });
          });
        });
      });
    });
  }

  // ==========================================
  // SEÇÃO INLINE: GERENCIAMENTO DE PLANOS DE VESTUÁRIO (VIAGENS)
  // (Referência: guarda-roupas-virtual/admin.html)
  // ==========================================

  const inlineTripsSearchInput = document.getElementById("inlineTripsSearchInput");
  const btnRefreshInlineTrips = document.getElementById("btnRefreshInlineTrips");

  inlineTripsSearchInput?.addEventListener("input", () => renderInlineTripsTable());
  btnRefreshInlineTrips?.addEventListener("click", () => loadUserTrips());

  function formatInlineDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  function renderInlineTripsTable() {
    const tableBody = document.getElementById("inlineTripsTableBody");
    const countBadge = document.getElementById("inlineTripsCountBadge");
    const statTotal = document.getElementById("inlineStatTotalTrips");
    const statUniqueDest = document.getElementById("inlineStatUniqueDest");
    const statAvgDays = document.getElementById("inlineStatAvgDays");
    const statLocked = document.getElementById("inlineStatLockedTrips");

    if (!tableBody) return;

    const allTrips = userTrips || [];
    const searchQuery = (inlineTripsSearchInput?.value || "").trim().toLowerCase();
    const filteredTrips = allTrips.filter(t => {
      if (!searchQuery) return true;
      const dest = (t.destination || "").toLowerCase();
      return dest.includes(searchQuery);
    });

    // Update Summary Counters
    if (countBadge) countBadge.textContent = allTrips.length;
    if (statTotal) statTotal.textContent = allTrips.length;

    const uniqueDestSet = new Set(allTrips.map(t => (t.destination || "").trim().toLowerCase()).filter(Boolean));
    if (statUniqueDest) statUniqueDest.textContent = uniqueDestSet.size;

    const totalDaysSum = allTrips.reduce((acc, t) => acc + (t.total_days || (t.days ? t.days.length : 0) || 0), 0);
    const avgDays = allTrips.length > 0 ? Math.round(totalDaysSum / allTrips.length) : 0;
    if (statAvgDays) statAvgDays.textContent = `${avgDays} d`;

    const lockedCount = allTrips.filter(t => !!t.is_locked).length;
    if (statLocked) statLocked.textContent = lockedCount;

    if (filteredTrips.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="py-10 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center space-y-2">
              <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl">
                🧳
              </div>
              <p class="font-semibold text-slate-600">Nenhum plano de viagem encontrado</p>
              <p class="text-[11px] text-slate-400">Use o botão "Planejar Nova Viagem & Mala" acima para criar seu primeiro roteiro com IA.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filteredTrips.map(trip => {
      const isLocked = !!trip.is_locked;
      const totalDays = trip.total_days || (trip.days ? trip.days.length : 0);
      const datesText = `${formatInlineDate(trip.arrival_date)} → ${formatInlineDate(trip.departure_date)}`;

      // Calculate Mala progress stats
      let countWardrobe = 0;
      let countShopping = 0;
      let countMissing = 0;
      let countAttention = 0;
      const seenPieces = new Set();
      const seenShopping = new Set();

      (trip.days || []).forEach(day => {
        ["day_period", "night_period"].forEach(pKey => {
          const look = day[pKey]?.look;
          if (!look || !Array.isArray(look.items)) return;
          look.items.forEach(it => {
            const isShop = it.source_type === "shopping" || !!it.merchant || !!it.shopping_item_id;
            const isPlace = !!it.is_placeholder;
            if (isShop) {
              const sKey = `${it.tipo}_${it.original_url || it.thumbnail || ""}`;
              if (!seenShopping.has(sKey)) {
                seenShopping.add(sKey);
                countShopping++;
              }
            } else if (isPlace) {
              countMissing++;
            } else {
              const pid = it.item_id || it.id || `${it.tipo}_${it.original_url || ""}`;
              if (!seenPieces.has(pid)) {
                seenPieces.add(pid);
                countWardrobe++;
                const wPiece = wardrobeItems.find(w => String(w.id) === String(it.item_id || it.id));
                const st = (wPiece ? wPiece.status_roupa : it.status_roupa) || "Ok";
                if (st !== "Ok") countAttention++;
              }
            }
          });
        });
      });

      const totalUnits = countWardrobe + countShopping + countMissing;
      const readyUnits = Math.max(0, countWardrobe - countAttention);
      const readyPct = totalUnits > 0 ? Math.round((readyUnits / totalUnits) * 100) : 100;
      const totalPendencias = countMissing + countShopping + countAttention;

      return `
        <tr class="hover:bg-slate-50/90 transition group">
          <!-- 1. Destino & Estilo -->
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl ${isLocked ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'} flex items-center justify-center text-base font-bold shrink-0">
                ${isLocked ? '🔒' : '✈️'}
              </div>
              <div>
                <a href="/viagem?id=${encodeURIComponent(trip.id)}" class="font-bold text-slate-900 hover:text-blue-600 transition text-sm flex items-center gap-1.5">
                  <span>${escapeHtml(trip.destination || "Viagem Planejada")}</span>
                </a>
                <div class="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span>✨ IA Gemini</span>
                  <span>•</span>
                  <span>ID: ${escapeHtml(String(trip.id).slice(0, 8))}</span>
                </div>
              </div>
            </div>
          </td>

          <!-- 2. Período & Duração -->
          <td class="py-3.5 px-4">
            <div class="font-semibold text-slate-800">${escapeHtml(datesText)}</div>
            <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span>📅 ${totalDays} ${totalDays === 1 ? 'dia' : 'dias'}</span>
              <span>•</span>
              <span>Chegada ${escapeHtml(trip.arrival_time || '13:00')}</span>
            </div>
          </td>

          <!-- 3. Progresso & Status da Mala -->
          <td class="py-3.5 px-4">
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="font-bold ${totalPendencias === 0 ? 'text-emerald-700' : 'text-slate-700'}">
                ${readyUnits} de ${totalUnits} prontas • ${readyPct}%
              </span>
              <span class="font-extrabold ${totalPendencias === 0 ? 'text-emerald-600' : 'text-amber-600'}">
                ${totalPendencias === 0 ? '✓ Mala Pronta' : `${totalPendencias} pendência(s)`}
              </span>
            </div>
            <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
              <div class="${totalPendencias === 0 ? 'bg-emerald-500' : 'bg-blue-600'} h-full rounded-full transition-all" style="width: ${readyPct}%;"></div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">🚪 ${countWardrobe} acervo</span>
              ${countShopping > 0 ? `<span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold">🛍️ ${countShopping} a comprar</span>` : ''}
              ${(countMissing + countAttention) > 0 ? `<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">⚠️ ${countMissing + countAttention} pendentes</span>` : ''}
            </div>
          </td>

          <!-- 4. Ações do Plano -->
          <td class="py-3.5 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5 flex-wrap">
              <a href="/viagem?id=${encodeURIComponent(trip.id)}" class="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs" title="Abrir página da viagem e visão da mala">
                <span>👁️</span>
                <span>Abrir</span>
              </a>

              <button type="button" class="btn-inline-toggle-lock px-2.5 py-1.5 rounded-xl ${isLocked ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-bold text-[11px] transition flex items-center gap-1 shadow-2xs" data-trip-id="${trip.id}" data-locked="${isLocked}" title="${isLocked ? 'Desbloquear edição desta viagem' : 'Bloquear edição desta viagem'}">
                <span>${isLocked ? '🔓' : '🔒'}</span>
                <span>${isLocked ? 'Desbloquear' : 'Bloquear'}</span>
              </button>

              <button type="button" class="btn-inline-duplicate-trip px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs" data-trip-id="${trip.id}" title="Duplicar plano de viagem">
                <span>📋</span>
                <span>Duplicar</span>
              </button>

              ${!isLocked ? `
                <button type="button" class="btn-inline-delete-trip px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-[11px] transition flex items-center justify-center shadow-2xs" data-trip-id="${trip.id}" title="Excluir viagem">
                  <span>🗑️</span>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Attach listeners to inline table buttons
    tableBody.querySelectorAll(".btn-inline-toggle-lock").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tid = btn.dataset.tripId;
        const curLocked = btn.dataset.locked === "true";
        await handleToggleLockTrip(tid, !curLocked);
      });
    });

    tableBody.querySelectorAll(".btn-inline-duplicate-trip").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tid = btn.dataset.tripId;
        await handleDuplicateTrip(tid);
      });
    });

    tableBody.querySelectorAll(".btn-inline-delete-trip").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tid = btn.dataset.tripId;
        await handleDeleteInlineTrip(tid);
      });
    });
  }

  async function handleToggleLockTrip(tripId, newLockedState) {
    try {
      const resp = await authFetch(`/api/trips/${tripId}/lock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: newLockedState })
      });
      if (!resp.ok) throw new Error("Falha ao atualizar bloqueio da viagem");
      const target = userTrips.find(t => t.id === tripId);
      if (target) target.is_locked = newLockedState;
      renderInlineTripsTable();
    } catch (err) {
      console.error("Erro ao alternar bloqueio:", err);
      alert("Não foi possível alterar o status de bloqueio da viagem.");
    }
  }

  async function handleDuplicateTrip(tripId) {
    try {
      const resp = await authFetch(`/api/trips/${tripId}/duplicate`, {
        method: "POST"
      });
      if (!resp.ok) throw new Error("Falha ao duplicar viagem");
      await loadUserTrips();
    } catch (err) {
      console.error("Erro ao duplicar viagem:", err);
      alert("Não foi possível duplicar a viagem.");
    }
  }

  async function handleDeleteInlineTrip(tripId) {
    const trip = userTrips.find(t => t.id === tripId);
    if (trip && trip.is_locked) {
      alert("Esta viagem está com edição bloqueada. Desbloqueie primeiro para excluir.");
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir a viagem "${trip?.destination || 'selecionada'}"?`)) return;
    try {
      const resp = await authFetch(`/api/trips/${tripId}`, {
        method: "DELETE"
      });
      if (!resp.ok) throw new Error("Falha ao excluir viagem");
      userTrips = userTrips.filter(t => t.id !== tripId);
      calculatePieceTripUsages();
      renderInlineTripsTable();
    } catch (err) {
      console.error("Erro ao excluir viagem:", err);
      alert("Não foi possível excluir a viagem.");
    }
  }

  // 2. Fetch & Render Wardrobe
  async function loadWardrobe() {
    if (!currentUser) return;
    loadingGrid.classList.remove("hidden");
    clothesGrid.classList.add("hidden");
    emptyState.classList.add("hidden");

    try {
      const params = new URLSearchParams();
      if (selectedCategories.size > 0 && !selectedCategories.has("Todas")) {
        params.append("category", Array.from(selectedCategories).join(","));
      }
      if (selectedColor) params.append("color", selectedColor);
      if (searchInput.value.trim()) params.append("search", searchInput.value.trim());
      params.append("_t", Date.now().toString());

      const res = await authFetch(`/api/clothes?${params.toString()}`);
      const data = await res.json();
      wardrobeItems = data.items || [];

      // Carregar viagens e estatísticas antes de renderizar para ter todas as categorias e peças prontas
      await loadUserTrips();
      await updateSummaryStats();
      renderWardrobe();
    } catch (err) {
      console.error("Error loading wardrobe items:", err);
    } finally {
      loadingGrid.classList.add("hidden");
      // Note: clothesGrid and emptyState visibility are correctly handled by renderWardrobe()
    }
  }

  async function updateSummaryStats() {
    try {
      const res = await authFetch("/api/wardrobe/summary");
      const summary = await res.json();

      statTotalItems.textContent = summary.total_items || 0;
      statCategories.textContent = Object.keys(summary.categories || {}).length;
      itemsCounterBadge.textContent = summary.total_items || 0;

      // Sync custom user categories in saved order if returned
      if (summary.user_categories && Array.isArray(summary.user_categories)) {
        availableCategories = [...summary.user_categories];
        updateCategorySelects();
      }

      // Populate category tabs with counts
      renderCategoryTabs(summary.categories || {});

      // Populate color filter options
      renderColorFilter(summary.colors || {});
    } catch (err) {
      console.error("Error updating stats:", err);
    }
  }

  function updateCategorySelects() {
    const optionsHtml = availableCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    if (editCategoria) {
      const current = editCategoria.value;
      editCategoria.innerHTML = optionsHtml;
      if (current && availableCategories.includes(current)) editCategoria.value = current;
    }
    if (genericItemCategoria) {
      const current = genericItemCategoria.value;
      genericItemCategoria.innerHTML = optionsHtml;
      if (current && availableCategories.includes(current)) genericItemCategoria.value = current;
    }
    if (swapCategoryFilter) {
      const current = swapCategoryFilter.value;
      swapCategoryFilter.innerHTML = `<option value="">Todas as Categorias</option>` + 
        availableCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      if (current) swapCategoryFilter.value = current;
    }
    if (uploadTargetCategorySelect) {
      const current = uploadTargetCategorySelect.value;
      uploadTargetCategorySelect.innerHTML = `<option value="">Classificação Automática (IA Gemini)</option>` +
        availableCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      if (current && availableCategories.includes(current)) uploadTargetCategorySelect.value = current;
    }
    if (batchMoveCategorySelect) {
      const current = batchMoveCategorySelect.value;
      batchMoveCategorySelect.innerHTML = availableCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      if (current && availableCategories.includes(current)) batchMoveCategorySelect.value = current;
    }
  }

  function getCategoryIcon(catName) {
    const cat = (catName || "").toLowerCase();
    if (cat.includes("superior") || cat.includes("camiseta") || cat.includes("camisa") || cat.includes("blusa")) return "👕";
    if (cat.includes("inferior") || cat.includes("calça") || cat.includes("shorts") || cat.includes("bermuda") || cat.includes("saia")) return "👖";
    if (cat.includes("calçado") || cat.includes("sapato") || cat.includes("tênis") || cat.includes("sandália") || cat.includes("bota")) return "👟";
    if (cat.includes("casaco") || cat.includes("jaqueta") || cat.includes("sobreposição") || cat.includes("malha") || cat.includes("blazer")) return "🧥";
    if (cat.includes("praia") || cat.includes("sunga") || cat.includes("biquíni") || cat.includes("maiô")) return "🏖️";
    if (cat.includes("íntima") || cat.includes("cueca") || cat.includes("calcinha") || cat.includes("meia")) return "🧦";
    if (cat.includes("acessório") || cat.includes("óculos") || cat.includes("bolsa") || cat.includes("relógio") || cat.includes("cinto")) return "🕶️";
    if (cat.includes("vestido") || cat.includes("macacão") || cat.includes("única")) return "👗";
    return "🏷️";
  }

  function renderCategoryTabs(categoryCounts) {
    if (categoryCounts) lastCategoryCounts = categoryCounts;
    const totalCount = statTotalItems.textContent || 0;
    const categories = ["Todas", ...availableCategories];

    categoryTabsContainer.innerHTML = categories.map(cat => {
      const isSelected = (cat === "Todas") ? selectedCategories.has("Todas") : selectedCategories.has(cat);
      const count = cat === "Todas" ? totalCount : (lastCategoryCounts[cat] || 0);
      const isDraggable = (cat !== "Todas");
      const activeClasses = isSelected
        ? "bg-[#0b57d0] text-white shadow-sm font-semibold ring-2 ring-[#0b57d0]/30"
        : "bg-white text-[#444746] hover:bg-[#f1f4f9] border border-[#e0e2ec]";

      let tripCount = 0;
      if (cat === "Todas") {
        tripCount = Array.from(pieceTripUsageMap.keys()).length;
      } else {
        wardrobeItems.filter(i => (i.categoria || "Outros") === cat).forEach(it => {
          if (pieceTripUsageMap.has(it.id)) tripCount++;
        });
      }

      const emoji = cat === "Todas" ? "🌈" : getCategoryIcon(cat);

      return `
        <button type="button" draggable="${isDraggable}" data-category="${escapeHtml(cat)}" class="category-tab ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition select-none ${activeClasses}" title="${isDraggable ? 'Clique para selecionar/deselecionar filtro ou arraste para ordenar' : 'Ver todas as peças'}">
          ${isDraggable ? '<span class="text-[10px] opacity-60 mr-0.5">⠿</span>' : ''}
          <span>${emoji}</span>
          <span>${escapeHtml(cat)}</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-[#0842a0] text-white' : 'bg-[#f1f4f9] text-[#444746]'}">${count}</span>
          ${tripCount > 0 ? `
            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold ${isSelected ? 'bg-[#041e49] text-[#d3e3fd]' : 'bg-[#edf2fa] text-[#0b57d0]'} flex items-center gap-0.5" title="${tripCount} peças planejadas na viagem">
              <span>✈️</span>
              <span>${tripCount}</span>
            </span>
          ` : ''}
          ${(cat !== "Todas" && count === 0) ? `
            <span class="btn-delete-empty-cat-tab ml-1 w-4 h-4 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition inline-flex items-center justify-center text-[9px]" data-category="${escapeHtml(cat)}" title="Excluir categoria vazia">
              🗑️
            </span>
          ` : ''}
        </button>
      `;
    }).join("");

    // Attach click and drag events
    categoryTabsContainer.querySelectorAll(".category-tab").forEach(btn => {
      const cat = btn.dataset.category;

      btn.addEventListener("click", (e) => {
        // Direct click on empty category delete trash icon
        if (e.target.closest(".btn-delete-empty-cat-tab")) {
          e.stopPropagation();
          handleDeleteCategory(cat);
          return;
        }

        if (cat === "Todas") {
          // Requisito: Clicar em "Todas" seleciona todas as categorias
          selectedCategories.clear();
          selectedCategories.add("Todas");
        } else {
          // Requisito: Selecionar mais de uma categoria no filtro. Clicar de novo de-seleciona ela.
          if (selectedCategories.has("Todas")) {
            selectedCategories.delete("Todas");
          }
          if (selectedCategories.has(cat)) {
            selectedCategories.delete(cat);
            if (selectedCategories.size === 0) {
              selectedCategories.add("Todas");
            }
          } else {
            selectedCategories.add(cat);
          }
        }
        renderCategoryTabs(lastCategoryCounts);
        loadWardrobe();
      });

      if (cat !== "Todas") {
        btn.addEventListener("dragstart", (e) => {
          draggedCategory = cat;
          e.dataTransfer.setData("text/plain", cat);
          btn.classList.add("opacity-40");
        });

        btn.addEventListener("dragend", () => {
          btn.classList.remove("opacity-40");
          categoryTabsContainer.querySelectorAll(".category-tab").forEach(el => {
            el.classList.remove("ring-2", "ring-brand-500", "scale-105");
          });
        });

        btn.addEventListener("dragover", (e) => {
          e.preventDefault();
          if (draggedCategory && draggedCategory !== cat) {
            btn.classList.add("ring-2", "ring-brand-500", "scale-105");
          }
        });

        btn.addEventListener("dragleave", () => {
          btn.classList.remove("ring-2", "ring-brand-500", "scale-105");
        });

        btn.addEventListener("drop", async (e) => {
          e.preventDefault();
          btn.classList.remove("ring-2", "ring-brand-500", "scale-105");
          if (draggedCategory && cat !== "Todas" && draggedCategory !== cat) {
            const fromIdx = availableCategories.indexOf(draggedCategory);
            const toIdx = availableCategories.indexOf(cat);
            if (fromIdx !== -1 && toIdx !== -1) {
              availableCategories.splice(fromIdx, 1);
              availableCategories.splice(toIdx, 0, draggedCategory);

              // Persist category order to backend
              authFetch("/api/categories/order", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categories: availableCategories })
              }).catch(err => console.error("Error saving category order:", err));

              updateCategorySelects();
              renderCategoryTabs(lastCategoryCounts);
              renderWardrobe();
            }
          }
          draggedCategory = null;
        });
      }
    });
  }

  function renderColorFilter(colorsMap) {
    const currentVal = colorFilterSelect.value;
    colorFilterSelect.innerHTML = `<option value="">Todas as Cores</option>` + 
      Object.keys(colorsMap).map(c => `
        <option value="${escapeHtml(c)}" ${currentVal === c ? 'selected' : ''}>${escapeHtml(c)} (${colorsMap[c]})</option>
      `).join("");
  }

  // Color Luminance Calculation for Sorting Pieces (Requisito: ordenar peças por cor)
  function getColorLuminance(item) {
    const hex = (item.cor_hex || "").trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
      const cleanHex = hex.replace("#", "");
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    }
    if (/^#?[0-9a-fA-F]{3}$/.test(hex)) {
      const cleanHex = hex.replace("#", "");
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const name = (item.cor_predominante || "").toLowerCase().trim();
    const colorRank = {
      "branco": 255, "branca": 255, "off-white": 250, "marfim": 245, "gelo": 240,
      "amarelo": 230, "amarela": 230, "bege": 220, "creme": 220, "dourado": 210,
      "cinza claro": 200, "prata": 195, "areia": 190,
      "rosa": 180, "rosa claro": 185, "salmão": 175, "lilás": 170, "lilas": 170,
      "azul claro": 165, "verde claro": 160, "turquesa": 155,
      "laranja": 150, "coral": 140, "mostarda": 130,
      "vermelho": 115, "vermelha": 115, "pink": 110,
      "verde": 95, "musgo": 85, "oliva": 80,
      "azul": 80, "azul royal": 75, "azul petróleo": 70, "petróleo": 70,
      "roxo": 65, "violeta": 60, "vinho": 55, "bordô": 50,
      "marrom": 50, "castanho": 45, "caramelo": 80,
      "cinza": 90, "cinza escuro": 40, "chumbo": 35,
      "azul marinho": 25, "marinho": 25,
      "preto": 5, "preta": 5
    };
    for (const [key, val] of Object.entries(colorRank)) {
      if (name.includes(key)) return val;
    }
    return 128;
  }

  // Piece Status Configuration Helper (Requisito: Status Ok, Passar, Lavar, Lavanderia, Emprestada, Achar com ícones ilustrativos)
  function getPieceStatusInfo(status) {
    switch (status) {
      case "Passar":
        return {
          label: "Passar",
          description: "Passar a ferro",
          iconHtml: `<span>♨️</span>`,
          iconFa: "♨️",
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
          iconFa: "🫧",
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
          iconFa: "🧼",
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
          iconFa: "🤝",
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
          iconFa: "🔍",
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
          iconFa: "✅",
          bg: "bg-emerald-50",
          text: "text-emerald-800",
          border: "border-emerald-300",
          dot: "bg-emerald-500",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300"
        };
    }
  }

  // Quick API update for piece status
  async function updatePieceStatus(itemId, newStatus) {
    try {
      const resp = await authFetch(`/api/clothes/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_roupa: newStatus })
      });
      if (!resp.ok) {
        throw new Error("Erro ao atualizar status da peça");
      }
      const updated = await resp.json();
      const localItem = wardrobeItems.find(i => i.id === itemId);
      if (localItem) localItem.status_roupa = newStatus;
      return updated;
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar o novo status da peça.");
    }
  }

  function renderGarmentCard(item) {
    const isGeneric = Boolean(item.is_generic);
    const imageUrl = item.original_url || item.cutout_url;
    const formattedDate = item.data_aquisicao ? formatDate(item.data_aquisicao) : "Sem data";
    const colorHex = item.cor_hex || "#64748b";
    const qty = parseInt(item.quantidade) || 1;
    const naoRepetir = Boolean(item.nao_repetir);
    const isSelected = selectedPieceIds.has(item.id);
    const statusRoupa = item.status_roupa || "Ok";
    const statusInfo = getPieceStatusInfo(statusRoupa);
    const tripUsage = pieceTripUsageMap.get(item.id);

    let visualContent = "";
    if (imageUrl) {
      visualContent = `
        <div class="relative h-48 sm:h-52 bg-slate-50 p-3 flex items-center justify-center overflow-hidden border-b border-slate-100">
          <!-- Multi-select Checkbox (Requisito: selecionar várias peças) -->
          <div class="absolute top-2 left-2 z-20" onclick="event.stopPropagation()">
            <input type="checkbox" class="piece-select-checkbox w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer shadow-xs" data-id="${item.id}" ${isSelected ? 'checked' : ''} title="Selecionar peça">
          </div>

          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.tipo)}" class="garment-img max-h-40 sm:max-h-44 max-w-full object-contain transition group-hover:scale-105 duration-200" title="Clique para detalhes">

          <span class="absolute top-2 left-8 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-slate-800 shadow-2xs border border-slate-200/80">
            ${escapeHtml(item.categoria)}
          </span>

          <div class="absolute top-2 right-2 flex flex-col items-end gap-1">
            ${qty > 1 ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-2xs" title="Quantidade disponível">
                x${qty}
              </span>
            ` : ''}
            ${naoRepetir ? `
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs" title="Não repetir em mais de um dia">
                1x/dia
              </span>
            ` : ''}
          </div>

          <!-- Status Badge on Image (Requisito: Ícone ilustrativo para os status; omitir texto "Ok" quando status for "Ok") -->
          <span class="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold border shadow-xs ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} flex items-center gap-1 z-10" title="${statusInfo.description}">
            ${statusInfo.iconHtml}
            ${statusRoupa !== 'Ok' ? `<span>${statusInfo.label}</span>` : ''}
          </span>

          <div class="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button type="button" class="edit-btn w-7 h-7 rounded-lg bg-white/95 text-slate-600 hover:text-[#0b57d0] shadow-sm border border-[#e0e2ec] flex items-center justify-center transition text-xs" title="Editar Peça (Alterar dados e status)">
              ✏️
            </button>
            <button type="button" class="delete-btn w-7 h-7 rounded-lg bg-white/95 text-slate-600 hover:text-red-600 shadow-sm border border-[#e0e2ec] flex items-center justify-center transition text-xs" title="Excluir Peça">
              🗑️
            </button>
          </div>
        </div>
      `;
    } else {
      visualContent = `
        <div class="relative h-48 sm:h-52 bg-gradient-to-br from-[#f8fafd] to-[#f1f4f9] p-3 flex flex-col items-center justify-center overflow-hidden border-b border-[#e0e2ec]">
          <!-- Multi-select Checkbox -->
          <div class="absolute top-2 left-2 z-20" onclick="event.stopPropagation()">
            <input type="checkbox" class="piece-select-checkbox w-4 h-4 rounded text-[#0b57d0] focus:ring-[#0b57d0] border-slate-300 cursor-pointer shadow-xs" data-id="${item.id}" ${isSelected ? 'checked' : ''} title="Selecionar peça">
          </div>

          <div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border border-white/80 mb-2 transition group-hover:scale-110 duration-200 text-2xl" style="background-color: ${colorHex}18">
            <span>${getCategoryIcon(item.categoria)}</span>
          </div>
          <span class="text-[9px] font-bold text-[#444746] uppercase tracking-wider">Item Básico</span>

          <span class="absolute top-2 left-8 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-[#1f1f1f] shadow-2xs border border-[#e0e2ec]">
            ${getCategoryIcon(item.categoria)} ${escapeHtml(item.categoria)}
          </span>

          <div class="absolute top-2 right-2 flex flex-col items-end gap-1">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fbbc04] text-[#1f1f1f] shadow-2xs" title="Quantidade disponível">
              Qtd: ${qty}
            </span>
            ${naoRepetir ? `
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#edf2fa] text-[#0b57d0] border border-[#c2d7fa] shadow-2xs" title="Não repetir em mais de um dia">
                1x/dia
              </span>
            ` : ''}
          </div>

          <!-- Status Badge on Image -->
          <span class="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold border shadow-xs ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} flex items-center gap-1 z-10" title="${statusInfo.description}">
            ${statusInfo.iconHtml}
            ${statusRoupa !== 'Ok' ? `<span>${statusInfo.label}</span>` : ''}
          </span>

          <div class="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button type="button" class="edit-btn w-7 h-7 rounded-lg bg-white/95 text-slate-600 hover:text-[#0b57d0] shadow-sm border border-[#e0e2ec] flex items-center justify-center transition text-xs" title="Editar Peça (Alterar dados e status)">
              ✏️
            </button>
            <button type="button" class="delete-btn w-7 h-7 rounded-lg bg-white/95 text-slate-600 hover:text-red-600 shadow-sm border border-[#e0e2ec] flex items-center justify-center transition text-xs" title="Excluir Peça">
              🗑️
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="garment-card bg-white rounded-2xl border border-[#e0e2ec] overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group relative cursor-pointer ${isSelected ? 'ring-2 ring-[#0b57d0] border-[#0b57d0]' : ''}" data-id="${item.id}">
        ${visualContent}
        
        <div class="p-3 flex-1 flex flex-col justify-between space-y-2">
          <div>
            <h4 class="text-xs font-bold text-[#1f1f1f] leading-snug line-clamp-1" title="${escapeHtml(item.tipo)}">${escapeHtml(item.tipo)}</h4>
            <p class="text-[11px] text-[#444746] mt-0.5 line-clamp-2 leading-relaxed">
              ${escapeHtml(item.descricao || (isGeneric ? `Item básico com ${qty} unidade(s)` : "Sem descrição informada."))}
            </p>
          </div>

          <div class="pt-2 border-t border-[#e0e2ec] flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5" title="Cor Predominante">
              <span class="w-3 h-3 rounded-full border border-slate-300 shadow-inner flex-shrink-0" style="background-color: ${colorHex}"></span>
              <span class="text-[#1f1f1f] font-medium text-[10px] truncate max-w-[80px]">${escapeHtml(item.cor_predominante)}</span>
            </div>

            ${isGeneric ? `
              <span class="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                ${qty} un
              </span>
            ` : `
              <div class="flex items-center gap-1 text-[10px] text-[#444746] hover:text-[#0b57d0] cursor-pointer edit-date-trigger" title="Data de Aquisição">
                <span>🗓️</span>
                <span>${formattedDate}</span>
              </div>
            `}
          </div>

          <!-- Planejamento da Viagem -->
          ${tripUsage && tripUsage.daysSet.size > 0 ? `
            <div class="bg-[#edf2fa] border border-[#c2d7fa] rounded-xl p-2 text-[10px] text-[#0b57d0] leading-tight">
              <div class="flex items-center justify-between font-bold text-[#0842a0] mb-0.5">
                <span class="flex items-center gap-1">
                  <span>✈️</span>
                  <span>Na Viagem:</span>
                </span>
                <span class="bg-[#d3e3fd] text-[#041e49] px-1.5 py-0.2 rounded-full font-extrabold text-[9px]">
                  ${tripUsage.daysSet.size} ${tripUsage.daysSet.size === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <span class="text-[#0b57d0] font-medium text-[10px] block truncate" title="${Array.from(tripUsage.daysSet).sort((a,b) => a-b).map(d => `Dia ${d}`).join(', ')}">
                Usada em: ${Array.from(tripUsage.daysSet).sort((a,b) => a-b).map(d => `Dia ${d}`).join(", ")}
              </span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function updateBatchActionBar() {
    if (!batchActionBar) return;
    const count = selectedPieceIds.size;
    if (count > 0) {
      batchActionBar.classList.remove("hidden");
      if (batchSelectedCount) batchSelectedCount.textContent = count;
    } else {
      batchActionBar.classList.add("hidden");
    }
  }

  function renderWardrobe() {
    clothesGrid.innerHTML = "";

    const totalCount = wardrobeItems.length;
    const isShowingAll = selectedCategories.has("Todas");

    // Only show global empty state if user has 0 items across whole wardrobe and 0 categories
    if (totalCount === 0 && (!availableCategories || availableCategories.length === 0)) {
      clothesGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    clothesGrid.classList.remove("hidden");

    // Determine categories to show:
    // When "Todas": ALL categories from availableCategories (plus any extras from wardrobe items)
    // When specific categories selected: exact list of selectedCategories in availableCategories order!
    let categoriesToShow = [];
    if (isShowingAll) {
      categoriesToShow = [...availableCategories];
      const presentCats = new Set(wardrobeItems.map(i => i.categoria || "Outros"));
      for (const c of presentCats) {
        if (!categoriesToShow.includes(c)) categoriesToShow.push(c);
      }
    } else {
      categoriesToShow = availableCategories.filter(c => selectedCategories.has(c));
      for (const c of selectedCategories) {
        if (!categoriesToShow.includes(c)) categoriesToShow.push(c);
      }
    }

    let sectionsHtml = "";

    for (const catName of categoriesToShow) {
      const itemsInCat = wardrobeItems.filter(i => (i.categoria || "Outros") === catName);
      // Sort by color brightness if active for this category (Requisito: ordenar peças por cor)
      const sortMode = categoryColorSortMap[catName];
      if (sortMode === 'light_to_dark') {
        itemsInCat.sort((a, b) => getColorLuminance(b) - getColorLuminance(a));
      } else if (sortMode === 'dark_to_light') {
        itemsInCat.sort((a, b) => getColorLuminance(a) - getColorLuminance(b));
      }

      const count = itemsInCat.length;
      const allInCatSelected = count > 0 && itemsInCat.every(i => selectedPieceIds.has(i.id));

      // Trip usage calculation for this category
      let catTripPiecesCount = 0;
      const catTripDaysSet = new Set();
      itemsInCat.forEach(it => {
        const u = pieceTripUsageMap.get(it.id);
        if (u && u.daysSet.size > 0) {
          catTripPiecesCount++;
          u.daysSet.forEach(d => catTripDaysSet.add(d));
        }
      });

      const cardsHtml = count > 0
        ? itemsInCat.map(renderGarmentCard).join("")
        : `
          <div class="col-span-full py-8 text-center bg-white rounded-2xl border border-dashed border-[#c4c7c5] p-6 space-y-2">
            <p class="text-xs text-[#1f1f1f] font-medium">Nenhuma peça nesta categoria ainda.</p>
            <p class="text-[11px] text-[#444746]">Adicione fotos diretamente nesta categoria, adicione um item básico ou exclua a categoria vazia.</p>
            <div class="flex items-center justify-center gap-2 pt-2 flex-wrap">
              <button type="button" class="btn-add-photo-in-cat gc-btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5" data-category="${escapeHtml(catName)}" title="Adicionar fotos diretamente nesta categoria">
                <span>📸</span>
                <span>+ Adicionar Foto</span>
              </button>
              <button type="button" class="btn-add-generic-in-cat gc-btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5" data-category="${escapeHtml(catName)}" title="Adicionar item básico">
                <span>🧦</span>
                <span>+ Item Básico</span>
              </button>
              <button type="button" class="btn-delete-cat px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 transition" data-category="${escapeHtml(catName)}" title="Excluir categoria vazia">
                <span>🗑️</span>
                <span>Excluir Categoria</span>
              </button>
            </div>
          </div>
        `;

      sectionsHtml += `
        <section class="category-section bg-white rounded-3xl p-5 border border-[#e0e2ec] shadow-sm" data-category="${escapeHtml(catName)}">
          <!-- Category Section Header -->
          <div class="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e0e2ec] flex-wrap gap-2">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[#edf2fa] border border-[#c2d7fa] flex items-center justify-center text-lg shadow-2xs">
                <span>${getCategoryIcon(catName)}</span>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-base font-bold text-[#1f1f1f]">${escapeHtml(catName)}</h3>
                  <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${count === 0 ? 'bg-amber-100 text-amber-800' : 'bg-[#f1f4f9] text-[#1f1f1f]'}">${count} ${count === 1 ? 'peça' : 'peças'}</span>
                  ${catTripPiecesCount > 0 ? `
                    <span class="text-[11px] font-semibold text-[#0b57d0] bg-[#edf2fa] border border-[#c2d7fa] px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Peças desta categoria planejadas na viagem">
                      <span>✈️</span>
                      <span>${catTripPiecesCount} na viagem (${catTripDaysSet.size} ${catTripDaysSet.size === 1 ? 'dia' : 'dias'})</span>
                    </span>
                  ` : ''}
                </div>
                <p class="text-[11px] text-[#444746] mt-0.5">Peças organizadas por categoria ✨</p>
              </div>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <!-- Ordenar por cor dentro da categoria -->
              ${count > 1 ? `
                <button type="button" class="btn-sort-color gc-btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1.5" data-category="${escapeHtml(catName)}" title="Ordenar peças por tom de cor (clara ➔ escura ou escura ➔ clara)">
                  <span>🎨</span>
                  <span>${sortMode === 'light_to_dark' ? 'Mais Claras' : (sortMode === 'dark_to_light' ? 'Mais Escuras' : 'Ordenar Cor')}</span>
                </button>
              ` : ''}

              <!-- Selecionar ou deselecionar todas as peças da categoria -->
              ${count > 0 ? `
                <button type="button" class="btn-toggle-select-cat gc-btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1.5" data-category="${escapeHtml(catName)}" title="${allInCatSelected ? 'Desmarcar todas as peças desta categoria' : 'Selecionar todas as peças desta categoria'}">
                  <span>${allInCatSelected ? '☑️' : '⬜'}</span>
                  <span>${allInCatSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}</span>
                </button>
              ` : ''}

              <!-- Adicionar fotos diretamente a uma categoria -->
              <button type="button" class="btn-add-photo-in-cat gc-btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5" data-category="${escapeHtml(catName)}" title="Adicionar fotos diretamente nesta categoria (ignora classificação automática do Gemini)">
                <span>📸</span>
                <span>+ Foto</span>
              </button>
              <button type="button" class="btn-add-generic-in-cat gc-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5" data-category="${escapeHtml(catName)}" title="Adicionar item básico nesta categoria">
                <span>➕</span>
                <span>+ Básico</span>
              </button>
              <button type="button" class="btn-rename-cat gc-btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1.5" data-category="${escapeHtml(catName)}" title="Alterar nome da categoria">
                <span>✏️</span>
                <span>Renomear</span>
              </button>
              <!-- Excluir categoria sem nenhuma peça -->
              ${count === 0 ? `
                <button type="button" class="btn-delete-cat px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition" data-category="${escapeHtml(catName)}" title="Excluir categoria vazia">
                  <span>🗑️</span>
                  <span>Excluir</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Garment Cards Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            ${cardsHtml}
          </div>
        </section>
      `;
    }

    if (!sectionsHtml) {
      clothesGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    clothesGrid.innerHTML = sectionsHtml;

    // Attach card event listeners and multi-select checkbox listeners
    clothesGrid.querySelectorAll(".garment-card").forEach(card => {
      const id = card.dataset.id;
      const item = wardrobeItems.find(i => i.id === id);
      if (!item) return;

      // Card checkbox change
      card.querySelector(".piece-select-checkbox")?.addEventListener("change", (e) => {
        e.stopPropagation();
        if (e.target.checked) {
          selectedPieceIds.add(id);
          card.classList.add("ring-2", "ring-brand-500", "border-brand-500");
        } else {
          selectedPieceIds.delete(id);
          card.classList.remove("ring-2", "ring-brand-500", "border-brand-500");
        }
        updateBatchActionBar();
      });

      // Card body click (ignore when clicking checkbox or action buttons)
      card.addEventListener("click", (e) => {
        if (e.target.closest(".piece-select-checkbox") || e.target.closest(".edit-btn") || e.target.closest(".delete-btn") || e.target.closest(".edit-date-trigger")) {
          return;
        }
        openEditModal(item);
      });

      card.querySelector(".edit-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(item);
      });

      card.querySelector(".edit-date-trigger")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(item);
      });

      card.querySelector(".delete-btn")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`Deseja remover "${item.tipo}" do seu Roupeiro?`)) {
          await deleteItem(item.id);
        }
      });
    });

    // Attach "+ Foto" button (Requisito: adicionar fotos diretamente à categoria)
    clothesGrid.querySelectorAll(".btn-add-photo-in-cat").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        uploadTargetCategory = btn.dataset.category;
        categorySpecificFileInput?.click();
      });
    });

    // Attach "+ Básico" buttons in section headers
    clothesGrid.querySelectorAll(".btn-add-generic-in-cat").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const cat = btn.dataset.category;
        openGenericItemModal(cat);
      });
    });

    // Attach "Renomear" buttons in section headers
    clothesGrid.querySelectorAll(".btn-rename-cat").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openRenameCategoryModal(btn.dataset.category);
      });
    });

    // Attach "Excluir" buttons in section headers
    clothesGrid.querySelectorAll(".btn-delete-cat").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleDeleteCategory(btn.dataset.category);
      });
    });

    // Attach "Ordenar por Cor" buttons (Requisito: ordenar peças por cor)
    clothesGrid.querySelectorAll(".btn-sort-color").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const cat = btn.dataset.category;
        const current = categoryColorSortMap[cat];
        if (!current) {
          categoryColorSortMap[cat] = 'light_to_dark';
        } else if (current === 'light_to_dark') {
          categoryColorSortMap[cat] = 'dark_to_light';
        } else {
          categoryColorSortMap[cat] = null;
        }
        renderWardrobe();
      });
    });

    // Attach "Selecionar / Desmarcar Todas" buttons (Requisito: selecionar ou deselecionar todas as peças)
    clothesGrid.querySelectorAll(".btn-toggle-select-cat").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const cat = btn.dataset.category;
        const catItems = wardrobeItems.filter(i => (i.categoria || "Outros") === cat);
        const allSelected = catItems.length > 0 && catItems.every(i => selectedPieceIds.has(i.id));
        if (allSelected) {
          catItems.forEach(i => selectedPieceIds.delete(i.id));
        } else {
          catItems.forEach(i => selectedPieceIds.add(i.id));
        }
        renderWardrobe();
      });
    });

    updateBatchActionBar();
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const [year, month, day] = dateStr.split("-");
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  // 3. Upload Pipeline (Files & Recursive Folder)
  selectFilesBtn.addEventListener("click", () => fileInput.click());
  selectFolderBtn.addEventListener("click", () => folderInput.click());
  emptyUploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleFilesUpload(Array.from(e.target.files));
      e.target.value = "";
    }
  });

  folderInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      // webkitRelativePath contains the directory structure
      handleFilesUpload(Array.from(e.target.files));
      e.target.value = "";
    }
  });

  // Drag and Drop
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-brand-500", "bg-brand-50/40");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-brand-500", "bg-brand-50/40");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-brand-500", "bg-brand-50/40");
    if (e.dataTransfer.files.length) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  });

  async function handleFilesUpload(filesList, targetCategory = null) {
    // Filter only image files
    const validImages = filesList.filter(f => f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(f.name));
    if (!validImages.length) {
      alert("Nenhuma imagem válida encontrada nos arquivos selecionados.");
      return;
    }

    const chosenCategory = targetCategory || (uploadTargetCategorySelect ? uploadTargetCategorySelect.value.trim() : null) || null;

    uploadProgressContainer.classList.remove("hidden");
    const total = validImages.length;
    let completed = 0;

    for (let i = 0; i < total; i++) {
      const file = validImages[i];
      const relPath = file.webkitRelativePath || file.name;

      // Update progress UI
      progressStatusText.textContent = `Processando foto ${i + 1} de ${total}: ${file.name}`;
      if (chosenCategory) {
        progressDetailText.textContent = `Destino: Categoria "${chosenCategory}" (classificação direta)...`;
      } else {
        progressDetailText.textContent = `Classificando com ${currentGeminiModel}...`;
      }
      const percent = Math.round(((i) / total) * 100);
      progressPercent.textContent = `${percent}%`;
      progressBar.style.width = `${percent}%`;

      const formData = new FormData();
      formData.append("file", file);
      if (file.webkitRelativePath) {
        formData.append("original_path", file.webkitRelativePath);
      }
      if (chosenCategory) {
        formData.append("categoria", chosenCategory);
      }

      try {
        const resp = await authFetch("/api/clothes/upload", {
          method: "POST",
          body: formData
        });
        if (!resp.ok) {
          const err = await resp.json();
          console.error(`Erro ao subir ${file.name}:`, err);
        } else {
          completed++;
        }
      } catch (err) {
        console.error(`Falha no upload de ${file.name}:`, err);
      }
    }

    // Finalize
    progressPercent.textContent = "100%";
    progressBar.style.width = "100%";
    progressStatusText.textContent = `Upload concluído! ${completed} peças catalogadas com sucesso.`;
    progressDetailText.textContent = "Recarregando seu roupeiro...";

    setTimeout(() => {
      uploadProgressContainer.classList.add("hidden");
      loadWardrobe();
    }, 1500);
  }

  // 4. Edit Modal Logic
  function openEditModal(item) {
    editItemId.value = item.id;
    editTipo.value = item.tipo || "";
    editCategoria.value = item.categoria || "Outros";
    editCor.value = item.cor_predominante || "";
    editCorHex.value = item.cor_hex || "#000000";
    editCorPicker.value = item.cor_hex || "#000000";
    editDataAquisicao.value = item.data_aquisicao || "";
    editDescricao.value = item.descricao || "";
    editEstilo.value = item.estilo || "Casual";
    editEstacao.value = item.estacao || "Todas";

    if (editIsGeneric) editIsGeneric.checked = Boolean(item.is_generic);
    if (editQuantidade) editQuantidade.value = item.quantidade || 1;
    if (editNaoRepetir) editNaoRepetir.checked = Boolean(item.nao_repetir);
    if (editStatusRoupa) editStatusRoupa.value = item.status_roupa || "Ok";

    const imgUrl = item.cutout_url || item.original_url;
    if (imgUrl) {
      editImagePreview.src = imgUrl;
      editImagePreview.classList.remove("hidden");
    } else {
      editImagePreview.src = "";
      editImagePreview.classList.add("hidden");
    }

    editTitlePreview.textContent = item.tipo;
    editFilenamePreview.textContent = item.original_filename || (item.is_generic ? "Item Básico" : "");

    editModal.classList.remove("hidden");
  }

  closeEditModalBtn.addEventListener("click", () => editModal.classList.add("hidden"));
  cancelEditBtn.addEventListener("click", () => editModal.classList.add("hidden"));

  editCorPicker.addEventListener("input", (e) => {
    editCorHex.value = e.target.value;
  });
  editCorHex.addEventListener("input", (e) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
      editCorPicker.value = e.target.value;
    }
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editItemId.value;
    const updates = {
      tipo: editTipo.value,
      categoria: editCategoria.value,
      cor_predominante: editCor.value,
      cor_hex: editCorHex.value,
      data_aquisicao: editDataAquisicao.value,
      descricao: editDescricao.value,
      estilo: editEstilo.value,
      estacao: editEstacao.value,
      is_generic: editIsGeneric ? editIsGeneric.checked : false,
      quantidade: editQuantidade ? Math.max(1, parseInt(editQuantidade.value) || 1) : 1,
      nao_repetir: editNaoRepetir ? editNaoRepetir.checked : false,
      status_roupa: editStatusRoupa ? editStatusRoupa.value : "Ok"
    };

    try {
      const resp = await authFetch(`/api/clothes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      });
      if (resp.ok) {
        editModal.classList.add("hidden");
        await loadWardrobe();
      } else {
        alert("Erro ao salvar alterações.");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Erro de conexão ao salvar.");
    }
  });

  async function deleteItem(id) {
    // 1. Optimistic removal: remove immediately from in-memory state & DOM
    const previousItems = [...wardrobeItems];
    const itemToDelete = wardrobeItems.find(i => i.id === id);

    wardrobeItems = wardrobeItems.filter(i => i.id !== id);
    renderWardrobe();

    // Close edit modal if open for this item
    if (editItemId.value === id) {
      editModal.classList.add("hidden");
    }

    // Optimistically decrement total badge
    if (itemsCounterBadge && !isNaN(parseInt(itemsCounterBadge.textContent))) {
      itemsCounterBadge.textContent = Math.max(0, parseInt(itemsCounterBadge.textContent) - 1);
    }

    try {
      const resp = await authFetch(`/api/clothes/${id}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        await updateSummaryStats();
      } else {
        // Rollback on server error
        wardrobeItems = previousItems;
        renderWardrobe();
        await updateSummaryStats();
        alert("Erro ao excluir peça no servidor.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      // Rollback on connection error
      wardrobeItems = previousItems;
      renderWardrobe();
      await updateSummaryStats();
      alert("Erro de conexão ao excluir peça.");
    }
  }

  // Delete button inside Edit Modal
  const modalDeleteBtn = document.getElementById("modalDeleteBtn");
  if (modalDeleteBtn) {
    modalDeleteBtn.addEventListener("click", async () => {
      const id = editItemId.value;
      if (!id) return;
      const item = wardrobeItems.find(i => i.id === id);
      const name = item ? `"${item.tipo}"` : "esta peça";
      if (confirm(`Deseja realmente excluir ${name} do seu Roupeiro?`)) {
        await deleteItem(id);
      }
    });
  }

  // 5. Google Photos Integration
  openGooglePhotosBtn.addEventListener("click", async () => {
    googlePhotosModal.classList.remove("hidden");
    selectedGooglePhotos.clear();
    updatePhotosSelectionCount();

    if (!googlePhotosAccessToken) {
      // Check if user is logged into Google with Firebase
      if (window.firebase && firebase.auth().currentUser) {
        // Re-authenticate to request photos scope
        photosReauthBanner.classList.remove("hidden");
        photosLoadingSpinner.classList.add("hidden");
      } else {
        photosReauthBanner.classList.remove("hidden");
        photosLoadingSpinner.classList.add("hidden");
      }
    } else {
      photosReauthBanner.classList.add("hidden");
      await fetchGooglePhotos();
    }
  });

  photosReauthBtn.addEventListener("click", async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/photoslibrary.readonly");
      provider.setCustomParameters({ prompt: "consent" });
      const result = await firebase.auth().signInWithPopup(provider);
      if (result.credential && result.credential.accessToken) {
        googlePhotosAccessToken = result.credential.accessToken;
        sessionStorage.setItem("google_photos_access_token", googlePhotosAccessToken);
        photosReauthBanner.classList.add("hidden");
        await fetchGooglePhotos();
      }
    } catch (err) {
      console.error("Google Photos auth error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        return;
      }
      const msg = String(err.message || err);
      if (msg.includes("policy_enforced") || msg.includes("Proteção Avançada") || msg.includes("Advanced Protection")) {
        alert("Sua conta Google possui o Programa Proteção Avançada ativado, que restringe o acesso de aplicativos externos aos dados do Google Fotos.\n\nPara cadastrar suas roupas, utilize a opção de upload direto de fotos ou pastas do seu computador/dispositivo!");
      } else {
        alert("Não foi possível conectar ao Google Fotos: " + msg);
      }
    }
  });

  closeGooglePhotosModalBtn.addEventListener("click", () => googlePhotosModal.classList.add("hidden"));
  cancelPhotosImportBtn.addEventListener("click", () => googlePhotosModal.classList.add("hidden"));

  async function fetchGooglePhotos() {
    photosLoadingSpinner.classList.remove("hidden");
    googlePhotosGrid.innerHTML = "";
    photosEmptyNotice.classList.add("hidden");

    try {
      const resp = await authFetch("/api/google-photos/media-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          access_token: googlePhotosAccessToken,
          page_size: 60
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        if (resp.status === 400 || resp.status === 401) {
          photosReauthBanner.classList.remove("hidden");
        }
        throw new Error(err.detail || "Erro ao buscar fotos");
      }

      const data = await resp.json();
      googlePhotosList = data.photos || [];

      if (!googlePhotosList.length) {
        photosEmptyNotice.classList.remove("hidden");
        return;
      }

      renderGooglePhotosGrid();
    } catch (err) {
      console.error("Error loading Google Photos:", err);
      photosEmptyNotice.textContent = "Erro ao carregar fotos do Google Fotos. Verifique a autorização da conta.";
      photosEmptyNotice.classList.remove("hidden");
    } finally {
      photosLoadingSpinner.classList.add("hidden");
    }
  }

  function renderGooglePhotosGrid() {
    googlePhotosGrid.innerHTML = googlePhotosList.map(photo => {
      const isChecked = selectedGooglePhotos.has(photo.id);
      return `
        <div class="photo-item relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer group bg-slate-100 aspect-square" data-id="${photo.id}">
          <img src="${photo.thumbnailUrl}" alt="${photo.filename}" class="w-full h-full object-cover group-hover:scale-105 transition duration-200">
          
          <!-- Checkbox overlay -->
          <div class="absolute top-2 left-2 z-10">
            <input type="checkbox" data-id="${photo.id}" ${isChecked ? 'checked' : ''} class="photo-checkbox w-5 h-5 rounded text-brand-600 focus:ring-brand-500 border-white shadow cursor-pointer">
          </div>

          <!-- Date badge -->
          ${photo.acquisitionDateSuggestion ? `
            <span class="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium">
              ${formatDate(photo.acquisitionDateSuggestion)}
            </span>
          ` : ''}
        </div>
      `;
    }).join("");

    // Attach click triggers
    googlePhotosGrid.querySelectorAll(".photo-item").forEach(item => {
      const id = item.dataset.id;
      const chk = item.querySelector(".photo-checkbox");

      item.addEventListener("click", (e) => {
        if (e.target !== chk) {
          chk.checked = !chk.checked;
        }
        if (chk.checked) {
          selectedGooglePhotos.add(id);
          item.classList.add("ring-2", "ring-brand-500");
        } else {
          selectedGooglePhotos.delete(id);
          item.classList.remove("ring-2", "ring-brand-500");
        }
        updatePhotosSelectionCount();
      });
    });
  }

  function updatePhotosSelectionCount() {
    photosSelectedCount.textContent = selectedGooglePhotos.size;
    confirmPhotosImportBtn.disabled = selectedGooglePhotos.size === 0;
  }

  selectAllPhotosBtn.addEventListener("click", () => {
    googlePhotosList.forEach(p => selectedGooglePhotos.add(p.id));
    googlePhotosGrid.querySelectorAll(".photo-checkbox").forEach(chk => chk.checked = true);
    googlePhotosGrid.querySelectorAll(".photo-item").forEach(item => item.classList.add("ring-2", "ring-brand-500"));
    updatePhotosSelectionCount();
  });

  clearPhotosSelectionBtn.addEventListener("click", () => {
    selectedGooglePhotos.clear();
    googlePhotosGrid.querySelectorAll(".photo-checkbox").forEach(chk => chk.checked = false);
    googlePhotosGrid.querySelectorAll(".photo-item").forEach(item => item.classList.remove("ring-2", "ring-brand-500"));
    updatePhotosSelectionCount();
  });

  // Confirm Google Photos Import
  confirmPhotosImportBtn.addEventListener("click", async () => {
    const selected = googlePhotosList.filter(p => selectedGooglePhotos.has(p.id));
    if (!selected.length) return;

    confirmPhotosImportBtn.disabled = true;
    confirmPhotosImportBtn.innerHTML = `<span class="animate-spin">⏳</span><span>Importando...</span>`;

    try {
      const resp = await authFetch("/api/google-photos/import-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: selected.map(p => ({
            id: p.id,
            baseUrl: p.previewUrl.replace("=w1024-h1024", ""),
            filename: p.filename,
            creationTime: p.creationTime,
            acquisitionDateSuggestion: p.acquisitionDateSuggestion
          }))
        })
      });

      if (resp.ok) {
        googlePhotosModal.classList.add("hidden");
        await loadWardrobe();
        alert(`${selected.length} foto(s) importadas e catalogadas com sucesso no Roupeiro!`);
      } else {
        alert("Erro ao importar fotos selecionadas.");
      }
    } catch (err) {
      console.error("Import error:", err);
      alert("Falha na importação de fotos.");
    } finally {
      confirmPhotosImportBtn.disabled = false;
      confirmPhotosImportBtn.innerHTML = `<span>☁️</span><span>Importar para o Roupeiro</span>`;
    }
  });

  // 6. Look Builder (Montador de Looks)
  openLookBuilderBtn?.addEventListener("click", () => {
    populateLookBuilderOptions();
    lookBuilderModal?.classList.remove("hidden");
  });
  closeLookBuilderBtn?.addEventListener("click", () => lookBuilderModal?.classList.add("hidden"));

  function populateLookBuilderOptions() {
    const tops = wardrobeItems.filter(i => ["Camisas & Camisetas", "Casacos & Jaquetas", "Vestidos & Saias"].includes(i.categoria));
    const bottoms = wardrobeItems.filter(i => ["Calças", "Bermudas & Shorts", "Vestidos & Saias"].includes(i.categoria));
    const shoes = wardrobeItems.filter(i => i.categoria === "Calçados");

    if (selectLookTop) {
      selectLookTop.innerHTML = `<option value="">Selecione uma peça superior...</option>` +
        tops.map(t => `<option value="${t.id}">${t.tipo} (${t.cor_predominante})</option>`).join("");
    }

    if (selectLookBottom) {
      selectLookBottom.innerHTML = `<option value="">Selecione uma peça inferior...</option>` +
        bottoms.map(b => `<option value="${b.id}">${b.tipo} (${b.cor_predominante})</option>`).join("");
    }

    if (selectLookShoes) {
      selectLookShoes.innerHTML = `<option value="">Selecione um calçado...</option>` +
        shoes.map(s => `<option value="${s.id}">${s.tipo} (${s.cor_predominante})</option>`).join("");
    }
  }

  function updateLookSlot(slotElement, itemId, fallbackText) {
    if (!slotElement) return;
    if (!itemId) {
      slotElement.innerHTML = `<span class="text-xs text-slate-400">${fallbackText}</span>`;
      return;
    }
    const item = wardrobeItems.find(i => i.id === itemId);
    if (item) {
      slotElement.innerHTML = `
        <img src="${item.cutout_url || item.original_url}" alt="${item.tipo}" class="max-h-full max-w-full object-contain filter drop-shadow-md">
        <span class="absolute bottom-1 bg-white/90 text-[10px] font-semibold px-2 py-0.5 rounded shadow text-slate-800 truncate max-w-[90%]">${item.tipo}</span>
      `;
    }
  }

  selectLookTop?.addEventListener("change", (e) => updateLookSlot(lookSlotTop, e.target.value, "Topo (Camisa / Casaco)"));
  selectLookBottom?.addEventListener("change", (e) => updateLookSlot(lookSlotBottom, e.target.value, "Parte Inferior (Calça / Saia)"));
  selectLookShoes?.addEventListener("change", (e) => updateLookSlot(lookSlotShoes, e.target.value, "Calçados"));

  randomizeLookBtn?.addEventListener("click", () => {
    const randomPick = (selectElem) => {
      if (!selectElem) return;
      const options = Array.from(selectElem.options).filter(o => o.value);
      if (options.length) {
        const rand = options[Math.floor(Math.random() * options.length)];
        selectElem.value = rand.value;
        selectElem.dispatchEvent(new Event("change"));
      }
    };
    randomPick(selectLookTop);
    randomPick(selectLookBottom);
    randomPick(selectLookShoes);
  });

  // Filter and Search Events
  colorFilterSelect.addEventListener("change", (e) => {
    selectedColor = e.target.value;
    loadWardrobe();
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      loadWardrobe();
    }, 300);
  });

  refreshBtn.addEventListener("click", async () => {
    refreshBtn.classList.add("animate-spin");
    try {
      await loadWardrobe();
    } finally {
      refreshBtn.classList.remove("animate-spin");
    }
  });

  // ==========================================
  // 7. FAÇA MINHA MALA (PACK MY SUITCASE)
  // ==========================================

  function formatDateBR(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function initPackingFeature() {
    // Set default dates: tomorrow and 4 days later
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 4);

    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (packingArrivalDate && !packingArrivalDate.value) {
      packingArrivalDate.value = fmt(tomorrow);
    }
    if (packingDepartureDate && !packingDepartureDate.value) {
      packingDepartureDate.value = fmt(returnDate);
    }

    // Modal triggers
    if (openPackingTripBtn) openPackingTripBtn.addEventListener("click", openPackingModal);
    if (openPackingModalBtn) openPackingModalBtn.addEventListener("click", openPackingModal);
    if (closePackingModalBtn) closePackingModalBtn.addEventListener("click", closePackingModal);
    if (cancelPackingBtn) cancelPackingBtn.addEventListener("click", closePackingModal);

    // Trip Viewer Modal triggers & Tabs
    if (viewSavedTripsBtn) {
      viewSavedTripsBtn.addEventListener("click", openSavedTripsSelectorPopup);
    }
    if (openMyTripsHeaderBtn) {
      openMyTripsHeaderBtn.addEventListener("click", openSavedTripsSelectorPopup);
    }
    if (closeSavedTripsSelectorBtn) {
      closeSavedTripsSelectorBtn.addEventListener("click", () => {
        if (savedTripsSelectorModal) savedTripsSelectorModal.classList.add("hidden");
      });
    }
    if (closeSavedTripsSelectorFooterBtn) {
      closeSavedTripsSelectorFooterBtn.addEventListener("click", () => {
        if (savedTripsSelectorModal) savedTripsSelectorModal.classList.add("hidden");
      });
    }
    if (planNewTripFromSelectorBtn) {
      planNewTripFromSelectorBtn.addEventListener("click", () => {
        if (savedTripsSelectorModal) savedTripsSelectorModal.classList.add("hidden");
        openPackingModal();
      });
    }
    if (closeTripViewerBtn) closeTripViewerBtn.addEventListener("click", closeTripViewer);

    if (tabBtnItinerary) tabBtnItinerary.addEventListener("click", () => switchTripTab("itinerary"));
    if (tabBtnChecklist) tabBtnChecklist.addEventListener("click", () => switchTripTab("checklist"));
    if (tabBtnSavedTrips) tabBtnSavedTrips.addEventListener("click", () => switchTripTab("saved_trips"));

    if (printChecklistBtn) printChecklistBtn.addEventListener("click", () => window.print());
    if (startNewTripBtn) {
      startNewTripBtn.addEventListener("click", () => {
        closeTripViewer();
        openPackingModal();
      });
    }

    // AI Edit Look Modal triggers
    if (closeEditLookAiModalBtn) closeEditLookAiModalBtn.addEventListener("click", closeEditLookAiModal);
    if (cancelEditLookAiBtn) cancelEditLookAiBtn.addEventListener("click", closeEditLookAiModal);
    if (submitEditLookAiBtn) submitEditLookAiBtn.addEventListener("click", handleLookAiRegeneration);

    // Voice recognition setup
    initSpeechRecognition();
    if (voicePromptBtn) voicePromptBtn.addEventListener("click", toggleVoiceRecognition);

    // Quick prompt chips
    document.querySelectorAll(".quick-prompt-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const text = chip.textContent.trim();
        if (aiPromptInput) {
          aiPromptInput.value = aiPromptInput.value ? `${aiPromptInput.value}, ${text}` : text;
          aiPromptInput.focus();
        }
      });
    });

    // Swap Piece Modal triggers
    if (closeSwapPieceModalBtn) closeSwapPieceModalBtn.addEventListener("click", closeSwapPieceModal);
    if (swapSearchInput) swapSearchInput.addEventListener("input", renderSwapPiecesGrid);
    if (swapCategoryFilter) swapCategoryFilter.addEventListener("change", renderSwapPiecesGrid);

    // Swap Period Modal triggers
    if (closeSwapPeriodModalBtn) closeSwapPeriodModalBtn.addEventListener("click", closeSwapPeriodModal);
    if (cancelSwapPeriodBtn) cancelSwapPeriodBtn.addEventListener("click", closeSwapPeriodModal);
    if (confirmSwapPeriodBtn) confirmSwapPeriodBtn.addEventListener("click", handleConfirmSwapPeriod);

    // Form submit
    if (packingForm) packingForm.addEventListener("submit", handlePackingFormSubmit);
  }

  function openPackingModal() {
    if (!currentUser) {
      showLoginGate("Por favor, faça login para planejar sua viagem.");
      return;
    }
    if (packingModal) packingModal.classList.remove("hidden");
    if (packingDestination) packingDestination.focus();
  }

  function closePackingModal() {
    if (packingModal) packingModal.classList.add("hidden");
    if (packingLoadingOverlay) packingLoadingOverlay.classList.add("hidden");
  }

  async function handlePackingFormSubmit(e) {
    e.preventDefault();
    const destination = packingDestination.value.trim();
    const arrivalDate = packingArrivalDate.value;
    const arrivalTime = packingArrivalTime.value || "13:00";
    const departureDate = packingDepartureDate.value;
    const departureTime = packingDepartureTime.value || "18:00";
    const notes = packingNotes ? packingNotes.value.trim() : "";

    if (!destination || !arrivalDate || !departureDate) {
      alert("Por favor, preencha o destino e as datas de ida e volta.");
      return;
    }

    if (arrivalDate > departureDate) {
      alert("A data de partida não pode ser anterior à data de chegada.");
      return;
    }

    if (packingLoadingOverlay) packingLoadingOverlay.classList.remove("hidden");

    try {
      const resp = await authFetch("/api/trips/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          arrival_date: arrivalDate,
          arrival_time: arrivalTime,
          departure_date: departureDate,
          departure_time: departureTime,
          notes
        })
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || "Falha ao planejar viagem com Gemini.");
      }

      const trip = await resp.json();
      currentTrip = trip;
      closePackingModal();
      window.location.href = `/viagem.html?id=${trip.id}`;
    } catch (err) {
      console.error("Packing plan error:", err);
      alert(`Não foi possível planejar a mala: ${err.message}`);
    } finally {
      if (packingLoadingOverlay) packingLoadingOverlay.classList.add("hidden");
    }
  }

  function openTripViewer(trip = null) {
    if (trip) currentTrip = trip;
    if (tripViewerModal) tripViewerModal.classList.remove("hidden");

    if (currentTrip) {
      tripViewerDestination.textContent = currentTrip.destination || "Destino";
      const countDays = currentTrip.total_days || (currentTrip.days ? currentTrip.days.length : 0);
      tripViewerDaysBadge.textContent = `${countDays} ${countDays === 1 ? 'Dia' : 'Dias'}`;
      tripViewerDates.textContent = `${formatDateBR(currentTrip.arrival_date)} às ${currentTrip.arrival_time || '13:00'} → ${formatDateBR(currentTrip.departure_date)} às ${currentTrip.departure_time || '18:00'}`;
      tripViewerSummary.textContent = currentTrip.summary || "Roteiro e looks personalizados pelo Gemini.";

      switchTripTab("itinerary");
      renderTripItinerary();
      renderTripChecklist();
    } else {
      switchTripTab("saved_trips");
    }
  }

  function closeTripViewer() {
    if (tripViewerModal) tripViewerModal.classList.add("hidden");
  }

  function switchTripTab(tabName) {
    const tabs = [
      { name: "itinerary", btn: tabBtnItinerary, content: tabContentItinerary },
      { name: "checklist", btn: tabBtnChecklist, content: tabContentChecklist },
      { name: "saved_trips", btn: tabBtnSavedTrips, content: tabContentSavedTrips }
    ];

    tabs.forEach(t => {
      if (t.name === tabName) {
        if (t.btn) {
          t.btn.className = "trip-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-sm transition flex items-center gap-1.5";
        }
        if (t.content) t.content.classList.remove("hidden");
      } else {
        if (t.btn) {
          t.btn.className = "trip-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5";
        }
        if (t.content) t.content.classList.add("hidden");
      }
    });

    if (tabName === "checklist" && currentTrip) {
      renderTripChecklist();
    } else if (tabName === "saved_trips") {
      loadSavedTrips();
    }
  }

  function isTripItemPending(item) {
    if (!item) return true;
    if (item.is_placeholder === true) return true;
    if (item.item_id && typeof item.item_id === "string" && item.item_id.trim() !== "") return false;
    if (item.source_type === "shopping" || item.shopping_id || item.shopping_item_id || item.merchant) return false;
    return true;
  }

  function getTripDayLookStatus(day) {
    let totalItems = 0;
    let pendingCount = 0;
    let hasAnyLook = false;

    const periods = [day.day_period, day.night_period].filter(p => p && p.look);
    periods.forEach(p => {
      hasAnyLook = true;
      const items = p.look.items || [];
      totalItems += items.length;
      items.forEach(it => {
        if (isTripItemPending(it)) pendingCount++;
      });
    });

    return {
      hasAnyLook,
      totalItems,
      pendingCount,
      isComplete: hasAnyLook && totalItems > 0 && pendingCount === 0
    };
  }

  function buildTripDayStatusBadgeHtml(status) {
    if (!status.hasAnyLook || status.totalItems === 0) {
      return `
        <div class="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 shadow-2xs">
          <span>❓</span>
          <span>Sem Look</span>
        </div>
      `;
    }

    if (status.isComplete) {
      return `
        <div class="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs" title="Todos os looks deste dia estão com peças definidas">
          <span>✅</span>
          <span>Look Completo</span>
        </div>
      `;
    }

    return `
      <div class="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-900 shadow-2xs" title="${status.pendingCount} item(ns) a definir no look deste dia">
        <span>⚠️</span>
        <span>Faltam ${status.pendingCount} ${status.pendingCount === 1 ? 'item' : 'itens'} a definir</span>
      </div>
    `;
  }

  // Render Itinerary Tab
  function renderTripItinerary() {
    if (!tripDaysContainer || !currentTrip || !currentTrip.days) return;
    tripDaysContainer.innerHTML = "";

    currentTrip.days.forEach((day, dayIndex) => {
      const dayNum = day.day_number || (dayIndex + 1);
      const dayDate = formatDateBR(day.date);
      const dayTitle = day.title || `Dia ${dayNum} em ${currentTrip.destination}`;

      const dayWeather = day.weather?.day || { temp_c: "--", condition: "Clima ameno", icon: "☀️" };
      const nightWeather = day.weather?.night || { temp_c: "--", condition: "Clima ameno", icon: "🌙" };

      const dayStatus = getTripDayLookStatus(day);
      const dayStatusBadgeHtml = buildTripDayStatusBadgeHtml(dayStatus);

      const dayCard = document.createElement("div");
      dayCard.className = "bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden";

      dayCard.innerHTML = `
        <!-- Day Card Header with Weather -->
        <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-xl bg-brand-600 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
              D${dayNum}
            </span>
            <div>
              <h4 class="text-sm font-bold text-slate-900 font-serif">${dayTitle}</h4>
              <p class="text-xs text-slate-500">${dayDate}</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <!-- Look Status Badge -->
            ${dayStatusBadgeHtml}

            <!-- Day Weather -->
            <div class="flex items-center gap-2 bg-amber-50/80 border border-amber-200/80 px-3 py-1 rounded-xl text-xs text-amber-900" title="Previsão do Dia">
              <span class="text-sm">☀️</span>
              <div>
                <span class="font-bold">${dayWeather.temp_c || '--'}</span>
                <span class="text-[10px] text-amber-700 hidden sm:inline ml-1">${dayWeather.condition || ''}</span>
              </div>
            </div>

            <!-- Night Weather -->
            <div class="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200/80 px-3 py-1 rounded-xl text-xs text-indigo-900" title="Previsão da Noite">
              <span class="text-sm">🌙</span>
              <div>
                <span class="font-bold">${nightWeather.temp_c || '--'}</span>
                <span class="text-[10px] text-indigo-700 hidden sm:inline ml-1">${nightWeather.condition || ''}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Day Periods Container (Day Period & Night Period) -->
        <div class="p-5 space-y-6">
          <!-- 1. PERÍODO DIURNO -->
          <div class="day-period-block space-y-3">
            <div class="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <div class="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <span class="text-sm">☀️</span>
                <span>Roteiro & Atividades Diurnas</span>
              </div>
              <button type="button" class="swap-period-btn px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs" data-day="${dayIndex}" data-period="day_period" title="Trocar este período (roteiro e look) com outro dia">
                <span>🔄</span>
                <span>Trocar Período</span>
              </button>
            </div>

            <!-- Locations list -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="locations-day-${dayIndex}"></div>

            <!-- Look do Dia -->
            <div class="mt-4 pt-3 border-t border-slate-100" id="look-container-day-${dayIndex}"></div>
          </div>

          <!-- 2. PERÍODO NOTURNO -->
          <div class="night-period-block space-y-3 pt-5 border-t border-slate-200">
            <div class="flex items-center justify-between border-b border-indigo-200/60 pb-2">
              <div class="flex items-center gap-2 text-xs font-bold text-indigo-800 uppercase tracking-wider">
                <span class="text-sm">🌙</span>
                <span>Roteiro & Atividades Noturnas</span>
              </div>
              <button type="button" class="swap-period-btn px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs" data-day="${dayIndex}" data-period="night_period" title="Trocar este período (roteiro e look) com outro dia">
                <span>🔄</span>
                <span>Trocar Período</span>
              </button>
            </div>

            <!-- Night Locations list -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="locations-night-${dayIndex}"></div>

            <!-- Look da Noite -->
            <div class="mt-4 pt-3 border-t border-slate-100" id="look-container-night-${dayIndex}"></div>
          </div>
        </div>
      `;

      tripDaysContainer.appendChild(dayCard);

      // Render Day Locations & Look
      renderPeriodLocations(dayIndex, "day_period", dayCard.querySelector(`#locations-day-${dayIndex}`));
      renderLookCard(dayIndex, "day_period", dayCard.querySelector(`#look-container-day-${dayIndex}`));

      // Render Night Locations & Look
      renderPeriodLocations(dayIndex, "night_period", dayCard.querySelector(`#locations-night-${dayIndex}`));
      renderLookCard(dayIndex, "night_period", dayCard.querySelector(`#look-container-night-${dayIndex}`));

      // Bind Swap Period button
      dayCard.querySelectorAll(".swap-period-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const dIdx = parseInt(btn.getAttribute("data-day"), 10);
          const pKey = btn.getAttribute("data-period");
          openSwapPeriodModal(dIdx, pKey);
        });
      });
    });
  }

  function renderPeriodLocations(dayIndex, periodKey, container) {
    if (!container) return;
    const day = currentTrip.days[dayIndex];
    const period = day[periodKey];
    const locations = period && period.locations ? period.locations : [];

    if (!locations.length) {
      container.innerHTML = `
        <div class="col-span-full py-3 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 flex items-center justify-between">
          <span>${periodKey === 'night_period' ? 'Sem atividades noturnas planejadas para este dia (descanso).' : 'Nenhuma atividade programada para este período.'}</span>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    locations.forEach((loc, locIndex) => {
      const locCard = document.createElement("div");
      locCard.className = "bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-3.5 transition flex flex-col justify-between space-y-2";

      locCard.innerHTML = `
        <div>
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100 flex items-center gap-1">
              <span>🕒</span>
              ${loc.time || "Horário flexível"}
            </span>
            ${loc.style ? `<span class="text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">${loc.style}</span>` : ""}
          </div>
          <h5 class="text-xs font-bold text-slate-900 leading-snug">${loc.name}</h5>
          ${loc.description ? `<p class="text-[11px] text-slate-600 mt-1 leading-relaxed">${loc.description}</p>` : ""}
        </div>

        <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
          <span class="text-slate-500 flex items-center gap-1">
            <span>🚕</span>
            ${loc.travel_time || "Trajeto livre"}
          </span>
        </div>
      `;

      container.appendChild(locCard);
    });
  }

  function renderLookCard(dayIndex, periodKey, container) {
    if (!container) return;
    const day = currentTrip.days[dayIndex];
    const period = day[periodKey];
    const look = period ? period.look : null;

    if (!look) {
      if (periodKey === "night_period" && (!period || !period.has_activity)) {
        container.innerHTML = "";
        return;
      }
      container.innerHTML = `
        <div class="py-2 text-xs text-slate-400">Nenhum look configurado para este período.</div>
      `;
      return;
    }

    const itemIds = look.item_ids || [];
    const matchedItems = itemIds.map(id => wardrobeItems.find(w => w.id === id) || { id, tipo: "Peça selecionada", cor_predominante: "Neutro" });

    container.innerHTML = `
      <div class="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-4 space-y-3">
        <!-- Look Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>👔</span>
              <span>${look.title || (periodKey === 'day_period' ? 'Look do Dia' : 'Look da Noite')}</span>
            </span>
            ${look.style ? `<span class="text-[10px] font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full">${look.style}</span>` : ""}
          </div>

          <!-- Actions: Edit with AI (Text/Voice) and Swap Piece -->
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <button type="button" class="btn-edit-look-ai px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-brand-700 border border-brand-200 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5">
              <span>🪄</span>
              <span>Ajustar com IA (Voz/Texto)</span>
            </button>
            <button type="button" class="btn-swap-piece px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5">
              <span>🔄</span>
              <span>Trocar Peça</span>
            </button>
          </div>
        </div>

        ${look.justification ? `<p class="text-xs text-slate-600 leading-relaxed italic">"${look.justification}"</p>` : ""}

        <!-- Items Thumbnails Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
          ${matchedItems.map((item, idx) => `
            <div class="group relative bg-white border border-slate-200 rounded-lg p-2 text-center flex flex-col items-center justify-between shadow-2xs hover:border-brand-300 transition">
              <div class="w-14 h-14 flex items-center justify-center overflow-hidden mb-1">
                ${item.original_url || item.cutout_url
                  ? `<img src="${item.cutout_url || item.original_url}" alt="${item.tipo}" class="max-h-full max-w-full object-contain">`
                  : `<div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><span>👕</span></div>`
                }
              </div>
              <span class="text-[10px] font-bold text-slate-800 truncate w-full leading-tight">${item.tipo || "Peça"}</span>
              <span class="text-[9px] text-slate-500 truncate w-full">${item.cor_predominante || ""}</span>
              <button type="button" data-slot-index="${idx}" class="btn-replace-single-slot absolute inset-0 bg-brand-900/60 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition">
                Trocar Peça
              </button>
            </div>
          `).join("")}
        </div>

        ${look.recommendations ? `
          <div class="text-[11px] text-brand-800 bg-brand-50/70 border border-brand-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span>💡</span>
            <span>${look.recommendations}</span>
          </div>
        ` : ""}
      </div>
    `;

    // Bind edit actions
    container.querySelector(".btn-edit-look-ai").addEventListener("click", () => {
      openEditLookAiModal(dayIndex, periodKey);
    });

    container.querySelector(".btn-swap-piece").addEventListener("click", () => {
      openSwapPieceModal(dayIndex, periodKey, null);
    });

    container.querySelectorAll(".btn-replace-single-slot").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const slotIdx = parseInt(e.currentTarget.getAttribute("data-slot-index"), 10);
        openSwapPieceModal(dayIndex, periodKey, slotIdx);
      });
    });
  }

  // ==========================================
  // SWAP PERIOD MODAL LOGIC (TROCAR PERÍODOS DE DIA)
  // ==========================================

  function openSwapPeriodModal(sourceDayIndex, sourcePeriodKey) {
    if (!currentTrip || !currentTrip.days) return;
    activeSwapPeriodContext = { sourceDayIndex, sourcePeriodKey };

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
    const itemsCount = (sourcePeriod.look?.items || sourcePeriod.look?.item_ids || []).length;
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

        // 1. Corresponding Period (Recommended / Default)
        const optCorr = document.createElement("option");
        optCorr.value = `${dIdx}_${sourcePeriodKey}`;
        const targetPeriod = d[sourcePeriodKey] || { locations: [], look: {} };
        const tLocCount = (targetPeriod.locations || []).length;
        optCorr.textContent = `Dia ${dNum} (${dDate}) — ${sourcePeriodName} (Correspondente: ${tLocCount} locais)`;
        swapTargetDaySelect.appendChild(optCorr);

        // 2. Opposite Period
        const oppPeriodKey = sourcePeriodKey === "day_period" ? "night_period" : "day_period";
        const oppPeriodName = oppPeriodKey === "day_period" ? "Período Diurno" : "Período Noturno";
        const optOpp = document.createElement("option");
        optOpp.value = `${dIdx}_${oppPeriodKey}`;
        const oppTargetPeriod = d[oppPeriodKey] || { locations: [], look: {} };
        const oppLocCount = (oppTargetPeriod.locations || []).length;
        optOpp.textContent = `Dia ${dNum} (${dDate}) — ${oppPeriodName} (${oppLocCount} locais)`;
        swapTargetDaySelect.appendChild(optOpp);
      });

      // Update preview on select change
      swapTargetDaySelect.onchange = updateSwapPeriodPreview;
      updateSwapPeriodPreview();
    }

    if (swapPeriodModal) swapPeriodModal.classList.remove("hidden");
  }

  function updateSwapPeriodPreview() {
    if (!activeSwapPeriodContext || !swapPreviewBox || !swapTargetDaySelect) return;
    const { sourceDayIndex, sourcePeriodKey } = activeSwapPeriodContext;
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
    activeSwapPeriodContext = null;
  }

  async function handleConfirmSwapPeriod() {
    if (!activeSwapPeriodContext || !currentTrip) return;
    const { sourceDayIndex, sourcePeriodKey } = activeSwapPeriodContext;
    if (!swapTargetDaySelect || !swapTargetDaySelect.value) return;

    const [tDayStr, targetPeriodKey] = swapTargetDaySelect.value.split("_");
    const targetDayIndex = parseInt(tDayStr, 10);

    const sourceDay = currentTrip.days[sourceDayIndex];
    const targetDay = currentTrip.days[targetDayIndex];
    if (!sourceDay || !targetDay) return;

    if (!sourceDay[sourcePeriodKey]) {
      sourceDay[sourcePeriodKey] = { has_activity: true, locations: [], look: {} };
    }
    if (!targetDay[targetPeriodKey]) {
      targetDay[targetPeriodKey] = { has_activity: true, locations: [], look: {} };
    }

    confirmSwapPeriodBtn.disabled = true;
    confirmSwapPeriodBtn.innerHTML = `<span class="animate-spin">⏳</span><span>Trocando...</span>`;

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

      const resp = await authFetch(`/api/trips/${currentTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_data: currentTrip })
      });
      if (resp.ok) {
        currentTrip = await resp.json();
      }

      closeSwapPeriodModal();
      renderTripItinerary();
    } catch (err) {
      console.error("Error swapping periods:", err);
      alert("Erro ao trocar períodos: " + err.message);
    } finally {
      confirmSwapPeriodBtn.disabled = false;
      confirmSwapPeriodBtn.innerHTML = `<span>🔄</span><span>Confirmar Troca</span>`;
    }
  }

  // ==========================================
  // SWAP PIECE MODAL LOGIC
  // ==========================================

  function openSwapPieceModal(dayIndex, periodKey, slotIndex = null) {
    currentSwapPieceContext = { dayIndex, periodKey, slotIndex };
    const day = currentTrip.days[dayIndex];
    const periodName = periodKey === "day_period" ? "Look Diurno" : "Look Noturno";
    swapPieceSubtitle.textContent = `Dia ${day.day_number || (dayIndex + 1)} • ${periodName} — ${slotIndex !== null ? 'Substituir peça' : 'Adicionar ou trocar peça'}`;

    // Populate category filter options
    swapCategoryFilter.innerHTML = `<option value="">Todas as Categorias</option>` +
      availableCategories.map(c => `<option value="${c}">${c}</option>`).join("");

    if (swapSearchInput) swapSearchInput.value = "";
    renderSwapPiecesGrid();
    swapPieceModal.classList.remove("hidden");
  }

  function closeSwapPieceModal() {
    if (swapPieceModal) swapPieceModal.classList.add("hidden");
    currentSwapPieceContext = null;
  }

  function renderSwapPiecesGrid() {
    if (!swapPiecesGrid) return;
    const query = (swapSearchInput?.value || "").toLowerCase().trim();
    const cat = swapCategoryFilter?.value || "";

    const filtered = wardrobeItems.filter(item => {
      const matchCat = !cat || item.categoria === cat;
      const matchText = !query ||
        (item.tipo && item.tipo.toLowerCase().includes(query)) ||
        (item.cor_predominante && item.cor_predominante.toLowerCase().includes(query)) ||
        (item.categoria && item.categoria.toLowerCase().includes(query)) ||
        (item.descricao && item.descricao.toLowerCase().includes(query));
      return matchCat && matchText;
    });

    if (!filtered.length) {
      swapPiecesGrid.innerHTML = `
        <div class="col-span-full py-12 text-center text-xs text-slate-400">
          Nenhuma peça encontrada com os filtros selecionados.
        </div>
      `;
      return;
    }

    swapPiecesGrid.innerHTML = "";
    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "bg-white border border-slate-200 hover:border-brand-500 rounded-xl p-3 flex flex-col justify-between items-center text-center cursor-pointer shadow-2xs hover:shadow transition group";

      card.innerHTML = `
        <div class="w-20 h-20 flex items-center justify-center overflow-hidden mb-2">
          <img src="${item.cutout_url || item.original_url}" alt="${item.tipo}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-200">
        </div>
        <div class="w-full">
          <h5 class="text-xs font-bold text-slate-900 truncate">${item.tipo}</h5>
          <p class="text-[10px] text-slate-500 truncate">${item.cor_predominante || ""}</p>
          <span class="inline-block mt-1 text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${item.categoria}</span>
        </div>
        <button type="button" class="mt-2 w-full py-1 bg-brand-50 group-hover:bg-brand-600 group-hover:text-white text-brand-700 text-xs font-semibold rounded-lg transition">
          Selecionar
        </button>
      `;

      card.addEventListener("click", () => handleSelectSwapPiece(item.id));
      swapPiecesGrid.appendChild(card);
    });
  }

  async function handleSelectSwapPiece(selectedItemId) {
    if (!currentSwapPieceContext || !currentTrip) return;
    const { dayIndex, periodKey, slotIndex } = currentSwapPieceContext;
    const day = currentTrip.days[dayIndex];

    if (!day[periodKey].look) {
      day[periodKey].look = {
        title: "Look Personalizado",
        style: "Casual",
        item_ids: []
      };
    }

    if (!Array.isArray(day[periodKey].look.item_ids)) {
      day[periodKey].look.item_ids = [];
    }

    if (slotIndex !== null && slotIndex < day[periodKey].look.item_ids.length) {
      day[periodKey].look.item_ids[slotIndex] = selectedItemId;
    } else {
      if (!day[periodKey].look.item_ids.includes(selectedItemId)) {
        day[periodKey].look.item_ids.push(selectedItemId);
      }
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
      closeSwapPieceModal();
      renderTripItinerary();
      renderTripChecklist();
    } catch (err) {
      console.error("Error saving swapped piece:", err);
      alert("Erro ao atualizar peça do look.");
    }
  }

  // ==========================================
  // AI LOOK REGENERATION & SPEECH RECOGNITION
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

      speechRecognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join("");
        if (aiPromptInput) aiPromptInput.value = transcript;
      };

      speechRecognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        stopVoiceRecognition();
      };

      speechRecognition.onend = () => {
        stopVoiceRecognition();
      };
    }
  }

  function toggleVoiceRecognition() {
    if (!speechRecognition) {
      alert("Reconhecimento de voz não suportado pelo seu navegador atual. Você pode digitar diretamente seu ajuste no campo de texto.");
      if (aiPromptInput) aiPromptInput.focus();
      return;
    }

    if (isRecordingVoice) {
      speechRecognition.stop();
    } else {
      try {
        speechRecognition.start();
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
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
    currentEditLookContext = { dayIndex, periodKey };
    const day = currentTrip.days[dayIndex];
    const period = day[periodKey];
    const periodLabel = periodKey === "day_period" ? "Período Diurno" : "Período Noturno";

    editLookContextSubtitle.textContent = `Dia ${day.day_number || (dayIndex + 1)} • ${periodLabel}`;

    const weather = day.weather ? (periodKey === "day_period" ? day.weather.day : day.weather.night) : null;
    const locNames = (period.locations || []).map(l => l.name).join(", ") || "Passeio livre";

    editLookContextChip.innerHTML = `
      <div class="flex items-center justify-between text-slate-600">
        <span><strong>Destino:</strong> ${currentTrip.destination}</span>
        <span><strong>Clima:</strong> ${weather ? `${weather.temp_c} (${weather.condition})` : "Ameno"}</span>
      </div>
      <div class="text-slate-600 truncate">
        <strong>Locais:</strong> ${locNames}
      </div>
      <div class="text-brand-700 truncate">
        <strong>Look Atual:</strong> ${period.look?.title || "Look atual"} (${period.look?.style || "Geral"})
      </div>
    `;

    if (aiPromptInput) aiPromptInput.value = "";
    stopVoiceRecognition();
    editLookAiModal.classList.remove("hidden");
    if (aiPromptInput) aiPromptInput.focus();
  }

  function closeEditLookAiModal() {
    stopVoiceRecognition();
    if (editLookAiModal) editLookAiModal.classList.add("hidden");
    if (editLookLoadingOverlay) editLookLoadingOverlay.classList.add("hidden");
    currentEditLookContext = null;
  }

  async function handleLookAiRegeneration() {
    if (!currentEditLookContext || !currentTrip) return;
    const promptText = aiPromptInput.value.trim();
    if (!promptText) {
      alert("Por favor, digite ou fale por voz como você deseja ajustar este look.");
      return;
    }

    stopVoiceRecognition();
    if (editLookLoadingOverlay) editLookLoadingOverlay.classList.remove("hidden");

    const { dayIndex, periodKey } = currentEditLookContext;
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

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao recriar look com Gemini.");
      }

      const newLook = await resp.json();
      currentTrip.days[dayIndex][periodKey].look = newLook;

      // Save updated trip to Firestore
      const saveResp = await authFetch(`/api/trips/${currentTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_data: currentTrip })
      });
      if (saveResp.ok) {
        currentTrip = await saveResp.json();
      }

      closeEditLookAiModal();
      renderTripItinerary();
      renderTripChecklist();
    } catch (err) {
      console.error("Regenerate look error:", err);
      alert(`Falha ao recriar look: ${err.message}`);
    } finally {
      if (editLookLoadingOverlay) editLookLoadingOverlay.classList.add("hidden");
    }
  }

  // ==========================================
  // CHECKLIST DA MALA (PACKING LIST)
  // ==========================================

  function renderTripChecklist() {
    if (!packingChecklistItems || !currentTrip) return;

    // Collect unique item IDs from all looks
    const uniqueIds = new Set();
    (currentTrip.days || []).forEach(day => {
      if (day.day_period?.look?.item_ids) {
        day.day_period.look.item_ids.forEach(id => uniqueIds.add(id));
      }
      if (day.night_period?.look?.item_ids) {
        day.night_period.look.item_ids.forEach(id => uniqueIds.add(id));
      }
    });

    const items = Array.from(uniqueIds).map(id => {
      return wardrobeItems.find(w => w.id === id) || {
        id,
        tipo: "Peça da Viagem",
        categoria: "Outros",
        cor_predominante: "Neutro"
      };
    });

    // Group items by category
    const byCategory = {};
    items.forEach(item => {
      const cat = item.categoria || "Geral";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    });

    // Stored checklist state in localStorage
    const storageKey = `roupeiro_checklist_${currentTrip.id}`;
    let checkedState = {};
    try {
      checkedState = JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (e) {
      checkedState = {};
    }

    packingChecklistItems.innerHTML = "";
    const catKeys = Object.keys(byCategory);

    if (!catKeys.length) {
      packingChecklistItems.innerHTML = `
        <div class="py-8 text-center text-xs text-slate-400">
          Nenhuma peça específica foi selecionada para esta viagem ainda.
        </div>
      `;
    } else {
      catKeys.forEach(cat => {
        const catBlock = document.createElement("div");
        catBlock.className = "space-y-2";

        catBlock.innerHTML = `
          <h5 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-brand-500"></span>
            <span>${cat}</span>
            <span class="text-[10px] text-slate-400 font-normal">(${byCategory[cat].length} ${byCategory[cat].length === 1 ? 'item' : 'itens'})</span>
          </h5>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5" id="cat-items-${cat.replace(/\s+/g, '-')}"></div>
        `;

        const grid = catBlock.querySelector(`#cat-items-${cat.replace(/\s+/g, '-')}`);
        byCategory[cat].forEach(item => {
          const isChecked = !!checkedState[item.id];
          const itemElem = document.createElement("label");
          itemElem.className = `flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
            isChecked ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
          }`;

          itemElem.innerHTML = `
            <input type="checkbox" data-item-id="${item.id}" ${isChecked ? 'checked' : ''} class="checklist-item-cb rounded border-slate-300 text-brand-600 focus:ring-brand-500">
            <div class="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              ${item.cutout_url || item.original_url
                ? `<img src="${item.cutout_url || item.original_url}" alt="${item.tipo}" class="max-h-full max-w-full object-contain">`
                : `<span class="text-xs">👕</span>`
              }
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-xs font-bold text-slate-800 block truncate ${isChecked ? 'line-through text-slate-400' : ''}">${item.tipo}</span>
              <span class="text-[10px] text-slate-500 block truncate">${item.cor_predominante || ""}</span>
            </div>
          `;

          const cb = itemElem.querySelector(".checklist-item-cb");
          cb.addEventListener("change", (e) => {
            checkedState[item.id] = e.target.checked;
            localStorage.setItem(storageKey, JSON.stringify(checkedState));
            renderTripChecklist();
          });

          grid.appendChild(itemElem);
        });

        packingChecklistItems.appendChild(catBlock);
      });
    }

    // Packing Tips
    if (tripPackingTips) {
      tripPackingTips.textContent = currentTrip.packing_tips || "Organize peças que combinem entre si e priorize calçados confortáveis para os passeios a pé.";
    }

    // Essentials List
    if (tripEssentialsList) {
      tripEssentialsList.innerHTML = "";
      const essentials = currentTrip.suggested_essentials || ["Documentos e passaporte", "Carregador e adaptador de tomada", "Protetor solar", "Medicamentos básicos"];
      essentials.forEach(ess => {
        const li = document.createElement("li");
        li.textContent = ess;
        tripEssentialsList.appendChild(li);
      });
    }
  }

  // ==========================================
  // SAVED TRIPS TAB LOGIC
  // ==========================================

  async function loadSavedTrips() {
    if (!savedTripsGrid) return;
    savedTripsGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-xs text-slate-400">
        <span class="inline-block animate-spin text-lg mb-2">⏳</span>
        <p>Carregando histórico de viagens...</p>
      </div>
    `;

    try {
      const resp = await authFetch("/api/trips");
      if (!resp.ok) throw new Error("Falha ao carregar viagens.");
      const data = await resp.json();
      userTrips = data.trips || [];

      if (!userTrips.length) {
        savedTripsGrid.innerHTML = `
          <div class="col-span-full py-12 text-center text-slate-400 space-y-3 bg-white border border-dashed border-slate-200 rounded-2xl p-6">
            <span class="text-3xl">🧳</span>
            <p class="text-sm">Você ainda não planejou nenhuma viagem.</p>
            <button type="button" class="btn-new-trip-inline px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow transition">
              Planejar Minha Primeira Viagem ✈️
            </button>
          </div>
        `;
        savedTripsGrid.querySelector(".btn-new-trip-inline")?.addEventListener("click", () => {
          closeTripViewer();
          openPackingModal();
        });
        return;
      }

      savedTripsGrid.innerHTML = "";
      userTrips.forEach(trip => {
        const card = document.createElement("div");
        card.className = "bg-white border border-slate-200 hover:border-brand-300 rounded-2xl p-4 shadow-sm hover:shadow transition flex flex-col justify-between space-y-3";

        const countDays = trip.total_days || (trip.days ? trip.days.length : 0);
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                ${countDays} ${countDays === 1 ? 'Dia' : 'Dias'}
              </span>
              <span class="text-[10px] text-slate-400">
                ${formatDateBR(trip.arrival_date)}
              </span>
            </div>
            <h5 class="text-sm font-bold text-slate-900 font-serif leading-snug">${trip.destination}</h5>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">${trip.summary || "Roteiro e looks criados com Gemini."}</p>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button type="button" class="btn-open-saved-trip px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5">
              <span>🗺️</span>
              <span>Abrir Roteiro</span>
            </button>
            <button type="button" class="btn-delete-saved-trip p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir Viagem">
              <span class="text-xs">🗑️</span>
            </button>
          </div>
        `;

        card.querySelector(".btn-open-saved-trip").addEventListener("click", () => {
          window.location.href = `/viagem.html?id=${trip.id}`;
        });

        card.querySelector(".btn-delete-saved-trip").addEventListener("click", () => {
          handleDeleteTrip(trip.id);
        });

        savedTripsGrid.appendChild(card);
      });
    } catch (err) {
      console.error("Load trips error:", err);
      savedTripsGrid.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-red-500">
          Não foi possível carregar as viagens salvas.
        </div>
      `;
    }
  }

  async function openSavedTripsSelectorPopup() {
    if (!currentUser) {
      alert("Por favor, faça login com sua Conta Google para ver suas viagens planejadas.");
      return;
    }
    if (savedTripsSelectorModal) savedTripsSelectorModal.classList.remove("hidden");
    if (!savedTripsSelectorContainer) return;

    savedTripsSelectorContainer.innerHTML = `
      <div class="py-12 text-center text-xs text-slate-400">
        <span class="inline-block animate-spin text-lg mb-2">⏳</span>
        <p>Carregando suas viagens planejadas...</p>
      </div>
    `;

    try {
      const resp = await authFetch("/api/trips");
      if (!resp.ok) throw new Error("Falha ao carregar viagens.");
      const data = await resp.json();
      const trips = data.trips || [];

      if (!trips.length) {
        savedTripsSelectorContainer.innerHTML = `
          <div class="py-10 text-center text-slate-400 space-y-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
            <span class="text-3xl">🧳</span>
            <p class="text-sm font-medium text-slate-600">Você ainda não planejou nenhuma viagem.</p>
            <p class="text-xs text-slate-400">Monte um roteiro inteligente com looks completos para cada dia e noite!</p>
            <button type="button" class="btn-create-first-trip px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow transition">
              Planejar Minha Primeira Viagem ✈️
            </button>
          </div>
        `;
        savedTripsSelectorContainer.querySelector(".btn-create-first-trip")?.addEventListener("click", () => {
          if (savedTripsSelectorModal) savedTripsSelectorModal.classList.add("hidden");
          openPackingModal();
        });
        return;
      }

      savedTripsSelectorContainer.innerHTML = "";
      trips.forEach(trip => {
        const countDays = trip.total_days || (trip.days ? trip.days.length : 0);
        const card = document.createElement("div");
        card.className = "p-4 rounded-2xl border border-slate-200 hover:border-brand-300 bg-white hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group";

        card.innerHTML = `
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0 group-hover:scale-105 transition">
              <span class="text-base">✈️</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h5 class="text-sm font-bold text-slate-900 font-serif truncate group-hover:text-brand-600 transition">${escapeHtml(trip.destination)}</h5>
                <span class="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full shrink-0">
                  ${countDays} ${countDays === 1 ? 'Dia' : 'Dias'}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">${formatDateBR(trip.arrival_date)} → ${formatDateBR(trip.departure_date)}</p>
              <p class="text-[11px] text-slate-400 truncate mt-0.5">${escapeHtml(trip.summary || '')}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <a href="/viagem.html?id=${trip.id}" class="btn-go-to-trip px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5">
              <span>Abrir Roteiro</span>
              <span>➡️</span>
            </a>
            <button type="button" class="btn-delete-trip-selector p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition" title="Excluir Viagem">
              <span class="text-xs">🗑️</span>
            </button>
          </div>
        `;

        // Clicking card opens the trip
        card.addEventListener("click", (e) => {
          if (e.target.closest(".btn-delete-trip-selector")) return;
          window.location.href = `/viagem.html?id=${trip.id}`;
        });

        card.querySelector(".btn-delete-trip-selector").addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm(`Deseja excluir a viagem para ${trip.destination}?`)) return;
          try {
            await authFetch(`/api/trips/${trip.id}`, { method: "DELETE" });
            openSavedTripsSelectorPopup();
          } catch (err) {
            alert("Erro ao excluir viagem.");
          }
        });

        savedTripsSelectorContainer.appendChild(card);
      });
    } catch (err) {
      console.error("Saved trips error:", err);
      savedTripsSelectorContainer.innerHTML = `<p class="text-xs text-red-500 text-center py-6">Erro ao carregar viagens: ${err.message}</p>`;
    }
  }

  async function handleDeleteTrip(tripId) {
    if (!confirm("Tem certeza de que deseja excluir esta viagem salva?")) return;
    try {
      const resp = await authFetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!resp.ok) throw new Error("Erro ao excluir.");
      if (currentTrip && currentTrip.id === tripId) {
        currentTrip = null;
      }
      loadSavedTrips();
    } catch (err) {
      console.error("Delete trip error:", err);
      alert("Erro ao excluir viagem.");
    }
  }

  // ==========================================
  // Generic Items & Custom Categories Modals
  // ==========================================

  // Generic Item Modal Logic
  function openGenericItemModal(preselectedCategory = null) {
    if (!newGenericItemModal) return;
    genericItemForm?.reset();
    if (genericItemQuantidade) genericItemQuantidade.value = "5";
    if (genericItemNaoRepetir) genericItemNaoRepetir.checked = true;
    if (genericItemCorPicker) genericItemCorPicker.value = "#FFFFFF";
    if (genericItemCor) genericItemCor.value = "Branco";
    updateCategorySelects();
    if (preselectedCategory && genericItemCategoria) {
      if (!availableCategories.includes(preselectedCategory)) {
        availableCategories.push(preselectedCategory);
        updateCategorySelects();
      }
      genericItemCategoria.value = preselectedCategory;
    }
    newGenericItemModal.classList.remove("hidden");
    genericItemTipo?.focus();
  }

  function closeGenericItemModal() {
    newGenericItemModal?.classList.add("hidden");
  }

  openGenericItemModalBtn?.addEventListener("click", () => openGenericItemModal());
  closeNewGenericItemModalBtn?.addEventListener("click", closeGenericItemModal);
  cancelGenericItemBtn?.addEventListener("click", closeGenericItemModal);

  btnQtyMinus?.addEventListener("click", () => {
    if (!genericItemQuantidade) return;
    const v = parseInt(genericItemQuantidade.value) || 1;
    genericItemQuantidade.value = Math.max(1, v - 1);
  });

  btnQtyPlus?.addEventListener("click", () => {
    if (!genericItemQuantidade) return;
    const v = parseInt(genericItemQuantidade.value) || 1;
    genericItemQuantidade.value = v + 1;
  });

  genericItemCorPicker?.addEventListener("input", (e) => {
    if (genericItemCor) genericItemCor.value = e.target.value;
  });

  btnInlineNewCategory?.addEventListener("click", () => {
    openNewCategoryModal();
  });

  // Suggestion chips in generic item modal
  document.querySelectorAll("#newGenericItemModal .generic-chip, #newGenericItemModal .suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const tipo = chip.dataset.tipo || chip.textContent.trim();
      const cat = chip.dataset.cat;
      const qty = chip.dataset.qty || 5;
      const cor = chip.dataset.cor || "Branco";
      const corHex = chip.dataset.hex || chip.dataset.corHex || "#FFFFFF";

      if (genericItemTipo) genericItemTipo.value = tipo;
      if (genericItemQuantidade) genericItemQuantidade.value = qty;
      if (genericItemCor) genericItemCor.value = cor;
      if (genericItemCorPicker) genericItemCorPicker.value = corHex;
      if (cat && genericItemCategoria) {
        if (!availableCategories.includes(cat)) {
          availableCategories.push(cat);
          updateCategorySelects();
        }
        genericItemCategoria.value = cat;
      }
    });
  });

  genericItemForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = (genericItemTipo?.value || "").trim();
    if (!tipo) {
      alert("Por favor, digite o nome ou tipo da peça básica.");
      return;
    }
    const categoria = genericItemCategoria?.value || "Moda Íntima";
    const quantidade = Math.max(1, parseInt(genericItemQuantidade?.value) || 1);
    const cor_predominante = (genericItemCor?.value || "Branco").trim();
    const cor_hex = genericItemCorPicker?.value || "#FFFFFF";
    const nao_repetir = genericItemNaoRepetir ? genericItemNaoRepetir.checked : true;
    const descricao = (genericItemDescricao?.value || "").trim();

    try {
      const resp = await authFetch("/api/clothes/generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          categoria,
          quantidade,
          cor_predominante,
          cor_hex,
          nao_repetir,
          descricao
        })
      });

      if (resp.ok) {
        closeGenericItemModal();
        await loadWardrobe();
        await updateSummaryStats();
      } else {
        const err = await resp.json().catch(() => ({}));
        alert("Erro ao adicionar item básico: " + (err.detail || resp.statusText));
      }
    } catch (err) {
      console.error("Error adding generic item:", err);
      alert("Erro de conexão ao salvar item básico.");
    }
  });

  // New Category Modal Logic
  function openNewCategoryModal() {
    if (!newCategoryModal) return;
    newCategoryForm?.reset();
    newCategoryModal.classList.remove("hidden");
    newCategoryNameInput?.focus();
  }

  function closeNewCategoryModal() {
    newCategoryModal?.classList.add("hidden");
  }

  openNewCategoryModalBtn?.addEventListener("click", () => openNewCategoryModal());
  closeNewCategoryModalBtn?.addEventListener("click", closeNewCategoryModal);
  cancelNewCategoryBtn?.addEventListener("click", closeNewCategoryModal);

  newCategoryForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const catName = (newCategoryNameInput?.value || "").trim();
    if (!catName) {
      alert("Por favor, digite o nome da categoria.");
      return;
    }

    try {
      const resp = await authFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.categories && Array.isArray(data.categories)) {
          availableCategories = data.categories;
        } else if (!availableCategories.includes(catName)) {
          availableCategories.push(catName);
        }
        updateCategorySelects();
        closeNewCategoryModal();
        await updateSummaryStats();
        // Switch to the newly created category in the filter
        selectedCategories.clear();
        selectedCategories.add(catName);
        await loadWardrobe();
      } else {
        const err = await resp.json().catch(() => ({}));
        alert("Erro ao criar categoria: " + (err.detail || resp.statusText));
      }
    } catch (err) {
      console.error("Error creating category:", err);
      alert("Erro de conexão ao salvar categoria.");
    }
  });

  // Rename Category Modal Logic
  function openRenameCategoryModal(catName) {
    if (!renameCategoryModal) return;
    if (renameCategoryOldNameInput) renameCategoryOldNameInput.value = catName;
    if (renameCategoryNewNameInput) {
      renameCategoryNewNameInput.value = catName;
      renameCategoryNewNameInput.focus();
    }
    renameCategoryModal.classList.remove("hidden");
  }

  function closeRenameCategoryModal() {
    renameCategoryModal?.classList.add("hidden");
  }

  closeRenameCategoryModalBtn?.addEventListener("click", closeRenameCategoryModal);
  cancelRenameCategoryBtn?.addEventListener("click", closeRenameCategoryModal);

  renameCategoryForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldName = (renameCategoryOldNameInput?.value || "").trim();
    const newName = (renameCategoryNewNameInput?.value || "").trim();
    if (!newName) {
      alert("Por favor, digite o novo nome da categoria.");
      return;
    }
    if (oldName === newName) {
      closeRenameCategoryModal();
      return;
    }

    try {
      const resp = await authFetch("/api/categories/rename", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_name: oldName, new_name: newName })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.categories && Array.isArray(data.categories)) {
          availableCategories = data.categories;
        } else {
          const idx = availableCategories.indexOf(oldName);
          if (idx !== -1) availableCategories[idx] = newName;
        }
        if (selectedCategories.has(oldName)) {
          selectedCategories.delete(oldName);
          selectedCategories.add(newName);
        }
        updateCategorySelects();
        closeRenameCategoryModal();
        await updateSummaryStats();
        await loadWardrobe();
      } else {
        const err = await resp.json().catch(() => ({}));
        alert("Erro ao renomear categoria: " + (err.detail || resp.statusText));
      }
    } catch (err) {
      console.error("Error renaming category:", err);
      alert("Erro de conexão ao renomear categoria.");
    }
  });

  // Delete Category Logic (Requisito: deletar categoria sem nenhuma peça)
  async function handleDeleteCategory(catName) {
    if (!confirm(`Deseja realmente excluir a categoria "${catName}"?`)) return;

    try {
      const resp = await authFetch(`/api/categories/${encodeURIComponent(catName)}`, {
        method: "DELETE"
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.categories && Array.isArray(data.categories)) {
          availableCategories = data.categories;
        } else {
          availableCategories = availableCategories.filter(c => c !== catName);
        }
        selectedCategories.delete(catName);
        if (selectedCategories.size === 0) selectedCategories.add("Todas");
        updateCategorySelects();
        await updateSummaryStats();
        await loadWardrobe();
      } else {
        const err = await resp.json().catch(() => ({}));
        alert(err.detail || "Não foi possível excluir a categoria.");
      }
    } catch (err) {
      console.error("Error deleting category:", err);
      alert("Erro de conexão ao excluir categoria.");
    }
  }

  // ==========================================
  // BATCH OPERATIONS & CATEGORY UPLOAD LOGIC
  // ==========================================
  btnBatchSelectAll?.addEventListener("click", () => {
    wardrobeItems.forEach(i => selectedPieceIds.add(i.id));
    clothesGrid.querySelectorAll(".piece-select-checkbox").forEach(cb => {
      cb.checked = true;
    });
    clothesGrid.querySelectorAll(".garment-card").forEach(c => {
      c.classList.add("ring-2", "ring-brand-500", "border-brand-500");
    });
    updateBatchActionBar();
  });

  btnBatchClear?.addEventListener("click", () => {
    selectedPieceIds.clear();
    clothesGrid.querySelectorAll(".piece-select-checkbox").forEach(cb => {
      cb.checked = false;
    });
    clothesGrid.querySelectorAll(".garment-card").forEach(c => {
      c.classList.remove("ring-2", "ring-brand-500", "border-brand-500");
    });
    updateBatchActionBar();
  });

  btnBatchDelete?.addEventListener("click", async () => {
    const count = selectedPieceIds.size;
    if (count === 0) return;
    if (confirm(`Tem certeza que deseja excluir as ${count} peças selecionadas do seu Roupeiro? Esta ação não pode ser desfeita.`)) {
      try {
        const resp = await authFetch("/api/clothes/batch-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_ids: Array.from(selectedPieceIds) })
        });
        if (resp.ok) {
          selectedPieceIds.clear();
          updateBatchActionBar();
          await updateSummaryStats();
          await loadWardrobe();
        } else {
          const err = await resp.json().catch(() => ({}));
          alert("Erro ao excluir peças: " + (err.detail || err.message));
        }
      } catch (err) {
        console.error("Error in batch delete:", err);
        alert("Erro ao excluir peças selecionadas.");
      }
    }
  });

  btnBatchMoveModal?.addEventListener("click", () => {
    if (selectedPieceIds.size === 0) return;
    if (batchMoveCountText) batchMoveCountText.textContent = selectedPieceIds.size;
    if (batchMoveCategorySelect) {
      batchMoveCategorySelect.innerHTML = availableCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    }
    batchMoveModal?.classList.remove("hidden");
  });

  closeBatchMoveModalBtn?.addEventListener("click", () => batchMoveModal?.classList.add("hidden"));
  cancelBatchMoveBtn?.addEventListener("click", () => batchMoveModal?.classList.add("hidden"));

  confirmBatchMoveBtn?.addEventListener("click", async () => {
    const targetCat = batchMoveCategorySelect?.value;
    if (!targetCat) {
      alert("Selecione uma categoria de destino.");
      return;
    }
    try {
      const resp = await authFetch("/api/clothes/batch-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_ids: Array.from(selectedPieceIds), target_category: targetCat })
      });
      if (resp.ok) {
        batchMoveModal?.classList.add("hidden");
        selectedPieceIds.clear();
        updateBatchActionBar();
        await updateSummaryStats();
        await loadWardrobe();
      } else {
        const err = await resp.json().catch(() => ({}));
        alert("Erro ao mover peças: " + (err.detail || err.message));
      }
    } catch (err) {
      console.error("Error in batch move:", err);
      alert("Erro ao mover peças selecionadas.");
    }
  });

  // Direct category upload listener (Requisito: adicionar fotos diretamente à categoria)
  categorySpecificFileInput?.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleFilesUpload(Array.from(e.target.files), uploadTargetCategory);
      e.target.value = "";
      uploadTargetCategory = null;
    }
  });

  // Bootstrap
  initApp();
})();
