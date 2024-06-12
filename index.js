require('dotenv').config();

const helpers = require('./helpers');
const options = require('./options');
const DB = require('./database');

const TelegramAPI = require('node-telegram-bot-api');

const bot = new TelegramAPI(process.env.TELEGRAM_TOKEN, {polling: true});

const createTasksData = async (chatID) => {
	// const res = await DB.get();

	// if (res.status) {
	// 	const tasks = DB.getTasksByToday(res.data);

	// 	const result = DB.createResultList(tasks);

	// 	bot.sendMessage(chatID, result);
	// } else {
	// 	bot.sendMessage(chatID, res.data, keyBoards.error);
	// }
};

const onStart = (chatID) => {
	bot.sendMessage(chatID, 'Ку. Я помогу тебе не забывать что ты делал сегодня. Ну... я постараюсь..');
}

const textMesssagesAccess = {
	'/start': onStart,
	'/what_i_do_today': createTasksData,
}

const keyBoards = {
	success: {
		reply_markup: JSON.stringify({
			inline_keyboard: options.successBtns,
		})
	},
	error: {
		reply_markup: JSON.stringify({
			inline_keyboard: options.errorBtns,
		})
	}
}

let lastUserMsgId = 0;

bot.setMyCommands(options.commands);

bot.on('message', async (msg) => {
	const chatID = msg.chat.id;
	lastUserMsgId = msg.message_id;

	if ('text' in msg) {
		if (typeof textMesssagesAccess[msg.text] === 'function') {
			textMesssagesAccess[msg.text](chatID);
		} else {
			bot.sendMessage(chatID, 'Сорян, мне надо присылать аудио...');
		}
	}

	if ('voice' in msg) {
		const loadingMsg = await bot.sendMessage(chatID, 'Бот обрабатывает запрос...');
		const loadingMsgID = loadingMsg.message_id;

		const file_path = await helpers.getFilePath(msg.voice.file_id);

		if (!file_path) {
			return;
		}

		const buffer = await helpers.getFileBuffer(file_path);

		helpers.saveFile(file_path, buffer)
			.then((pathToFile) => helpers.STT(pathToFile))
			.then(async (text) => {
				const responce = await helpers.sendMsgToGPT(text);

				if (!responce) {
					bot.sendMessage(chatID, `Ошибка некорректный ответ от GPT: ${responce}`, keyBoards.error);
				} else {
					bot.sendMessage(chatID, responce, keyBoards.success);
				}
			})
			.catch((err) => {
				bot.sendMessage(chatID, err, keyBoards.error);
			})
			.finally(() => {
				bot.deleteMessage(chatID, loadingMsgID);
			});
	}
});

const approveMsgData = async (msg) => {
	const obj = JSON.parse(msg.message.text);
	obj.time = msg.message.date;
	obj.day = new Date(obj.time * 1000).getDate();

	await DB.post(obj);

	bot.answerCallbackQuery(msg.id)
		.then(() => {
			console.log('callback_query обработано');

			bot.deleteMessage(msg.message.chat.id, msg.message.message_id);
			bot.sendMessage(msg.message.chat.id, msg.message.text);
		})
		.catch((err) => {
		console.error('Ошибка при обработке callback_query:', err);
		});
};

const rejectMsgData = (msg) => {
	bot.deleteMessage(msg.message.chat.id, msg.message.message_id);
	bot.deleteMessage(msg.message.chat.id, lastUserMsgId);
};

const onError = (msg) => {
	bot.deleteMessage(msg.message.chat.id, msg.message.message_id);
	bot.deleteMessage(msg.message.chat.id, lastUserMsgId);
};

const callbackFuncs = {
	'approve': approveMsgData,
	'reject': rejectMsgData,
	'error_checked': onError,
}

bot.on('callback_query', (msg) => {
	console.log('callback_query');
	const cb = msg.data;

	if (cb in callbackFuncs && typeof callbackFuncs[cb] === 'function') {
		callbackFuncs[cb](msg);
	}
});