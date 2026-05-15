# 🎬 ClipForge — Tutorial Lengkap (Non-Teknis)

> **ClipForge** adalah aplikasi web untuk membuat video clip musik secara cepat.
> Upload lagu, upload beberapa video pendek, lalu ClipForge akan menggabungkan semuanya jadi satu video musik yang diedit otomatis sesuai beat!

---

## 📋 Yang Kamu Butuhkan

| Item | Keterangan |
|------|-----------|
| **Browser** | Google Chrome atau Microsoft Edge (versi terbaru) |
| **Komputer** | Laptop/PC (bukan HP — fitur render butuh resource besar) |
| **File Musik** | 1 file lagu (MP3, WAV, OGG, atau FLAC) — max 50MB |
| **File Video** | Beberapa video clip pendek (MP4, MOV, atau WEBM) — total max 500MB |

> 💡 **Tips:** Video pendek 5-10 detik hasilnya paling bagus. Bisa ambil dari AI video generator (Runway, Pika, dll), stock footage, atau rekaman sendiri.

---

## 🚀 Cara Menjalankan Aplikasi

### Langkah 1: Buka Terminal / Command Prompt

Di folder project ClipForge, ketik:

```
npm install
npm run dev
```

### Langkah 2: Buka di Browser

Setelah muncul tulisan seperti ini:

```
Local: http://localhost:5173/
```

Buka link tersebut di **Google Chrome** atau **Microsoft Edge**.

> ⚠️ **Penting:** Harus pakai `npm run dev` — jangan buka file HTML langsung. Ini karena aplikasi butuh setting khusus di server-nya supaya bisa render video.

---

## 🎵 Langkah 1: Upload Musik

1. Di panel kiri atas, cari bagian **"🎵 Audio"**
2. **Drag & drop** file lagu ke area yang bertuliskan "Drag & drop atau klik untuk upload"
3. Atau **klik** area tersebut untuk pilih file dari komputer
4. Tunggu sebentar — ClipForge akan menganalisis lagumu:
   - Mendeteksi **BPM** (kecepatan beat)
   - Menandai posisi **setiap beat** di lagu
   - Menampilkan **gelombang suara** (waveform)

Setelah selesai, kamu akan melihat:
- 🟢 Nama file lagu
- 🟢 Badge **BPM** (misalnya: "128 BPM")
- 🟢 Durasi lagu
- 🟢 Jumlah beat yang terdeteksi
- 🟢 Visualisasi waveform

---

## 🎬 Langkah 2: Upload Video Clips

1. Di panel kiri bawah, cari bagian **"🎬 Video Clips"**
2. **Drag & drop** beberapa file video sekaligus
3. Atau **klik** untuk pilih multiple file
4. Tunggu — setiap video akan diproses (diambil thumbnail-nya)

Setelah upload, kamu akan melihat daftar clip dengan:
- Thumbnail (gambar kecil dari video)
- Nama file
- Durasi

### Mengatur Urutan Clip

- **Drag** (tahan dan geser) clip ke atas/bawah untuk mengubah urutan
- Urutan ini menentukan clip mana yang muncul duluan di video final

### Mengatur Efek Per-Clip

Arahkan mouse ke clip, muncul pilihan efek:
- **None** — tampil normal
- **Boomerang** — video maju-mundur (kayak Boomerang Instagram)
- **Zoom In** — zoom pelan ke tengah
- **Zoom Out** — zoom keluar pelan

### Menghapus Clip

Arahkan mouse ke clip, klik **✕** di pojok kanan.

---

## ⚙️ Langkah 3: Atur Settings

Di panel kanan, ada beberapa pengaturan:

### Aspect Ratio (Bentuk Video)
| Pilihan | Cocok Untuk |
|---------|------------|
| **9:16 (Vertical)** | TikTok, Instagram Reels, YouTube Shorts |
| **16:9 (Landscape)** | YouTube biasa, presentasi |
| **1:1 (Square)** | Instagram feed, Facebook |

### Export Quality (Kualitas)
| Pilihan | Keterangan |
|---------|-----------|
| **720p** | Cepat render, file kecil |
| **1080p** | Kualitas bagus, paling recommended |
| **4K** | Super jernih tapi render LAMA (2-5 menit) |

### Transition (Perpindahan Antar Clip)
| Pilihan | Keterangan |
|---------|-----------|
| **Cut** | Langsung potong (paling cepat, clean) |
| **Fade** | Transisi lembut gelap-terang |
| **Glitch** | Efek glitch/rusak (keren buat musik elektronik) |

