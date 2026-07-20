// --- SERVIDOR HTTP PARA UPTRIMEROBOT & RENDER 24/7 ---
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('AEGIS 🪄 está activo 24/7!'));
app.listen(process.env.PORT || 3000, () => console.log('[HTTP] Servidor web listo para UptimeRobot 🟩'));

// --- DEPENDENCIAS Y CONFIGURACIÓN DEL BOT ---
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const DB_PATH = path.join(__dirname, 'mod_data.json');

// Base de Datos Local Integrada
function readDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ userLogs: {}, logsChannels: {}, stats: { totalScamsBlocked: 0, totalWarnsGiven: 0 } }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (!data.userLogs) data.userLogs = {};
    if (!data.logsChannels) data.logsChannels = {}; 
    return data;
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Función auxiliar para registrar sanciones por usuario
function addModLog(guildId, userId, tipo, razon, moderador) {
    const db = readDB();
    if (!db.userLogs[guildId]) db.userLogs[guildId] = {};
    if (!db.userLogs[guildId][userId]) db.userLogs[guildId][userId] = [];
    
    db.userLogs[guildId][userId].push({
        tipo: tipo.toUpperCase(),
        razon,
        fecha: new Date().toLocaleDateString(),
        por: moderador
    });
    writeDB(db);
}

// Filtro Anti-Scam Automático
const SCAM_KEYWORDS = ['discord-nitro', 'free-nitro', 'nitro-gift', 'dlscord', 'steeam', 'giveaway-nitro'];

// Función para enviar mensajes al canal de logs del servidor
async function sendLog(guild, embed) {
    const db = readDB();
    const channelId = db.logsChannels[guild.id];
    if (!channelId) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel) {
        channel.send({ embeds: [embed] }).catch(err => console.error('Error enviando log:', err.message));
    }
}

// --- REGISTRO DE COMANDOS DE BARRA ---
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Muestra la latencia del sistema AEGIS 🪄'),
    new SlashCommandBuilder().setName('help').setDescription('Muestra el menú de ayuda y comandos de AEGIS 🪄'),
    new SlashCommandBuilder().setName('clear').setDescription('Borra mensajes (1-100)').addIntegerOption(opt => opt.setName('cantidad').setDescription('Mensajes a borrar').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('Amonesta a un usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a amonestar').setRequired(true)).addStringOption(opt => opt.setName('razon').setDescription('Razón').setRequired(true)),
    new SlashCommandBuilder().setName('unwarn').setDescription('Elimina la última advertencia de un usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a perdonar').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Expulsa a un miembro').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true)).addStringOption(opt => opt.setName('razon').setDescription('Razón')),
    new SlashCommandBuilder().setName('ban').setDescription('Banea a un miembro').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true)).addStringOption(opt => opt.setName('razon').setDescription('Razón')),
    new SlashCommandBuilder().setName('unban').setDescription('Desbanea a un usuario por su ID').addStringOption(opt => opt.setName('userid').setDescription('ID de Discord del usuario').setRequired(true)).addStringOption(opt => opt.setName('razon').setDescription('Razón')),
    new SlashCommandBuilder().setName('modlogs').setDescription('Muestra el historial completo de sanciones de un usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configuración del sistema de registros')
        .addSubcommand(sub => 
            sub.setName('establecer')
               .setDescription('Establece el canal donde se enviarán los logs')
               .addChannelOption(opt => opt.setName('canal').setDescription('Selecciona el canal de texto').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('eliminar')
               .setDescription('Desactiva el canal de logs actual')
        )
].map(cmd => cmd.toJSON());

async function deployCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        console.log('[AEGIS 🪄] Sincronizando comandos de barra...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('[AEGIS 🪄] ¡Comandos globales registrados con éxito! 🟩');
    } catch (error) {
        console.error('[DEPLOY ERROR]', error);
    }
}

// --- EVENTOS ---
client.once('ready', () => {
    console.log(`[DISCORD] ¡AEGIS 🪄 online como ${client.user.tag}! 🟩`);
    deployCommands();
});

// Filtro Anti-Scam en vivo
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const contentLower = message.content.toLowerCase();
    const isScam = SCAM_KEYWORDS.some(keyword => contentLower.includes(keyword)) || (contentLower.includes('http') && contentLower.includes('nitro'));

    if (isScam) {
        try {
            await message.delete();
            const db = readDB();
            db.stats.totalScamsBlocked += 1;
            writeDB(db);
            
            const alertEmbed = new EmbedBuilder().setTitle('🛡️ Sistema Anti-Scam AEGIS 🪄').setDescription(`Se ha eliminado un enlace sospechoso enviado por ${message.author}.`).setColor('#ef4444').setTimestamp();
            await message.channel.send({ embeds: [alertEmbed] });

            const logEmbed = new EmbedBuilder().setTitle('🚨 Log: Enlace de Scam Detectado').setDescription(`**Usuario:** ${message.author} (${message.author.id})\n**Canal:** ${message.channel}\n**Contenido:** \`${message.content}\``).setColor('#ef4444').setTimestamp();
            await sendLog(message.guild, logEmbed);
        } catch (err) {
            console.error('Error Anti-Scam:', err.message);
        }
    }
});

