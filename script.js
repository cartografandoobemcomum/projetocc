let actionsData = [];
let map,
  markers = []; // map = objeto do Leaflet, markers = lista de marcadores no mapa
let editMode = false; // indica se estamos no modo edição
let nextId = 7; // próximo id para novas ações
let currentImages = []; // imagens no modal de edição (DataURLs)
let currentGalleryImages = []; // imagens para a galeria de visualização
let currentGalleryIndex = 0; // índice atual na galeria

/* ============================
   INICIALIZA O MAPA (Leaflet)
   ============================ */
function initMap() {
  // Cria o mapa e centraliza em Iguatu (coordenadas aproximadas)
  map = L.map("map").setView([-6.3624, -39.299], 12);

  // Camada de tiles (mapa base) usando OpenStreetMap (gratuito)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Adiciona marcadores com base na lista actionsData
  updateMapMarkers();

  // Adiciona a legenda no canto do mapa
  addLegend();

  // Se o usuário clicar no mapa e estivermos no modo edição,
  // pegamos a latitude/longitude clicada e abrimos o modal de edição
  map.on("click", function (e) {
    if (editMode) {
      document.getElementById("action-lat").value = e.latlng.lat.toFixed(6);
      document.getElementById("action-lng").value = e.latlng.lng.toFixed(6);
      openModal();
    }
  });
}

/* ============================
   ATUALIZA MARCADORES NO MAPA
   ============================ */
function updateMapMarkers() {
  // 1) remove marcadores antigos do mapa
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];

  // 2) cria novos marcadores a partir de actionsData
  actionsData.forEach((action) => {
    // cria um marcador com ícone personalizado (círculo colorido)
    const marker = L.marker(action.coords, {
      icon: createCustomIcon(action.type),
    }).addTo(map).bindPopup(`
                ${
                  action.images && action.images.length > 0
                    ? `<img src="${action.images[0]}" class="popup-image" alt="${action.title}">`
                    : `<div class="no-image"><i class="fas fa-image"></i> Sem imagem</div>`
                }
                <b>${action.title}</b><br>
                <i>Tipo: ${getTypeName(action.type)}</i><br>
                ${action.description}<br>
                <b>Localização:</b> ${action.location}
                ${
                  editMode
                    ? `<br><div style="margin-top: 10px; text-align: center;">
                    <button onclick="editAction(${action.id})" style="background: #2e7d32; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Editar</button>
                    <button onclick="deleteAction(${action.id})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Excluir</button>
                </div>`
                    : ""
                }
            `);

    // Guardamos o marcador e seus dados (útil para filtrar depois)
    markers.push({
      element: marker,
      type: action.type,
      id: action.id,
    });
  });
}

/* ============================
   CRIA ÍCONE PERSONALIZADO
   ============================ */
/* Comentário: usamos ícones em HTML para permitir círculos coloridos */
function createCustomIcon(type) {
  const iconColors = {
    educacao: "#3498db",
    reciclagem: "#e67e22",
    reflorestamento: "#2ecc71",
    horta: "#9b59b6",
    agroecologia: "#f1c40f",
    emprendedorismo: "#8bce8bff",
    cultura: "#df2783ff",
    default: "#2e7d32",
  };

  const color = iconColors[type] || iconColors["default"];

  // Retornamos um divIcon que desenha um círculo colorido
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
}

/* ============================
   ADICIONA A LEGENDA NO MAPA
   ============================ */
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

/* ============================
   ATUALIZA A LISTA DE AÇÕES (LADOS/GRID)
   ============================ */
