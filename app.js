import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDM0ocMo-GDNacqmbqd29cZmT2MAX6-96E",
  authDomain: "reaction-planner.firebaseapp.com",
  projectId: "reaction-planner",
  storageBucket: "reaction-planner.firebasestorage.app",
  messagingSenderId: "429449110609",
  appId: "1:429449110609:web:49ec612d001be64b8dc470"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const videosRef = collection(db, "videos");
const historyRef = collection(db, "history");

// State Channel Aktif ('adinoki' / 'reaction')
let activeChannel = "adinoki"; 

// Elemen Tab Channel
const tabAdinoki = document.getElementById("tabAdinoki");
const tabReaction = document.getElementById("tabReaction");
const activeChannelBadge = document.getElementById("activeChannelBadge");
const historySubTitle = document.getElementById("historySubTitle");

// Elemen DOM Utama
const tiktokUrlInput = document.getElementById("tiktokUrl");
const tiktokCaptionInput = document.getElementById("tiktokCaption");
const tiktokCategoryInput = document.getElementById("tiktokCategory");
const btnFetch = document.getElementById("btnFetch");
const btnSave = document.getElementById("btnSave");
const listSyuting = document.getElementById("listSyuting");
const listBank = document.getElementById("listBank");
const countSyuting = document.getElementById("countSyuting");
const countBank = document.getElementById("countBank");
const btnCopySyuting = document.getElementById("btnCopySyuting");
const btnSelesaiSyuting = document.getElementById("btnSelesaiSyuting");
const categoryTabs = document.getElementById("categoryTabs");

// Elemen Modal Edit
const editModal = document.getElementById("editModal");
const modalCaptionInput = document.getElementById("modalCaptionInput");
const modalCategoryInput = document.getElementById("modalCategoryInput");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const btnCloseModalX = document.getElementById("btnCloseModalX");
const btnSaveEdit = document.getElementById("btnSaveEdit");

// Elemen Custom Alert Modal
const customAlertModal = document.getElementById("customAlertModal");
const customAlertTitle = document.getElementById("customAlertTitle");
const customAlertMessage = document.getElementById("customAlertMessage");
const btnCloseCustomAlert = document.getElementById("btnCloseCustomAlert");

// Elemen Confirm Modal
const confirmModal = document.getElementById("confirmModal");
const btnCancelConfirm = document.getElementById("btnCancelConfirm");
const btnActionConfirm = document.getElementById("btnActionConfirm");

// Elemen History Modal
const historyModal = document.getElementById("historyModal");
const btnOpenHistory = document.getElementById("btnOpenHistory");
const btnCloseHistoryModal = document.getElementById("btnCloseHistoryModal");
const historyList = document.getElementById("historyList");

let allRawVideos = [];
let allRawHistory = [];
let activeEditId = null;
let currentThumbnail = "";
let currentSyutingItems = [];
let currentBankItems = [];
let selectedCategory = "Semua";
let hasCopiedSyuting = false;

// SOUND EFFECT ALERT
function playAlertSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.log("Audio Error:", e);
  }
}

function showCustomAlert(title, message) {
  playAlertSound();
  customAlertTitle.innerText = title || "Peringatan!";
  customAlertMessage.innerText = message || "";
  customAlertModal.classList.remove("hidden");
}

btnCloseCustomAlert.addEventListener("click", () => {
  customAlertModal.classList.add("hidden");
});

// EVENT LISTENER TAB SWITCHER CHANNEL
tabAdinoki.addEventListener("click", () => switchChannel("adinoki"));
tabReaction.addEventListener("click", () => switchChannel("reaction"));

