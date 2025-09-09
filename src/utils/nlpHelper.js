// src/utils/nlpHelpers.js
const DateParser = require('./dateParser');

class NLPHelpers {
    static reflectPronouns(text) {
        const reflections = {
            'saya': 'kamu', 'aku': 'kamu', 'gue': 'lu', 'gua': 'lu',
            'kamu': 'saya', 'lu': 'gue',
            'punyaku': 'punyamu', 'punyamu': 'punyaku',
            'milikku': 'milikmu', 'milikmu': 'milikku'
        };

        let reflected = text.toLowerCase();
        for (const [original, replacement] of Object.entries(reflections)) {
            const regex = new RegExp(`\\b${original}\\b`, 'gi');
            reflected = reflected.replace(regex, replacement);
        }
        return reflected;
    }

    static extractKeywords(text) {
        const stopWords = ['yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'adalah', 'akan', 'ada', 'ini', 'itu'];
        const keywords = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .filter(word => word.length > 2 && !stopWords.includes(word));
        return [...new Set(keywords)];
    }

    static similarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return 1 - matrix[len2][len1] / Math.max(len1, len2);
    }

    static detectIntent(input) {
        const message = input.trim().toLowerCase();
        
        const intents = [
            { name: 'help', regex: /^(?:help|bantuan|apa\s+yang\s+bisa|perintah)$/i },
            { name: 'stats', regex: /^(?:statistik|stats|berapa\s+jadwal)(?:\s+.*)?$/i },
            { name: 'export', regex: /^(?:export|backup|ekspor)\s*/i },
            { name: 'reminder', regex: /^(?:reminder|ingatkan)\s+.*(?:menit|jam|hari)/i },
            { 
                name: 'view', 
                regex: /^(?:lihat|tampilkan|show)\s+jadwal|^jadwal\s+(?:hari ini|besok|semua)$/i,
                exact: ['lihat jadwal', 'jadwal']
            },
            { name: 'delete', regex: /^(?:hapus|batalkan|delete)\s+/i },
            { name: 'edit', regex: /^(?:ubah|ganti|edit)\s+/i },
            { name: 'search', regex: /^(?:cari|find)\s+|^kapan\s+(?:ada\s+)?/i },
            { name: 'add', regex: /^(?:tambah|buat|jadwalkan|schedule)\s+/i }
        ];

        for (const intent of intents) {
            if (intent.exact && intent.exact.includes(message)) {
                return intent.name;
            }
        }

        for (const intent of intents) {
            if (message.match(intent.regex)) {
                return intent.name;
            }
        }

        return 'unknown';
    }

    static parseNumberWords(text) {
        const numberWords = {
            'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5',
            'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9', 'sepuluh': '10',
            'sebelas': '11', 'dua belas': '12', 'lima belas': '15', 'dua puluh': '20',
            'tiga puluh': '30', 'empat puluh': '40', 'lima puluh': '50', 'enam puluh': '60'
        };

        let result = text.toLowerCase();
        for (const [word, number] of Object.entries(numberWords)) {
            result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), number);
        }
        return result;
    }

    // 🔗 Integrasi penuh ke DateParser
    static parseDate(dateStr) {
        return DateParser.parseDate(dateStr);
    }

    static parseTime(text) {
        return DateParser.parseTime(text);
    }

    static formatDisplayDate(dateStr) {
        return DateParser.formatDisplayDate(dateStr);
    }

    static isValidDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return false;
        
        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) return false;
        
        const [day, month, year] = dateParts.map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (day < 1 || day > 31) return false;
        if (month < 1 || month > 12) return false;
        if (year < 2024) return false;
        
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && 
               date.getMonth() === month - 1 && 
               date.getFullYear() === year;
    }

    static isValidTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return false;
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(timeStr);
    }

    static cleanText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text.trim()
                  .replace(/\s+/g, ' ')
                  .replace(/[^\w\s\-\/:\.]/g, '')
                  .toLowerCase();
    }

    static extractActivity(input, removePatterns = []) {
        let activity = input;
        const defaultPatterns = [
            /^(?:tambah|buat|jadwalkan|schedule)\s+(?:jadwal\s+)?/i, // buang kata perintah di depan
            /\b(?:jam|pukul)\s*\d{1,2}(?:[\.:]?\d{2})?\b/i,           // buang jam/hh:mm
            /\b(pagi|siang|sore|malam)\b/i,                          // buang periode waktu
            /\b(hari ini|besok|lusa)\b/i,                            // buang relative dates
            /\btanggal\s*\d+\b/i,                                    // buang "tanggal 10"
            /\b\d{1,2}[\s\/\-]\d{1,2}\b/i                            // buang "10/9" atau "10-9"
        ];
        
        const allPatterns = [...defaultPatterns, ...removePatterns];
        allPatterns.forEach(pattern => {
            activity = activity.replace(pattern, '');
        });
        
        return activity.replace(/\s+/g, ' ').trim();
}


    static extractDatePattern(input) {
        const datePatterns = [
            /hari ini/i,
            /besok/i,
            /lusa/i,
            /tanggal\s*\d+/i,
            /\d{1,2}[\s\/\-]\d{1,2}/i,
            /\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i
        ];
        
        for (const pattern of datePatterns) {
            const match = input.match(pattern);
            if (match) {
                return match[0];
            }
        }
        
        return 'hari ini';
    }

    static extractTimePattern(input) {
        const timePattern = /(?:jam|pukul)\s*(\d{1,2}(?:[\.:]?\d{2})?)\s*(?:pagi|siang|sore|malam)?/i;
        const match = input.match(timePattern);
        return match ? match[0] : '';
    }

    static validateScheduleInput(activity, date, time) {
        const errors = [];
        if (!activity || activity.length < 2) errors.push('Aktivitas terlalu pendek');
        if (!this.isValidDate(date)) errors.push('Format tanggal tidak valid');
        if (!this.isValidTime(time)) errors.push('Format waktu tidak valid');
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static generateSearchKeywords(text) {
        const keywords = this.extractKeywords(text);
        const variations = [];
        
        keywords.forEach(keyword => {
            variations.push(keyword);
            if (keyword.length > 4) {
                variations.push(keyword.substring(0, Math.floor(keyword.length * 0.7)));
            }
        });
        
        return [...new Set(variations)];
    }

    static getTimeDifference(fromDate, toDate) {
        const diff = toDate - fromDate;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} hari`;
        if (hours > 0) return `${hours} jam`;
        return `${minutes} menit`;
    }

    static calculateRelevanceScore(searchTerm, targetText, options = {}) {
        const {
            exactMatch = 10,
            partialMatch = 5,
            fuzzyMatch = 2,
            positionBonus = 3
        } = options;
        
        let score = 0;
        const searchLower = searchTerm.toLowerCase();
        const targetLower = targetText.toLowerCase();
        
        if (targetLower === searchLower) score += exactMatch;
        
        if (targetLower.includes(searchLower)) {
            score += partialMatch;
            const position = targetLower.indexOf(searchLower);
            if (position === 0) score += positionBonus;
            else if (position < targetLower.length * 0.3) score += positionBonus / 2;
        }
        
        const similarity = this.similarity(searchLower, targetLower);
        if (similarity > 0.7) score += fuzzyMatch * similarity;
        
        return score;
    }
}

module.exports = NLPHelpers;
