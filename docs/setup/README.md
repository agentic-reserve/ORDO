# Setup & Build Documentation

Panduan instalasi, konfigurasi, dan troubleshooting untuk development Ordo.

## 📋 Dokumen

### [BUILD-STATUS.md](./BUILD-STATUS.md)
Status build terkini dan langkah-langkah selanjutnya. Cek file ini untuk mengetahui status kompilasi dan masalah yang sedang ditangani.

**Kapan menggunakan**: Sebelum memulai development atau ketika mengalami masalah build.

### [setup-anchor-build.md](./setup-anchor-build.md)
Panduan lengkap setup Anchor build environment dari awal. Mencakup instalasi Rust, Solana CLI, Anchor, dan konfigurasi environment.

**Kapan menggunakan**: Setup development environment pertama kali.

### [QUICK-FIX.md](./QUICK-FIX.md)
Solusi cepat untuk masalah build yang umum terjadi. Berisi command-command fix yang bisa langsung dijalankan.

**Kapan menggunakan**: Ketika build gagal dan butuh solusi cepat.

### [ANCHOR-BUILD-FIX-WINDOWS.md](../ANCHOR-BUILD-FIX-WINDOWS.md)
Troubleshooting khusus untuk Windows, termasuk masalah symlink, version mismatch, dan path issues.

**Kapan menggunakan**: Development di Windows dan mengalami masalah spesifik Windows.

### [ANCHOR-BUILD-TROUBLESHOOTING.md](../ANCHOR-BUILD-TROUBLESHOOTING.md)
Panduan troubleshooting lengkap untuk berbagai masalah Anchor build.

**Kapan menggunakan**: Masalah build yang kompleks atau tidak tercakup di QUICK-FIX.

## 🚀 Quick Start

### 1. First Time Setup
```bash
# Ikuti panduan lengkap
cat setup-anchor-build.md

# Atau gunakan automated script (Windows)
./fix-anchor-build.ps1
```

### 2. Build Issues
```bash
# Cek status terkini
cat BUILD-STATUS.md

# Coba quick fixes
cat QUICK-FIX.md

# Jalankan fix script
npm run fix:anchor
```

### 3. Windows Specific
```bash
# Baca troubleshooting Windows
cat ../ANCHOR-BUILD-FIX-WINDOWS.md

# Jalankan Windows fix script
./fix-solana-version.ps1
```

## 🔧 Common Issues

### Version Mismatch
**Gejala**: Error "solana-program version mismatch"

**Solusi**: Lihat [QUICK-FIX.md](./QUICK-FIX.md) section "Version Mismatch"

### Symlink Error (Windows)
**Gejala**: Error "failed to create symlink"

**Solusi**: Lihat [ANCHOR-BUILD-FIX-WINDOWS.md](../ANCHOR-BUILD-FIX-WINDOWS.md)

### Build Timeout
**Gejala**: Build stuck atau timeout

**Solusi**: Lihat [ANCHOR-BUILD-TROUBLESHOOTING.md](../ANCHOR-BUILD-TROUBLESHOOTING.md)

## 📊 Current Status

**Anchor Version**: 0.32.1 ✅  
**Solana Version**: 2.3.0 ✅  
**Build Status**: PASSING ✅  
**Last Updated**: February 21, 2026

## 🆘 Getting Help

1. Cek [BUILD-STATUS.md](./BUILD-STATUS.md) untuk status terkini
2. Coba solusi di [QUICK-FIX.md](./QUICK-FIX.md)
3. Baca troubleshooting guide yang relevan
4. Buka issue di GitHub jika masalah belum terdokumentasi

## 📝 Contributing

Jika menemukan solusi untuk masalah baru:

1. Tambahkan ke [QUICK-FIX.md](./QUICK-FIX.md) jika solusinya cepat
2. Tambahkan ke troubleshooting guide jika kompleks
3. Update [BUILD-STATUS.md](./BUILD-STATUS.md) jika mempengaruhi status build
4. Submit PR dengan deskripsi yang jelas

---

**Back to**: [Main Documentation](../README.md) | [Main README](../../README.md)
