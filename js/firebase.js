// js/firebase.js
// 1) En Firebase Console > Configuración del proyecto > Tus apps > Web,
//    copia tu objeto firebaseConfig y reemplaza los valores de abajo.
// 2) Activa Authentication > Sign-in method > Anonymous.
// 3) Crea Cloud Firestore y publica las reglas incluidas en firestore.rules.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkvoo18Wd_8TqfdMTbv9kF6gkSaSle11g",
  authDomain: "restaurante-pos-d5e91.firebaseapp.com",
  projectId: "restaurante-pos-d5e91",
  storageBucket: "restaurante-pos-d5e91.firebasestorage.app",
  messagingSenderId: "70987120298",
  appId: "1:70987120298:web:2a95f47c9800a6a7bc9ad3",
  measurementId: "G-X1QKQ5QE0F"
};

const configured = !Object.values(firebaseConfig).some(v => String(v).startsWith("PEGA_AQUI"));

let app = null;
let auth = null;
let db = null;

export async function initFirebase() {
  if (!configured) {
    throw new Error("Firebase no está configurado. Edita js/firebase.js y pega tu firebaseConfig.");
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  await signInAnonymously(auth);
  return { app, auth, db };
}

export async function createOrder(order) {
  if (!db) throw new Error("Firebase no está inicializado.");

  const ref = await addDoc(collection(db, "orders"), {
    table: order.table,
    items: order.items,
    note: order.note || "",
    total: order.total,
    status: "nuevo",
    active: true,
    paid: false,
    paymentMethod: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function changeOrder(id, changes) {
  if (!db) throw new Error("Firebase no está inicializado.");

  await updateDoc(doc(db, "orders", id), {
    ...changes,
    updatedAt: serverTimestamp()
  });
}

export function listenOrders(callback, onError) {
  if (!db) throw new Error("Firebase no está inicializado.");

  return onSnapshot(
    collection(db, "orders"),
    snapshot => {
      const rows = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      rows.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() ?? 0;
        const bt = b.createdAt?.toMillis?.() ?? 0;
        return bt - at;
      });

      callback(rows);
    },
    onError
  );
}
