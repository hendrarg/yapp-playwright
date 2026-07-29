/** PRD product types shown in the Add New Product sheet (TC-PROD-C-015). */
export const productsCreationData = {
  productTypes: [
    {
      label: "Digital Product",
      buttonName: /Digital Products Digital Product Downloadable files/i,
    },
    {
      label: "Online Course",
      buttonName: /Digital Products Online Course Provide interactive courses/i,
    },
    {
      label: "Consultation",
      buttonName: /Appointment Consultation Create and manage paid bookings/i,
    },
    {
      label: "Discord Membership",
      buttonName: /Memberships Discord Membership Sell access to private Discord/i,
    },
    {
      label: "Events and Tickets",
      buttonName: /Appointment Events and Tickets Ideal for webinars/i,
    },
  ] as const,
  discordMembershipCreatePath: /\/products\/create\/discord-membership/,
} as const;
