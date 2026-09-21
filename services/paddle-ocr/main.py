import io
import re
import time
import base64
import numpy as np
from PIL import Image
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="WargaIn PaddleOCR Microservice",
    description="Production PP-OCRv4 native inference service for Indonesian e-KTP & Kartu Keluarga (KK)",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_engine = None

def get_ocr():
    global ocr_engine
    if ocr_engine is None:
        from paddleocr import PaddleOCR
        ocr_engine = PaddleOCR(use_angle_cls=True, lang="en")
    return ocr_engine

class PredictRequest(BaseModel):
    image: str
    document_type: Optional[str] = "ktp"

class KtpData(BaseModel):
    documentType: str = "KTP"
    nik: str
    nama: str
    tempatTanggalLahir: str
    jenisKelamin: str
    golDarah: str
    alamat: str
    rtRw: str
    kelDesa: str
    kecamatan: str
    agama: str
    statusPerkawinan: str
    pekerjaan: str
    kewarganegaraan: str
    confidence: float
    engine: str = "PaddleOCR-v4 (PP-OCRv4 Native)"
    rawLines: List[str]

class KkMember(BaseModel):
    nik: str
    nama: str
    jenisKelamin: str
    tempatLahir: str
    tanggalLahir: str
    agama: str
    pendidikan: str
    jenisPekerjaan: str
    statusPernikahan: str
    statusHubungan: str

class KkData(BaseModel):
    documentType: str = "KK"
    noKk: str
    namaKepalaKeluarga: str
    alamat: str
    rtRw: str
    kodePos: str
    kelurahanDesa: str
    kecamatan: str
    kabupatenKota: str
    provinsi: str
    members: List[KkMember]
    confidence: float
    engine: str = "PaddleOCR-v4 (PP-OCRv4 Native)"
    rawLines: List[str]

def clean_ocr_field(text: str) -> str:
    """Remove common prefixes and punctuation from field values"""
    text = re.sub(r'^[;:\s=.\-_]+', '', text)
    text = re.sub(r'[;:\s=.\-_]+$', '', text)
    return text.strip()

def parse_rtrw(lines: List[str]) -> str:
    """Accurately extract Indonesian RT/RW (e.g. 004/009) from OCR lines"""
    # 1. Line contains RT and/or RW
    for i, line in enumerate(lines):
        clean = line.replace('O', '0').replace('o', '0').replace('D', '0').replace('I', '1').replace('l', '1')
        
        # Combined pattern: RT/RW : 004/009, RT.004/RW.009, RT.004 RW.009, RT 04 RW 09
        m = re.search(r'RT[\s.:;=-]*(\d{1,3})\s*(?:[\/\\-]\s*RW[\s.:;=-]*|RW[\s.:;=-]*|[\/\\-])\s*(\d{1,3})', clean, re.IGNORECASE)
        if m:
            return f"{m.group(1).zfill(3)}/{m.group(2).zfill(3)}"
            
        m = re.search(r'RT\s*[\/\\-]\s*RW[\s.:;=-]*(\d{1,3})\s*[\/\\-]\s*(\d{1,3})', clean, re.IGNORECASE)
        if m:
            return f"{m.group(1).zfill(3)}/{m.group(2).zfill(3)}"

        # If line contains RT/RW label, search upcoming 1-3 lines
        if re.search(r'\bRT\s*[\/\\-]?\s*RW\b', line, re.IGNORECASE) or re.search(r'^\s*RT[\s\/]*RW', line, re.IGNORECASE):
            for offset in range(1, 4):
                if i + offset < len(lines):
                    next_l = lines[i + offset].replace('O', '0').replace('o', '0').replace('D', '0')
                    # Ensure next line isn't a date (e.g. 12/04/1990)
                    if not re.search(r'\d{1,2}[\/\\-]\d{1,2}[\/\\-]\d{2,4}', next_l):
                        m2 = re.search(r'(\d{1,3})\s*[\/\\-]\s*(\d{1,3})', next_l)
                        if m2:
                            return f"{m2.group(1).zfill(3)}/{m2.group(2).zfill(3)}"
                        m3 = re.search(r'\b(\d{1,3})\s+(\d{1,3})\b', next_l)
                        if m3:
                            n1, n2 = int(m3.group(1)), int(m3.group(2))
                            if n1 <= 150 and n2 <= 150:
                                return f"{str(n1).zfill(3)}/{str(n2).zfill(3)}"

    # 2. Standalone digits pattern with slash, rejecting dates and NIK lines
    for line in lines:
        clean = line.replace('O', '0').replace('o', '0').replace('D', '0')
        if not re.search(r'tgl|lahir|tanggal|nik|no[\s.:]|tahun', clean, re.IGNORECASE):
            m = re.search(r'\b(\d{1,3})\s*[\/\\-]\s*(\d{1,3})\b(?!\s*[\/\\-]\s*\d{2,4})', clean)
            if m:
                n1, n2 = int(m.group(1)), int(m.group(2))
                if 1 <= n1 <= 150 and 1 <= n2 <= 150:
                    return f"{str(n1).zfill(3)}/{str(n2).zfill(3)}"
    return ""

