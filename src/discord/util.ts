import { CacheType, CommandInteraction, InteractionReplyOptions, MessagePayload } from 'discord.js';

export async function usefulReplyOrFollowUp(
  interaction: CommandInteraction<CacheType> & { repliedSoftLock?: boolean },
  options: string | MessagePayload | InteractionReplyOptions
): Promise<void> {
  let tryingReply = false;
  try {
    if (interaction.deferred && interaction.replied && interaction.repliedSoftLock != null) {
      await interaction.followUp(options).catch(console.warn);
    } else if (interaction.replied || interaction.repliedSoftLock) {
      await interaction.followUp(options).catch(console.warn);
    } else if (interaction.deferred) {
      await interaction.editReply(options).catch(console.warn);
    } else {
      tryingReply = true;
      interaction.repliedSoftLock = true;
      await interaction.reply(options).catch(console.warn);
    }
  } catch (e) {
    if (tryingReply) interaction.repliedSoftLock = false;
    console.warn(e);
    console.warn(options.toString);
  }
}
