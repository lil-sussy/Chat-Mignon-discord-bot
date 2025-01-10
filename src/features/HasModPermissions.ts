import { Client, CommandInteraction, Role, GuildMemberRoleManager } from 'discord.js';
import ExtendedClient from "../classes/Client";

export async function hasModPermission(client: ExtendedClient, interaction: CommandInteraction): Promise<boolean> {
	const roleName = client.config.moderatorRoleName;
	const moderatorRole: Role | undefined = interaction.guild?.roles.cache.find((r) => r.name === roleName);

	if (!moderatorRole) {
		await interaction.reply({
			content: `Moderator role "${roleName}" not found in this server.`,
			ephemeral: true,
		});
		return false;
	}

	const memberRoles = (interaction.member?.roles as GuildMemberRoleManager)?.cache;
	if (!memberRoles || !memberRoles.has(moderatorRole.id)) {
		await interaction.reply({
			content: "You do not have permission to use this command.",
			ephemeral: true,
		});
		return false;
	}

	return true;
}