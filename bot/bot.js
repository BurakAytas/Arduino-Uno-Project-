require('dotenv').config(); // .env dosyasından DISCORD_TOKEN, DISCORD_CHANNEL_ID, SERIAL_PORT okunur
const cron = require('cron'); // her saniye çalışan job için
const Discord = require('discord.js'); // discord botu için (v12)
const SerialPort = require('serialport'); // arduinodan veri almak için (v9)
const Readline = require('@serialport/parser-readline'); // satır satır okumak için

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';
const PREFIX = 'uno'; // komut öneki (büyük/küçük harf farketmez)
const COOLDOWN_MS = 30 * 1000; // aynı uyarı en fazla 30 saniyede bir gönderilir

if (!TOKEN || !CHANNEL_ID) {
    console.error('DISCORD_TOKEN ve DISCORD_CHANNEL_ID .env dosyasında tanımlı olmalı (bkz. .env.example).');
    process.exit(1);
}

const client = new Discord.Client();
const port = new SerialPort(SERIAL_PORT, { baudRate: 9600 }); // arduino ile 9600 baud
const parser = port.pipe(new Readline({ delimiter: '\n' })); // satır sonu \n

let ArduinoData = null; // arduinodan gelen son işlenmemiş veri
let temp = 0; // son okunan oda sıcaklığı
const lastAlert = { gas: 0, motion: 0 }; // uyarıların son gönderilme zamanı

port.on('open', () => {
    console.log('serial port open');
});

port.on('error', err => {
    console.error('serial port error:', err.message);
});

parser.on('data', data => {
    console.log('got word from arduino:', data.length + ' -> ' + data);
    ArduinoData = data.trim();
});

function alertWithCooldown(channel, key, text) {
    const now = Date.now();
    if (now - lastAlert[key] >= COOLDOWN_MS) {
        lastAlert[key] = now;
        channel.send(text);
    }
}

client.once('ready', () => {
    const mainChannel = client.channels.cache.get(CHANNEL_ID);
    console.log('Bot is online!');

    // her saniye çalışır: * * * * * * = saniye dakika saat gün ay haftanın günü
    const job = new cron.CronJob('* * * * * *', () => {
        if (ArduinoData === null || ArduinoData === '') return;
        const value = Number(ArduinoData);
        ArduinoData = null; // aynı veri tekrar işlenmesin

        if (Number.isNaN(value)) return;
        if (value === 0) { // 0 = gaz kaçağı
            alertWithCooldown(mainChannel, 'gas', 'GAZ KAÇAĞI VAR !!');
        } else if (value === 1) { // 1 = hareket
            alertWithCooldown(mainChannel, 'motion', 'HAREKET TESPİT EDİLDİ !!');
        } else if (value < 40 && value > 10) { // diğer değerler = oda sıcaklığı
            temp = value;
        }
    });
    job.start();
});

client.on('message', message => {
    if (message.author.bot) return;
    if (!message.content.toLowerCase().startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = (args.shift() || '').toLowerCase();
    if (command === 'sıcaklık') {
        message.channel.send('Ortam sıcaklığı: ' + temp);
    }
});

client.login(TOKEN);
