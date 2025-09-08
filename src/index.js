const fs = require('fs');
const path = require('path');
const readline = require('readline');

class ScheduleBot {
    constructor() {
        this.dataFile = path.join(__dirname, 'data.json');
        this.initializeData();
    }

    // Initialize JSON data file
    initializeData() {
        if (!fs.existsSync(this.dataFile)) {
            const initialData = { schedules: [] };
            fs.writeFileSync(this.dataFile, JSON.stringify(initialData, null, 2));
        }
    }

    // Load data from JSON
    loadData() {
        try {
            const data = fs.readFileSync(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading data:', error);
            return { schedules: [] };
        }
    }

    // Save data to JSON
    saveData(data) {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // Reflection untuk kata ganti
    reflectPronouns(text) {
        const reflections = {
            'saya': 'kamu',
            'aku': 'kamu', 
            'gue': 'lu',
            'gua': 'lu',
            'kamu': 'saya',
            'lu': 'gue',
            'punyaku': 'punyamu',
            'punyamu': 'punyaku',
            'milikku': 'milikmu',
            'milikmu': 'milikku'
        };

        let reflected = text.toLowerCase();
        for (const [original, replacement] of Object.entries(reflections)) {
            const regex = new RegExp(`\\b${original}\\b`, 'gi');
            reflected = reflected.replace(regex, replacement);
        }
        return reflected;
    }

    // Parse tanggal dari input natural language
    parseDate(dateStr) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Format: DD-MM-YYYY
        const formatDate = (date) => {
            return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        };

        if (dateStr.includes('hari ini')) {
            return formatDate(today);
        } else if (dateStr.includes('besok')) {
            return formatDate(tomorrow);
        } else if (dateStr.includes('lusa')) {
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(today.getDate() + 2);
            return formatDate(dayAfterTomorrow);
        }

        // Parse format tanggal: "10 September", "10/9", "10-9"
        const dateRegex = /(\d{1,2})[\s\/\-](September|Oktober|November|Desember|januari|februari|maret|april|mei|juni|juli|agustus|\d{1,2})/i;
        const match = dateStr.match(dateRegex);
        
        if (match) {
            const day = parseInt(match[1]);
            let month;
            
            if (isNaN(parseInt(match[2]))) {
                const months = {
                    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
                    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
                    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
                };
                month = months[match[2].toLowerCase()];
            } else {
                month = parseInt(match[2]);
            }
            
            const year = today.getFullYear();
            return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
        }

        return formatDate(today); // default ke hari ini
    }

    // Parse waktu dari input
    parseTime(text) {
        // Regex untuk mendeteksi jam: "jam 14", "14.00", "14:00", "2 siang", "pukul 15"
        const timeRegex = /(?:jam|pukul)?\s*(\d{1,2})(?:[\.:](\d{2}))?\s*(?:(pagi|siang|sore|malam))?/i;
        const match = text.match(timeRegex);
        
        if (match) {
            let hour = parseInt(match[1]);
            const minute = match[2] ? parseInt(match[2]) : 0;
            const period = match[3] ? match[3].toLowerCase() : '';
            
            // Konversi ke 24 jam jika perlu
            if (period === 'siang' && hour < 12) hour += 12;
            else if (period === 'sore' && hour < 12) hour += 12;
            else if (period === 'malam' && hour < 12) hour += 12;
            
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
        
        return '00:00'; // default
    }

    // Rule 1: Tambah Jadwal
    addSchedule(input) {
        const addRegex = /(?:tambah|buat|jadwal(?:kan)?)\s+(?:jadwal\s+)?(.+?)(?:\s+(?:untuk\s+|pada\s+|di\s+)?(.+?))?(?:\s+(?:jam|pukul)\s+(.+?))?$/i;
        const match = input.match(addRegex);
        
        if (match) {
            const activity = match[1].trim();
            const dateStr = match[2] || 'hari ini';
            const timeStr = match[3] || input;
            
            const date = this.parseDate(dateStr);
            const time = this.parseTime(input);
            
            const data = this.loadData();
            const newSchedule = {
                id: Date.now(),
                activity: activity,
                date: date,
                time: time,
                created: new Date().toISOString()
            };
            
            data.schedules.push(newSchedule);
            
            if (this.saveData(data)) {
                return `✅ Jadwal '${activity}' ditambahkan untuk ${date} pukul ${time}`;
            } else {
                return '❌ Gagal menyimpan jadwal';
            }
        }
        
        return null;
    }
    

    // Rule 6: Help/Bantuan
    showHelp() {
        return `🤖 SCHEDBOT - Bantuan Perintah:

📝 Menambah jadwal:
   "Tambah jadwal meeting besok jam 10"
   "Jadwalkan rapat hari ini pukul 14.00"


❓ Bantuan: "help", "bantuan"`;
    }

    // Main processing function
    processMessage(input) {
        const message = input.trim().toLowerCase();
        
        // Rule 1: Tambah Jadwal
        if (message.match(/(?:tambah|buat|jadwal(?:kan)?)/i)) {
            const result = this.addSchedule(input);
            if (result) return result;
        }
        
        // Rule 2 sampai 5 sedang dibuat
        
        // Rule 6: Help
        if (message.match(/^(?:help|bantuan|apa\s+yang\s+bisa|perintah)$/i)) {
            return this.showHelp();
        }
        
        // Fallback dengan reflection
        const reflected = this.reflectPronouns(input);
        return `🤖 Maaf, saya tidak mengerti "${reflected}". Ketik "bantuan" untuk melihat perintah yang tersedia.`;
    }

    // CLI Interface
    startCLI() {
        console.log('🤖 SCHEDBOT - Schedule Assistant');
        console.log('Ketik "bantuan" untuk melihat perintah yang tersedia');
        console.log('Ketik "exit" untuk keluar\n');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = () => {
            rl.question('You: ', (input) => {
                if (input.toLowerCase() === 'exit') {
                    console.log('👋 Sampai jumpa!');
                    rl.close();
                    return;
                }

                const response = this.processMessage(input);
                console.log(`Bot: ${response}\n`);
                askQuestion();
            });
        };

        askQuestion();
    }
}

// Export untuk testing dan integrasi
module.exports = ScheduleBot;

// Jalankan CLI jika file ini dijalankan langsung
if (require.main === module) {
    const bot = new ScheduleBot();
    bot.startCLI();
}