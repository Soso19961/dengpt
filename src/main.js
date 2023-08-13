import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'
import { openai } from './openai.js'
import { removeFile } from './utils.js'
import { initCommand, processTextToChat, INITIAL_SESSION } from './logic.js'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())

bot.command('new', initCommand)

bot.command('start', initCommand)

bot.command('start', async (ctx) => {
  await ctx.reply("<b>Добро пожаловать! Я готов ответить на ваши голосовые и текстовые вопросы. Просто начните диалог, отправив сообщение или нажав на иконку микрофона.</b>", { parse_mode: "HTML" });
})

bot.on(message('voice'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION
  try {
    await ctx.reply("<b><i>АлешкинGPT думает, ожидайте...</i></b>", { parse_mode: "HTML" });
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)
    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    removeFile(oggPath)

    const text = await openai.transcription(mp3Path)
    await ctx.reply(code(`Ваш запрос: ${text}`))

    await processTextToChat(ctx, text)
  } catch (e) {
    console.log(`Error while voice message`, e.message)
  }
})

bot.on(message('text'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION
  try {
    await ctx.reply("<b><i>АлешкинGPT думает, ожидайте...</i></b>", { parse_mode: "HTML" });
    await processTextToChat(ctx, ctx.message.text)
  } catch (e) {
    console.log(`Error while voice message`, e.message)
  }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
