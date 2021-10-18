const spawn = require('child_process').spawn
const Discord = require('discord.js')
const bot = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] })
bot.login(require('./cred.json').token)
let options = require('./options.json')
let stdInReplies = {}
let preventFromRunning = {}

bot.once('ready', () => {
    console.log(`Ready! Username: ${bot.user.username}, Discriminator: ${bot.user.discriminator}`)
    options.commands.forEach(command => {
        if (command.type == 'message') {
            if (command.filter.type == 'none') {
                bot.on('messageCreate', message => {
                    if (message.type == 'REPLY') {
                        let std = stdInReplies[message.reference.messageId]
                        if (std) {
                            std.stdIn.setEncoding('utf8')
                            std.stdIn.pipe(std.stdOut)
                            std.stdIn.write(message.content)
                        }
                    } else if (message.content == command.trigger) {
                        runBatchFile(message, command)
                    }
                })
            } else if (command.filter.type == 'exclusive') {
                bot.on('messageCreate', message => {
                    if (message.type == 'REPLY') {
                        let std = stdInReplies[message.reference.messageId]
                        if (std) {
                            std.stdIn.setEncoding('utf8')
                            std.stdIn.pipe(std.stdOut)
                            std.stdIn.write(message.content)
                        }
                    } else if (message.content == command.trigger) {
                        if (command.filter.users.includes(message.author.id)) {
                            runBatchFile(message, command)
                        } else {
                            message.reply('Sorry! You do not have permission to run that command!')
                        }
                    }
                })
            } else if (command.filter.type == 'exception') {
                bot.on('messageCreate', message => {
                    if (message.type == 'REPLY') {
                        let std = stdInReplies[message.reference.messageId]
                        if (std) {
                            std.stdIn.setEncoding('utf8')
                            std.stdIn.pipe(std.stdOut)
                            std.stdIn.write(message.content)
                        }
                    } else if (message.content == command.trigger) {
                        if (!command.filter.users.includes(message.author.id)) {
                            runBatchFile(message, command)
                        } else {
                            message.reply('Sorry! You do not have permission to run that command!')
                        }
                    }
                })
            }
        }
    })
})

function runBatchFile(message, command) {
    let batchFile = command.batchFile
    batchFile = batchFile.replace('{{$username}}', message.author.username).replace('{{$discriminator}}', message.author.discriminator).replace('{{$userId}}', message.author.id)
    if (!preventFromRunning[batchFile]) {
        preventFromRunning[batchFile] = true
        const process = spawn('cmd.exe', ['/c', batchFile], { detatched: true })
        if (command.replies.replyOnSpawn) {
            message.reply(command.replies.replyOnSpawn).then(message => {
                let replyToMessage = message
                if (command.replies.replyToStdin.includes('SPAWN')) {
                    stdInReplies[replyToMessage.id] = { stdIn: process.stdin, stdOut: process.stdout }
                }
            })
        }
        if (command.replies.replyOnFinish) {
            process.on('exit', code => {
                preventFromRunning[batchFile] = false
                message.reply(command.replies.replyOnFinish.replace('{{$code}}', code)).then(message => {
                    let replyToMessage = message
                    if (command.replies.replyToStdin.includes('FINISH')) {
                        stdInReplies[replyToMessage.id] = { stdIn: process.stdin, stdOut: process.stdout }
                    }
                })
            })
        } else {
            process.on('exit', code => {
                preventFromRunning[batchFile] = false
            })
        }
        if (command.replies.replyOnError) {
            process.on('error', err => {
                message.reply(command.replies.replyOnError.replace('{{$error}}', err)).then(message => {
                    let replyToMessage = message
                    if (command.replies.replyToStdin.includes('ERROR')) {
                        stdInReplies[replyToMessage.id] = { stdIn: process.stdin, stdOut: process.stdout }
                    }
                })
            })
        }
        if (command.replies.replyOnStderr) {
            process.stderr.on('data', data => {
                message.reply(command.replies.replyOnStderr.replace('{{$stderr}}', data.toString('utf8'))).then(message => {
                    let replyToMessage = message
                    if (command.replies.replyToStdin.includes('STDERR')) {
                        stdInReplies[replyToMessage.id] = { stdIn: process.stdin, stdOut: process.stdout }
                    }
                })
            })
        }
        if (command.replies.replyOnStdout) {
            process.stdout.on('data', data => {
                message.reply(command.replies.replyOnStdout.replace('{{$stdout}}', data.toString('utf8'))).then(message => {
                    let replyToMessage = message
                    if (command.replies.replyToStdin.includes('STDOUT')) {
                        stdInReplies[replyToMessage.id] = { stdIn: process.stdin, stdOut: process.stdout }
                    }
                })
            })
        }
    } else {
        message.reply('The command is already running. Wait for it to finish first!')
    }
}

options.commands.forEach(command => {
    if (typeof command.trigger !== 'string') {
        console.log(`Command trigger needs to be a string for the command ${command.trigger}!`)
        process.exit(1)
    } else if (command.type !== 'message') {
        console.log(`Command type needs to be "message" for the command ${command.trigger}!`)
        process.exit(1)
    } else if (command.filter.type !== 'exclusive' && command.filter.type !== 'exception' && command.filter.type !== 'none') {
        console.log(`Filter type needs to be either "none", "exclusive" or "exception" for the command ${command.trigger}!`)
        process.exit(1)
    } else if (typeof command.filter.users !== 'object') {
        console.log(`Filter.users needs to be an Array for the command ${command.trigger}!`)
        process.exit(1)
    } else if (typeof command.replies.replyOnSpawn !== 'string') {
        console.log(`ReplyOnSpawn needs to be a string for the command ${command.trigger}!`)
        process.exit(1)
    } else if (typeof command.replies.replyOnFinish !== 'string') {
        console.log(`ReplyOnFinish needs to be a string for the command ${command.trigger}!`)
        process.exit(1)
    } else if (typeof command.replies.replyOnError !== 'string') {
        console.log(`ReplyOnError needs to be a string for the command ${command.trigger}!`)
        process.exit(1)
    } else if (typeof command.replies.replyOnStderr !== 'string') {
        console.log(`ReplyOnStderr needs to be a string for the command ${command.trigger}!`)
        process.exit(1)
    } else if (typeof command.replies.replyOnStdout !== 'string') {
        console.log(`ReplyOnStdout needs to be a string for the command ${command.trigger}!`)
        process.exit(1)
    } else if (typeof command.replies.replyToStdin !== 'object') {
        console.log(`ReplyToStdin needs to be an Array for the command ${command.trigger}!`)
        process.exit(1)
    } else if (typeof command.preventFromSimultaneousExecution !== 'boolean') {
        console.log(`PreventFromSimultaneousExecution needs to be a Boolean for the command ${command.trigger}!`)
        process.exit(1)
    }
})