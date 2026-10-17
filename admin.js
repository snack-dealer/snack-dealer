
import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const login = document.getElementById("login");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const logoutButton = document.getElementById("logout");
const orders = document.getElementById("orders");
const status = document.getElementById("admin-status");
const loginButton = loginForm.querySelector('button[type="submit"]');

let unsubscribeOrders = null;
let authCheckNumber = 0;
let loginMessage = "";

function showStatus(message) {
  status.textContent = message;
}

function friendlyAuthError(error) {
  const messages = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/user-not-found": "No account was found for that email.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/operation-not-allowed":
      "Email/password sign-in is not enabled in Firebase.",
    "auth/unauthorized-domain":
      "This website domain is not authorized in Firebase."
  };

  return messages[error.code] || error.message || "An unexpected error occurred.";
}

function stopListeningToOrders() {
  if (unsubscribeOrders) {
    unsubscribeOrders();
    unsubscribeOrders = null;
  }
}

function showLogin(message = "") {
  login.hidden = false;
  dashboard.hidden = true;
  showStatus(message);
}

function renderOrders(snapshot) {
  orders.replaceChildren();

  if (snapshot.empty) {
    orders.textContent = "No orders yet.";
    return;
  }

  const sortedOrders = [...snapshot.docs].sort((a, b) => {
    const aTime = a.data().createdAt?.seconds ?? 0;
    const bTime = b.data().createdAt?.seconds ?? 0;
    return bTime - aTime;
  });

  for (const orderDoc of sortedOrders) {
    const data = orderDoc.data();

    const card = document.createElement("article");
    card.className = "product";
    card.style.marginTop = "15px";
    card.style.textAlign = "left";

    const heading = document.createElement("h3");
    heading.textContent = `Customer: ${data.customer || "Unknown"}`;

    const itemList = document.createElement("p");
    itemList.textContent = Array.isArray(data.items)
      ? data.items.map(item =>
          `${item.name || "Item"} × ${item.quantity ?? 0}`
        ).join(", ")
      : "No item details available.";

    const total = document.createElement("p");
    const subtotal = Number(data.subtotal);
    total.textContent = `Subtotal: ${
      Number.isFinite(subtotal)
        ? subtotal.toLocaleString("vi-VN") + "đ"
        : "Unavailable"
    }`;

    const orderStatus = document.createElement("p");
    orderStatus.textContent = `Order ID: ${orderDoc.id}`;

    const select = document.createElement("select");
    select.setAttribute("aria-label", `Status for order ${orderDoc.id}`);

    const allowedStatuses = [
      "pending",
      "confirmed",
      "completed",
      "cancelled"
    ];

    for (const value of allowedStatuses) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }

    select.value = allowedStatuses.includes(data.status)
      ? data.status
      : "pending";

    select.addEventListener("change", async () => {
      const newStatus = select.value;
      select.disabled = true;

      try {
        await updateDoc(orderDoc.ref, { status: newStatus });
        showStatus("Order status updated.");
      } catch (error) {
        console.error("Order update failed:", error);
        showStatus("Could not update the order. Check Firestore rules.");
        select.value = allowedStatuses.includes(data.status)
          ? data.status
          : "pending";
      } finally {
        select.disabled = false;
      }
    });

    card.append(heading, itemList, total, orderStatus, select);
    orders.appendChild(card);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showStatus("Enter your email and password.");
    return;
  }

  loginButton.disabled = true;
  showStatus("Signing in...");

  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged verifies the admin and opens the dashboard.
  } catch (error) {
    console.error("Admin sign-in failed:", error);
    showStatus(friendlyAuthError(error));
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out failed:", error);
    showStatus("Could not sign out. Please try again.");
  } finally {
    logoutButton.disabled = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  const checkNumber = ++authCheckNumber;
  stopListeningToOrders();

  dashboard.hidden = true;
  login.hidden = true;
  orders.replaceChildren();

  if (!user) {
    showLogin(loginMessage);
    loginMessage = "";
    return;
  }

  showStatus("Checking administrator access...");

  try {
    const adminSnapshot = await getDoc(doc(db, "admins", user.uid));

    // Ignore stale checks if the signed-in user changed while waiting.
    if (
      checkNumber !== authCheckNumber ||
      auth.currentUser?.uid !== user.uid
    ) {
      return;
    }

    if (!adminSnapshot.exists()) {
      loginMessage = "This account is not authorized as an admin.";
      await signOut(auth);
      return;
    }

    login.hidden = true;
    dashboard.hidden = false;
    showStatus(`Authorized admin: ${user.email || user.uid}`);

    unsubscribeOrders = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        if (
          checkNumber !== authCheckNumber ||
          auth.currentUser?.uid !== user.uid
        ) {
          return;
        }

        renderOrders(snapshot);
      },
      (error) => {
        console.error("Loading orders failed:", error);
        showStatus("Unable to load orders. Check Firestore rules.");
      }
    );
  } catch (error) {
    console.error("Admin verification failed:", error);

    if (checkNumber !== authCheckNumber) return;

    showLogin(
      "Could not verify admin access. Check your connection and Firestore rules."
    );
  }
});
