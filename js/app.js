import { observeAuth, login, logout, getUserProfile, listenUsers, createEmployee, setEmployeeActive, createOrder, changeOrder, listenOrders } from "./firebase.js";

const money = n => new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN"
}).format(Number(n) || 0);

let products = [
  {id:1,name:"Hamburguesa Clásica",price:120,category:"hamburguesas",icon:"🍔"},
  {id:2,name:"Hamburguesa Especial",price:150,category:"hamburguesas",icon:"🍔"},
  {id:3,name:"Hamburguesa Doble",price:180,category:"hamburguesas",icon:"🍔"},
  {id:4,name:"Tacos al Pastor",price:90,category:"tacos",icon:"🌮"},
  {id:5,name:"Tacos de Bistec",price:100,category:"tacos",icon:"🌮"},
  {id:6,name:"Coca-Cola",price:35,category:"bebidas",icon:"🥤"},
  {id:7,name:"Agua Natural",price:25,category:"bebidas",icon:"💧"},
  {id:8,name:"Pastel de Chocolate",price:70,category:"postres",icon:"🍰"},
  {id:9,name:"Cheesecake",price:75,category:"postres",icon:"🍰"}
];

let currentTable = null;
let draftOrders = {};
let remoteOrders = [];
let selectedBillId = null;
let kitchenFilter = "todos";
let paymentMethod = "Efectivo";
let firebaseOnline = false;

let inventory = [
  {id:1,name:"Carne para hamburguesa",category:"Cocina",stock:24,min:10,unit:"pzas"},
  {id:2,name:"Pan de hamburguesa",category:"Panadería",stock:18,min:12,unit:"pzas"},
  {id:3,name:"Tortillas",category:"Cocina",stock:85,min:30,unit:"pzas"},
  {id:4,name:"Coca-Cola",category:"Bebidas",stock:12,min:15,unit:"pzas"},
  {id:5,name:"Agua natural",category:"Bebidas",stock:28,min:12,unit:"pzas"}
];

let remoteUsers = [];
let currentUserProfile = null;
let stopUsersListener = null;

const categories = [
  ["todos","Todos"],
  ["hamburguesas","🍔 Hamburguesas"],
  ["tacos","🌮 Tacos"],
  ["bebidas","🥤 Bebidas"],
  ["postres","🍰 Postres"]
];

const titleMap = {
  pos:["Punto de venta","Toma pedidos y administra mesas"],
  cocina:["Cocina","Pedidos sincronizados con Firebase"],
  caja:["Caja","Cobra cuentas abiertas"],
  inventario:["Inventario","Control de existencias"],
  admin:["Administración","Ventas, productos y métricas"],
  usuarios:["Usuarios","Perfiles y roles del sistema"]
};

const ROLE_LABELS = {
  admin: "Administrador",
  mesero: "Mesero",
  cocina: "Cocina",
  caja: "Caja"
};

const ROLE_VIEWS = {
  admin: ["pos","cocina","caja","inventario","admin","usuarios"],
  mesero: ["pos"],
  cocina: ["cocina"],
  caja: ["caja"]
};

function defaultViewForRole(role) {
  return ROLE_VIEWS[role]?.[0] || "pos";
}

function canAccess(view) {
  return Boolean(currentUserProfile && ROLE_VIEWS[currentUserProfile.role]?.includes(view));
}

function applyPermissions() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("permission-hidden", !canAccess(btn.dataset.view));
  });

  const initial = defaultViewForRole(currentUserProfile?.role);
  switchView(initial);
}

function showLogin(message = "") {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("appShell").classList.add("auth-hidden");
  document.getElementById("loginMessage").textContent = message;
}

function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appShell").classList.remove("auth-hidden");

  const name = currentUserProfile?.name || "Empleado";
  const role = ROLE_LABELS[currentUserProfile?.role] || currentUserProfile?.role || "Usuario";
  document.getElementById("currentUserName").textContent = name;
  document.getElementById("currentUserRole").textContent = role;
  document.getElementById("currentUserAvatar").textContent = name.trim().charAt(0).toUpperCase() || "U";
}


