/* script.js - versão adaptada para Firebase + melhorias */

/* ===== Variáveis globais ===== */
let map,
  markers = []; // marcadores no mapa
let editMode = false;
let nextId = 7;
let currentImages = []; // URLs (existentes) e DataURLs (previews)
let currentImageFiles = []; // File objects para upload
let currentGalleryImages = [];
let currentGalleryIndex = 0;

/* Dados das ações (inicializa vazio) */
let actionsData = []; // IMPORTANTE: agora sempre definido (antes estava ausente)

/* =========================
   CONFIGURAÇÃO (Firebase detectado no index.html)
   ========================= */
const FIREBASE_ENABLED = !!window._FIREBASE_ENABLED;
const firestore = FIREBASE_ENABLED ? window._FIRESTORE : null;
const storage = FIREBASE_ENABLED ? window._STORAGE : null;

/* =========================
   INICIALIZA O MAPA (Leaflet)
   ========================= */
function initMap() {
  map = L.map("map").setView([-6.3624, -39.299], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Carrega dados salvos (Firestore ou localStorage)
  loadSavedData().then(() => {
    updateMapMarkers();
    updateActionList();
    addLegend();
  });

  map.on("click", function (e) {
    if (editMode) {
      document.getElementById("action-lat").value = e.latlng.lat.toFixed(6);
      document.getElementById("action-lng").value = e.latlng.lng.toFixed(6);
      openModal();
    }
  });
}

/* =========================
   ÍCONES E LEGENDA
   ========================= */
function createCustomIcon(type) {
  const iconColors = {
    educacao: "#3498db",
    reciclagem: "#e67e22",
    reflorestamento: "#2ecc71",
    horta: "#9b59b6",
    agroecologia: "#f1c40f",
    empreendedorismo: "#a2f183ff", // corrigido
    cultura: "#f05cd0ff",
    default: "#2e7d32",
  };

  const color = iconColors[type] || iconColors["default"];

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
}

function addLegend() {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function (map) {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
            <h4>Legenda</h4>
            <div class="legend-item"><span class="legend-color" style="background: #3498db"></span> Educação Ambiental</div>
            <div class="legend-item"><span class="legend-color" style="background: #e67e22"></span> Reciclagem</div>
            <div class="legend-item"><span class="legend-color" style="background: #9b59b6"></span> Hortas Comunitárias</div>
            <div class="legend-item"><span class="legend-color" style="background: #f1c40f"></span> Agroecologia</div>
            <div class="legend-item"><span class="legend-color" style="background: #a2f183ff"></span> Empreendedorismo</div>
            <div class="legend-item"><span class="legend-color" style="background: #f05cd0ff"></span> Cultura</div>
        `;
    return div;
  };
  legend.addTo(map);
}

/* =========================
   UPDATE MARKERS
   ========================= */
function updateMapMarkers() {
  if (!map) return;
  markers.forEach((m) => {
    try {
      map.removeLayer(m.element);
    } catch (err) {}
  });
  markers = [];

  actionsData.forEach((action) => {
    const marker = L.marker(action.coords, {
      icon: createCustomIcon(action.type),
    })
      .addTo(map)
      .bindPopup(`
                ${
                  action.images && action.images.length > 0
                    ? `<img src="${action.images[0]}" class="popup-image" alt="${escapeHtml(action.title)}">`
                    : `<div class="no-image"><i class="fas fa-image"></i> Sem imagem</div>`
                }
                <b>${escapeHtml(action.title)}</b><br>
                <i>Tipo: ${getTypeName(action.type)}</i><br>
                ${escapeHtml(action.description)}<br>
                <b>Localização:</b> ${escapeHtml(action.location)}
                ${
                  editMode
                    ? `<br><div style="margin-top: 10px; text-align: center;">
                    <button onclick="editAction(${action.id})" style="background: #2e7d32; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Editar</button>
                    <button onclick="deleteAction(${action.id})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Excluir</button>
                </div>`
                    : ""
                }
            `);

    markers.push({
      element: marker,
      type: action.type,
      id: action.id,
    });
  });
}

/* =========================
   LISTA DE AÇÕES (cards)
   ========================= */
function updateActionList() {
  const actionList = document.getElementById("action-list");
  actionList.innerHTML = "";

  actionsData.forEach((action) => {
    const actionItem = document.createElement("div");
    actionItem.className = "action-item";
    actionItem.setAttribute("data-type", action.type);
    actionItem.setAttribute("data-lat", action.coords[0]);
    actionItem.setAttribute("data-lng", action.coords[1]);

    actionItem.innerHTML = `
            ${
              action.images && action.images.length > 0
                ? `<div style="position: relative;">
                    <img src="${action.images[0]}" class="action-image" alt="${escapeHtml(action.title)}">
                    ${
                      action.images.length > 1
                        ? `<span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.8rem;"><i class="fas fa-images"></i> ${action.images.length}</span>`
                        : ""
                    }
                </div>`
                : `<div class="no-image"><i class="fas fa-image"></i> Sem imagem</div>`
            }
            ${
              editMode
                ? `
            <div class="edit-buttons">
                <button class="edit-btn" onclick="editAction(${action.id})"><i class="fas fa-edit" aria-hidden="true"></i></button>
                <button class="edit-btn" onclick="deleteAction(${action.id})"><i class="fas fa-trash" aria-hidden="true"></i></button>
            </div>
            `
                : ""
            }
            <span class="action-type">${getTypeName(action.type)}</span>
            <h3><i class="${getTypeIcon(action.type)}"></i> ${escapeHtml(action.title)}</h3>
            <p class="action-desc">${escapeHtml(action.description)}</p>
            <p class="action-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(action.location)}</p>
        `;

    actionItem.addEventListener("click", function (e) {
      if (!e.target.closest(".edit-buttons")) {
        if (!editMode) {
          if (action.images && action.images.length > 0) {
            openGallery(action);
          } else {
            map.setView(action.coords, 14);
            const found = markers.find((m) => m.id === action.id);
            if (found) {
              found.element.openPopup();
            }
          }
        }
      }
    });

    actionList.appendChild(actionItem);
  });
}

