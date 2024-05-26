require('dotenv').config();

const helpers = require('./helpers');

const TelegramAPI = require('node-telegram-bot-api');

const token = "6684187305:AAGxVZLUZ7xa-P-JvUmo97BRHkTRV4ZQfhM";

const bot = new TelegramAPI(token, {polling: true});

const createTasksData = (chatID) => {

};

const onStart = (chatID) => {
	bot.sendMessage(chatID, 'Ку. Я помогу тебе не забывать что ты делал сегодня. Ну... я постараюсь..');
}

const textMesssagesAccess = {
	'/start': onStart,
	'/what_i_do_today': createTasksData,
}

// bot.setChatMenuButton(chatID, {
// 	menu_button: {
// 		type: 'default'
// 	}
// })

bot.on('message', async (msg) => {
	console.log(msg);
	const chatID = msg.chat.id;
	const dateMS = new Date(msg.date);

	if ('text' in msg) {
		console.log(typeof textMesssagesAccess[msg.text]);
		if (typeof textMesssagesAccess[msg.text] === 'function') {
			textMesssagesAccess[msg.text](chatID);
		} else {
			bot.sendMessage(chatID, 'Сорян, мне надо присылать аудио...');
		}
	}

	if ('voice' in msg) {
		const loadingMsg = await bot.sendMessage(chatID, 'Бот обрабатывает запрос...');
		const loadingMsgID = loadingMsg.message_id;

		const file_path = await helpers.getFilePath(token, msg.voice.file_id);
		console.log(file_path);

		if (!file_path) {
			return;
		}

		const buffer = await helpers.getFileBuffer(token, file_path);

		helpers.saveFile(file_path, buffer)
			.then((pathToFile) => helpers.STT(pathToFile))
			.then(async (text) => {
				// bot.sendMessage(chatID, text);
				const responce = await helpers.sendMsgToGPT(text);

				bot.deleteMessage(chatID, loadingMsgID);
				bot.sendMessage(chatID, responce);
			});

		
	}
})