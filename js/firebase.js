import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCkvoo18Wd_8TqfdMTbv9kF6gkSaSle11g",
  authDomain: "restaurante-pos-d5e91.firebaseapp.com",
  projectId: "restaurante-pos-d5e91",
  storageBucket: "restaurante-pos-d5e91.firebasestorage.app",
  messagingSenderId: "70987120298",
  appId: "1:70987120298:web:2a95f47c9800a6a7bc9ad3",
  measurementId: "G-X1QKQ5QE0F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenUsers(callback, onError) {
  return onSnapshot(
    collection(db, "users"),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    onError
  );
}

// Crea un usuario usando una app Firebase secundaria.
// Así el administrador actual NO pierde su sesión.
export async function createEmployee({ name, email, password, role }) {
  const secondary = initializeApp(firebaseConfig, "employeeCreator-" + Date.now());
  try {
    const secondaryAuth = getAuth(secondary);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

    await setDoc(doc(db, "users", credential.user.uid), {
      name,
      email,
      role,
      active: true,
      createdAt: serverTimestamp()
    });

    await signOut(secondaryAuth);
    return credential.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}

export async function setEmployeeActive(uid, active) {
  await updateDoc(doc(db, "users", uid), {
    active,
    updatedAt: serverTimestamp()
  });
}

export async function createOrder(order) {
  const ref = await addDoc(collection(db, "orders"), {
    table: order.table,
    items: order.items,
    note: order.note || "",
    total: order.total,
    status: "nuevo",
    active: true,
    paid: false,
    paymentMethod: null,
    createdBy: auth.currentUser?.uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function changeOrder(id, changes) {
  await updateDoc(doc(db, "orders", id), {
    ...changes,
    updatedAt: serverTimestamp()
  });
}

export function listenOrders(callback, onError) {
  return onSnapshot(
    collection(db, "orders"),
    snapshot => {
      const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
