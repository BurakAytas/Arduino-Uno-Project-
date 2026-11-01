# Arduino Uno Gas / Motion / Temperature Alarm with Discord Bot

An Arduino Uno monitors a gas sensor, a PIR motion sensor and a temperature sensor. It drives LEDs and a buzzer locally and streams readings over the serial port to a Node.js Discord bot, which posts alerts to a channel and answers a temperature query command.

This was a term project for a microprocessor-based system design course. The circuit was simulated in Proteus; the library files are in `docs/library/` and the project report is in `docs/`.

## Hardware (from the sketch)

| Part | Arduino pin | Notes |
|---|---|---|
| Gas sensor | A5 | alarm when analog reading > 250 |
| Temperature sensor | A0 | converted as `(5000/1023 * reading) / 10` (10 mV per degree C) |
| PIR motion sensor | D9 | digital input |
| Red LED | D12 | on during gas alarm |
| Green LED | D11 | on when no gas alarm |
| Buzzer | D10 | 1 kHz tone during gas alarm |

## Wiring summary

- Gas sensor analog output to A5, temperature sensor analog output to A0, PIR output to D9.
- Red LED on D12, green LED on D11 (each with a series resistor), buzzer on D10.
- Arduino connected to the PC over USB; the bot reads it as a serial port (default `COM3`, 9600 baud).

## How data flows

```
sensors -> Arduino sketch -> Serial (9600) -> bot/bot.js -> Discord channel
```

The sketch prints one value per line:

| Serial value | Meaning |
|---|---|
| `0` | gas detected |
| `1` | motion detected |
| anything else | temperature in degrees C |

The bot polls the latest value every second. Gas and motion alerts are rate-limited by a 30 second cooldown per alert type. Temperature values between 10 and 40 are stored as the current room temperature.

## Bot commands

Messages are matched case-insensitively with the prefix `uno`.

- `uno sıcaklık` - replies with the last stored room temperature.

## Setup

1. Open `arduino/gas_motion_temp_alarm/gas_motion_temp_alarm.ino` in the Arduino IDE and upload it to an Uno.
2. Create a Discord bot, invite it to your server, and copy its token and the target channel id.
3. Configure the bot:
   ```
   cd bot
   cp .env.example .env     # then fill in DISCORD_TOKEN, DISCORD_CHANNEL_ID, SERIAL_PORT
   npm install
   npm start
   ```
4. Never commit your `.env` file; it is ignored by `.gitignore`.

The bot uses discord.js v12 and serialport v9.

## Repository layout

```
arduino/gas_motion_temp_alarm/   Arduino sketch
bot/                             Node.js Discord bot
docs/                            Report (PDF) and Proteus sensor libraries
```
