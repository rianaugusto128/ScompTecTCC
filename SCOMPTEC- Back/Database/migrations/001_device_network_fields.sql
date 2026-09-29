-- Atualizacao de uma tabela devices legada sem campos de rede.
-- Aplicar apenas quando mac_address e ip_address ainda nao existirem.
-- Preserva os dispositivos existentes; preencher seus MACs reais posteriormente.
-- MAC nullable permite preservar registros legados sem inventar identificadores.
-- A API exige MAC para novos cadastros. UNIQUE impede repetir MAC conhecido.
ALTER TABLE devices
    ADD COLUMN mac_address VARCHAR(17) NULL,
    ADD COLUMN ip_address VARCHAR(45) NULL,
    ADD UNIQUE INDEX ix_devices_mac_address (mac_address);
