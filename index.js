const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('AEGIS 🪄 activo 24/7!'));
app.listen(process.env.PORT || 3000, () => console.log('[HTTP] Servidor listo 🟩'));

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { commandsData } = require('./commands');

// TU ID DE CREADOR CONFIGURADA
const OWNER_ID = process.env.OWNER_ID || '1518292336214544547';

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

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const contentLower = message.content.toLowerCase();

    const isScam = SCAM_KEYWORDS.some(k => contentLower.includes(k)) || (contentLower.includes('http') && contentLower.includes('nitro'));
    const isInvite = contentLower.includes('discord.gg/') || contentLower.includes('discord.com/invite/');
    const isMassMention = message.mentions.users.size + message.mentions.roles.size > 5;

    if (isScam || isInvite || isMassMention) {
        try {
            await message.delete();
            let motivo = 'Enlace sospechoso de Scam';
            if (isInvite) motivo = 'Invitación no autorizada a otro servidor';
            if (isMassMention) motivo = 'Menciones masivas (+5 usuarios/roles)';

            const alertEmbed = new EmbedBuilder()
                .setTitle('🛡️ Protección Automática — AEGIS 🪄')
                .setDescription(`Se ha eliminado un mensaje de ${message.author} por infringir las normas de seguridad.`)
                .addFields({ name: '⚠️ Motivo', value: `\`${motivo}\`` })
                .setColor('#ef4444')
                .setFooter({ text: 'AEGIS Security System', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await message.channel.send({ embeds: [alertEmbed] });

            const logEmbed = new EmbedBuilder()
                .setTitle('🚨 Log: AutoMod Activado')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Usuario', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                    { name: '💬 Canal', value: `${message.channel}`, inline: true },
                    { name: '⚠️ Motivo', value: `\`${motivo}\`` },
                    { name: '📄 Contenido', value: `\`\`\`${message.content.slice(0, 500)}\`\`\`` }
                )
                .setColor('#ef4444')
                .setTimestamp();

            await sendLog(message.guild, logEmbed);
        } catch (e) {}
    }
});
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guildId, member, guild, user } = interaction;

    // --- DIVERSIÓN ---
    if (commandName === '8ball') {
        const pregunta = interaction.options.getString('pregunta');
        const respuestas = [
            '🟢 Totalmente sí.',
            '🟢 Es muy probable.',
            '🟡 Tal vez, no estoy seguro.',
            '🟡 Pregúntame de nuevo más tarde.',
            '🔴 Definitivamente no.',
            '🔴 Mis fuentes dicen que no.',
            '✨ Las estrellas indican que sí.',
            '❌ Ni lo sueñes.'
        ];
        const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];

        const embed = new EmbedBuilder()
            .setTitle('🎱 Bola 8 Mágica — AEGIS 🪄')
            .addFields(
                { name: '❓ Pregunta:', value: `\`${pregunta}\`` },
                { name: '🔮 Respuesta:', value: `**${respuesta}**` }
            )
            .setColor('#8b5cf6')
            .setFooter({ text: `Consultado por ${user.tag}`, iconURL: user.displayAvatarURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'say') {
        const mensaje = interaction.options.getString('mensaje');

        const embed = new EmbedBuilder()
            .setDescription(mensaje)
            .setColor('#3b82f6')
            .setFooter({ text: `Mensaje de ${user.username}`, iconURL: user.displayAvatarURL() });

        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'avatar') {
        const targetUser = interaction.options.getUser('usuario') || user;
        const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setTitle(`🖼️ Avatar de ${targetUser.username}`)
            .setImage(avatarUrl)
            .setColor('#ec4899')
            .setDescription(`[👉 Haz clic aquí para descargar el avatar en alta calidad](${avatarUrl})`)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // --- ESTADO (SOLO CREACIÓN/OWNER) ---
    if (commandName === 'estado') {
        if (user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ Solo el desarrollador/creador de AEGIS 🪄 puede cambiar el estado global.', ephemeral: true });
        }

        const estado = interaction.options.getString('opcion');

        if (estado === 'activo') {
            const embed = new EmbedBuilder()
                .setTitle('🟢 AEGIS 🪄 — Sistema Activo')
                .setDescription('El bot se encuentra **100% operativo**. Todos los sistemas de moderación, protección pasiva y autorole están funcionando con normalidad.')
                .setColor('#10b981')
                .setFooter({ text: 'AEGIS Status', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (estado === 'mantenimiento') {
            const embed = new EmbedBuilder()
                .setTitle('🟡 AEGIS 🪄 — En Mantenimiento')
                .setDescription('El bot está pasando por **mantenimiento y actualizaciones**. Algunas funciones de moderación o respuestas automáticas podrían demorar temporalmente.')
                .setColor('#f59e0b')
                .setFooter({ text: 'AEGIS Status', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (estado === 'apagado') {
            const embed = new EmbedBuilder()
                .setTitle('🔴 AEGIS 🪄 — Fuera de Servicio')
                .setDescription('El bot ha sido **puesto fuera de línea**. Todos los módulos pasarán a estar pausados hasta nuevo aviso.')
                .setColor('#ef4444')
                .setFooter({ text: 'AEGIS Status', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ content: '@everyone', embeds: [embed] });
        }
    }

    // --- PERMISOS MODERACIÓN ---
    if (commandName !== 'ping' && commandName !== 'help' && !member.permissions.has('ModerateMembers') && !member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ No tienes permisos para usar los comandos de moderación de AEGIS 🪄.', ephemeral: true });
    }

    if (commandName === 'ping') {
        const pingEmbed = new EmbedBuilder()
            .setTitle('📡 Latencia del Sistema AEGIS 🪄')
            .addFields(
                { name: '⚡ Latencia de Bot', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '🟢 Estado', value: '`Óptimo 24/7`', inline: true }
            )
            .setColor('#10b981')
            .setFooter({ text: 'AEGIS Guard', iconURL: client.user.displayAvatarURL() });

        return interaction.reply({ embeds: [pingEmbed], ephemeral: true });
    }

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🪄 Panel Principal — AEGIS System')
            .setDescription('Bienvenido al centro de control de **AEGIS**. Lista de comandos disponibles:')
            .setColor('#6366f1')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🌐 General', value: '`/help` - Muestra este panel elegante.\n`/ping` - Revisa el estado y latencia.' },
                { name: '🎉 Diversión', value: '`/8ball` - Pregunta a la bola mágica.\n`/say` - Envia un mensaje en Embed.\n`/avatar` - Muestra y descarga fotos de perfil.' },
                { name: '🎭 Autorole', value: '`/autorole add` - Asigna rol automático.\n`/autorole remove` - Desactiva rol automático.\n`/autorole list` - Muestra roles configurados.' },
                { name: '🛡️ Moderación', value: '`/clear` - Limpieza de mensajes.\n`/warn` | `/unwarn` - Advertencias.\n`/kick` | `/ban` | `/unban` - Expulsiones y baneos.\n`/modlogs` - Expediente histórico.' },
                { name: '⚙️ Configuración', value: '`/logs establecer` - Define canal de registros.\n`/logs eliminar` - Desactiva canal de registros.' }
            )
            .setFooter({ text: 'AEGIS 🪄 — Moderación Eficiente y Elegante', iconURL: client.user.displayAvatarURL() })
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

            const embed = new EmbedBuilder()
                .setTitle('🎭 Configuración de Autorole')
                .setDescription('Se ha established con éxito la asignación automática de rol.')
                .addFields(
                    { name: '👥 Tipo de Miembro', value: type === 'human' ? '`Humanos 👤`' : '`Bots 🤖`', inline: true },
                    { name: '🎖️ Rol Asignado', value: `${role}`, inline: true }
                )
                .setColor('#10b981')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
        if (sub === 'remove') {
            const type = interaction.options.getString('type');
            delete db.autoroles[guildId][type];
            writeDB(db);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Autorole Desactivado')
                .setDescription(`Se ha eliminado el rol automático para **${type === 'human' ? 'Humanos 👤' : 'Bots 🤖'}**.`)
                .setColor('#ef4444')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
        if (sub === 'list') {
            const human = db.autoroles[guildId].human ? `<@&${db.autoroles[guildId].human}>` : '`No configurado`';
            const bot = db.autoroles[guildId].bot ? `<@&${db.autoroles[guildId].bot}>` : '`No configurado`';

            const embed = new EmbedBuilder()
                .setTitle('🎭 Roles Automáticos Activos')
                .addFields(
                    { name: '👤 Humanos', value: human, inline: true },
                    { name: '🤖 Bots', value: bot, inline: true }
                )
                .setColor('#6366f1')
                .setTimestamp();

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

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Canal de Registros Establecido')
                .setDescription(`Alertas dirigidas a ${ch}.`)
                .setColor('#10b981')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
        if (sub === 'eliminar') {
            delete db.logsChannels[guildId];
            writeDB(db);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Canal de Registros Desactivado')
                .setColor('#ef4444')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    }

    if (commandName === 'clear') {
        const cant = interaction.options.getInteger('cantidad');
        await interaction.deferReply({ ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(cant, true);

        const logEmbed = new EmbedBuilder()
            .setTitle('🧹 Registros: Limpieza de Mensajes')
            .addFields(
                { name: '🛡️ Moderador', value: `${interaction.user}`, inline: true },
                { name: '💬 Canal', value: `${interaction.channel}`, inline: true },
                { name: '🗑️ Cantidad Borrada', value: `\`${deleted.size}\` mensajes`, inline: true }
            )
            .setColor('#3b82f6')
            .setTimestamp();

        await sendLog(guild, logEmbed);

        const replyEmbed = new EmbedBuilder()
            .setTitle('🧹 Limpieza Completada')
            .setDescription(`Se eliminaron **${deleted.size}** mensajes correctamente.`)
            .setColor('#10b981');

        return interaction.editReply({ embeds: [replyEmbed] });
    }

    if (commandName === 'warn') {
        const target = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon');
        addModLog(guildId, target.id, 'WARN', razon, interaction.user.tag);

        const warnEmbed = new EmbedBuilder()
            .setTitle('⚠️ Sanción: Advertencia Emitida')
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Miembro Sancionado', value: `${target} (\`${target.id}\`)`, inline: true },
                { name: '🛡️ Moderador', value: `${interaction.user}`, inline: true },
                { name: '📄 Razón', value: `\`\`\`${razon}\`\`\`` }
            )
            .setColor('#f59e0b')
            .setTimestamp();

        await sendLog(guild, warnEmbed);
        return interaction.reply({ embeds: [warnEmbed] });
    }

    if (commandName === 'unwarn') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        const logs = db.userLogs[guildId]?.[target.id] || [];
        const idx = logs.map((l, i) => l.tipo === 'WARN' ? i : null).filter(v => v !== null).pop();

        if (idx === undefined) return interaction.reply({ content: `❌ **${target.username}** no tiene advertencias.`, ephemeral: true });

        const removida = logs.splice(idx, 1)[0];
        writeDB(db);

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Sanción Removida: Advertencia Retirada')
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Usuario', value: `${target}`, inline: true },
                { name: '🛡️ Moderador', value: `${interaction.user}`, inline: true },
                { name: '📄 Razón Original', value: `\`${removida.razon}\`` }
            )
            .setColor('#10b981')
            .setTimestamp();

        await sendLog(guild, embed);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'kick') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member || !member.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario por jerarquía.', ephemeral: true });

        addModLog(guildId, targetUser.id, 'KICK', razon, interaction.user.tag);
        await member.kick(razon);

        const logEmbed = new EmbedBuilder()
            .setTitle('👢 Registros: Usuario Expulsado')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Usuario Expulsado', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                { name: '🛡️ Moderador', value: `${interaction.user}`, inline: true },
                { name: '📄 Razón', value: `\`\`\`${razon}\`\`\`` }
            )
            .setColor('#ef4444')
            .setTimestamp();

        await sendLog(guild, logEmbed);

        const replyEmbed = new EmbedBuilder()
            .setTitle('👢 Expulsión Ejecutada')
            .setDescription(`**${targetUser.tag}** fue expulsado del servidor.`)
            .setColor('#ef4444');

        return interaction.reply({ embeds: [replyEmbed] });
    }

    if (commandName === 'ban') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member || !member.bannable) return interaction.reply({ content: '❌ No puedo banear a este usuario por jerarquía.', ephemeral: true });

        addModLog(guildId, targetUser.id, 'BAN', razon, interaction.user.tag);
        await member.ban({ reason: razon });

        const logEmbed = new EmbedBuilder()
            .setTitle('🔨 Registros: Baneo Permanente')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Usuario Baneado', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                { name: '🛡️ Moderador', value: `${interaction.user}`, inline: true },
                { name: '📄 Razón', value: `\`\`\`${razon}\`\`\`` }
            )
            .setColor('#b91c1c')
            .setTimestamp();

        await sendLog(guild, logEmbed);

        const replyEmbed = new EmbedBuilder()
            .setTitle('🔨 Baneo Ejecutado')
            .setDescription(`**${targetUser.tag}** fue baneado del servidor.`)
            .setColor('#b91c1c');

        return interaction.reply({ embeds: [replyEmbed] });
    }

    if (commandName === 'unban') {
        const userId = interaction.options.getString('userid');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';

        try {
            await guild.members.unban(userId, razon);
            addModLog(guildId, userId, 'UNBAN', razon, interaction.user.tag);

            const logEmbed = new EmbedBuilder()
                .setTitle('🔓 Registros: Baneo Removido')
                .addFields(
                    { name: '👤 ID del Usuario', value: `\`${userId}\``, inline: true },
                    { name: '🛡️ Moderador', value: `${interaction.user}`, inline: true },
                    { name: '📄 Razón', value: `\`${razon}\`` }
                )
                .setColor('#10b981')
                .setTimestamp();

            await sendLog(guild, logEmbed);

            const replyEmbed = new EmbedBuilder()
                .setTitle('🔓 Desbaneo Exitoso')
                .setDescription(`El usuario con ID \`${userId}\` ha sido desbaneado.`)
                .setColor('#10b981');

            return interaction.reply({ embeds: [replyEmbed] });
        } catch (e) {
            return interaction.reply({ content: '❌ Error al desbanear. Verifica la ID.', ephemeral: true });
        }
    }

    if (commandName === 'modlogs') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        const logs = db.userLogs[guildId]?.[target.id] || [];

        if (logs.length === 0) {
            const cleanEmbed = new EmbedBuilder()
                .setTitle(`📋 Expediente — ${target.username}`)
                .setDescription(`✅ Este usuario tiene un expediente **completamente limpio**.`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setColor('#10b981')
                .setTimestamp();

            return interaction.reply({ embeds: [cleanEmbed] });
        }

        const warns = logs.filter(l => l.tipo === 'WARN').length;
        const kicks = logs.filter(l => l.tipo === 'KICK').length;
        const bans = logs.filter(l => l.tipo === 'BAN').length;

        const embed = new EmbedBuilder()
            .setTitle(`📋 Expediente de Moderación — ${target.username}`)
            .setDescription(`**Resumen de Historial Activo:**\n⚠️ Warns: \`${warns}\` | 👢 Kicks: \`${kicks}\` | 🔨 Bans: \`${bans}\``)
            .setColor('#6366f1')
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        logs.slice(-10).reverse().forEach(l => {
            let emoji = l.tipo === 'KICK' ? '👢' : l.tipo === 'BAN' ? '🔨' : l.tipo === 'UNBAN' ? '🔓' : '⚠️';
            embed.addFields({ name: `${emoji} [${l.tipo}] — ${l.fecha}`, value: `**Razón:** ${l.razon}\n**Moderador:** ${l.por}` });
        });

        return interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.BOT_TOKEN).catch(e => console.error('[LOGIN ERROR]', e.message));
