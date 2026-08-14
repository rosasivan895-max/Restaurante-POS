# Restaurante POS + Firebase

Esta versión sincroniza en Cloud Firestore:
- Pedidos enviados desde POS
- Estados de cocina
- Cuentas de caja
- Cobros
- Métricas de ventas en Administración

## 1. Crear proyecto Firebase
En Firebase Console crea un proyecto y registra una aplicación Web.

## 2. Configurar `js/firebase.js`
Firebase te mostrará un objeto `firebaseConfig`.
Copia sus valores en `js/firebase.js`.

## 3. Activar autenticación anónima
Firebase Console:
Authentication > Sign-in method > Anonymous > Enable.

La app inicia sesión de forma anónima automáticamente.

## 4. Crear Firestore
Firebase Console:
Firestore Database > Create database.

## 5. Publicar reglas
Copia el contenido de `firestore.rules` en:
Firestore Database > Rules
y pulsa Publish.

Estas reglas permiten leer/escribir pedidos solamente a sesiones autenticadas
(incluyendo las sesiones anónimas de esta primera versión).

## 6. Subir a GitHub Pages
Sube TODO el contenido de esta carpeta a la raíz del repositorio:
- index.html
- css/
- js/
- firestore.rules (puede quedarse en el repo)
- README.md

## Flujo
POS -> Firestore -> Cocina -> Caja -> Administración

Al abrir la app en dos dispositivos distintos, ambos escuchan la colección `orders`
y reciben actualizaciones en tiempo real.

## Importante
Productos, inventario y usuarios todavía se administran localmente.
La sincronización Firebase de esta versión está enfocada en pedidos, cocina, cobro y ventas.
El siguiente paso puede mover productos, inventario y usuarios también a Firestore y añadir
login real con correo/contraseña y roles.
