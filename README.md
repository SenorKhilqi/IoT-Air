# Web Dashboard Hidroponik

Web Dashboard Hidroponik adalah aplikasi monitoring real-time untuk membaca data pH dan sisa air dari tabel `sensor_logs` di Supabase. Aplikasi ini menampilkan kondisi terkini dalam bentuk kartu indikator, grafik historis, status normal/kritis, serta ekspor data ke Excel untuk analisis lanjutan.

## Fitur Utama

- Monitoring real-time pH dan level air dari Supabase.
- Perhitungan rata-rata 1 menit terakhir untuk menampilkan kondisi terbaru yang lebih stabil.
- Fallback ke data terbaru jika belum ada data pada rentang 1 menit terakhir.
- Indikator status otomatis:
	- pH dianggap aman pada rentang 6.5 - 8.5.
	- Level air dianggap aman jika minimal 20%.
- Tampilan dashboard modern dengan efek glass, grid background, dan kartu indikator besar.
- Informasi waktu pembaruan terakhir untuk membantu memantau data terkini.
- Ekspor data ke Excel dengan 2 sheet:
	- Semua Data: seluruh data mentah yang diambil.
	- Rata-rata Per Jam: data yang sudah diagregasi per jam.
- Halaman statistik historis dengan pilihan rentang waktu:
	- 1 hari (`1D`)
	- 1 minggu (`1W`)
	- 1 bulan (`1M`)
- Grafik area interaktif untuk tren pH dan level air menggunakan Recharts.
- Navigasi bawah yang sederhana untuk berpindah antara Dashboard dan Statistics.
- Integrasi simulasi Wokwi/ESP32 untuk skenario perangkat IoT.

## Teknologi yang Dipakai

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase
- Recharts
- Lucide React
- XLSX

## Struktur Halaman

### Dashboard

Halaman utama berada di `/` dan menampilkan:

- pH rata-rata 1 menit terakhir.
- Sisa air rata-rata 1 menit terakhir.
- Status normal atau peringatan untuk masing-masing metrik.
- Waktu pembaruan terakhir.
- Tombol export ke Excel.

### Statistics

Halaman `/statistics` menampilkan:

- Tren historis pH.
- Tren historis level air.
- Filter rentang waktu 1 hari, 1 minggu, dan 1 bulan.
- Tooltip interaktif saat hover pada grafik.

## Cara Kerja Data

Aplikasi membaca data dari tabel `sensor_logs` di Supabase dengan kolom berikut:

- `id` - UUID unik.
- `created_at` - waktu pencatatan.
- `ph_avg` - nilai pH.
- `water_level_avg` - persentase sisa air.

Di sisi dashboard, data 1 menit terakhir dirata-ratakan agar tampilan lebih stabil. Di halaman statistik, data digabung berdasarkan jam atau tanggal sesuai rentang yang dipilih.

## Persiapan Proyek

### 1. Install dependency

```bash
npm install
```

### 2. Buat file environment

Buat file `.env.local` lalu isi dengan kredensial Supabase milik Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Siapkan tabel Supabase

Jalankan isi file `schema.sql` di SQL Editor Supabase untuk membuat tabel `sensor_logs`, mengaktifkan RLS, dan menambahkan policy `anon` untuk `SELECT` dan `INSERT`.

### 4. Jalankan development server

```bash
npm run dev
```

Lalu buka:

- http://localhost:3000 untuk dashboard utama.
- http://localhost:3000/statistics untuk halaman statistik.

## Script yang Tersedia

- `npm run dev` - menjalankan aplikasi dalam mode development.
- `npm run build` - build production.
- `npm run start` - menjalankan hasil build production.
- `npm run lint` - menjalankan pemeriksaan ESLint.

## Simulasi Wokwi

Folder `Wokwi/` berisi skenario simulasi perangkat ESP32 untuk alur IoT proyek ini. Komponennya mencakup:

- ESP32 DevKit.
- Sensor pH dan sensor level air berbasis input analog.
- LCD I2C.
- Tombol simpan dan tombol menu/status.
- MicroSD untuk pencatatan lokal.

Di sketch Wokwi, data dibaca secara berkala, dirata-ratakan, lalu dikirim ke Supabase. Jika nilai melewati ambang aman, perangkat juga menyiapkan logika notifikasi peringatan.

## Catatan Implementasi

- Aplikasi menggunakan polling berkala untuk memperbarui data dashboard.
- Jika tidak ada data pada rentang 1 menit terakhir, aplikasi akan memakai data terbaru yang tersedia.
- Ekspor Excel hanya mengambil data terbaru dalam jumlah besar lalu mengelompokkannya per jam.
- Styling dibuat gelap dengan nuansa monitoring modern agar cocok untuk dashboard IoT.

## Ringkasan Fitur

1. Monitoring data sensor real-time.
2. Penilaian status pH dan level air berdasarkan ambang aman.
3. Visualisasi data dalam bentuk kartu indikator dan grafik tren.
4. Ekspor data ke file Excel.
5. Dukungan histori harian, mingguan, dan bulanan.
6. Integrasi Supabase sebagai sumber data utama.
7. Dukungan simulasi perangkat melalui Wokwi.

## Lisensi

Proyek ini mengikuti lisensi yang ditetapkan oleh pemilik repositori.