function switchChannel(channel) {
  activeChannel = channel;
  hasCopiedSyuting = false;
  selectedCategory = "Semua";

  if (activeChannel === "adinoki") {
    tabAdinoki.className = "px-6 py-3.5 font-bold border-b-2 border-orange-600 text-orange-600 bg-orange-50/80 rounded-t-xl flex items-center gap-2 transition-all text-base shadow-sm";
    tabReaction.className = "px-6 py-3.5 font-semibold text-neutral-500 border-b-2 border-transparent hover:text-neutral-800 hover:bg-neutral-100 rounded-t-xl flex items-center gap-2 transition-all text-base";
    activeChannelBadge.innerText = "Target: YT Adinoki";
    historySubTitle.innerText = "Menampilkan riwayat untuk YT Adinoki";
  } else {
    tabReaction.className = "px-6 py-3.5 font-bold border-b-2 border-orange-600 text-orange-600 bg-orange-50/80 rounded-t-xl flex items-center gap-2 transition-all text-base shadow-sm";
    tabAdinoki.className = "px-6 py-3.5 font-semibold text-neutral-500 border-b-2 border-transparent hover:text-neutral-800 hover:bg-neutral-100 rounded-t-xl flex items-center gap-2 transition-all text-base";
    activeChannelBadge.innerText = "Target: YT Adinoki Reaction";
    historySubTitle.innerText = "Menampilkan riwayat untuk YT Adinoki Reaction";
  }

  renderApp(allRawVideos);
  renderHistory(allRawHistory);
}

function updateSelesaiBtnState() {
  if (hasCopiedSyuting && currentSyutingItems.length > 0) {
    btnSelesaiSyuting.disabled = false;
    btnSelesaiSyuting.className = "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border border-emerald-500/40 text-xs px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 opacity-100";
  } else {
    btnSelesaiSyuting.disabled = true;
    btnSelesaiSyuting.className = "bg-neutral-100 text-neutral-400 border border-neutral-200 text-xs px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 opacity-60 cursor-not-allowed";
  }
}

// 1. AMBIL CAPTION & THUMBNAIL TIKTOK
btnFetch.addEventListener("click", async () => {
  const url = tiktokUrlInput.value.trim();
  if (!url) return showCustomAlert("Input Kosong!", "Masukkan link TikTok terlebih dahulu!");

  btnFetch.innerText = "Mengambil...";
  btnFetch.disabled = true;

  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error("Gagal mengambil data TikTok");
    
    const data = await response.json();
    tiktokCaptionInput.value = data.title || "Gagal mendapatkan caption otomatis.";
    currentThumbnail = data.thumbnail_url || "";
  } catch (error) {
    showCustomAlert("Gagal Ambil Data", "Gagal mengambil data otomatis. Kamu tetap bisa mengetik caption manual di bawah.");
  } finally {
    btnFetch.innerText = "Ambil Caption & Thumbnail";
    btnFetch.disabled = false;
  }
});

// 2. SIMPAN KE BANK VIDEO
btnSave.addEventListener("click", async () => {
  const url = tiktokUrlInput.value.trim();
  const caption = tiktokCaptionInput.value.trim();
  const manualCategory = tiktokCategoryInput.value.trim() || "Lainnya";

  if (!url) return showCustomAlert("Input Kosong!", "Link TikTok tidak boleh kosong!");

  let thumbnailToSave = currentThumbnail;

  if (!thumbnailToSave) {
    try {
      const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        thumbnailToSave = data.thumbnail_url || "";
        if (!caption) tiktokCaptionInput.value = data.title || "Tanpa caption";
      }
    } catch (e) {
      console.log("Gagal fetch thumbnail:", e);
    }
  }

  const finalCaption = tiktokCaptionInput.value.trim() || caption || "Tanpa caption";

  try {
    await addDoc(videosRef, {
      channel: activeChannel,
      url: url,
      caption: finalCaption,
      thumbnail: thumbnailToSave,
      category: manualCategory,
      status: "bank",
      order: 999,
      createdAt: serverTimestamp()
    });

    tiktokUrlInput.value = "";
    tiktokCaptionInput.value = "";
    tiktokCategoryInput.value = "";
    currentThumbnail = "";
  } catch (error) {
    console.error("Gagal menyimpan data:", error);
    showCustomAlert("Gagal Menyimpan", "Terjadi kesalahan saat menyimpan data ke Firebase.");
  }
});

// 3. READ REALTIME VIDEO
const q = query(videosRef, orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  allRawVideos = [];
  snapshot.forEach((doc) => {
    allRawVideos.push({ id: doc.id, ...doc.data() });
  });

  renderApp(allRawVideos);
});