### Toggle Options
| Toggle | Fungsi |
|--------|--------|
| **Beat Sync Cut** | Video dipotong pas beat drop (RECOMMENDED ON) |
| **Randomize Order** | Acak urutan clip tiap render (biar beda-beda hasilnya) |
| **Visual EQ** | Tampilkan animasi equalizer di video |

### Visual EQ Settings (jika diaktifkan)
- **Style:** Bars (batang), Wave (gelombang), Circle (lingkaran)
- **Position:** Bottom, Top, atau Center
- **Color:** Pilih warna EQ pakai color picker

---

## 👁️ Langkah 4: Preview

Di bagian tengah ada area **Preview**:

1. Klik tombol **▶ Play** untuk melihat preview video + musik
2. Klik tombol **⏹ Reset** untuk kembali ke awal
3. Di **Timeline** (bagian bawah tengah):
   - Garis **kuning tipis** = posisi beat
   - Blok **warna-warni** = clip yang akan ditampilkan
   - Garis **merah** = posisi playhead (sedang diputar)
   - **Klik** di timeline untuk lompat ke posisi tertentu

> 💡 Preview ini hanya perkiraan — hasil render final akan lebih smooth karena diproses oleh FFmpeg.

---

## 🎬 Langkah 5: Render!

1. Pastikan sudah upload **musik** dan minimal **1 video clip**
2. Klik tombol **RENDER** (hijau besar di panel kanan bawah)
3. Tunggu proses rendering:
   - Progress bar akan berjalan dari 0% ke 100%
   - Estimasi waktu tergantung durasi lagu dan kualitas
   - **Jangan tutup browser** selama render!
4. Setelah selesai ✅, muncul tombol **DOWNLOAD MP4**
5. Klik untuk mendownload video jadi ke komputermu

### Jika Gagal
- Klik **COBA LAGI** untuk retry
- Atau **Reset** untuk mulai dari awal
- Coba kurangi kualitas (1080p → 720p) jika sering gagal

---

## 💡 Tips & Tricks

### Untuk Hasil Terbaik:
1. **Gunakan 4-8 video clip** dengan durasi 3-10 detik masing-masing
2. **Aktifkan Beat Sync Cut** — ini yang bikin video terasa "nge-beat"
3. **Pilih video yang kontras** — campurkan close-up, wide shot, dan abstrak
4. **Gunakan 9:16** untuk konten sosmed (TikTok/Reels/Shorts)
5. **Export 1080p** untuk balance kualitas vs kecepatan render

### Troubleshooting:

| Masalah | Solusi |
|---------|--------|
| Tombol RENDER abu-abu | Upload musik DAN video dulu |
| BPM terdeteksi salah | Itu normal — tidak mempengaruhi hasil secara signifikan |
| Render gagal | Coba kurangi kualitas, atau kurangi jumlah clip |
| Browser nge-lag | Kurangi total ukuran video (max 500MB combined) |
| Preview tidak muncul | Pastikan format video MP4/MOV/WEBM |
| Muncul warning SharedArrayBuffer | Pastikan jalankan via `npm run dev`, bukan buka file langsung |

---

## 📐 Alur Kerja Singkat

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Upload     │     │  Atur       │     │              │
│  Musik +    │ ──► │  Settings + │ ──► │   RENDER!    │
│  Video      │     │  Preview    │     │              │
└─────────────┘     └─────────────┘     └──────┬───────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │  Download    │
                                        │  MP4 File    │
                                        └──────────────┘
```

---

## ❓ FAQ

**Q: Apakah file saya di-upload ke server?**
> Tidak! Semua proses berjalan 100% di browser kamu. File tidak pernah meninggalkan komputermu.

**Q: Berapa lama proses render?**
> Tergantung durasi lagu dan kualitas:
> - 720p, lagu 3 menit ≈ 30-60 detik
> - 1080p, lagu 3 menit ≈ 1-3 menit
> - 4K, lagu 3 menit ≈ 3-5 menit

**Q: Bisa pakai di HP?**
> Secara teknis bisa, tapi TIDAK disarankan. Proses render sangat berat dan bisa bikin HP lag/crash.

**Q: Format apa yang didukung?**
> - Audio: MP3, WAV, OGG, FLAC
> - Video: MP4, MOV, WEBM

**Q: Bisa pakai video dari AI (Runway/Pika/Kling)?**
> Tentu! Malah itu use case utamanya. Download video dari AI generator, lalu upload ke ClipForge.

**Q: Hasil video bisa langsung upload ke TikTok/YouTube?**
> Ya! Output-nya MP4 standar yang kompatibel dengan semua platform.

---

## 🎉 Selamat!

Kamu sekarang sudah bisa membuat video clip musik sendiri tanpa perlu software editing yang rumit. Upload, klik render, download — selesai!

*Made with ❤️ by ClipForge*
