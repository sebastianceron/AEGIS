require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Inicializar Bot AEGIS 🪄 con sus Intents
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
        fs.writeFileSync(DB_PATH, JSON.stringify({ warns: {}, stats: { totalScamsBlocked: 0, totalWarnsGiven: 0 } }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Filtro Anti-Scam Automático
const SCAM_KEYWORDS = ['discord-nitro', 'free-nitro', 'nitro-gift', 'dlscord', 'steeam', 'giveaway-nitro'];

// --- REGISTRO DE COMANDOS DE BARRA ---
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Muestra la latencia del sistema AEGIS 🪄'),
    new SlashCommandBuilder().setName('clear').setDescription('Borra mensajes (1-100)').addIntegerOption(opt => opt.setName('cantidad').setDescription('Mensajes a borrar').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('Amonesta a un usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a amonestar').setRequired(true)).addStringOption(opt => opt.setName('razon').setDescription('Razón').setRequired(true)),
    new SlashCommandBuilder().setName('warns').setDescription('Ver las amonestaciones de un usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Expulsa a un miembro').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true)).addStringOption(opt => opt.setName('razon').setDescription('Razón')),
    new SlashCommandBuilder().setName('ban').setDescription('Banea a un miembro').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true)).addStringOption(opt => opt.setName('razon').setDescription('Razón'))
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

// Filtro Anti-Scam
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
        } catch (err) {
            console.error('Error Anti-Scam:', err.message);
        }
    }
});

// Ejecución de Comandos Slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guildId, member } = interaction;

    if (commandName !== 'ping' && !member.permissions.has('ModerateMembers') && !member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ No tienes permisos para usar AEGIS 🪄.', ephemeral: true });
    }

    if (commandName === 'ping') {
        return interaction.reply({ content: `📡 Latencia de respuesta de AEGIS 🪄: **${client.ws.ping}ms**`, ephemeral: true });
    }

    if (commandName === 'clear') {
        const cantidad = interaction.options.getInteger('cantidad');
        if (cantidad < 1 || cantidad > 100) return interaction.reply({ content: 'Elige un número entre 1 y 100.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(cantidad, true);
        return interaction.editReply({ content: `🧹 Se limpiaron **${deleted.size}** mensajes.` });
    }

    if (commandName === 'warn') {
        const target = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon');
        const db = readDB();
        if (!db.warns[guildId]) db.warns[guildId] = {};
        if (!db.warns[guildId][target.id]) db.warns[guildId][target.id] = [];
        db.warns[guildId][target.id].push({ razon, fecha: new Date().toLocaleDateString(), por: interaction.user.tag });
        db.stats.totalWarnsGiven += 1;
        writeDB(db);
        const warnEmbed = new EmbedBuilder().setTitle('⚠️ Usuario Advertido').setDescription(`**Miembro:** ${target}\n**Razón:** ${razon}\n**Moderador:** ${interaction.user}`).setColor('#f59e0b').setTimestamp();
        return interaction.reply({ embeds: [warnEmbed] });
    }

    if (commandName === 'warns') {
        const target = interaction.options.getUser('usuario');
        const db = readDB();
        const userWarns = db.warns[guildId]?.[target.id] || [];
        if (userWarns.length === 0) return interaction.reply({ content: `✅ ${target.username} no tiene advertencias.`, ephemeral: true });
        const embed = new EmbedBuilder().setTitle(`Historial - ${target.username}`).setColor('#3b82f6');
        userWarns.forEach((w, i) => { embed.addFields({ name: `Advertencia #${i + 1} (${w.fecha})`, value: `**Razón:** ${w.razon}\n**Por:** ${w.por}` }); });
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'kick') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'No especificada';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember || !targetMember.kickable) return interaction.reply({ content: 'No puedo expulsar a este miembro.', ephemeral: true });
        await targetMember.kick(razon);
        return interaction.reply({ content: `👢 **${targetUser.username}** fue expulsado.` });
    }

    if (commandName === 'ban') {
        const targetUser = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'No especificada';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember || !targetMember.bannable) return interaction.reply({ content: 'No puedo banear a este miembro.', ephemeral: true });
        await targetMember.ban({ reason: razon });
        return interaction.reply({ content: `🔨 **${targetUser.username}** fue baneado.` });
    }
});

client.login(process.env.BOT_TOKEN).catch(err => console.error('[LOGIN ERROR]:', err.message));

