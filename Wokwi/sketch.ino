#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <SD.h>
#include <SPI.h>
#include <WiFi.h>
#include <Wire.h>

// --- Konfigurasi Supabase ---
const char *supabaseUrl = "https://nylrfzuniogeksrnexop.supabase.co/rest/v1/sensor_logs";
const char *supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bHJmenVuaW9nZWtzcm5leG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjI5OTMsImV4cCI6MjA5NzkzODk5M30.zlC4SjKowaM-KG-FPxpduTIUXu4xNkjWad-sACFN0_c";

#define BTN_SAVE 32
#define BTN_MENU 33
#define PH_PIN 34
#define WATER_PIN 35
#define SD_CS 5

LiquidCrystal_I2C lcd(0x27, 16, 2);

float phValue;
float flowSpeed; // Kecepatan aliran air dalam m/s

// Timer variables
unsigned long previousMillisUpdate = 0;
const long intervalUpdate = 1000; // Update real-time & LCD tiap 1 detik

unsigned long previousMillisSample = 0;
const long intervalSample = 60000; // Sampling tiap 1 menit (60.000 ms)

// Averaging variables
int sampleCount = 0;
float phSum = 0.0;
float flowSum = 0.0;

// Button debounce & display state
unsigned long lastButtonPressSave = 0;
unsigned long lastButtonPressMenu = 0;
const long debounceDelay = 300;
unsigned long menuDisplayUntil = 0;

void setup() {
  Serial.begin(115200);

  // 1. Setup Pin
  pinMode(BTN_SAVE, INPUT_PULLUP);
  pinMode(BTN_MENU, INPUT_PULLUP);

  // 2. Inisialisasi LCD Paling Awal (Agar langsung tampil)
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Sistem Nyala...");
  delay(1000);

  // 3. Setup WiFi (LCD akan diupdate di dalam fungsi ini)
  setupWiFi();

  // 4. Setup SD Card
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Cek SD Card...");
  delay(1000);

  if (!SD.begin(SD_CS)) {
    Serial.println("SD Card Gagal");
    lcd.clear();
    lcd.print("SD Error!");
  } else {
    Serial.println("SD Card OK");
    lcd.clear();
    lcd.print("SD Ready!");
  }
  
  delay(1500);
  lcd.clear(); // Bersihkan layar untuk persiapan masuk ke loop utama
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Update Real-time (baca sensor dan tampilkan di LCD tiap 1 detik)
  if (currentMillis - previousMillisUpdate >= intervalUpdate) {
    previousMillisUpdate = currentMillis;

    int phRaw = analogRead(PH_PIN);
    int waterRaw = analogRead(WATER_PIN);

    // Simulasi pH 0-14
    phValue = map(phRaw, 0, 4095, 0, 140) / 10.0;

    // --- 1b. Pembacaan Sensor Aliran Air / Flow Meter (Lebih Realistis) ---
    // Di dunia nyata, flow meter (seperti YF-S201) menggunakan interrupt untuk menghitung pulsa/putaran baling-baling.
    // Di sini kita gunakan potensiometer untuk mensimulasikan kecepatan (0 hingga 5.0 m/s).
    int flowRaw = analogRead(WATER_PIN);
    
    // Konversi ADC ke kecepatan (m/s). Asumsi max 5.0 m/s
    flowSpeed = flowRaw * (5.0 / 4095.0);

    Serial.print("pH: ");
    Serial.print(phValue);
    Serial.print(" | Flow: ");
    Serial.print(flowSpeed);
    Serial.println(" m/s");

    // Update LCD hanya jika tidak sedang menampilkan status/pesan pop-up
    if (currentMillis > menuDisplayUntil) {
      // Baris 1: Menampilkan angka pH beserta keterangannya
      lcd.setCursor(0, 0);
      lcd.print("pH:");
      lcd.print(phValue, 1);
      
      if (phValue >= 6.5 && phValue <= 8.5) {
        lcd.print(" Normal  "); // Tambahan spasi untuk menimpa sisa teks lama
      } else {
        lcd.print(" Tdk OK  ");
      }

      // Baris 2: Menampilkan kecepatan aliran beserta keterangannya
      lcd.setCursor(0, 1);
      lcd.print("Flow:");
      lcd.print(flowSpeed, 1);
      lcd.print("m/s ");
      
      if (flowSpeed > 0.5) {
        lcd.print("Jalan");
      } else {
        lcd.print("Mati ");
      }
    }
  }

  // 2. Sampling tiap 1 menit untuk rata-rata dan kirim ke Supabase
  if (currentMillis - previousMillisSample >= intervalSample) {
    previousMillisSample = currentMillis;

    // Tambahkan nilai ke penampung
    phSum += phValue;
    flowSum += flowSpeed;
    sampleCount++;

    // Jika sudah 60 sampel (1 jam)
    if (sampleCount >= 60) {
      float phAvg = phSum / 60.0;
      float flowAvg = flowSum / 60.0;

      Serial.println("\n=== LAPORAN 1 JAM ===");
      Serial.print("Rata-rata pH: ");
      Serial.println(phAvg, 2);
      Serial.print("Rata-rata Flow: ");
      Serial.print(flowAvg, 2);
      Serial.println(" m/s");
      Serial.println("=====================\n");

      // Kirim data ke Supabase
      kirimKeSupabase(phAvg, flowAvg);

      // Reset variabel penampung
      phSum = 0;
      flowSum = 0;
      sampleCount = 0;
    }
  }

  // 3. Tombol Simpan ke SD Card (Debounce non-blocking)
  if (digitalRead(BTN_SAVE) == LOW) {
    if (currentMillis - lastButtonPressSave >= debounceDelay) {
      lastButtonPressSave = currentMillis;
      saveData();
    }
  }

  // 4. Tombol Menu/Status (Manual Cek)
  if (digitalRead(BTN_MENU) == LOW) {
    if (currentMillis - lastButtonPressMenu >= debounceDelay) {
      lastButtonPressMenu = currentMillis;

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Status Cek:");
      
      lcd.setCursor(0, 1);
      if (phValue >= 6.5 && phValue <= 8.5 && flowSpeed > 0.5) {
        lcd.print("Semua AMAN");
      } else {
        lcd.print("Cek Sensor!");
      }

      // Tahan tampilan ini selama 2 detik sebelum kembali ke layar utama
      menuDisplayUntil = currentMillis + 2000;
    }
  }
}

