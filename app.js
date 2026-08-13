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
import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm";

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

// State Channel
let activeChannel = "adinoki"; 

// Elemen Tab Channel
const tabAdinoki = document.getElementById("tabAdinoki");
const tabReaction = document.getElementById("tabReaction");
const activeChannelBadge = document.getElementById("activeChannelBadge");
const historySubTitle = document.getElementById("historySubTitle");

// Elemen DOM
const tiktokUrlInput = document.getElementById("tiktokUrl");
const btnPaste = document.getElementById("btnPaste");
const tiktokDurationInput = document.getElementById("tiktokDuration");
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
const btnScrollLeft = document.getElementById("btnScrollLeft");
const btnScrollRight = document.getElementById("btnScrollRight");
const totalYtDuration = document.getElementById("totalYtDuration");
const badgeTikTokSum = document.getElementById("badgeTikTokSum");

// FITUR TEKAN ENTER UNTUK SIMPAN otomatis
[tiktokUrlInput, tiktokDurationInput, tiktokCategoryInput, tiktokCaptionInput].forEach(input => {
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Mencegah form submit/refresh halaman
        btnSave.click();     // Memicu tombol Simpan ke Bank Video
      }
    });
  }
});

// Event Listener Tombol Scroll Kategori (Panah Kiri / Kanan)
if (btnScrollLeft && btnScrollRight && categoryTabs) {
  btnScrollLeft.addEventListener("click", () => {
    categoryTabs.scrollBy({ left: -220, behavior: "smooth" });
  });
  btnScrollRight.addEventListener("click", () => {
    categoryTabs.scrollBy({ left: 220, behavior: "smooth" });
  });
}

// Modal Elements
const editModal = document.getElementById("editModal");
const modalCaptionInput = document.getElementById("modalCaptionInput");
const modalCategoryInput = document.getElementById("modalCategoryInput");
const modalDurationInput = document.getElementById("modalDurationInput");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const btnCloseModalX = document.getElementById("btnCloseModalX");
const btnSaveEdit = document.getElementById("btnSaveEdit");

const customAlertModal = document.getElementById("customAlertModal");
const customAlertTitle = document.getElementById("customAlertTitle");
const customAlertMessage = document.getElementById("customAlertMessage");
const btnCloseCustomAlert = document.getElementById("btnCloseCustomAlert");

const confirmModal = document.getElementById("confirmModal");
const btnCancelConfirm = document.getElementById("btnCancelConfirm");
const btnActionConfirm = document.getElementById("btnActionConfirm");

const historyModal = document.getElementById("historyModal");
const btnOpenHistory = document.getElementById("btnOpenHistory");
const btnCloseHistoryModal = document.getElementById("btnCloseHistoryModal");
const historyList = document.getElementById("historyList");

let allRawVideos = [];
let allRawHistory = [];
let activeEditId = null;
let currentThumbnail = "";
let currentAuthor = ""; 
let currentSyutingItems = [];
let currentBankItems = [];
let selectedCategory = "Semua";
let hasCopiedSyuting = false;

function extractUsernameFromUrl(url) {
  if (!url) return "Akun TikTok";
  const match = url.match(/@([a-zA-Z0-9_\.]+)/);
  return match ? `@${match[1]}` : "Akun TikTok";
}

// DRAG & DROP
Sortable.create(listSyuting, {
  animation: 200,
  handle: ".drag-handle",
  ghostClass: "opacity-40",
  onEnd: async () => {
    const cardElements = listSyuting.querySelectorAll("[data-id]");
    const updatePromises = Array.from(cardElements).map((el, newIndex) => {
      const docId = el.getAttribute("data-id");
      return updateDoc(doc(db, "videos", docId), { order: newIndex });
    });
    try {
      await Promise.all(updatePromises);
    } catch (err) {
      console.error("Gagal memperbarui urutan:", err);
      showCustomAlert("Gagal Urutkan", "Terjadi kesalahan saat menyusun ulang urutan syuting.");
    }
  }
});

