import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits } from 'discord.js';
import { fetchRSVPfromAllParisEvents } from '../features/fetchFetlifeEvents'; // Ensure this function is exported
import ConfessionSetting from '../models/ConfessionSetting'; // Importing the model
import { MongoClient } from 'mongodb';

// MongoDB setup (replace with your connection string and database name)
const uri = "your_mongodb_connection_string";
const client = new MongoClient(uri);
const database = client.db('your_database_name');
const collection = database.collection('user_links');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fetlife')
        .setDescription('Fetlife related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('refresh')
                .setDescription('Refreshes the RSVP list from all Paris events'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('link')
                .setDescription('Link your Fetlife account')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Your Fetlife.com username')
                        .setRequired(true))),
    async execute(interaction: CommandInteraction) {
        const subcommand = (interaction.options as CommandInteractionOptionResolver).getSubcommand();

        if (subcommand === 'refresh') {
            // Ensure this is a moderator command
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                return;
            }

            // Execute the fetchRSVPfromAllParisEvents function
            const results = await fetchRSVPfromAllParisEvents();
            // Save results in a variable (currently does nothing with it)
            await interaction.reply({ content: 'RSVP list refreshed.', ephemeral: true });
        } else if (subcommand === 'link') {
            const fetlifeUsername = (interaction.options as CommandInteractionOptionResolver).getString("username", true);
            const discordId = interaction.user.id;

            // Save the Fetlife username linked to the Discord ID in MongoDB
            await client.connect();
            await collection.updateOne(
                { discordId },
                { $set: { fetlifeUsername } },
                { upsert: true }
            );
            await interaction.reply({ content: `Your Fetlife account has been linked as ${fetlifeUsername}.`, ephemeral: true });
        }
    }
}; 