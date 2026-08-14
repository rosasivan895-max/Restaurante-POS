
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
let products=[
{id:1,name:'Hamburguesa Clásica',price:120,category:'hamburguesas',icon:'🍔'},
{id:2,name:'Hamburguesa Especial',price:150,category:'hamburguesas',icon:'🍔'},
{id:3,name:'Hamburguesa Doble',price:180,category:'hamburguesas',icon:'🍔'},
{id:4,name:'Tacos al Pastor',price:90,category:'tacos',icon:'🌮'},
{id:5,name:'Tacos de Bistec',price:100,category:'tacos',icon:'🌮'},
{id:6,name:'Coca-Cola',price:35,category:'bebidas',icon:'🥤'},
{id:7,name:'Agua Natural',price:25,category:'bebidas',icon:'💧'},
{id:8,name:'Pastel de Chocolate',price:70,category:'postres',icon:'🍰'},
{id:9,name:'Cheesecake',price:75,category:'postres',icon:'🍰'}];
let currentTable=null,draftOrders={},kitchenOrders=[],sales=[],selectedBillId=null,kitchenFilter='todos',paymentMethod='Efectivo';
let inventory=[
{id:1,name:'Carne para hamburguesa',category:'Cocina',stock:24,min:10,unit:'pzas'},
{id:2,name:'Pan de hamburguesa',category:'Panadería',stock:18,min:12,unit:'pzas'},
{id:3,name:'Tortillas',category:'Cocina',stock:85,min:30,unit:'pzas'},
{id:4,name:'Coca-Cola',category:'Bebidas',stock:12,min:15,unit:'pzas'},
{id:5,name:'Agua natural',category:'Bebidas',stock:28,min:12,unit:'pzas'}];
let users=[
{name:'Administrador',role:'Administrador',status:'Activo'},
{name:'Caja Principal',role:'Caja',status:'Activo'},
{name:'Mesero 1',role:'Mesero',status:'Activo'},
{name:'Cocina',role:'Cocina',status:'Activo'}];

const categories=[['todos','Todos'],['hamburguesas','🍔 Hamburguesas'],['tacos','🌮 Tacos'],['bebidas','🥤 Bebidas'],['postres','🍰 Postres']];
const titleMap={pos:['Punto de venta','Toma pedidos y administra mesas'],cocina:['Cocina','Controla el avance de los pedidos'],caja:['Caja','Cobra cuentas abiertas'],inventario:['Inventario','Control de existencias'],admin:['Administración','Ventas, productos y métricas'],usuarios:['Usuarios','Perfiles y roles del sistema']};

function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function switchView(v){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.getElementById('view-'+v).classList.add('active');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));document.getElementById('pageTitle').textContent=titleMap[v][0];document.getElementById('pageSubtitle').textContent=titleMap[v][1];document.getElementById('sidebar').classList.remove('open');if(v==='cocina')renderKitchen();if(v==='caja')renderCash();if(v==='inventario')renderInventory();if(v==='admin')renderAdmin();if(v==='usuarios')renderUsers()}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>switchView(b.dataset.view));document.getElementById('menuBtn').onclick=()=>document.getElementById('sidebar').classList.toggle('open');

