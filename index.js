// --- SERVIDOR HTTP 24/7 ---
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('AEGIS 🪄 activo 24/7!'));
app.listen(process.env.PORT || 3000, () => console.log('[HTTP] Servidor listo 🟩'));

// --- DEPENDENCIAS ---
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { commandsData } = require('./commands');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const DB_PATH = path.join(__dirname, 'mod_data.json');

function readDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ userLogs: {}, logsChannels: {}, autoroles: {}, stats: { totalScamsBlocked: 0, totalWarnsGiven: 0 } }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (!data.userLogs) data.userLogs = {};
    if (!data.logsChannels) data.logsChannels = {}; 
    if (!data.autoroles) data.autoroles = {};
    return data;
}

function writeDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

function addModLog(guildId, userId, tipo, razon, moderador) {
    const db = readDB();
    if (!db.userLogs[guildId]) db.userLogs[guildId] = {};
    if (!db.userLogs[guildId][userId]) db.userLogs[guildId][userId] = [];
    db.userLogs[guildId][userId].push({ tipo: tipo.toUpperCase(), razon, fecha: new Date().toLocaleDateString(), por: moderador });
    writeDB(db);
}

const SCAM_KEYWORDS = ['discord-nitro', 'free-nitro', 'nitro-gift', 'dlscord', 'steeam', 'giveaway-nitro'];

async function sendLog(guild, embed) {
    const db = readDB();
    const channelId = db.logsChannels[guild.id];
    if (!channelId) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel) channel.send({ embeds: [embed] }).catch(() => {});
}

async function deployCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        console.log('[AEGIS 🪄] Registrando comandos...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsData });
        console.log('[AEGIS 🪄] ¡Comandos sincronizados! 🟩');
    } catch (error) {
        console.error('[DEPLOY ERROR]', error);
    }
}

client.once('ready', () => {
    console.log(`[DISCORD] Online como ${client.user.tag} 🟩`);
    deployCommands();
});

// AUTOROLE
client.on('guildMemberAdd', async member => {
    const db = readDB();
    const serverAutoroles = db.autoroles[member.guild.id];
    if (!serverAutoroles) return;
    const roleId = serverAutoroles[member.user.bot ? 'bot' : 'human'];
    if (roleId) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) member.roles.add(role).catch(() => {});
    }
});

// ANTI-SCAM
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const contentLower = message.content.toLowerCase();
    if (SCAM_KEYWORDS.some(k => contentLower.includes(k)) || (contentLower.includes('http') && contentLower.includes('nitro'))) {
        try {
            await message.delete();
            const db = readDB();
            db.stats.totalScamsBlocked += 1;
            writeDB(db);
            const alertEmbed = new EmbedBuilder().setTitle('🛡️ Anti-Scam AEGIS 🪄').setDescription(`Enlace sospechoso eliminado de ${message.author}.`).setColor('#ef4444').setTimestamp();
            await message.channel.send({ embeds: [alertEmbed] });
            const logEmbed = new EmbedBuilder().setTitle('🚨 Log: Scam').setDescription(`**Usuario:** ${message.author}\n**Contenido:** \`${message.content}\``).setColor('#ef4444').setTimestamp();
            await sendLog(message.guild, logEmbed);
        } catch (e) {}
    }
});

