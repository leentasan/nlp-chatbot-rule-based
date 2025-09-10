// tests/setup.js - Global Test Setup Configuration
const fs = require('fs');
const path = require('path');

// Global test setup - runs once before all tests
beforeAll(() => {
    console.log('🚀 Setting up ScheduleBot test environment...');

    // Create necessary directories if they don't exist
    const dirs = [
        path.join(__dirname, '../data'),
        path.join(__dirname, '../backups'),
        path.join(__dirname, '../exports'),
        path.join(__dirname, '../coverage'),
        path.join(__dirname, '../logs')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${path.basename(dir)}`);
        }
    });

    // Backup original data files if they exist
    const originalDataFile = path.join(__dirname, '../data/data.json');
    const backupDataFile = path.join(__dirname, '../data/data.json.test-backup');

    if (fs.existsSync(originalDataFile)) {
        fs.copyFileSync(originalDataFile, backupDataFile);
        console.log('💾 Backed up original data file');
    }

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';

    console.log('✅ Test environment setup complete');
});

// Global test teardown - runs once after all tests
afterAll(() => {
    console.log('🧹 Cleaning up test environment...');

    // Restore original data file if backup exists
    const originalDataFile = path.join(__dirname, '../data/data.json');
    const backupDataFile = path.join(__dirname, '../data/data.json.test-backup');

    if (fs.existsSync(backupDataFile)) {
        fs.copyFileSync(backupDataFile, originalDataFile);
        fs.unlinkSync(backupDataFile);
        console.log('🔄 Restored original data file');
    }

    // Clean up test-generated files
    const cleanupDirs = [
        path.join(__dirname, '../exports'),
        path.join(__dirname, '../backups')
    ];

    cleanupDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            try {
                fs.readdirSync(dir).forEach(file => {
                    if (file.includes('test') || 
                        file.includes('backup_') || 
                        file.includes('jadwal_') ||
                        file.endsWith('.csv') ||
                        file.endsWith('.txt') ||
                        file.endsWith('.json')) {
                        
                        const filePath = path.join(dir, file);
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Cleaned up: ${file}`);
                    }
                });
            } catch (error) {
                console.warn(`⚠️ Could not clean directory ${dir}: ${error.message}`);
            }
        }
    });

    console.log('✅ Test cleanup complete');
});

// Global error handlers for unhandled promises and errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// Custom matchers for better test assertions
expect.extend({
    toBeValidScheduleResponse(received) {
        const pass = typeof received === 'string' && 
                     received.length > 0 && 
                     (received.includes('✅') || received.includes('❌') || received.includes('📅'));
        
        if (pass) {
            return {
                message: () => `Expected ${received} not to be a valid schedule response`,
                pass: true,
            };
        } else {
            return {
                message: () => `Expected ${received} to be a valid schedule response (should contain ✅, ❌, or 📅 and be non-empty string)`,
                pass: false,
            };
        }
    },

    toBeValidTimeFormat(received) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const pass = typeof received === 'string' && timeRegex.test(received);
        
        if (pass) {
            return {
                message: () => `Expected ${received} not to be valid time format`,
                pass: true,
            };
        } else {
            return {
                message: () => `Expected ${received} to be valid time format (HH:MM)`,
                pass: false,
            };
        }
    },

    toBeValidDateFormat(received) {
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        const pass = typeof received === 'string' && dateRegex.test(received);
        
        if (pass) {
            return {
                message: () => `Expected ${received} not to be valid date format`,
                pass: true,
            };
        } else {
            return {
                message: () => `Expected ${received} to be valid date format (DD-MM-YYYY)`,
                pass: false,
            };
        }
    },

    toContainSchedule(received, scheduleName) {
        const pass = typeof received === 'string' && 
                     received.toLowerCase().includes(scheduleName.toLowerCase());
        
        if (pass) {
            return {
                message: () => `Expected response not to contain schedule "${scheduleName}"`,
                pass: true,
            };
        } else {
            return {
                message: () => `Expected response to contain schedule "${scheduleName}"`,
                pass: false,
            };
        }
    }
});

// Mock console methods for cleaner test output
global.console = {
    ...console,
    // Suppress console.log during tests unless explicitly needed
    log: process.env.VERBOSE_TESTS ? console.log : jest.fn(),
    
    // Keep error and warn for debugging
    error: console.error,
    warn: console.warn,
    
    // Mock other methods
    info: process.env.VERBOSE_TESTS ? console.info : jest.fn(),
    debug: process.env.VERBOSE_TESTS ? console.debug : jest.fn(),
};

// Test utilities available globally
global.testUtils = {
    // Helper to create a clean bot instance
    createCleanBot: () => {
        const ScheduleBot = require('../src/bot');
        const bot = new ScheduleBot();
        
        const initialData = { 
            schedules: [],
            settings: { reminderEnabled: true, defaultReminderMinutes: 30 }
        };
        fs.writeFileSync(bot.dataFile, JSON.stringify(initialData, null, 2));
        
        return bot;
    },

    // Helper to add sample schedules
    addSampleSchedules: (bot) => {
        const schedules = [
            'Tambah morning meeting jam 9',
            'Jadwalkan lunch break jam 12',
            'Buat jadwal evening workout jam 6 sore'
        ];
        
        return schedules.map(schedule => bot.processMessage(schedule));
    },

    // Helper to wait for async operations
    wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

    // Helper to generate test data
    generateTestSchedule: (name = 'test', time = '09:00') => {
        return `Tambah ${name} schedule jam ${time.replace(':', '.')}`;
    },

    // Helper to clean test files
    cleanTestFiles: () => {
        const dirs = [
            path.join(__dirname, '../exports'),
            path.join(__dirname, '../backups')
        ];

        dirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                fs.readdirSync(dir).forEach(file => {
                    if (file.includes('test') || file.includes('jadwal_') || file.includes('backup_')) {
                        fs.unlinkSync(path.join(dir, file));
                    }
                });
            }
        });
    }
};

console.log('🔧 Test utilities and custom matchers loaded');