function parseDurationToSeconds(val) {
  if (!val) return 0;
  const str = String(val).trim().replace(',', '.');
  if (str.includes('.') || str.includes(':')) {
    const parts = str.split(/[\.:]/);
    const minutes = parseInt(parts[0], 10) || 0;
    let secStr = parts[1] || "0";
    if (secStr.length === 1) secStr = secStr + "0";
    const seconds = parseInt(secStr, 10) || 0;
    return (minutes * 60) + seconds;
  }
  return parseInt(str, 10) || 0;
}

function formatDurationText(totalSec) {
  if (!totalSec || totalSec <= 0) return "0s";
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function secondsToFormatInput(totalSec) {
  if (!totalSec || totalSec <= 0) return "";
  if (totalSec < 60) return String(totalSec);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const secsFormatted = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mins}.${secsFormatted}`;
}

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

tabAdinoki.addEventListener("click", () => switchChannel("adinoki"));
tabReaction.addEventListener("click", () => switchChannel("reaction"));

function switchChannel(channel) {
  activeChannel = channel;
  hasCopiedSyuting = false;
  selectedCategory = "Semua";

  if (activeChannel === "adinoki") {
    tabAdinoki.className = "px-5 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 border-orange-600 text-orange-600 bg-orange-50/70 rounded-t-xl flex items-center gap-2 transition-all";
    tabReaction.className = "px-5 py-2.5 text-xs sm:text-sm font-bold text-neutral-500 hover:text-neutral-800 rounded-t-xl flex items-center gap-2 transition-all";
    activeChannelBadge.innerText = "TARGET: YT ADINOKI";
    historySubTitle.innerText = "Menampilkan riwayat untuk YT Adinoki";
  } else {
    tabReaction.className = "px-5 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 border-orange-600 text-orange-600 bg-orange-50/70 rounded-t-xl flex items-center gap-2 transition-all";
    tabAdinoki.className = "px-5 py-2.5 text-xs sm:text-sm font-bold text-neutral-500 hover:text-neutral-800 rounded-t-xl flex items-center gap-2 transition-all";
    activeChannelBadge.innerText = "TARGET: YT ADINOKI REACTION";
    historySubTitle.innerText = "Menampilkan riwayat untuk YT Adinoki Reaction";
  }

  renderApp(allRawVideos);
  renderHistory(allRawHistory);
}

function updateSelesaiBtnState() {
  if (hasCopiedSyuting && currentSyutingItems.length > 0) {
    btnSelesaiSyuting.disabled = false;
    btnSelesaiSyuting.className = "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border border-emerald-500/40 text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 opacity-100";
  } else {
    btnSelesaiSyuting.disabled = true;
    btnSelesaiSyuting.className = "bg-neutral-100 text-neutral-400 border border-neutral-200 text-xs sm:text-sm px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1 opacity-60 cursor-not-allowed";
  }
}

if (btnPaste) {
  btnPaste.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        return showCustomAlert("Fitur Tidak Didukung", "Browser tidak mendukung akses clipboard otomatis. Silakan tempel manual.");
      }
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        tiktokUrlInput.value = text.trim();
      } else {
        showCustomAlert("Clipboard Kosong", "Tidak ada teks yang disalin di clipboard Anda.");
      }
    } catch (err) {
      console.error("Gagal membaca clipboard:", err);
      showCustomAlert("Izin Ditolak", "Gagal mengakses clipboard. Pastikan Anda memberikan izin akses clipboard di browser.");
    }
  });
}

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
    currentAuthor = data.author_name ? `@${data.author_name}` : extractUsernameFromUrl(url);
  } catch (error) {
    currentAuthor = extractUsernameFromUrl(url);
    showCustomAlert("Gagal Ambil Data", "Gagal mengambil data otomatis. Kamu tetap bisa mengetik caption manual di bawah.");
  } finally {
    btnFetch.innerText = "Ambil Caption & Thumbnail";
    btnFetch.disabled = false;
  }
});

btnSave.addEventListener("click", async () => {
  const url = tiktokUrlInput.value.trim();
  const rawDuration = tiktokDurationInput.value.trim();
  const parsedSeconds = parseDurationToSeconds(rawDuration);
  const caption = tiktokCaptionInput.value.trim();
  const manualCategory = tiktokCategoryInput.value.trim() || "Lainnya";

  if (!url) return showCustomAlert("Input Kosong!", "Link TikTok tidak boleh kosong!");
  if (!rawDuration || parsedSeconds <= 0) {
    return showCustomAlert("Durasi Wajib!", "Masukkan durasi yang valid! Contoh: 45 (45 detik) atau 1.25 (1 menit 25 detik)");
  }

  let thumbnailToSave = currentThumbnail;
  let authorToSave = currentAuthor || extractUsernameFromUrl(url);

  if (!thumbnailToSave) {
    try {
      const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        thumbnailToSave = data.thumbnail_url || "";
        if (data.author_name) authorToSave = `@${data.author_name}`;
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
      duration: parsedSeconds,
      caption: finalCaption,
      thumbnail: thumbnailToSave,
      author: authorToSave,
      category: manualCategory,
      status: "bank",
      order: 999,
      createdAt: serverTimestamp()
    });

    tiktokUrlInput.value = "";
    tiktokDurationInput.value = "";
    tiktokCaptionInput.value = "";
    tiktokCategoryInput.value = "";
    currentThumbnail = "";
    currentAuthor = "";
  } catch (error) {
    console.error("Gagal menyimpan data:", error);
    showCustomAlert("Gagal Menyimpan", "Terjadi kesalahan saat menyimpan data ke Firebase.");
  }
});

const q = query(videosRef, orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  allRawVideos = [];
  snapshot.forEach((doc) => {
    allRawVideos.push({ id: doc.id, ...doc.data() });
  });

  renderApp(allRawVideos);
});

function calculateYtEditDuration(items) {
  if (!items || items.length === 0) {
    return { formatted: "0 Menit 0 Detik", tiktokSumFormatted: "0s" };
  }

  const fixedElementsSec = 45 + 6 + 45 + 75 + 20;

  let tiktokSumSec = 0;
  items.forEach(item => {
    const d = parseInt(item.duration) || 0;
    tiktokSumSec += d;
  });

  const totalVideoReactionSec = tiktokSumSec + (items.length * 60);
  const grandTotalSec = fixedElementsSec + totalVideoReactionSec;

  const minutes = Math.floor(grandTotalSec / 60);
  const seconds = grandTotalSec % 60;

  return {
    formatted: `${minutes} Menit ${seconds} Detik`,
    tiktokSumFormatted: formatDurationText(tiktokSumSec)
  };
}

// RENDER UTAMA
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

  const ytCalc = calculateYtEditDuration(currentSyutingItems);
  totalYtDuration.innerText = ytCalc.formatted;
  badgeTikTokSum.innerText = `TOTAL BAHAN: ${ytCalc.tiktokSumFormatted.toUpperCase()}`;

  if (currentSyutingItems.length === 0) {
    hasCopiedSyuting = false;
  }
  updateSelesaiBtnState();

  // RENDER SIAP SYUTING
  listSyuting.innerHTML = currentSyutingItems.map((item, index) => {
    const imgHtml = item.thumbnail 
      ? `<img src="${item.thumbnail}" alt="Thumbnail" class="w-32 sm:w-36 md:w-40 h-40 sm:h-44 md:h-48 object-cover rounded-xl flex-shrink-0 bg-neutral-100 border border-neutral-200 shadow-2xs" />`
      : `<div class="w-32 sm:w-36 md:w-40 h-40 sm:h-44 md:h-48 bg-neutral-100 rounded-xl flex items-center justify-center text-xs text-neutral-400 flex-shrink-0 border border-neutral-200 text-center p-2">Tidak Ada Gambar</div>`;

    const isLongText = item.caption && item.caption.length > 120;
    const seeMoreBtn = isLongText 
      ? `<button id="btn-caption-${item.id}" onclick="toggleCaption('${item.id}')" class="text-xs text-orange-600 hover:text-orange-700 font-bold mt-1 inline-block focus:outline-none">Lihat Selengkapnya</button>` 
      : '';

    const categoryTag = item.category || "Lainnya";
    const authorTag = item.author || extractUsernameFromUrl(item.url);
    const itemDurationSec = item.duration || 0;
    const itemDurationFormatted = formatDurationText(itemDurationSec);

    return `
      <div data-id="${item.id}" class="bg-white border border-neutral-200/90 hover:border-orange-300 transition-all p-4 rounded-2xl flex flex-row gap-4 items-start shadow-2xs w-full min-w-0 box-border">
        ${imgHtml}
        <div class="flex-1 space-y-2.5 min-w-0 flex flex-col justify-between self-stretch">
          
          <div class="space-y-2 w-full min-w-0">
            <div class="flex flex-wrap items-center justify-between gap-1.5 w-full min-w-0">
              <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                <div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-400 hover:text-orange-600 px-1.5 py-0.5 rounded border border-neutral-200 bg-white text-xs font-bold transition-colors flex items-center gap-1" title="Geser urutan">
                  <span>⋮⋮</span>
                  <span class="text-[10px] text-neutral-500 font-normal">Geser</span>
                </div>
                <span class="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-2xs">
                  #${index + 1}
                </span>
                <span class="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md border border-blue-200/80 font-bold max-w-[100px] sm:max-w-[140px] truncate" title="${escapeHtml(authorTag)}">
                  👤 ${escapeHtml(authorTag)}
                </span>
                <span class="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-md border border-red-200 font-semibold max-w-[80px] sm:max-w-[110px] truncate">
                  🏷️ ${escapeHtml(categoryTag)}
                </span>
                <span class="bg-neutral-900 text-white text-xs px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
                  ⏱️ ${itemDurationFormatted}
                </span>
              </div>

              <button onclick="toggleStatus('${item.id}', 'bank')" class="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-md font-bold transition-all whitespace-nowrap ml-auto">
                Kembalikan
              </button>
            </div>
            
            <p id="caption-${item.id}" class="text-xs sm:text-sm font-bold text-neutral-800 leading-snug sm:leading-relaxed line-clamp-3 sm:line-clamp-4 break-words">
              ${escapeHtml(item.caption)}
            </p>
            ${seeMoreBtn}
          </div>
          
          <div class="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-neutral-100 w-full min-w-0 mt-auto">
            <a href="${item.url}" target="_blank" class="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1">Buka TikTok ↗</a>
            <div class="space-x-2">
              <button onclick="openEditModal('${item.id}', \`${escapeModalText(item.caption)}\`, \`${escapeModalText(categoryTag)}\`, ${itemDurationSec})" class="text-neutral-500 hover:text-neutral-900 font-semibold">Edit</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  renderBankList();
}

