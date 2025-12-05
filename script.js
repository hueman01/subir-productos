const API_BASE = "https://tienda-api-copia-lzcs.onrender.com/api";

const form = document.getElementById("product-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit");
const statusMessage = document.getElementById("status-message");
const loader = document.getElementById("loader");
const productsGrid = document.getElementById("products-grid");
const emptyState = document.getElementById("empty-state");
const toast = document.getElementById("toast");

let products = [];
let editingId = null;

const showLoader = (show) => {
  loader.hidden = !show;
};

const showStatus = (message, type = "success") => {
  statusMessage.textContent = message;
  statusMessage.hidden = false;
  statusMessage.className = `status status--${type}`;
  setTimeout(() => (statusMessage.hidden = true), 2500);
};

const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => (toast.hidden = true), 2200);
};

const resetForm = () => {
  form.reset();
  editingId = null;
  formTitle.textContent = "Agregar Producto";
  submitBtn.textContent = "Guardar Producto";
  cancelEditBtn.hidden = true;
};

const mapProduct = (item) => ({
  _id: String(item._id ?? item.id ?? item.Id ?? crypto.randomUUID()),
  Id: Number(item.Id ?? item.id ?? 0),
  nombre: item.Nombre ?? item.nombre ?? "Producto",
  precio: Number(item.Precio ?? item.precio ?? 0),
  descripcion: item.Descripcion ?? item.descripcion ?? "",
  imagen: item.ImagenUrl ?? item.imagen ?? "./placeholder.svg",
  existencias: Number(item.Stock ?? item.existencias ?? 0),
});

const fetchProducts = async () => {
  try {
    showLoader(true);
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("No se pudieron cargar los productos");
    const data = await res.json();
    products = (data || []).map(mapProduct).filter((p) => !!p._id);
    renderProducts();
  } catch (err) {
    showStatus(err.message, "error");
  } finally {
    showLoader(false);
  }
};

const renderProducts = () => {
  productsGrid.innerHTML = "";
  if (products.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const frag = document.createDocumentFragment();

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "card-product";
    card.dataset.id = product._id;
    card.innerHTML = `
      <div class="card-product__img">
        <img src="${product.imagen || "./placeholder.svg"}" alt="${product.nombre}" onerror="this.src='./placeholder.svg'">
      </div>
      <div class="card-product__body">
        <p class="product-name">${product.nombre}</p>
        <p class="product-price">$${product.precio.toFixed(2)}</p>
        <p class="product-desc">${product.descripcion}</p>
        <div class="product-meta">
          <span>Stock: ${product.existencias}</span>
          <span>#${product.Id || "N/A"}</span>
        </div>
        <div class="product-actions">
          <button class="btn btn--outline" data-action="edit">Editar</button>
          <button class="btn btn--danger" data-action="delete">Eliminar</button>
        </div>
      </div>
    `;
    frag.appendChild(card);
  });

  productsGrid.appendChild(frag);
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const formData = new FormData(form);
  const nombre = formData.get("nombre")?.toString().trim();
  const precio = Number.parseFloat(formData.get("precio"));
  const descripcion = formData.get("descripcion")?.toString().trim();
  const imagen = formData.get("imagen")?.toString().trim();
  const existencias = Number.parseInt(formData.get("existencias"));

  if (!nombre || Number.isNaN(precio) || Number.isNaN(existencias)) {
    showStatus("Nombre, precio y existencias son obligatorios.", "error");
    submitBtn.disabled = false;
    return;
  }

  const payload = {
    Nombre: nombre,
    Precio: precio,
    Descripcion: descripcion,
    ImagenUrl: imagen,
    Stock: existencias,
  };

  try {
    const isEdit = Boolean(editingId);
    const url = isEdit ? `${API_BASE}/products/${editingId}` : `${API_BASE}/products`;
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData?.message || "No se pudo guardar el producto.");
    }

    showToast(isEdit ? "Producto actualizado" : "Producto agregado");
    resetForm();
    await fetchProducts();
  } catch (err) {
    showStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

productsGrid.addEventListener("click", async (e) => {
  const actionBtn = e.target.closest("button[data-action]");
  if (!actionBtn) return;
  const card = actionBtn.closest(".card-product");
  const id = card?.dataset.id;
  if (!id) return;

  const product = products.find((p) => p._id === id);

  if (actionBtn.dataset.action === "edit" && product) {
    editingId = id;
    formTitle.textContent = "Editar Producto";
    submitBtn.textContent = "Actualizar Producto";
    cancelEditBtn.hidden = false;
    form.nombre.value = product.nombre;
    form.precio.value = product.precio;
    form.descripcion.value = product.descripcion;
    form.imagen.value = product.imagen;
    form.existencias.value = product.existencias;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (actionBtn.dataset.action === "delete") {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "No se pudo eliminar el producto.");
      }
      products = products.filter((p) => p._id !== id);
      renderProducts();
      showToast("Producto eliminado");
    } catch (err) {
      showStatus(err.message, "error");
    }
  }
});

fetchProducts();
