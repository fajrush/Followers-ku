const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(455).json({ success: false, message: "Metode tidak diizinkan" });
    }

    const { targetFollow, cookies } = req.body;

    if (!targetFollow || !cookies) {
        return res.status(400).json({ success: false, message: "Data input kurang lengkap." });
    }

    let browser = null;

    try {
        // Konfigurasi Puppeteer khusus untuk spec Vercel Serverless
        browser = await puppeteer.launch({
            args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: true, // WAJIB TRUE di Vercel
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Set Cookies akun tumbal ke browser agar otomatis login
        await page.setCookie(...cookies);

        // Buka langsung profile instagram target
        await page.goto(`https://www.instagram.com/${targetFollow}/`, { 
            waitUntil: 'networkidle2',
            timeout: 25000 
        });

        // Cari tombol follow
        await page.waitForSelector('button', { timeout: 5000 });
        
        const isClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const followBtn = buttons.find(b => 
                b.textContent.includes('Follow') || 
                b.textContent.includes('Ikuti')
            );
            if (followBtn) {
                followBtn.click();
                return true;
            }
            return false;
        });

        await browser.close();

        if (isClicked) {
            return res.status(200).json({ success: true, message: `Sukses! Akun tumbal berhasil mem-follow @${targetFollow}` });
        } else {
            return res.status(200).json({ success: false, message: "Gagal. Tombol follow tidak ditemukan (mungkin sudah difollow)." });
        }

    } catch (error) {
        if (browser !== null) await browser.close();
        console.error(error);
        return res.status(500).json({ success: false, message: `Error: ${error.message}` });
    }
}
