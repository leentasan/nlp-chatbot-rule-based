// src/utils/dateParser.js
class DateParser {
    static parseDate(dateStr) {
        const today = new Date();
        const formatDate = (date) => {
            return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        };

        if (!dateStr || typeof dateStr !== 'string') return formatDate(today);

        const s = dateStr.toLowerCase();
        if (s.includes('hari ini')) return formatDate(today);
        if (s.includes('besok')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            return formatDate(tomorrow);
        }
        if (s.includes('lusa')) {
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(today.getDate() + 2);
            return formatDate(dayAfterTomorrow);
        }

        // Parse explicit dates: "tanggal 10", "10 September", "10/9", "10-9", or numeric month
        const dateRegex = /(?:tanggal\s*)?(\d{1,2})[\s\/\-]?(september|oktober|november|desember|januari|februari|maret|april|mei|juni|juli|agustus|\d{1,2})?/i;
        const match = dateStr.match(dateRegex);
        
        if (match) {
            const day = parseInt(match[1], 10);
            let month;
            
            if (match[2] && isNaN(parseInt(match[2], 10))) {
                const months = {
                    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
                    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
                    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
                };
                month = months[match[2].toLowerCase()];
            } else if (match[2]) {
                month = parseInt(match[2], 10);
            } else {
                month = today.getMonth() + 1; // Default ke bulan ini
            }
            
            const year = today.getFullYear();
            return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
        }

        return formatDate(today);
    }

    static parseTime(text) {
        if (!text || typeof text !== 'string') return '00:00';
        const s = text.toLowerCase();

        // Cari format jam:menit atau jam.menit
        const hhmm = s.match(/(\d{1,2})(?:[:.](\d{1,2}))?/);
        if (!hhmm) return '00:00';

        let hour = parseInt(hhmm[1], 10);
        let minute = hhmm[2] ? Math.min(parseInt(hhmm[2], 10), 59) : 0;

        // validasi jam
        if (hour > 24) hour = hour % 24;

        // Deteksi periode (pagi, siang, sore, malam) di mana pun posisinya
        const periodMatch = s.match(/\b(pagi|siang|sore|malam)\b/);
        const period = periodMatch ? periodMatch[1] : null;

        if (period === 'pagi') {
            // 12 pagi = 00:00
            if (hour === 12) hour = 0;
            // selain itu biarin (7 pagi = 7)
        } else if (period === 'siang') {
            if (hour >= 1 && hour <= 6) hour += 12; // jam 1-6 siang → 13-18
            else if (hour === 12) hour = 12;       // jam 12 siang = 12
        } else if (period === 'sore') {
            if (hour >= 1 && hour <= 6) hour += 12; // jam 1-6 sore → 13-18
        } else if (period === 'malam') {
            if (hour === 12) hour = 0;          // 12 malam = 00:00
            else if (hour >= 1 && hour <= 11) hour += 12; // jam 7 malam = 19
        }

        // normalisasi
        hour = ((hour % 24) + 24) % 24;
        minute = Math.max(0, Math.min(59, minute));

        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }


    static formatDisplayDate(dateStr) {
        const [day, month, year] = dateStr.split('-');
        const months = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 
                       'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];
        return `${day} ${months[parseInt(month, 10)]} ${year}`;
    }

    static parseRelativeDate(dateStr) {
        const today = new Date();
        const formatDate = (date) => {
            return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        };

        const s = (dateStr || '').toLowerCase();
        if (s.includes('minggu depan')) {
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return formatDate(nextWeek);
        }

        if (s.includes('bulan depan')) {
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);
            return formatDate(nextMonth);
        }

        return this.parseDate(dateStr);
    }

    static isValidDateString(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return false;
        
        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) return false;
        
        const [day, month, year] = dateParts.map(Number);
        
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (day < 1 || day > 31) return false;
        if (month < 1 || month > 12) return false;
        
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && 
               date.getMonth() === month - 1 && 
               date.getFullYear() === year;
    }

    static getDaysDifference(date1Str, date2Str) {
        const [day1, month1, year1] = date1Str.split('-').map(Number);
        const [day2, month2, year2] = date2Str.split('-').map(Number);
        
        const date1 = new Date(year1, month1 - 1, day1);
        const date2 = new Date(year2, month2 - 1, day2);
        
        const diffTime = date2 - date1;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    static toISODate(dateStr) {
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    static getTodayFormatted() {
        const today = new Date();
        return `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    }

    static getTomorrowFormatted() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return `${tomorrow.getDate().toString().padStart(2, '0')}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getFullYear()}`;
    }

    static parseIndonesianDay(dayStr) {
        const days = {
            'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 
            'jumat': 5, 'sabtu': 6, 'minggu': 0
        };
        
        const dayName = (dayStr || '').toLowerCase();
        if (days.hasOwnProperty(dayName)) {
            const today = new Date();
            const currentDay = today.getDay();
            const targetDay = days[dayName];
            
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7; // Next week
            
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysToAdd);
            
            return `${targetDate.getDate().toString().padStart(2, '0')}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getFullYear()}`;
        }
        
        return this.getTodayFormatted();
    }
}

module.exports = DateParser;
