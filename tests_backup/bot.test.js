const ScheduleBot = require('../src/bot');

describe('ScheduleBot Basic Tests', () => {
    let bot;
    
    beforeEach(() => {
        // Mock fs untuk menghindari file I/O issues
        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => false),
            mkdirSync: jest.fn(),
            writeFileSync: jest.fn(),
            readFileSync: jest.fn(() => JSON.stringify({ schedules: [], settings: {} })),
        }));
        
        bot = new ScheduleBot();
    });

    test('should create bot instance', () => {
        expect(bot).toBeDefined();
        expect(typeof bot.processMessage).toBe('function');
    });

    test('should process help command', () => {
        const result = bot.processMessage('bantuan');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});