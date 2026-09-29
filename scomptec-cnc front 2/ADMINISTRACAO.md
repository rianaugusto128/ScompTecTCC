# Central administrativa (somente frontend)

Inicie o frontend com `npm run dev`. Na tela de login, use **Abrir prévia
administrativa** ou visite `/admin-demonstracao`. Essa rota e seu link só
existem em desenvolvimento; não há senha nem conta administrativa embutida.

A prévia contém quatro CNCs fictícias, com operação normal, alarme,
emergência e perda de comunicação. Permite:

- cadastrar e desativar usuários demonstrativos, com perfis;
- consultar sinais analógicos e digitais, buscar CNCs e filtrar problemas;
- registrar ocorrências, escolher prioridade, atribuir responsável,
  anotar atendimento e resolver ou reabrir o registro;
- ajustar limites de corrente, temperatura e tensão;
- consultar o histórico administrativo e exportar relatório JSON.

Todos os novos cadastros e ajustes ficam na memória da página. Sair da rota
ou recarregar descarta as alterações. Cadastros não geram login, convites ou
senhas. Ações de manutenção não enviam comandos ao equipamento. O relatório
exportado é demonstrativo e não constitui auditoria confiável.

`/admin` verifica se a sessão existente tem um dos perfis `admin`, `ADMIN`
ou `ADMIN_SCOMPTEC`. Essa verificação só controla a apresentação da interface:
o armazenamento e o JavaScript do navegador podem ser alterados pelo usuário.
Nenhuma conta real foi criada e não existe segurança administrativa real sem
backend. A interface não transforma usuários comuns em administradores.

Para a futura integração, o servidor deverá criar o administrador, armazenar
o hash da senha, autenticar a sessão e autorizar cada consulta ou alteração
administrativa. O perfil deverá vir de uma sessão validada pelo servidor.
Não coloque credenciais em HTML, JS ou variáveis VITE_ do .env.

Arquivos principais: `src/pages/Admin/`, `src/services/adminSession.js`,
rotas em `src/App.jsx` e links em Login/Sidebar. O backend não foi alterado
para implementar esta página.
