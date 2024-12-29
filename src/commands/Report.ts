import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  APIActionRowComponent,
  ButtonInteraction,
  CacheType,
  MessageComponentInteraction,
  MessageComponentType,
  GuildMember,
} from "discord.js";
import ExtendedClient from "../classes/Client";
import { ChatInputCommand } from "../interfaces/Command";
import config from '../config.json'; // Adjust the path as necessary

export default {
  options: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Report a user to the moderators.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to report")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the issue")
        .setRequired(true),
    ),
  global: false, // Ensure this is false for guild commands
  async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    const userReporter = interaction.user;
    const reportedUser = interaction.options.getUser("user", true);
    const description = interaction.options.getString("description", true);
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: "This command cannot be used in DMs.",
        ephemeral: true,
      });
      return;
    }

    // Create ticket channel for the report
    const channelName = `report-${interaction.user.username}-${reportedUser.username}`;
    const ticketChannel = await guild.channels.create({
			name: channelName,
			type: ChannelType.GuildText,
			parent: client.config.moderatorCategoryId, // Ensure config.json has "moderatorCategoryId"
			permissionOverwrites: [
				// Allow reporter to view the channel
				{
					id: interaction.user.id,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
				},
				// Allow reported user to see the channel if you wish
				{
					id: userReporter.id,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
				},
				// Allow moderators to see the channel
				{
					id: guild.roles.cache.find((role) => role.name === config.moderatorRoleName)?.id ?? "", // Allow moderators
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
				},
				// Deny @everyone from seeing it
				{
					id: guild.roles.everyone.id,
					deny: [PermissionFlagsBits.ViewChannel],
				},
			],
		});

    // Create buttons for deleting the ticket and creating a new ticket
    const deleteButton = new ButtonBuilder()
      .setCustomId('delete_ticket')
      .setLabel('Delete Ticket')
      .setStyle(ButtonStyle.Danger);
    
    const createTicketButton = new ButtonBuilder() // New button
      .setCustomId('create_new_ticket')
      .setLabel('Create New Ticket')
      .setStyle(ButtonStyle.Primary);
    
    // Create an action row with both buttons
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton, createTicketButton); // Added createTicketButton

    // Send the message with both buttons
    await ticketChannel.send({
      content: `@${config.moderatorRoleName}, please look into this report!\n` +
               `• Reporter: ${interaction.user}\n` +
               `• Reported user: ${reportedUser}\n` +
               `• Description: ${description}`,
      components: [actionRow],
    });

    // Acknowledge the reporter
    await interaction.reply({
      content: `Your report has been submitted. Moderators will respond soon!`,
      ephemeral: true,
    });

    // Update filter to include 'create_new_ticket'
    const filter = (i: MessageComponentInteraction) => 
      i.isButton() && // Check if the interaction is a button
      (i.customId === 'delete_ticket' || i.customId === 'create_new_ticket') && 
      i.member instanceof GuildMember && // Ensure member is a GuildMember
      i.member.roles.cache.some(role => role.name === config.moderatorRoleName); // Ensure it's a moderator

    const collector = ticketChannel.createMessageComponentCollector<MessageComponentType>({ filter, time: 600000 }); // Increased time to 10 minutes

    collector.on('collect', async (i: ButtonInteraction) => {
      if (i.customId === 'delete_ticket') {
        await ticketChannel.delete();
        await i.reply({ content: 'Ticket channel has been deleted.', ephemeral: true });
      } else if (i.customId === 'create_new_ticket') { // Handle create_new_ticket
        // Create a new ticket channel with the reported user
        const newChannelName = `ticket-${reportedUser.username}-${Date.now()}`;
        const newTicketChannel = await guild.channels.create({
          name: newChannelName,
          type: ChannelType.GuildText,
          parent: client.config.moderatorCategoryId,
          permissionOverwrites: [
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            {
              id: reportedUser.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            {
              id: guild.roles.cache.find((role) => role.name === config.moderatorRoleName)?.id ?? "",
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
          ],
        });

        // Notify moderators in the new ticket channel
        await newTicketChannel.send({
          content: `@${config.moderatorRoleName}, a new ticket has been created regarding ${reportedUser}.\n` +
                   `• Reported user: ${reportedUser}\n`
        });

        // Create a button for deleting the newly created ticket
        const deleteNewTicketButton = new ButtonBuilder()
          .setCustomId('delete_new_ticket')
          .setLabel('Delete Ticket')
          .setStyle(ButtonStyle.Danger);

        // Add the new button to an action row
        const newActionRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(deleteNewTicketButton);

        // Send a message in the new ticket channel that includes the Delete Ticket button
        await newTicketChannel.send({
          content: `@${config.moderatorRoleName}, a new ticket has been created regarding ${reportedUser}.\n` +
                   `• Reported user: ${reportedUser}\n`,
          components: [newActionRow],
        });

        // Create a new collector for the newly created channel
        const newFilter = (btnInteraction: MessageComponentInteraction) =>
          btnInteraction.isButton() &&
          btnInteraction.customId === 'delete_new_ticket' &&
          btnInteraction.member instanceof GuildMember &&
          btnInteraction.member.roles.cache.some(
            (role) => role.name === config.moderatorRoleName
          );

        const newCollector = newTicketChannel.createMessageComponentCollector({
          filter: newFilter,
          time: 600000, // 10 minutes
        });

        // Delete the new ticket channel if the button is pressed by a moderator
        newCollector.on('collect', async (btnInteraction: ButtonInteraction) => {
          await newTicketChannel.delete();
          await btnInteraction.reply({ content: 'New ticket channel has been deleted.', ephemeral: true });
        });
      }
    });

    collector.on('end', collected => {
      // Optional: Handle collector end
    });
  },
} as ChatInputCommand; 