const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Menyimpan data login akun tumbal di folder lokal agar tidak logout terus
const folderDataLogin = path.join(__dirname, 'session_tumbal');

app.post('/api/follow-target', async (req, res) => {
    const { targetFollow } = req.body;

    if (!targetFollow) {
        return res.status(400).json({ success: false, message: "Username target kosong!" });
    }

    // Jalankan browser dengan session yang tersimpan
    const browser = await puppeteer.launch({
        headless: false, // Set ke 'false' supaya lu bisa liat prosesnya & login manual pertama kali
        defaultViewport: null,
        args: [
            `--user-data-dir=${folderDataLogin}`, // KUNCI UTAMA: Menyimpan session/cookies
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Buka profil target langsung
        await page.goto(`https://www.instagram.com/${targetFollow}/`, { waitUntil: 'networkidle2' });

        // CEK: Apakah sudah login? Jika belum, script akan menunggu lu login manual di browser yang kebuka
        const perluLogin = await page.evaluate(() => {
            return document.body.innerText.includes('Log In') || document.body.innerText.includes('Masuk');
        });

        if (perluLogin) {
            console.log("=== SILAHKAN LOGIN MANUAL DI BROWSER YANG TERBUKA ===");
            // Beri waktu 45 detik untuk lu ketik username/password & verifikasi di browser secara manual
            await new Promise(r => setTimeout(r, 45000)); 
            // Setelah login sekali, ke depannya proses ini akan dilewati otomatis
        }

        // Cari tombol Follow
        // Selektor dinamis: mencari elemen button yang mengandung teks Follow/Ikuti
        await page.waitForSelector('button', { timeout: 15000 });
        
        const infoSukses = await page.evaluate((target) => {
            const tombol = Array.from(document.querySelectorAll('button'));
            const targetTombol = tombol.find(b => 
                b.textContent.includes('Follow') || 
                b.textContent.includes('Ikuti')
            );

            if (targetTombol) {
                targetTombol.click();
                return true;
            }
            return false;
        }, targetFollow);

        // Kasih jeda 5 detik biar Instagram gak curiga
        await new Promise(r => setTimeout(r, 5000));
        await browser.close();

        if (infoSukses) {
            res.json({ success: true, message: `Sukses! Akun tumbal berhasil mem-follow @${targetFollow}` });
        } else {
            res.json({ success: false, message: `Gagal. Tombol follow tidak ditemukan, mungkin sudah di-follow.` });
        }

    } catch (error) {
        if (browser) await browser.close();
        console.error(error);
        res.status(500).json({ success: false, message: "Terjadi error saat menjalankan bot." });
    }
});

app.listen(3000, () => {
    console.log('Bot pribadi berjalan di http://localhost:3000');
});
