import { CacheType, CommandInteraction, InteractionReplyOptions, MessagePayload } from 'discord.js';

export async function usefulReplyOrFollowUp(
  interaction: CommandInteraction<CacheType>,
  options: string | MessagePayload | InteractionReplyOptions
): Promise<void> {
  try {
    if (interaction.deferred && interaction.replied) {
      await interaction.followUp(options).catch(console.warn);
    } else if (interaction.replied) {
      await interaction.followUp(options).catch(console.warn);
    } else if (interaction.deferred) {
      await interaction.editReply(options).catch(console.warn);
    } else {
      await interaction.reply(options).catch(console.warn);
    }
  } catch (e) {
    console.warn(e);
    console.warn(options.toString);
  }
}