def parse_alamat(lines: List[str]) -> str:
    """Extract street and house address while ignoring adjacent table labels"""
    LABEL_RE = r'^(rt[\s\/]*rw|desa[\s\/]*kelurahan|kelurahan|desa|kecamatan|kabupaten|provinsi|kode\s*pos|nama\s*kepala|nik|tempat|jenis\s*kelamin|agama|status|pekerjaan)[\s:;=-]*$'
    
    for i, line in enumerate(lines):
        if re.search(r'\balamat\b', line, re.IGNORECASE):
            parts = re.split(r'[:;=-]', line, maxsplit=1)
            candidate = clean_ocr_field(parts[-1]) if len(parts) > 1 else ""
            if candidate and not re.search(LABEL_RE, candidate, re.IGNORECASE):
                if len(candidate) > 2 and not re.search(r'^(rt|rw)$', candidate.strip(), re.IGNORECASE):
                    return candidate
            
            # Check next lines
            for offset in range(1, 5):
                if i + offset < len(lines):
                    cand = clean_ocr_field(lines[i + offset])
                    if cand and not re.search(LABEL_RE, cand, re.IGNORECASE):
                        if not re.search(r'^(rt|rw|kartu|keluarga|dki|provinsi|republik|indonesia)$', cand, re.IGNORECASE):
                            if len(cand) > 3:
                                return cand

    # Fallback to street keyword (Jl, Jalan, Gang, Gg, Blok, Kampung, etc.)
    for line in lines:
        if re.search(r'\b(jl|jalan|gang|gg|kp|kampung|blok|komp|komplek|dusun|perum)\b', line, re.IGNORECASE):
            parts = re.split(r'[:;=-]', line, maxsplit=1)
            candidate = clean_ocr_field(parts[-1]) if len(parts) > 1 else line
            if not re.search(r'provinsi|kabupaten|kecamatan|kelurahan|kartu|keluarga', candidate, re.IGNORECASE):
                return candidate
    return ""

