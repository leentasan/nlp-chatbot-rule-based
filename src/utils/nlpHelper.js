// src/utils/nlpHelper.js - FIXED VERSION
const DateParser = require('./dateParser');

class NLPHelpers {
    // FIXED: Handle null/undefined input properly and fix case preservation
    static reflectPronouns(text) {
        if (!text || typeof text !== 'string') return '';
        
        const reflections = {
            'saya': 'kamu', 'aku': 'kamu', 'gue': 'lu', 'gua': 'lu',
            'kamu': 'saya', 'lu': 'gue',
            'punyaku': 'punyamu', 'punyamu': 'punyaku',
            'milikku': 'milikmu', 'milikmu': 'milikku'
        };

        let reflected = text;
        const wasCapitalized = text.charAt(0) === text.charAt(0).toUpperCase();
        
        // Convert to lowercase for processing
        reflected = reflected.toLowerCase();
        
        // Apply reflections
        for (const [original, replacement] of Object.entries(reflections)) {
            const regex = new RegExp(`\\b${original}\\b`, 'g');
            reflected = reflected.replace(regex, replacement);
        }
        
        // Restore capitalization if original was capitalized
        if (wasCapitalized) {
            reflected = reflected.charAt(0).toUpperCase() + reflected.slice(1);
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

    // FIXED: Handle empty strings properly in similarity calculation
    static similarity(str1, str2) {
        if (!str1 && !str2) return 1; // Both empty strings are identical
        if (!str1 || !str2) return 0; // One empty, one not
        
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0 && len2 === 0) return 1;
        if (len1 === 0 || len2 === 0) return 0;
        
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

        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : 1 - matrix[len2][len1] / maxLen;
    }

    // FIXED: parseNumberWords with better compound number handling
    static parseNumberWords(text) {
        const numberWords = {
            // Compound numbers first (longer patterns)
            'dua puluh lima': '25', 'dua puluh empat': '24', 'dua puluh tiga': '23', 'dua puluh dua': '22', 'dua puluh satu': '21', 'dua puluh': '20',
            'tiga puluh': '30', 'empat puluh': '40', 'lima puluh': '50', 'enam puluh': '60',
            'lima belas': '15', 'empat belas': '14', 'tiga belas': '13', 'dua belas': '12',
            'sembilan belas': '19', 'delapan belas': '18', 'tujuh belas': '17', 'enam belas': '16',
            // Single numbers
            'sebelas': '11', 'sepuluh': '10', 'sembilan': '9', 'delapan': '8', 'tujuh': '7',
            'enam': '6', 'lima': '5', 'empat': '4', 'tiga': '3', 'dua': '2', 'satu': '1'
        };

        let result = text;
        
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
        if (hour === 24) hour = 0;

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
            if (hour >= 1 && hour <= 11) hour += 12; // 1-11 sore → 13-23
        } else if (period === 'malam') {
            if (hour === 12) hour = 0;             // 12 malam = 00:00
            else if (hour >= 1 && hour <= 11) hour += 12; // 1-11 malam → 13-23
        }

        // Normalize
        hour = Math.max(0, Math.min(23, hour));
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

    // FIXED: extractActivity to properly extract "makan siang" from "Tambah makan siang jam 12"
    static extractActivity(input, removePatterns = []) {
        if (!input || typeof input !== 'string') return '';
        
        let activity = input.trim();

        // Remove command words at the beginning
        activity = activity.replace(/^(?:tambah|buat|jadwalkan|schedule)\s+(?:jadwal\s+)?/i, '');
        
        // Remove time patterns - be more specific to avoid removing activity parts
        const timePatterns = [
            /\s+jam\s+\d{1,2}(?:[\.:]?\d{2})?\s*(?:pagi|siang|sore|malam)?\b/gi,
            /\s+pukul\s+\d{1,2}(?:[\.:]?\d{2})?\s*(?:pagi|siang|sore|malam)?\b/gi,
            /\s+pada\s+\d{1,2}(?:[\.:]?\d{2})?\s*(?:pagi|siang|sore|malam)?\b/gi,
        ];
        
        timePatterns.forEach(pattern => {
            activity = activity.replace(pattern, '');
        });
        
        // Remove standalone time periods that are clearly not part of activity
        activity = activity.replace(/\s+(?:pagi|siang|sore|malam)(?:\s+|$)/gi, ' ');
        
        // Remove date patterns
        const datePatterns = [
            /\s+(?:hari ini|besok|lusa)\b/gi,
            /\s+tanggal\s*\d+\b/gi,
            /\s+\d{1,2}[\s\/\-]\d{1,2}(?:[\s\/\-]\d{2,4})?\b/gi
        ];
        
        datePatterns.forEach(pattern => {
            activity = activity.replace(pattern, '');
        });

        // Apply custom remove patterns
        removePatterns.forEach(pattern => {
            activity = activity.replace(pattern, '');
        });

        // Clean up whitespace
        activity = activity.replace(/\s+/g, ' ').trim();
        
        // If only command word left or empty, return empty
        if (!activity || /^(?:tambah|buat|jadwalkan|schedule)$/i.test(activity)) {
            return '';
        }
        
        return activity;
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

    // FIXED: Intent detection with exact patterns for stats
    static detectIntent(input) {
        if (!input || typeof input !== 'string') return 'unknown';
        
        const message = input.trim().toLowerCase();
        
        // Exact matches first - including stats patterns
        const exactMatches = {
            'help': ['help', 'bantuan', 'perintah'],
            'view': ['lihat jadwal', 'jadwal'],
            'stats': ['statistik', 'stats', 'berapa jadwal', 'statistik jadwal']
        };
        
        for (const [intent, phrases] of Object.entries(exactMatches)) {
            if (phrases.some(phrase => message === phrase || message.includes(phrase))) {
                return intent;
            }
        }
        
        const intentPatterns = [
            { name: 'export', regex: /^(?:export|backup|ekspor)\s*/i },
            { name: 'reminder', regex: /^(?:reminder|ingatkan)\s+.*(?:menit|jam|hari)/i },
            { name: 'view', regex: /^(?:lihat|tampilkan|show)\s+jadwal|^jadwal\s+(?:hari ini|besok|semua)$/i },
            { name: 'delete', regex: /^(?:hapus|batalkan|delete)\s+/i },
            { name: 'edit', regex: /^(?:ubah|ganti|edit)\s+/i },
            { name: 'search', regex: /^(?:cari|find)\s+|^kapan\s+(?:ada\s+)?(?!jadwal\s*$)/i },
            { name: 'add', regex: /^(?:tambah|buat|jadwalkan|schedule)\s+/i }
        ];

        // Check regex patterns
        for (const intent of intentPatterns) {
            if (message.match(intent.regex)) {
                return intent.name;
            }
        }

        return 'unknown';
    }
}

module.exports = NLPHelpers;