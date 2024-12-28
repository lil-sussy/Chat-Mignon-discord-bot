import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel
} from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import ExtendedClient from "../classes/Client";

// ... existing imports (if any) ...

const StarboardCommand: ChatInputCommand = {
  options: new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("Configure or view starboard settings")
    .addSubcommand(sub =>
      sub
        .setName("setchannel")
        .setDescription("Set the starboard channel")
        .addChannelOption(opt =>
          opt
            .setName("channel")
            .setDescription("Text channel to set as the starboard")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("setthreshold")
        .setDescription("Set the star threshold required for a message to be starred")
        .addIntegerOption(opt =>
          opt
            .setName("threshold")
            .setDescription("Number of stars required")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View current starboard settings")
    ) as SlashCommandBuilder,

  global: false, // or true, depending on your usage

  async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "setchannel": {
        const channel = interaction.options.getChannel("channel", true);
        if (channel.type !== 0) { // 0 => TextChannel in discord.js v14
          await interaction.reply({
            content: "Please select a valid text channel.",
            ephemeral: true
          });
          return;
        }

        // Update config in-memory and possibly persist to file
        client.config.starboard.channelId = channel.id;

        await interaction.reply(`Starboard channel set to <#${channel.id}>.`);
        break;
      }
      case "setthreshold": {
        const threshold = interaction.options.getInteger("threshold", true);
        client.config.starboard.threshold = threshold;

        await interaction.reply(`Star threshold set to **${threshold}**.`);
        break;
      }
      case "view": {
        const { channelId, threshold } = client.config.starboard;
        await interaction.reply(
          `• **Channel**: <#${channelId || "Not set"}>\n` +
          `• **Threshold**: ${threshold}`
        );
        break;
      }
    }
  }
};

export default StarboardCommand; 