function order(n){if(!draftOrders[n])draftOrders[n]={items:[],note:'',sent:false};return draftOrders[n]}
function renderTables(){document.getElementById('tablesGrid').innerHTML=Array.from({length:10},(_,i)=>{let n=i+1,o=draftOrders[n],occ=o&&(o.items.length||o.sent);return `<button class="table-btn ${occ?'occupied':''} ${currentTable===n?'selected':''}" onclick="selectTable(${n})">Mesa ${n}<small>${occ?'Cuenta abierta':'Disponible'}</small></button>`}).join('')}
function selectTable(n){if(currentTable)draftOrders[currentTable].note=document.getElementById('orderNote').value;currentTable=n;order(n);document.getElementById('orderNote').value=draftOrders[n].note||'';renderTables();renderOrder()}
function renderCategories(active='todos'){document.getElementById('categoryBar').innerHTML=categories.map(c=>`<button class="category-btn ${c[0]===active?'active':''}" onclick="renderProducts('${c[0]}')">${c[1]}</button>`).join('')}
function renderProducts(cat='todos'){renderCategories(cat);let list=cat==='todos'?products:products.filter(p=>p.category===cat);document.getElementById('productsGrid').innerHTML=list.map(p=>`<div class="product-card" onclick="addProduct(${p.id})"><div class="icon">${p.icon}</div><h4>${p.name}</h4><strong>${money(p.price)}</strong></div>`).join('')}
function addProduct(id){if(!currentTable)return toast('Selecciona una mesa');let o=order(currentTable),p=products.find(x=>x.id===id),e=o.items.find(x=>x.id===id);e?e.qty++:o.items.push({...p,qty:1});o.sent=false;renderTables();renderOrder()}
function changeQty(id,d){let o=order(currentTable),i=o.items.find(x=>x.id===id);if(!i)return;i.qty+=d;if(i.qty<=0)o.items=o.items.filter(x=>x.id!==id);renderOrder();renderTables()}
function renderOrder(){let label=document.getElementById('currentTableLabel'),box=document.getElementById('orderItems');if(!currentTable){label.textContent='Selecciona una mesa';box.innerHTML='<div class="empty-state">No hay productos en el pedido.</div>';document.getElementById('subtotal').textContent=money(0);document.getElementById('grandTotal').textContent=money(0);return}let o=order(currentTable);label.textContent='Mesa '+currentTable;box.innerHTML=o.items.length?o.items.map(i=>`<div class="order-item"><div class="order-item-top"><h4>${i.name}</h4><strong>${money(i.price*i.qty)}</strong></div><div class="qty-row"><button onclick="changeQty(${i.id},-1)">−</button><span>${i.qty}</span><button onclick="changeQty(${i.id},1)">+</button><button class="remove-link" onclick="changeQty(${i.id},-${i.qty})">Eliminar</button></div></div>`).join(''):'<div class="empty-state">No hay productos en el pedido.</div>';let total=o.items.reduce((s,i)=>s+i.price*i.qty,0);document.getElementById('subtotal').textContent=money(total);document.getElementById('grandTotal').textContent=money(total)}
document.getElementById('clearOrderBtn').onclick=()=>{if(!currentTable)return;draftOrders[currentTable]={items:[],note:'',sent:false};document.getElementById('orderNote').value='';renderOrder();renderTables()};
document.getElementById('sendKitchenBtn').onclick=()=>{if(!currentTable)return toast('Selecciona una mesa');let o=order(currentTable);if(!o.items.length)return toast('El pedido está vacío');o.note=document.getElementById('orderNote').value;o.sent=true;let existing=kitchenOrders.find(k=>k.table===currentTable&&k.active);let payload={id:Date.now(),table:currentTable,items:JSON.parse(JSON.stringify(o.items)),note:o.note,status:'nuevo',active:true,time:new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})};if(existing)Object.assign(existing,payload,{id:existing.id});else kitchenOrders.push(payload);updateBadges();renderTables();toast('Pedido enviado a cocina')};
document.getElementById('openCashBtn').onclick=()=>{if(!currentTable)return toast('Selecciona una mesa');switchView('caja')};

function updateBadges(){document.getElementById('badgeCocina').textContent=kitchenOrders.filter(x=>x.active&&x.status!=='listo').length;document.getElementById('badgeCaja').textContent=Object.entries(draftOrders).filter(([_,o])=>o.items.length).length}
function renderKitchen(){let list=kitchenOrders.filter(x=>x.active&&(kitchenFilter==='todos'||x.status===kitchenFilter));document.getElementById('kitchenGrid').innerHTML=list.length?list.map(k=>`<article class="kitchen-card ${k.status}"><div class="kitchen-card-head"><h4>Mesa ${k.table}</h4><small>${k.time}</small></div><div class="kitchen-items">${k.items.map(i=>`<div class="kitchen-line"><strong>${i.qty} ×</strong> ${i.name}</div>`).join('')}</div>${k.note?`<div class="kitchen-note">📝 ${k.note}</div>`:''}<div class="kitchen-actions"><button class="btn ${k.status==='nuevo'?'btn-kitchen':k.status==='preparando'?'btn-primary':'btn-success'}" onclick="advanceKitchen(${k.id})">${k.status==='nuevo'?'Comenzar':k.status==='preparando'?'Marcar listo':'Entregado'}</button></div></article>`).join(''):'<div class="empty-state">No hay pedidos en esta vista.</div>'}
function advanceKitchen(id){let k=kitchenOrders.find(x=>x.id===id);if(k.status==='nuevo')k.status='preparando';else if(k.status==='preparando')k.status='listo';else{k.active=false}renderKitchen();updateBadges()}
document.querySelectorAll('#kitchenFilters .pill').forEach(b=>b.onclick=()=>{document.querySelectorAll('#kitchenFilters .pill').forEach(x=>x.classList.remove('active'));b.classList.add('active');kitchenFilter=b.dataset.filter;renderKitchen()});

