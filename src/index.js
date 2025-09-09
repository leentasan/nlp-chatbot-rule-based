const fs = require('fs');
const path = require('path');
const readline = require('readline');
const jsPDF = require('jspdf');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Fuse = require('fuse.js');
const chalk = require('chalk');
const cron = require('node-cron');

class ScheduleBot {
    constructor() {
        this.dataFile = path.join(__dirname, 'data.json');
        this.backupDir = path.join(__dirname, 'backups');
        this.exportDir = path.join(__dirname, 'exports');
        this.initializeData();
        this.initializeDirectories();
        this.startReminderSystem();
    }

    // Initialize directories
    initializeDirectories() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    // Initialize JSON data file
    initializeData() {
        if (!fs.existsSync(this.dataFile)) {
            const initialData = { 
                schedules: [],
                settings: {
                    reminderEnabled: true,
                    defaultReminderMinutes: 30
                }
            };
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
            return { schedules: [], settings: {} };
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
        const timeRegex = /(?:jam|pukul)?\s*(\d{1,2})(?:[\.:](\d{2}))?\s*(?:(pagi|siang|sore|malam))?/i;
        const match = text.match(timeRegex);
        
        if (match) {
            let hour = parseInt(match[1]);
            const minute = match[2] ? parseInt(match[2]) : 0;
            const period = match[3] ? match[3].toLowerCase() : '';
            
            if (period === 'siang' && hour < 12) hour += 12;
            else if (period === 'sore' && hour < 12) hour += 12;
            else if (period === 'malam' && hour < 12) hour += 12;
            
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
        
        return '00:00';
    }

    // Format tanggal untuk display
    formatDisplayDate(dateStr) {
        const [day, month, year] = dateStr.split('-');
        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
                       'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${day} ${months[parseInt(month)]} ${year}`;
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
                return `✅ Jadwal '${activity}' ditambahkan untuk ${this.formatDisplayDate(date)} pukul ${time}`;
            } else {
                return '❌ Gagal menyimpan jadwal';
            }
        }
        
        return null;
    }

    // Rule 2: Lihat Jadwal
    viewSchedules(input) {
        const data = this.loadData();
        const schedules = data.schedules;
        
        if (schedules.length === 0) {
            return '📅 Belum ada jadwal yang tersimpan.';
        }

        // Filter berdasarkan tanggal
        let filteredSchedules = schedules;
        const today = new Date();
        const todayStr = this.parseDate('hari ini');
        const tomorrowStr = this.parseDate('besok');

        if (input.includes('hari ini')) {
            filteredSchedules = schedules.filter(s => s.date === todayStr);
        } else if (input.includes('besok')) {
            filteredSchedules = schedules.filter(s => s.date === tomorrowStr);
        } else if (input.includes('semua')) {
            filteredSchedules = schedules;
        }

        // Sort berdasarkan tanggal dan waktu
        filteredSchedules.sort((a, b) => {
            const dateA = new Date(a.date.split('-').reverse().join('-') + 'T' + a.time);
            const dateB = new Date(b.date.split('-').reverse().join('-') + 'T' + b.time);
            return dateA - dateB;
        });

        if (filteredSchedules.length === 0) {
            return '📅 Tidak ada jadwal untuk periode yang diminta.';
        }

        let result = '📅 **JADWAL KAMU:**\n\n';
        filteredSchedules.forEach((schedule, index) => {
            result += `${index + 1}. 📌 ${schedule.activity}\n`;
            result += `   📅 ${this.formatDisplayDate(schedule.date)} ⏰ ${schedule.time}\n\n`;
        });

        return result;
    }

