require('dotenv').config();

const fs = require('fs');
const path = require('path');
const yandexSpeech = require('yandex-speech');
const ffmpeg = require('fluent-ffmpeg');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false });

async function getFilePath(token, file_id) {
	const url = `https://api.telegram.org/bot${token}/getFile`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({file_id}),
	});

	const body = await response.json();

	if (body.ok) {
		return body.result.file_path;
	} else {
		return false;
	}
}

async function getFileBuffer(token, file_path) {
	const getFileURL = `https://api.telegram.org/file/bot${token}/${file_path}`;

	const file = await fetch(getFileURL, {
		method: 'GET',
	})

	const fileBuffer = await file.arrayBuffer();

	const buffer = Buffer.from(fileBuffer);

	return buffer;
}

function saveFile(file_path, buffer) {
	const fileName = path.basename(file_path);
	const savePath = path.join(__dirname, fileName);

	const outputFile = savePath.split('.')[0] + '.mp3';

	// if (fs.existsSync(outputFile)) {
	// 	// Если существует, удаляем его
	// 	fs.unlinkSync(outputFile);
	// }

	// Сохраняем файл
	fs.writeFileSync(savePath, Buffer.from(buffer));
	console.log(`Файл сохранен как ${savePath}`);

	return new Promise((resolve, reject) => {
		ffmpeg(savePath)
			.toFormat('mp3')
			.on('error', (err) => {
				console.error('Ошибка конвертации:', err);
			})
			.on('end', () => {
				console.log('Конвертация завершена. MP3 файл создан:', outputFile);
				console.log(savePath);
				fs.unlinkSync(savePath);

				resolve(outputFile);
			})
			.save(outputFile);
	});
}

function STT(pathToFile) {
	return new Promise((resolve, reject) => {
		yandexSpeech.ASR({
			developer_key: process.env.GPT_API_KEY,
			file: pathToFile,
			topic: 'notes',
			lang: 'ru-RU',
		}, function (err, httpResponse, xml) {
			if (err) {
				console.log('Ошибка:', err);
			} else {
				console.log('Распознанный текст:', xml);
				parser.parseString(xml, (err, result) => {
					if (err) {
						console.error('Ошибка парсинга XML:', err);
					} else {
						// console.log('Результат парсинга:', result.recognitionResults.variant);

						if (Array.isArray(result.recognitionResults.variant)) {
							resolve(result.recognitionResults.variant[0]._)
						} else {
							resolve(result.recognitionResults.variant._)
						}

						fs.unlinkSync(pathToFile);
					}
				});
			}
		});
	});
}

async function sendMsgToGPT(msg) {
	const prompt = {
				modelUri: `gpt://${process.env.GPT_API_KEY_ID}/yandexgpt-lite`,
				completionOptions: {
					stream: false,
					temperature: 0.1,
					maxTokens: 200,
				},
			
				messages: [
					{
						role: 'system',
						text: 'Ты превращаешь мой текст в набор данных в формате JSON. В результате я ожидаю получить JSON с такими ключами: "project" - string, "start" - boolean. Поля могут быть пустыми. "project" - проект, который я начал или закончил делать. "start"=true если я только перешел на этот проект, "start"=false если я закончил работать над проектом. Не отвечай текстом, напиши только данные в виде кода',
					},
					{
						role: 'user',
						text: msg,
					},
				],
			};
			
			const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
	
			const headers = {
				'Content-type': 'application/json',
				'Authorization': `Api-Key ${process.env.GPT_API_KEY}`,
			};
		
			const responce = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(prompt),
			});

			const body = await responce.json();

			console.log(body);
			return body.result.alternatives[0].message.text.split('```')[1];
}

module.exports = {
	getFilePath,
	getFileBuffer,
	saveFile,
	STT,
	sendMsgToGPT,
}