// --- EJECUCIÓN DE COMANDOS SLASH ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guildId, member, guild } = interaction;

    // Control de Permisos
    if (commandName !== 'ping' && commandName !== 'help' && !member.permissions.has('ModerateMembers') && !member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ No tienes permisos para usar la moderación de AEGIS 🪄.', ephemeral: true });
    }

    if (commandName === 'ping') {
        return interaction.reply({ content: `📡 Latencia de respuesta de AEGIS 🪄: **${client.ws.ping}ms**`, ephemeral: true });
    }

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🪄 Panel de Ayuda — Sistema de Seguridad AEGIS')
            .setDescription('Hola, soy AEGIS. Estoy diseñado para proteger y moderar este servidor de forma automática 24/7.')
            .setColor('#6366f1')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🌐 Utilidad General', value: '`/help` - Muestra este panel.\n`/ping` - Revisa la latencia del bot.' },
                { name: '🛡️ Moderación Básica', value: '`/clear [1-100]` - Borra mensajes masivos.\n`/modlogs [@usuario]` - Revisa el expediente unificado de sanciones de un miembro.' },
                { name: '⚠️ Sistema de Sanciones', value: '`/warn [@usuario] [razón]` - Registra una advertencia.\n`/unwarn [@usuario]` - Elimina la última advertencia.\n`/kick [@usuario] [razón]` - Expulsa al miembro.\n`/ban [@usuario] [razón]` - Aplica un baneo definitivo.\n`/unban [ID-Usuario] [razón]` - Remueve el baneo usando su ID.' },
                { name: '⚙️ Configuración Avanzada', value: '`/logs establecer [#canal]` - Elige el canal para los registros en vivo.\n`/logs eliminar` - Desactiva el canal de registros.' },
                { name: '⚡ Protección Automatizada', value: '• **Filtro Anti-Scam:** Borra automáticamente enlaces maliciosos de "Free Nitro", genera alertas en el chat y envía el reporte detallado al canal de logs.' }
            )
            .setFooter({ text: 'AEGIS 🪄 — Seguridad y Moderación Eficiente', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed] });
    }

    if (commandName === 'logs') {
        const subcommand = interaction.options.getSubcommand();
        const db = readDB();

        if (subcommand === 'establecer') {
            const targetChannel = interaction.options.getChannel('canal');
            db.logsChannels[guildId] = targetChannel.id;
            writeDB(db);
            return interaction.reply({ content: `✅ Canal de logs establecido con éxito en: ${targetChannel}` });
        }

        if (subcommand === 'eliminar') {
            if (!db.logsChannels[guildId]) return interaction.reply({ content: '❌ No hay ningún canal de logs configurado actualmente.', ephemeral: true });
            delete db.logsChannels[guildId];
            writeDB(db);
            return interaction.reply({ content: '🗑️ El canal de logs ha sido desactivado correctamente.' });
        }
    }

    if (commandName === 'clear') {
        const cantidad = interaction.options.getInteger('cantidad');
        if (cantidad < 1 || cantidad > 100) return interaction.reply({ content: 'Elige un número entre 1 y 100.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(cantidad, true);
        
        const logEmbed = new EmbedBuilder().setTitle('🧹 Log: Mensajes Eliminados').setDescription(`**Moderador:** ${interaction.user}\n**Canal:** ${interaction.channel}\n**Cantidad solicitada:** ${cantidad}\n**Mensajes borrados reales:** ${deleted.size}`).setColor('#3b82f6').setTimestamp();
        await sendLog(guild, logEmbed);

        return interaction.editReply({ content: `🧹 Se limpiaron **${deleted.size}** mensajes.` });
    }

    if (commandName === 'warn') {
        const target = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon');
        
        addModLog(guildId, target.id, 'WARN', razon, interaction.user.tag);
        
        const db = readDB();
        db.stats.totalWarnsGiven += 1;
        writeDB(db);
        
        const warnEmbed = new EmbedBuilder().setTitle('⚠️ Usuario Advertido').setDescription(`**Miembro:** ${target}\n**Razón:** ${razon}\n**Moderador:** ${interaction.user}`).setColor('#f59e0b').setTimestamp();
        
        await sendLog(guild, warnEmbed);
        return interaction.reply({ embeds: [warnEmbed] });
    }

    if (commandName === 'unwarn') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        
        const logs = db.userLogs[guildId]?.[target.id] || [];
        const warnIndexes = logs.map((l, idx) => l.tipo === 'WARN' ? idx : null).filter(v => v !== null);

        if (warnIndexes.length === 0) {
            return interaction.reply({ content: `❌ ${target.username} no tiene advertencias activas para remover.`, ephemeral: true });
        }
        
        const lastWarnIdx = warnIndexes[warnIndexes.length - 1];
        const removida = logs.splice(lastWarnIdx, 1)[0];
        writeDB(db);

        const unwarnEmbed = new EmbedBuilder().setTitle('🛡️ Advertencia Removida').setDescription(`Se eliminó la última advertencia de ${target}.\n**Moderador:** ${interaction.user}\n**Razón original:** ${removida.razon}`).setColor('#10b981').setTimestamp();
        
        await sendLog(guild, unwarnEmbed);
        return interaction.reply({ embeds: [unwarnEmbed] });
    }

    if (commandName === 'kick') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'No especificada';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember || !targetMember.kickable) return interaction.reply({ content: 'No puedo expulsar a este miembro.', ephemeral: true });
        
        addModLog(guildId, targetUser.id, 'KICK', razon, interaction.user.tag);
        await targetMember.kick(razon);

        const logEmbed = new EmbedBuilder().setTitle('👢 Log: Usuario Expulsado').setDescription(`**Usuario:** ${targetUser.username} (${targetUser.id})\n**Moderador:** ${interaction.user}\n**Razón:** ${razon}`).setColor('#ef4444').setTimestamp();
        await sendLog(guild, logEmbed);

        return interaction.reply({ content: `👢 **${targetUser.username}** fue expulsado.` });
    }

    if (commandName === 'ban') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'No especificada';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember || !targetMember.bannable) return interaction.reply({ content: 'No puedo banear a este miembro.', ephemeral: true });
        
        addModLog(guildId, targetUser.id, 'BAN', razon, interaction.user.tag);
        await targetMember.ban({ reason: razon });

        const logEmbed = new EmbedBuilder().setTitle('🔨 Log: Usuario Baneado').setDescription(`**Usuario:** ${targetUser.username} (${targetUser.id})\n**Moderador:** ${interaction.user}\n**Razón:** ${razon}`).setColor('#b91c1c').setTimestamp();
        await sendLog(guild, logEmbed);

        return interaction.reply({ content: `🔨 **${targetUser.username}** fue baneado.` });
    }

    if (commandName === 'unban') {
        const userId = interaction.options.getString('userid');
        const razon = interaction.options.getString('razon') || 'No especificada';
        
        try {
            await guild.members.unban(userId, razon);
            addModLog(guildId, userId, 'UNBAN', razon, interaction.user.tag);
            
            const logEmbed = new EmbedBuilder().setTitle('🔓 Log: Usuario Desbaneado').setDescription(`**ID de Usuario:** \`${userId}\`\n**Moderador:** ${interaction.user}\n**Razón:** ${razon}`).setColor('#10b981').setTimestamp();
            await sendLog(guild, logEmbed);

            return interaction.reply({ content: `🔓 El usuario con ID \`${userId}\` ha sido desbaneado correctamente.` });
        } catch (err) {
            return interaction.reply({ content: '❌ No se pudo desbanear a ese usuario. Verifica la ID.', ephemeral: true });
        }
    }

    if (commandName === 'modlogs') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        const logs = db.userLogs[guildId]?.[target.id] || [];

        if (logs.length === 0) {
            return interaction.reply({ content: `✅ **${target.username}** tiene un expediente limpio. No hay registros de sanciones.`, ephemeral: true });
        }

        const warns = logs.filter(l => l.tipo === 'WARN').length;
        const kicks = logs.filter(l => l.tipo === 'KICK').length;
        const bans = logs.filter(l => l.tipo === 'BAN').length;

        const embed = new EmbedBuilder()
            .setTitle(`📋 Expediente de Moderación - ${target.username}`)
            .setDescription(`**Resumen de Historial:**\n⚠️ Warns: \`${warns}\` | 👢 Kicks: \`${kicks}\` | 🔨 Bans: \`${bans}\``)
            .setColor('#6366f1')
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        const recentLogs = logs.slice(-10).reverse();
        recentLogs.forEach((log) => {
            let emoji = '⚠️';
            if (log.tipo === 'KICK') emoji = '👢';
            if (log.tipo === 'BAN') emoji = '🔨';
            if (log.tipo === 'UNBAN') emoji = '🔓';

            embed.addFields({
                name: `${emoji} [${log.tipo}] — ${log.fecha}`,
                value: `**Razón:** ${log.razon}\n**Moderador:** ${log.por}`
            });
        });

        return interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.BOT_TOKEN).catch(err => console.error('[LOGIN ERROR]:', err.message));