    // Rule 3: Edit Jadwal
    editSchedule(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        // Extract kata kunci untuk mencari jadwal
        const editRegex = /(?:ubah|ganti|edit)\s+(?:jadwal\s+)?(.+?)(?:\s+(?:jadi|ke|menjadi)\s+(.+?))?$/i;
        const match = input.match(editRegex);

        if (!match) return null;

        const searchKey = match[1].trim();
        const newValue = match[2] ? match[2].trim() : null;

        // Cari jadwal berdasarkan aktivitas
        const foundSchedules = schedules.filter(s => 
            s.activity.toLowerCase().includes(searchKey.toLowerCase())
        );

        if (foundSchedules.length === 0) {
            return `❌ Tidak ditemukan jadwal dengan kata kunci "${searchKey}"`;
        }

        if (foundSchedules.length > 1) {
            let result = `🔍 Ditemukan ${foundSchedules.length} jadwal:\n\n`;
            foundSchedules.forEach((schedule, index) => {
                result += `${index + 1}. ${schedule.activity} - ${this.formatDisplayDate(schedule.date)} ${schedule.time}\n`;
            });
            result += '\nGunakan kata kunci yang lebih spesifik.';
            return result;
        }

        const schedule = foundSchedules[0];
        
        if (!newValue) {
            return `ℹ️ Jadwal ditemukan: "${schedule.activity}" pada ${this.formatDisplayDate(schedule.date)} ${schedule.time}.\nUntuk mengedit, gunakan format: "Ubah [jadwal lama] jadi [jadwal baru]"`;
        }

        // Deteksi jenis edit (waktu, tanggal, atau aktivitas)
        if (newValue.match(/\d{1,2}[:\.]\d{2}|jam\s+\d{1,2}|pukul\s+\d{1,2}/i)) {
            schedule.time = this.parseTime(newValue);
            schedule.activity = schedule.activity; // keep same
        } else if (newValue.match(/hari ini|besok|lusa|\d{1,2}[\s\/\-]\d{1,2}/i)) {
            schedule.date = this.parseDate(newValue);
        } else {
            schedule.activity = newValue;
        }

        if (this.saveData(data)) {
            return `✅ Jadwal berhasil diubah menjadi: "${schedule.activity}" pada ${this.formatDisplayDate(schedule.date)} ${schedule.time}`;
        } else {
            return '❌ Gagal mengubah jadwal';
        }
    }

    // Rule 4: Hapus Jadwal
    deleteSchedule(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        if (schedules.length === 0) {
            return '📅 Belum ada jadwal yang bisa dihapus.';
        }

        // Hapus semua jadwal
        if (input.match(/hapus\s+semua|hapus\s+all|bersih(?:kan)?/i)) {
            data.schedules = [];
            if (this.saveData(data)) {
                return '✅ Semua jadwal berhasil dihapus.';
            }
            return '❌ Gagal menghapus jadwal.';
        }

        // Extract kata kunci
        const deleteRegex = /(?:hapus|batalkan|delete)\s+(?:jadwal\s+)?(.+?)$/i;
        const match = input.match(deleteRegex);

        if (!match) return null;

        const searchKey = match[1].trim();

        // Cari jadwal berdasarkan aktivitas
        const foundIndex = schedules.findIndex(s => 
            s.activity.toLowerCase().includes(searchKey.toLowerCase())
        );

        if (foundIndex === -1) {
            return `❌ Tidak ditemukan jadwal dengan kata kunci "${searchKey}"`;
        }

        const deletedSchedule = schedules[foundIndex];
        schedules.splice(foundIndex, 1);

        if (this.saveData(data)) {
            return `✅ Jadwal "${deletedSchedule.activity}" pada ${this.formatDisplayDate(deletedSchedule.date)} berhasil dihapus.`;
        } else {
            return '❌ Gagal menghapus jadwal';
        }
    }

    // Rule 5: Cari Jadwal
    searchSchedules(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        if (schedules.length === 0) {
            return '📅 Belum ada jadwal untuk dicari.';
        }

        const searchRegex = /(?:cari|find|kapan)\s+(?:jadwal\s+)?(.+?)$/i;
        const match = input.match(searchRegex);

        if (!match) return null;

        const searchTerm = match[1].trim();

        // Setup Fuse.js for fuzzy search
        const options = {
            keys: ['activity'],
            threshold: 0.4,
            includeScore: true
        };

        const fuse = new Fuse(schedules, options);
        const results = fuse.search(searchTerm);

        if (results.length === 0) {
            return `🔍 Tidak ditemukan jadwal dengan kata kunci "${searchTerm}"`;
        }

        let response = `🔍 **HASIL PENCARIAN "${searchTerm}":**\n\n`;
        results.forEach((result, index) => {
            const schedule = result.item;
            const score = Math.round((1 - result.score) * 100);
            response += `${index + 1}. 📌 ${schedule.activity} (${score}% cocok)\n`;
            response += `   📅 ${this.formatDisplayDate(schedule.date)} ⏰ ${schedule.time}\n\n`;
        });

        return response;
    }

