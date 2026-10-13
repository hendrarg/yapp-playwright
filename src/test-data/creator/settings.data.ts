export const settingsBankOptions = [
  'BANK DIGITAL BCA',
  'BANK CENTRAL ASIA',
  'BANK RAKYAT INDONESIA',
  'BANK OCBC NISP',
  'BANK KEB HANA',
  'BANK MANDIRI',
  'BANK DANAMON',
  'BANK PERMATA',
  'BANK BNI',
  'BANK BTPN',
  'BANK BJB',
  'BANK CIMB NIAGA',
  'BANK SYARIAH INDONESIA',
  'BANK DBS INDONESIA',
  'BANK JAGO',
  'BANK ARTHA GRAHA',
  'BANK NEO COMMERCE',
  'BANK ALADIN SYARIAH',
  'BANK DKI',
  'BANK BPD DIY',
  'BANK JATIM',
];

export const settingsFeeData = {
  monetizationCategories: [
    'Digital Product Sales',
    'Feeds',
    'Tips',
    'Donations',
    'Lifetime Access',
  ],
  defaultReceived: '100.000',
  defaultSummary: {
    platformFeeRate: '4%',
    creatorSplit: '0%',
    fansSplit: '4%',
    platformFee: 'Rp4.000',
    fansFee: 'Rp4.000',
    creatorFee: 'Rp0',
    fansPay: 'Rp104.000',
    creatorReceive: 'Rp100.000',
    bearer: 'Fans',
  },
  calculatorTest: {
    input: '250000',
    expectedFormatted: '250.000',
    platformFee: 'Rp10.000',
    fansPay: 'Rp260.000',
    creatorReceive: 'Rp250.000',
  },
  labels: {
    selectorTypo: 'Payment Gateaway Fee',
    summaryCorrect: 'Payment Gateway Fee',
  },
};

export const settingsIntegrationsData = {
  apps: {
    discord: {
      name: 'Discord',
      description: 'Connect Discord to enable role-based memberships for your community',
    },
    googleCalendar: {
      name: 'Google Calendar',
      description: 'Connect Google Calendar to activate appointments for your community',
    },
    telegram: {
      name: 'Telegram',
      description: 'Connect Telegram to sell paid access to your groups and channels',
    },
    instagram: {
      name: 'Instagram',
      description: 'Automate DMs from post comments',
    },
  },
  growth: {
    facebookPixel: {
      name: 'Facebook Pixel',
    },
  },
  facebookPixel: {
    pixelId: '1543489844474078',
    accessToken:
      'EAAPypRKILTwBSm2M2Xe2X2KgsVujpr4L1bcVHSAEbrRcMXNP6wVMorFYMSSJntGSjinhF9MM7RgZC7hVVKwdpZBTFgKZCvHrGLrZChBoFnfQjQlF9Oa1ageAZA8QMmH4tJ0rUguXZBheCV001UvW71HZBpkWVxareSlSZBmugYZBX4yrRl8yCwjd2shzd6sW0vAZDZD',
    trackedEvents: [
      {
        title: 'Page View',
        description: 'We track this when someone opens your product page.',
      },
      {
        title: 'Initiate Checkout',
        description: 'We track this when they choose a payment method and start the checkout process.',
      },
      {
        title: 'Purchase',
        description: 'We track this once their payment is successful and confirmed.',
      },
    ],
  },
};
