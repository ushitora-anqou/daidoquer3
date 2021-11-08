import { HexColorString, MessageEmbed } from 'discord.js';

interface MsgColor {
  info: HexColorString;
  warn: HexColorString;
  error: HexColorString;
}

// based on bootstrap
const color: MsgColor = {
  info: '#17a2b8',
  warn: '#ffc107',
  error: '#dc3545',
};

export const coloredMsgEmbed = (type: keyof MsgColor): MessageEmbed => {
  return new MessageEmbed().setColor(color[type]);
};
