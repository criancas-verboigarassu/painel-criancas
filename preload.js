// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  
  /**
   * Ouve dados da notificação.
   */
  onNotify: (callback) => {
    ipcRenderer.on('notify', (event, room, number, endTime) => {
      callback(room, number, endTime);
    });
  },

  /**
   * Pede para fechar a janela.
   */
  closeWindow: () => {
    ipcRenderer.send('close-notify-window');
  },

  /**
   * Pede o histórico de chamadas do dia.
   */
  getHistory: () => {
    return ipcRenderer.invoke('get-history');
  },

  /**
   * Registra um "ouvinte" para novas mensagens de chat.
   */
  onChatMessage: (callback) => {
    ipcRenderer.on('chat-message', (event, message) => {
      callback(message);
    });
  },

  /**
   * [NOVO] Registra um "ouvinte" para o comando de abrir o chat.
   */
  onShowChat: (callback) => {
    ipcRenderer.on('show-chat', () => {
      callback();
    });
  },

  /**
   * Envia um objeto de mensagem para o main.js salvar no Supabase.
   */
  sendChatMessage: (messageData) => {
    return ipcRenderer.invoke('send-chat-message', messageData);
  },

  /**
   * [FUNÇÃO QUE FALTAVA]
   * Pede ao main.js o histórico de chat recente.
   */
  getChatHistory: () => {
    return ipcRenderer.invoke('get-chat-history');
  }

});