function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function setConnectionStatus(ok, text) {
  const el = document.querySelector(".top-status");
  if (!el) return;
  el.innerHTML = `<span class="dot" style="background:${ok ? "#22c55e" : "#ef4444"}"></span>${text}`;
}

function switchView(v) {
  if (currentUserProfile && !canAccess(v)) return toast("No tienes permiso para entrar a esta sección.");
  document.querySelectorAll(".view").forEach(x => x.classList.remove("active"));
  document.getElementById("view-" + v).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  document.getElementById("pageTitle").textContent = titleMap[v][0];
  document.getElementById("pageSubtitle").textContent = titleMap[v][1];
  document.getElementById("sidebar").classList.remove("open");

  if (v === "cocina") renderKitchen();
  if (v === "caja") renderCash();
  if (v === "inventario") renderInventory();
  if (v === "admin") renderAdmin();
  if (v === "usuarios") renderUsers();
}

document.querySelectorAll(".nav-btn").forEach(b => b.onclick = () => switchView(b.dataset.view));
document.getElementById("menuBtn").onclick = () => document.getElementById("sidebar").classList.toggle("open");

function draft(table) {
  if (!draftOrders[table]) draftOrders[table] = {items:[], note:""};
  return draftOrders[table];
}

function remoteForTable(table) {
  return remoteOrders.find(o => Number(o.table) === Number(table) && o.active !== false && !o.paid);
}

function renderTables() {
  document.getElementById("tablesGrid").innerHTML = Array.from({length:10}, (_, i) => {
    const n = i + 1;
    const local = draftOrders[n]?.items?.length;
    const remote = remoteForTable(n);
    const occupied = Boolean(local || remote);

    return `<button class="table-btn ${occupied ? "occupied" : ""} ${currentTable === n ? "selected" : ""}" onclick="window.selectTable(${n})">
      Mesa ${n}
      <small>${remote ? "En servicio" : local ? "Pedido sin enviar" : "Disponible"}</small>
    </button>`;
  }).join("");
}

window.selectTable = function(n) {
  if (currentTable) draftOrders[currentTable].note = document.getElementById("orderNote").value;
  currentTable = n;
  draft(n);
  document.getElementById("orderNote").value = draftOrders[n].note || "";
  renderTables();
  renderOrder();
};

function renderCategories(active = "todos") {
  document.getElementById("categoryBar").innerHTML = categories.map(c =>
    `<button class="category-btn ${c[0] === active ? "active" : ""}" onclick="window.renderProducts('${c[0]}')">${c[1]}</button>`
  ).join("");
}

window.renderProducts = function(cat = "todos") {
  renderCategories(cat);
  const list = cat === "todos" ? products : products.filter(p => p.category === cat);
  document.getElementById("productsGrid").innerHTML = list.map(p =>
    `<div class="product-card" onclick="window.addProduct(${p.id})">
      <div class="icon">${p.icon}</div>
      <h4>${p.name}</h4>
      <strong>${money(p.price)}</strong>
    </div>`
  ).join("");
};

window.addProduct = function(id) {
  if (!currentTable) return toast("Selecciona una mesa.");
  if (remoteForTable(currentTable)) return toast("Esta mesa ya tiene una orden enviada. Cóbrala o ciérrala antes de abrir otra.");

  const o = draft(currentTable);
  const p = products.find(x => x.id === id);
  const existing = o.items.find(x => x.id === id);

  existing ? existing.qty++ : o.items.push({...p, qty:1});
  renderTables();
  renderOrder();
};

window.changeQty = function(id, delta) {
  const o = draft(currentTable);
  const item = o.items.find(x => x.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) o.items = o.items.filter(x => x.id !== id);

  renderOrder();
  renderTables();
};

