// src/bot.js - FIXED VERSION
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Fuse = require('fuse.js');
const chalk = require('chalk');
const cron = require('node-cron');

// Import utility classes
const NLPHelpers = require('./utils/nlpHelper');

class ScheduleBot {
    constructor() {
        this.dataFile = path.join(__dirname, '../data/data.json');
        this.backupDir = path.join(__dirname, '../backups');
        this.exportDir = path.join(__dirname, '../exports');
        this.initializeDirectories();
        this.initializeData();
        this.startReminderSystem();
    }

    initializeDirectories() {
        const dirs = [
            path.join(__dirname, '../data'),
            this.backupDir,
            this.exportDir
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

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

    loadData() {
        try {
            const data = fs.readFileSync(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading data:', error);
            return { schedules: [], settings: {} };
        }
    }

    saveData(data) {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // FIXED: RULE 1 - Tambah Jadwal
    addSchedule(input) {
        const addRegex = /^(?:tambah|buat|jadwalkan|schedule)\s+(.+?)$/i;
        const match = input.match(addRegex);
        
        if (!match) return null;

        const fullText = match[1].trim();
        const activity = NLPHelpers.extractActivity(fullText);
        
        // FIXED: Extract date and time properly
        const dateStr = NLPHelpers.extractDatePattern(input) || 'hari ini';
        const date = NLPHelpers.parseDate(dateStr);
        const time = NLPHelpers.parseTime(input);
        
        const validation = NLPHelpers.validateScheduleInput(activity, date, time);
        if (!validation.isValid) {
            return `❌ ${validation.errors.join(', ')}`;
        }
        
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
            return `✅ Jadwal '${activity}' ditambahkan untuk ${NLPHelpers.formatDisplayDate(date)} pukul ${time}`;
        } else {
            return '❌ Gagal menyimpan jadwal';
        }
    }

    // FIXED: RULE 2 - View Schedules with proper format
    viewSchedules(input) {
        const data = this.loadData();
        const schedules = data.schedules || [];
        
        if (schedules.length === 0) {
            return '📅 Belum ada jadwal yang tersimpan.';
        }

        const todayStr = NLPHelpers.parseDate('hari ini');
        const tomorrowStr = NLPHelpers.parseDate('besok');

        let filteredSchedules;
        const lower = (input || '').toLowerCase();
        
        if (lower.includes('hari ini')) {
            filteredSchedules = schedules.filter(s => s.date === todayStr);
        } else if (lower.includes('besok')) {
            filteredSchedules = schedules.filter(s => s.date === tomorrowStr);
        } else if (lower.includes('semua')) {
            filteredSchedules = schedules.slice();
        } else {
            // Default to today
            filteredSchedules = schedules.filter(s => s.date === todayStr);
        }

        if (filteredSchedules.length === 0) {
            return '📅 Tidak ada jadwal untuk periode yang diminta.';
        }

        // FIXED: Sort by date and time properly
        filteredSchedules.sort((a, b) => {
            const dateA = new Date(a.date.split('-').reverse().join('-') + 'T' + a.time);
            const dateB = new Date(b.date.split('-').reverse().join('-') + 'T' + b.time);
            return dateA - dateB;
        });

        // FIXED: Group by date and format correctly
        const grouped = {};
        filteredSchedules.forEach(s => {
            if (!grouped[s.date]) grouped[s.date] = [];
            grouped[s.date].push(s);
        });

        let result = '';
        Object.keys(grouped)
            .sort((a, b) => {
                const dateA = new Date(a.split('-').reverse().join('-'));
                const dateB = new Date(b.split('-').reverse().join('-'));
                return dateA - dateB;
            })
            .forEach(date => {
                result += `JADWAL ${NLPHelpers.formatDisplayDate(date)}\n`;
                grouped[date]
                    .sort((x, y) => x.time.localeCompare(y.time))
                    .forEach(s => {
                        const timeDot = s.time.replace(':', '.');
                        result += `- ${s.activity.toUpperCase()} ${timeDot}\n`;
                    });
                result += '\n';
            });

        return result.trim();
    }

    // FIXED: RULE 3 - Edit Schedule with better matching
    editSchedule(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        const editRegex = /^(?:ubah|ganti|edit)\s+(.+?)(?:\s+(?:jadi|ke|menjadi)\s+(.+?))?$/i;
        const match = input.match(editRegex);

        if (!match) return null;

        const searchKey = match[1].trim();
        const newValue = match[2] ? match[2].trim() : null;

        // FIXED: Better schedule matching including time with dots
        const foundSchedules = schedules.filter(s => {
            const activityMatch = s.activity.toLowerCase().includes(searchKey.toLowerCase());
            const timeMatch = searchKey.includes(s.time) || 
                             s.time.includes(searchKey.replace('.', ':')) ||
                             searchKey.includes(s.time.replace(':', '.'));
            const combinedMatch = `${s.activity} ${s.time}`.toLowerCase().includes(searchKey.toLowerCase()) ||
                                `${s.activity} ${s.time.replace(':', '.')}`.toLowerCase().includes(searchKey.toLowerCase());
            return activityMatch || timeMatch || combinedMatch;
        });

        if (foundSchedules.length === 0) {
            return `❌ Tidak ditemukan jadwal dengan kata kunci "${searchKey}"`;
        }

        if (foundSchedules.length > 1 && !newValue) {
            let result = `🔍 Ditemukan ${foundSchedules.length} jadwal:\n\n`;
            foundSchedules.forEach((schedule, index) => {
                result += `${index + 1}. ${schedule.activity} - ${NLPHelpers.formatDisplayDate(schedule.date)} ${schedule.time}\n`;
            });
            result += '\n💡 Tips: Gunakan kata kunci yang lebih spesifik seperti "ubah makan 08:00 jadi 10:00"';
            return result;
        }

        let schedule = foundSchedules[0];
        
        if (!newValue) {
            return `ℹ️ Jadwal ditemukan: "${schedule.activity}" pada ${NLPHelpers.formatDisplayDate(schedule.date)} ${schedule.time}.\nUntuk mengedit, gunakan format: "Ubah [jadwal lama] jadi [jadwal baru]"`;
        }

        // FIXED: Better detection of edit type
        if (newValue.match(/\d{1,2}[\.:]?\d{2}|jam\s+\d{1,2}|pukul\s+\d{1,2}/i)) {
            schedule.time = NLPHelpers.parseTime(newValue);
        } else if (newValue.match(/hari ini|besok|lusa|tanggal\s*\d+|\d{1,2}[\s\/\-]\d{1,2}/i)) {
            schedule.date = NLPHelpers.parseDate(newValue);
        } else {
            schedule.activity = newValue;
        }

        if (this.saveData(data)) {
            return `✅ Jadwal berhasil diubah menjadi: "${schedule.activity}" pada ${NLPHelpers.formatDisplayDate(schedule.date)} ${schedule.time}`;
        } else {
            return '❌ Gagal mengubah jadwal';
        }
    }

    // FIXED: RULE 4 - Delete Schedule
    deleteSchedule(input) {
        const data = this.loadData();
        const schedules = data.schedules || [];

        if (schedules.length === 0) {
            return '📅 Belum ada jadwal yang bisa dihapus.';
        }

        // FIXED: Delete all schedules
        if (input.match(/^(?:hapus|batalkan)\s+semua\s*(?:jadwal)?$/i) || 
            input.match(/^(?:bersihkan|clear)\s*(?:jadwal)?$/i)) {
            data.schedules = [];
            if (this.saveData(data)) {
                return '✅ Semua jadwal berhasil dihapus.';
            }
            return '❌ Gagal menghapus jadwal.';
        }

        // FIXED: Delete all schedules with keyword
        const deleteAllRegex = /^(?:hapus|batalkan)\s+semua\s+(?:jadwal\s+)?(.+?)$/i;
        const allMatch = input.match(deleteAllRegex);
        if (allMatch) {
            const keyword = allMatch[1].trim();
            const initialCount = schedules.length;
            data.schedules = schedules.filter(s => 
                !s.activity.toLowerCase().includes(keyword.toLowerCase())
            );
            const deletedCount = initialCount - data.schedules.length;
            
            if (deletedCount > 0) {
                if (this.saveData(data)) {
                    return `✅ Berhasil menghapus ${deletedCount} jadwal yang mengandung "${keyword}".`;
                }
                return '❌ Gagal menghapus jadwal.';
            } else {
                return `❌ Tidak ditemukan jadwal dengan kata kunci "${keyword}".`;
            }
        }

        const deleteRegex = /^(?:hapus|batalkan|delete)\s+(.+?)$/i;
        const match = input.match(deleteRegex);
        if (!match) return null;

        const searchKey = match[1].trim().toLowerCase();

        const indexed = schedules.map((s, idx) => ({ schedule: s, index: idx }));
        const found = indexed.filter(item =>
            item.schedule.activity.toLowerCase().includes(searchKey) ||
            (`${item.schedule.activity} ${item.schedule.time}`).toLowerCase().includes(searchKey) ||
            (`${item.schedule.activity} ${item.schedule.time.replace(':', '.')}`).toLowerCase().includes(searchKey)
        );

        if (found.length === 0) {
            return `❌ Tidak ditemukan jadwal dengan kata kunci "${searchKey}"`;
        }

        if (found.length > 1) {
            let result = `🔍 Ditemukan ${found.length} jadwal:\n\n`;
            found.forEach((item, idx) => {
                result += `${idx + 1}. ${item.schedule.activity} - ${NLPHelpers.formatDisplayDate(item.schedule.date)} ${item.schedule.time}\n`;
            });
            result += '\n💡 Gunakan kata kunci yang lebih spesifik seperti "hapus makan 08:00"';
            return result;
        }

        const deletedSchedule = found[0].schedule;
        schedules.splice(found[0].index, 1);
        data.schedules = schedules;

        if (this.saveData(data)) {
            return `✅ Jadwal "${deletedSchedule.activity}" pada ${NLPHelpers.formatDisplayDate(deletedSchedule.date)} berhasil dihapus.`;
        } else {
            return '❌ Gagal menghapus jadwal';
        }
    }

    // FIXED: RULE 5 - Search Schedules
    searchSchedules(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        if (schedules.length === 0) {
            return '📅 Belum ada jadwal untuk dicari.';
        }

        const searchRegex = /^(?:cari|find)\s+(.+?)$|^kapan\s+(?:ada\s+)?(.+?)$/i;
        const match = input.match(searchRegex);

        if (!match) return null;

        let searchTerm = (match[1] || match[2]).trim();
        
        // FIXED: Remove "ada" from search term
        searchTerm = searchTerm.replace(/^ada\s+/, '');

        if (searchTerm.length < 2) {
            return `❌ Kata kunci "${searchTerm}" terlalu pendek. Gunakan kata kunci yang lebih spesifik.`;
        }

        const options = {
            keys: ['activity'],
            threshold: 0.6,
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
            response += `   📅 ${NLPHelpers.formatDisplayDate(schedule.date)} ⏰ ${schedule.time}\n\n`;
        });

        return response;
    }

    // FIXED: RULE 6 - Reminder with proper number word parsing
    getReminderSchedules(input) {
        const data = this.loadData();
        const schedules = data.schedules;
        const now = new Date();

        let reminderMinutes = 60; // default
        
        // FIXED: Parse Indonesian number words properly
        const processedInput = NLPHelpers.parseNumberWords(input);
        const reminderMatch = processedInput.match(/(\d+)\s*(menit|jam|hari)/i);
        
        if (reminderMatch) {
            const value = parseInt(reminderMatch[1], 10);
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

        const timeUnit = reminderMinutes >= 1440
            ? `${Math.floor(reminderMinutes/1440)} hari`
            : (reminderMinutes >= 60
                ? `${Math.floor(reminderMinutes/60)} jam`
                : `${reminderMinutes} menit`);

        if (upcomingSchedules.length === 0) {
            return `⏰ Tidak ada jadwal dalam ${timeUnit} ke depan.`;
        }
        
        let response = `⏰ **REMINDER - Jadwal ${timeUnit} ke depan:**\n\n`;
        
        upcomingSchedules.forEach((schedule, index) => {
            const scheduleDateTime = new Date(
                schedule.date.split('-').reverse().join('-') + 'T' + schedule.time
            );
            const timeDiff = Math.floor((scheduleDateTime - now) / 60000);
            
            response += `${index + 1}. 🔔 ${schedule.activity}\n`;
            response += `   📅 ${NLPHelpers.formatDisplayDate(schedule.date)} ⏰ ${schedule.time}\n`;
            response += `   ⏳ ${timeDiff} menit lagi\n\n`;
        });

        return response;
    }

    getScheduleStats(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        if (schedules.length === 0) {
            return '📊 Belum ada data jadwal untuk statistik.';
        }

        const totalSchedules = schedules.length;
        const today = NLPHelpers.parseDate('hari ini');
        const todaySchedules = schedules.filter(s => s.date === today).length;
        
        const dateCount = {};
        schedules.forEach(schedule => {
            dateCount[schedule.date] = (dateCount[schedule.date] || 0) + 1;
        });

        const busiestDay = Object.keys(dateCount).reduce((a, b) => 
            dateCount[a] > dateCount[b] ? a : b
        );

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
        response += `🔥 Hari tersibuk: ${NLPHelpers.formatDisplayDate(busiestDay)} (${dateCount[busiestDay]} jadwal)\n`;
        response += `⭐ Aktivitas tersering: ${mostCommonActivity} (${activityCount[mostCommonActivity]}x)\n\n`;

        response += '📊 **TOP 5 HARI TERSIBUK:**\n';
        Object.entries(dateCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .forEach(([date, count], index) => {
                response += `${index + 1}. ${NLPHelpers.formatDisplayDate(date)}: ${count} jadwal\n`;
            });

        return response;
    }

    // FIXED: Export without jsPDF dependency
    exportSchedules(input) {
        const data = this.loadData();
        const schedules = data.schedules;

        if (schedules.length === 0) {
            return '📁 Tidak ada jadwal untuk diekspor.';
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            if (input.includes('pdf') || input.includes('text')) {
                return this.exportToText(schedules, timestamp);
            } else if (input.includes('csv')) {
                return this.exportToCSV(schedules, timestamp);
            } else if (input.includes('backup')) {
                return this.createBackup(data, timestamp);
            } else {
                const csvResult = this.exportToCSV(schedules, timestamp);
                const backupResult = this.createBackup(data, timestamp);
                
                return `📁 **EXPORT LENGKAP:**\n${csvResult}\n${backupResult}`;
            }
        } catch (error) {
            return `❌ Error saat export: ${error.message}`;
        }
    }

    exportToText(schedules, timestamp) {
        try {
            const filename = `jadwal_${timestamp}.txt`;
            const filepath = path.join(this.exportDir, filename);
            
            let content = 'JADWAL SAYA\n';
            content += '='.repeat(50) + '\n\n';
            content += `Diekspor pada: ${new Date().toLocaleString('id-ID')}\n\n`;
            
            schedules
                .sort((a, b) => {
                    const dateA = new Date(a.date.split('-').reverse().join('-') + 'T' + a.time);
                    const dateB = new Date(b.date.split('-').reverse().join('-') + 'T' + b.time);
                    return dateA - dateB;
                })
                .forEach((schedule, index) => {
                    content += `${index + 1}. ${schedule.activity}\n`;
                    content += `   ${NLPHelpers.formatDisplayDate(schedule.date)} - ${schedule.time}\n\n`;
                });

            fs.writeFileSync(filepath, content);
            return `✅ File text diekspor: ${filename}`;
        } catch (error) {
            return `❌ Error export text: ${error.message}`;
        }
    }

    exportToCSV(schedules, timestamp) {
        try {
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

            csvWriter.writeRecords(records).catch(err => {
                console.error('CSV write error:', err);
            });
            return `✅ CSV diekspor: ${filename}`;
        } catch (error) {
            return `❌ Error export CSV: ${error.message}`;
        }
    }

    createBackup(data, timestamp) {
        try {
            const filename = `backup_${timestamp}.json`;
            const filepath = path.join(this.backupDir, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
            return `✅ Backup dibuat: ${filename}`;
        } catch (error) {
            return `❌ Error backup: ${error.message}`;
        }
    }

    startReminderSystem() {
        cron.schedule('*/30 * * * *', () => {
            const data = this.loadData();
            if (!data.settings || !data.settings.reminderEnabled) return;

            const now = new Date();
            const reminderTime = new Date(now.getTime() + (30 * 60000));

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
                console.log('');
            }
        });
    }

    showHelp() {
        return `🤖 **SCHEDBOT - Bantuan Lengkap:**

📝 MENGELOLA JADWAL:
   • Tambah: "Jadwalkan nonton malam ini jam 7"
   • Lihat: "Lihat jadwal", "Lihat jadwal hari ini", "Lihat jadwal besok"
   • Edit: "Ubah makan 08:00 jadi 10:00", "Ganti rapat ke besok"
   • Hapus: "Hapus makan 08:00", "Hapus semua jadwal makan"

🔍 PENCARIAN & REMINDER:
   • Cari: "Cari meeting", "Kapan ada rapat"
   • Reminder: "Reminder 1 jam", "Reminder satu hari kedepan"

📊 ANALISIS & EXPORT:
   • Statistik: "Berapa jadwal", "Statistik jadwal"
   • Export: "Export csv", "Backup jadwal"

❓ BANTUAN: "help", "bantuan", "perintah"

💡 Tips:
   - Gunakan kata kunci spesifik untuk edit/hapus (misal: "ubah makan 08:00 jadi 10:00")
   - Untuk reminder, bisa pakai "1 jam" atau "satu jam"
   - Format tampilan: JADWAL [TANGGAL] dengan daftar aktivitas dan waktu`;
    }

    // FIXED: MAIN PROCESSING with proper priority and pattern matching
    processMessage(input) {
        const message = input.trim().toLowerCase();
        
        try {
            // RULE 0: Help - highest priority
            if (message.match(/^(?:help|bantuan|apa\s+yang\s+bisa|perintah)$/i)) {
                return this.showHelp();
            }

            // FIXED: RULE 1 - Statistics - very specific patterns to avoid false positives
            if (message.match(/^(?:statistik|stats)(?:\s+jadwal)?$/i) || 
                message.match(/^berapa\s+jadwal$/i)) {
                return this.getScheduleStats(input);
            }

            // RULE 2: Export/Backup
            if (message.match(/^(?:export|backup|ekspor)\s*/i)) {
                return this.exportSchedules(input);
            }

            // RULE 3: Reminder - specific pattern
            if (message.match(/^(?:reminder|ingatkan)\s+.*(?:menit|jam|hari)/i)) {
                return this.getReminderSchedules(input);
            }

            // FIXED: RULE 4 - View Schedules - very specific patterns
            if (message.match(/^(?:lihat|tampilkan|show)\s+jadwal/i) ||
                message.match(/^jadwal\s+(?:hari ini|besok|semua)$/i) ||
                message === 'lihat jadwal' || message === 'jadwal') {
                return this.viewSchedules(input);
            }

            // FIXED: RULE 5 - Delete Schedules - must come before add
            if (message.match(/^(?:hapus|batalkan|delete)\s+/i)) {
                const result = this.deleteSchedule(input);
                if (result !== null) return result;
                return `🤖 Perintah hapus tidak dikenali. Gunakan: "hapus [kata kunci]" atau "hapus semua".`;
            }

            // RULE 6: Edit Schedule
            if (message.match(/^(?:ubah|ganti|edit)\s+/i)) {
                const result = this.editSchedule(input);
                if (result !== null) return result;
                return `🤖 Perintah edit tidak dikenali. Format: "Ubah [jadwal lama] jadi [jadwal baru]".`;
            }

            // FIXED: RULE 7 - Search Schedules - must come before add
            if (message.match(/^(?:cari|find)\s+/i) || 
                message.match(/^kapan\s+(?:ada\s+)?(?!jadwal\s*$)/i)) {
                const result = this.searchSchedules(input);
                if (result !== null) return result;
                return `🔍 Tidak ditemukan hasil untuk pencarian.`;
            }

            // FIXED: RULE 8 - Add Schedule - most restrictive, only explicit add commands
            if (message.match(/^(?:tambah|buat|jadwalkan|schedule)\s+/i)) {
                const result = this.addSchedule(input);
                if (result !== null) return result;
                return '❌ Format tambah jadwal tidak dikenali. Contoh: "Jadwalkan nonton malam ini jam 7"';
            }

            // FIXED: Handle ambiguous cases with "jadwal" keyword
            if (/\bjadwal\b/.test(message)) {
                // Specific patterns for stats that mention time
                if (/berapa.*(?:hari ini|besok|minggu|bulan)/i.test(message)) {
                    return this.getScheduleStats(input);
                }
                
                // View patterns with time keywords
                if (/(?:lihat|tampilkan|show|kapan|ada).*(?:hari ini|besok|minggu)/i.test(message)) {
                    return this.viewSchedules(input);
                }

                return '🤖 Maksud Anda melihat jadwal atau menambahkan jadwal? Contoh: "Lihat jadwal hari ini" atau "Jadwalkan makan jam 7".';
            }

            return `🤖 Maaf, saya tidak mengerti "${input}". Ketik "bantuan" untuk melihat perintah yang tersedia.`;
            
        } catch (error) {
            console.error('Error processing message:', error);
            return '❌ Terjadi kesalahan saat memproses pesan. Coba lagi nanti.';
        }
    }

    // API untuk integrasi
    processMessageAPI(input, userId = null) {
        return {
            status: 'success',
            message: this.processMessage(input),
            timestamp: new Date().toISOString(),
            userId: userId
        };
    }

    // Health check
    healthCheck() {
        try {
            const data = this.loadData();
            return {
                status: 'healthy',
                totalSchedules: data.schedules ? data.schedules.length : 0,
                dataFileExists: fs.existsSync(this.dataFile),
                timestamp: new Date().toISOString(),
                backupDirExists: fs.existsSync(this.backupDir),
                exportDirExists: fs.existsSync(this.exportDir)
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // BONUS: Reset semua data
    resetAllData() {
        try {
            const initialData = { 
                schedules: [],
                settings: {
                    reminderEnabled: true,
                    defaultReminderMinutes: 30
                }
            };
            
            if (this.saveData(initialData)) {
                return '✅ Semua data telah direset ke kondisi awal.';
            } else {
                return '❌ Gagal mereset data.';
            }
        } catch (error) {
            return `❌ Error saat reset: ${error.message}`;
        }
    }
}

module.exports = ScheduleBot;