// src/index.js
function handleMessage(message) {
    message = message.toLowerCase();

    if (message.includes("jadwal hari ini")) {
        return "📅 Jadwal hari ini: Belajar NLP jam 8 pagi!";
    }

    return "Maaf, saya belum mengerti perintah itu.";
}

module.exports = { handleMessage };