function renderOrder() {
  const label = document.getElementById("currentTableLabel");
  const box = document.getElementById("orderItems");

  if (!currentTable) {
    label.textContent = "Selecciona una mesa";
    box.innerHTML = '<div class="empty-state">No hay productos en el pedido.</div>';
    document.getElementById("subtotal").textContent = money(0);
    document.getElementById("grandTotal").textContent = money(0);
    return;
  }

  const o = draft(currentTable);
  label.textContent = "Mesa " + currentTable;

  box.innerHTML = o.items.length ? o.items.map(i =>
    `<div class="order-item">
      <div class="order-item-top">
        <h4>${i.name}</h4>
        <strong>${money(i.price * i.qty)}</strong>
      </div>
      <div class="qty-row">
        <button onclick="window.changeQty(${i.id},-1)">−</button>
        <span>${i.qty}</span>
        <button onclick="window.changeQty(${i.id},1)">+</button>
        <button class="remove-link" onclick="window.changeQty(${i.id},-${i.qty})">Eliminar</button>
      </div>
    </div>`
  ).join("") : '<div class="empty-state">No hay productos en el pedido.</div>';

  const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById("subtotal").textContent = money(total);
  document.getElementById("grandTotal").textContent = money(total);
}

document.getElementById("clearOrderBtn").onclick = () => {
  if (!currentTable) return;
  draftOrders[currentTable] = {items:[], note:""};
  document.getElementById("orderNote").value = "";
  renderOrder();
  renderTables();
};

document.getElementById("sendKitchenBtn").onclick = async () => {
  if (!firebaseOnline) return toast("Firebase no está conectado.");
  if (!currentTable) return toast("Selecciona una mesa.");
  if (remoteForTable(currentTable)) return toast("La mesa ya tiene una orden activa.");

  const o = draft(currentTable);
  if (!o.items.length) return toast("El pedido está vacío.");

  o.note = document.getElementById("orderNote").value;
  const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);

  try {
    await createOrder({
      table: currentTable,
      items: o.items.map(i => ({
        id:i.id,
        name:i.name,
        price:i.price,
        qty:i.qty
      })),
      note: o.note,
      total
    });

    draftOrders[currentTable] = {items:[], note:""};
    document.getElementById("orderNote").value = "";
    renderOrder();
    renderTables();
    toast("Pedido enviado a cocina.");
  } catch (e) {
    console.error(e);
    toast("No se pudo enviar el pedido.");
  }
};

document.getElementById("openCashBtn").onclick = () => switchView("caja");

function kitchenOrders() {
  return remoteOrders.filter(o => o.active !== false && !o.paid);
}

function updateBadges() {
  document.getElementById("badgeCocina").textContent =
    kitchenOrders().filter(o => o.status !== "listo").length;

  document.getElementById("badgeCaja").textContent =
    kitchenOrders().length;
}

function renderKitchen() {
  const list = kitchenOrders().filter(o => kitchenFilter === "todos" || o.status === kitchenFilter);

  document.getElementById("kitchenGrid").innerHTML = list.length ? list.map(k =>
    `<article class="kitchen-card ${k.status}">
      <div class="kitchen-card-head">
        <h4>Mesa ${k.table}</h4>
        <small>${k.createdAt?.toDate ? k.createdAt.toDate().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}) : "Ahora"}</small>
      </div>
      <div class="kitchen-items">
        ${(k.items || []).map(i => `<div class="kitchen-line"><strong>${i.qty} ×</strong> ${i.name}</div>`).join("")}
      </div>
      ${k.note ? `<div class="kitchen-note">📝 ${k.note}</div>` : ""}
      <div class="kitchen-actions">
        <button class="btn ${k.status === "nuevo" ? "btn-kitchen" : k.status === "preparando" ? "btn-primary" : "btn-success"}"
          onclick="window.advanceKitchen('${k.id}')">
          ${k.status === "nuevo" ? "Comenzar" : k.status === "preparando" ? "Marcar listo" : "Listo para cobrar"}
        </button>
      </div>
    </article>`
  ).join("") : '<div class="empty-state">No hay pedidos en esta vista.</div>';
}