/* =========================
   Helpers: nomes e ícones
   ========================= */
function getTypeName(type) {
  const typeNames = {
    educacao: "Educação Ambiental",
    reciclagem: "Reciclagem",
    reflorestamento: "Reflorestamento",
    horta: "Horta Comunitária",
    agroecologia: "Agroecologia",
    empreendedorismo: "Empreendedorismo e Meio Ambiente",
    cultura: "Cultura e Meio Ambiente",
  };
  return typeNames[type] || type;
}

function getTypeIcon(type) {
  const typeIcons = {
    educacao: "fas fa-graduation-cap",
    reciclagem: "fas fa-recycle",
    reflorestamento: "fas fa-tree",
    horta: "fas fa-seedling",
    agroecologia: "fas fa-leaf",
    empreendedorismo: "fas fa-briefcase",
    cultura: "fas fa-theater-masks",
  };
  return typeIcons[type] || "fas fa-map-marker";
}

/* =========================
   MODAL: abrir/fechar + edição
   ========================= */
function openModal(action = null) {
  const modal = document.getElementById("edit-modal");
  const title = document.getElementById("modal-title");
  const form = document.getElementById("action-form");

  currentImages = [];
  currentImageFiles = [];
  updateGalleryPreview();

  if (action) {
    title.textContent = "Editar Ação";
    document.getElementById("action-id").value = action.id;
    document.getElementById("action-title").value = action.title;
    document.getElementById("action-type").value = action.type;
    document.getElementById("action-description").value = action.description;
    document.getElementById("action-location").value = action.location;
    document.getElementById("action-lat").value = action.coords[0];
    document.getElementById("action-lng").value = action.coords[1];

    if (action.images && action.images.length > 0) {
      currentImages = [...action.images]; // URLs existentes
      // note: currentImageFiles continua vazio — somente novas imagens serão enviadas ao salvar
      updateGalleryPreview();
    }
  } else {
    title.textContent = "Adicionar Ação";
    form.reset();
    document.getElementById("action-id").value = "";
    if (!document.getElementById("action-lat").value) {
      const center = map.getCenter();
      document.getElementById("action-lat").value = center.lat.toFixed(6);
      document.getElementById("action-lng").value = center.lng.toFixed(6);
    }
  }

  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("edit-modal").style.display = "none";
}

function editAction(id) {
  const action = actionsData.find((a) => a.id === id);
  if (action) {
    openModal(action);
  }
}

function deleteAction(id) {
  if (confirm("Tem certeza que deseja excluir esta ação?")) {
    // Remove do Firestore se habilitado
    if (FIREBASE_ENABLED) {
      firestore
        .collection("actions")
        .doc(String(id))
        .delete()
        .catch((err) => console.warn("Erro deletando no Firestore:", err));
      // Também podemos remover imagens do Storage se necessário (não obrigatório aqui)
    }

    actionsData = actionsData.filter((a) => a.id !== id);
    updateMapMarkers();
    updateActionList();

    // Atualiza localStorage fallback
    localStorage.setItem("iguatuActions", JSON.stringify(actionsData));
  }
}

