const { SlashCommandBuilder } = require('discord.js');

const commandsData = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Muestra la latencia actual del bot AEGIS 🪄'),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra el panel de ayuda principal de AEGIS 🪄'),

    new SlashCommandBuilder()
        .setName('estado')
        .setDescription('Cambia o publica el estado operativo del bot AEGIS 🪄')
        .addStringOption(option =>
            option.setName('opcion')
                .setDescription('Selecciona el nuevo estado')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Activo / Operativo', value: 'activo' },
                    { name: '🟡 En Mantenimiento', value: 'mantenimiento' },
                    { name: '🔴 Apagado / Fuera de Servicio', value: 'apagado' }
                )
        ),

    new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Configura roles automáticos para nuevos usuarios')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Asigna un rol automático')
                .addStringOption(opt => opt.setName('type').setDescription('Tipo de miembro').setRequired(true).addChoices({ name: 'Humanos 👤', value: 'human' }, { name: 'Bots 🤖', value: 'bot' }))
                .addRoleOption(opt => opt.setName('role').setDescription('Rol a asignar').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remueve el rol automático')
                .addStringOption(opt => opt.setName('type').setDescription('Tipo de miembro').setRequired(true).addChoices({ name: 'Humanos 👤', value: 'human' }, { name: 'Bots 🤖', value: 'bot' }))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Lista los roles automáticos configurados')
        ),

    new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configura el canal de registros de seguridad')
        .addSubcommand(sub =>
            sub.setName('establecer')
                .setDescription('Define el canal de logs')
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal de texto').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('eliminar')
                .setDescription('Desactiva el canal de logs')
        ),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpia mensajes de un canal')
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de mensajes (1-100)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte a un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la advertencia').setRequired(true)),

    new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remueve la última advertencia de un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón')),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón')),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Desbanea a un usuario por ID')
        .addStringOption(opt => opt.setName('userid').setDescription('ID del usuario').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón')),

    new SlashCommandBuilder()
        .setName('modlogs')
        .setDescription('Consulta el expediente de moderación de un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))

].map(command => command.toJSON());

module.exports = { commandsData };
