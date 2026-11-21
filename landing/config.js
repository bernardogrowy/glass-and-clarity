/* =====================================================================
   CONFIGURAÇÃO DA LANDING · ajuste antes de publicar
   Usada pelas duas páginas: index.html (lista de acesso antecipado) e
   promocao/index.html (promoção "3 amigos, 1 semestre grátis").
   ===================================================================== */
window.HI_CONFIG = {
  /* URL que recebe as inscrições. Enquanto for null, os formulários rodam em modo demonstração:
     validam, mostram o sucesso e o link de indicação, mas não enviam nada.

     BACKEND DO MVP: backend/apps-script/ (Google Apps Script + planilha). O README de lá
     ensina a publicar; a URL final termina em /exec e é o que vai aqui.

     CONTRATO (vale para qualquer servidor que você usar no lugar):
       Recebe POST. O corpo é JSON, mas vai com Content-Type "text/plain" (evita preflight de CORS):
         { email, name, level, ref, source, createdAt }
           ref    = código de quem indicou (vem do ?ref= do link), ou null
           source = "landing-acesso-antecipado" ou "landing-promocao"
       Responde JSON:
         { "ok": true,  "referralCode": "ANA-K7M2" }   → vira o link de indicação da pessoa
         { "ok": false, "error": "..." }               → a página mostra "não conseguimos enviar"
       O servidor deve: gravar o lead com um referralCode único, ligar ao dono do código quando
       vier "ref", contar as indicações e avisar o time uma única vez ao chegar a 3. */
  endpoint: null,

  /* Número real de pessoas na lista. null esconde o contador. Nunca use estimativa. */
  waitlistCount: null,

  /* Endereço público da landing (raiz, onde está o index.html), usado no link de indicação.
     Ex.: "https://seudominio.com.br/". null usa o endereço da página atual. */
  siteUrl: null,

  /* Documentos. Enquanto forem null, o clique avisa que estão em preparação. */
  links: { regulamento: null, privacidade: null },

  /* Escola parceira confirmada, ex.: { name: "Nome da escola" }. null esconde a linha. */
  partner: null,
};
