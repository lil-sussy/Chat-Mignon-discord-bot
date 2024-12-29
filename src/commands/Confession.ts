import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import crypto from "crypto";
import Confession from "../models/Confession";

export default {
  data: new SlashCommandBuilder()
    .setName("confess")
    .setDescription("Make an anonymous confession in the current channel")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Your confession text")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const confessionText = interaction.options.getString("message", true);

    // Hash the user ID to keep it anonymous
    const userIdHash = crypto
      .createHash("sha256")
      .update(interaction.user.id)
      .digest("hex")
      .slice(0, 10);

    // Send the anonymous confession message first
    const sentMessage = await interaction.reply({
      content: confessionText,
      fetchReply: true,
    });

    // Store the confession in MongoDB and include the messageId
    await Confession.create({
      confessionId: crypto.randomUUID(),
      creatorHash: userIdHash,
      content: confessionText,
      messageId: sentMessage.id
    });

    // Add a report (flag) reaction to the newly sent message
    await sentMessage.react("🚩");
  },
}; 