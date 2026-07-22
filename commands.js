const { SlashCommandBuilder, ChannelType } = require('discord.js');

const commandsData = [
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
        .setName('autorole')
        .setDescription('Configura la asignación automática de roles')
        .addSubcommand(sub => 
            sub.setName('add').setDescription('Añade un rol automático')
               .addStringOption(opt => opt.setName('type').setDescription('Tipo de miembro').setRequired(true).addChoices({ name: 'Humano 👤', value: 'human' }, { name: 'Bot 🤖', value: 'bot' }))
               .addRoleOption(opt => opt.setName('role').setDescription('Rol a asignar').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('remove').setDescription('Elimina un rol automático')
               .addStringOption(opt => opt.setName('type').setDescription('Tipo de miembro').setRequired(true).addChoices({ name: 'Humano 👤', value: 'human' }, { name: 'Bot 🤖', value: 'bot' }))
        )
        .addSubcommand(sub => sub.setName('list').setDescription('Muestra los roles automáticos activos')),

    new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configuración del sistema de registros')
        .addSubcommand(sub => sub.setName('establecer').setDescription('Establece canal de logs').addChannelOption(opt => opt.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub => sub.setName('eliminar').setDescription('Desactiva canal de logs'))
].map(cmd => cmd.toJSON());

module.exports = { commandsData };