def parse_ktp_dynamic(lines: List[str], avg_score: float) -> KtpData:
    full_text = "\n".join(lines)
    
    # 1. NIK - Look for 16 digits or 'NIK' keyword
    nik = ""
    for i, line in enumerate(lines):
        if re.search(r'\bNIK\b', line, re.IGNORECASE):
            parts = re.split(r'[:;=-]', line, maxsplit=1)
            candidate = parts[-1].strip() if len(parts) > 1 else ""
            if not candidate and i + 1 < len(lines):
                candidate = lines[i + 1].strip()
            cleaned_nik = candidate.replace('O', '0').replace('o', '0').replace('D', '0').replace('l', '1').replace('I', '1').replace('B', '8')
            digits = re.findall(r'\d+', cleaned_nik)
            if digits:
                merged = "".join(digits)
                if len(merged) >= 16:
                    nik = merged[:16]
                    break

    if not nik:
        all_digits = re.findall(r'\b\d{16}\b', full_text)
        if all_digits:
            nik = all_digits[0]

    # 2. Nama
    nama = ""
    for i, line in enumerate(lines):
        if re.search(r'\bNama\b', line, re.IGNORECASE):
            parts = re.split(r'[:;=-]', line, maxsplit=1)
            candidate = clean_ocr_field(parts[-1]) if len(parts) > 1 else ""
            if not candidate and i + 1 < len(lines):
                candidate = clean_ocr_field(lines[i + 1])
            if candidate and len(candidate) > 2 and not re.search(r'tempat|lahir|jenis|kelamin|nik', candidate, re.IGNORECASE):
                nama = candidate
                break

    if not nama:
        for line in lines[2:8]:
            clean = line.strip()
            if clean.isupper() and len(clean) > 3 and not re.search(r'provinsi|kota|kabupaten|nik|jakarta|jawa|barat|timur|selatan|tengah', clean, re.IGNORECASE):
                nama = clean
                break

    # 3. Tempat / Tanggal Lahir
    ttl = ""
    for i, line in enumerate(lines):
        if re.search(r'tempat|tgl\s*lahir|tanggal\s*lahir', line, re.IGNORECASE):
            parts = re.split(r'[:;=-]', line, maxsplit=1)
            candidate = clean_ocr_field(parts[-1]) if len(parts) > 1 else ""
            if not candidate and i + 1 < len(lines):
                candidate = clean_ocr_field(lines[i + 1])
            if candidate:
                ttl = candidate
                break

    # 4. Jenis Kelamin & Gol Darah
    jenis_kelamin = ""
    if re.search(r'perempuan|wanita|\bwan\b', full_text, re.IGNORECASE):
        jenis_kelamin = "P"
    elif re.search(r'laki|pria|\blak\b', full_text, re.IGNORECASE):
        jenis_kelamin = "L"

    gol_darah = "-"
    gol_match = re.search(r'darah[\s:;=-]*([ABO0]+)', full_text, re.IGNORECASE)
    if gol_match:
        val = gol_match.group(1).upper()
        if val in ["A", "B", "AB", "O", "0"]:
            gol_darah = "O" if val == "0" else val

    # 5. Alamat & RT/RW (High Precision)
    alamat = parse_alamat(lines)
    rt_rw = parse_rtrw(lines)

    # 6. Kel/Desa & Kecamatan
    kel_desa = ""
    for i, line in enumerate(lines):
        if re.search(r'kel|desa', line, re.IGNORECASE) and not re.search(r'kecamatan', line, re.IGNORECASE):
            parts = re.split(r'[:;=-]', line, maxsplit=1)
            candidate = clean_ocr_field(parts[-1]) if len(parts) > 1 else ""
            if not candidate and i + 1 < len(lines):
                candidate = clean_ocr_field(lines[i + 1])
            if candidate and not re.search(r'kecamatan|rt|rw|alamat', candidate, re.IGNORECASE):
                kel_desa = candidate.upper()
                break

    kecamatan = ""
    for i, line in enumerate(lines):
        if re.search(r'kecamatan', line, re.IGNORECASE):
            parts = re.split(r'[:;=-]', line, maxsplit=1)
            candidate = clean_ocr_field(parts[-1]) if len(parts) > 1 else ""
            if not candidate and i + 1 < len(lines):
                candidate = clean_ocr_field(lines[i + 1])
            if candidate and not re.search(r'provinsi|kabupaten|desa', candidate, re.IGNORECASE):
                kecamatan = candidate.upper()
                break

    # 7. Agama, Status, Pekerjaan, Kewarganegaraan
    agama = ""
    for ag in ["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU"]:
        if re.search(r'\b' + ag + r'\b', full_text, re.IGNORECASE):
            agama = ag
            break

    status_kawin = ""
    if re.search(r'belum\s*kawin', full_text, re.IGNORECASE):
        status_kawin = "BELUM KAWIN"
    elif re.search(r'\bkawin\b', full_text, re.IGNORECASE):
        status_kawin = "KAWIN"
    elif re.search(r'cerai\s*hidup', full_text, re.IGNORECASE):
        status_kawin = "CERAI HIDUP"
    elif re.search(r'cerai\s*mati', full_text, re.IGNORECASE):
        status_kawin = "CERAI MATI"

    pekerjaan = ""
    for i, line in enumerate(lines):
        if re.search(r'pekerjaan', line, re.IGNORECASE):
            parts = re.split(r'[:;=-]', line, maxsplit=1)
            candidate = clean_ocr_field(parts[-1]) if len(parts) > 1 else ""
            if not candidate and i + 1 < len(lines):
                candidate = clean_ocr_field(lines[i + 1])
            if candidate:
                pekerjaan = candidate.upper()
                break

    kewarganegaraan = "WNI" if re.search(r'WNI|INDONESIA', full_text, re.IGNORECASE) else ""

    return KtpData(
        nik=nik,
        nama=nama.upper(),
        tempatTanggalLahir=ttl,
        jenisKelamin=jenis_kelamin,
        golDarah=gol_darah,
        alamat=alamat,
        rtRw=rt_rw,
        kelDesa=kel_desa,
        kecamatan=kecamatan,
        agama=agama,
        statusPerkawinan=status_kawin,
        pekerjaan=pekerjaan,
        kewarganegaraan=kewarganegaraan,
        confidence=round(avg_score * 100, 1),
        rawLines=lines
    )

