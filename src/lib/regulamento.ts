// Texto do Regulamento de Uso do Connect Hub Pro.
//
// IMPORTANTE: sempre que o texto mudar de verdade, troque REGULAMENTO_VERSION.
// O aceite é gravado por versão (tabela terms_acceptances): versão nova =
// todo usuário precisa aceitar de novo na próxima vez que entrar.

export const REGULAMENTO_VERSION = "2026-10-23";
export const REGULAMENTO_VERSION_LABEL = "23/10/2026";

export interface RegulamentoSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export const REGULAMENTO: RegulamentoSection[] = [
  {
    title: "1. Objetivo e aceite",
    paragraphs: [
      "Este regulamento existe para proteger o seu número de WhatsApp contra bloqueio. Ele vale para todo usuário do Connect Hub Pro, seja conta individual, empresa ou atendente, e usar o sistema significa que você leu e concorda com as regras abaixo.",
      "O Connect Hub Pro conecta o seu número ao WhatsApp de forma não oficial, simulando o WhatsApp Web. O WhatsApp pode bloquear números a qualquer momento, e o que mais pesa nessa decisão é o comportamento do número, não o sistema. Seguir estas regras reduz muito o risco, mas não o elimina.",
    ],
  },
  {
    title: "2. Para que o sistema serve",
    paragraphs: [
      "O Connect Hub Pro é uma ferramenta de atendimento: reunir os seus números em um só lugar para receber e responder conversas. Ele não é uma ferramenta de disparo em massa, e não existe nele nenhuma função para isso.",
      "O uso certo é conversar com pessoas que já são seus clientes ou que entraram em contato com você primeiro, no ritmo de uma pessoa digitando.",
    ],
  },
  {
    title: "3. O que é proibido",
    paragraphs: ["Estas condutas são vedadas em qualquer número conectado ao sistema:"],
    items: [
      'Enviar mensagens em massa, mesmo que seja "só uma vez".',
      "Escrever para pessoas que não conhecem você ou nunca falaram com você.",
      "Usar listas de contatos compradas, copiadas de grupos ou de outros sistemas.",
      "Enviar a mesma mensagem, igual ou quase igual, para várias pessoas em sequência.",
      "Enviar links suspeitos, conteúdo enganoso, golpes, ofertas ilegais ou qualquer material proibido por lei.",
      "Continuar escrevendo para quem pediu para parar ou bloqueou o seu número.",
      "Conectar o mesmo número em outro sistema ou aplicativo de automação ao mesmo tempo.",
    ],
  },
  {
    title: "4. Número novo ou chip recém-ativado",
    paragraphs: [
      "Número novo é o mais vigiado pelo WhatsApp. Nos primeiros dias, use-o como uma pessoa comum usaria:",
    ],
    items: [
      "Nos 7 primeiros dias, converse com poucas pessoas por dia, apenas com quem já te conhece, e responda mais do que envia.",
      "Antes de conectar ao sistema, use o número normalmente no celular por alguns dias: foto de perfil, nome e algumas conversas reais.",
      "Aumente o volume aos poucos, dia após dia, e nunca de uma vez.",
      "Se o número já é antigo e tem histórico normal de uso, mantenha o mesmo ritmo que você já tinha.",
    ],
  },
  {
    title: "5. Boas práticas nas mensagens",
    items: [
      "Responda a quem escreveu primeiro. Conversa iniciada pelo cliente é o uso mais seguro.",
      "Escreva do jeito que uma pessoa escreveria: mensagens diferentes para pessoas diferentes, com o nome do cliente e o assunto dele.",
      "Não envie várias mensagens seguidas em poucos segundos. Espere a resposta.",
      "Evite enviar links logo na primeira mensagem para quem não conversou com você antes.",
      "Se o cliente pedir para não receber mais mensagens, pare imediatamente e não escreva de novo.",
      "Mantenha um atendimento útil: número que recebe respostas e poucas denúncias é visto como confiável.",
    ],
  },
  {
    title: "6. Conectar e reconectar o número",
    paragraphs: [
      "Conectar o mesmo número muitas vezes seguidas chama a atenção do WhatsApp e também pesa contra o número.",
    ],
    items: [
      "Gere o QR Code apenas quando precisar e leia com calma, em uma tentativa de cada vez.",
      "Se a conexão falhar, não fique tentando sem parar. Espere pelo menos 30 minutos antes de tentar de novo.",
      "Se falhar mais de 3 vezes no mesmo dia, pare e chame o suporte antes de insistir.",
      "Mantenha o celular do número ligado, com internet e com o WhatsApp atualizado. Não desinstale o WhatsApp do celular.",
      "Nunca use o mesmo número em dois sistemas de automação ao mesmo tempo.",
    ],
  },
  {
    title: "7. Denúncias, bloqueios e sinais de alerta",
    paragraphs: [
      "Denúncia e bloqueio feitos por quem recebe a mensagem são o principal motivo de banimento. Por isso:",
    ],
    items: [
      "Mande mensagem só para quem espera receber.",
      "Se alguém reclamar, pare de escrever para essa pessoa na hora.",
      "Se perceber sinais como mensagens que não chegam, queda de respostas, desconexões frequentes ou aviso do WhatsApp no celular, pare de enviar mensagens por alguns dias, deixe o número em uso normal e avise o suporte.",
      "Se o número for bloqueado, não tente recuperá-lo com outro chip dentro do mesmo sistema logo em seguida: isso tende a repetir o problema.",
    ],
  },
  {
    title: "8. Risco e responsabilidade",
    paragraphs: [
      "O uso do Connect Hub Pro é por conta e risco do usuário. Mesmo seguindo todas as regras, o WhatsApp pode bloquear um número, e o Connect Hub Pro não tem como impedir nem reverter isso.",
    ],
    items: [
      "O usuário é responsável pelas mensagens que envia e pelos contatos que escolhe.",
      "Recomenda-se não conectar números insubstituíveis para o negócio sem ter outro canal de contato com os clientes.",
      "O descumprimento deste regulamento pode levar à suspensão do acesso ao sistema, sem direito a reembolso, e a plataforma não responde por números bloqueados por conduta contrária às regras.",
      "Este regulamento pode ser atualizado, e a versão vigente é sempre a mais recente.",
    ],
  },
  {
    title: "9. Aceite e contato",
    paragraphs: [
      'Ao marcar "Li e concordo" ou ao continuar usando o Connect Hub Pro, você declara que leu este regulamento, entendeu os riscos do uso não oficial do WhatsApp e se compromete a segui-lo.',
      "Dúvidas, sinais de alerta no número ou pedidos de ajuda: fale com quem te vendeu o Connect Hub Pro.",
    ],
  },
];
