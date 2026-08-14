# Restaurante POS — Login, roles y permisos

Esta versión agrega:
- Inicio de sesión con Firebase Authentication (Email/Password)
- Roles: Administrador, Mesero, Cocina y Caja
- Menú diferente según el rol
- Creación de empleados desde la sección Usuarios
- Activar/desactivar empleados
- Reglas de Firestore basadas en roles
- Los pedidos y cobros siguen sincronizados en tiempo real

## IMPORTANTE: pasos antes de subirla a GitHub

### 1. Activar Email/Password
Firebase Console:
Authentication → Sign-in method → Email/Password → Activar → Guardar.

La autenticación anónima ya no es necesaria para esta versión. Puedes dejarla activa durante las pruebas y desactivarla después.

### 2. Crear el PRIMER administrador
Esto se hace una sola vez manualmente.

Firebase Console:
Authentication → Users/Usuarios → Add user/Agregar usuario

Crea un correo y contraseña para el administrador.

Después copia el UID de ese usuario.

### 3. Crear el perfil del administrador en Firestore
Firestore Database → Data/Datos → Start collection/Iniciar colección

Collection ID:
users

Document ID:
PEGA_EL_UID_DEL_ADMINISTRADOR

Campos:
name    string   Administrador
email   string   EL_CORREO_QUE_CREASTE
role    string   admin
active  boolean  true

IMPORTANTE: `role` debe ser exactamente `admin` en minúsculas.

### 4. Actualizar las reglas
Firestore → Rules/Reglas

Reemplaza las reglas actuales por el contenido de `firestore.rules`
y pulsa Publish/Publicar.

### 5. Subir a GitHub Pages
Reemplaza los archivos del repositorio por los de esta carpeta.

## Roles

Administrador:
- POS
- Cocina
- Caja
- Inventario
- Administración
- Usuarios

Mesero:
- POS

Cocina:
- Cocina

Caja:
- Caja

## Crear empleados
Después de iniciar sesión como Administrador:
Usuarios → completa nombre, correo, contraseña y rol → Crear empleado.

El sistema crea la cuenta en Firebase Authentication y el perfil de rol en Firestore.

## Seguridad
Las reglas de Firestore comprueban que el usuario esté autenticado, activo y tenga un rol válido.
Una cuenta de Authentication sin documento en `users` no puede usar la aplicación.
