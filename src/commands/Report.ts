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
      content: `@moderators, please look into this report!\n` +
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
          content: `@moderators, a new ticket has been created regarding ${reportedUser}.\n` +
                   `• Reporter: ${interaction.user}\n` +
                   `• Reported user: ${reportedUser}\n` +
                   `• Description: ${description}`,
        });

        await i.reply({ content: `A new ticket channel has been created: ${newTicketChannel}`, ephemeral: true });
      }
    });

    collector.on('end', collected => {
      // Optional: Handle collector end
    });
  },
} as ChatInputCommand; 