window.advanceKitchen = async function(id) {
  const k = remoteOrders.find(x => x.id === id);
  if (!k) return;

  const next = k.status === "nuevo" ? "preparando" : k.status === "preparando" ? "listo" : "listo";

  try {
    await changeOrder(id, {status: next});
  } catch (e) {
    console.error(e);
    toast("No se pudo actualizar el pedido.");
  }
};

document.querySelectorAll("#kitchenFilters .pill").forEach(b => b.onclick = () => {
  document.querySelectorAll("#kitchenFilters .pill").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  kitchenFilter = b.dataset.filter;
  renderKitchen();
});

function openBills() {
  return kitchenOrders();
}

function renderCash() {
  const bills = openBills();

  document.getElementById("openBills").innerHTML = bills.length ? bills.map(b =>
    `<div class="bill-card ${selectedBillId === b.id ? "selected" : ""}" onclick="window.selectBill('${b.id}')">
      <h4>Mesa ${b.table}</h4>
      <div>${(b.items || []).length} producto(s)</div>
      <div class="bill-total">${money(b.total)}</div>
      <small>${b.status === "listo" ? "✅ Listo" : "🍳 " + b.status}</small>
    </div>`
  ).join("") : '<div class="empty-state compact">No hay cuentas abiertas.</div>';

  renderCheckout();
  updateBadges();
}

window.selectBill = function(id) {
  selectedBillId = id;
  renderCash();
};

function renderCheckout() {
  const b = remoteOrders.find(x => x.id === selectedBillId && x.active !== false && !x.paid);

  if (!b) {
    document.getElementById("checkoutTitle").textContent = "Selecciona una cuenta";
    document.getElementById("checkoutItems").innerHTML = '<div class="empty-state compact">Sin cuenta seleccionada.</div>';
    document.getElementById("checkoutTotal").textContent = money(0);
    return;
  }

  document.getElementById("checkoutTitle").textContent = "Mesa " + b.table;
  document.getElementById("checkoutItems").innerHTML = (b.items || []).map(i =>
    `<div class="checkout-item"><span>${i.qty} × ${i.name}</span><strong>${money(i.price * i.qty)}</strong></div>`
  ).join("");

  document.getElementById("checkoutTotal").textContent = money(b.total);
  calcChange();
}

document.querySelectorAll(".payment-btn").forEach(b => b.onclick = () => {
  document.querySelectorAll(".payment-btn").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  paymentMethod = b.dataset.method;
  document.getElementById("cashReceivedBlock").style.display =
    paymentMethod === "Efectivo" ? "block" : "none";
});

document.getElementById("cashReceived").oninput = calcChange;

function calcChange() {
  const b = remoteOrders.find(x => x.id === selectedBillId);
  const received = Number(document.getElementById("cashReceived").value) || 0;
  document.getElementById("changeAmount").textContent =
    money(b ? Math.max(0, received - Number(b.total || 0)) : 0);
}

document.getElementById("chargeBtn").onclick = async () => {
  const b = remoteOrders.find(x => x.id === selectedBillId && !x.paid);
  if (!b) return toast("Selecciona una cuenta.");

  const received = Number(document.getElementById("cashReceived").value) || 0;
  if (paymentMethod === "Efectivo" && received < Number(b.total || 0)) {
    return toast("Efectivo insuficiente.");
  }

  try {
    await changeOrder(b.id, {
      paid: true,
      active: false,
      paymentMethod,
      paidAt: new Date().toISOString()
    });

    selectedBillId = null;
    document.getElementById("cashReceived").value = "";
    toast("Cobro registrado.");
  } catch (e) {
    console.error(e);
    toast("No se pudo registrar el cobro.");
  }
};

