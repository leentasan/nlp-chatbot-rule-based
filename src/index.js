const readline = require('readline');
const chalk = require('chalk');
const ScheduleBot = require('./bot');

class ScheduleBotCLI {
    constructor() {
        this.bot = new ScheduleBot();
        this.rl = null;
    }

    // Start CLI Interface
    start() {
        console.clear();
        console.log(chalk.cyan('🤖 SCHEDBOT - Schedule Assistant'));
        console.log(chalk.green('Ketik "bantuan" untuk melihat perintah yang tersedia'));
        console.log(chalk.yellow('Ketik "exit" untuk keluar\n'));

        // Display health check
        const health = this.bot.healthCheck();
        if (health.status === 'healthy') {
            console.log(chalk.green(`✅ Bot ready! ${health.totalSchedules} jadwal tersimpan`));
        } else {
            console.log(chalk.red(`❌ Bot error: ${health.error}`));
        }
        console.log('');

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.askQuestion();
    }

    // Interactive question loop
    askQuestion() {
        this.rl.question(chalk.blue('You: '), (input) => {
            if (input.toLowerCase().trim() === 'exit') {
                console.log(chalk.magenta('👋 Sampai jumpa!'));
                this.rl.close();
                process.exit(0);
            }

            if (input.toLowerCase().trim() === 'clear') {
                console.clear();
                this.askQuestion();
                return;
            }

            if (input.toLowerCase().trim() === 'status') {
                const health = this.bot.healthCheck();
                console.log(chalk.cyan('🔍 Status Bot:'));
                console.log(JSON.stringify(health, null, 2));
                console.log('');
                this.askQuestion();
                return;
            }

            try {
                const response = this.bot.processMessage(input);
                console.log(chalk.white(`Bot: ${response}\n`));
            } catch (error) {
                console.log(chalk.red(`❌ Error: ${error.message}\n`));
            }

            this.askQuestion();
        });
    }

    // Graceful shutdown
    shutdown() {
        console.log(chalk.yellow('\n🛑 Shutting down ScheduleBot...'));
        if (this.rl) {
            this.rl.close();
        }
        process.exit(0);
    }
}

// Handle process signals for graceful shutdown
const cli = new ScheduleBotCLI();

process.on('SIGINT', () => cli.shutdown());
process.on('SIGTERM', () => cli.shutdown());

// Start the application
if (require.main === module) {
    console.log(chalk.green('🚀 Starting ScheduleBot CLI...'));
    cli.start();
}

module.exports = { ScheduleBotCLI, ScheduleBot };