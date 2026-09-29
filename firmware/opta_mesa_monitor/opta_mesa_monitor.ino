// Arduino Opta WiFi: controle original da mesa + monitoramento SCOMPTEC.
#include "MesaControl.h"

void setup() { mesaSetup(); }

void loop() {
  mesaLoop();
  // Janela de 1 ms para o RTOS executar a rede com prioridade inferior.
  // Os tempos de classificacao/atuacao continuam definidos em MesaControl.cpp.
  delay(1);
}
