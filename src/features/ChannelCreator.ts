import {
  Guild,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMember,
  MessageComponentInteraction,
  ComponentType,
  EmbedBuilder,
  OverwriteType,
} from "discord.js";
import ExtendedClient from "../classes/Client";

/**
 * Creates a ticket channel with configurable delete-permissions,
 * an optional "create new ticket" button, and pinned embed.
 */
export async function createTicketChannel(params: {
  client: ExtendedClient;
  guild: Guild;
  channelNames: string[];
  categoryName: string;
  whoCanDelete: "mods" | "everyone";
  hasSecondButton: boolean;
  userIds: string[];
  content: string; // text to go into the pinned embed
  threadIndex?: number;
}) {
  const {
    client,
    guild,
    channelNames,
    categoryName,
    whoCanDelete,
    hasSecondButton,
    userIds,
    content,
    threadIndex,
  } = params;

  // Find the category by name
  const category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
  );

  if (!category) {
    throw new Error(`Category "${categoryName}" not found`);
  }

  // Build array of permission overwrites:
  const overwrites: any = [
    {
      // Deny @everyone
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
      type: OverwriteType.Role,
    },
  ];

  // Always allow moderators
  const modRoleId =
    guild.roles.cache.find((role) => role.name === client.config.moderatorRoleName)?.id ?? "";
  if (modRoleId) {
    overwrites.push({
      id: modRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      type: OverwriteType.Role,
    });
  }

  // Allow listed users
  
  overwrites.push({
    id: userIds[threadIndex ?? 0],
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    type: OverwriteType.Member,
  });

  // Create channel
  const channel = await guild.channels.create({
    name: channelNames[threadIndex ?? 0],
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: overwrites,
  });

  // Create button(s)
  const deleteButton = new ButtonBuilder()
    .setCustomId("delete_ticket")
    .setLabel("Delete Ticket")
    .setStyle(ButtonStyle.Danger);

  // If hasSecondButton is true, add the "Create New Ticket" button
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    deleteButton
  );
  if (hasSecondButton) {
    const newTicketButton = new ButtonBuilder()
      .setCustomId("create_new_ticket")
      .setLabel("Create New Ticket")
      .setStyle(ButtonStyle.Primary);
    actionRow.addComponents(newTicketButton);
  }

  // Create an embed for the pinned message
  const embed = new EmbedBuilder().setDescription(content).setColor("Blue");

  // Send the embed message, pin it
  const sentMessage = await (channel as TextChannel).send({
    embeds: [embed],
    components: [actionRow],
  });
  await sentMessage.pin();

  // Filter for button clicks
  const filter = (i: MessageComponentInteraction) =>
    i.isButton() &&
    (i.customId === "delete_ticket" ||
      (hasSecondButton && i.customId === "create_new_ticket")) &&
    i.member instanceof GuildMember &&
    (whoCanDelete === "mods"
      ? i.member.roles.cache.some((role) => role.name === client.config.moderatorRoleName)
      : true);

  const collector = (channel as TextChannel).createMessageComponentCollector({
    filter,
    time: 600_000,
    componentType: ComponentType.Button,
  });

  collector.on("collect", async (interaction: ButtonInteraction) => {
    try {
      if (interaction.customId === "delete_ticket") {
        // Log before attempting to delete the channel
        console.log(`Attempting to delete channel: ${channel.id}`);
        
        // Delete the channel
        await channel.delete();

      } else if (interaction.customId === "create_new_ticket") {
        await interaction.reply({
          content: "Creating a new ticket channel...",
          ephemeral: true,
        });
        await createTicketChannel({
          client: client,
          guild: guild,
          channelNames: channelNames,
          categoryName,
          whoCanDelete: "mods",
          hasSecondButton: false,
          userIds: userIds,
          threadIndex: (threadIndex ?? 0) + 1,
          content: "New ticket channel regarding the reported user.",
        });
      }
    } catch (error) {
      console.error("Error handling interaction:", error);
      await interaction.followUp({
        content: "An error occurred while processing this interaction.",
        ephemeral: true,
      });
    }
  });

  collector.on("end", () => {
    // (Optional) handle the end of collector
  });

  return channel;
} 