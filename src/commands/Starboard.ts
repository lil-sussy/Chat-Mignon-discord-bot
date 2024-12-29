import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  Role
} from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import ExtendedClient from "../classes/Client";
import StarboardSetting from "../models/StarboardSetting";

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

  global: false, // Ensure this is false for guild commands

  async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    // Check if the user has the moderator role
    const roleName = client.config.moderatorRoleName;
    const moderatorRole: Role | undefined = interaction.guild?.roles.cache.find((r) => r.name === roleName);

    if (!moderatorRole) {
        await interaction.reply({
            content: `Moderator role "${roleName}" not found in this server.`,
            ephemeral: true,
        });
        return;
    }

    // @ts-expect-error "roles" type on member can be narrower but typically includes "cache"
    const memberRoles = interaction.member?.roles?.cache;
    if (!memberRoles || !memberRoles.has(moderatorRole.id)) {
        await interaction.reply({
            content: "You do not have permission to use this command.",
            ephemeral: true,
        });
        return;
    }

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

        await interaction.reply({
          content: `Starboard channel set to <#${channel.id}>.`,
          ephemeral: true
        });
        break;
      }
      case "setthreshold": {
        const threshold = interaction.options.getInteger("threshold", true);
        // Save threshold to Mongo
        await StarboardSetting.findOneAndUpdate(
            {}, 
            { threshold }, 
            { upsert: true, new: true }
        );
        await interaction.reply({
          content: `Star threshold set to **${threshold}**.`,
          ephemeral: true
        });
        break;
      }
      case "view": {
        // Get threshold from Mongo
        const doc = await StarboardSetting.findOne({});
        const threshold = doc?.threshold ?? 0;
        const channelId = client.config.starboard.channelId; // Channel still in config, or also store in DB if desired
        await interaction.reply({
          content: `• **Channel**: <#${channelId || "Not set"}>\n• **Threshold**: ${threshold}`,
          ephemeral: true
        });
        break;
      }
    }
  }
};

export default StarboardCommand; 