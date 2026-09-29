// Camada de conexão em tempo real (WebSocket / STOMP sobre SockJS no futuro).
// A implementação real deve conectar em algo como ws://<host>/ws/machines
// e emitir eventos de atualização de estado para os hooks (ex.: useMachines).
// Por enquanto expõe uma interface compatível, sem conexão real ativa.

class MachineSocketService {
  constructor() {
    this.listeners = new Set();
    this.connected = false;
  }

  connect() {
    // Futuro: this.socket = new WebSocket(`${WS_BASE_URL}/machines`);
    // this.socket.onmessage = (event) => this._emit(JSON.parse(event.data));
    this.connected = true;
    return () => this.disconnect();
  }

  disconnect() {
    this.connected = false;
  }

  onMachineUpdate(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _emit(payload) {
    this.listeners.forEach((cb) => cb(payload));
  }
}

export const machineSocket = new MachineSocketService();
export default machineSocket;
