/**
 * Exemples de demonstration.
 *
 * Tous les messages ci-dessous sont FICTIFS et ecrits pour illustrer les
 * techniques d'arnaque les plus courantes. Les domaines cites n'existent pas
 * et ne doivent jamais etre ouverts : ils sont volontairement construits sur
 * le meme modele que ceux des campagnes reelles.
 */

import type { Channel } from './engine/types';

export interface Sample {
  id: string;
  label: string;
  hint: string;
  channel: Channel;
  subject?: string;
  /** Adresse de l'expediteur, telle qu'elle apparait dans le message. */
  sender?: string;
  text: string;
  rawHeaders?: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'sms-colis',
    label: 'SMS — colis bloque',
    hint: 'Faux frais de dedouanement',
    channel: 'sms',
    text: `CHRONOPOST : Votre colis n°3Z89FR est bloque au centre de tri. Des frais de dedouanement de 2,49 EUR sont requis sous 24h pour la livraison. Reglez ici : http://chronopost-livraison-suivi.top/frais-colis`,
  },
  {
    id: 'email-banque',
    label: 'E-mail — fausse banque',
    hint: 'En-tetes DMARC en echec',
    channel: 'email',
    subject: 'Action requise : verification de votre compte',
    text: `Cher client,

Nous avons detecte une activite inhabituelle sur votre compte. Votre acces sera suspendu sous 48h si vous ne confirmez pas votre identite.

Pour cela, merci de saisir vos coordonnees bancaires ainsi que le code recu par SMS sur notre portail securise :
http://securite-credit-agricole.xyz/verification-client

Service Client`,
    rawHeaders: `Return-Path: <bounce@bulk-sender-mailer.top>
Received: from unknown (HELO mail.bulk-sender-mailer.top) (203.0.113.44)
 by mx.google.com with SMTP id x12
Received: from [203.0.113.44] by relay1.bulk-sender-mailer.top
Received: from localhost by relay2.bulk-sender-mailer.top
Received: from app3 by relay3.bulk-sender-mailer.top
Received: from app4 by relay4.bulk-sender-mailer.top
Received: from app5 by relay5.bulk-sender-mailer.top
Received: from app6 by relay6.bulk-sender-mailer.top
Received: from app7 by relay7.bulk-sender-mailer.top
Received: from app8 by relay8.bulk-sender-mailer.top
Received: from app9 by relay9.bulk-sender-mailer.top
Authentication-Results: mx.google.com;
 spf=fail smtp.mailfrom=credit-agricole-info.xyz;
 dkim=none;
 dmarc=fail header.from=credit-agricole-info.xyz
From: "Credit Agricole Securite" <securite@credit-agricole-info.xyz>
Reply-To: recuperation-compte@mail-recuperation.top
Message-ID: <8f2c1a@mail-recuperation.top>
Subject: Action requise : verification de votre compte
Content-Type: text/html; charset="utf-8"`,
  },
  {
    id: 'faux-conseiller',
    label: 'Messagerie — faux conseiller',
    hint: 'Demande de code SMS + secret impose',
    channel: 'messaging',
    text: `Bonjour, je suis conseiller au service fraude de votre banque. Nous avons detecte une tentative de paiement de 890 EUR par carte sur votre compte.

Pour bloquer l'operation je dois valider votre identite : communiquez-moi le code a 6 chiffres que vous venez de recevoir par SMS.

Ne parlez a personne de cet appel, l'operation est confidentielle.`,
  },
  {
    id: 'faux-support',
    label: 'Faux support technique',
    hint: 'Prise en main a distance',
    channel: 'unknown',
    text: `ALERTE : votre ordinateur est infecte par un virus. Vos fichiers seront chiffres si vous n'agissez pas immediatement.

Appelez le 0899 123 456 (2,99 EUR par appel) pour joindre le support Microsoft. Nos techniciens prendront en main votre PC avec TeamViewer pour nettoyer le systeme.`,
  },
  {
    id: 'faux-gain',
    label: 'Faux gain / crypto',
    hint: 'Appat financier et phrase de recuperation',
    channel: 'email',
    subject: 'FELICITATIONS : votre bonus vous attend',
    sender: '"Service Recompenses" <contact@kdvmghvjusprqsfhsgdxjmsx.com>',
    text: `FELICITATIONS ! Vous avez ete selectionne pour recevoir un bonus de 4 500 EUR en Bitcoin. Notre plateforme garantit un rendement de 18 % par mois, sans aucun risque.

Pour activer votre compte, transmettez votre phrase de recuperation a 12 mots puis reglez les frais d'activation de 250 EUR par virement instantane. Offre valable sous 24h.`,
  },
  {
    id: 'faux-gain-sans-lien',
    label: 'Faux gain — sans lien',
    hint: 'Domaine aleatoire, aucune demande d identifiants',
    channel: 'email',
    subject: 'Votre bonus vous attend',
    sender: '"Service Recompenses" <contact@kdvmghvjusprqsfhsgdxjmsx.com>',
    text: `Bonjour,

Vous avez ete selectionne pour recevoir un bonus exceptionnel de 500 EUR. Votre cagnotte reste disponible pendant 48 heures.

L'equipe des recompenses`,
  },
  {
    id: 'fausse-administration',
    label: 'Fausse administration',
    hint: 'Domaine imitant une institution',
    channel: 'email',
    subject: 'Votre remboursement',
    sender: '"Direction Generale" <service@secure.overnmentarious.com>',
    text: `Bonjour,

Un remboursement de 240 EUR vous est du. Merci de confirmer votre identite depuis notre portail.

Direction Generale des Finances`,
  },
  {
    id: 'casino',
    label: 'Offre de casino',
    hint: 'Appat de jeu non sollicite',
    channel: 'email',
    subject: '50 free spins offerts',
    sender: '"Lucky Spin" <promo@lucky-spin-bonus-casino.com>',
    text: `Profitez de 50 free spins et d'un bonus de bienvenue de 200 EUR.

Deposez 20 EUR pour activer votre bonus. Offre reservee aux nouveaux joueurs.`,
  },
  {
    id: 'legitime',
    label: 'Message legitime',
    hint: 'Cas de controle',
    channel: 'email',
    subject: 'Votre commande CMD-88213 a ete expediee',
    sender: 'La Poste <no-reply@laposte.fr>',
    text: `Bonjour,

Votre commande n°CMD-88213 a ete expediee ce matin depuis notre entrepot de Lille. Vous pouvez suivre son acheminement depuis votre espace client.

Suivi de colis : https://www.laposte.fr/outils/suivi-colis?id=CMD-88213

Bonne journee,
Le service client`,
  },
];
