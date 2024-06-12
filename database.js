const fs = require('fs');
const path = './database.json';

const post = (obj) => {
	fs.readFile(path, 'utf-8', (err, data) => {
		let jsonData = [];

		if (!err) {
			try {
				jsonData = JSON.parse(data);
			} catch (parseErr) {
				console.error('Ошибка парсинга JSON:', parseErr);
				return;
			}

			if (!Array.isArray(jsonData)) {
				console.error('Ошибка: JSON файл должен содержать массив объектов.');
				return;
			}
		}

		jsonData.unshift(obj);

		fs.writeFile(path, JSON.stringify(jsonData, null, 2), 'utf-8', (writeErr) => {
			if (writeErr) {
				console.error('Ошибка записи файла:', writeErr);
			} else {
				console.log('Новый объект успешно добавлен в JSON файл.');
			}
		});
	});


}

const get = () => {
	//TODO ОБЕРНУТЬ В ПРОМИС
	fs.readFile(path, 'utf-8', (err, data) => {
		let jsonData = [];

		// console.log(err);

		if (!err) {
			try {
				jsonData = JSON.parse(data);

				console.log(jsonData);
			} catch (parseErr) {
				console.log(parseErr);
				return { status: 0, data: `Ошибка парсинга JSON: ${parseErr}`};
			}

			if (!Array.isArray(jsonData)) {
				console.log(jsonData);
				return { status: 0, data: 'Ошибка: JSON файл должен содержать массив объектов.' };
			}

			return { status: 1, data: jsonData };
		} else {
			console.log(err);
			return { status: 0, data: `Ошибка чтения файла: ${err}` };
		}
	});
}

const getTasksByToday = (data) => {
	const day = data[0].day;

	let i = 0;
	let result = [];

	while (i < data.length) {
		if (data[i].day !== day) {
			break;
		}

		result.push(data[i]);

		i++;
	}

	return result;
}

const createResultList = (data) => {
	const result = [];

	let time = data[0].time;

	for (let i = 0; i < data.length; i++) {
		// if (projects.length) {
		// 	let isExist = false;
		// 	projects.forEach((project) => {
		// 		if (compare(project, data[i].project)) {

		// 		}
		// 	});

		// 	if (isExist) {

		// 	}
		// }

		let obj = {
			project: data.project,
		}

		if (data[i + 1]) {
			obj.time = data[i + 1].time - time;

			time += data[i + 1].time;
		} else {
			obj.time = 28800 - (time - data[0].time);
		}

		result.push(obj);
	}

	let str = '';

	for (let i = 0; i < result.length; i++) {
		str += `${result[i].project}: ${result[i].time}s\n`;
	}

	return str;
}

module.exports = {
	post,
	get,
	getTasksByToday,
	createResultList
}