    // Rule 6: Reminder/Notifikasi
    getReminderSchedules(input) {
        const data = this.loadData();
        const schedules = data.schedules;
        const now = new Date();

        // Parse waktu reminder (default 1 jam)
        let reminderMinutes = 60;
        const reminderMatch = input.match(/(\d+)\s*(menit|jam|hari)/i);
        
        if (reminderMatch) {
            const value = parseInt(reminderMatch[1]);
            const unit = reminderMatch[2].toLowerCase();
            
            if (unit === 'menit') reminderMinutes = value;
            else if (unit === 'jam') reminderMinutes = value * 60;
            else if (unit === 'hari') reminderMinutes = value * 60 * 24;
        }

        const futureTime = new Date(now.getTime() + (reminderMinutes * 60000));

        const upcomingSchedules = schedules.filter(schedule => {
            const scheduleDateTime = new Date(
                schedule.date.split('-').reverse().join('-') + 'T' + schedule.time
            );
            return scheduleDateTime > now && scheduleDateTime <= futureTime;
        });

        if (upcomingSchedules.length === 0) {
            return `⏰ Tidak ada jadwal dalam ${reminderMinutes >= 60 ? Math.floor(reminderMinutes/60) + ' jam' : reminderMinutes + ' menit'} ke depan.`;
        }

        let response = `⏰ **REMINDER - Jadwal ${reminderMinutes >= 60 ? Math.floor(reminderMinutes/60) + ' jam' : reminderMinutes + ' menit'} ke depan:**\n\n`;
        
        upcomingSchedules.forEach((schedule, index) => {
            const scheduleDateTime = new Date(
                schedule.date.split('-').reverse().join('-') + 'T' + schedule.time
            );
            const timeDiff = Math.floor((scheduleDateTime - now) / 60000);
            
            response += `${index + 1}. 🔔 ${schedule.activity}\n`;
            response += `   📅 ${this.formatDisplayDate(schedule.date)} ⏰ ${schedule.time}\n`;
            response += `   ⏳ ${timeDiff} menit lagi\n\n`;
        });

        return response;
    }

