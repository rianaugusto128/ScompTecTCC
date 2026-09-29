const STATES = {
  aguardando_peca: "Aguardando peça",
  coletando_altura: "Coletando altura",
  aguardando_metal: "Aguardando identificação de metal",
  acionando_queda1: "Acionando queda 1",
  acionando_queda2: "Acionando queda 2",
  aguardando_reto: "Peça seguindo reto",
  falha: "Falha na classificação",
};
const INPUTS = [
  ["I1", "Entrada — diagnóstico", null],
  ["I2", "Altura média", false],
  ["I3", "Altura pequena", false],
  ["I4", "Altura grande", false],
  ["I5", "Metal", true],
  ["I6", "Ocupação da queda 1", true],
  ["I7", "Ocupação da queda 2", true],
];
const showBoolean = (value, yes, no) => typeof value === "boolean" ? value ? yes : no : "Não informado";

export default function MesaSignals({ machine }) {
  const mesa = machine.mesa;
  if (!mesa || typeof mesa !== "object") return null;
  const stale = machine.communicationStatus !== "ONLINE" || ["SEM_COMUNICACAO", "DADOS_DESATUALIZADOS"].includes(machine.status);
  return <section className="panel space-y-4 p-5">
    <div>
      <h2 className="text-lg font-bold">Mesa seletora — Arduino Opta</h2>
      <p className="text-sm text-text-muted">{STATES[mesa.estado] || mesa.estado || "Estado não informado"}</p>
      {stale && <p className="text-sm text-amber-400">Última leitura conhecida; aguarde uma nova atualização para confirmar os sinais.</p>}
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {[["total", "Peças iniciadas"], ["reto", "Reto concluído"], ["queda1", "Queda 1 concluída"], ["queda2", "Queda 2 concluída"], ["falhas", "Falhas"]].map(([key, label]) =>
        <div key={key} className="rounded-lg border border-base-border p-3">
          <p className="text-xs text-text-muted">{label}</p>
          <p className="text-2xl font-bold">{mesa.contadores?.[key] ?? "—"}</p>
        </div>
      )}
    </div>
    <p className="text-xs text-text-muted">Contadores desde a inicialização do Opta. Conclusões seguem os temporizadores do programa; não representam confirmação por fim de curso.</p>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <h3 className="font-semibold">Entradas</h3>
        {INPUTS.map(([pin, label, activeLevel]) => {
          const value = mesa.entradas_brutas?.[pin];
          const known = typeof value === "boolean";
          return <div key={pin} className="flex justify-between gap-3 border-b border-base-border py-1 text-sm">
            <span>{pin} · {label}</span>
            <span className="font-mono text-text-muted">{known ? `${value ? "HIGH" : "LOW"}${activeLevel === null ? "" : value === activeLevel ? " · detectado" : " · livre"}` : "—"}</span>
          </div>;
        })}
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Comandos das saídas</h3>
        {[["O1", "Esteira"], ["O2", "Desviador da queda 1"], ["O3", "Desviador da queda 2"]].map(([pin, label]) =>
          <div key={pin} className="flex justify-between gap-3 border-b border-base-border py-1 text-sm">
            <span>{pin} · {label}</span><span>{showBoolean(mesa.saidas_comandadas?.[pin], "Ligado", "Desligado")}</span>
          </div>
        )}
        <p className="text-xs text-text-muted">São comandos do programa, sem sensor de confirmação do movimento.</p>
        <p className="text-sm">Altura memorizada: <strong>{mesa.altura || "—"}</strong></p>
        <p className="text-sm">Metal memorizado: {showBoolean(mesa.metal_memorizado, "Sim", "Não")}</p>
        <p className="text-sm">Rampa 1: {showBoolean(mesa.rampa1_cheia, "Ocupação prolongada", "Sem indicação de rampa cheia")}</p>
        <p className="text-sm">Rampa 2: {showBoolean(mesa.rampa2_cheia, "Ocupação prolongada", "Sem indicação de rampa cheia")}</p>
        <p className="text-xs text-text-muted">A indicação de rampa cheia usa 1,7 s de ocupação contínua; não conta peças na rampa. I8 não está implementada. Presença de 24 V e emergência não são medidas neste mapeamento.</p>
      </div>
    </div>
  </section>;
}
