// tests/dateParser.test.js - DateParser Unit Tests
const DateParser = require('../src/utils/dateParser');

describe('DateParser Unit Tests', () => {
    
    describe('Date Parsing Tests', () => {
        test('should parse relative dates correctly', () => {
            const today = new Date();
            const todayFormatted = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
            
            expect(DateParser.parseDate('hari ini')).toBe(todayFormatted);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const tomorrowFormatted = `${tomorrow.getDate().toString().padStart(2, '0')}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getFullYear()}`;
            
            expect(DateParser.parseDate('besok')).toBe(tomorrowFormatted);
            
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(today.getDate() + 2);
            const lusaFormatted = `${dayAfterTomorrow.getDate().toString().padStart(2, '0')}-${(dayAfterTomorrow.getMonth() + 1).toString().padStart(2, '0')}-${dayAfterTomorrow.getFullYear()}`;
            
            expect(DateParser.parseDate('lusa')).toBe(lusaFormatted);
        });

        test('should parse explicit date formats', () => {
            const currentYear = new Date().getFullYear();
            
            expect(DateParser.parseDate('tanggal 15')).toBe(`15-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${currentYear}`);
            expect(DateParser.parseDate('10 September')).toBe(`10-09-${currentYear}`);
            expect(DateParser.parseDate('25 Desember')).toBe(`25-12-${currentYear}`);
        });

        test('should parse numeric date formats', () => {
            const currentYear = new Date().getFullYear();
            
            expect(DateParser.parseDate('15/9')).toBe(`15-09-${currentYear}`);
            expect(DateParser.parseDate('15-9')).toBe(`15-09-${currentYear}`);
            expect(DateParser.parseDate('3/12')).toBe(`03-12-${currentYear}`);
        });

        test('should handle invalid date input gracefully', () => {
            const today = new Date();
            const todayFormatted = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
            
            expect(DateParser.parseDate('')).toBe(todayFormatted);
            expect(DateParser.parseDate(null)).toBe(todayFormatted);
            expect(DateParser.parseDate('invalid date')).toBe(todayFormatted);
            expect(DateParser.parseDate(123)).toBe(todayFormatted);
        });

        test('should handle month name variations', () => {
            const currentYear = new Date().getFullYear();
            
            expect(DateParser.parseDate('1 Januari')).toBe(`01-01-${currentYear}`);
            expect(DateParser.parseDate('28 Februari')).toBe(`28-02-${currentYear}`);
            expect(DateParser.parseDate('15 Maret')).toBe(`15-03-${currentYear}`);
            expect(DateParser.parseDate('10 April')).toBe(`10-04-${currentYear}`);
            expect(DateParser.parseDate('5 Mei')).toBe(`05-05-${currentYear}`);
            expect(DateParser.parseDate('20 Juni')).toBe(`20-06-${currentYear}`);
            expect(DateParser.parseDate('31 Juli')).toBe(`31-07-${currentYear}`);
            expect(DateParser.parseDate('15 Agustus')).toBe(`15-08-${currentYear}`);
            expect(DateParser.parseDate('17 September')).toBe(`17-09-${currentYear}`);
            expect(DateParser.parseDate('25 Oktober')).toBe(`25-10-${currentYear}`);
            expect(DateParser.parseDate('11 November')).toBe(`11-11-${currentYear}`);
            expect(DateParser.parseDate('25 Desember')).toBe(`25-12-${currentYear}`);
        });
    });

    describe('Time Parsing Tests', () => {
        test('should parse basic time formats', () => {
            expect(DateParser.parseTime('7')).toBe('07:00');
            expect(DateParser.parseTime('15')).toBe('15:00');
            expect(DateParser.parseTime('7:30')).toBe('07:30');
            expect(DateParser.parseTime('13:45')).toBe('13:45');
        });

        test('should handle time with periods', () => {
            expect(DateParser.parseTime('7 pagi')).toBe('07:00');
            expect(DateParser.parseTime('1 siang')).toBe('13:00');
            expect(DateParser.parseTime('6 sore')).toBe('18:00');
            expect(DateParser.parseTime('9 malam')).toBe('21:00');
        });

        test('should handle special noon and midnight cases', () => {
            expect(DateParser.parseTime('12 pagi')).toBe('00:00');
            expect(DateParser.parseTime('12 siang')).toBe('12:00');
            expect(DateParser.parseTime('12 malam')).toBe('00:00');
        });

        test('should handle hour overflow', () => {
            expect(DateParser.parseTime('25')).toBe('01:00');
            expect(DateParser.parseTime('26')).toBe('02:00');
        });

        test('should validate minutes', () => {
            expect(DateParser.parseTime('7:65')).toBe('07:59');
            expect(DateParser.parseTime('7:90')).toBe('07:59');
            expect(DateParser.parseTime('7:-5')).toBe('07:00');
        });

        test('should handle invalid time input', () => {
            expect(DateParser.parseTime('')).toBe('00:00');
            expect(DateParser.parseTime(null)).toBe('00:00');
            expect(DateParser.parseTime('invalid')).toBe('00:00');
            expect(DateParser.parseTime('abc')).toBe('00:00');
        });

        test('should parse complex time expressions', () => {
            expect(DateParser.parseTime('sekitar jam 7 pagi')).toBe('07:00');
            expect(DateParser.parseTime('kira-kira pukul 2 siang')).toBe('14:00');
            expect(DateParser.parseTime('jam 10.30 malam')).toBe('22:30');
        });
    });

    describe('Date Formatting Tests', () => {
        test('should format display dates correctly', () => {
            expect(DateParser.formatDisplayDate('15-09-2024')).toBe('15 SEP 2024');
            expect(DateParser.formatDisplayDate('01-01-2024')).toBe('01 JAN 2024');
            expect(DateParser.formatDisplayDate('25-12-2024')).toBe('25 DES 2024');
        });

        test('should handle all months in formatting', () => {
            expect(DateParser.formatDisplayDate('01-01-2024')).toBe('01 JAN 2024');
            expect(DateParser.formatDisplayDate('15-02-2024')).toBe('15 FEB 2024');
            expect(DateParser.formatDisplayDate('10-03-2024')).toBe('10 MAR 2024');
            expect(DateParser.formatDisplayDate('05-04-2024')).toBe('05 APR 2024');
            expect(DateParser.formatDisplayDate('20-05-2024')).toBe('20 MEI 2024');
            expect(DateParser.formatDisplayDate('15-06-2024')).toBe('15 JUN 2024');
            expect(DateParser.formatDisplayDate('31-07-2024')).toBe('31 JUL 2024');
            expect(DateParser.formatDisplayDate('15-08-2024')).toBe('15 AGS 2024');
            expect(DateParser.formatDisplayDate('17-09-2024')).toBe('17 SEP 2024');
            expect(DateParser.formatDisplayDate('25-10-2024')).toBe('25 OKT 2024');
            expect(DateParser.formatDisplayDate('11-11-2024')).toBe('11 NOV 2024');
            expect(DateParser.formatDisplayDate('25-12-2024')).toBe('25 DES 2024');
        });
    });

    describe('Date Validation Tests', () => {
        test('should validate correct date strings', () => {
            expect(DateParser.isValidDateString('15-09-2024')).toBe(true);
            expect(DateParser.isValidDateString('01-01-2024')).toBe(true);
            expect(DateParser.isValidDateString('29-02-2024')).toBe(true); // 2024 is leap year
        });

        test('should reject invalid date strings', () => {
            expect(DateParser.isValidDateString('32-01-2024')).toBe(false); // invalid day
            expect(DateParser.isValidDateString('15-13-2024')).toBe(false); // invalid month
            expect(DateParser.isValidDateString('29-02-2023')).toBe(false); // not leap year
            expect(DateParser.isValidDateString('15-9-24')).toBe(false); // wrong format
            expect(DateParser.isValidDateString('invalid')).toBe(false);
            expect(DateParser.isValidDateString('')).toBe(false);
            expect(DateParser.isValidDateString(null)).toBe(false);
        });
    });

    describe('Utility Functions Tests', () => {
        test('should calculate days difference correctly', () => {
            expect(DateParser.getDaysDifference('01-01-2024', '02-01-2024')).toBe(1);
            expect(DateParser.getDaysDifference('15-09-2024', '15-09-2024')).toBe(0);
            expect(DateParser.getDaysDifference('15-09-2024', '14-09-2024')).toBe(-1);
        });

        test('should convert to ISO date format', () => {
            expect(DateParser.toISODate('15-09-2024')).toBe('2024-09-15');
            expect(DateParser.toISODate('01-01-2024')).toBe('2024-01-01');
        });

        test('should get formatted today and tomorrow', () => {
            const today = DateParser.getTodayFormatted();
            const tomorrow = DateParser.getTomorrowFormatted();
            
            expect(today).toMatch(/\d{2}-\d{2}-\d{4}/);
            expect(tomorrow).toMatch(/\d{2}-\d{2}-\d{4}/);
            
            const daysDiff = DateParser.getDaysDifference(today, tomorrow);
            expect(daysDiff).toBe(1);
        });

        test('should parse Indonesian day names', () => {
            const result = DateParser.parseIndonesianDay('senin');
            expect(result).toMatch(/\d{2}-\d{2}-\d{4}/);
            
            // Test all day names
            ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'].forEach(day => {
                const parsed = DateParser.parseIndonesianDay(day);
                expect(parsed).toMatch(/\d{2}-\d{2}-\d{4}/);
            });
        });

        test('should handle invalid day names', () => {
            const today = DateParser.getTodayFormatted();
            expect(DateParser.parseIndonesianDay('invalid_day')).toBe(today);
            expect(DateParser.parseIndonesianDay('')).toBe(today);
        });
    });

    describe('Relative Date Parsing Tests', () => {
        test('should parse week and month relative dates', () => {
            const nextWeek = DateParser.parseRelativeDate('minggu depan');
            const nextMonth = DateParser.parseRelativeDate('bulan depan');
            
            expect(nextWeek).toMatch(/\d{2}-\d{2}-\d{4}/);
            expect(nextMonth).toMatch(/\d{2}-\d{2}-\d{4}/);
            
            const today = DateParser.getTodayFormatted();
            expect(DateParser.getDaysDifference(today, nextWeek)).toBe(7);
        });

        test('should fallback to regular parsing for non-relative dates', () => {
            const result = DateParser.parseRelativeDate('15 September');
            const currentYear = new Date().getFullYear();
            expect(result).toBe(`15-09-${currentYear}`);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle leap year correctly', () => {
            expect(DateParser.isValidDateString('29-02-2024')).toBe(true);
            expect(DateParser.isValidDateString('29-02-2023')).toBe(false);
        });

        test('should handle month boundaries correctly', () => {
            expect(DateParser.isValidDateString('31-01-2024')).toBe(true);
            expect(DateParser.isValidDateString('31-04-2024')).toBe(false); // April has 30 days
            expect(DateParser.isValidDateString('30-04-2024')).toBe(true);
        });

        test('should handle case sensitivity in month names', () => {
            const currentYear = new Date().getFullYear();
            expect(DateParser.parseDate('15 SEPTEMBER')).toBe(`15-09-${currentYear}`);
            expect(DateParser.parseDate('15 september')).toBe(`15-09-${currentYear}`);
            expect(DateParser.parseDate('15 September')).toBe(`15-09-${currentYear}`);
        });

        test('should handle whitespace in date strings', () => {
            const currentYear = new Date().getFullYear();
            expect(DateParser.parseDate('  15   September  ')).toBe(`15-09-${currentYear}`);
        });

        test('should handle concurrent date operations', () => {
            const operations = [];
            for (let i = 0; i < 10; i++) {
                operations.push(DateParser.parseDate('hari ini'));
            }
            
            // All operations should return the same result
            const firstResult = operations[0];
            operations.forEach(result => {
                expect(result).toBe(firstResult);
            });
        });
    });
});