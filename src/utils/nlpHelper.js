// src/utils/nlpHelpers.js - FIXED VERSION
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

    // FIXED: parseNumberWords with better mapping
    static parseNumberWords(text) {
        const numberWords = {
            'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5',
            'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9', 'sepuluh': '10',
            'sebelas': '11', 'dua belas': '12', 'tiga belas': '13', 'empat belas': '14', 'lima belas': '15',
            'enam belas': '16', 'tujuh belas': '17', 'delapan belas': '18', 'sembilan belas': '19',
            'dua puluh': '20', 'tiga puluh': '30', 'empat puluh': '40', 'lima puluh': '50', 'enam puluh': '60'
        };

        let result = text.toLowerCase();
        
        // Sort by length (longest first) to avoid partial replacements
        const sortedWords = Object.keys(numberWords).sort((a, b) => b.length - a.length);
        
        for (const word of sortedWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            result = result.replace(regex, numberWords[word]);
        }
        
        return result;
    }

    // Delegate to DateParser
    static parseDate(dateStr) {
        return DateParser.parseDate(dateStr);
    }

    // FIXED: parseTime with better period handling
    static parseTime(text) {
        if (!text || typeof text !== 'string') return '00:00';
        const s = text.toLowerCase();

        // Find time pattern
        const hhmm = s.match(/(\d{1,2})(?:[\.:](\d{1,2}))?/);
        if (!hhmm) return '00:00';

        let hour = parseInt(hhmm[1], 10);
        let minute = hhmm[2] ? Math.min(parseInt(hhmm[2], 10), 59) : 0;

        // Handle 24+ hours
        if (hour > 24) hour = hour % 24;

        // FIXED: Better period detection anywhere in text
        const periodMatch = s.match(/\b(pagi|siang|sore|malam)\b/);
        const period = periodMatch ? periodMatch[1] : null;

        if (period === 'pagi') {
            if (hour === 12) hour = 0; // 12 pagi = 00:00
            // Other morning hours stay the same (7 pagi = 07:00)
        } else if (period === 'siang') {
            if (hour >= 1 && hour <= 6) hour += 12; // 1-6 siang → 13-18
            else if (hour === 12) hour = 12;       // 12 siang = 12:00
        } else if (period === 'sore') {
            if (hour >= 1 && hour <= 6) hour += 12; // 1-6 sore → 13-18
        } else if (period === 'malam') {
            if (hour === 12) hour = 0;             // 12 malam = 00:00
            else if (hour >= 1 && hour <= 11) hour += 12; // 1-11 malam → 13-23
        }

        // Normalize
        hour = ((hour % 24) + 24) % 24;
        minute = Math.max(0, Math.min(59, minute));

        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
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

    // FIXED: extractActivity with better pattern removal
        static extractActivity(input, removePatterns = []) {
        let activity = input;

        const defaultPatterns = [
            /^(?:tambah|buat|jadwalkan|schedule)\s+(?:jadwal\s+)?/i,  // command
            /\b(?:jadwal|ini|itu)\b/gi,                              // <== tambah stopword
            /\b(?:jam|pukul)\s*\d{1,2}(?:[\.:]?\d{2})?\s*(?:pagi|siang|sore|malam)?\b/gi,
            /\b(pagi|siang|sore|malam)\b/gi,
            /\b(hari ini|besok|lusa)\b/gi,
            /\btanggal\s*\d+\b/gi,
            /\b\d{1,2}[\s\/\-]\d{1,2}(?:[\s\/\-]\d{2,4})?\b/gi
        ];

        const allPatterns = [...defaultPatterns, ...removePatterns];
        allPatterns.forEach(pattern => {
            activity = activity.replace(pattern, '');
        });

        return activity.replace(/\s+/g, ' ').trim();
    }

    static extractDatePattern(input) {
        const datePatterns = [
            /\b(hari ini)\b/i,
            /\b(besok)\b/i,
            /\b(lusa)\b/i,
            /\b(tanggal\s*\d+)\b/i,
            /\b(\d{1,2}[\s\/\-]\d{1,2}(?:[\s\/\-]\d{2,4})?)\b/i,
            /\b(\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember))\b/i
        ];
        
        for (const pattern of datePatterns) {
            const match = input.match(pattern);
            if (match) {
                return match[1];
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
        
        if (!activity || activity.length < 2) {
            errors.push('Aktivitas terlalu pendek atau kosong');
        }
        
        if (!this.isValidDate(date)) {
            errors.push('Format tanggal tidak valid');
        }
        
        if (!this.isValidTime(time)) {
            errors.push('Format waktu tidak valid');
        }
        
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

    // FIXED: Intent detection with better patterns
    static detectIntent(input) {
        const message = input.trim().toLowerCase();
        
        const intents = [
            { name: 'help', regex: /^(?:help|bantuan|apa\s+yang\s+bisa|perintah)$/i },
            { 
                name: 'stats', 
                regex: /^(?:statistik|stats)(?:\s+jadwal)?$|^berapa\s+jadwal$/i 
            },
            { name: 'export', regex: /^(?:export|backup|ekspor)\s*/i },
            { name: 'reminder', regex: /^(?:reminder|ingatkan)\s+.*(?:menit|jam|hari)/i },
            { 
                name: 'view', 
                regex: /^(?:lihat|tampilkan|show)\s+jadwal|^jadwal\s+(?:hari ini|besok|semua)$/i,
                exact: ['lihat jadwal', 'jadwal']
            },
            { name: 'delete', regex: /^(?:hapus|batalkan|delete)\s+/i },
            { name: 'edit', regex: /^(?:ubah|ganti|edit)\s+/i },
            { 
                name: 'search', 
                regex: /^(?:cari|find)\s+|^kapan\s+(?:ada\s+)?(?!jadwal\s*$)/i 
            },
            { name: 'add', regex: /^(?:tambah|buat|jadwalkan|schedule)\s+/i }
        ];

        // Check exact matches first
        for (const intent of intents) {
            if (intent.exact && intent.exact.includes(message)) {
                return intent.name;
            }
        }

        // Check regex patterns
        for (const intent of intents) {
            if (message.match(intent.regex)) {
                return intent.name;
            }
        }

        return 'unknown';
    }
}

module.exports = NLPHelpers;