// 4. RENDER APLIKASI
function renderApp(items) {
  const channelFilteredItems = items.filter(item => 
    item.channel === activeChannel || (!item.channel && activeChannel === "adinoki")
  );

  currentSyutingItems = channelFilteredItems
    .filter(i => i.status === "syuting")
    .sort((a, b) => (a.order || 0) - (b.order || 0));
    
  currentBankItems = channelFilteredItems.filter(i => i.status === "bank");

  countSyuting.innerText = currentSyutingItems.length;
  countBank.innerText = currentBankItems.length;

  if (currentSyutingItems.length === 0) {
    hasCopiedSyuting = false;
  }
  updateSelesaiBtnState();

  // Render Daftar Siap Syuting
  listSyuting.innerHTML = currentSyutingItems.map((item, index) => {
    const imgHtml = item.thumbnail 
      ? `<img src="${item.thumbnail}" alt="Thumbnail" class="w-32 sm:w-36 h-48 sm:h-52 object-cover rounded-2xl flex-shrink-0 bg-neutral-100 border border-neutral-200 shadow-sm" />`
      : `<div class="w-32 sm:w-36 h-48 sm:h-52 bg-neutral-100 rounded-2xl flex items-center justify-center text-xs text-neutral-400 flex-shrink-0 border border-neutral-200">Tidak Ada Gambar</div>`;

    const isLongText = item.caption && item.caption.length > 120;
    const seeMoreBtn = isLongText 
      ? `<button id="btn-caption-${item.id}" onclick="toggleCaption('${item.id}')" class="text-xs text-orange-600 hover:text-orange-700 font-semibold mt-1 inline-block focus:outline-none">Lihat Selengkapnya</button>` 
      : '';

    const categoryTag = item.category || "Lainnya";

    return `
      <div class="bg-neutral-50 border border-orange-200/90 hover:border-orange-400 transition-all p-4 rounded-2xl flex gap-4 items-start shadow-sm">
        ${imgHtml}
        <div class="flex-1 space-y-3 min-w-0">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
                #${index + 1}
              </span>
              <span class="bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded-lg border border-red-200 font-semibold">
                🏷️ ${categoryTag}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="moveOrder('${item.id}', ${index - 1})" ${index === 0 ? 'disabled class="opacity-30 cursor-not-allowed"' : ''} class="bg-white hover:bg-neutral-200 text-neutral-700 text-xs px-2.5 py-1 rounded-lg border border-neutral-300">▲</button>
              <button onclick="moveOrder('${item.id}', ${index + 1})" ${index === currentSyutingItems.length - 1 ? 'disabled class="opacity-30 cursor-not-allowed"' : ''} class="bg-white hover:bg-neutral-200 text-neutral-700 text-xs px-2.5 py-1 rounded-lg border border-neutral-300">▼</button>
              <button onclick="toggleStatus('${item.id}', 'bank')" class="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-lg ml-1 font-semibold">Kembalikan</button>
            </div>
          </div>
          
          <div>
            <p id="caption-${item.id}" class="text-sm font-medium text-neutral-900 leading-relaxed line-clamp-4 transition-all">
              ${escapeHtml(item.caption)}
            </p>
            ${seeMoreBtn}
          </div>
          
          <div class="flex justify-between items-center text-xs pt-2 border-t border-neutral-200">
            <a href="${item.url}" target="_blank" class="text-orange-600 hover:text-orange-700 font-bold text-sm">Buka TikTok ↗</a>
            <div class="space-x-3 text-sm">
              <button onclick="openEditModal('${item.id}', \`${escapeModalText(item.caption)}\`, \`${escapeModalText(categoryTag)}\`)" class="text-neutral-600 hover:text-black font-semibold">Edit Note</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  renderBankList();
}

// 5. RENDER BANK VIDEO
function renderBankList() {
  const rawCategories = currentBankItems.map(i => i.category || "Lainnya");
  const uniqueCategories = Array.from(new Set(rawCategories)).filter(Boolean);
  const categoriesInBank = ["Semua", ...uniqueCategories];

  if (!categoriesInBank.includes(selectedCategory)) {
    selectedCategory = "Semua";
  }

  categoryTabs.innerHTML = categoriesInBank.map(cat => {
    const isActive = cat === selectedCategory;
    const activeClass = isActive 
      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold shadow-md shadow-orange-500/20" 
      : "bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200";

    const count = cat === "Semua" 
      ? currentBankItems.length 
      : currentBankItems.filter(i => (i.category || "Lainnya") === cat).length;

    return `
      <button 
        onclick="filterCategory('${cat}')" 
        class="px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${activeClass}"
      >
        ${cat} <span class="${isActive ? 'text-white/90' : 'text-neutral-400'} font-normal ml-0.5">(${count})</span>
      </button>
    `;
  }).join("");

  const filteredBank = selectedCategory === "Semua" 
    ? currentBankItems 
    : currentBankItems.filter(i => (i.category || "Lainnya") === selectedCategory);

  if (filteredBank.length === 0) {
    listBank.innerHTML = `<p class="text-neutral-400 text-sm text-center py-12">Tidak ada video di kategori <strong>${selectedCategory}</strong></p>`;
    return;
  }

  listBank.innerHTML = filteredBank.map((item) => {
    const imgHtml = item.thumbnail 
      ? `<img src="${item.thumbnail}" alt="Thumbnail" class="w-32 sm:w-36 h-48 sm:h-52 object-cover rounded-2xl flex-shrink-0 bg-neutral-100 border border-neutral-200 shadow-sm" />`
      : `<div class="w-32 sm:w-36 h-48 sm:h-52 bg-neutral-100 rounded-2xl flex items-center justify-center text-xs text-neutral-400 flex-shrink-0 border border-neutral-200">Tidak Ada Gambar</div>`;

    const isLongText = item.caption && item.caption.length > 120;
    const seeMoreBtn = isLongText 
      ? `<button id="btn-caption-${item.id}" onclick="toggleCaption('${item.id}')" class="text-xs text-orange-600 hover:text-orange-700 font-semibold mt-1 inline-block focus:outline-none">Lihat Selengkapnya</button>` 
      : '';

    const categoryTag = item.category || "Lainnya";

    return `
      <div class="bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-all p-4 rounded-2xl flex gap-4 items-start shadow-sm">
        ${imgHtml}
        <div class="flex-1 space-y-3 min-w-0">
          <div class="flex items-center justify-between">
            <span class="bg-neutral-200 text-neutral-800 text-xs px-2.5 py-1 rounded-lg border border-neutral-300 font-semibold">
              🏷️ ${categoryTag}
            </span>
          </div>

          <div>
            <p id="caption-${item.id}" class="text-sm text-neutral-800 leading-relaxed line-clamp-4 transition-all font-medium">
              ${escapeHtml(item.caption)}
            </p>
            ${seeMoreBtn}
          </div>

          <div class="flex justify-between items-center text-xs pt-2 border-t border-neutral-200">
            <a href="${item.url}" target="_blank" class="text-neutral-600 hover:text-black font-semibold text-sm">Buka TikTok ↗</a>
            <div class="space-x-3 text-sm flex items-center">
              <button onclick="toggleStatus('${item.id}', 'syuting')" class="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all">+ Pilih Syuting</button>
              <button onclick="openEditModal('${item.id}', \`${escapeModalText(item.caption)}\`, \`${escapeModalText(categoryTag)}\`)" class="text-neutral-600 hover:text-black font-medium">Edit</button>
              <button onclick="deleteItem('${item.id}')" class="text-red-600 hover:text-red-700 font-medium">Hapus</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// 6. GANTI KATEGORI
window.filterCategory = (category) => {
  selectedCategory = category;
  renderBankList();
};

// 7. FITUR COPY POIN VIDEO SYUTING
btnCopySyuting.addEventListener("click", async () => {
  if (!currentSyutingItems || currentSyutingItems.length === 0) {
    return showCustomAlert("Daftar Syuting Kosong", "Belum ada video di daftar Siap Syuting untuk disalin.");
  }

  const formattedText = currentSyutingItems
    .map((item, index) => `${index + 1}. ${item.caption}`)
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(formattedText);
    
    hasCopiedSyuting = true;
    updateSelesaiBtnState();

    const originalText = btnCopySyuting.innerHTML;
    btnCopySyuting.innerHTML = "✅ Berhasil Disalin!";
    btnCopySyuting.classList.add("bg-emerald-50", "text-emerald-600", "border-emerald-300");

    setTimeout(() => {
      btnCopySyuting.innerHTML = originalText;
      btnCopySyuting.classList.remove("bg-emerald-50", "text-emerald-600", "border-emerald-300");
    }, 2000);
  } catch (error) {
    console.error("Gagal menyalin teks:", error);
    showCustomAlert("Gagal Menyalin", "Gagal menyalin ke clipboard.");
  }
});

// 8. FITUR SELESAI SYUTING
btnSelesaiSyuting.addEventListener("click", () => {
  if (!hasCopiedSyuting) return;
  confirmModal.classList.remove("hidden");
});

btnCancelConfirm.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
});