function updateActionList() {
  const actionList = document.getElementById("action-list");
  actionList.innerHTML = ""; // limpa antes de recriar

  actionsData.forEach((action) => {
    // Criamos o card (div) que mostra a ação
    const actionItem = document.createElement("div");
    actionItem.className = "action-item";
    actionItem.setAttribute("data-type", action.type);
    actionItem.setAttribute("data-lat", action.coords[0]);
    actionItem.setAttribute("data-lng", action.coords[1]);

    // Montamos o HTML interno do card. Observação: usamos template strings.
    actionItem.innerHTML = `
            ${
              action.images && action.images.length > 0
                ? `<div style="position: relative;">
                    <img src="${action.images[0]}" class="action-image" alt="${
                    action.title
                  }">
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
                <button class="edit-btn" onclick="editAction(${action.id})"><i class="fas fa-edit"></i></button>
                <button class="edit-btn" onclick="deleteAction(${action.id})"><i class="fas fa-trash"></i></button>
            </div>
            `
                : ""
            }
            <span class="action-type">${getTypeName(action.type)}</span>
            <h3><i class="${getTypeIcon(action.type)}"></i> ${action.title}</h3>
            <p class="action-desc">${action.description}</p>
            <p class="action-location"><i class="fas fa-map-marker-alt"></i> ${
              action.location
            }</p>
        `;

    // Ao clicar no card:
    // - se não estamos no modo edição, abrimos a galeria (se houver imagens)
    // - ou centralizamos e abrimos o popup no mapa
    actionItem.addEventListener("click", function (e) {
      // Impede que clique nos botões de edição (lápis/lixeira) dispare esconder/mostrar
      if (!e.target.closest(".edit-buttons")) {
        if (!editMode) {
          if (action.images && action.images.length > 0) {
            openGallery(action);
          } else {
            map.setView(action.coords, 14);
            // encontra o marcador correspondente e abre o popup
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

/* ============================
   TRADUZ NOME DO TIPO (para mostrar ao usuário)
   ============================ */
function getTypeName(type) {
  const typeNames = {
    educacao: "Educação Ambiental",
    reciclagem: "Reciclagem",
    reflorestamento: "Reflorestamento",
    horta: "Horta Comunitária",
    agroecologia: "Agroecologia",
    emprendedorismo: "Empreendedorismo e Meio Ambiente",
    cultura: "Cultura e Meio Ambiente",
  };
  return typeNames[type] || type;
}

/* ============================
   RETORNA ÍCONE (classe do FontAwesome) baseado no tipo
   ============================ */
function getTypeIcon(type) {
  const typeIcons = {
    educacao: "fas fa-graduation-cap",
    reciclagem: "fas fa-recycle",
    reflorestamento: "fas fa-tree",
    horta: "fas fa-seedling",
    agroecologia: "fas fa-leaf",
  };
  return typeIcons[type] || "fas fa-map-marker";
}

/* ============================
   ABRE O MODAL PARA ADICIONAR/EDITAR AÇÃO
   ============================ */
/* Se for passada uma ação, o modal virará "editar", senão "adicionar" */
function openModal(action = null) {
  const modal = document.getElementById("edit-modal");
  const title = document.getElementById("modal-title");
  const form = document.getElementById("action-form");

  // Reset das imagens temporárias e preview
  currentImages = [];
  updateGalleryPreview();

  if (action) {
    // Preenche o formulário com dados da ação (modo editar)
    title.textContent = "Editar Ação";
    document.getElementById("action-id").value = action.id;
    document.getElementById("action-title").value = action.title;
    document.getElementById("action-type").value = action.type;
    document.getElementById("action-description").value = action.description;
    document.getElementById("action-location").value = action.location;
    document.getElementById("action-lat").value = action.coords[0];
    document.getElementById("action-lng").value = action.coords[1];

    // Se houver imagens, carregamos no preview
    if (action.images && action.images.length > 0) {
      currentImages = [...action.images];
      updateGalleryPreview();
    }
  } else {
    // Modo adicionar: limpa o formulário
    title.textContent = "Adicionar Ação";
    form.reset();
    document.getElementById("action-id").value = "";

    // Se latitude/longitude não estiverem preenchidas,
    // colocamos as coordenadas do centro do mapa por padrão
    if (!document.getElementById("action-lat").value) {
      const center = map.getCenter();
      document.getElementById("action-lat").value = center.lat.toFixed(6);
      document.getElementById("action-lng").value = center.lng.toFixed(6);
    }
  }

  // Mostra o modal
  modal.style.display = "flex";
}

/* ============================
   FECHAR O MODAL
   ============================ */
function closeModal() {
  document.getElementById("edit-modal").style.display = "none";
}

/* ============================
   EDITAR AÇÃO (função chamada pelos botões nos popups/cards)
   ============================ */
function editAction(id) {
  const action = actionsData.find((a) => a.id === id);
  if (action) {
    openModal(action);
  }
}

/* ============================
   EXCLUIR AÇÃO
   ============================ */
function deleteAction(id) {
  if (confirm("Tem certeza que deseja excluir esta ação?")) {
    actionsData = actionsData.filter((a) => a.id !== id);
    updateMapMarkers();
    updateActionList();
  }
}

/* ============================
   SALVAR DADOS (no localStorage)
   ============================ */
/* Comentário: em app real, aqui enviaria para um servidor; por enquanto usamos localStorage */
function saveData() {
  localStorage.setItem("iguatuActions", JSON.stringify(actionsData));
  alert("Dados salvos com sucesso!");
}
/* ============================
   CARREGA DADOS SALVOS (se existirem)
   ============================ */
function loadSavedData() {
  const savedData = localStorage.getItem("iguatuActions");
  if (savedData) {
    actionsData = JSON.parse(savedData);
    if (actionsData.length > 0) {
      nextId = Math.max(...actionsData.map((a) => a.id)) + 1;
    }
  }
}

/* ============================
   ATIVA / DESATIVA MODO EDIÇÃO
   ============================ */
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

  // Atualiza marcadores e lista para mostrar/ocultar botões de edição
  updateMapMarkers();
  updateActionList();
}

/* ============================
   ATUALIZA O PREVIEW DA GALERIA NO MODAL (miniaturas)
   ============================ */
function updateGalleryPreview() {
  const galleryContainer = document.getElementById("gallery-container");
  galleryContainer.innerHTML = ""; // limpa

  // Cria miniaturas para cada imagem em currentImages
  currentImages.forEach((image, index) => {
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-preview-container";

    imageContainer.innerHTML = `
            <img src="${image}" class="gallery-preview" alt="Imagem ${
      index + 1
    }">
            <button class="remove-image-btn" data-index="${index}">&times;</button>
        `;
    galleryContainer.appendChild(imageContainer);
  });

  // Adiciona evento para remover imagens
  document.querySelectorAll(".remove-image-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // evita que o clique suba ao card
      const index = parseInt(this.getAttribute("data-index"));
      currentImages.splice(index, 1); // remove a imagem
      updateGalleryPreview(); // atualiza miniaturas
    });
  });
}

/* ============================
   PROCESSA UPLOAD DE IMAGENS (input file)
   ============================ */
function handleImageUpload(event) {
  const files = event.target.files;

  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      // Quando terminar de ler o arquivo, adiciona ao preview
      reader.onload = function (e) {
        currentImages.push(e.target.result); // DataURL (base64)
        updateGalleryPreview();
      };

      reader.readAsDataURL(file); // lê o arquivo como DataURL
    }
  }
}

/* ============================
   ABRE A GALERIA DE IMAGENS (visualização)
   ============================ */
function openGallery(action) {
  currentGalleryImages = action.images || [];
  currentGalleryIndex = 0;

  if (currentGalleryImages.length > 0) {
    updateGalleryView();
    document.getElementById("gallery-modal").style.display = "flex";
  }
}

/* ============================
   FECHA A GALERIA
   ============================ */
function closeGallery() {
  document.getElementById("gallery-modal").style.display = "none";
}

/* ============================
   ATUALIZA A VISUALIZAÇÃO DA GALERIA
   ============================ */
function updateGalleryView() {
  if (currentGalleryImages.length === 0) return;

  const mainImage = document.getElementById("gallery-main-image");
  const caption = document.getElementById("gallery-caption");
  const imageCount = document.getElementById("image-count");
  const thumbnailsContainer = document.getElementById("gallery-thumbnails");

  // imagem principal e legenda
  mainImage.src = currentGalleryImages[currentGalleryIndex];
  caption.textContent = `${currentGalleryIndex + 1} de ${
    currentGalleryImages.length
  }`;

  // contador de imagens
  imageCount.textContent = `${currentGalleryIndex + 1}/${
    currentGalleryImages.length
  }`;

  // miniaturas
  thumbnailsContainer.innerHTML = "";
  currentGalleryImages.forEach((image, index) => {
    const thumb = document.createElement("img");
    thumb.src = image;
    thumb.className = `gallery-thumb ${
      index === currentGalleryIndex ? "active" : ""
    }`;
    thumb.alt = `Imagem ${index + 1}`;

    thumb.addEventListener("click", () => {
      currentGalleryIndex = index;
      updateGalleryView();
    });

    thumbnailsContainer.appendChild(thumb);
  });
}

/* ============================
   NAVEGAÇÃO DA GALERIA (prev / next)
   ============================ */
function prevImage() {
  if (currentGalleryImages.length === 0) return;
  currentGalleryIndex--;
  if (currentGalleryIndex < 0) {
    currentGalleryIndex = currentGalleryImages.length - 1; // volta ao fim
  }
  updateGalleryView();
}

function nextImage() {
  if (currentGalleryImages.length === 0) return;
  currentGalleryIndex++;
  if (currentGalleryIndex >= currentGalleryImages.length) {
    currentGalleryIndex = 0; // volta ao início
  }
  updateGalleryView();
}

/* ============================
   INICIALIZA A APLICAÇÃO (liga tudo)
   ============================ */
function init() {
  // Carrega dados salvos no navegador (se houver)
  loadSavedData();

  // Inicializa o mapa e a lista
  initMap();
  updateActionList();

  /* ===== event listeners (liga botões/inputs a ações) ===== */
  document
    .getElementById("add-action-btn")
    .addEventListener("click", () => openModal());
  document
    .getElementById("edit-mode-btn")
    .addEventListener("click", toggleEditMode);
  document.getElementById("save-data-btn").addEventListener("click", saveData);
  document.getElementById("cancel-btn").addEventListener("click", closeModal);
  document.querySelector(".close").addEventListener("click", closeModal); // X do modal

  // Botão para abrir seletor de arquivos (ícone +)
  document.getElementById("add-image-btn").addEventListener("click", () => {
    document.getElementById("gallery-image-input").click();
  });

  // Quando o usuário seleciona arquivos, processamos o upload
  document
    .getElementById("gallery-image-input")
    .addEventListener("change", handleImageUpload);

  // Galeria de visualização
  document
    .getElementById("gallery-close")
    .addEventListener("click", closeGallery);
  document.getElementById("gallery-prev").addEventListener("click", prevImage);
  document.getElementById("gallery-next").addEventListener("click", nextImage);

  // Fecha galeria se o usuário clicar fora do conteúdo (no fundo escuro)
  document.getElementById("gallery-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("gallery-modal")) {
      closeGallery();
    }
  });

  // Navegação por teclado: esquerda/direita/escape quando galeria aberta
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

  // Enviar formulário (salvar nova ação ou editar existente)
  document
    .getElementById("action-form")
    .addEventListener("submit", function (e) {
      e.preventDefault(); // evita recarregar a página

      const id = document.getElementById("action-id").value;
      const title = document.getElementById("action-title").value;
      const type = document.getElementById("action-type").value;
      const description = document.getElementById("action-description").value;
      const location = document.getElementById("action-location").value;
      const lat = parseFloat(document.getElementById("action-lat").value);
      const lng = parseFloat(document.getElementById("action-lng").value);

      const actionData = {
        id: id ? parseInt(id) : nextId++,
        type,
        coords: [lat, lng],
        title,
        description,
        location,
        images: [...currentImages], // copia das imagens selecionadas
      };

      if (id) {
        // Edição: procura o índice e substitui
        const index = actionsData.findIndex((a) => a.id === parseInt(id));
        if (index !== -1) {
          actionsData[index] = actionData;
        }
      } else {
        // Nova ação: adiciona ao array
        actionsData.push(actionData);
      }

      // Atualiza mapa e lista para mostrar a mudança
      updateMapMarkers();
      updateActionList();
      closeModal();
    });

  /* ===== FILTROS =====
       Cada botão de filtro aplica filtro no mapa e na lista */
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      // Marca visualmente o botão selecionado
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      const filter = this.getAttribute("data-filter");

      // Filtra marcadores no mapa (adiciona/remove layers)
      markers.forEach((marker) => {
        if (filter === "all" || marker.type === filter) {
          map.addLayer(marker.element);
        } else {
          map.removeLayer(marker.element);
        }
      });

      // Filtra itens na lista de ações (esconde/mostra cards)
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

  /* ===== BOTÕES "Visualizar Mapa" e "Visualizar Lista" =====
       Eles apenas escondem/mostram o contêiner do mapa ou lista, 
       conforme a escolha do usuário. */
  document
    .getElementById("view-map-btn")
    .addEventListener("click", function () {
      document.querySelector(".map-container").style.display = "block";
      document.querySelector(".actions").style.display = "block";
    });

  document
    .getElementById("view-list-btn")
    .addEventListener("click", function () {
      document.querySelector(".map-container").style.display = "none";
      document.querySelector(".actions").style.display = "block";
    });
}

/* Quando a página terminar de carregar, iniciamos tudo */
document.addEventListener("DOMContentLoaded", init);

