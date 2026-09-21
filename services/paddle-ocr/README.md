# WargaIn PaddleOCR Microservice (PP-OCRv4)

Microservice berbasis **FastAPI** dan **PaddleOCR** untuk ekstraksi data e-KTP dan Kartu Keluarga (KK) Indonesia secara otomatis.

---

## Cara Menjalankan dengan Docker Compose

Dari direktori root proyek:

```bash
docker compose up -d --build
```

Layanan akan berjalan di:
- **API URL**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

---

## Cara Menjalankan Manual (Docker Run)

1. **Build Image**:
   ```bash
   docker build -t wargain-paddle-ocr ./services/paddle-ocr
   ```

2. **Run Container**:
   ```bash
   docker run -d --name wargain_paddle_ocr -p 8000:8000 wargain-paddle-ocr
   ```

---

## Endpoint API

### 1. `GET /health`
Cek status kesiapan service dan model.

### 2. `POST /predict`
Ekstraksi data gambar KTP atau KK.
**Payload**:
```json
{
  "image": "<base64_string_or_data_url>",
  "document_type": "ktp" // atau "kk"
}
```

---

## Integrasi dengan WargaIn Next.js
Pastikan di `.env.local` Next.js terdapat konfigurasi:
```env
PADDLE_OCR_SERVICE_URL=http://localhost:8000/predict
```
Next.js API route `/api/ocr/ktp-kk` akan otomatis meneruskan request ke service Docker ini. Jika service Docker sedang tidak aktif/offline, Next.js akan fallback ke intelligent internal model parser.