/* =========================
   Galeria (visualização)
   ========================= */
function openGallery(action) {
  currentGalleryImages = action.images || [];
  currentGalleryIndex = 0;

  if (currentGalleryImages.length > 0) {
    updateGalleryView();
    document.getElementById("gallery-modal").style.display = "flex";
  }
}

function closeGallery() {
  document.getElementById("gallery-modal").style.display = "none";
}

function updateGalleryView() {
  if (currentGalleryImages.length === 0) return;

  const mainImage = document.getElementById("gallery-main-image");
  const caption = document.getElementById("gallery-caption");
  const imageCount = document.getElementById("image-count");
  const thumbnailsContainer = document.getElementById("gallery-thumbnails");

  mainImage.src = currentGalleryImages[currentGalleryIndex];
  mainImage.alt = `Imagem ${currentGalleryIndex + 1}`;
  caption.textContent = `${currentGalleryIndex + 1} de ${
    currentGalleryImages.length
  }`;
  imageCount.textContent = `${currentGalleryIndex + 1}/${
    currentGalleryImages.length
  }`;

  thumbnailsContainer.innerHTML = "";
  currentGalleryImages.forEach((image, index) => {
    const thumb = document.createElement("img");
    thumb.src = image;
    thumb.className = `gallery-thumb ${
      index === currentGalleryIndex ? "active" : ""
    }`;
    thumb.alt = `Miniatura ${index + 1}`;

    thumb.addEventListener("click", () => {
      currentGalleryIndex = index;
      updateGalleryView();
    });

    thumbnailsContainer.appendChild(thumb);
  });
}

function prevImage() {
  if (currentGalleryImages.length === 0) return;
  currentGalleryIndex--;
  if (currentGalleryIndex < 0) {
    currentGalleryIndex = currentGalleryImages.length - 1;
  }
  updateGalleryView();
}

function nextImage() {
  if (currentGalleryImages.length === 0) return;
  currentGalleryIndex++;
  if (currentGalleryIndex >= currentGalleryImages.length) {
    currentGalleryIndex = 0;
  }
  updateGalleryView();
}

/* =========================
   Preview da galeria (miniaturas no modal) + upload handling
   ========================= */
function updateGalleryPreview() {
  const galleryContainer = document.getElementById("gallery-container");
  galleryContainer.innerHTML = "";

  currentImages.forEach((image, index) => {
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-preview-container";

    imageContainer.innerHTML = `
            <img src="${image}" class="gallery-preview" alt="Imagem ${index + 1}">
            <button class="remove-image-btn" data-index="${index}">&times;</button>
        `;
    galleryContainer.appendChild(imageContainer);
  });

  document.querySelectorAll(".remove-image-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const index = parseInt(this.getAttribute("data-index"));
      // se for URL existente, remove de currentImages; se for DataURL com arquivo associado, remove também file associado
      // Remove possíveis arquivos correspondentes (tentativa de identificação pela ordem)
      currentImages.splice(index, 1);
      // Mantemos currentImageFiles independentes (only new files) — para simplicidade, assumimos que novos arquivos aparecem no final na mesma ordem.
      // Se quiser mapeamento exato entre preview e file, é possível criar um objeto {preview, file}
      updateGalleryPreview();
    });
  });
}

function handleImageUpload(event) {
  const files = event.target.files;

  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = function (e) {
        currentImages.push(e.target.result); // preview DataURL
        currentImageFiles.push(file); // guarda File para upload posterior
        updateGalleryPreview();
      };

      reader.readAsDataURL(file);
    }
  }
}

/* =========================
   SALVAR DADOS (Firestore/Storage) - async
   ========================= */
