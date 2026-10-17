
import { db } from "./firebase.js";

import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const products = [
  { name: "Lay's", price: 25000, emoji: "🥔" },
  { name: "Noodles", price: 15000, emoji: "🍜" },
  { name: "Drinks", price: 11000, emoji: "🥤" },
  { name: "Other Snacks", price: 10000, emoji: "🍬" },
  { name: "Fidget Toy", price: null, emoji: "🧸" }
];

let cart = [];
let submitting = false;

const money = value =>
  value.toLocaleString("vi-VN") + "đ";

function renderProducts() {
  const container = document.getElementById("products");

  products.forEach((product, index) => {
    const card = document.createElement("div");
    card.className = "product";

    const emoji = document.createElement("div");
    emoji.className = "emoji";
    emoji.textContent = product.emoji;

    const title = document.createElement("h3");
    title.textContent = product.name;

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = product.price === null
      ? "Over 50,000đ"
      : money(product.price);

    const button = document.createElement("button");
    button.textContent = "Add to Cart";
    button.addEventListener("click", () => {
      const existing = cart.find(
        item => item.name === product.name
      );

      if (existing) {
        if (existing.quantity < 10) existing.quantity++;
      } else {
        cart.push({ ...product, quantity: 1 });
      }

      renderCart();
    });

    card.append(emoji, title, price, button);
    container.appendChild(card);
  });
}

function subtotal() {
  return cart.reduce(
    (sum, item) =>
      sum + (item.price ?? 0) * item.quantity,
    0
  );
}

function renderCart() {
  const container = document.getElementById("cart-items");
  container.replaceChildren();

  cart.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const label = document.createElement("span");
    label.textContent =
      `${item.name} × ${item.quantity}`;

    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      cart.splice(index, 1);
      renderCart();
    });

    row.append(label, remove);
    container.appendChild(row);
  });

  const hasUnpriced = cart.some(
    item => item.price === null
  );

  document.getElementById("total").textContent =
    `Known subtotal: ${money(subtotal())}` +
    (hasUnpriced ? " + fidget toy price to confirm" : "");
}

async function placeOrder() {
  if (submitting) return;

  const customer =
    document.getElementById("customer").value.trim();

  const status = document.getElementById("status");
  const button = document.getElementById("order-button");

  if (!customer || customer.length > 40) {
    status.textContent = "Enter a nickname (max 40 characters).";
    return;
  }

  if (cart.length === 0) {
    status.textContent = "Your cart is empty!";
    return;
  }

  submitting = true;
  button.disabled = true;
  status.textContent = "Submitting order...";

  try {
    await addDoc(collection(db, "orders"), {
      customer,
      items: cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: subtotal(),
      status: "pending",
      createdAt: serverTimestamp()
    });

    cart = [];
    renderCart();
    status.textContent =
      "Order submitted! Wait for confirmation.";
  } catch (error) {
    console.error(error);
    status.textContent =
      "Order failed. Please try again.";
  } finally {
    submitting = false;
    button.disabled = false;
  }
}

document.getElementById("order-button")
  .addEventListener("click", placeOrder);

renderProducts();
renderCart();