// EJECUCIÓN DE COMANDOS
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guildId, member, guild } = interaction;

    if (commandName !== 'ping' && commandName !== 'help' && !member.permissions.has('ModerateMembers') && !member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ Sin permisos.', ephemeral: true });
    }

    if (commandName === 'ping') return interaction.reply({ content: `📡 Latencia: **${client.ws.ping}ms**`, ephemeral: true });

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🪄 Panel de Ayuda — AEGIS')
            .setDescription('Sistema de Seguridad y Moderación 24/7.')
            .setColor('#6366f1')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🌐 General', value: '`/help` - Menú de ayuda.\n`/ping` - Latencia del bot.' },
                { name: '🎭 Autorole', value: '`/autorole add` - Asigna rol automático.\n`/autorole remove` - Quita rol automático.\n`/autorole list` - Ver roles activos.' },
                { name: '🛡️ Moderación', value: '`/clear` | `/modlogs` | `/warn` | `/unwarn` | `/kick` | `/ban` | `/unban`' },
                { name: '⚙️ Configuración', value: '`/logs establecer` | `/logs eliminar`' }
            )
            .setFooter({ text: 'AEGIS 🪄 — Moderación Eficiente', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed] });
    }

    if (commandName === 'autorole') {
        const sub = interaction.options.getSubcommand();
        const db = readDB();
        if (!db.autoroles[guildId]) db.autoroles[guildId] = {};

        if (sub === 'add') {
            const type = interaction.options.getString('type');
            const role = interaction.options.getRole('role');
            db.autoroles[guildId][type] = role.id;
            writeDB(db);
            const embed = new EmbedBuilder().setTitle('🎭 Autorole Configurado').setDescription(`Rol ${role} asignado a **${type === 'human' ? 'Humanos' : 'Bots'}**.`).setColor('#10b981').setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }
        if (sub === 'remove') {
            const type = interaction.options.getString('type');
            delete db.autoroles[guildId][type];
            writeDB(db);
            return interaction.reply({ content: '🗑️ Autorole eliminado.', ephemeral: true });
        }
        if (sub === 'list') {
            const human = db.autoroles[guildId].human ? `<@&${db.autoroles[guildId].human}>` : '`No configurado`';
            const bot = db.autoroles[guildId].bot ? `<@&${db.autoroles[guildId].bot}>` : '`No configurado`';
            const embed = new EmbedBuilder().setTitle('🎭 Autoroles Activos').addFields({ name: '👤 Humanos', value: human, inline: true }, { name: '🤖 Bots', value: bot, inline: true }).setColor('#6366f1');
            return interaction.reply({ embeds: [embed] });
        }
    }

    if (commandName === 'logs') {
        const sub = interaction.options.getSubcommand();
        const db = readDB();
        if (sub === 'establecer') {
            const ch = interaction.options.getChannel('canal');
            db.logsChannels[guildId] = ch.id;
            writeDB(db);
            return interaction.reply({ content: `✅ Canal de logs guardado: ${ch}` });
        }
        if (sub === 'eliminar') {
            delete db.logsChannels[guildId];
            writeDB(db);
            return interaction.reply({ content: '🗑️ Canal de logs desactivado.' });
        }
    }

    if (commandName === 'clear') {
        const cant = interaction.options.getInteger('cantidad');
        await interaction.deferReply({ ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(cant, true);
        const logEmbed = new EmbedBuilder().setTitle('🧹 Log: Limpieza').setDescription(`**Mod:** ${interaction.user}\n**Canal:** ${interaction.channel}\n**Borrados:** ${deleted.size}`).setColor('#3b82f6').setTimestamp();
        await sendLog(guild, logEmbed);
        return interaction.editReply({ content: `🧹 Se limpiaron **${deleted.size}** mensajes.` });
    }

    if (commandName === 'warn') {
        const target = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon');
        addModLog(guildId, target.id, 'WARN', razon, interaction.user.tag);
        const warnEmbed = new EmbedBuilder().setTitle('⚠️ Usuario Advertido').setDescription(`**Usuario:** ${target}\n**Razón:** ${razon}\n**Mod:** ${interaction.user}`).setColor('#f59e0b').setTimestamp();
        await sendLog(guild, warnEmbed);
        return interaction.reply({ embeds: [warnEmbed] });
    }

    if (commandName === 'unwarn') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        const logs = db.userLogs[guildId]?.[target.id] || [];
        const idx = logs.map((l, i) => l.tipo === 'WARN' ? i : null).filter(v => v !== null).pop();
        if (idx === undefined) return interaction.reply({ content: '❌ Sin advertencias activas.', ephemeral: true });
        const removida = logs.splice(idx, 1)[0];
        writeDB(db);
        const embed = new EmbedBuilder().setTitle('🛡️ Advertencia Removida').setDescription(`Removida a ${target}.\n**Razón:** ${removida.razon}`).setColor('#10b981').setTimestamp();
        await sendLog(guild, embed);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'kick') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member || !member.kickable) return interaction.reply({ content: 'No puedo expulsar a este usuario.', ephemeral: true });
        addModLog(guildId, targetUser.id, 'KICK', razon, interaction.user.tag);
        await member.kick(razon);
        const logEmbed = new EmbedBuilder().setTitle('👢 Log: Expulsión').setDescription(`**Usuario:** ${targetUser.tag}\n**Mod:** ${interaction.user}\n**Razón:** ${razon}`).setColor('#ef4444').setTimestamp();
        await sendLog(guild, logEmbed);
        return interaction.reply({ content: `👢 **${targetUser.username}** fue expulsado.` });
    }

    if (commandName === 'ban') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member || !member.bannable) return interaction.reply({ content: 'No puedo banear a este usuario.', ephemeral: true });
        addModLog(guildId, targetUser.id, 'BAN', razon, interaction.user.tag);
        await member.ban({ reason: razon });
        const logEmbed = new EmbedBuilder().setTitle('🔨 Log: Baneo').setDescription(`**Usuario:** ${targetUser.tag}\n**Mod:** ${interaction.user}\n**Razón:** ${razon}`).setColor('#b91c1c').setTimestamp();
        await sendLog(guild, logEmbed);
        return interaction.reply({ content: `🔨 **${targetUser.username}** fue baneado.` });
    }

    if (commandName === 'unban') {
        const userId = interaction.options.getString('userid');
        const razon = interaction.options.getString('razon') || 'Sin razón';
        try {
            await guild.members.unban(userId, razon);
            addModLog(guildId, userId, 'UNBAN', razon, interaction.user.tag);
            const logEmbed = new EmbedBuilder().setTitle('🔓 Log: Desbaneo').setDescription(`**ID:** \`${userId}\`\n**Mod:** ${interaction.user}`).setColor('#10b981').setTimestamp();
            await sendLog(guild, logEmbed);
            return interaction.reply({ content: `🔓 Usuario \`${userId}\` desbaneado.` });
        } catch (e) {
            return interaction.reply({ content: '❌ Error al desbanear. Revisa la ID.', ephemeral: true });
        }
    }

    if (commandName === 'modlogs') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        const logs = db.userLogs[guildId]?.[target.id] || [];
        if (logs.length === 0) return interaction.reply({ content: `✅ **${target.username}** tiene expediente limpio.`, ephemeral: true });
        const embed = new EmbedBuilder().setTitle(`📋 Expediente - ${target.username}`).setColor('#6366f1').setThumbnail(target.displayAvatarURL());
        logs.slice(-10).reverse().forEach(l => embed.addFields({ name: `[${l.tipo}] ${l.fecha}`, value: `**Razón:** ${l.razon}\n**Por:** ${l.por}` }));
        return interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.BOT_TOKEN).catch(e => console.error('[LOGIN ERROR]', e.message));

