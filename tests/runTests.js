#!/usr/bin/env node
// tests/runTests.js - Comprehensive Test Runner Script

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class TestRunner {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    log(message, color = 'white') {
        console.log(chalk[color](message));
    }

    async runCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                stdio: 'pipe',
                ...options
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                resolve({
                    code,
                    stdout,
                    stderr
                });
            });

            process.on('error', reject);
        });
    }

    async checkDependencies() {
        this.log('\n🔍 Checking dependencies...', 'cyan');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const requiredDeps = ['jest', 'chalk', 'csv-writer', 'fuse.js', 'node-cron'];
            
            const missing = requiredDeps.filter(dep => 
                !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
            );

            if (missing.length > 0) {
                this.log(`❌ Missing dependencies: ${missing.join(', ')}`, 'red');
                this.log('Please run: npm install', 'yellow');
                return false;
            }

            this.log('✅ All dependencies are installed', 'green');
            return true;
        } catch (error) {
            this.log(`❌ Error checking dependencies: ${error.message}`, 'red');
            return false;
        }
    }

    async setupTestEnvironment() {
        this.log('\n🛠️ Setting up test environment...', 'cyan');

        const testDirs = ['tests', 'coverage', 'data', 'exports', 'backups'];
        
        for (const dir of testDirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.log(`📁 Created directory: ${dir}`, 'gray');
            }
        }

        // Create test files if they don't exist
        const testFiles = [
            'tests/bot.test.js',
            'tests/nlpHelper.test.js', 
            'tests/dateParser.test.js',
            'tests/integration.test.js'
        ];

        const missingFiles = testFiles.filter(file => !fs.existsSync(file));
        
        if (missingFiles.length > 0) {
            this.log(`⚠️ Missing test files: ${missingFiles.join(', ')}`, 'yellow');
        } else {
            this.log('✅ All test files are present', 'green');
        }

        return true;
    }

    async runUnitTests() {
        this.log('\n🧪 Running Unit Tests...', 'cyan');
        this.log('=' .repeat(50), 'gray');

        const unitTestPattern = 'tests/+(nlpHelper|dateParser).test.js';
        const result = await this.runCommand('npx', ['jest', unitTestPattern, '--verbose']);

        this.testResults.push({
            name: 'Unit Tests',
            passed: result.code === 0,
            output: result.stdout,
            error: result.stderr
        });

        if (result.code === 0) {
            this.log('✅ Unit tests passed', 'green');
        } else {
            this.log('❌ Unit tests failed', 'red');
            console.log(result.stdout);
            console.error(result.stderr);
        }

        return result.code === 0;
    }

    async runFunctionalTests() {
        this.log('\n⚙️ Running Functional Tests...', 'cyan');
        this.log('=' .repeat(50), 'gray');

        const functionalTestPattern = 'tests/bot.test.js';
        const result = await this.runCommand('npx', ['jest', functionalTestPattern, '--verbose']);

        this.testResults.push({
            name: 'Functional Tests',
            passed: result.code === 0,
            output: result.stdout,
            error: result.stderr
        });

        if (result.code === 0) {
            this.log('✅ Functional tests passed', 'green');
        } else {
            this.log('❌ Functional tests failed', 'red');
            console.log(result.stdout);
            console.error(result.stderr);
        }

        return result.code === 0;
    }

    async runIntegrationTests() {
        this.log('\n🔗 Running Integration Tests...', 'cyan');
        this.log('=' .repeat(50), 'gray');

        const integrationTestPattern = 'tests/integration.test.js';
        const result = await this.runCommand('npx', ['jest', integrationTestPattern, '--verbose', '--testTimeout=15000']);

        this.testResults.push({
            name: 'Integration Tests',
            passed: result.code === 0,
            output: result.stdout,
            error: result.stderr
        });

        if (result.code === 0) {
            this.log('✅ Integration tests passed', 'green');
        } else {
            this.log('❌ Integration tests failed', 'red');
            console.log(result.stdout);
            console.error(result.stderr);
        }

        return result.code === 0;
    }

    async runAllTests() {
        this.log('\n🚀 Running All Tests...', 'cyan');
        this.log('=' .repeat(50), 'gray');

        const result = await this.runCommand('npx', ['jest', '--coverage', '--verbose']);

        this.testResults.push({
            name: 'All Tests with Coverage',
            passed: result.code === 0,
            output: result.stdout,
            error: result.stderr
        });

        if (result.code === 0) {
            this.log('✅ All tests passed with coverage', 'green');
        } else {
            this.log('❌ Some tests failed', 'red');
        }

        // Always show output for full test run
        console.log(result.stdout);
        if (result.stderr) {
            console.error(result.stderr);
        }

        return result.code === 0;
    }

    async generateTestReport() {
        this.log('\n📊 Generating Test Report...', 'cyan');

        const endTime = Date.now();
        const duration = endTime - this.startTime;
        const passedTests = this.testResults.filter(test => test.passed).length;
        const totalTests = this.testResults.length;

        const report = {
            timestamp: new Date().toISOString(),
            duration: duration,
            totalTests: totalTests,
            passedTests: passedTests,
            failedTests: totalTests - passedTests,
            results: this.testResults
        };

        // Save detailed report
        const reportPath = path.join('coverage', 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Generate summary
        this.log('\n📋 Test Summary:', 'cyan');
        this.log('=' .repeat(50), 'gray');
        this.log(`⏱️ Total Duration: ${(duration / 1000).toFixed(2)}s`);
        this.log(`📊 Tests Run: ${totalTests}`);
        this.log(`✅ Passed: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
        this.log(`❌ Failed: ${totalTests - passedTests}`, totalTests - passedTests === 0 ? 'gray' : 'red');
        
        if (passedTests === totalTests) {
            this.log('\n🎉 All tests passed successfully!', 'green');
        } else {
            this.log('\n⚠️ Some tests failed. Check the output above.', 'yellow');
        }

        return report;
    }

    async runLinting() {
        this.log('\n🔍 Running Code Linting...', 'cyan');
        
        try {
            // Check if ESLint is available
            const result = await this.runCommand('npx', ['eslint', '--version']);
            if (result.code === 0) {
                const lintResult = await this.runCommand('npx', ['eslint', 'src/**/*.js', '--format', 'compact']);
                
                if (lintResult.code === 0) {
                    this.log('✅ No linting errors found', 'green');
                } else {
                    this.log('⚠️ Linting issues found:', 'yellow');
                    console.log(lintResult.stdout);
                }
                
                return lintResult.code === 0;
            }
        } catch (error) {
            this.log('ℹ️ ESLint not available, skipping linting', 'gray');
        }
        
        return true;
    }

    async cleanupTestEnvironment() {
        this.log('\n🧹 Cleaning up test environment...', 'cyan');

        const cleanupPaths = [
            'data/test-*.json',
            'exports/test-*',
            'exports/jadwal_*',
            'backups/backup_*'
        ];

        let cleanedFiles = 0;

        for (const pattern of cleanupPaths) {
            const [dir, filePattern] = pattern.split('/');
            
            if (fs.existsSync(dir)) {
                try {
                    const files = fs.readdirSync(dir);
                    const matchingFiles = files.filter(file => {
                        return filePattern.includes('*') 
                            ? file.includes(filePattern.replace('*', ''))
                            : file === filePattern;
                    });

                    matchingFiles.forEach(file => {
                        const filePath = path.join(dir, file);
                        fs.unlinkSync(filePath);
                        cleanedFiles++;
                    });
                } catch (error) {
                    this.log(`⚠️ Could not clean ${dir}: ${error.message}`, 'yellow');
                }
            }
        }

        if (cleanedFiles > 0) {
            this.log(`🗑️ Cleaned up ${cleanedFiles} test files`, 'green');
        } else {
            this.log('ℹ️ No test files to clean up', 'gray');
        }
    }

    async run(testType = 'all') {
        try {
            this.log('🤖 ScheduleBot Test Runner', 'magenta');
            this.log('=' .repeat(50), 'gray');

            // Pre-flight checks
            const depsOk = await this.checkDependencies();
            if (!depsOk) return false;

            await this.setupTestEnvironment();

            // Run linting
            await this.runLinting();

            // Run tests based on type
            let allPassed = true;

            switch (testType) {
                case 'unit':
                    allPassed = await this.runUnitTests();
                    break;
                
                case 'functional':
                    allPassed = await this.runFunctionalTests();
                    break;
                
                case 'integration':
                    allPassed = await this.runIntegrationTests();
                    break;
                
                case 'all':
                default:
                    const unitPassed = await this.runUnitTests();
                    const functionalPassed = await this.runFunctionalTests();
                    const integrationPassed = await this.runIntegrationTests();
                    
                    // Run full suite with coverage
                    const fullSuitePassed = await this.runAllTests();
                    
                    allPassed = unitPassed && functionalPassed && integrationPassed && fullSuitePassed;
                    break;
            }

            // Generate report
            await this.generateTestReport();

            // Cleanup
            await this.cleanupTestEnvironment();

            return allPassed;

        } catch (error) {
            this.log(`❌ Test runner error: ${error.message}`, 'red');
            console.error(error);
            return false;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const testType = args[0] || 'all';
    const validTypes = ['all', 'unit', 'functional', 'integration'];

    if (!validTypes.includes(testType)) {
        console.log(chalk.red(`❌ Invalid test type: ${testType}`));
        console.log(chalk.yellow(`Valid types: ${validTypes.join(', ')}`));
        process.exit(1);
    }

    const runner = new TestRunner();
    const success = await runner.run(testType);

    process.exit(success ? 0 : 1);
}

// Help function
function showHelp() {
    console.log(chalk.cyan('📚 ScheduleBot Test Runner Help'));
    console.log('');
    console.log('Usage: node tests/runTests.js [test-type]');
    console.log('');
    console.log('Test Types:');
    console.log('  all         - Run all tests (default)');
    console.log('  unit        - Run unit tests only');
    console.log('  functional  - Run functional tests only');
    console.log('  integration - Run integration tests only');
    console.log('');
    console.log('Examples:');
    console.log('  node tests/runTests.js');
    console.log('  node tests/runTests.js unit');
    console.log('  node tests/runTests.js integration');
    console.log('');
    console.log('Environment Variables:');
    console.log('  VERBOSE_TESTS=1  - Enable verbose console output');
    console.log('  CI=1             - Optimize for CI environment');
}

// Handle help requests
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Run main function if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('❌ Unexpected error:'), error);
        process.exit(1);
    });
}

module.exports = TestRunner;