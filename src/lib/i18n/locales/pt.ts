/**
 * Dicionário português.
 *
 * Tipado a partir do francês de referência (`Dictionary = typeof fr`): uma
 * chave em falta é um erro de compilação, não um texto vazio no ecrã.
 */

import type { Dictionary } from './fr';

export const pt: Dictionary = {
  meta: {
    languageName: 'Português',
    switchLabel: 'Idioma',
    title: 'QueryShield — Análise de mensagens suspeitas e deteção de burlas',
    description:
      'Cole um e-mail, um SMS ou uma mensagem suspeita: a QueryShield avalia o nível de risco, explica cada sinal detetado e ajuda-o a decidir antes de agir.',
    ogTitle: 'QueryShield — Análise de mensagens suspeitas',
    ogDescription:
      'Deteção de phishing e de burlas por análise heurística e semântica. Pontuação de risco, sinais explicados, nenhum dado conservado.',
  },

  nav: {
    analyzer: 'Analisador',
    site: 'Verificar um site',
    pricing: 'Preços',
    api: 'API',
    account: 'A minha conta',
    privacy: 'Privacidade',
  },

  header: {
    support: 'support@query-intel.com',
    openAccess: 'Obter acesso',
  },

  footer: {
    tagline:
      'Análise de mensagens suspeitas e verificação de sites para deteção de phishing, burlas e fraude. Um serviço query-intel.com.',
    ecosystem: 'Descubra o ecossistema query-intel.com',
    productTitle: 'Produto',
    legalTitle: 'Legal',
    resourcesTitle: 'Recursos',
    linkAnalyzer: 'Analisador de mensagens',
    linkSite: 'Verificar um site',
    linkPricing: 'Planos e preços',
    linkApiDocs: 'Documentação da API',
    linkHealth: 'Estado do serviço',
    linkPrivacy: 'Política de privacidade',
    linkTerms: 'Termos e aviso',
    linkMentions: 'Informação legal',
    disclaimer:
      'O QueryShield fornece uma avaliação automática do nível de risco e uma pontuação de probabilidade. Nenhum sistema automático é 100 % fiável: a pontuação é um auxílio à decisão e não substitui a verificação junto da organização em causa, nem o parecer de um profissional. As mensagens submetidas são processadas em memória e não são conservadas.',
    rights: '© {year} query-intel.com — QueryShield. Todos os direitos reservados.',
    legalNotice:
      'Os textos jurídicos são redigidos em francês e é essa versão que prevalece. Apenas a versão francesa é vinculativa.',
  },

  common: {
    scoreAria: 'Pontuação de risco {score} em 100',
    outOf: 'EM 100',
    clear: 'Limpar',
    copyReport: 'Copiar relatório',
    engine: 'Motor',
    duration: 'Duração',
    quotaToday: 'Quota de hoje',
    headers: 'Cabeçalhos',
    headersAnalyzed: 'analisados',
    headersMissing: 'não fornecidos',
    confidenceChip: 'Fiabilidade {level} ({percent} %)',
    confidenceHigh: 'elevada',
    confidenceMedium: 'média',
    confidenceLow: 'baixa',
    noSignal: 'Nenhum sinal acionado',
    noFindingsDetail:
      'Nenhuma regra foi acionada. A mensagem não contém ligações duvidosas, nem pedido de dados sensíveis, nem esquema de engenharia social identificável por análise estática.',
    signalsDetected: 'Sinais detetados',
    categoriesTitle: 'Repartição dos sinais',
    semanticActive: 'Passagem semântica ativa',
    rulesTriggered: '{count} regra acionada',
    rulesTriggeredPlural: '{count} regras acionadas',
    trigger: 'Elemento acionador',
    whatToDo: 'O que fazer agora',
    semantic: 'Semântica',
    privacyShort: 'Análise estática · nenhum dado conservado',
    networkError: 'O serviço está inacessível. Verifique a ligação e tente novamente.',
    genericError: 'A análise falhou. Tente novamente dentro de instantes.',
    errors: {
      rate_limited: 'Demasiados pedidos a partir da sua ligação. Aguarde um momento e tente novamente.',
      quota_exceeded: 'Quota diária atingida. Mude para um plano superior para continuar.',
      payload_too_large: 'A mensagem é demasiado grande. Reduza o tamanho e tente novamente.',
      invalid_json: 'Pedido ilegível. Recarregue a página e tente novamente.',
      missing_text: 'Nada para analisar. Cole a mensagem recebida (mínimo de 4 caracteres).',
      missing_url: 'Nenhum endereço para verificar. Introduza um nome de domínio ou um endereço completo.',
      invalid_url:
        'Esta entrada não é um endereço de site utilizável. Use um nome de domínio (exemplo.com) ou um endereço completo (https://exemplo.com/pagina). Os endereços de rede interna não são aceites.',
    },
    siteContactedNever: 'o site nunca é aberto',
  },

  severity: {
    critical: 'Crítico',
    high: 'Elevado',
    medium: 'Moderado',
    low: 'Baixo',
    info: 'Informação',
  },

  category: {
    lien: 'Ligações e domínios',
    identite: 'Usurpação de identidade',
    'ingenierie-sociale': 'Engenharia social',
    'donnees-sensibles': 'Pedido de dados sensíveis',
    'entetes-email': 'Autenticação do e-mail',
    contenu: 'Conteúdo e formatação',
    metadata: 'Contexto da mensagem',
  },

  verdict: {
    safe: 'Risco baixo',
    suspicious: 'Suspeito',
    dangerous: 'Fraude provável',
    safeSummary:
      'Não foi detetado nenhum indicador de fraude. A mensagem não contém ligações duvidosas, nem pedido de dados sensíveis, nem pressão de tempo característica.',
  },

  siteVerdict: {
    official: 'Site oficial verificado',
    unknown: 'Autenticidade não verificável',
    suspicious: 'Site suspeito',
    phishing: 'Site fraudulento',
  },

  home: {
    chip: 'Auxílio à decisão · análise estática · nenhum dado conservado',
    titleLead: 'Verifique uma mensagem suspeita',
    titleAccent: 'antes',
    titleTail: 'de agir.',
    intro:
      'O QueryShield analisa e-mails, SMS e mensagens instantâneas à procura de tentativas de phishing, burlas e fraude. O motor não se limita a dizer «perigoso»: explica cada sinal detetado e indica o que deve fazer.',
    ctaAnalyze: 'Analisar uma mensagem',
    ctaSite: 'Verificar um site',
    ctaPricing: 'Ver os planos',
    ctaApi: 'Integrar a API',
    stepsTitle: 'Como funciona',
    step1Title: 'Cole a mensagem',
    step1Body:
      'E-mail, SMS, mensagem WhatsApp ou Telegram. Pode acrescentar os cabeçalhos originais para acionar a verificação SPF, DKIM e DMARC.',
    step2Title: 'O motor analisa',
    step2Body:
      'Extração de ligações e identificadores, comparação dos domínios com as marcas oficiais, aplicação do léxico de engenharia social e ponderação dos sinais.',
    step3Title: 'Você decide',
    step3Body:
      'Uma pontuação de risco, a lista dos sinais com a respetiva explicação e as ações concretas a tomar. O relatório pode ser exportado para os seus registos.',
    coverageTitle: 'O que o motor deteta',
    coverageIntro:
      'Mais de 80 regras heurísticas, organizadas em famílias de sinais independentes. É a convergência de várias famílias que faz subir a pontuação: é ela que torna o veredicto fiável.',
    coverage1Title: 'Usurpação de domínio',
    coverage1Body:
      'Typosquatting, homoglifos cirílicos, punycode, subdomínios enganadores, endereços IP em bruto, encurtadores.',
    coverage2Title: 'Engenharia social',
    coverage2Body:
      'Pressão de tempo, ameaça de suspensão, falso apoio técnico, isco financeiro, imposição de segredo, controlo remoto.',
    coverage3Title: 'Pedidos sensíveis',
    coverage3Body:
      'Palavras-passe, códigos recebidos por SMS, códigos de dupla autenticação, dados bancários, frases de recuperação de criptomoedas, documentos de identidade.',
    coverage4Title: 'Autenticação do e-mail',
    coverage4Body:
      'Leitura dos resultados SPF, DKIM e DMARC, incoerência entre From, Reply-To e Return-Path, nome apresentado a usurpar uma marca.',
    coverage5Title: 'Meios de pagamento de risco',
    coverage5Body:
      'Transferências instantâneas, vales pré-pagos, cartões Transcash ou PCS, números de valor acrescentado, falsas taxas aduaneiras.',
    coverage6Title: 'Ofuscação técnica',
    coverage6Body:
      'Caracteres invisíveis, mistura de alfabetos, marcas desmembradas, URLs fortemente codificados, redirecionamentos ocultos.',
    warningTitle: 'Aviso',
    warningBody:
      'O QueryShield fornece uma avaliação automática do nível de risco e uma pontuação de probabilidade. Nenhum sistema automático é 100 % fiável: uma mensagem fraudulenta pode não acionar nenhum sinal e uma mensagem legítima pode acionar alguns. O relatório é um auxílio à decisão e não substitui a verificação junto da organização em causa, nem o parecer de um profissional.',
    warningLink: 'Ler os termos completos',
    ctaTitle: 'Precisa de acesso regular ou de um volume maior?',
    ctaBody:
      'Planos mensais e anuais, acesso à API com chave de licença, quotas adaptadas a equipas. Pagamento por cartão através da Stripe.',
    ctaButton: 'Consultar os planos',
  },

  analyzer: {
    channelEmail: 'E-mail',
    channelSms: 'SMS',
    channelMessaging: 'Mensagens',
    channelOther: 'Outro',
    senderPlaceholder: 'Remetente (opcional) — ex. « Apoio ao Cliente <contact@dominio.com> »',
    senderLabel: 'Endereço do remetente',
    subjectPlaceholder: 'Assunto da mensagem (opcional)',
    subjectLabel: 'Assunto da mensagem',
    textPlaceholder:
      'Cole aqui a mensagem suspeita, mantendo as ligações tal como estão.\n\nExemplo: «A sua encomenda está retida, pague a taxa em 24h: http://exemplo.top/…»',
    textLabel: 'Mensagem a analisar',
    senderHelp:
      'O remetente é analisado automaticamente se constar do texto colado (linha «De: …»). Indica-lo aqui é mais fiável: é o domínio depois do @ que determina se o endereço é autêntico.',
    headersShow: '+ Acrescentar os cabeçalhos originais do e-mail (SPF / DKIM / DMARC)',
    headersHide: '− Ocultar os cabeçalhos originais',
    headersPlaceholder:
      'Cole aqui os cabeçalhos completos.\n\nNo Gmail: menu «Mais» > «Mostrar original».\nNo Outlook: «Opções» > «Propriedades da mensagem».',
    headersLabel: 'Cabeçalhos originais do e-mail',
    headersHelp:
      'É a verificação mais fiável: SPF, DKIM e DMARC permitem saber se o domínio remetente é autêntico. Sem cabeçalhos, o domínio do remetente é ainda analisado a partir do campo acima ou da linha «De: …» da mensagem.',
    samplesLabel: 'Exemplos de demonstração',
    submit: 'Analisar esta mensagem',
    submitting: 'A analisar…',
    privacyNote: 'Processamento em memória · nenhuma mensagem conservada · nenhuma ligação aberta',
    disclaimer:
      'Este relatório é um auxílio à decisão baseado numa análise automática. Nenhum sistema garante uma deteção 100 % fiável: em caso de dúvida, verifique diretamente junto da organização em causa através de um número que tenha encontrado por si.',
  },

  samples: {
    'sms-colis': { label: 'SMS — encomenda retida', hint: 'Falsas taxas aduaneiras' },
    'email-banque': { label: 'E-mail — falso banco', hint: 'Cabeçalhos DMARC em falha' },
    'faux-conseiller': { label: 'Mensagens — falso consultor', hint: 'Pedido de código SMS + sigilo imposto' },
    'faux-support': { label: 'Falso apoio técnico', hint: 'Acesso remoto' },
    'faux-gain': { label: 'Falso prémio / cripto', hint: 'Isco financeiro e frase de recuperação' },
    'faux-gain-sans-lien': { label: 'Falso prémio — sem ligação', hint: 'Domínio aleatório, sem pedido de credenciais' },
    'fausse-administration': { label: 'Falsa administração', hint: 'Domínio que imita uma instituição' },
    casino: { label: 'Oferta de casino', hint: 'Isco de jogo não solicitado' },
    legitime: { label: 'Mensagem legítima', hint: 'Caso de controlo' },
  },

  site: {
    metaTitle: 'Verificar um site',
    metaDescription:
      'Verifique se um endereço de site é autêntico, suspeito ou fraudulento. O site analisado nunca é aberto.',
    chip: 'Verificação de endereço · análise estática · o site nunca é aberto',
    titleLead: 'Este site é',
    titleAccent: 'realmente',
    titleTail: 'aquele que diz ser?',
    intro:
      'Cole um endereço de site ou um nome de domínio. O QueryShield compara o domínio com a lista de referência de organizações, deteta imitações e, se o ativar, verifica a idade do domínio junto do registo oficial. O site suspeito nunca é contactado: abri-lo seria avisar o atacante.',
    ctaAnalyzer: 'Analisar uma mensagem',
    ctaApi: 'Integrar a API',
    criteriaTitle: 'O que é verificado',
    criteria1Title: 'Usurpação de marca',
    criteria1Body:
      'O domínio retoma o nome de um banco, de um transportador ou de uma administração sem ser um dos seus domínios oficiais.',
    criteria2Title: 'Semelhança enganadora',
    criteria2Body:
      'Typosquatting (um caráter de diferença), homoglifos cirílicos, codificação punycode, extensão conhecida desviada para subdomínio.',
    criteria3Title: 'Domínio gerado automaticamente',
    criteria3Body:
      'Entropia anormal, sequências de consoantes, ausência de vogais: a assinatura dos domínios registados em lote para uma campanha.',
    criteria4Title: 'Idade e reputação',
    criteria4Body:
      'Verificações opcionais: data de registo do domínio junto do registo oficial (RDAP) e denúncias conhecidas.',
    limitsTitle: 'O que o resultado não diz',
    limitsBody:
      '«Nenhum sinal de fraude» não significa «site de confiança». Um domínio desconhecido da nossa lista aparece como não verificável, e isso é deliberado: preferimos mostrar uma incerteza a uma falsa tranquilidade. Esta verificação não substitui a introdução manual do endereço oficial, nem o parecer de um profissional em caso de dúvida.',
    formTitle: 'Verificar um endereço de site',
    urlPlaceholder: 'exemplo.com ou https://exemplo.com/pagina',
    urlLabel: 'Endereço do site a verificar',
    activeLabel: 'Verificação ativa',
    activeBody:
      'consulta o registo de domínios (idade e registrar) e a reputação do site. Muito mais fiável, mas o endereço é então transmitido a esses serviços.',
    activeNeverContacted: 'O próprio site nunca é contactado',
    activeTail: ', nem agora nem mais tarde.',
    submit: 'Verificar este site',
    submitting: 'A verificar…',
    examplesLabel: 'Exemplos',
    exampleOfficial: 'Site oficial',
    exampleBank: 'Imitação de banco',
    exampleSubdomain: 'Subdomínio enganador',
    exampleRandom: 'Domínio aleatório',
    organisation: 'Organização: {name} ({category})',
    impersonated: 'Organização imitada: {brands}',
    knownOrganisation: 'uma organização conhecida',
    host: 'Anfitrião',
    domain: 'Domínio',
    extension: 'Extensão',
    activeChip: 'Verificação ativa',
    networkTitle: 'Verificações de rede',
    networkSource: 'fonte: registo de domínios · o site não foi contactado',
    dnsResolution: 'Resolução DNS',
    dnsNotChecked: 'não verificada',
    dnsAddresses: '{count} endereço(s)',
    dnsFails: 'não resolve',
    domainAge: 'Idade do domínio',
    domainAgeDays: '{days} dia(s)',
    domainAgeUnknown: 'indisponível',
    registeredOn: 'Registado em',
    registrar: 'Registrar',
    reputation: 'Reputação',
    reputationFlagged: 'denunciado',
    reputationClean: 'sem denúncia',
    reputationNotChecked: 'não consultada',
    reputationUnavailable:
      'A verificação de reputação não pôde ser efetuada. Isso não significa que o site esteja limpo: não foi obtida nenhuma opinião, em nenhum dos sentidos.',
    footnote:
      'Esta verificação é um auxílio à decisão. O site analisado nunca é aberto: o relatório baseia-se na estrutura do domínio, na lista de referência de marcas e, se o ativou, no registo de domínios. Nenhum sistema garante uma deteção 100 % fiável.',
    summaryOfficial:
      '{host} é o domínio oficial de {brand}. Pode iniciar sessão com confiança, desde que tenha escrito o endereço você mesmo.',
    summaryPhishing:
      'Pontuação de risco {score}/100: {host} imita {brands} sem ser o seu domínio oficial. Não introduza nenhum dado neste site.',
    summarySuspicious:
      'Pontuação de risco {score}/100: {host} apresenta anomalias estruturais sem imitar nenhuma organização identificável. Trate este site como não fiável até verificação.',
    summaryUnknown:
      'Nenhum sinal de fraude detetado em {host}, mas este domínio não pertence a nenhuma organização da nossa lista de referência. Por isso, não podemos confirmar que seja autêntico: não detetar problemas não é uma validação.',
    summaryInvalid:
      'Esta entrada não é um endereço de site utilizável. Introduza um nome de domínio (exemplo.com) ou um endereço completo (https://exemplo.com/pagina).',
  },

  siteRecs: {
    'site-rec-invalid-input':
      'Verifique o formato do endereço: um nome de domínio contém pelo menos um ponto e termina numa extensão (.fr, .com, .gouv.fr...).',
    'site-rec-type-address':
      'Escreva o endereço você mesmo na barra do navegador em vez de clicar numa ligação recebida: é a única forma de ter a certeza de que chega ao site certo.',
    'site-rec-check-padlock':
      'Verifique se o cadeado do navegador está presente e se o nome de domínio apresentado está exato, sem gralhas.',
    'site-rec-unknown-org':
      'Nenhuma organização da nossa lista de referência corresponde a este domínio. Se se apresenta como o seu banco, o seu operador ou uma administração, não é o site oficial deles.',
    'site-rec-use-search':
      'Para verificar um serviço, passe por um motor de busca ou por um documento oficial, nunca pela ligação que quer controlar.',
    'site-rec-no-credentials':
      'Não introduza identificador, palavra-passe nem número de cartão neste site.',
    'site-rec-report-brand':
      'Este site imita uma organização conhecida. Vá ao site oficial escrevendo o endereço você mesmo e denuncie a tentativa através da área de cliente ou do apoio ao cliente da organização imitada.',
    'site-rec-inspect-chars':
      'O domínio usa caracteres visualmente enganadores (alfabeto misturado ou codificação internacional). Copie o endereço e cole-o num editor de texto: os caracteres estrangeiros ficam evidentes.',
    'site-rec-expand-shortener':
      'O endereço passa por um encurtador: o destino real é invisível antes do clique. Expanda-o com uma ferramenta de resolução antes de qualquer ação.',
    'site-rec-domain-gone':
      'Este nome de domínio já não resolve: o site foi provavelmente retirado depois de servir uma campanha. A ligação recebida vem, portanto, de uma mensagem antiga ou fraudulenta.',
    'site-rec-domain-young':
      'Este domínio foi registado muito recentemente. Os sites fraudulentos são montados por alguns dias ou semanas: a juventude do domínio é, por si só, um sinal de desconfiança.',
    'site-rec-safe-browsing':
      'Este site consta da lista de sites perigosos do Google Safe Browsing. Não aceda a ele e elimine a mensagem que o continha.',
    'site-rec-report-authority':
      'Denuncie o endereço: a plataforma Pharos (internet-signalement.gouv.fr) para conteúdos fraudulentos, ou o Signal Spam para e-mails.',
  },

  randomSignals: {
    'entropy-very-high': 'entropia muito elevada ({value} bits por caráter)',
    'entropy-high': 'entropia elevada ({value} bits por caráter)',
    'consonant-run': '{value} consoantes consecutivas',
    'no-vowel': 'nenhuma vogal',
    'few-vowels': 'quase nenhuma vogal ({value} %)',
    'interleaved-digits': 'dígitos intercalados no nome',
    'very-long': 'nome muito longo ({value} carateres)',
  },

  findings: {
    'url-dangerous-scheme': {
      title: 'Esquema de URL perigoso',
      detail:
        'O endereço usa um esquema `data:`, `javascript:` ou `file:`. Este tipo de endereço executa código ou abre um ficheiro local sem passar por um site: não tem razão para estar numa mensagem legítima.',
    },
    'url-ip-literal': {
      title: 'Ligação para um endereço IP em bruto',
      detail:
        'A ligação aponta diretamente para um endereço IP em vez de um nome de domínio. Os serviços oficiais usam sempre um domínio; o IP em bruto evita as listas de bloqueio e os certificados.',
    },
    'url-punycode': {
      title: 'Domínio codificado em punycode',
      detail:
        'O domínio contém uma etiqueta `xn--`. É a codificação de caracteres não latinos: permite apresentar um nome visualmente idêntico ao de uma marca oficial quando o domínio é diferente.',
    },
    'url-homoglyph': {
      title: 'Domínio com caracteres homoglifos',
      detail:
        'O domínio mistura o alfabeto latino com caracteres cirílicos ou gregos visualmente idênticos. É a técnica mais eficaz para imitar uma marca: a olho, o domínio é indistinguível.',
    },
    'url-userinfo-trick': {
      title: 'Domínio oculto por uma arroba',
      detail:
        'O URL contém uma arroba antes do caminho. Tudo o que precede a arroba é ignorado pelo navegador: o domínio realmente visitado não é o que aparece primeiro.',
    },
    'url-risky-tld': {
      title: 'Extensão de domínio de risco',
      detail:
        'A extensão do domínio está entre as mais usadas pelas campanhas de phishing, porque são vendidas a baixo preço e sem verificação de identidade.',
    },
    'url-shortener': {
      title: 'Ligação encurtada',
      detail:
        'A ligação passa por um serviço de encurtamento: o destino real é invisível antes do clique. Numa mensagem não solicitada, considere o destino como desconhecido.',
    },
    'url-brand-impersonation': {
      title: 'Domínio a usurpar uma marca conhecida',
      detail:
        'O domínio retoma o nome de {brands} sem ser um domínio oficial dessa marca. É a assinatura mais frequente do phishing direcionado.',
    },
    'url-typosquat': {
      title: 'Gralha a imitar um domínio oficial',
      detail:
        'O domínio difere de um único caráter de um domínio oficial. Esta técnica (typosquatting) explora uma gralha ou uma leitura rápida da mensagem.',
    },
    'url-typosquat-approx': {
      title: 'Domínio visualmente próximo de um oficial',
      detail:
        'O domínio assemelha-se muito a um domínio oficial, sem lhe ser idêntico. Verifique caráter a caráter antes de qualquer ação.',
    },
    'url-random-domain': {
      title: 'Domínio gerado automaticamente',
      detail:
        'O domínio não se assemelha a nenhum nome legível ({signals}). Os domínios produzidos aleatoriamente são registados em lote por alguns dias: não têm história, nem reputação, nem razão para estar numa mensagem legítima.',
    },
    'url-random-domain-weak': {
      title: 'Nome de domínio invulgar',
      detail:
        'A estrutura do domínio é invulgar ({signals}). Sinal a confirmar pelas outras verificações.',
    },
    'url-institutional-mimicry': {
      title: 'Domínio a imitar uma instituição',
      detail:
        'O domínio retoma o vocabulário de uma instituição pública ({words}) sem ser um domínio oficial. As administrações usam domínios .gouv.fr ou .gov: uma variante comercial é uma usurpação.',
    },
    'url-tld-as-label': {
      title: 'Extensão desviada para subdomínio',
      detail:
        'O endereço contém uma extensão conhecida (.com, .gov, .fr…) numa posição que não é a extensão final. O domínio realmente registado é o que se segue, mas o olhar detém-se na parte anterior: a montagem serve apenas para enganar a leitura.',
    },
    'url-lure-keywords': {
      title: 'Termos de isco no domínio',
      detail:
        'O domínio contém termos destinados a atrair ({tokens}). Um nome de domínio escolhido pelo seu argumento comercial é quase sempre um domínio registado para uma campanha de envio em massa.',
    },
    'url-sensitive-path': {
      title: 'Palavras-chave de autenticação na ligação',
      detail:
        'A ligação contém termos de início de sessão ou de pagamento ({keywords}) num domínio que não é o da organização anunciada. Estão lá para tranquilizar a vítima.',
    },
    'url-sensitive-path-strong': {
      title: 'Palavras-chave de autenticação na ligação',
      detail:
        'A ligação acumula vários termos de início de sessão ou de pagamento ({keywords}) num domínio que não é o da organização anunciada. Estão lá para tranquilizar a vítima.',
    },
    'url-plain-http-sensitive': {
      title: 'Página sensível servida em HTTP',
      detail:
        'A ligação aponta para uma página de início de sessão ou de pagamento sem cifragem. Nenhum serviço legítimo recolhe credenciais em HTTP.',
    },
    'url-many-subdomains': {
      title: 'Empilhamento de subdomínios',
      detail:
        'O domínio tem um número invulgar de subdomínios. O empilhamento serve para empurrar o domínio real para fora da zona visível da barra de endereços.',
    },
    'url-long-host': {
      title: 'Nome de domínio anormalmente longo',
      detail:
        'O nome de domínio é muito longo. Os domínios gerados automaticamente pelos kits de phishing são frequentemente assim.',
    },
    'url-many-hyphens': {
      title: 'Hífenes múltiplos no domínio',
      detail:
        'O domínio encadeia vários hífenes, padrão típico dos domínios gerados para imitar um nome oficial.',
    },
    'url-odd-port': {
      title: 'Porta não padrão',
      detail:
        'O endereço indica uma porta não padrão. Os sites oficiais não as usam e isso traduz frequentemente um servidor de ataque.',
    },
    'url-redirect-param': {
      title: 'Redirecionamento para um destino oculto',
      detail:
        'A ligação contém um parâmetro de redirecionamento. A página apresentada pode parecer legítima e ainda assim encaminhar para outro site após a validação.',
    },
    'url-heavy-encoding': {
      title: 'URL fortemente codificado',
      detail:
        'A ligação contém numerosas sequências de escape. A codificação serve para ocultar o destino real e contornar os filtros.',
    },
    'url-zero-width': {
      title: 'Caracteres invisíveis na ligação',
      detail:
        'A ligação contém caracteres de largura nula, invisíveis no ecrã. Servem apenas para enganar os filtros e o olho humano.',
    },
    'url-anchor-mismatch': {
      title: 'Texto da ligação diferente do destino',
      detail:
        'O texto apresentado da ligação indica um domínio, mas a ligação aponta para outro domínio. É uma prova direta de intenção enganosa.',
    },
    'site-official-domain': {
      title: 'Domínio oficial verificado',
      detail:
        'Este domínio está registado como o domínio oficial de {brand}. É um endereço de confiança: as mensagens e as ligações que apontam para aqui são coerentes.',
    },
    'site-impersonates-brand': {
      title: 'Este site faz-se passar por uma organização conhecida',
      detail:
        'O domínio retoma o nome de {brands} sem ser um dos seus domínios oficiais. É a própria definição de um site de phishing: imita uma organização para recolher credenciais ou pagamentos.',
    },
    'site-insecure-scheme': {
      title: 'Endereço em HTTP, sem cifragem',
      detail:
        'O endereço fornecido é `http://`. Nenhum site comercial ou bancário sério funciona ainda assim: a ligação não é cifrada e nada garante a identidade do servidor.',
    },
    'site-not-resolving': {
      title: 'O domínio não resolve',
      detail:
        'A resolução DNS deste nome de domínio falha. O site já não existe, ou nunca foi configurado para responder: é frequente em domínios registados e depois abandonados após uma campanha de phishing.',
    },
    'site-newly-registered': {
      title: 'Domínio registado muito recentemente',
      detail:
        'Este domínio foi registado há {days} dia(s) (em {date}). Os sites de phishing vivem alguns dias a algumas semanas: um domínio novo que se apresenta como uma organização estabelecida é quase sempre fraudulento.',
    },
    'site-recently-registered': {
      title: 'Domínio recente',
      detail:
        'Este domínio foi registado há {days} dia(s). Não é anormal em si, mas um domínio com menos de seis meses não pode ter a antiguidade de uma organização estabelecida.',
    },
    'site-safe-browsing-flagged': {
      title: 'Site denunciado como perigoso',
      detail:
        'Este site consta de uma lista pública de sites perigosos ({threats}). Já está identificado como distribuidor de conteúdo malicioso ou como site de phishing.',
    },
  },
};
