const { config } = require('./config');

class CommandHandler {
	constructor() {
		this.commands = {
			clear: this.clearCommand,
			save: this.saveCommand,
			model: this.modelCommand,
			prompt: this.promptCommand,
			reset: this.resetCommand,
		};
	}

	isCommand(message) {
		return message.content.startsWith('/');
	}

	async handleCommand(message, conversationManager) {
		const [commandName, ...args] = message.content.slice(1).split(' ');
		const command = this.commands[commandName];
		if (command) {
			await command(message, args, conversationManager);
		} else {
			// Ignore unknown commands
			return;
		}
	}

	async clearCommand(interaction, conversationManager) {
		conversationManager.clearHistory(interaction.user.id);
		await interaction.editReply('> `Your conversation history has been cleared.`');
	}

	async saveCommand(interaction, conversationManager) {
		const userId = interaction.user.id;
		const conversation = conversationManager.getHistory(userId);
		if (conversation.length === 0) {
			await interaction.followUp('> `There is no conversation to save.`');
			return;
		}
		const conversationText = conversation.map((message) => `${message.role === 'user' ? 'User' : 'Bot'}: ${message.content}`).join('\n');
		try {
			const maxLength = 1900;
			const lines = conversationText.split('\n');
			const chunks = [];
			let currentChunk = '';
			for (const line of lines) {
				if (currentChunk.length + line.length + 1 <= maxLength) {
					currentChunk += (currentChunk ? '\n' : '') + line;
				} else {
					chunks.push(currentChunk);
					currentChunk = line;
				}
			}
			if (currentChunk) {
				chunks.push(currentChunk);
			}
			// Send each chunk as a separate message
			for (const [index, chunk] of chunks.entries()) {
				await interaction.user.send(`Here is your saved conversation (part ${index + 1}):\n\n${chunk}`);
			}
			await interaction.editReply('> `The conversation has been saved and sent to your inbox.`');
		} catch (error) {
			console.error('Error sending conversation to user:', error);
			await interaction.followUp('> `Failed to send the conversation to your inbox. Please check your privacy settings.`');
		}
	}

	async modelCommand(interaction, conversationManager) {
		const model = interaction.options.getString('name');
		await conversationManager.setUserPreferences(interaction.user.id, { model });
		await interaction.editReply(`> \`The model has been set to ${model}.\``);
	}

	async promptCommand(interaction, conversationManager) {
		const promptName = interaction.options.getString('name');
		const prompt = config.getPrompt(promptName);
		console.log(`Setting prompt for user ${interaction.user.id}: promptName=${promptName}, prompt=${prompt}`);
		await conversationManager.setUserPreferences(interaction.user.id, { prompt: promptName });
		await interaction.editReply(`> \`The system prompt has been set to ${promptName}.\``);
	}

	async resetCommand(interaction, conversationManager) {
		await conversationManager.resetUserPreferences(interaction.user.id);
		await interaction.editReply('> `Your preferences have been reset to the default settings.`');
	}
}

module.exports.CommandHandler = CommandHandler;