btnActionConfirm.addEventListener("click", async () => {
  confirmModal.classList.add("hidden");
  
  try {
    const historyData = {
      channel: activeChannel,
      completedAt: serverTimestamp(),
      count: currentSyutingItems.length,
      videos: currentSyutingItems.map(item => ({
        url: item.url,
        caption: item.caption,
        thumbnail: item.thumbnail || "",
        category: item.category || "Lainnya"
      }))
    };

    await addDoc(historyRef, historyData);

    await Promise.all(currentSyutingItems.map(item => deleteDoc(doc(db, "videos", item.id))));
    
    hasCopiedSyuting = false;
    updateSelesaiBtnState();

    showCustomAlert("Syuting Selesai! 🎉", `Semua video siap syuting untuk ${activeChannel === "adinoki" ? "YT Adinoki" : "YT Adinoki Reaction"} telah dipindahkan ke Riwayat.`);
  } catch (error) {
    console.error("Gagal memindahkan ke riwayat:", error);
    showCustomAlert("Gagal Menyimpan", "Terjadi kesalahan saat memindahkan ke riwayat syuting.");
  }
});

// 9. FITUR POPUP RIWAYAT SYUTING
btnOpenHistory.addEventListener("click", () => {
  historyModal.classList.remove("hidden");
});