function renderInventory() {
  document.getElementById("inventoryBody").innerHTML = inventory.map(i =>
    `<tr>
      <td>${i.name}</td>
      <td>${i.category}</td>
      <td>${i.stock} ${i.unit}</td>
      <td>${i.min}</td>
      <td><span class="stock-badge ${i.stock <= i.min ? "stock-low" : "stock-ok"}">${i.stock <= i.min ? "Bajo" : "Correcto"}</span></td>
      <td><button class="link-btn" onclick="window.addStock(${i.id})">+1</button></td>
    </tr>`
  ).join("");
}

window.addStock = function(id) {
  const i = inventory.find(x => x.id === id);
  if (i) i.stock++;
  renderInventory();
};

document.getElementById("addInventoryBtn").onclick = () => {
  const name = prompt("Nombre del insumo");
  if (!name) return;
  inventory.push({id:Date.now(),name,category:"General",stock:0,min:5,unit:"pzas"});
  renderInventory();
};

function paidOrders() {
  return remoteOrders.filter(o => o.paid);
}

function renderAdmin() {
  const paid = paidOrders();
  const total = paid.reduce((s, x) => s + Number(x.total || 0), 0);
  const count = paid.length;
  const avg = count ? total / count : 0;
  const open = openBills().length;

  document.getElementById("kpiGrid").innerHTML =
    `<div class="kpi"><span>Ventas</span><strong>${money(total)}</strong></div>
     <div class="kpi"><span>Pedidos cobrados</span><strong>${count}</strong></div>
     <div class="kpi"><span>Ticket promedio</span><strong>${money(avg)}</strong></div>
     <div class="kpi"><span>Cuentas abiertas</span><strong>${open}</strong></div>`;

  document.getElementById("adminProducts").innerHTML = products.map(p =>
    `<div class="admin-product">
      <span>${p.icon} ${p.name}</span>
      <input type="number" value="${p.price}" onchange="window.updatePrice(${p.id},this.value)">
      <button class="link-btn" onclick="window.removeProduct(${p.id})">Eliminar</button>
    </div>`
  ).join("");

  document.getElementById("salesList").innerHTML = paid.length ? paid.map(s =>
    `<div class="sales-item">
      <div><strong>Mesa ${s.table}</strong><br><small>${s.paymentMethod || "Pago"} </small></div>
      <strong>${money(s.total)}</strong>
    </div>`
  ).join("") : '<div class="empty-state compact">Todavía no hay ventas.</div>';
}

window.updatePrice = function(id, v) {
  const p = products.find(x => x.id === id);
  if (p) p.price = Number(v) || p.price;
  window.renderProducts();
};

window.removeProduct = function(id) {
  products = products.filter(x => x.id !== id);
  renderAdmin();
  window.renderProducts();
};

document.getElementById("addProductBtn").onclick = () => {
  const n = document.getElementById("newProductName").value.trim();
  const p = Number(document.getElementById("newProductPrice").value);
  const c = document.getElementById("newProductCategory").value;

  if (!n || !p) return toast("Captura nombre y precio.");

  products.push({
    id:Date.now(),
    name:n,
    price:p,
    category:c,
    icon:c === "bebidas" ? "🥤" : c === "tacos" ? "🌮" : c === "postres" ? "🍰" : "🍔"
  });

  document.getElementById("newProductName").value = "";
  document.getElementById("newProductPrice").value = "";
  renderAdmin();
  window.renderProducts();
  toast("Producto agregado.");
};

function renderUsers() {
  const grid = document.getElementById("usersGrid");
  if (!grid) return;

  if (!currentUserProfile || currentUserProfile.role !== "admin") {
    grid.innerHTML = '<div class="empty-state">Solo el administrador puede gestionar usuarios.</div>';
    return;
  }

  grid.innerHTML = remoteUsers.length ? remoteUsers.map(u => `
    <div class="user-card">
      <div class="user-card-head">
        <div>
          <h4>${u.name || "Sin nombre"}</h4>
          <span class="role role-${u.role || "mesero"}">${ROLE_LABELS[u.role] || u.role || "Sin rol"}</span>
        </div>
        <span class="${u.active === false ? "status-inactive" : "status-active"}">${u.active === false ? "Inactivo" : "Activo"}</span>
      </div>
      <p>${u.email || ""}</p>
      <p><button class="link-btn" onclick="window.toggleEmployee('${u.id}', ${u.active === false ? "true" : "false"})">
        ${u.active === false ? "Activar acceso" : "Desactivar acceso"}
      </button></p>
    </div>
  `).join("") : '<div class="empty-state">No hay empleados registrados.</div>';
}