function billEntries(){return Object.entries(draftOrders).filter(([_,o])=>o.items.length).map(([table,o])=>({table:Number(table),...o,total:o.items.reduce((s,i)=>s+i.price*i.qty,0)}))}
function renderCash(){let bills=billEntries();document.getElementById('openBills').innerHTML=bills.length?bills.map(b=>`<div class="bill-card ${selectedBillId===b.table?'selected':''}" onclick="selectBill(${b.table})"><h4>Mesa ${b.table}</h4><div>${b.items.length} producto(s)</div><div class="bill-total">${money(b.total)}</div></div>`).join(''):'<div class="empty-state compact">No hay cuentas abiertas.</div>';renderCheckout();updateBadges()}
function selectBill(t){selectedBillId=t;renderCash()}
function renderCheckout(){let b=billEntries().find(x=>x.table===selectedBillId);if(!b){document.getElementById('checkoutTitle').textContent='Selecciona una cuenta';document.getElementById('checkoutItems').innerHTML='<div class="empty-state compact">Sin cuenta seleccionada.</div>';document.getElementById('checkoutTotal').textContent=money(0);return}document.getElementById('checkoutTitle').textContent='Mesa '+b.table;document.getElementById('checkoutItems').innerHTML=b.items.map(i=>`<div class="checkout-item"><span>${i.qty} × ${i.name}</span><strong>${money(i.price*i.qty)}</strong></div>`).join('');document.getElementById('checkoutTotal').textContent=money(b.total);calcChange()}
document.querySelectorAll('.payment-btn').forEach(b=>b.onclick=()=>{document.querySelectorAll('.payment-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');paymentMethod=b.dataset.method;document.getElementById('cashReceivedBlock').style.display=paymentMethod==='Efectivo'?'block':'none'});
document.getElementById('cashReceived').oninput=calcChange;
function calcChange(){let b=billEntries().find(x=>x.table===selectedBillId),r=Number(document.getElementById('cashReceived').value)||0;document.getElementById('changeAmount').textContent=money(b?Math.max(0,r-b.total):0)}
document.getElementById('chargeBtn').onclick=()=>{let b=billEntries().find(x=>x.table===selectedBillId);if(!b)return toast('Selecciona una cuenta');if(paymentMethod==='Efectivo'&&(Number(document.getElementById('cashReceived').value)||0)<b.total)return toast('Efectivo insuficiente');sales.unshift({table:b.table,total:b.total,method:paymentMethod,time:new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})});delete draftOrders[b.table];kitchenOrders.forEach(k=>{if(k.table===b.table)k.active=false});selectedBillId=null;document.getElementById('cashReceived').value='';renderTables();renderCash();updateBadges();toast('Cobro registrado')};

function renderInventory(){document.getElementById('inventoryBody').innerHTML=inventory.map(i=>`<tr><td>${i.name}</td><td>${i.category}</td><td>${i.stock} ${i.unit}</td><td>${i.min}</td><td><span class="stock-badge ${i.stock<=i.min?'stock-low':'stock-ok'}">${i.stock<=i.min?'Bajo':'Correcto'}</span></td><td><button class="link-btn" onclick="i.stock++;renderInventory()">+1</button></td></tr>`).join('')}
document.getElementById('addInventoryBtn').onclick=()=>{let name=prompt('Nombre del insumo');if(!name)return;inventory.push({id:Date.now(),name,category:'General',stock:0,min:5,unit:'pzas'});renderInventory()};

function renderAdmin(){let total=sales.reduce((s,x)=>s+x.total,0),orders=sales.length,avg=orders?total/orders:0,open=billEntries().length;document.getElementById('kpiGrid').innerHTML=`<div class="kpi"><span>Ventas</span><strong>${money(total)}</strong></div><div class="kpi"><span>Pedidos cobrados</span><strong>${orders}</strong></div><div class="kpi"><span>Ticket promedio</span><strong>${money(avg)}</strong></div><div class="kpi"><span>Cuentas abiertas</span><strong>${open}</strong></div>`;document.getElementById('adminProducts').innerHTML=products.map(p=>`<div class="admin-product"><span>${p.icon} ${p.name}</span><input type="number" value="${p.price}" onchange="updatePrice(${p.id},this.value)"><button class="link-btn" onclick="removeProduct(${p.id})">Eliminar</button></div>`).join('');document.getElementById('salesList').innerHTML=sales.length?sales.map(s=>`<div class="sales-item"><div><strong>Mesa ${s.table}</strong><br><small>${s.method} · ${s.time}</small></div><strong>${money(s.total)}</strong></div>`).join(''):'<div class="empty-state compact">Todavía no hay ventas.</div>'}
function updatePrice(id,v){let p=products.find(x=>x.id===id);p.price=Number(v)||p.price;renderProducts()}
function removeProduct(id){products=products.filter(x=>x.id!==id);renderAdmin();renderProducts()}
document.getElementById('addProductBtn').onclick=()=>{let n=document.getElementById('newProductName').value.trim(),p=Number(document.getElementById('newProductPrice').value),c=document.getElementById('newProductCategory').value;if(!n||!p)return toast('Captura nombre y precio');products.push({id:Date.now(),name:n,price:p,category:c,icon:c==='bebidas'?'🥤':c==='tacos'?'🌮':c==='postres'?'🍰':'🍔'});document.getElementById('newProductName').value='';document.getElementById('newProductPrice').value='';renderAdmin();renderProducts();toast('Producto agregado')};

function renderUsers(){document.getElementById('usersGrid').innerHTML=users.map(u=>`<div class="user-card"><h4>${u.name}</h4><span class="role">${u.role}</span><p>Estado: ${u.status}</p></div>`).join('')}
document.getElementById('addUserBtn').onclick=()=>{let n=prompt('Nombre del usuario');if(!n)return;let r=prompt('Rol: Administrador, Caja, Mesero o Cocina','Mesero')||'Mesero';users.push({name:n,role:r,status:'Activo'});renderUsers()};

renderTables();renderProducts();renderOrder();renderInventory();renderUsers();updateBadges();
