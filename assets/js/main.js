/**
 * SwiftCart (vanilla JS)
 * - Fetches data from FakeStore API
 * - Category filtering
 * - Product details dialog (modal)
 * - Cart drawer + localStorage persistence
 */

(() => {
  // ---------------------------
  // API
  // ---------------------------
  const API_BASE = "https://fakestoreapi.com";
  const API = {
    products: () => `${API_BASE}/products`,
    categories: () => `${API_BASE}/products/categories`,
    byCategory: (category) =>
      `${API_BASE}/products/category/${encodeURIComponent(category)}`,
    product: (id) => `${API_BASE}/products/${id}`,
  };

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  // ---------------------------
  // DOM helpers
  // ---------------------------
  const $ = (id) => document.getElementById(id);

  const dom = {
    // header/nav
    mobileNav: $("mobileNav"),
    menuOpenBtn: $("menuOpenBtn"),
    menuCloseBtn: $("menuCloseBtn"),

    // cart drawer
    cartToggleBtn: $("cartToggleBtn"),
    cartBadge: $("cartBadge"),
    cartDrawer: $("cartDrawer"),
    cartCloseBtn: $("cartCloseBtn"),
    cartList: $("cartList"),
    cartSubtotal: $("cartSubtotal"),

    // home/products grids
    featuredGrid: $("featuredGrid"),
    productGrid: $("productGrid"),

    // category filters (products page only)
    categoryFilters: $("categoryFilters"),

    // loaders
    pageLoader: $("pageLoader"),
    dialogLoader: $("dialogLoader"),
    dialogBody: $("dialogBody"),

    // dialog (modal)
    productDialog: $("productDialog"),
    dialogCloseBtn: $("dialogCloseBtn"),
    dialogImg: $("dialogImg"),
    dialogTitle: $("dialogTitle"),
    dialogDesc: $("dialogDesc"),
    dialogPrice: $("dialogPrice"),
    dialogRating: $("dialogRating"),
    dialogAddBtn: $("dialogAddBtn"),

    // newsletter
    newsletterInput: $("newsletterInput"),
    newsletterBtn: $("newsletterBtn"),
    newsletterStatus: $("newsletterStatus"),
  };

  const show = (el) => el?.classList.remove("hidden");
  const hide = (el) => el?.classList.add("hidden");

  function showPageLoader() {
    show(dom.pageLoader);
  }
  function hidePageLoader() {
    hide(dom.pageLoader);
  }
  function showDialogLoader() {
    show(dom.dialogLoader);
    dom.dialogBody?.classList.add("hidden");
  }
  function hideDialogLoader() {
    hide(dom.dialogLoader);
    dom.dialogBody?.classList.remove("hidden");
  }

  // ---------------------------
  // State
  // ---------------------------
  let productsCache = [];
  let cartState = readCart();
  let activeProductId = null;

  // ---------------------------
  // Boot
  // ---------------------------
  document.addEventListener("DOMContentLoaded", boot);

  function boot() {
    wireEvents();
    refreshCartBadge();

    // page detection
    const isHome = Boolean(dom.featuredGrid);
    const isProducts = Boolean(dom.productGrid);

    if (isHome) loadFeaturedProducts();
    if (isProducts) {
      loadCategoryFilters();
      loadAllProducts();
    }
  }

  function wireEvents() {
    // mobile nav
    dom.menuOpenBtn?.addEventListener("click", toggleMobileNav);
    dom.menuCloseBtn?.addEventListener("click", toggleMobileNav);

    // cart
    dom.cartToggleBtn?.addEventListener("click", openCartDrawer);
    dom.cartCloseBtn?.addEventListener("click", closeCartDrawer);
    dom.cartList?.addEventListener("click", onCartListClick);

    // grid actions (event delegation)
    dom.featuredGrid?.addEventListener("click", onGridAction);
    dom.productGrid?.addEventListener("click", onGridAction);

    // category filters
    dom.categoryFilters?.addEventListener("click", onCategoryClick);

    // dialog
    dom.dialogCloseBtn?.addEventListener("click", closeProductDialog);
    dom.productDialog?.addEventListener("click", (e) => {
      if (e.target === dom.productDialog) closeProductDialog();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !dom.productDialog?.classList.contains("hidden")) {
        closeProductDialog();
      }
    });
    dom.dialogAddBtn?.addEventListener("click", () => {
      if (activeProductId == null) return;
      addItemToCart(activeProductId);
      closeProductDialog();
    });

    // newsletter
    dom.newsletterBtn?.addEventListener("click", handleNewsletter);
  }

  function toggleMobileNav() {
    dom.mobileNav?.classList.toggle("translate-x-full");
  }

  // ---------------------------
  // Cart (localStorage)
  // ---------------------------
  const STORAGE = {
    cart: "cart",
    subscribers: "subscribers",
  };

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.cart)) || [];
    } catch {
      return [];
    }
  }

  function writeCart() {
    localStorage.setItem(STORAGE.cart, JSON.stringify(cartState));
  }

  function refreshCartBadge() {
    if (dom.cartBadge) dom.cartBadge.innerText = String(cartState.length);
  }

  function addItemToCart(productId) {
    const product = productsCache.find((p) => p.id === Number(productId));
    if (!product) return;

    const alreadyAdded = cartState.some((p) => p.id === product.id);
    if (alreadyAdded) {
      alert("Already in cart");
      return;
    }

    cartState.push(product);
    writeCart();
    refreshCartBadge();
    alert("Added to cart");
  }

  function openCartDrawer() {
    dom.cartDrawer?.classList.remove("translate-x-full");
    renderCart();
  }

  function closeCartDrawer() {
    dom.cartDrawer?.classList.add("translate-x-full");
  }

  function onCartListClick(e) {
    const btn = e.target.closest("button[data-action='remove']");
    if (!btn) return;

    const index = Number(btn.dataset.index);
    if (Number.isNaN(index)) return;

    cartState.splice(index, 1);
    writeCart();
    refreshCartBadge();
    renderCart();
  }

  function renderCart() {
    if (!dom.cartList || !dom.cartSubtotal) return;

    dom.cartList.innerHTML = "";

    let subtotal = 0;

    cartState.forEach((item, index) => {
      subtotal += Number(item.price) || 0;

      const row = document.createElement("div");
      row.className = "flex items-center gap-4 border-b pb-3";

      row.innerHTML = `
        <img src="${item.image}" class="w-16 h-16 object-contain" alt="${escapeHtml(
        item.title
      )}" />

        <div class="flex-1">
          <h4 class="text-sm font-semibold">${escapeHtml(item.title.slice(0, 30))}</h4>
          <p class="text-sm text-gray-500">$${item.price}</p>
        </div>

        <button
          data-action="remove"
          data-index="${index}"
          class="p-2 rounded hover:bg-red-50 text-red-500 hover:text-red-600 cursor-pointer transition"
          aria-label="Remove item"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      `;

      dom.cartList.appendChild(row);
    });

    dom.cartSubtotal.innerText = `$${subtotal.toFixed(2)}`;
  }

  // ---------------------------
  // Home: Featured products
  // ---------------------------
  async function loadFeaturedProducts() {
    try {
      showPageLoader();
      const products = await fetchJson(API.products());
      productsCache = products;

      const topThree = [...products]
        .sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0))
        .slice(0, 3);

      renderProductCards(dom.featuredGrid, topThree, { showCount: true });
    } catch (err) {
      console.error(err);
    } finally {
      hidePageLoader();
    }
  }

  // ---------------------------
  // Products page: categories + grid
  // ---------------------------
  async function loadAllProducts() {
    try {
      showPageLoader();
      productsCache = await fetchJson(API.products());
      renderProductCards(dom.productGrid, productsCache, { showCount: false });
    } catch (err) {
      console.error(err);
    } finally {
      hidePageLoader();
    }
  }

  async function loadCategoryFilters() {
    if (!dom.categoryFilters) return;

    try {
      const categories = await fetchJson(API.categories());

      dom.categoryFilters.innerHTML = "";
      dom.categoryFilters.appendChild(makeCategoryBtn("All", true));

      categories.forEach((cat) => dom.categoryFilters.appendChild(makeCategoryBtn(cat)));
    } catch (err) {
      console.error(err);
    }
  }

  function makeCategoryBtn(label, isActive = false) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.category = label;

    const base =
      "px-5 py-2 rounded-full transition cursor-pointer text-sm font-medium";
    const normal = `${base} bg-gray-100 text-gray-600 hover:bg-white hover:shadow`;
    const active = `${base} bg-indigo-600 text-white shadow-md`;

    btn.className = isActive ? active : normal;
    btn.textContent = label;

    return btn;
  }

  async function onCategoryClick(e) {
    const btn = e.target.closest("button[data-category]");
    if (!btn) return;

    // set active styles
    const base =
      "px-5 py-2 rounded-full transition cursor-pointer text-sm font-medium";
    const normal = `${base} bg-gray-100 text-gray-600 hover:bg-white hover:shadow`;
    const active = `${base} bg-indigo-600 text-white shadow-md`;

    dom.categoryFilters
      ?.querySelectorAll("button[data-category]")
      .forEach((b) => (b.className = normal));

    btn.className = active;

    const category = btn.dataset.category;

    if (!category || category === "All") {
      renderProductCards(dom.productGrid, productsCache, { showCount: false });
      return;
    }

    await loadProductsByCategory(category);
  }

  async function loadProductsByCategory(category) {
    try {
      showPageLoader();
      const products = await fetchJson(API.byCategory(category));
      renderProductCards(dom.productGrid, products, { showCount: false });
    } catch (err) {
      console.error(err);
    } finally {
      hidePageLoader();
    }
  }

  // ---------------------------
  // Card rendering + actions
  // ---------------------------
  function renderProductCards(targetEl, products, opts = { showCount: false }) {
    if (!targetEl) return;

    targetEl.innerHTML = "";

    products.forEach((product) => {
      const titleMax = opts.showCount ? 40 : 35;
      const shortTitle =
        product.title.length > titleMax
          ? `${product.title.slice(0, titleMax)}...`
          : product.title;

      const ratingRate = product.rating?.rate ?? 0;
      const ratingCount = product.rating?.count ?? 0;

      const card = document.createElement("div");
      card.className =
        "bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group";

      card.innerHTML = `
        <div class="bg-gray-200 p-8 flex justify-center overflow-hidden">
          <img
            src="${product.image}"
            class="h-50 object-contain group-hover:scale-110 transition duration-300"
            alt="${escapeHtml(product.title)}"
          />
        </div>

        <div class="p-5 space-y-3 ${opts.showCount ? "" : "text-left"}">

          <div class="flex justify-between items-center text-sm">
            <span class="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-medium">
              ${escapeHtml(product.category)}
            </span>

            ${
              opts.showCount
                ? `
                <span class="flex items-center gap-1 text-yellow-500">
                  <i class="fa-solid fa-star"></i>
                  <span class="text-gray-400">${ratingRate} (${ratingCount})</span>
                </span>
              `
                : `
                <span class="flex items-center gap-1 text-gray-400">
                  <i class="fa-solid fa-star text-yellow-500"></i> ${ratingRate}
                </span>
              `
            }
          </div>

          <h3 class="font-semibold text-gray-800">${escapeHtml(shortTitle)}</h3>

          <p class="text-xl font-bold text-gray-900">$${product.price}</p>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              data-action="details"
              data-id="${product.id}"
              class="flex-1 border rounded-lg py-2 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <i class="fa-regular fa-eye"></i>
              Details
            </button>

            <button
              type="button"
              data-action="add"
              data-id="${product.id}"
              class="flex-1 bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <i class="fa-solid fa-cart-plus"></i>
              Add
            </button>
          </div>
        </div>
      `;

      targetEl.appendChild(card);
    });
  }

  function onGridAction(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = Number(btn.dataset.id);

    if (!id || Number.isNaN(id)) return;

    if (action === "details") openProductDialog(id);
    if (action === "add") addItemToCart(id);
  }

  // ---------------------------
  // Product dialog (modal)
  // ---------------------------
  async function openProductDialog(productId) {
    try {
      activeProductId = Number(productId);

      dom.productDialog?.classList.remove("hidden");

      // clear old values (prevents flashing)
      if (dom.dialogImg) dom.dialogImg.src = "";
      if (dom.dialogTitle) dom.dialogTitle.textContent = "";
      if (dom.dialogDesc) dom.dialogDesc.textContent = "";
      if (dom.dialogPrice) dom.dialogPrice.textContent = "";
      if (dom.dialogRating) dom.dialogRating.textContent = "";

      showDialogLoader();

      const product = await fetchJson(API.product(productId));

      dom.dialogImg.src = product.image;
      dom.dialogTitle.textContent = product.title;
      dom.dialogDesc.textContent = product.description;
      dom.dialogPrice.textContent = `$${product.price}`;

      const rate = product.rating?.rate ?? 0;
      const count = product.rating?.count ?? 0;

      dom.dialogRating.innerHTML = `<i class="fa-solid fa-star text-yellow-500"></i> ${rate} (${count})`;
    } catch (err) {
      console.error("Dialog load failed:", err);
    } finally {
      hideDialogLoader();
    }
  }

  function closeProductDialog() {
    dom.productDialog?.classList.add("hidden");
    activeProductId = null;
  }

  // ---------------------------
  // Newsletter
  // ---------------------------
  function handleNewsletter() {
    const input = dom.newsletterInput;
    const status = dom.newsletterStatus;

    if (!input || !status) return;

    const email = input.value.trim();

    if (!email) {
      status.textContent = "Please enter email";
      status.className = "text-red-500 text-sm mt-2";
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      status.textContent = "Invalid email address";
      status.className = "text-red-500 text-sm mt-2";
      return;
    }

    const list = safeJsonParse(localStorage.getItem(STORAGE.subscribers), []);
    list.push(email);
    localStorage.setItem(STORAGE.subscribers, JSON.stringify(list));

    status.textContent = "Subscribed successfully";
    status.className = "text-green-600 text-sm mt-2";
    input.value = "";
  }

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  // ---------------------------
  // Small utilities
  // ---------------------------
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
