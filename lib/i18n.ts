'use client'

import { useEffect, useState } from 'react'
import { usePrefs } from '@/hooks/use-prefs'

export type Language = 'en' | 'es'

const PREFS_KEY = 'cz-prefs'

export function getLanguagePreference(): Language {
  if (typeof window === 'undefined') return 'en'
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.language === 'es') return 'es'
      if (parsed.language === 'en') return 'en'
    }
  } catch {}
  return 'en'
}

export const translations = {
  en: {
    // Sidebar
    searchPlaceholder: 'Search (Cmd K)...',
    directMessages: 'Direct Messages',
    directMessage: 'Direct message',
    groupChats: 'Group Chats',
    userSettings: 'User Settings',
    loggingOut: 'Logging out...',
    
    // Header & Info
    channelInfo: 'Conversation Information',
    searchMessages: 'Search messages',
    search: 'Search...',
    clear: 'Clear',
    noOtherChats: 'No other chats available.',
    matches: 'matches',
    match: 'match',
    searchInstructions: 'Enter a keyword to search in this conversation.',
    noMatches: 'No matches found.',
    pinned: 'pinned',
    
    // Chat Main
    selectConversation: 'Select a conversation',
    selectInstruction: 'Choose a conversation from the sidebar or click + to find a user.',
    loadingMessages: 'Loading messages',
    noMessages: 'No messages yet',
    noMessagesInstruction: 'Send a message to start the conversation.',
    typing: 'is typing...',
    typingPlural: 'are typing...',
    typingAnd: 'and',
    typingOthers: 'others',
    olderMessagesAlert: 'You are viewing older messages',
    jumpToPresent: 'Jump to present',
    
    // Input / Footer
    typeMessage: 'Type a message...',
    typeReply: 'Type a reply...',
    saveChanges: 'Save changes...',
    replyingTo: 'Replying to',
    editingMessage: 'Editing previous message...',
    
    // Message Actions Menu
    addReaction: 'Add reaction',
    viewReactions: 'View reactions',
    editMessageAction: 'Edit message',
    replyAction: 'Reply',
    forwardAction: 'Forward',
    copyTextAction: 'Copy text',
    speakMessageAction: 'Speak message',
    pinMessageAction: 'Pin message',
    unpinMessageAction: 'Unpin message',
    deleteMessageAction: 'Delete message',
    
    // Forward Modal
    forwardTitle: 'Forward',
    forwardSub: 'Share this message with other conversations.',
    send: 'Send',
    sent: 'Sent',
    
    // Delete Modal
    deleteTitle: 'Delete Message',
    deleteWarning: 'Are you sure you want to delete this message? This cannot be undone.',
    deleteBtn: 'Delete',

    // Settings Modal Tabs
    profileTab: 'Profile',
    appearanceTab: 'Appearance',
    chatTab: 'Chat',
    notificationsTab: 'Notifications',
    privacyTab: 'Privacy',
    languageTab: 'Language & Region',
    accountTab: 'Account',
    
    // Settings General
    userSettingsTitle: 'User Settings',
    logoutBtn: 'Log Out',
    loading: 'Loading...',
    themeDesc: 'Choose how CatChat looks on your device.',
    
    // Notifications Section
    notifsTitle: 'Notifications Preferences',
    notifNewContacts: 'Notify when new contacts join',
    
    // Privacy Section
    privacyTitle: 'Privacy Settings',
    showOnline: 'Show Online Status',
    readReceiptsLabel: 'Send Read Receipts (blue ticks)',
    hideLastSeenLabel: 'Hide Last Seen timestamp',
    
    // Account Section
    accountTitle: 'Account Management',
    changePass: 'Change Password',
    currentPass: 'Current Password',
    newPass: 'New Password',
    deleteAccountTitle: 'Delete Account',
    deleteAccountDesc: 'Permanently remove your account and all messages. This cannot be undone.',
    deleteAccountBtn: 'Delete Account Permanently',

    // New Chat Modal
    newChatTitle: 'New Chat',
    newChatSearchPlaceholder: 'Search users by name or email...',
    newChatSearchLabel: 'Search users',
    newChatCloseLabel: 'Close',
    newChatNoQuery: 'Type to search users and start a conversation.',
    newChatNoResults: 'No users found for',
    newChatActionLabel: 'Chat',

    // Add Members Modal
    addMembersTitle: 'Add Members',
    addMembersSearchPlaceholder: 'Search users by name or email...',
    addMembersSearchLabel: 'Search users',
    addMembersCloseLabel: 'Close',
    addMembersNoQuery: 'Type to search users and add them to the chat.',
    addMembersNoResults: 'No users found for',
    addMembersActionLabel: 'Add',
    addMembersAddedLabel: 'Added',

    // Search Modal
    searchModalTitle: 'Search',
    searchModalPlaceholder: 'Search conversations, messages and users...',
    searchModalNoQuery: 'Type to search across all your conversations, messages and users.',
    searchModalNoResults: 'No results found for',
    searchModalUsersGroup: 'Users',
    searchModalConversationsGroup: 'Conversations',
    searchModalMessagesGroup: 'Messages',
    searchModalIn: 'in',
    searchModalOpenLabel: 'Open',
    searchModalCloseLabel: 'Close',

    // Info Panel
    infoPanelTitle: 'Details',
    loadingInfo: 'Loading information',
    conversationType: 'Conversation',
    detailsTitle: 'Details',
    infoSectionTitle: 'Information',
    createdLabel: 'Created',
    messagesLabel: 'Messages',
    participantsLabel: 'Participants',
    participantsCount: 'Participants',
    statusLabel: 'Status',
    activeStatus: 'Active',
    youSuffix: '(you)',

    // Sidebar
    conversationsLabel: 'Conversations',
    newChatLabel: 'New chat: search users',
    deleteConversationLabel: 'Delete',

    // User Dock
    settingsLabel: 'Settings',
    signOutLabel: 'Sign Out',

    // Icon Rail
    workspacesLabel: 'Workspaces',
    catChatWorkspaceLabel: 'CatChat workspace',

    // Chat Thread - additional
    newConversationTitle: 'New Conversation',
    startVoiceCall: 'Start Voice Call',
    startVideoCall: 'Start Video Call',
    pinnedMessages: 'Pinned Messages',
    searchConversation: 'Search',
    clearSearch: 'Clear',
    markMessage: 'Mark Message',
    markUnread: 'Mark Unread',
    copyMessageLink: 'Copy Message Link',
    noPinnedMessages: 'No pinned messages in this chat.',
    forwarded: 'Forwarded',
    go: 'Go',
    unpin: 'Unpin',
    proTipLabel: 'PRO-TIP:',
    proTipText: 'You can hold Shift when clicking delete message to bypass this confirmation modal entirely.',
    pinModalTitle: 'Pin It. Pin It Good.',
    pinConfirmBtn: 'Oh yeah. Pin it',
    unpinModalTitle: 'Unpin Message',
    unpinModalDesc: 'Are you sure you want to unpin this message?',
    unpinConfirmBtn: 'Remove it!',

    // Settings Modal
    settingsModalTitle: 'Settings',
    settingsModalCloseLabel: 'Close',
    profileSection: 'Profile',
    appearanceSection: 'Appearance',
    chatSection: 'Chat',
    notificationsSection: 'Notifications',
    privacySection: 'Privacy',
    languageSection: 'Language & Region',
    accountSection: 'Account',
    appLangTitle: 'Application Language',
    timezoneLabel: 'Timezone',
    detectedTimezone: 'Your detected timezone:',
    appearanceTitle: 'Appearance',
    themeLabel: 'Theme',
    lightThemes: 'Light Themes',
    darkThemes: 'Dark Themes',
    fontSizeLabel: 'Font Size',
    fontSizeDesc: 'Adjust the size of message text.',
    fontSizeSmall: 'Small',
    fontSizeMedium: 'Medium',
    fontSizeLarge: 'Large',
    densityLabel: 'Chat Density',
    densityDesc: 'Adjust space between messages.',
    densityCompact: 'Compact',
    densityNormal: 'Normal',
    densitySpacious: 'Spacious',
    timeFormatLabel: 'Time Format',
    timeFormat12h: '12 hours (AM/PM)',
    timeFormat24h: '24 hours',
    chatSettingsTitle: 'Chat Settings',
    enterToSend: 'Enter to send',
    enterToSendHint: 'Press Enter to send, Shift+Enter for new line',
    showTimestamps: 'Show timestamps',
    showTimestampsHint: 'Shows the time alongside each message',
    chatAppearance: 'Chat Appearance',
    profileTitle: 'My Profile',
    profileDesc: 'Update your personal information and avatar.',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    avatarUrl: 'Avatar URL',
    avatarUrlHint: 'Link to an image (optional)',
    bannerLabel: 'Banner',
    bannerHint: 'Click to select a banner image',
    changePhoto: 'Change photo',
    emailNotChangeable: 'Email cannot be changed',
    saveBtn: 'Save Changes',
    saved: 'Saved',
    cancelBtn: 'Cancel',
    generalNotifs: 'General',
    desktopNotifs: 'Desktop Notifications',
    desktopNotifsHint: 'Receive alerts for new messages',
    soundNotifs: 'Message Sounds',
    soundNotifsHint: 'Play a sound when receiving messages',
    newContactNotifs: 'New Contact Notifications',
    newContactNotifsHint: 'Notify me when someone new sends me a message',
    muteNotifs: 'Mute Notifications',
    muteNotifsHint: 'Temporarily silence all notifications.',
    mute1h: '1 hour',
    mute8h: '8 hours',
    mute24h: '24 hours',
    unmute: 'Unmute',
    mutedUntil: 'Muted until',
    visibility: 'Visibility',
    showOnlineStatus: 'Show Online Status',
    showOnlineStatusHint: 'Others can see when you are online',
    hideLastSeen: 'Hide Last Seen',
    hideLastSeenHint: "Don't show when you were last active",
    readReceipts: 'Read Receipts',
    readReceiptsHint: 'Let others see when you read their messages',
    messageControl: 'Message Control',
    whoCanMessage: 'Who can message me',
    everyone: 'Everyone',
    onlyContacts: 'Only contacts',
    accountManagement: 'Account Management',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    minPasswordHint: 'New password (min. 6 characters)',
    passwordUpdated: 'Password updated successfully',
    changePwdBtn: 'Change Password',
    exportData: 'Export My Data',
    exportDataDesc: 'Download all your conversations and messages in JSON format.',
    exportBtn: 'Download Data',
    exporting: 'Exporting...',
    signOut: 'Sign Out',
    signOutDesc: 'You will be signed out on this device.',
    signOutBtn: 'Sign Out',
    signingOut: 'Signing out...',
    deleteAccount: 'Delete Account',
    deleteAccountWarning: 'This action is irreversible. All your data, messages and conversations will be permanently deleted.',
    deleteConfirmPlaceholder: 'Type "DELETE" to confirm',
    deleteAccountActionBtn: 'Permanently Delete My Account',
    deleteConfirmError: 'Type DELETE to confirm',
    passwordRequiredError: 'Enter your current password',
    passwordLengthError: 'New password must be at least 6 characters',
    passwordsNoMatch: 'Passwords do not match',
    passwordChangeError: 'Error changing password',
    accountDeleteError: 'Error deleting account',
    saveError: 'Could not save',

    // Translator
    translatorTooltip: 'Auto-translate',
    translatorMenuTitle: 'Translate to',
    translatorOff: 'Off',
    translatorEnglish: 'English',
    translatorSpanish: 'Spanish',
    translatorActive: 'Translating to',
    translatorError: 'Translation failed. Sending original.',
    translatorSearch: 'Search languages...',
    translatorFavorites: 'Favorites',
    translatorAllLanguages: 'All languages',
    translating: 'Translating...',
  },
  es: {
    // Sidebar
    searchPlaceholder: 'Buscar (Cmd K)...',
    directMessages: 'Chats directos',
    directMessage: 'Mensaje directo',
    groupChats: 'Chats de grupo',
    userSettings: 'Ajustes de usuario',
    loggingOut: 'Cerrando sesión...',
    
    // Header & Info
    channelInfo: 'Información del chat',
    searchMessages: 'Buscar mensajes',
    search: 'Buscar...',
    clear: 'Limpiar',
    noOtherChats: 'No hay otros chats disponibles.',
    matches: 'coincidencias',
    match: 'coincidencia',
    searchInstructions: 'Introduce una palabra clave para buscar en esta conversación.',
    noMatches: 'No se encontraron coincidencias.',
    pinned: 'fijados',
    
    // Chat Main
    selectConversation: 'Selecciona una conversación',
    selectInstruction: 'Elige una conversación de la barra lateral o pulsa + para buscar un usuario.',
    loadingMessages: 'Cargando mensajes',
    noMessages: 'Sin mensajes aún',
    noMessagesInstruction: 'Envía un mensaje para comenzar la conversación.',
    typing: 'está escribiendo...',
    typingPlural: 'están escribiendo...',
    typingAnd: 'y',
    typingOthers: 'más',
    olderMessagesAlert: 'Estás viendo mensajes antiguos',
    jumpToPresent: 'Ir al actual',
    
    // Input / Footer
    typeMessage: 'Escribe un mensaje...',
    typeReply: 'Escribe una respuesta...',
    saveChanges: 'Guarda los cambios...',
    replyingTo: 'Respondiendo a',
    editingMessage: 'Editando mensaje anterior...',
    
    // Message Actions Menu
    addReaction: 'Añadir reacción',
    viewReactions: 'Ver reacciones',
    editMessageAction: 'Editar mensaje',
    replyAction: 'Responder',
    forwardAction: 'Reenviar',
    copyTextAction: 'Copiar texto',
    speakMessageAction: 'Escuchar mensaje',
    pinMessageAction: 'Fijar mensaje',
    unpinMessageAction: 'Desfijar mensaje',
    deleteMessageAction: 'Eliminar mensaje',
    
    // Forward Modal
    forwardTitle: 'Reenviar',
    forwardSub: 'Comparte este mensaje con otras conversaciones.',
    send: 'Enviar',
    sent: 'Enviado',
    
    // Delete Modal
    deleteTitle: 'Eliminar mensaje',
    deleteWarning: '¿Seguro que quieres eliminar este mensaje? Esto no se puede deshacer.',
    deleteBtn: 'Eliminar',

    // Settings Modal Tabs
    profileTab: 'Perfil',
    appearanceTab: 'Apariencia',
    chatTab: 'Chat',
    notificationsTab: 'Notificaciones',
    privacyTab: 'Privacidad',
    languageTab: 'Idioma y región',
    accountTab: 'Cuenta',
    
    // Settings General
    userSettingsTitle: 'Ajustes de usuario',
    logoutBtn: 'Cerrar sesión',
    loading: 'Cargando...',
    themeDesc: 'Elige cómo se ve CatChat en tu dispositivo.',
    
    // Notifications Section
    notifsTitle: 'Preferencias de Notificaciones',
    notifNewContacts: 'Notificar cuando se unan nuevos contactos',
    
    // Privacy Section
    privacyTitle: 'Ajustes de Privacidad',
    showOnline: 'Mostrar estado en línea',
    readReceiptsLabel: 'Enviar confirmaciones de lectura (ticks azules)',
    hideLastSeenLabel: 'Ocultar hora de última conexión',
    
    // Account Section
    accountTitle: 'Administración de la cuenta',
    changePass: 'Cambiar contraseña',
    currentPass: 'Contraseña actual',
    newPass: 'Nueva contraseña',
    deleteAccountTitle: 'Eliminar cuenta',
    deleteAccountDesc: 'Eliminar de forma permanente tu cuenta y todos tus mensajes. Esto no se puede deshacer.',
    deleteAccountBtn: 'Eliminar cuenta permanentemente',

    // New Chat Modal
    newChatTitle: 'Nuevo chat',
    newChatSearchPlaceholder: 'Buscar usuarios por nombre o email...',
    newChatSearchLabel: 'Buscar usuarios',
    newChatCloseLabel: 'Cerrar',
    newChatNoQuery: 'Escribe para buscar usuarios y empezar una conversación.',
    newChatNoResults: 'No se encontraron usuarios para',
    newChatActionLabel: 'Chatear',

    // Add Members Modal
    addMembersTitle: 'Añadir miembros',
    addMembersSearchPlaceholder: 'Buscar usuarios por nombre o email...',
    addMembersSearchLabel: 'Buscar usuarios',
    addMembersCloseLabel: 'Cerrar',
    addMembersNoQuery: 'Escribe para buscar usuarios y añadirlos al chat.',
    addMembersNoResults: 'No se encontraron usuarios para',
    addMembersActionLabel: 'Añadir',
    addMembersAddedLabel: 'Añadido',

    // Search Modal
    searchModalTitle: 'Buscar',
    searchModalPlaceholder: 'Buscar conversaciones, mensajes y usuarios...',
    searchModalNoQuery: 'Escribe para buscar en todas tus conversaciones, mensajes y usuarios.',
    searchModalNoResults: 'No se encontraron resultados para',
    searchModalUsersGroup: 'Usuarios',
    searchModalConversationsGroup: 'Conversaciones',
    searchModalMessagesGroup: 'Mensajes',
    searchModalIn: 'en',
    searchModalOpenLabel: 'Abrir',
    searchModalCloseLabel: 'Cerrar',

    // Info Panel
    infoPanelTitle: 'Detalles',
    loadingInfo: 'Cargando información',
    conversationType: 'Conversación',
    detailsTitle: 'Detalles',
    infoSectionTitle: 'Información',
    createdLabel: 'Creado',
    messagesLabel: 'Mensajes',
    participantsLabel: 'Participantes',
    participantsCount: 'Participantes',
    statusLabel: 'Estado',
    activeStatus: 'Activa',
    youSuffix: '(tú)',

    // Sidebar
    conversationsLabel: 'Conversaciones',
    newChatLabel: 'Nuevo chat: buscar usuarios',
    deleteConversationLabel: 'Eliminar',

    // User Dock
    settingsLabel: 'Configuración',
    signOutLabel: 'Cerrar sesión',

    // Icon Rail
    workspacesLabel: 'Workspaces',
    catChatWorkspaceLabel: 'Espacio de CatChat',

    // Chat Thread - additional
    newConversationTitle: 'Nueva conversación',
    startVoiceCall: 'Iniciar llamada de voz',
    startVideoCall: 'Iniciar videollamada',
    pinnedMessages: 'Mensajes fijados',
    searchConversation: 'Buscar',
    clearSearch: 'Limpiar',
    markMessage: 'Marcar mensaje',
    markUnread: 'Marcar no leídos',
    copyMessageLink: 'Copiar enlace del mensaje',
    noPinnedMessages: 'No hay mensajes fijados en este chat.',
    forwarded: 'Reenviado',
    go: 'Ir',
    unpin: 'Desfijar',
    proTipLabel: 'CONSEJO:',
    proTipText: 'Puedes mantener pulsado Mayús cuando hagas clic en eliminar mensaje para ignorar esta confirmación por completo.',
    pinModalTitle: 'Fíjalo. Fíjalo bien.',
    pinConfirmBtn: 'Oh, sí. Fíjalo',
    unpinModalTitle: 'Retirar mensaje',
    unpinModalDesc: '¿Seguro que quieres eliminar este mensaje fijado?',
    unpinConfirmBtn: '¡Elimínalo!',

    // Settings Modal
    settingsModalTitle: 'Configuración',
    settingsModalCloseLabel: 'Cerrar',
    profileSection: 'Perfil',
    appearanceSection: 'Apariencia',
    chatSection: 'Chat',
    notificationsSection: 'Notificaciones',
    privacySection: 'Privacidad',
    languageSection: 'Idioma y región',
    accountSection: 'Cuenta',
    appLangTitle: 'Idioma de la aplicación',
    timezoneLabel: 'Zona horaria',
    detectedTimezone: 'Tu zona horaria detectada:',
    appearanceTitle: 'Apariencia',
    themeLabel: 'Tema',
    lightThemes: 'Temas claros',
    darkThemes: 'Temas oscuros',
    fontSizeLabel: 'Tamaño de fuente',
    fontSizeDesc: 'Ajusta el tamaño del texto del mensaje.',
    fontSizeSmall: 'Pequeño',
    fontSizeMedium: 'Mediano',
    fontSizeLarge: 'Grande',
    densityLabel: 'Densidad del chat',
    densityDesc: 'Ajusta el espacio entre los mensajes.',
    densityCompact: 'Compacto',
    densityNormal: 'Normal',
    densitySpacious: 'Espacioso',
    timeFormatLabel: 'Formato de hora',
    timeFormat12h: '12 horas (AM/PM)',
    timeFormat24h: '24 horas',
    chatSettingsTitle: 'Ajustes del chat',
    enterToSend: 'Enviar con Enter',
    enterToSendHint: 'Pulsa Enter para enviar, Shift+Enter para nueva línea',
    showTimestamps: 'Mostrar marcas de tiempo',
    showTimestampsHint: 'Muestra la hora junto a cada mensaje',
    chatAppearance: 'Apariencia del chat',
    profileTitle: 'Mi Perfil',
    profileDesc: 'Actualiza tus datos personales y tu avatar.',
    fullName: 'Nombre completo',
    emailAddress: 'Correo electrónico',
    avatarUrl: 'URL de avatar',
    avatarUrlHint: 'Enlace a una imagen (opcional)',
    bannerLabel: 'Portada',
    bannerHint: 'Haz clic para seleccionar una imagen de portada',
    changePhoto: 'Cambiar foto',
    emailNotChangeable: 'El correo no se puede cambiar',
    saveBtn: 'Guardar cambios',
    saved: 'Guardado',
    cancelBtn: 'Cancelar',
    generalNotifs: 'General',
    desktopNotifs: 'Notificaciones de escritorio',
    desktopNotifsHint: 'Recibe avisos de mensajes nuevos',
    soundNotifs: 'Sonidos de mensaje',
    soundNotifsHint: 'Reproduce un sonido al recibir mensajes',
    newContactNotifs: 'Notificaciones de nuevos contactos',
    newContactNotifsHint: 'Avísame cuando alguien nuevo me envíe un mensaje',
    muteNotifs: 'Silenciar notificaciones',
    muteNotifsHint: 'Silencia todas las notificaciones temporalmente.',
    mute1h: '1 hora',
    mute8h: '8 horas',
    mute24h: '24 horas',
    unmute: 'Desactivar silencio',
    mutedUntil: 'Silenciado hasta',
    visibility: 'Visibilidad',
    showOnlineStatus: 'Mostrar estado en línea',
    showOnlineStatusHint: 'Otros pueden ver cuando estás conectado',
    hideLastSeen: 'Ocultar última conexión',
    hideLastSeenHint: 'No mostrar cuándo fue tu última actividad',
    readReceipts: 'Confirmaciones de lectura',
    readReceiptsHint: 'Permite que otros vean cuando lees sus mensajes',
    messageControl: 'Control de mensajes',
    whoCanMessage: 'Quién puede enviarme mensajes',
    everyone: 'Todos',
    onlyContacts: 'Solo contactos',
    accountManagement: 'Administración de la cuenta',
    changePassword: 'Cambiar contraseña',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    confirmNewPassword: 'Confirmar nueva contraseña',
    minPasswordHint: 'Nueva contraseña (mín. 6 caracteres)',
    passwordUpdated: 'Contraseña actualizada correctamente',
    changePwdBtn: 'Cambiar contraseña',
    exportData: 'Exportar mis datos',
    exportDataDesc: 'Descarga todas tus conversaciones y mensajes en formato JSON.',
    exportBtn: 'Descargar datos',
    exporting: 'Exportando...',
    signOut: 'Cerrar sesión',
    signOutDesc: 'Se cerrará tu sesión en este dispositivo.',
    signOutBtn: 'Cerrar sesión',
    signingOut: 'Cerrando sesión...',
    deleteAccount: 'Eliminar cuenta',
    deleteAccountWarning: 'Esta acción es irreversible. Se eliminarán todos tus datos, mensajes y conversaciones.',
    deleteConfirmPlaceholder: 'Escribe "ELIMINAR" para confirmar',
    deleteAccountActionBtn: 'Eliminar mi cuenta permanentemente',
    deleteConfirmError: 'Escribe ELIMINAR para confirmar',
    passwordRequiredError: 'Introduce tu contraseña actual',
    passwordLengthError: 'La nueva contraseña debe tener al menos 6 caracteres',
    passwordsNoMatch: 'Las contraseñas no coinciden',
    passwordChangeError: 'Error al cambiar la contraseña',
    accountDeleteError: 'Error al eliminar la cuenta',
    saveError: 'No se pudo guardar',

    // Translator
    translatorTooltip: 'Auto-traducir',
    translatorMenuTitle: 'Traducir a',
    translatorOff: 'Desactivado',
    translatorEnglish: 'Inglés',
    translatorSpanish: 'Español',
    translatorActive: 'Traduciendo a',
    translatorError: 'Fallo en traducción. Enviando original.',
    translatorSearch: 'Buscar idiomas...',
    translatorFavorites: 'Favoritos',
    translatorAllLanguages: 'Todos los idiomas',
    translating: 'Traduciendo...',
  },
}

export function useLanguage() {
  const [prefs] = usePrefs()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const lang: Language = !hydrated ? 'en' : (prefs.language === 'es' ? 'es' : 'en')
  const t = translations[lang]

  return { lang, t }
}
