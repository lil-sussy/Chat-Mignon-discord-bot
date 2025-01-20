import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, NewsChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, SlashCommandStringOption, InteractionCollector, TextBasedChannel } from "discord.js";
import { Command } from "../interfaces/Command";
import GoonRecord from "../models/GoonRecord";
import ExtendedClient from "../classes/Client";
import { buildMessage } from "../features/buildMessage";
import { addMonths, addWeeks, addDays, addHours, differenceInMonths, differenceInWeeks, differenceInDays, differenceInHours } from 'date-fns';
import { formatDate } from "../utils/StringUtils"

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
        .addBooleanOption(option => 
          option.setName("end")
            .setDescription("End your no gooning or chastitty session")
            .setRequired(false)
        )
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
    ),
    // .addSubcommand(subcommand =>
    //   subcommand
    //     .setName("chastity")
    //     .setDescription("Announce the start of a chastity session")
    // ),
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
        const theoriticalChastityEnd = existingRecord?.chastityTheoryEndDate || null;
        const theoriticalChastityStart = existingRecord?.chastityStartDate || null;
        let messageToSend = "";

        // Check if the user is still in a no-gooning session
        if (theoriticalChastityEnd && now < theoriticalChastityEnd) {
          const confirmationRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('confirm_goon')
                .setLabel('Confirm Goon')
                .setStyle(ButtonStyle.Danger)
            );

          await interaction.reply({
            content: `You were registered in a no-gooning session until ${theoriticalChastityEnd.toLocaleString()}. Are you sure you wish to report a goon right now and announce everyone your failure? NOTE THAT : if you wish to make it silent and OUT OF A PLAY CONTEXT you should use /goon nogooning end true instead !!!`,
            components: [confirmationRow],
            ephemeral: true
          });

          // Ensure the channel is a TextChannel or NewsChannel
          if (interaction.channel instanceof TextChannel || interaction.channel instanceof NewsChannel) {
            // Create a collector to handle button interaction
            const filter = (i: any) => i.customId === 'confirm_goon' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async (i: any) => {
              if (i.customId === 'confirm_goon') {
                messageToSend = `<@${discordId}> has bravely admitted to failing \\3rdPersonPossessive\\ no-gooning session early! Let's all support \\2ndPerson\\ in their journey !! \\cat\\ \\cat\\ \n\n Just fucking KIDDING, ROAST \\2ndPerson\\ !! I am quite sure they deserve a punishment`;
                await i.update({ content: "Your goon has been confirmed and announced!", components: [] });

                // Send the custom message
                const goonChannelId = client.config.goonChannelID;
                const channel = await client.channels.fetch(goonChannelId);

                if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
                  const finalMessage = buildMessage(guild!, client, interactionMember, messageToSend, client.config.catEmojis);
                  const pattern = /\\cat\\/g;
                  const parsedMessage = finalMessage[0].replace(pattern, () => {
                    return client.config.catEmojis[Math.floor(Math.random() * client.config.catEmojis.length)];
                  });

                  await channel.send(parsedMessage);
                }
              }
            });
          }

          // Exit early to wait for user confirmation
          return;
        }

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
            messageToSend = `<@${discordId}> wanted everyone to know that \\1stPerson\\ just/present gooned \\cat\\ !! \\1stPerson\\ be/present quite horny. \\1stPerson\\ have/present not registered another goon since ${timeDiffInHours} \\cat\\ Quite a horny specimen :3 I think \\1stPerson\\ need/present you to give \\2ndPerson\\ a hand ! \\cat\\`;
          } else if (timeDiffInDays < 7) {
            // Variant 2: more than 2 days
            messageToSend = `<@${discordId}> wanted everyone to know that \\1stPerson\\ just/present gooned \\cat\\ !! Do.es \\1stPerson\\ deserve/present a punishment? \\3rdPersonPossessive\\ last goon report was since ${timeDiffInDays} days \\1stPerson\\ could/present have done better ?!?!`;
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
						messageToSend = `<@${discordId}> just failed \\3rdPersonPossessive\\ ~${timeDiffInWeeks} week(s) and ${remainingDays} day(s) rampage \\cat\\! Must have been a relief!! THAT MUST NOT REMAIN UNPUNISHED \\cat\\ \\cat\\`;
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
        const endSession = interaction.options.getBoolean("end") || false;

        const chastityStartDate = now;
        let chastityTheoryEndDate = addMonths(chastityStartDate, months);
        chastityTheoryEndDate = addWeeks(chastityTheoryEndDate, weeks);
        chastityTheoryEndDate = addDays(chastityTheoryEndDate, days);
        chastityTheoryEndDate = addHours(chastityTheoryEndDate, hours);

        let messageToSend = ""
        if (endSession) {
          chastityTheoryEndDate = now;
          await GoonRecord.findOneAndUpdate(
            { discordId },
            { chastityStartDate: existingRecord!.chastityStartDate, chastityTheoryEndDate: chastityTheoryEndDate },
            { upsert: true, new: true }
          );
          messageToSend = `<@${discordId}> just ended \\3rdPersonPossessive\\ nogooning session that started on ${formatDate(existingRecord!.chastityStartDate!)}. If \\1stPerson\\ wish/present to comment, \\1stPerson\\ may do it here. But note that \\1stPerson\\ doesnt have to.`;
        } else {
          await GoonRecord.findOneAndUpdate(
            { discordId },
            { chastityStartDate, chastityTheoryEndDate },
            { upsert: true, new: true }
          );
  
           messageToSend = `<@${discordId}> wanted everyone to know that \\1stPerson\\ just/present started a ${subcommand} session until ${formatDate(chastityTheoryEndDate)} :devil: \\cat\\ ${
							lastDate ? `The last time \\1stPerson\\ goon/past was at ${formatDate(lastDate)}` : ``
						}. I am sure by bringing this information to your attention will allow you to treat <@${discordId}> accordingly during this time :devil: \\cat\\ \\cat\\ :3`;
        }


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