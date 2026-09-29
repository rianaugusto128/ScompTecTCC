# Administração funcional

A Central administrativa (`/admin`) salva usuários, ocorrências, limites de
alerta e histórico no banco configurado no backend. O perfil é confirmado em
`/api/auth/me` e cada operação administrativa exige uma conta ativa com perfil
`admin`, `ADMIN` ou `ADMIN_SCOMPTEC` no servidor.

## Primeiro acesso

1. Configure o banco no `.env` do backend conforme seu `.env.example`.
2. No frontend, use `VITE_USE_MOCKS=false` e a URL do backend com `/api`.
3. Configure a conta administrativa no `.env` do backend:

   ```dotenv
   ADMIN_NAME=Administrador
   ADMIN_EMAIL=admin@scomptec.com.br
   ADMIN_PASSWORD=sua-senha-privada
   ```

   O `.env` local já contém uma senha gerada. Consulte `ADMIN_PASSWORD` nesse
   arquivo. Use de 8 a 128 caracteres; essas variáveis pertencem somente ao
   backend. O `.env.example` mantém os campos de e-mail e senha vazios.

4. Reinicie o backend. A conta desse e-mail será criada ou atualizada com nome,
   senha, perfil administrativo e status ativo. Se o e-mail já estiver cadastrado,
   essa conta será convertida em administrador. Alterações no `.env` passam a
   valer após reiniciar. Mudar o e-mail cria ou atualiza outra conta; não remove
   a conta anterior. Deixar e-mail e senha vazios desliga a sincronização, sem
   excluir contas existentes.
5. Entre pelo login normal com `ADMIN_EMAIL` e `ADMIN_PASSWORD`. O sistema abre
   a Central administrativa. A prévia sem autenticação foi removida.

## Operações disponíveis

- **Visão operacional:** histórico de atividades com ação, responsável e data,
  busca e filtros, além de um resumo de pendências da equipe. Use Atualizar
  para consultar novas atividades de outros administradores.
- **Usuários:** criar conta com senha e perfil, ativar e desativar. A sessão de
  quem criou a conta permanece a mesma. Não é permitido desativar a própria
  conta ou alguém com ocorrências abertas atribuídas.
  O perfil também pode ser alterado na lista, escolhendo o novo valor e clicando
  em **Salvar perfil**. As permissões mudam na próxima requisição ao servidor.
  **Excluir** abre uma confirmação e remove a conta e seu acesso. Contas com
  ocorrências vinculadas não podem ser excluídas: reatribua as abertas ou
  desative a conta para manter atendimentos concluídos. O histórico administrativo
  permanece salvo. Não é permitido excluir a própria conta nem remover o próprio
  perfil administrativo. A conta configurada pelo `.env` é protegida contra
  alteração de perfil, desativação e exclusão pela interface.
- **Ocorrências:** registrar para uma CNC real, atribuir um usuário ativo,
  salvar atendimento e alterar andamento. Para resolver, é necessário ter
  responsável e atendimento registrado. Registros preservam o código e o ID
  da CNC mesmo se ela for removida posteriormente.
- **Limites:** salvar corrente, temperatura e faixa de tensão. São aplicados
  ao resumo de desvios na aba Limites de alerta. Os outros painéis mantêm seus critérios
  atuais de monitoramento.
- **Histórico:** cada alteração bem-sucedida registra ação, responsável e data
  no servidor, na mesma transação da mudança.
- **Relatório:** exportar ocorrências, limites e histórico carregados em JSON.

Manutenção, operador e visualizador identificam funções da equipe e acessam
os painéis existentes. A edição de usuários, ocorrências e limites fica
restrita aos administradores nesta versão. Cadastro público não concede
perfil administrativo.


## Verificação

```powershell
& '.venv/Scripts/python.exe' -m pytest -q
cd 'scomptec-cnc front 2'
npm run build
node --test src/pages/Admin/adminModel.test.js
```

Os testes administrativos usam banco isolado e verificam permissões, login
de contas criadas, desativação, duplicidade de e-mail, persistência, conclusão
de ocorrências, validação de limites e histórico das ações.