btnCloseHistoryModal.addEventListener("click", () => {
  historyModal.classList.add("hidden");
});

const qHistory = query(historyRef, orderBy("completedAt", "desc"));
onSnapshot(qHistory, (snapshot) => {
  allRawHistory = [];
  snapshot.forEach((doc) => {
    allRawHistory.push({ id: doc.id, ...doc.data() });
  });

  renderHistory(allRawHistory);
});

function renderHistory(historyDocs) {
  const filteredHistory = historyDocs.filter(h => 
    h.channel === activeChannel || (!h.channel && activeChannel === "adinoki")
  );

  if (!filteredHistory || filteredHistory.length === 0) {
    historyList.innerHTML = `<p class="text-neutral-400 text-center py-16 font-medium">Belum ada riwayat syuting untuk channel ini.</p>`;
    return;
  }

  historyList.innerHTML = filteredHistory.map((session) => {
    let dateStr = "Waktu Tidak Diketahui";
    if (session.completedAt && session.completedAt.toDate) {
      const d = session.completedAt.toDate();
      dateStr = d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }) + " WIB";
    }

    const videosHtml = (session.videos || []).map((v, vIdx) => `
      <div class="bg-white border border-neutral-200 p-3 rounded-2xl flex gap-3 items-center shadow-sm">
        ${v.thumbnail ? `<img src="${v.thumbnail}" class="w-14 h-18 object-cover rounded-xl flex-shrink-0 bg-neutral-100 border border-neutral-200" />` : ''}
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-orange-600">#${vIdx + 1}</span>
            <span class="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md border border-neutral-200 font-semibold">🏷️ ${v.category || "Lainnya"}</span>
          </div>
          <p class="text-xs text-neutral-800 line-clamp-2 font-medium">${escapeHtml(v.caption)}</p>
          <a href="${v.url}" target="_blank" class="text-xs text-orange-600 hover:underline inline-block font-bold">Buka TikTok ↗</a>
        </div>
      </div>
    `).join("");

    return `
      <div class="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl space-y-4 shadow-sm">
        <div class="flex justify-between items-center border-b border-neutral-200 pb-3 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
              Sesi Syuting Selesai
            </span>
            <span class="text-sm font-bold text-neutral-800">📅 ${dateStr}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-neutral-500 font-semibold">Total: ${session.count || session.videos?.length || 0} Video</span>
            <button onclick="deleteHistorySession('${session.id}')" class="text-xs text-red-600 hover:text-red-700 font-bold">Hapus Sesi</button>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-3">
          ${videosHtml}
        </div>
      </div>
    `;
  }).join("");
}

