const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('AEGIS 🪄 activo 24/7!'));
app.listen(process.env.PORT || 3000, () => console.log('[HTTP] Servidor listo 🟩'));

require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    REST, 
    Routes,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { commandsData } = require('./commands');

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
    // --- MANEJO DEL MENÚ DESPLEGABLE (HELP) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_select') {
        const selected = interaction.values[0];

        let embed = new EmbedBuilder().setColor('#6366f1').setTimestamp();

        if (selected === 'general') {
            embed.setTitle('🌐 Comandos Generales')
                .setDescription('`/help` - Abre este panel interactivo.\n`/ping` - Muestra la latencia del bot en ms.\n`/estado` - *(Solo Creador)* Cambia el estado del bot.');
        } else if (selected === 'diversion') {
            embed.setTitle('🎉 Comandos de Diversión')
                .setDescription('`/8ball [pregunta]` - Consulta la bola 8 mágica.\n`/say [mensaje]` - El bot repite tu mensaje en un Embed.\n`/avatar [usuario]` - Muestra y descarga una foto de perfil.');
        } else if (selected === 'moderacion') {
            embed.setTitle('🛡️ Comandos de Moderación')
                .setDescription('`/warn [usuario] [razon]` - Advierte a un miembro.\n`/unwarn [usuario]` - Quita la última advertencia.\n`/kick [usuario] [razon]` - Expulsa a un miembro.\n`/ban [usuario] [razon]` - Banea a un usuario.\n`/unban [id]` - Desbanea un usuario por su ID.\n`/clear [cantidad]` - Limpia mensajes del chat.\n`/modlogs [usuario]` - Revisa el expediente.');
        } else if (selected === 'config') {
            embed.setTitle('⚙️ Configuración del Servidor')
                .setDescription('`/autorole add` - Asigna rol automático.\n`/autorole remove` - Desactiva rol automático.\n`/autorole list` - Ver roles automáticos.\n`/logs establecer` - Define el canal de registros.\n`/logs eliminar` - Desactiva el canal de logs.');
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, guildId, member, guild, user } = interaction;

    // --- CÓDIGO DEL /HELP INTERACTIVO ESTILO MOKENO BOT ---
    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('📖 Menú de Ayuda — AEGIS 🪄')
            .setDescription('**Sistema Oficial de AEGIS Bot**\n\nBienvenido al panel de ayuda interactivo. Aquí podrás explorar los comandos y configuraciones de AEGIS de forma rápida y sencilla.\n\nUtiliza el menú desplegable de abajo para navegar entre las diferentes categorías disponibles.\n\n🔗 **Enlaces de Utilidad:**\n¿Quieres llevar tu servidor al siguiente nivel? Mantén tu servidor seguro con nuestro sistema de **moderación y autoroles**.')
            .addFields(
                { name: '📊 Información General', value: '• **Categorías:** 4\n• **Total de Comandos:** 15', inline: false }
            )
            .setColor('#3b82f6')
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: `Solicitado por: ${user.username}`, iconURL: user.displayAvatarURL() })
            .setTimestamp();

        // MENÚ DESPLEGABLE DE CATEGORÍAS
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Selecciona una categoría de comandos')
            .addOptions([
                { label: 'General', description: 'Comandos básicos del bot', value: 'general', emoji: '🌐' },
                { label: 'Diversión', description: 'Juegos y comandos interactivos', value: 'diversion', emoji: '🎉' },
                { label: 'Moderación', description: 'Herramientas para moderadores', value: 'moderacion', emoji: '🛡️' },
                { label: 'Configuración', description: 'Logs y Autorole', value: 'config', emoji: '⚙️' },
            ]);

        // BOTONES DE ENLACES EXTERNOS
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Servidor de Soporte')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg'),
            new ButtonBuilder()
                .setLabel('Sitio Web')
                .setStyle(ButtonStyle.Link)
                .setURL('https://google.com')
        );

        const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

        return interaction.reply({ embeds: [helpEmbed], components: [rowSelect, buttons] });
    }

    // --- DIVERSIÓN ---
    if (commandName === '8ball') {
        const pregunta = interaction.options.getString('pregunta');
        const respuestas = ['🟢 Totalmente sí.', '🟢 Es muy probable.', '🟡 Tal vez, no estoy seguro.', '🟡 Pregúntame más tarde.', '🔴 Definitivamente no.', '🔴 Mis fuentes dicen que no.', '✨ Las estrellas dicen que sí.', '❌ Ni lo sueñes.'];
        const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];

        const embed = new EmbedBuilder()
            .setTitle('🎱 Bola 8 Mágica — AEGIS 🪄')
            .addFields({ name: '❓ Pregunta:', value: `\`${pregunta}\`` }, { name: '🔮 Respuesta:', value: `**${respuesta}**` })
            .setColor('#8b5cf6')
            .setFooter({ text: `Consultado por ${user.tag}`, iconURL: user.displayAvatarURL() }).setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'say') {
        const mensaje = interaction.options.getString('mensaje');
        const embed = new EmbedBuilder().setDescription(mensaje).setColor('#3b82f6').setFooter({ text: `Mensaje de ${user.username}`, iconURL: user.displayAvatarURL() });
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

    // --- ESTADO (SOLO CREADOR) ---
    if (commandName === 'estado') {
        if (user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ Solo el desarrollador/creador de AEGIS 🪄 puede cambiar el estado global.', ephemeral: true });
        }

        const estado = interaction.options.getString('opcion');

        if (estado === 'activo') {
            const embed = new EmbedBuilder()
                .setTitle('🟢 AEGIS 🪄 — Sistema Activo')
                .setDescription('El bot se encuentra **100% operativo**.')
                .setColor('#10b981').setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }
        if (estado === 'mantenimiento') {
            const embed = new EmbedBuilder()
                .setTitle('🟡 AEGIS 🪄 — En Mantenimiento')
                .setDescription('El bot está pasando por **mantenimiento y actualizaciones**.')
                .setColor('#f59e0b').setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }
        if (estado === 'apagado') {
            const embed = new EmbedBuilder()
                .setTitle('🔴 AEGIS 🪄 — Fuera de Servicio')
                .setDescription('El bot ha sido **puesto fuera de línea**.')
                .setColor('#ef4444').setTimestamp();
            return interaction.reply({ content: '@everyone', embeds: [embed] });
        }
    }

    // --- PERMISOS MODERACIÓN ---
    if (commandName !== 'ping' && commandName !== 'help' && !member.permissions.has('ModerateMembers') && !member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ No tienes permisos para usar la moderación de AEGIS 🪄.', ephemeral: true });
    }

    if (commandName === 'ping') {
        const pingEmbed = new EmbedBuilder()
            .setTitle('📡 Latencia del Sistema AEGIS 🪄')
            .addFields({ name: '⚡ Latencia de Bot', value: `\`${client.ws.ping}ms\``, inline: true }, { name: '🟢 Estado', value: '`Óptimo 24/7`', inline: true })
            .setColor('#10b981');
        return interaction.reply({ embeds: [pingEmbed], ephemeral: true });
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
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎭 Autorole Configurado').setDescription(`Rol ${role} asignado a ${type}.`).setColor('#10b981')] });
        }
        if (sub === 'remove') {
            const type = interaction.options.getString('type');
            delete db.autoroles[guildId][type];
            writeDB(db);
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🗑️ Autorole Eliminado').setColor('#ef4444')] });
        }
        if (sub === 'list') {
            const human = db.autoroles[guildId].human ? `<@&${db.autoroles[guildId].human}>` : '`No configurado`';
            const bot = db.autoroles[guildId].bot ? `<@&${db.autoroles[guildId].bot}>` : '`No configurado`';
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎭 Roles Automáticos').addFields({ name: '👤 Humanos', value: human }, { name: '🤖 Bots', value: bot }).setColor('#6366f1')] });
        }
    }

    if (commandName === 'logs') {
        const sub = interaction.options.getSubcommand();
        const db = readDB();
        if (sub === 'establecer') {
            const ch = interaction.options.getChannel('canal');
            db.logsChannels[guildId] = ch.id;
            writeDB(db);
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚙️ Canal de Registros Establecido').setDescription(`Logs dirigidos a ${ch}.`).setColor('#10b981')] });
        }
        if (sub === 'eliminar') {
            delete db.logsChannels[guildId];
            writeDB(db);
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🗑️ Canal de Logs Desactivado').setColor('#ef4444')] });
        }
    }

    if (commandName === 'clear') {
        const cant = interaction.options.getInteger('cantidad');
        await interaction.deferReply({ ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(cant, true);
        await sendLog(guild, new EmbedBuilder().setTitle('🧹 Limpieza').addFields({ name: 'Moderador', value: `${user}` }, { name: 'Cantidad', value: `${deleted.size}` }).setColor('#3b82f6'));
        return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🧹 Limpieza').setDescription(`Se borraron ${deleted.size} mensajes.`).setColor('#10b981')] });
    }

    if (commandName === 'warn') {
        const target = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon');
        addModLog(guildId, target.id, 'WARN', razon, interaction.user.tag);
        const warnEmbed = new EmbedBuilder().setTitle('⚠️ Advertencia Emitida').addFields({ name: 'Usuario', value: `${target}` }, { name: 'Razón', value: razon }).setColor('#f59e0b');
        await sendLog(guild, warnEmbed);
        return interaction.reply({ embeds: [warnEmbed] });
    }

    if (commandName === 'unwarn') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        const logs = db.userLogs[guildId]?.[target.id] || [];
        const idx = logs.map((l, i) => l.tipo === 'WARN' ? i : null).filter(v => v !== null).pop();
        if (idx === undefined) return interaction.reply({ content: `❌ ${target.username} no tiene advertencias.`, ephemeral: true });
        logs.splice(idx, 1);
        writeDB(db);
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛡️ Advertencia Retirada').setColor('#10b981')] });
    }

    if (commandName === 'kick') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón';
        const memberTarget = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!memberTarget || !memberTarget.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario.', ephemeral: true });
        addModLog(guildId, targetUser.id, 'KICK', razon, interaction.user.tag);
        await memberTarget.kick(razon);
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle('👢 Expulsión Ejecutada').setDescription(`${targetUser.tag} fue expulsado.`).setColor('#ef4444')] });
    }

    if (commandName === 'ban') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón';
        const memberTarget = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!memberTarget || !memberTarget.bannable) return interaction.reply({ content: '❌ No puedo banear a este usuario.', ephemeral: true });
        addModLog(guildId, targetUser.id, 'BAN', razon, interaction.user.tag);
        await memberTarget.ban({ reason: razon });
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔨 Baneo Ejecutado').setDescription(`${targetUser.tag} fue baneado.`).setColor('#b91c1c')] });
    }

    if (commandName === 'unban') {
        const userId = interaction.options.getString('userid');
        const razon = interaction.options.getString('razon') || 'Sin razón';
        try {
            await guild.members.unban(userId, razon);
            addModLog(guildId, userId, 'UNBAN', razon, interaction.user.tag);
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔓 Desbaneo Exitoso').setDescription(`ID \`${userId}\` desbaneado.`).setColor('#10b981')] });
        } catch (e) {
            return interaction.reply({ content: '❌ Error al desbanear. Verifica la ID.', ephemeral: true });
        }
    }

    if (commandName === 'modlogs') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        const logs = db.userLogs[guildId]?.[target.id] || [];

        if (logs.length === 0) {
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`📋 Expediente — ${target.username}`).setDescription('✅ Expediente **completamente limpio**.').setColor('#10b981')] });
        }

        const embed = new EmbedBuilder().setTitle(`📋 Expediente — ${target.username}`).setColor('#6366f1');
        logs.slice(-10).reverse().forEach(l => {
            embed.addFields({ name: `[${l.tipo}] — ${l.fecha}`, value: `**Razón:** ${l.razon}\n**Mod:** ${l.por}` });
        });
        return interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.BOT_TOKEN).catch(e => console.error('[LOGIN ERROR]', e.message));
