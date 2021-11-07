import { ApplicationCommandDataResolvable, Client } from 'discord.js';

const definition: ApplicationCommandDataResolvable[] = [
  {
    name: 'play',
    description: '曲を流す',
    options: [
      {
        name: 'song',
        type: 'STRING' as const,
        description: 'URL',
        required: true,
      },
    ],
  },
  {
    name: 'skip',
    description: 'スキップして次の曲へ',
  },
  {
    name: 'queue',
    description: 'キューを確認',
  },
  {
    name: 'pause',
    description: '一時停止',
  },
  {
    name: 'resume',
    description: '再生',
  },
  {
    name: 'leave',
    description: 'サヨナラ！',
  },
  {
    name: 'ping',
    description: 'pong?',
  },
];

export class Register {
  constructor(private client: Client, private prefix: string) {
    this.client.on('messageCreate', async (message) => {
      if (!message.guild) return;
      if (!this.client.application?.owner) await this.client.application?.fetch();

      if (
        message.content.toLowerCase() === this.prefix + 'deploy' &&
        message.author.id === this.client.application?.owner?.id
      ) {
        await message.guild.commands.set(definition);

        await message.reply('デプロイしました');
      }
    });
  }
}