// FITUR HAPUS SESI HISTORY
window.deleteHistorySession = async (historyId) => {
  if (confirm("Yakin ingin menghapus sesi riwayat ini?")) {
    try {
      await deleteDoc(doc(db, "history", historyId));
    } catch (e) {
      console.error("Gagal menghapus riwayat:", e);
      showCustomAlert("Gagal Hapus", "Gagal menghapus sesi riwayat dari database.");
    }
  }
};

// 10. FITUR TOGGLE CAPTION
window.toggleCaption = (id) => {
  const captionEl = document.getElementById(`caption-${id}`);
  const btnEl = document.getElementById(`btn-caption-${id}`);
  
  if (!captionEl || !btnEl) return;

  if (captionEl.classList.contains("line-clamp-4")) {
    captionEl.classList.remove("line-clamp-4");
    btnEl.innerText = "Sembunyikan";
  } else {
    captionEl.classList.add("line-clamp-4");
    btnEl.innerText = "Lihat Selengkapnya";
  }
};

// 11. MODAL EDIT CONTROL
window.openEditModal = (id, currentCaption, currentCategory) => {
  activeEditId = id;
  modalCaptionInput.value = currentCaption;
  modalCategoryInput.value = currentCategory || "Lainnya";
  editModal.classList.remove("hidden");
};

const closeModal = () => {
  editModal.classList.add("hidden");
  activeEditId = null;
};

btnCancelEdit.addEventListener("click", closeModal);
btnCloseModalX.addEventListener("click", closeModal);

btnSaveEdit.addEventListener("click", async () => {
  if (!activeEditId) return;
  const newCaption = modalCaptionInput.value.trim();
  const newCategory = modalCategoryInput.value.trim() || "Lainnya";

  try {
    const docRef = doc(db, "videos", activeEditId);
    await updateDoc(docRef, { 
      caption: newCaption,
      category: newCategory
    });
    closeModal();
  } catch (error) {
    console.error("Gagal mengupdate video:", error);
    showCustomAlert("Gagal Simpan", "Gagal menyimpan perubahan ke Firestore.");
  }
});

// 12. ACTION FUNCTIONS
window.toggleStatus = async (id, newStatus) => {
  const docRef = doc(db, "videos", id);

  if (newStatus === "syuting") {
    if (currentSyutingItems.length >= 10) {
      showCustomAlert(
        "Siap Syuting Penuh!", 
        "Daftar Siap Syuting sudah mencapai batas maksimal 10 video. Kembalikan beberapa video ke Bank Video terlebih dahulu."
      );
      return;
    }

    const maxOrder = currentSyutingItems.length > 0 
      ? Math.max(...currentSyutingItems.map(item => item.order ?? 0)) 
      : 0;

    await updateDoc(docRef, { 
      status: "syuting", 
      order: maxOrder + 1 
    });
  } else {
    await updateDoc(docRef, { status: newStatus });
  }
};

window.deleteItem = async (id) => {
  if (confirm("Yakin ingin menghapus link ini?")) {
    await deleteDoc(doc(db, "videos", id));
  }
};

window.moveOrder = async (id, newIndex) => {
  const docRef = doc(db, "videos", id);
  await updateDoc(docRef, { order: newIndex });
};

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeModalText(str) {
  if (!str) return "";
  return str.replace(/`/g, "\\`").replace(/\$/g, "\\$");
}