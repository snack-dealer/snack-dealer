
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// ======================================
// SNACK DEALER - LOGIN SYSTEM
// ======================================

// HTML elements
const loginSection = document.getElementById("login-section");
const storeSection = document.getElementById("store-section");
const loginForm = document.getElementById("login-form");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const registerButton = document.getElementById("register-btn");
const logoutButton = document.getElementById("logout-btn");

const message = document.getElementById("login-message");
const adminLink = document.getElementById("admin-link");

// Hide both sections while checking saved login
loginSection.hidden = true;
storeSection.hidden = true;

if (adminLink) {
  adminLink.hidden = true;
}

let storeLoaded = false;

// ======================================
// ERROR MESSAGES
// ======================================

function showError(error) {
  console.error(error);

  const messages = {
    "auth/email-already-in-use":
      "This email is already registered. Please sign in.",

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/weak-password":
      "Password must contain at least 6 characters.",

    "auth/invalid-credential":
      "Incorrect email or password.",

    "auth/too-many-requests":
      "Too many attempts. Please try again later.",

    "auth/network-request-failed":
      "Network error. Check your internet connection."
  };

  message.textContent =
    messages[error.code] || error.message;
}

// ======================================
// REGISTER
// ======================================

registerButton.addEventListener("click", async () => {
  try {
    message.textContent = "Creating your account...";

    await setPersistence(auth, browserLocalPersistence);

    await createUserWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    message.textContent = "";

  } catch (error) {
    showError(error);
  }
});

// ======================================
// SIGN IN
// ======================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    message.textContent = "Signing in...";

    await setPersistence(auth, browserLocalPersistence);

    await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    message.textContent = "";

  } catch (error) {
    showError(error);
  }
});

// ======================================
// LOG OUT
// ======================================

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    showError(error);
  }
});

// ======================================
// AUTO LOGIN
// ======================================

onAuthStateChanged(auth, async (user) => {

  // Reset admin button
  if (adminLink) {
    adminLink.hidden = true;
  }

  if (!user) {
    // Not signed in
    storeSection.hidden = true;
    loginSection.hidden = false;
    return;
  }

  // Already signed in!
  loginSection.hidden = true;
  storeSection.hidden = false;

  // ====================================
  // ADMIN PERMISSION CHECK
  // ====================================

  if (adminLink) {
    try {
      const adminSnapshot = await getDoc(
        doc(db, "admins", user.uid)
      );

      // Prevent showing admin access
      // after a different user signs in
      if (auth.currentUser?.uid === user.uid) {
        adminLink.hidden = !adminSnapshot.exists();
      }

    } catch (error) {
      console.error("Admin permission check failed:", error);
    }
  }

  // ====================================
  // LOAD STORE
  // ====================================

  if (!storeLoaded) {
    storeLoaded = true;

    try {
      await import("./script.js");
    } catch (error) {
      storeLoaded = false;
      console.error("Store failed to load:", error);
    }
  }

}, (error) => {
  console.error("Authentication error:", error);

  storeSection.hidden = true;
  loginSection.hidden = false;
});