    // Rule 7: Statistik Jadwal
    getScheduleStats(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        if (schedules.length === 0) {
            return '📊 Belum ada data jadwal untuk statistik.';
        }

        const now = new Date();
        const today = this.parseDate('hari ini');
        
        // Statistik dasar
        const totalSchedules = schedules.length;
        const todaySchedules = schedules.filter(s => s.date === today).length;
        
        // Statistik per hari
        const dateCount = {};
        schedules.forEach(schedule => {
            dateCount[schedule.date] = (dateCount[schedule.date] || 0) + 1;
        });

        // Hari paling sibuk
        const busiestDay = Object.keys(dateCount).reduce((a, b) => 
            dateCount[a] > dateCount[b] ? a : b
        );

        // Aktivitas paling sering
        const activityCount = {};
        schedules.forEach(schedule => {
            const activity = schedule.activity.toLowerCase();
            activityCount[activity] = (activityCount[activity] || 0) + 1;
        });

        const mostCommonActivity = Object.keys(activityCount).reduce((a, b) => 
            activityCount[a] > activityCount[b] ? a : b
        );

        let response = '📊 **STATISTIK JADWAL:**\n\n';
        response += `📈 Total jadwal: ${totalSchedules}\n`;
        response += `📅 Jadwal hari ini: ${todaySchedules}\n`;
        response += `🔥 Hari tersibuk: ${this.formatDisplayDate(busiestDay)} (${dateCount[busiestDay]} jadwal)\n`;
        response += `⭐ Aktivitas tersering: ${mostCommonActivity} (${activityCount[mostCommonActivity]}x)\n\n`;

        // Distribusi per hari (5 hari terbanyak)
        response += '📊 **TOP 5 HARI TERSIBUK:**\n';
        Object.entries(dateCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .forEach(([date, count], index) => {
                response += `${index + 1}. ${this.formatDisplayDate(date)}: ${count} jadwal\n`;
            });

        return response;
    }

    // Rule 8: Export/Backup
    exportSchedules(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        if (schedules.length === 0) {
            return '📁 Tidak ada jadwal untuk diekspor.';
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            if (input.includes('pdf')) {
                return this.exportToPDF(schedules, timestamp);
            } else if (input.includes('csv')) {
                return this.exportToCSV(schedules, timestamp);
            } else if (input.includes('backup')) {
                return this.createBackup(data, timestamp);
            } else {
                // Default export semua format
                const pdfResult = this.exportToPDF(schedules, timestamp);
                const csvResult = this.exportToCSV(schedules, timestamp);
                const backupResult = this.createBackup(data, timestamp);
                
                return `📁 **EXPORT LENGKAP:**\n${pdfResult}\n${csvResult}\n${backupResult}`;
            }
        } catch (error) {
            return `❌ Error saat export: ${error.message}`;
        }
    }

    exportToPDF(schedules, timestamp) {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('JADWAL SAYA', 20, 20);
        
        doc.setFontSize(10);
        doc.text(`Diekspor pada: ${new Date().toLocaleString('id-ID')}`, 20, 30);
        
        let yPos = 45;
        doc.setFontSize(12);
        
        schedules
            .sort((a, b) => {
                const dateA = new Date(a.date.split('-').reverse().join('-') + 'T' + a.time);
                const dateB = new Date(b.date.split('-').reverse().join('-') + 'T' + b.time);
                return dateA - dateB;
            })
            .forEach((schedule, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.text(`${index + 1}. ${schedule.activity}`, 20, yPos);
                doc.text(`   ${this.formatDisplayDate(schedule.date)} - ${schedule.time}`, 20, yPos + 8);
                yPos += 20;
            });

        const filename = `jadwal_${timestamp}.pdf`;
        const filepath = path.join(this.exportDir, filename);
        doc.save(filepath);

        return `✅ PDF diekspor: ${filepath}`;
    }

    exportToCSV(schedules, timestamp) {
        const filename = `jadwal_${timestamp}.csv`;
        const filepath = path.join(this.exportDir, filename);

        const csvWriter = createCsvWriter({
            path: filepath,
            header: [
                {id: 'activity', title: 'Aktivitas'},
                {id: 'date', title: 'Tanggal'},
                {id: 'time', title: 'Waktu'},
                {id: 'created', title: 'Dibuat'}
            ]
        });

        const records = schedules.map(schedule => ({
            activity: schedule.activity,
            date: schedule.date,
            time: schedule.time,
            created: new Date(schedule.created).toLocaleString('id-ID')
        }));

        csvWriter.writeRecords(records);
        return `✅ CSV diekspor: ${filepath}`;
    }

    createBackup(data, timestamp) {
        const filename = `backup_${timestamp}.json`;
        const filepath = path.join(this.backupDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        return `✅ Backup dibuat: ${filepath}`;
    }

    // Reminder system dengan cron
    startReminderSystem() {
        // Cek setiap 30 menit untuk reminder
        cron.schedule('*/30 * * * *', () => {
            const data = this.loadData();
            if (!data.settings || !data.settings.reminderEnabled) return;

            const now = new Date();
            const reminderTime = new Date(now.getTime() + (30 * 60000)); // 30 menit ke depan

            const upcomingSchedules = data.schedules.filter(schedule => {
                const scheduleDateTime = new Date(
                    schedule.date.split('-').reverse().join('-') + 'T' + schedule.time
                );
                return scheduleDateTime > now && scheduleDateTime <= reminderTime;
            });

            if (upcomingSchedules.length > 0) {
                console.log(chalk.yellow('\n🔔 REMINDER OTOMATIS:'));
                upcomingSchedules.forEach(schedule => {
                    console.log(chalk.cyan(`⏰ ${schedule.activity} - ${schedule.time}`));
                });
                console.log(''); // newline
            }
        });
    }

    // Help/Bantuan yang diupdate
    showHelp() {
        return `🤖 **SCHEDBOT - Bantuan Lengkap:**

📝 **MENGELOLA JADWAL:**
   • Tambah: "Tambah jadwal meeting besok jam 10"
   • Lihat: "Lihat jadwal hari ini", "Jadwal besok apa?"
   • Edit: "Ubah meeting jadi jam 15", "Ganti rapat ke besok"
   • Hapus: "Hapus jadwal meeting", "Batalkan semua jadwal"

🔍 **PENCARIAN & REMINDER:**
   • Cari: "Cari jadwal meeting", "Kapan ada rapat?"
   • Reminder: "Reminder 1 jam", "Jadwal 30 menit ke depan"

📊 **ANALISIS & EXPORT:**
   • Statistik: "Statistik jadwal", "Berapa jadwal minggu ini?"
   • Export: "Export pdf", "Backup jadwal", "Export semua"

❓ **BANTUAN:** "help", "bantuan"

💡 **Tips:** Gunakan bahasa natural Indonesia untuk interaksi yang lebih mudah!`;
    }

    // Main processing function
    processMessage(input) {
        const message = input.trim().toLowerCase();
        
        try {
            // Rule 1: Tambah Jadwal
            if (message.match(/(?:tambah|buat|jadwal(?:kan)?)/i)) {
                const result = this.addSchedule(input);
                if (result) return result;
            }
            
            // Rule 2: Lihat Jadwal
            if (message.match(/(?:lihat|tampilkan|show)\s+(?:jadwal|schedule)/i) || 
                message.match(/jadwal\s+(?:hari ini|besok|semua)/i)) {
                return this.viewSchedules(input);
            }
            
            // Rule 3: Edit Jadwal
            if (message.match(/(?:ubah|ganti|edit)\s+(?:jadwal\s+)?/i)) {
                const result = this.editSchedule(input);
                if (result) return result;
            }
            
            // Rule 4: Hapus Jadwal
            if (message.match(/(?:hapus|batalkan|delete)\s+/i)) {
                const result = this.deleteSchedule(input);
                if (result) return result;
            }
            
            // Rule 5: Cari Jadwal
            if (message.match(/(?:cari|find|kapan)\s+/i)) {
                const result = this.searchSchedules(input);
                if (result) return result;
            }
            
            // Rule 6: Reminder
            if (message.match(/(?:reminder|ingatkan|jadwal)\s+.*(?:menit|jam|hari)/i) ||
                message.includes('akan datang')) {
                return this.getReminderSchedules(input);
            }
            
            // Rule 7: Statistik
            if (message.match(/(?:statistik|stats|berapa\s+jadwal|analisis)/i)) {
                return this.getScheduleStats(input);
            }
            
            // Rule 8: Export/Backup
            if (message.match(/(?:export|backup|ekspor|simpan)/i)) {
                return this.exportSchedules(input);
            }
            
            // Help
            if (message.match(/^(?:help|bantuan|apa\s+yang\s+bisa|perintah)$/i)) {
                return this.showHelp();
            }
            
        } catch (error) {
            console.error('Error processing message:', error);
            return '❌ Terjadi kesalahan saat memproses pesan. Coba lagi nanti.';
        }
        
        // Fallback dengan reflection
        const reflected = this.reflectPronouns(input);
        return `🤖 Maaf, saya tidak mengerti "${reflected}". Ketik "bantuan" untuk melihat perintah yang tersedia.`;
    }

    // CLI Interface
    startCLI() {
        console.log(chalk.cyan('🤖 SCHEDBOT - Schedule Assistant'));
        console.log(chalk.green('Ketik "bantuan" untuk melihat perintah yang tersedia'));
        console.log(chalk.yellow('Ketik "exit" untuk keluar\n'));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = () => {
            rl.question(chalk.blue('You: '), (input) => {
                if (input.toLowerCase() === 'exit') {
                    console.log(chalk.magenta('👋 Sampai jumpa!'));
                    rl.close();
                    return;
                }

                const response = this.processMessage(input);
                console.log(chalk.white(`Bot: ${response}\n`));
                askQuestion();
            });
        };

        askQuestion();
    }

    // API untuk integrasi dengan WhatsApp atau web interface
    processMessageAPI(input, userId = null) {
        return {
            status: 'success',
            message: this.processMessage(input),
            timestamp: new Date().toISOString(),
            userId: userId
        };
    }

    // Health check untuk monitoring
    healthCheck() {
        try {
            const data = this.loadData();
            return {
                status: 'healthy',
                totalSchedules: data.schedules ? data.schedules.length : 0,
                dataFileExists: fs.existsSync(this.dataFile),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export untuk testing dan integrasi
module.exports = ScheduleBot;

// Jalankan CLI jika file ini dijalankan langsung
if (require.main === module) {
    const bot = new ScheduleBot();
    console.log(chalk.green('🚀 Starting ScheduleBot...'));
    console.log(chalk.yellow('📁 Data akan disimpan di:', bot.dataFile));
    console.log(chalk.yellow('📦 Export folder:', bot.exportDir));
    console.log(chalk.yellow('💾 Backup folder:', bot.backupDir));
    console.log('');
    bot.startCLI();
}