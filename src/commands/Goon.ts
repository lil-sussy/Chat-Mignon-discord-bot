import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, NewsChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember } from "discord.js";
import { Command } from "../interfaces/Command";
import GoonRecord from "../models/GoonRecord";
import ExtendedClient from "../classes/Client";
import { buildMessage } from "../features/buildMessage";

export const GoonCommand: Command = {
  options: new SlashCommandBuilder()
    .setName("goon")
    .setDescription("Register your goon date and announce it!")
    .addSubcommand(subcommand =>
      subcommand
        .setName("register")
        .setDescription("Register your goon date and announce it!")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("reset")
        .setDescription("Reset your goon data")
    ),
  global: false,
  async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    const discordId = interaction.user.id;
    const now = new Date();

    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "register") {
        // Existing register logic
        const existingRecord = await GoonRecord.findOne({ discordId });
        const lastDate = existingRecord?.lastDate || null;
        let messageToSend = "";
        // Upsert the record in DB
        await GoonRecord.findOneAndUpdate(
          { discordId },
          { lastDate: now },
          { upsert: true, new: true }
        );

        // Calculate time difference
        let timeDiffInMs = 0;
        if (lastDate) {
          timeDiffInMs = now.getTime() - lastDate.getTime();
          const timeDiffInHours = Math.floor(timeDiffInMs / (1000 * 60 * 60));
          const timeDiffInDays = Math.floor(timeDiffInHours / 24);
          const timeDiffInWeeks = Math.floor(timeDiffInDays / 7);
          const remainingDays = timeDiffInDays % 7;

          if (!lastDate || timeDiffInDays < 2) {
            // Variant 1: small gap
            messageToSend = `<@${discordId}> wanted everyone to know that \\1stPerson\\ just gooned \\cat\\ !! \\1stPerson\\ is/are quite horny. \\1stPerson\\ have not registered another goon since ${timeDiffInHours} hours which is insane tbh \\cat\\`;
          } else if (timeDiffInDays < 7) {
            // Variant 2: more than 2 days
            messageToSend = `<@${discordId}> wanted everyone to know that \\1stPerson\\ just gooned \\cat\\ !! Do.es \\1stPerson\\ deserve a punishment? \\3dPersonPossessive\\ last goon report was since ${timeDiffInDays} days — \\1stPerson\\ could have done better ?!?!`;
          } else {
            // More than a week
            // 1. DM user: inactivity check
            await interaction.user.send(`Inactivity check — your last /goon command was a week ago on: ${lastDate?.toLocaleString()}.`);
    
            // 2) Provide buttons
            const actionRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId("delete_goon_data")
                  .setLabel("Delete & Reset my data")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId("announce_abstinence")
                  .setLabel("Announce my abstinence achievement")
                  .setStyle(ButtonStyle.Primary)
              );
            await interaction.user.send({ components: [actionRow] });
    
            // 3) If user still uses /goon after a week:
            messageToSend = `<@${discordId}> just failed \\3dPersonPossessive\\ ~${timeDiffInWeeks} week(s) and ${remainingDays} day(s) rampage \\cat\\! Must have been a relief!! THAT MUST NOT REMAIN UNPUNISHED \\cat\\ \\cat\\`;
          }
        } else {
          messageToSend = `<@${discordId}> has just registered a new gooning session here \\cat\\`;
        }

        // Send a message to the configured goon channel
        const goonChannelId = client.config.goonChannelID;
        const channel = await client.channels.fetch(goonChannelId);

        if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
          // Use our new buildMessage feature
          const guildMember = interaction.member instanceof GuildMember ? interaction.member : undefined;
          const finalMessage = buildMessage(guildMember, messageToSend, client.config.catEmojis);
          await channel.send(finalMessage);
        }

        await interaction.reply({ content: "Your goon date has been recorded!", ephemeral: true });
      } else if (subcommand === "reset") {
        // Reset logic
        await GoonRecord.deleteOne({ discordId });
        await interaction.reply({ content: "Your goon data has been reset.", ephemeral: true });
      }
    } catch (error) {
      console.error("Error processing goon command:", error);
      await interaction.reply({ content: "There was an error processing your request.", ephemeral: true });
    }
  },
};

export default GoonCommand; 