const NLPHelpers = require('../src/utils/nlpHelper');

describe('NLP Helper Tests', () => {
    test('should parse time correctly', () => {
        expect(NLPHelpers.parseTime('7 pagi')).toBe('07:00');
    });
});