// RENDER BANK VIDEO
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
      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white font-black shadow-xs" 
      : "bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 font-medium";

    const count = cat === "Semua" 
      ? currentBankItems.length 
      : currentBankItems.filter(i => (i.category || "Lainnya") === cat).length;

    return `
      <button 
        onclick="filterCategory('${cat}')" 
        class="px-3.5 py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all ${activeClass}"
      >
        ${cat} <span class="${isActive ? 'text-white/90' : 'text-neutral-400'} font-normal ml-0.5">(${count})</span>
      </button>
    `;
  }).join("");

  const filteredBank = selectedCategory === "Semua" 
    ? currentBankItems 
    : currentBankItems.filter(i => (i.category || "Lainnya") === selectedCategory);

  if (filteredBank.length === 0) {
    listBank.innerHTML = `<p class="text-neutral-400 text-sm text-center py-10">Tidak ada video di kategori <strong>${selectedCategory}</strong></p>`;
    return;
  }

  listBank.innerHTML = filteredBank.map((item) => {
    const imgHtml = item.thumbnail 
      ? `<img src="${item.thumbnail}" alt="Thumbnail" class="w-32 sm:w-36 md:w-40 h-40 sm:h-44 md:h-48 object-cover rounded-xl flex-shrink-0 bg-neutral-100 border border-neutral-200 shadow-2xs" />`
      : `<div class="w-32 sm:w-36 md:w-40 h-40 sm:h-44 md:h-48 bg-neutral-100 rounded-xl flex items-center justify-center text-xs text-neutral-400 flex-shrink-0 border border-neutral-200 text-center p-2">Tidak Ada Gambar</div>`;

    const isLongText = item.caption && item.caption.length > 120;
    const seeMoreBtn = isLongText 
      ? `<button id="btn-caption-${item.id}" onclick="toggleCaption('${item.id}')" class="text-xs text-orange-600 hover:text-orange-700 font-bold mt-1 inline-block focus:outline-none">Lihat Selengkapnya</button>` 
      : '';

    const categoryTag = item.category || "Lainnya";
    const authorTag = item.author || extractUsernameFromUrl(item.url);
    const itemDurationSec = item.duration || 0;
    const itemDurationFormatted = formatDurationText(itemDurationSec);

    return `
      <div class="bg-white border border-neutral-200/90 hover:border-neutral-300 transition-all p-4 rounded-2xl flex flex-row gap-4 items-start shadow-2xs w-full min-w-0 box-border">
        ${imgHtml}
        <div class="flex-1 space-y-2.5 min-w-0 flex flex-col justify-between self-stretch">
          
          <div class="space-y-2 w-full min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 w-full min-w-0">
              <span class="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md border border-blue-200/80 font-bold max-w-[100px] sm:max-w-[140px] truncate" title="${escapeHtml(authorTag)}">
                👤 ${escapeHtml(authorTag)}
              </span>
              <span class="bg-neutral-100 text-neutral-700 text-xs px-2 py-0.5 rounded-md border border-neutral-200 font-semibold max-w-[80px] sm:max-w-[110px] truncate">
                🏷️ ${escapeHtml(categoryTag)}
              </span>
              <span class="bg-neutral-900 text-white text-xs px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
                ⏱️ ${itemDurationFormatted}
              </span>
            </div>

            <p id="caption-${item.id}" class="text-xs sm:text-sm font-bold text-neutral-800 leading-snug sm:leading-relaxed line-clamp-3 sm:line-clamp-4 break-words">
              ${escapeHtml(item.caption)}
            </p>
            ${seeMoreBtn}
          </div>

          <div class="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-neutral-100 w-full min-w-0 mt-auto flex-wrap gap-2">
            <a href="${item.url}" target="_blank" class="text-neutral-700 hover:text-black font-bold">Buka TikTok ↗</a>
            <div class="space-x-2 flex items-center ml-auto">
              <button onclick="toggleStatus('${item.id}', 'syuting')" class="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all">+ Pilih Syuting</button>
              <button onclick="openEditModal('${item.id}', \`${escapeModalText(item.caption)}\`, \`${escapeModalText(categoryTag)}\`, ${itemDurationSec})" class="text-neutral-500 hover:text-neutral-900 font-semibold">Edit</button>
              <button onclick="deleteItem('${item.id}')" class="text-red-600 hover:text-red-700 font-semibold">Hapus</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

window.filterCategory = (category) => {
  selectedCategory = category;
  renderBankList();
};

btnCopySyuting.addEventListener("click", async () => {
  if (!currentSyutingItems || currentSyutingItems.length === 0) {
    return showCustomAlert("Daftar Syuting Kosong", "Belum ada video di daftar Siap Syuting untuk disalin.");
  }

  const formattedText = currentSyutingItems
    .map((item, index) => {
      const authorStr = item.author || extractUsernameFromUrl(item.url);
      return `${index + 1}. [${authorStr}] [${formatDurationText(item.duration || 0)}] ${item.caption}`;
    })
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(formattedText);
    hasCopiedSyuting = true;
    updateSelesaiBtnState();

    const originalText = btnCopySyuting.innerHTML;
    btnCopySyuting.innerHTML = "✅ Disalin!";
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
    const ytCalc = calculateYtEditDuration(currentSyutingItems);
    const historyData = {
      channel: activeChannel,
      completedAt: serverTimestamp(),
      count: currentSyutingItems.length,
      estimatedYtDuration: ytCalc.formatted,
      videos: currentSyutingItems.map(item => ({
        url: item.url,
        duration: item.duration || 0,
        caption: item.caption,
        author: item.author || extractUsernameFromUrl(item.url),
        thumbnail: item.thumbnail || "",
        category: item.category || "Lainnya"
      }))
    };

    await addDoc(historyRef, historyData);
    await Promise.all(currentSyutingItems.map(item => deleteDoc(doc(db, "videos", item.id))));
    hasCopiedSyuting = false;
    updateSelesaiBtnState();

    showCustomAlert("Syuting Selesai! 🎉", `Semua video siap syuting telah dipindahkan ke Riwayat. Estimasi durasi hasil edit: ${ytCalc.formatted}.`);
  } catch (error) {
    console.error("Gagal memindahkan ke riwayat:", error);
    showCustomAlert("Gagal Menyimpan", "Terjadi kesalahan saat memindahkan ke riwayat syuting.");
  }
});

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
      <div class="bg-white border border-neutral-200 p-3.5 rounded-2xl flex gap-3 items-center shadow-2xs w-full min-w-0">
        ${v.thumbnail ? `<img src="${v.thumbnail}" class="w-14 h-20 object-cover rounded-xl flex-shrink-0 bg-neutral-100 border border-neutral-200" />` : ''}
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs font-bold text-orange-600">#${vIdx + 1}</span>
            <span class="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold max-w-[100px] truncate">👤 ${v.author || "Akun"}</span>
            <span class="text-xs bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded border border-neutral-200 font-semibold truncate max-w-[80px]">🏷️ ${v.category || "Lainnya"}</span>
            <span class="text-xs bg-neutral-900 text-white px-1.5 py-0.5 rounded font-bold">⏱️ ${formatDurationText(v.duration || 0)}</span>
          </div>
          <p class="text-xs sm:text-sm text-neutral-800 line-clamp-2 font-bold break-words">${escapeHtml(v.caption)}</p>
          <a href="${v.url}" target="_blank" class="text-xs text-orange-600 hover:underline inline-block font-bold">Buka TikTok ↗</a>
        </div>
      </div>
    `).join("");

    return `
      <div class="bg-neutral-50 border border-neutral-200 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-2xs w-full min-w-0">
        <div class="flex justify-between items-center border-b border-neutral-200 pb-3 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
              Sesi Syuting Selesai
            </span>
            <span class="text-xs sm:text-sm font-bold text-neutral-800">📅 ${dateStr}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-orange-600 font-bold bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">Est. YT: ${session.estimatedYtDuration || '-'}</span>
            <button onclick="deleteHistorySession('${session.id}')" class="text-xs text-red-600 hover:text-red-700 font-bold ml-2">Hapus</button>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-3">
          ${videosHtml}
        </div>
      </div>
    `;
  }).join("");
}

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

