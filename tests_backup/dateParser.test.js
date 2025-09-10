const DateParser = require('../src/utils/dateParser');

describe('Date Parser Tests', () => {
    test('should parse date correctly', () => {
        const result = DateParser.parseDate('hari ini');
        expect(result).toMatch(/\d{2}-\d{2}-\d{4}/);
    });
});