window.toggleEmployee = async function(uid, active) {
  try {
    await setEmployeeActive(uid, active);
    toast(active ? "Usuario activado." : "Usuario desactivado.");
  } catch (e) {
    console.error(e);
    toast("No se pudo cambiar el estado del usuario.");
  }
};

document.getElementById("employeeForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (currentUserProfile?.role !== "admin") {
    return toast("Solo el administrador puede crear empleados.");
  }

  const name = document.getElementById("employeeName").value.trim();
  const email = document.getElementById("employeeEmail").value.trim();
  const password = document.getElementById("employeePassword").value;
  const role = document.getElementById("employeeRole").value;

  if (!name || !email || password.length < 6) {
    return toast("Revisa nombre, correo y contraseña.");
  }

  const btn = event.submitter;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Creando...";
  }

  try {
    await createEmployee({ name, email, password, role });
    event.target.reset();
    toast("Empleado creado correctamente.");
  } catch (e) {
    console.error(e);
    const msg = e?.code === "auth/email-already-in-use"
      ? "Ese correo ya está registrado."
      : e?.code === "auth/weak-password"
      ? "La contraseña es demasiado débil."
      : "No se pudo crear el empleado.";
    toast(msg);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "+ Crear empleado";
    }
  }
});

async function bootFirebase() {
  setConnectionStatus(false, "Esperando sesión...");

  observeAuth(async user => {
    if (!user) {
      currentUserProfile = null;
      remoteOrders = [];
      remoteUsers = [];
      if (stopUsersListener) {
        stopUsersListener();
        stopUsersListener = null;
      }
      showLogin();
      setConnectionStatus(false, "Sin sesión");
      return;
    }

    try {
      const profile = await getUserProfile(user.uid);

      if (!profile) {
        await logout();
        return showLogin("La cuenta existe, pero todavía no tiene un perfil de empleado en Firestore.");
      }

      if (profile.active === false) {
        await logout();
        return showLogin("Esta cuenta está desactivada.");
      }

      if (!ROLE_VIEWS[profile.role]) {
        await logout();
        return showLogin("La cuenta no tiene un rol válido.");
      }

      currentUserProfile = profile;
      showApp();
      setConnectionStatus(true, "Firebase conectado");
      applyPermissions();

      listenOrders(
        rows => {
          remoteOrders = rows;
          renderTables();
          renderKitchen();
          renderCash();
          renderAdmin();
          updateBadges();
        },
        err => {
          console.error(err);
          setConnectionStatus(false, "Error de Firestore");
          toast("No se pudieron leer los pedidos.");
        }
      );

      if (profile.role === "admin" && !stopUsersListener) {
        stopUsersListener = listenUsers(
          rows => {
            remoteUsers = rows;
            renderUsers();
          },
          err => {
            console.error(err);
            toast("No se pudieron leer los usuarios.");
          }
        );
      }
    } catch (e) {
      console.error(e);
      showLogin("No fue posible cargar tu perfil.");
    }
  });
}

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const message = document.getElementById("loginMessage");

  message.textContent = "Iniciando sesión...";

  try {
    await login(email, password);
    message.textContent = "";
    document.getElementById("loginPassword").value = "";
  } catch (e) {
    console.error(e);
    message.textContent = "Correo o contraseña incorrectos, o el proveedor Email/Password todavía no está habilitado.";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await logout();
});

renderTables();
window.renderProducts();
renderOrder();
renderInventory();
renderAdmin();
updateBadges();
showLogin();
bootFirebase();