// --- FUNGSI TAMBAHAN ---

void saveData() {
  File file = SD.open("/data.csv", FILE_APPEND);

  if (file) {
    file.print(millis());
    file.print(",");
    file.print(phValue);
    file.print(",");
    file.println(flowSpeed);
    file.close();

    Serial.println("Data Tersimpan ke SD");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Data Disimpan");
    menuDisplayUntil = millis() + 2000;
  } else {
    Serial.println("Gagal Simpan ke SD");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Save Error!");
    menuDisplayUntil = millis() + 2000;
  }
}

void setupWiFi() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Koneksi WiFi...");

  Serial.print("Menghubungkan ke WiFi");
  
// ---> BAGIAN YANG DIPERBAIKI <---
  WiFi.begin("asdfghjkll", "asdfghjkl");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi terhubung!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Terhubung!");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP().toString());
  delay(2000);
}

void kirimKeSupabase(float ph, float flow) {
  if (WiFi.status() == WL_CONNECTED) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Kirim Data...");
    lcd.setCursor(0, 1);
    lcd.print("Ke Supabase");

    HTTPClient http;
    http.begin(supabaseUrl);

    http.addHeader("apikey", supabaseKey);
    http.addHeader("Authorization", String("Bearer ") + String(supabaseKey));
    http.addHeader("Content-Type", "application/json");

    // Catatan DB: Pastikan kolom tipe datanya sudah FLOAT. 
    // Key JSON saat ini masih "water_level_avg" mengikuti schema sebelumnya.
    String payload = "{\"ph_avg\":" + String(ph, 2) + ",\"water_level_avg\":" + String(flow, 2) + "}";

    int httpResponseCode = http.POST(payload);

    lcd.clear();
    lcd.setCursor(0, 0);
    if (httpResponseCode > 0) {
      Serial.print("Supabase Response: ");
      Serial.println(httpResponseCode);
      lcd.print("Kirim Sukses!");
      lcd.setCursor(0, 1);
      lcd.print("Kode: ");
      lcd.print(httpResponseCode);
    } else {
      Serial.print("Supabase Error: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
      lcd.print("Error Kirim!");
      lcd.setCursor(0, 1);
      lcd.print(httpResponseCode);
    }
    http.end();
    
    // Tahan pesan di LCD selama 3 detik setelah mencoba kirim
    menuDisplayUntil = millis() + 3000;
  } else {
    Serial.println("WiFi Disconnected, tidak bisa kirim ke Supabase");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Terputus!");
    menuDisplayUntil = millis() + 2000;
  }
}