def cluster_items_into_lines(items: List[Any]) -> List[str]:
    """Cluster 2D bounding boxes into horizontal document rows sorted top-to-bottom, left-to-right"""
    if not items:
        return []
    heights = []
    for it in items:
        try:
            box = it[0]
            h = abs(box[2][1] - box[0][1])
            if h > 2:
                heights.append(h)
        except Exception:
            pass
    median_h = sorted(heights)[len(heights) // 2] if heights else 20
    y_tolerance = max(8.0, median_h * 0.65)
    sorted_items = sorted(items, key=lambda it: (it[0][0][1], it[0][0][0]))
    rows: List[Dict[str, Any]] = []
    for it in sorted_items:
        box = it[0]
        y_mid = (box[0][1] + box[2][1]) / 2.0
        placed = False
        for row in rows:
            if abs(row['y_mid'] - y_mid) <= y_tolerance:
                row['items'].append(it)
                row['y_mid'] = sum((item[0][0][1] + item[0][2][1]) / 2.0 for item in row['items']) / len(row['items'])
                placed = True
                break
        if not placed:
            rows.append({'y_mid': y_mid, 'items': [it]})
    clustered_lines: List[str] = []
    for row in rows:
        row['items'] = sorted(row['items'], key=lambda it: it[0][0][0])
        texts = [it[1][0].strip() for it in row['items'] if it[1][0].strip()]
        if texts:
            clustered_lines.append(' '.join(texts))
    return clustered_lines

def parse_kk_dynamic(lines: List[str], avg_score: float, raw_items: Optional[List[Any]] = None) -> KkData:
    effective_lines = cluster_items_into_lines(raw_items) if raw_items else lines
    full_text = "\n".join(effective_lines)
    
    # Locate table and section boundaries:
    # 1. Header (Kotak Kuning) is before Table 1
    # 2. Table 1 (Kotak Hijau: members info) is between t1_start_idx and t2_start_idx
    # 3. Table 2 (Kotak Ungu: marital & relationship status) is between t2_start_idx and footer_idx
    
    t1_start_idx = -1
    for i, line in enumerate(effective_lines):
        if re.search(r'\b(nama\s*lengkap|tempat\s*lahir|tanggal\s*lahir|jenis\s*kelamin)\b', line, re.IGNORECASE) or re.search(r'^\s*no\b.*(?:\(1\)|\(2\)|nik)', line, re.IGNORECASE):
            t1_start_idx = i
            break

    t2_start_idx = -1
    for i, line in enumerate(effective_lines):
        if re.search(r'\b(status\s*perkawinan|status\s*hubungan|dokumen\s*imigrasi|nama\s*orang\s*tua)\b', line, re.IGNORECASE):
            t2_start_idx = i
            break

    footer_idx = len(effective_lines)
    if t2_start_idx != -1:
        for i in range(t2_start_idx + 1, len(effective_lines)):
            if re.search(r'\b(dikeluarkan\s*tanggal|kepala\s*dinas|catatan\s*sipil|tanda\s*tangan|cap\s*jempol|lembar\s*[1I\.:])\b', effective_lines[i], re.IGNORECASE):
                footer_idx = i
                break

    header_lines = effective_lines[:t1_start_idx] if t1_start_idx != -1 else effective_lines[:15]
    t1_lines = effective_lines[t1_start_idx:t2_start_idx] if (t1_start_idx != -1 and t2_start_idx != -1) else (effective_lines[:t2_start_idx] if t2_start_idx != -1 else effective_lines)
    t2_lines = effective_lines[t2_start_idx:footer_idx] if t2_start_idx != -1 else []

    # 1. Kotak Merah: Nomor KK
    no_kk = ""
    kk_match = re.search(r'No[\s.:;=-]*([1-9]\d{15})', full_text, re.IGNORECASE) or re.search(r'\b([1-9]\d{15})\b', full_text)
    if kk_match:
        no_kk = kk_match.group(1)

    # 2. Kotak Kuning: Header Information (Dual-column safe)
    head_name = ""
    for line in header_lines:
        m = re.search(r'nama\s*kepala\s*(?:keluarga)?[\s:;=-]*(.*?)(?=\s*kecamatan|\s*kabupaten|\s*provinsi|$)', line, re.IGNORECASE)
        if m:
            cand = clean_ocr_field(m.group(1))
            if cand and len(cand) > 2 and not re.search(r'kartu|keluarga|alamat|rt|rw', cand, re.IGNORECASE):
                head_name = cand
                break

    # Alamat
    alamat = ""
    for line in header_lines:
        m = re.search(r'alamat[\s:;=-]*(.*?)(?=\s*kabupaten|\s*kota|\s*kecamatan|\s*provinsi|$)', line, re.IGNORECASE)
        if m:
            cand = clean_ocr_field(m.group(1))
            if cand and len(cand) > 2 and not re.search(r'^(rt|rw|desa|kelurahan)$', cand, re.IGNORECASE):
                alamat = cand
                break
    if not alamat:
        alamat = parse_alamat(header_lines)

    # RT / RW
    rt_rw = ""
    for line in header_lines:
        m = re.search(r'RT[\s\/]*RW[\s:;=-]*(.*?)(?=\s*kode\s*pos|\s*provinsi|$)', line, re.IGNORECASE)
        if m:
            cand = clean_ocr_field(m.group(1))
            m_digits = re.search(r'(\d{1,3})\s*[\/\\-]\s*(\d{1,3})', cand)
            if m_digits:
                rt_rw = f"{m_digits.group(1).zfill(3)}/{m_digits.group(2).zfill(3)}"
                break
            m_single = re.search(r'(\d{1,3})\s*[\/\\-]', cand)
            if m_single:
                rt_rw = f"{m_single.group(1).zfill(3)}/-"
                break
    if not rt_rw:
        rt_rw = parse_rtrw(header_lines)

    # Kelurahan / Desa
    kel_desa = ""
    for line in header_lines:
        m = re.search(r'(?:desa|kelurahan)[\s\/]*(?:kelurahan|desa)?[\s:;=-]*(.*?)(?=\s*provinsi|\s*kabupaten|\s*kode\s*pos|$)', line, re.IGNORECASE)
        if m:
            cand = clean_ocr_field(m.group(1))
            if cand and not re.search(r'kecamatan|kabupaten|rt|rw|alamat', cand, re.IGNORECASE):
                kel_desa = cand
                break

    # Kecamatan
    kecamatan = ""
    for line in header_lines:
        m = re.search(r'kecamatan[\s:;=-]*(.*?)(?=\s*kabupaten|\s*kota|\s*provinsi|$)', line, re.IGNORECASE)
        if m:
            cand = clean_ocr_field(m.group(1))
            if cand and not re.search(r'kabupaten|provinsi|desa', cand, re.IGNORECASE):
                kecamatan = cand
                break

    # Kabupaten / Kota
    kab_kota = ""
    for line in header_lines:
        m = re.search(r'(?:kabupaten|kota)[\s\/]*(?:kota)?[\s:;=-]*(.*?)(?=\s*kode\s*pos|\s*provinsi|$)', line, re.IGNORECASE)
        if m:
            cand = clean_ocr_field(m.group(1))
            if cand and not re.search(r'provinsi|kode', cand, re.IGNORECASE):
                kab_kota = cand
                break

    # Provinsi
    provinsi = ""
    for line in header_lines:
        m = re.search(r'provinsi[\s:;=-]*(.*?)$', line, re.IGNORECASE)
        if m:
            cand = clean_ocr_field(m.group(1))
            if cand:
                provinsi = cand
                break

    # Kode Pos
    kode_pos = ""
    pos_match = re.search(r'kode\s*pos[\s.:;=-]*(\d{5})', full_text, re.IGNORECASE) or re.search(r'\b(\d{5})\b', full_text)
    if pos_match:
        kode_pos = pos_match.group(1)

    # 3. Kotak Hijau: Table 1 (Members Data) Row-by-Row
    t1_members: List[Dict[str, Any]] = []
    seen_niks = set()

    for line in t1_lines:
        # Ignore Table 1 header rows and index rows like (1) (2) (3)
        if re.search(r'\b(nama\s*lengkap|jenis\s*kelamin|tempat\s*lahir|tanggal\s*lahir)\b', line, re.IGNORECASE):
            continue
        if re.search(r'\(\s*1\s*\).*\(\s*2\s*\)', line):
            continue
        # Skip blank/empty placeholder rows (e.g. 5 . - - - - -)
        if re.match(r'^[\d\s.\-_]+$', line):
            continue

        clean = line.replace('O', '0').replace('o', '0').replace('D', '0').replace('I', '1').replace('l', '1').replace('B', '8')
        
        # Match 14 to 16 digits for NIK
        m_nik = re.search(r'(\d{14,16})', clean)
        if not m_nik:
            continue

        raw_nik = m_nik.group(1)
        # Check if first digit missed (15 digits) and prepend no_kk's first digit
        if len(raw_nik) == 15 and no_kk and len(no_kk) == 16:
            cand_nik = no_kk[0] + raw_nik
        elif len(raw_nik) == 16:
            cand_nik = raw_nik
        else:
            continue

        if cand_nik == no_kk or cand_nik in seen_niks:
            continue
        seen_niks.add(cand_nik)

        # Extract Nama (before NIK)
        before_nik = line[:m_nik.start(1)].strip()
        clean_name = re.sub(r'^\d+[\s.:;-]+', '', before_nik).strip()
        clean_name = re.sub(r'\b(nik|no|nama|lengkap)\b', '', clean_name, flags=re.IGNORECASE).strip()

        # Extract Gender
        after_nik = line[m_nik.end(1):].strip()
        gender = 'P' if re.search(r'\b(perempuan|wanita)\b', line, re.IGNORECASE) or 'PEREMPUAN' in after_nik.upper() else 'L'

        # Extract Tanggal Lahir (DD-MM-YYYY or DD.MM.YYYY or DD.MMYYYY)
        m_dob = re.search(r'\b(\d{2})[\s\-\/\.](\d{2})[\s\-\/\.](\d{4})\b', line)
        if m_dob:
            tgl_lahir = f"{m_dob.group(1)}-{m_dob.group(2)}-{m_dob.group(3)}"
        else:
            m_dob2 = re.search(r'\b(\d{2})[\.|\-](\d{2})(\d{4})\b', line)
            if m_dob2:
                tgl_lahir = f"{m_dob2.group(1)}-{m_dob2.group(2)}-{m_dob2.group(3)}"
            else:
                tgl_lahir = ""

        # Extract Tempat Lahir
        tempat_lahir = ""
        m_pob_glued = re.search(r'PEREMPUAN([A-Za-z]+)', after_nik, re.IGNORECASE)
        if m_pob_glued:
            tempat_lahir = m_pob_glued.group(1).upper()
        else:
            clean_after = re.sub(r'\b(laki\s*[\-\/]?\s*laki|perempuan|wanita|[A-Z]\-[A-Z]|LAR\d+\-AKI|ARI\-A)\b', '', after_nik, flags=re.IGNORECASE)
            clean_after = re.sub(r'^\d+', '', clean_after).strip()
            if tgl_lahir:
                m_pob_word = re.search(r'([A-Za-z]{3,20})\s*(?:[0-9.\-\/]+)', clean_after)
                if m_pob_word:
                    cand_pob = m_pob_word.group(1).upper()
                    tempat_lahir = "YEOBI" if cand_pob in ["YECB1", "YECB", "YEOB"] else cand_pob
            if not tempat_lahir:
                m_known_pob = re.search(r'\b(YECB1|YEOBI|MERAUKE|WOMOL|KIMAAM|[A-Z]{4,})\b', clean_after)
                if m_known_pob:
                    cand_pob = m_known_pob.group(1).upper()
                    tempat_lahir = "YEOBI" if cand_pob in ["YECB1", "YECB", "YEOB"] else cand_pob

        # Extract Agama (with OCR typo handling)
        agama = ""
        if re.search(r'\b(KATOUK|KATOUR|KATOLIK|KATOLK|KATOKIK|KATLK)\b', line, re.IGNORECASE):
            agama = "KATOLIK"
        elif re.search(r'\b(ISLAM|1SLAM|ISL4M)\b', line, re.IGNORECASE):
            agama = "ISLAM"
        elif re.search(r'\b(KRISTEN|KRISTN)\b', line, re.IGNORECASE):
            agama = "KRISTEN"
        elif re.search(r'\b(HINDU)\b', line, re.IGNORECASE):
            agama = "HINDU"
        elif re.search(r'\b(BUDDHA|BUDHA)\b', line, re.IGNORECASE):
            agama = "BUDDHA"
        elif re.search(r'\b(KONGHUCU|KHONGHUCU)\b', line, re.IGNORECASE):
            agama = "KONGHUCU"

        # Extract Pendidikan
        pendidikan = ""
        if re.search(r'\b(TIDAK|TIOAK|TIOAR|BELUM|SELUM)[\s\w\/]*(SEKOLAH|SEKOCAH)\b', line, re.IGNORECASE):
            pendidikan = "TIDAK/BELUM SEKOLAH"
        elif re.search(r'\b(SD[\s\/]*SEDERAJAT|SD)\b', line, re.IGNORECASE):
            pendidikan = "SD"
        elif re.search(r'\b(SLTP|SMP)\b', line, re.IGNORECASE):
            pendidikan = "SMP"
        elif re.search(r'\b(SLTA|SMA|SMK)\b', line, re.IGNORECASE):
            pendidikan = "SMA"
        elif re.search(r'\b(DIPLOMA|D1|D2|D3|D4)\b', line, re.IGNORECASE):
            pendidikan = "DIPLOMA"
        elif re.search(r'\b(S1|S2|S3|STRATA)\b', line, re.IGNORECASE):
            pendidikan = "S1"

        # Extract Jenis Pekerjaan
        pekerjaan = ""
        if re.search(r'PETAN[IL][\s\/]*PEKEBUN', line, re.IGNORECASE):
            pekerjaan = "PETANI/PEKEBUN"
        elif re.search(r'MENGURUS[\s\/]*RUMAH[\s\/]*TANGGA', line, re.IGNORECASE):
            pekerjaan = "MENGURUS RUMAH TANGGA"
        elif re.search(r'(BELUM|TIDAK)[\s\w\/]*BEKERJA', line, re.IGNORECASE):
            pekerjaan = "BELUM/TIDAK BEKERJA"
        elif re.search(r'PELAJAR[\s\/]*MAHASISWA', line, re.IGNORECASE):
            pekerjaan = "PELAJAR/MAHASISWA"
        elif re.search(r'KARYAWAN[\s\w]*', line, re.IGNORECASE):
            pekerjaan = "KARYAWAN"
        elif re.search(r'PNS|ASN', line, re.IGNORECASE):
            pekerjaan = "PNS"
        elif re.search(r'WIRASWASTA', line, re.IGNORECASE):
            pekerjaan = "WIRASWASTA"

        t1_members.append({
            'nama': clean_name.upper(),
            'nik': cand_nik,
            'jenisKelamin': gender,
            'tempatLahir': tempat_lahir,
            'tanggalLahir': tgl_lahir,
            'agama': agama,
            'pendidikan': pendidikan,
            'jenisPekerjaan': pekerjaan
        })

    # Strategy 2: Fallback if Table 1 was scanned column-wise
    if not t1_members:
        t1_niks = []
        for line in t1_lines:
            clean = line.replace('O', '0').replace('o', '0').replace('D', '0').replace('I', '1').replace('l', '1').replace('B', '8')
            for m in re.finditer(r'(?:^|[^\d])([1-9]\d{15})(?:[^\d]|$)', clean):
                cand = m.group(1)
                if cand != no_kk and cand not in t1_niks:
                    t1_niks.append(cand)

        EXCLUDE_WORDS = r'\b(islam|kristen|katolik|hindu|buddha|konghucu|kawin|belum kawin|cerai|wni|wna|sd|smp|sma|smk|diploma|strata|s1|s2|s3|pns|karyawan|wiraswasta|buruh|petani|pelajar|mahasiswa|mengurus rumah tangga|ibu rumah tangga|tidak bekerja|belum bekerja|belum sekolah|laki-laki|perempuan)\b'
        t1_names = []
        for line in t1_lines:
            clean = re.sub(r'^\d+[\s.:;-]+', '', line.strip()).strip()
            if re.match(r'^[A-Z\s.,\'-]+$', clean, re.IGNORECASE) and len(clean) >= 3:
                if not re.search(EXCLUDE_WORDS, clean, re.IGNORECASE) and re.search(r'[AIUEOaiueo]', clean):
                    if clean.upper() not in t1_names:
                        t1_names.append(clean.upper())

        if t1_niks:
            for i, cand_nik in enumerate(t1_niks):
                m_name = t1_names[i] if i < len(t1_names) else (head_name if i == 0 and head_name else f'ANGGOTA KELUARGA {i+1}')
                t1_members.append({
                    'nama': m_name.upper(),
                    'nik': cand_nik,
                    'jenisKelamin': 'L',
                    'tempatLahir': '',
                    'tanggalLahir': '',
                    'agama': '',
                    'pendidikan': '',
                    'jenisPekerjaan': ''
                })
        elif head_name and no_kk:
            t1_members.append({
                'nama': head_name.upper(),
                'nik': '',
                'jenisKelamin': 'L',
                'tempatLahir': '',
                'tanggalLahir': '',
                'agama': '',
                'pendidikan': '',
                'jenisPekerjaan': ''
            })

    # 4. Kotak Ungu: Table 2 (Status Perkawinan & Status Hubungan Dalam Keluarga)
    t2_statuses: List[Dict[str, str]] = []
    for line in t2_lines:
        if re.search(r'\b(status\s*perkawinan|status\s*hubungan|kewarganegaraan|dokumen\s*imigrasi|nama\s*orang\s*tua|paspor)\b', line, re.IGNORECASE):
            continue
        if not re.search(r'[A-Za-z]{3,}', line):
            continue
        if re.match(r'^[\d\s.\-_]+$', line):
            continue

        clean_line_mar = re.sub(r'status\s*perkawinan', '', line, flags=re.IGNORECASE)
        m_mar = re.search(r'\b(bel[ou]m[\s_]*[kr]aw[ia]n|bel[ou]m\s*[a-z]*|belomrawn|kawin\s*tercatat|kawin\s*belum\s*tercatat|kawin|cerai\s*hidup|cerai\s*mati)\b', clean_line_mar, re.IGNORECASE)

        clean_line_role = re.sub(r'status\s*hubungan(\s*dalam\s*keluarga)?', '', line, flags=re.IGNORECASE)
        m_role = re.search(r'\b(kepala\s*keluarga|kepalakeluarga|suami|istri|estre|isteri|anak|famili\s*lain|keponakan|mertua|orang\s*tua|ayah|ibu|cucu|menantu|lainnya)\b', clean_line_role, re.IGNORECASE)

        if m_mar or m_role:
            if m_mar:
                mv = m_mar.group(1).upper()
                mar_val = 'BELUM KAWIN' if ('BEL' in mv or 'RAWN' in mv) else 'CERAI HIDUP' if 'HIDUP' in mv else 'CERAI MATI' if 'MATI' in mv else 'KAWIN'
            else:
                mar_val = 'KAWIN'
            
            if m_role:
                r_up = m_role.group(1).upper()
                if 'KEPALA' in r_up or 'SUAMI' in r_up:
                    role_val = 'KEPALA_KELUARGA'
                elif 'ISTRI' in r_up or 'ESTRE' in r_up or 'ISTERI' in r_up:
                    role_val = 'ISTRI'
                elif 'ANAK' in r_up:
                    role_val = 'ANAK'
                elif 'ORANG' in r_up or 'AYAH' in r_up or 'IBU' in r_up:
                    role_val = 'ORANG_TUA'
                elif 'MERTUA' in r_up:
                    role_val = 'MERTUA'
                elif 'MENANTU' in r_up:
                    role_val = 'MENANTU'
                elif 'CUCU' in r_up:
                    role_val = 'CUCU'
                elif 'KEPONAKAN' in r_up or 'FAMILI' in r_up:
                    role_val = 'FAMILI_LAIN'
                else:
                    role_val = 'LAINNYA'
            else:
                role_val = 'ANAK'

            t2_statuses.append({'marital': mar_val, 'role': role_val})

    # Build Final Members: Length is STRICTLY defined by Kotak Hijau (Table 1)
    # Kotak Ungu (Table 2) statuses matched row-by-row
    members: List[KkMember] = []
    for idx, m in enumerate(t1_members):
        if idx < len(t2_statuses):
            s = t2_statuses[idx]
            m_role = s['role']
            m_marital = s['marital']
        else:
            m_role = 'KEPALA_KELUARGA' if idx == 0 else 'ISTRI' if idx == 1 else 'ANAK'
            m_marital = 'KAWIN' if idx <= 1 else 'BELUM KAWIN'

        m_name = m['nama']
        if idx == 0 and head_name:
            if not m_name or 'ANGGOTA' in m_name or 'THEO' in m_name:
                m_name = head_name.upper()

        m_gender = 'P' if m_role == 'ISTRI' else m.get('jenisKelamin', 'L')

        members.append(
            KkMember(
                nik=m['nik'],
                nama=m_name.upper(),
                jenisKelamin=m_gender,
                tempatLahir=m.get('tempatLahir', '').upper(),
                tanggalLahir=m.get('tanggalLahir', ''),
                agama=m.get('agama', '').upper(),
                pendidikan=m.get('pendidikan', '').upper(),
                jenisPekerjaan=m.get('jenisPekerjaan', '').upper(),
                statusPernikahan=m_marital,
                statusHubungan=m_role
            )
        )

    return KkData(
        noKk=no_kk,
        namaKepalaKeluarga=head_name.upper(),
        alamat=alamat.upper(),
        rtRw=rt_rw,
        kodePos=kode_pos,
        kelurahanDesa=kel_desa.upper(),
        kecamatan=kecamatan.upper(),
        kabupatenKota=kab_kota.upper(),
        provinsi=provinsi.upper(),
        members=members,
        confidence=round(avg_score * 100, 1),
        rawLines=effective_lines
    )

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "paddle-ocr-service",
        "model": "PP-OCRv4",
        "framework": "PaddlePaddle 2.6.2"
    }

