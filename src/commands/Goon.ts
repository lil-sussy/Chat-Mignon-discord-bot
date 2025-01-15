import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, NewsChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, SlashCommandStringOption } from "discord.js";
import { Command } from "../interfaces/Command";
import GoonRecord from "../models/GoonRecord";
import ExtendedClient from "../classes/Client";
import { buildMessage } from "../features/buildMessage";
import { addMonths, addWeeks, addDays, addHours, differenceInMonths, differenceInWeeks, differenceInDays, differenceInHours } from 'date-fns';

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
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("nogooning")
        .setDescription("Start a nogooning session")
        .addStringOption(option =>
          option.setName("month")
            .setDescription("Number of months")
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName("week")
            .setDescription("Number of weeks")
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName("day")
            .setDescription("Number of days")
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName("hours")
            .setDescription("Number of hours")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("chastity")
        .setDescription("Announce the start of a chastity session")
    ),
  global: false,
  async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    const discordId = interaction.user.id;
    const now = new Date();
    const interactionMember = interaction.member instanceof GuildMember ? interaction.member : undefined;
    const guild = interaction.guild;

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
            messageToSend = `<@${discordId}> want/past everyone to know that \\1stPerson\\ just/present gooned \\cat\\ !! \\1stPerson\\ be/present quite horny. \\1stPerson\\ have/present not registered another goon since ${timeDiffInHours} hours which is insane tbh \\cat\\`;
          } else if (timeDiffInDays < 7) {
            // Variant 2: more than 2 days
            messageToSend = `<@${discordId}> want/past everyone to know that \\1stPerson\\ just/present gooned \\cat\\ !! Do.es \\1stPerson\\ deserve/present a punishment? \\3dPersonPossessive\\ last goon report was since ${timeDiffInDays} days — \\1stPerson\\ could/present have done better ?!?!`;
          } else {
            // More than a week
            // 1. DM user: inactivity check
            // await interaction.user.send(`Inactivity check — your last /goon command was a week ago on: ${lastDate?.toLocaleString()}.`);
    
            // // 2) Provide buttons
            // const actionRow = new ActionRowBuilder<ButtonBuilder>()
            //   .addComponents(
            //     new ButtonBuilder()
            //       .setCustomId("delete_goon_data")
            //       .setLabel("Delete & Reset my data")
            //       .setStyle(ButtonStyle.Danger),
            //     new ButtonBuilder()
            //       .setCustomId("announce_abstinence")
            //       .setLabel("Announce my abstinence achievement")
            //       .setStyle(ButtonStyle.Primary)
            //   );
            // await interaction.user.send({ components: [actionRow] });
    
            // 3) If user still uses /goon after a week:
            messageToSend = `<@${discordId}> just failed \\3dPersonPossessive\\ ~${timeDiffInWeeks} week(s) and ${remainingDays} day(s) rampage \\cat\\! Must have been a relief!! THAT MUST NOT REMAIN UNPUNISHED \\cat\\ \\cat\\`;
          }
        } else {
          messageToSend = `<@${discordId}> wanted everyone to know that \\1stPerson\\ be/past just gooned ! A new new gooning session has been registered \\cat\\`;
        }

        // Send a message to the configured goon channel
        const goonChannelId = client.config.goonChannelID;
        const channel = await client.channels.fetch(goonChannelId);

        if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
          // Use our new buildMessage feature
          const finalMessage = buildMessage(guild!, client, interactionMember, messageToSend, client.config.catEmojis);

          // Replace every \cat\ with a random cat emoji
          const pattern = /\\cat\\/g;
          const parsedMessage = finalMessage[0].replace(pattern, () => {
            return client.config.catEmojis[Math.floor(Math.random() * client.config.catEmojis.length)];
          });

          await channel.send(parsedMessage);
        }

        await interaction.reply({ content: "Your goon date has been recorded!", ephemeral: true });
      } else if (subcommand === "reset") {
        // Reset logic
        await GoonRecord.deleteOne({ discordId });
        await interaction.reply({ content: "Your goon data has been reset.", ephemeral: true });
      } else if (subcommand === "nogooning" || subcommand === "chastity") {
        const existingRecord = await GoonRecord.findOne({ discordId });
				const lastDate = existingRecord?.lastDate || null;
        const months = parseInt(interaction.options.getString("month") || "0", 10);
        const weeks = parseInt(interaction.options.getString("week") || "0", 10);
        const days = parseInt(interaction.options.getString("day") || "0", 10);
        const hours = parseInt(interaction.options.getString("hours") || "0", 10);

        const chastityStartDate = now;
        let chastityTheoryEndDate = addMonths(chastityStartDate, months);
        chastityTheoryEndDate = addWeeks(chastityTheoryEndDate, weeks);
        chastityTheoryEndDate = addDays(chastityTheoryEndDate, days);
        chastityTheoryEndDate = addHours(chastityTheoryEndDate, hours);

        await GoonRecord.findOneAndUpdate(
          { discordId },
          { chastityStartDate, chastityTheoryEndDate },
          { upsert: true, new: true }
        );


        const formatDate = (date: Date) => {
          let hours = date.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12; // the hour '0' should be '12'
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const dayOfWeek = date.toLocaleString('en-US', { weekday: 'short' });
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          return `${hours}${ampm} on ${dayOfWeek} ${day}/${month}`;
        };

        let messageToSend = `<@${discordId}> wanted everyone to know that \\1stPerson\\ just/present started a ${subcommand} session until ${formatDate(chastityTheoryEndDate)} :devil: \\cat\\ ${lastDate ? `The last time \\1stPerson\\ goon/past was at ${formatDate(lastDate)}` : ``}. I am sure by bringing this information to your attention will allow you to treat <@${discordId}> accordingly during this time :devil: \\cat\\ \\cat\\ :3`;

        messageToSend = buildMessage(guild!, client, interactionMember, messageToSend, client.config.catEmojis)[0];

        const chastityChannelId = client.config.chastityChannelID;
        const channel = await client.channels.fetch(chastityChannelId);

        if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
          await channel.send(messageToSend);
        }

        await interaction.reply({ content: `Your ${subcommand} session has been announced!`, ephemeral: true });
      }
    } catch (error) {
      console.error("Error processing goon command:", error);
      await interaction.reply({ content: "There was an error processing your request.", ephemeral: true });
    }
  },
};

export default GoonCommand; 