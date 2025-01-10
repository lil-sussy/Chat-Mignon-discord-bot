import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import ReactionConfig from "../models/ReactionConfig"; // We import the newly created model
import ExtendedClient from "../classes/Client";

const reactionCommand: ChatInputCommand = {
    options: new SlashCommandBuilder()
        .setName("reaction")
        .setDescription("Manages reaction features")
        .addSubcommand((sub) =>
            sub
                .setName("feur")
                .setDescription("Enable or disable feur reaction")
                .addStringOption((option) =>
                    option
                        .setName("action")
                        .setDescription("Specify 'enable' or 'disable' the feur reaction")
                        .setRequired(true)
                        .addChoices(
                            { name: "enable", value: "enable" },
                            { name: "disable", value: "disable" }
                        )
                )
        ),
    global: false, // Or true, depending on whether you want it enabled across all guilds

    async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        // This subcommand is "feur"
        if (subcommand === "feur") {
            const action = interaction.options.getString("action", true);

            // If “action” is “enable” or “disable”, set the DB record accordingly
            if (action === "enable" || action === "disable") {
                const isEnabled = action === "enable";

                // Upsert a MongoDB document for reactionName = "feur"
                await ReactionConfig.findOneAndUpdate(
                    { reactionName: "feur" },
                    { $set: { enabled: isEnabled } },
                    { upsert: true, new: true }
                );

                await interaction.reply(`Feur reaction is now set to: ${isEnabled ? "enabled" : "disabled"}`);
            }
        }
    }
};

export default reactionCommand; 