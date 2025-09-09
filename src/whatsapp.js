const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const chalk = require("chalk");
const ScheduleBot = require("./bot");

// Inisialisasi bot jadwal
const bot = new ScheduleBot();

// Inisialisasi WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // ubah jadi false kalau mau lihat browsernya
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
});

// Event: QR Code untuk login
client.on("qr", (qr) => {
    console.clear();
    console.log(chalk.yellow("📱 Scan QR Code berikut untuk login WhatsApp:"));
    qrcode.generate(qr, { small: true });
});

// Event: Bot siap dipakai
client.on("ready", () => {
    console.log(chalk.green("✅ WhatsApp Bot berhasil terhubung!"));
});

// Event: Pesan masuk dari WhatsApp
client.on("message", async (msg) => {
    const chat = msg.body.trim();
    console.log(chalk.blue(`📩 Pesan dari ${msg.from}: ${chat}`));

    try {
        // Proses pesan menggunakan ScheduleBot
        const reply = bot.processMessage(chat);

        // Balas pesan kalau ada respon dari bot
        if (reply) {
            await msg.reply(reply);
            console.log(chalk.green(`🤖 Bot → ${msg.from}: ${reply}`));
        }
    } catch (error) {
        console.error(chalk.red("❌ Terjadi kesalahan:", error));
        await msg.reply("⚠️ Ups, ada kesalahan. Coba lagi nanti ya!");
    }
});

// Event: Jika autentikasi gagal
client.on("auth_failure", (msg) => {
    console.error(chalk.red("❌ Autentikasi gagal:", msg));
});

// Event: Jika koneksi terputus
client.on("disconnected", () => {
    console.log(chalk.red("❌ WhatsApp terputus. Menyambungkan ulang..."));
    client.initialize();
});

// Jalankan WhatsApp bot
client.initialize();