async function saveData() {
  // Se Firebase não configurado, salvamos apenas em localStorage como fallback
  if (!FIREBASE_ENABLED) {
    localStorage.setItem("iguatuActions", JSON.stringify(actionsData));
    alert("Dados salvos localmente (localStorage). Para salvar no servidor configure o Firebase.");
    return;
  }

  try {
    // Para cada ação em actionsData — atualiza/insere no Firestore
    for (let action of actionsData) {
      // Se a ação tiver imagens DataURL que correspondem a arquivos novos (detectamos pela presença em currentImageFiles somente no modal),
      // precisamos garantir que as imagens novas já tenham sido enviadas quando criamos/alteramos a ação no modal.
      // No fluxo atual, as imagens novas são tratadas no submit do formulário (veja listener abaixo) e já devem estar em action.images como URLs.
      // Aqui apenas fazemos o merge/put por segurança:

      const docRef = firestore.collection("actions").doc(String(action.id));
      await docRef.set({
        id: action.id,
        type: action.type,
        coords: action.coords,
        title: action.title,
        description: action.description,
        location: action.location,
        images: action.images || [],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    alert("Dados salvos no Firebase com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar no Firebase:", err);
    alert("Erro ao salvar no Firebase. Verifique o console.");
  }
}

/* =========================
   CARREGAR DADOS (Firestore ou localStorage)
   ========================= */
async function loadSavedData() {
  // Se Firebase não configurado, usa localStorage
  if (!FIREBASE_ENABLED) {
    const savedData = localStorage.getItem("iguatuActions");
    if (savedData) {
      try {
        actionsData = JSON.parse(savedData);
        if (actionsData.length > 0) {
          nextId = Math.max(...actionsData.map((a) => a.id)) + 1;
        }
      } catch (err) {
        console.warn("Erro lendo localStorage:", err);
        actionsData = [];
      }
    }
    return;
  }

  // Se Firebase configurado, busca todos os documentos
  try {
    const snapshot = await firestore.collection("actions").get();
    const loaded = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // converte coords se necessário
      loaded.push({
        id: data.id,
        type: data.type,
        coords: data.coords,
        title: data.title,
        description: data.description,
        location: data.location,
        images: data.images || [],
      });
    });
    actionsData = loaded.sort((a, b) => a.id - b.id);
    if (actionsData.length > 0) {
      nextId = Math.max(...actionsData.map((a) => a.id)) + 1;
    }
  } catch (err) {
    console.error("Erro carregando dados do Firebase:", err);
    // fallback para localStorage
    const savedData = localStorage.getItem("iguatuActions");
    if (savedData) {
      try {
        actionsData = JSON.parse(savedData);
        if (actionsData.length > 0) {
          nextId = Math.max(...actionsData.map((a) => a.id)) + 1;
        }
      } catch (e) {
        actionsData = [];
      }
    }
  }
}

/* =========================
   TOOLING: upload images helper
   - Recebe actionId (numérico) e array de File objects
   - Retorna array de download URLs
   ========================= */
async function uploadFilesForAction(actionId, files) {
  if (!FIREBASE_ENABLED || !files || files.length === 0) return [];

  const uploadedUrls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const timestamp = Date.now();
    const filePath = `actions/${actionId}/${timestamp}_${file.name}`;
    const storageRef = storage.ref().child(filePath);
    try {
      // Faz upload
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      uploadedUrls.push(downloadURL);
    } catch (err) {
      console.error("Erro upload arquivo:", err);
    }
  }
  return uploadedUrls;
}

/* =========================
   Escapar HTML simples para evitar injeção em popups (básico)
   ========================= */