window.toggleCaption = (id) => {
  const captionEl = document.getElementById(`caption-${id}`);
  const btnEl = document.getElementById(`btn-caption-${id}`);
  if (!captionEl || !btnEl) return;

  if (captionEl.classList.contains("line-clamp-3") || captionEl.classList.contains("line-clamp-4")) {
    captionEl.classList.remove("line-clamp-3", "line-clamp-4");
    btnEl.innerText = "Sembunyikan";
  } else {
    captionEl.classList.add("line-clamp-3");
    btnEl.innerText = "Lihat Selengkapnya";
  }
};

window.openEditModal = (id, currentCaption, currentCategory, currentDurationSec) => {
  activeEditId = id;
  modalCaptionInput.value = currentCaption;
  modalCategoryInput.value = currentCategory || "Lainnya";
  modalDurationInput.value = secondsToFormatInput(currentDurationSec);
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
  const rawDuration = modalDurationInput.value.trim();
  const parsedSeconds = parseDurationToSeconds(rawDuration);

  if (!rawDuration || parsedSeconds <= 0) {
    return showCustomAlert("Durasi Wajib!", "Masukkan durasi yang valid! Contoh: 45 atau 1.25");
  }

  try {
    const docRef = doc(db, "videos", activeEditId);
    await updateDoc(docRef, { 
      caption: newCaption,
      category: newCategory,
      duration: parsedSeconds
    });
    closeModal();
  } catch (error) {
    console.error("Gagal mengupdate video:", error);
    showCustomAlert("Gagal Simpan", "Gagal menyimpan perubahan ke Firestore.");
  }
});

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

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeModalText(str) {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\n/g, "\\n");
}
