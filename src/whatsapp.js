// src/whatsapp.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { handleMessage } = require("./index"); // ambil handler dari index.js

// Setup WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),  // simpan sesi di lokal
    puppeteer: {
        headless: true,             // true = tanpa tampilan browser
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Event QR
client.on("qr", qr => {
    console.log("📱 Scan QR Code ini di WhatsApp (Linked Devices):");
    qrcode.generate(qr, { small: true });
});

// Event ready
client.on("ready", () => {
    console.log("✅ WhatsApp Client is ready!");
});

// Event pesan masuk
client.on("message", async msg => {
    console.log(`📩 Dari ${msg.from}: ${msg.body}`);

    const reply = handleMessage(msg.body);
    if (reply) {
        await msg.reply(reply);
    }
});

// Mulai client
client.initialize();
