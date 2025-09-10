const ScheduleBot = require('../src/bot');

describe('Integration Tests', () => {
    test('should run basic integration test', () => {
        const bot = new ScheduleBot();
        const result = bot.processMessage('bantuan');
        expect(result).toContain('SCHEDBOT');
    });
});