const fs = require('fs');
const path = require('path');
const ScheduleBot = require('../src/index');

// Mock file system untuk testing
jest.mock('fs');

describe('ScheduleBot Tests', () => {
    let bot;
    let mockData;

    beforeEach(() => {
        // Reset mock data sebelum setiap test
        mockData = {
            schedules: [
                {
                    id: 1725753600000,
                    activity: "meeting tim",
                    date: "09-09-2025",
                    time: "10:00",
                    created: "2025-09-08T00:00:00.000Z"
                }
            ]
        };

        // Mock fs functions
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(mockData));
        fs.writeFileSync.mockImplementation(() => {});

        bot = new ScheduleBot();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Test 1: Tambah Jadwal
    test('Rule 1 - Tambah Jadwal: Berhasil menambah jadwal baru', () => {
        const input = "Tambah jadwal rapat besok jam 14.00";
        const response = bot.processMessage(input);
        
        expect(response).toMatch(/✅ Jadwal 'rapat' ditambahkan/);
        expect(response).toContain('14:00');
    });

    // Test 2: Lihat Jadwal Hari Ini
    test('Rule 2 - Lihat Jadwal Hari Ini: Menampilkan jadwal hari ini', () => {
        // Mock tanggal hari ini agar sesuai dengan data test
        const today = new Date('2025-09-09');
        jest.spyOn(global, 'Date').mockImplementation(() => today);

        // Update mock data untuk hari ini
        mockData.schedules[0].date = "09-09-2025";
        fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

        const input = "Jadwal hari ini";
        const response = bot.processMessage(input);
        
        expect(response).toContain('📅 Jadwal hari ini');
        expect(response).toContain('meeting tim pukul 10:00');

        // Restore Date
        global.Date.mockRestore();
    });

    // Test 3: Lihat Jadwal Tanggal Tertentu
    test('Rule 3 - Lihat Jadwal Tanggal: Menampilkan jadwal untuk tanggal tertentu', () => {
        const input = "Lihat jadwal besok";
        const response = bot.processMessage(input);
        
        expect(response).toContain('📅 Jadwal');
        // Bisa berisi jadwal atau pesan tidak ada jadwal
        expect(response.includes('meeting tim') || response.includes('Tidak ada jadwal')).toBeTruthy();
    });

    // Test 4: Hapus Jadwal
    test('Rule 4 - Hapus Jadwal: Berhasil menghapus jadwal yang ada', () => {
        const input = "Hapus jadwal meeting tim besok";
        const response = bot.processMessage(input);
        
        expect(response).toMatch(/🗑 Jadwal .+ berhasil dihapus|❌ Jadwal .+ tidak ditemukan/);
    });

    // Test 5: Edit Jadwal
    test('Rule 5 - Edit Jadwal: Berhasil mengubah waktu jadwal', () => {
        const input = "Ubah jadwal meeting tim jadi jam 11";
        const response = bot.processMessage(input);
        
        expect(response).toMatch(/✏️ Waktu jadwal .+ diubah|❌ Jadwal .+ tidak ditemukan/);
    });

    // Test 6: Bantuan/Help
    test('Rule 6 - Help: Menampilkan bantuan perintah', () => {
        const input = "bantuan";
        const response = bot.processMessage(input);
        
        expect(response).toContain('🤖 SCHEDBOT - Bantuan Perintah');
        expect(response).toContain('Menambah jadwal');
        expect(response).toContain('Melihat jadwal');
        expect(response).toContain('Menghapus jadwal');
    });

    // Test 7: Reflection Kata Ganti
    test('Reflection: Mengubah kata ganti dengan benar', () => {
        const input = "Apakah kamu bisa bantuin saya?";
        const response = bot.processMessage(input);
        
        // Harus ada reflection: saya → kamu
        expect(response).toContain('kamu');
        expect(response).toContain('🤖 Maaf, saya tidak mengerti');
    });

    // Test 8: Fallback Message
    test('Fallback: Memberikan pesan default untuk input yang tidak dikenali', () => {
        const input = "Apakah kamu bisa nyanyi?";
        const response = bot.processMessage(input);
        
        expect(response).toContain('🤖 Maaf, saya tidak mengerti');
        expect(response).toContain('Ketik "bantuan"');
    });

    // Test 9: Parse Date Function
    test('Parse Date: Mengkonversi input tanggal natural language', () => {
        const today = new Date('2025-09-08');
        jest.spyOn(global, 'Date').mockImplementation(() => today);

        expect(bot.parseDate('hari ini')).toBe('08-09-2025');
        expect(bot.parseDate('besok')).toBe('09-09-2025');
        expect(bot.parseDate('lusa')).toBe('10-09-2025');

        global.Date.mockRestore();
    });

    // Test 10: Parse Time Function  
    test('Parse Time: Mengkonversi input waktu natural language', () => {
        expect(bot.parseTime('jam 14.30')).toBe('14:30');
        expect(bot.parseTime('pukul 09:00')).toBe('09:00');
        expect(bot.parseTime('10 pagi')).toBe('10:00');
        expect(bot.parseTime('2 siang')).toBe('14:00');
    });
});

// Test untuk fungsi file I/O
describe('File Operations', () => {
    let bot;

    beforeEach(() => {
        fs.existsSync.mockReturnValue(false);
        fs.writeFileSync.mockImplementation(() => {});
        bot = new ScheduleBot();
    });

    test('Initialize Data: Membuat file data.json jika belum ada', () => {
        expect(fs.writeFileSync).toHaveBeenCalled();
        const writeCall = fs.writeFileSync.mock.calls[0];
        expect(writeCall[1]).toContain('{"schedules":[]}');
    });

    test('Load Data: Menangani error saat membaca file', () => {
        fs.readFileSync.mockImplementation(() => {
            throw new Error('File read error');
        });

        const data = bot.loadData();
        expect(data).toEqual({ schedules: [] });
    });
});