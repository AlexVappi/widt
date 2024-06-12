module.exports = {
	commands: [
		{
			command: '/what_i_do_today',
			description: 'Что же я сегодня наделал?',
		},
	],
	successBtns: [
		[{text: '\ud83d\udc4d', callback_data: 'approve'}, {text: '\ud83d\udc4e', callback_data: 'reject'}],
	],
	errorBtns: [
		[{text: '\ud83e\udd2c', callback_data: 'error_checked'}],
	],
}