function escapeHtml(text) {
  if (!text && text !== 0) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   Inicialização (event listeners)
   ========================= */
function init() {
  // Initial load + map
  initMap();

  document.getElementById("add-action-btn").addEventListener("click", () => openModal());
  document.getElementById("edit-mode-btn").addEventListener("click", toggleEditMode);
  document.getElementById("save-data-btn").addEventListener("click", () => {
    // Salva em Firebase (assíncrono)
    saveData();
  });
  document.getElementById("cancel-btn").addEventListener("click", closeModal);
  document.querySelector(".close").addEventListener("click", closeModal);

  document.getElementById("add-image-btn").addEventListener("click", () => {
    document.getElementById("gallery-image-input").click();
  });

  document.getElementById("gallery-image-input").addEventListener("change", handleImageUpload);

  document.getElementById("gallery-close").addEventListener("click", closeGallery);
  document.getElementById("gallery-prev").addEventListener("click", prevImage);
  document.getElementById("gallery-next").addEventListener("click", nextImage);

  document.getElementById("gallery-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("gallery-modal")) {
      closeGallery();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (document.getElementById("gallery-modal").style.display === "flex") {
      if (e.key === "ArrowLeft") {
        prevImage();
      } else if (e.key === "ArrowRight") {
        nextImage();
      } else if (e.key === "Escape") {
        closeGallery();
      }
    }
  });

  // Submit do formulário: aqui fazemos upload das imagens novas (currentImageFiles)
  document.getElementById("action-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const idField = document.getElementById("action-id").value;
    const title = document.getElementById("action-title").value;
    const type = document.getElementById("action-type").value;
    const description = document.getElementById("action-description").value;
    const location = document.getElementById("action-location").value;
    const lat = parseFloat(document.getElementById("action-lat").value);
    const lng = parseFloat(document.getElementById("action-lng").value);

    const actionId = idField ? parseInt(idField) : nextId++;

    // Prepare list de imagens finais:
    // - Mantemos currentImages (que pode conter URLs existentes e DataURLs)
    // - Subimos currentImageFiles (novos arquivos) e obtemos URLs
    // Para identificar quais currentImages correspondem a files, o fluxo atual não mapeia 1:1;
    // portanto usamos abordagem: manter quaisquer currentImages que são URLs (começam com http) e
    // acrescentar as URLs resultantes do upload de currentImageFiles.

    const existingUrls = currentImages.filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")));
    let newUploadedUrls = [];
    if (currentImageFiles.length > 0 && FIREBASE_ENABLED) {
      newUploadedUrls = await uploadFilesForAction(actionId, currentImageFiles);
    } else if (currentImageFiles.length > 0 && !FIREBASE_ENABLED) {
      // Se Firebase não habilitado, convertemos previews (DataURL) em imagens inline (já em currentImages)
      // nada a fazer; previews já estão em currentImages
    }

    // Monta imagens finais:
    let finalImages = [];
    // Mantém URLs existentes
    finalImages.push(...existingUrls);
    // Adiciona imagens já em currentImages que são DataURLs (quando Firebase não está ativo) - mantemos para UI
    if (!FIREBASE_ENABLED) {
      currentImages.forEach((img) => {
        if (typeof img === "string" && (img.startsWith("data:") || img.startsWith("blob:"))) {
          if (!finalImages.includes(img)) finalImages.push(img);
        }
      });
    }
    // Adiciona URLs de upload (quando houver)
    finalImages.push(...newUploadedUrls);

    const actionData = {
      id: actionId,
      type,
      coords: [lat, lng],
      title,
      description,
      location,
      images: finalImages,
    };

    if (idField) {
      const index = actionsData.findIndex((a) => a.id === parseInt(idField));
      if (index !== -1) {
        actionsData[index] = actionData;
      } else {
        actionsData.push(actionData);
      }
    } else {
      actionsData.push(actionData);
    }

    // Atualiza UI
    updateMapMarkers();
    updateActionList();
    closeModal();

    // Persistência: se Firebase habilitado, salvamos o documento específico
    if (FIREBASE_ENABLED) {
      try {
        await firestore.collection("actions").doc(String(actionId)).set({
          id: actionId,
          type,
          coords: [lat, lng],
          title,
          description,
          location,
          images: finalImages,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error("Erro salvando ação no Firestore:", err);
      }
    } else {
      // fallback localStorage
      localStorage.setItem("iguatuActions", JSON.stringify(actionsData));
    }

    // Limpa previews/files temporários
    currentImages = [];
    currentImageFiles = [];
    updateGalleryPreview();
  });

  // Filtros
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      const filter = this.getAttribute("data-filter");

      markers.forEach((marker) => {
        if (filter === "all" || marker.type === filter) {
          map.addLayer(marker.element);
        } else {
          map.removeLayer(marker.element);
        }
      });

      document.querySelectorAll(".action-item").forEach((item) => {
        const itemType = item.getAttribute("data-type");
        if (filter === "all" || itemType === filter) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
    });
  });

  document.getElementById("view-map-btn").addEventListener("click", function () {
    document.querySelector(".map-container").style.display = "block";
    document.querySelector(".actions").style.display = "block";
  });

  document.getElementById("view-list-btn").addEventListener("click", function () {
    document.querySelector(".map-container").style.display = "none";
    document.querySelector(".actions").style.display = "block";
  });
}

/* =========================
   Toggle modo edição
   ========================= */
function toggleEditMode() {
  editMode = !editMode;
  const editBtn = document.getElementById("edit-mode-btn");

  if (editMode) {
    editBtn.innerHTML = '<i class="fas fa-times"></i> Sair do Modo Edição';
    editBtn.classList.add("btn-danger");
    editBtn.classList.remove("btn-secondary");
  } else {
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Modo Edição';
    editBtn.classList.remove("btn-danger");
    editBtn.classList.add("btn-secondary");
  }

  updateMapMarkers();
  updateActionList();
}

/* =========================
   Inicializa quando DOM pronto
   ========================= */
document.addEventListener("DOMContentLoaded", init);