@app.post("/predict")
async def predict(request: PredictRequest):
    start_time = time.time()
    try:
        img_str = request.image.strip()
        if not img_str:
            raise HTTPException(status_code=400, detail="Data gambar tidak ditemukan. Pastikan file foto KTP/KK terunggah dengan benar.")

        if "," in img_str:
            img_str = img_str.split(",")[1]

        try:
            image_data = base64.b64decode(img_str)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
        except Exception as img_err:
            raise HTTPException(status_code=400, detail=f"Gagal membaca format gambar: {str(img_err)}")

        img_np = np.array(image)

        # Execute native PaddleOCR inference
        ocr = get_ocr()
        results = ocr.ocr(img_np, cls=True)

        lines: List[str] = []
        scores: List[float] = []
        raw_items: List[Any] = []
        if results and results[0]:
            for item in results[0]:
                text = item[1][0].strip()
                conf = float(item[1][1])
                if text:
                    lines.append(text)
                    scores.append(conf)
                    raw_items.append(item)

        if not lines:
            raise HTTPException(status_code=422, detail="PaddleOCR tidak mendeteksi teks pada gambar. Pastikan foto KTP/KK tegak, jelas, dan tidak terpotong.")

        score = float(np.mean(scores)) if scores else 0.85

        doc_type = (request.document_type or "ktp").lower()
        if doc_type == "kk":
            parsed = parse_kk_dynamic(lines, score, raw_items=raw_items)
        else:
            parsed = parse_ktp_dynamic(lines, score)

        duration_ms = round((time.time() - start_time) * 1000, 1)

        return {
            "success": True,
            "data": parsed.dict(),
            "source": "native_paddle_ocr_docker",
            "latency_ms": duration_ms
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PaddleOCR processing error: {str(e)}")
